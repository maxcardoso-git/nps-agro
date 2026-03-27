'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
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

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'success', label: 'Contatado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'no_answer', label: 'Não atendeu' },
  { value: 'scheduled', label: 'Agendado' },
  { value: 'wrong_number', label: 'Nº errado' },
  { value: 'busy', label: 'Ocupado' },
  { value: 'refused', label: 'Recusou' },
];

const PAGE_SIZE = 30;

export default function ActionContactsPage() {
  const t = useTranslations('interviewer.contacts');
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const actionId = params.id as string;
  const locale = params.locale as string;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRespondent, setSelectedRespondent] = useState<RespondentWithStatus | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [outcome, setOutcome] = useState<ContactOutcome>('success');
  const [notes, setNotes] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const respondentsQuery = useQuery({
    queryKey: ['action-respondents', actionId, debouncedSearch, statusFilter, page],
    queryFn: () =>
      api.actions.getRespondents(session!, actionId, {
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    enabled: Boolean(session && actionId),
  });

  const data = respondentsQuery.data as { items?: RespondentWithStatus[]; total?: number } | RespondentWithStatus[] | undefined;
  const respondents: RespondentWithStatus[] = Array.isArray(data) ? data : (data?.items ?? []);
  const total = Array.isArray(data) ? respondents.length : (data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const contactMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRespondent) throw new Error('No respondent selected');

      const attempt = await api.contactAttempts.createByAction(session!, actionId, selectedRespondent.id, {
        outcome,
        notes: notes || undefined,
        scheduled_at: outcome === 'scheduled' ? scheduledAt : undefined,
      });

      if (outcome === 'success') {
        try {
          const active = await api.interviews.findActive(
            session!,
            selectedRespondent.campaign_id,
            selectedRespondent.id,
          );
          if (active) {
            return { attempt, interviewId: active.id };
          }

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

  const handleUploadAudio = async (respondent: RespondentWithStatus, file: File) => {
    try {
      setUploadingId(respondent.id);
      setUploadSuccess(null);
      const active = await api.interviews.findActive(session!, respondent.campaign_id, respondent.id);
      if (!active) {
        setError('Nenhuma entrevista encontrada para este contato');
        return;
      }
      await api.interviews.uploadAudio(session!, active.id, file);
      setUploadSuccess(respondent.id);
      setTimeout(() => setUploadSuccess(null), 3000);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Erro no upload do áudio');
    } finally {
      setUploadingId(null);
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

      {/* Search + Filter */}
      <div className="space-y-2">
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nome, código, conta ou telefone..."
        />
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full md:w-56">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </div>

      {/* Total count */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{total} contato{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
        <span>Página {page} de {totalPages}</span>
      </div>

      {respondentsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : respondents.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <Table
          emptyLabel={t('empty')}
          headers={[t('colName'), 'Código', t('colAccount'), t('colPhone'), t('colStatus'), '']}
          rows={respondents.map((r) => [
            <div key={`n-${r.id}`}>
              <span className="font-medium">{r.name}</span>
              {r.job_title && <span className="block text-xs text-slate-400">{r.job_title}</span>}
            </div>,
            <span key={`c-${r.id}`} className="text-xs text-slate-500">{r.external_id || '—'}</span>,
            r.account_name || '—',
            r.phone || '—',
            <Badge key={`s-${r.id}`} tone={STATUS_TONES[r.contact_status] ?? 'neutral'}>
              {STATUS_OPTIONS.find((o) => o.value === r.contact_status)?.label || r.contact_status}
            </Badge>,
            <div key={`a-${r.id}`} className="flex items-center gap-1">
              {r.contact_status === 'in_progress' ? (
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleResume(r)}>
                  {t('resume')}
                </Button>
              ) : r.contact_status !== 'completed' ? (
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openModal(r)}>
                  {t('contact')}
                </Button>
              ) : null}
              {(r.contact_status === 'completed' || r.contact_status === 'in_progress' || r.contact_status === 'success') && (
                <>
                  {r.has_audio && (
                    <span className={`rounded px-2 py-1 text-xs font-medium ${r.audio_processed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`} title={r.audio_processed ? 'Áudio processado' : 'Processando áudio...'}>
                      {r.audio_processed ? '✓ Áudio' : '⏳ Áudio'}
                    </span>
                  )}
                  <label className={`cursor-pointer rounded px-2 py-1 text-xs font-medium transition ${uploadSuccess === r.id ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} title="Enviar áudio">
                    {uploadingId === r.id ? '...' : uploadSuccess === r.id ? '✓' : '🎤'}
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAudio(r, file);
                        e.target.value = '';
                      }}
                      disabled={uploadingId === r.id}
                    />
                  </label>
                </>
              )}
            </div>,
          ])}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Anterior
          </Button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
            if (p < 1 || p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded text-xs font-medium ${p === page ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {p}
              </button>
            );
          })}
          <Button
            variant="ghost"
            className="h-8 px-3 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima →
          </Button>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t('attemptTitle')}>
        {selectedRespondent && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{selectedRespondent.name}</p>
              <p className="text-sm text-slate-500">{selectedRespondent.phone || '—'}</p>
              {selectedRespondent.external_id && (
                <p className="text-xs text-slate-400">Código: {selectedRespondent.external_id}</p>
              )}
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
