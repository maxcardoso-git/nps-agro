'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { QuestionRenderer } from '@/components/survey/question-renderer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';
import type { Question } from '@/lib/types';

export default function InterviewsPage() {
  const t = useTranslations('survey');
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');
  const [respondentId, setRespondentId] = useState('');
  const [interviewId, setInterviewId] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answerValue, setAnswerValue] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  const campaignsQuery = useQuery({
    queryKey: ['survey', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const startMutation = useMutation({
    mutationFn: () =>
      apiClient.interviews.start(session!, {
        tenant_id: session!.user.tenant_id,
        campaign_id: campaignId,
        respondent_id: respondentId
      }),
    onSuccess: (data) => {
      setInterviewId(data.interview_id);
      setCurrentQuestion(data.next_question);
      setProgress(data.interview_state.progress);
      setAnswerValue(undefined);
      setError(null);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!interviewId || !currentQuestion) {
        return;
      }

      await apiClient.interviews.answer(session!, interviewId, {
        question_id: currentQuestion.id,
        value: answerValue
      });

      const next = await apiClient.interviews.next(session!, interviewId);
      setCurrentQuestion(next.next_question);
      setProgress(next.interview_state.progress);
      setAnswerValue(undefined);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const completeMutation = useMutation({
    mutationFn: () => apiClient.interviews.complete(session!, interviewId),
    onSuccess: () => {
      setCurrentQuestion(null);
      setProgress(100);
      setError(null);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const campaigns = extractItems(campaignsQuery.data);

  return (
    <PermissionGate permission="interview.execute">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('startTitle')}>
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
              <option value="">{t('fields.campaign')}</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </Select>
            <Input
              placeholder={t('fields.respondentId')}
              value={respondentId}
              onChange={(event) => setRespondentId(event.target.value)}
            />
            <Button onClick={() => startMutation.mutate()} disabled={!campaignId || !respondentId}>
              {t('actions.start')}
            </Button>
          </div>
        </Card>

        <Card title={t('stateTitle')}>
          <p className="text-sm text-slate-700">{t('fields.interviewId')}: {interviewId || '-'}</p>
          <p className="text-sm text-slate-700">{t('fields.progress')}: {progress}%</p>
        </Card>

        {currentQuestion ? (
          <div className="space-y-3">
            <QuestionRenderer question={currentQuestion} value={answerValue} onChange={setAnswerValue} />
            <div className="flex gap-2">
              <Button onClick={() => answerMutation.mutate()}>{t('actions.answer')}</Button>
              <Button variant="secondary" onClick={() => completeMutation.mutate()}>
                {t('actions.complete')}
              </Button>
            </div>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-slate-600">{t('noQuestion')}</p>
          </Card>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </PermissionGate>
  );
}
