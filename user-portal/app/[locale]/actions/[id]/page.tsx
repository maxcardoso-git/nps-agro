'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import type { ContactOutcome, RespondentWithStatus } from '@/lib/types';

const STATUS_TONES: Record<string, 'neutral' | 'success' | 'warning' | 'danger'> = {
  pending: 'neutral',
  success: 'success',
  in_progress: 'warning',
  completed: 'success',
  scheduled: 'warning',
  no_answer: 'danger',
  wrong_number: 'danger',
  busy: 'warning',
  refused: 'danger',
};

export default function ActionContactsPage() {
  const t = useTranslations('interviewer.contacts');
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const actionId = params.id as string;
  const locale = params.locale as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRespondent, setSelectedRespondent] = useState<RespondentWithStatus | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [outcome, setOutcome] = useState<ContactOutcome>('success');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const respondentsQuery = useQuery({
    queryKey: ['action-respondents', actionId, search, statusFilter],
    queryFn: () =>
      api.actions.getRespondents(session!, actionId, {
        search: search || undefined,
        status: statusFilter || undefined,
        page_size: 100,
      }),
    enabled: Boolean(session && actionId),
  });

  const respondents = respondentsQuery.data ?? [];

  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRespondent) throw new Error('No respondent selected');

      // Step 1: Register contact attempt
      const attempt = await api.contactAttempts.createByAction(session!, actionId, selectedRespondent.id, {
        outcome,
        notes: notes || undefined,
        scheduled_at: outcome === 'scheduled' ? scheduledAt : undefined,
      });

      // Step 2: If success, start or resume interview
      if (outcome === 'success') {
        try {
          // Check for existing active interview
          const active = await api.interviews.findActive(
            session!,
            selectedRespondent.campaign_id,
            selectedRespondent.id,
          );
          if (active) {
            return { attempt, interviewId: active.id };
          }

          // Start new interview via action
          const result = await api.interviews.start(session!, {
            tenant_id: session!.user.tenant_id,
            campaign_id: selectedRespondent.campaign_id,
            action_id: actionId,
            respondent_id: selectedRespondent.id,
            channel: 'manual',
            interviewer_user_id: session!.user.id,
          });
          return { attempt, interviewId: result.interview_state.interview_id };
        } catch (interviewError) {
          // Contact was registered but interview failed — still close modal
          console.error('Interview start failed:', interviewError);
          return { attempt, interviewId: null, interviewError: String(interviewError) };
        }
      }

      return { attempt, interviewId: null };
    },
    onSuccess: (result) => {
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['action-respondents', actionId] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-callbacks'] });

      if (result.interviewId) {
        router.push(`/${locale}/interviews/${result.interviewId}`);
      } else if ('interviewError' in result && result.interviewError) {
        setError(String(result.interviewError));
      }
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('error'));
    },
  });

  const resetForm = () => {
    setOutcome('success');
    setNotes('');
    setScheduledAt('');
    setError(null);
  };

  const handleNextContact = async () => {
    try {
      const result = await api.actions.nextContact(session!, actionId);
      if (result.contact) {
        openModal(result.contact);
      } else {
        setError(t('noMoreContacts'));
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t('error'));
    }
  };

  const openModal = (respondent: RespondentWithStatus) => {
    setSelectedRespondent(respondent);
    resetForm();
    setShowModal(true);
  };

  const handleResume = async (respondent: RespondentWithStatus) => {
    const active = await api.interviews.findActive(session!, respondent.campaign_id, respondent.id);
    if (active) {
      router.push(`/${locale}/interviews/${active.id}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.back()}>
            ← {t('back')}
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        </div>
        <Button onClick={handleNextContact} className="gap-1">
          {t('nextContact')}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="flex-1"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('allStatuses')}</option>
          <option value="pending">{t('status.pending')}</option>
          <option value="no_answer">{t('status.no_answer')}</option>
          <option value="scheduled">{t('status.scheduled')}</option>
          <option value="in_progress">{t('status.in_progress')}</option>
          <option value="completed">{t('status.completed')}</option>
          <option value="wrong_number">{t('status.wrong_number')}</option>
          <option value="refused">{t('status.refused')}</option>
        </Select>
      </div>

      {respondentsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : respondents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <Table
          emptyLabel={t('empty')}
          headers={[t('colName'), t('colAccount'), t('colPhone'), t('colStatus'), '']}
          rows={respondents.map((r) => [
            <div key={`n-${r.id}`}>
              <span className="font-medium">{r.name}</span>
              {r.job_title && <span className="block text-xs text-slate-400">{r.job_title}</span>}
            </div>,
            r.account_name || '—',
            r.phone || '—',
            <Badge key={`s-${r.id}`} tone={STATUS_TONES[r.contact_status] ?? 'neutral'}>
              {t(`status.${r.contact_status}`)}
            </Badge>,
            <div key={`a-${r.id}`} className="flex gap-1">
              {r.contact_status === 'in_progress' ? (
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleResume(r)}>
                  {t('resume')}
                </Button>
              ) : r.contact_status !== 'completed' ? (
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openModal(r)}>
                  {t('contact')}
                </Button>
              ) : null}
            </div>,
          ])}
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('attemptTitle')}>
        {selectedRespondent && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{selectedRespondent.name}</p>
              <p className="text-sm text-slate-500">{selectedRespondent.phone || '—'}</p>
              {selectedRespondent.account_name && (
                <p className="text-xs text-slate-400">{selectedRespondent.account_name}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('outcome')}</label>
              <Select value={outcome} onChange={(e) => setOutcome(e.target.value as ContactOutcome)}>
                <option value="success">{t('outcomes.success')}</option>
                <option value="no_answer">{t('outcomes.no_answer')}</option>
                <option value="wrong_number">{t('outcomes.wrong_number')}</option>
                <option value="busy">{t('outcomes.busy')}</option>
                <option value="scheduled">{t('outcomes.scheduled')}</option>
                <option value="refused">{t('outcomes.refused')}</option>
              </Select>
            </div>

            {outcome === 'scheduled' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{t('scheduleDate')}</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('notes')}</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
              <Button
                onClick={() => contactMutation.mutate()}
                disabled={contactMutation.isPending || (outcome === 'scheduled' && !scheduledAt)}
              >
                {contactMutation.isPending ? t('saving') : t('save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
