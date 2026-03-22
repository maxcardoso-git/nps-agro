'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { QuestionRenderer } from '@/components/survey/question-renderer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';
import type { Question } from '@/lib/types';

type View = 'select' | 'contacts' | 'interview';

interface ActionItem {
  id: string;
  name: string;
  status: string;
  questionnaire_name: string | null;
  respondent_count: number;
}

interface RespondentItem {
  id: string;
  name: string;
  phone: string | null;
  account_name: string | null;
  contact_status: string;
  campaign_id: string;
}

export default function InterviewsPage() {
  const t = useTranslations('survey');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>('select');
  const [campaignId, setCampaignId] = useState('');
  const [actionId, setActionId] = useState('');
  const [interviewId, setInterviewId] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answerValue, setAnswerValue] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Campaigns
  const campaignsQuery = useQuery({
    queryKey: ['survey', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session),
  });
  const campaigns = extractItems(campaignsQuery.data);

  // Actions for selected campaign
  const actionsQuery = useQuery({
    queryKey: ['survey', 'actions', campaignId],
    queryFn: () => apiClient.campaignActions.list(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });
  const actions = (actionsQuery.data ?? []) as ActionItem[];

  // Respondents for selected action
  const respondentsQuery = useQuery({
    queryKey: ['survey', 'respondents', actionId],
    queryFn: () => apiClient.campaignActions.getRespondents(session!, actionId),
    enabled: Boolean(session && actionId && view === 'contacts'),
  });
  const respondents = (respondentsQuery.data ?? []) as RespondentItem[];

  // Start interview
  const startMutation = useMutation({
    mutationFn: async (respondent: RespondentItem) => {
      const result = await apiClient.interviews.start(session!, {
        tenant_id: session!.user.tenant_id,
        campaign_id: respondent.campaign_id || campaignId,
        respondent_id: respondent.id,
      });
      return result;
    },
    onSuccess: (data) => {
      setInterviewId(data.interview_id);
      setCurrentQuestion(data.next_question);
      setProgress(data.interview_state.progress);
      setAnswerValue(undefined);
      setError(null);
      setView('interview');
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  // Answer
  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!interviewId || !currentQuestion) return;
      await apiClient.interviews.answer(session!, interviewId, {
        question_id: currentQuestion.id,
        value: answerValue,
      });
      const next = await apiClient.interviews.next(session!, interviewId);
      setCurrentQuestion(next.next_question);
      setProgress(next.interview_state.progress);
      setAnswerValue(undefined);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  // Complete
  const completeMutation = useMutation({
    mutationFn: () => apiClient.interviews.complete(session!, interviewId),
    onSuccess: () => {
      setCurrentQuestion(null);
      setProgress(100);
      setError(null);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const statusTone = (s: string) => {
    if (s === 'active' || s === 'completed') return 'success' as const;
    if (s === 'in_progress' || s === 'scheduled' || s === 'paused') return 'warning' as const;
    if (s === 'pending') return 'neutral' as const;
    return 'danger' as const;
  };

  const handleSelectAction = (id: string) => {
    setActionId(id);
    setView('contacts');
  };

  const handleBack = () => {
    if (view === 'interview') {
      setView('contacts');
      setInterviewId('');
      setCurrentQuestion(null);
      queryClient.invalidateQueries({ queryKey: ['survey', 'respondents', actionId] });
    } else if (view === 'contacts') {
      setView('select');
      setActionId('');
    }
  };

  return (
    <PermissionGate permission="campaign.read">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {view !== 'select' && (
            <Button variant="ghost" onClick={handleBack}>
              ← {t('back')}
            </Button>
          )}
          <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* SELECT: Campaign + Action */}
        {view === 'select' && (
          <>
            <Card title={t('selectCampaign')}>
              <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
                <option value="">{t('fields.campaign')}</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Card>

            {campaignId && (
              <Card title={t('selectAction')}>
                {actionsQuery.isLoading ? (
                  <p className="text-sm text-slate-400">{t('loading')}</p>
                ) : actions.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('noActions')}</p>
                ) : (
                  <Table
                    headers={[t('actionName'), t('actionForm'), t('actionContacts'), t('actionStatus'), '']}
                    rows={actions.map((a) => [
                      a.name,
                      a.questionnaire_name || '—',
                      a.respondent_count,
                      <Badge key={`s-${a.id}`} tone={statusTone(a.status)}>{a.status}</Badge>,
                      <Button key={`a-${a.id}`} variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleSelectAction(a.id)}>
                        {t('openContacts')}
                      </Button>,
                    ])}
                  />
                )}
              </Card>
            )}
          </>
        )}

        {/* CONTACTS: Respondent list */}
        {view === 'contacts' && (
          <Card title={t('contactsTitle')}>
            {respondentsQuery.isLoading ? (
              <p className="text-sm text-slate-400">{t('loading')}</p>
            ) : respondents.length === 0 ? (
              <p className="text-sm text-slate-400">{t('noContacts')}</p>
            ) : (
              <Table
                headers={[t('contactName'), t('contactAccount'), t('contactPhone'), t('contactStatus'), '']}
                rows={respondents.map((r) => [
                  r.name,
                  r.account_name || '—',
                  r.phone || '—',
                  <Badge key={`s-${r.id}`} tone={statusTone(r.contact_status)}>{r.contact_status}</Badge>,
                  r.contact_status !== 'completed' ? (
                    <Button key={`a-${r.id}`} variant="ghost" className="h-7 px-2 text-xs" onClick={() => startMutation.mutate(r)}>
                      {r.contact_status === 'in_progress' ? t('resume') : t('startInterview')}
                    </Button>
                  ) : null,
                ])}
              />
            )}
          </Card>
        )}

        {/* INTERVIEW: Question flow */}
        {view === 'interview' && (
          <>
            <Card title={t('stateTitle')}>
              <p className="text-sm text-slate-700">{t('fields.interviewId')}: {interviewId || '-'}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{progress}%</p>
            </Card>

            {currentQuestion ? (
              <div className="space-y-3">
                <QuestionRenderer question={currentQuestion} value={answerValue} onChange={setAnswerValue} />
                <div className="flex gap-2">
                  <Button onClick={() => answerMutation.mutate()} disabled={answerMutation.isPending}>
                    {t('actions.answer')}
                  </Button>
                  <Button variant="secondary" onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
                    {t('actions.complete')}
                  </Button>
                </div>
              </div>
            ) : (
              <Card>
                <p className="text-sm text-slate-600">
                  {progress >= 100 ? t('interviewCompleted') : t('noQuestion')}
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </PermissionGate>
  );
}
