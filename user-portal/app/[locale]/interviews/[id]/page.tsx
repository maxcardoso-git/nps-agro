'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import { extractItems } from '@/lib/utils';

export default function InterviewDetailPage() {
  const t = useTranslations('reports');
  const common = useTranslations('common');
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { session, logout } = useAuth();

  const interviewId = params.id;
  const campaignId = searchParams.get('campaignId') || '';

  const interviewsQuery = useQuery({
    queryKey: ['interview-detail', campaignId],
    queryFn: async () => api.reports.campaignInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId)
  });

  useEffect(() => {
    if (interviewsQuery.error instanceof ApiError && interviewsQuery.error.status === 401) {
      logout();
    }
  }, [interviewsQuery.error, logout]);

  if (!campaignId) {
    return (
      <Card>
        <p className="text-sm text-slate-500">{t('interviews.missingCampaign')}</p>
      </Card>
    );
  }

  if (interviewsQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-500">{common('loading')}</p>
      </Card>
    );
  }

  if (interviewsQuery.error) {
    return (
      <Card>
        <p className="text-sm text-red-600">{t('errors.generic')}</p>
      </Card>
    );
  }

  const interviews = extractItems(interviewsQuery.data);
  const interview = interviews.find((item) => item.interview_id === interviewId);

  if (!interview) {
    return (
      <Card>
        <p className="text-sm text-slate-500">{t('interviews.notFound')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('interviewDetail.title')}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t('interviewDetail.respondent')}>
          <p className="text-sm text-slate-800">{interview.respondent_name}</p>
          <p className="mt-1 text-xs text-slate-500">{interview.region || '-'}</p>
        </Card>
        <Card title={t('interviewDetail.metrics')}>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {t('kpis.nps')} {interview.nps_score ?? '-'}
            </Badge>
            <Badge tone="neutral">{interview.nps_class || '-'}</Badge>
            <Badge tone="neutral">{interview.sentiment || '-'}</Badge>
            <Badge tone="neutral">{interview.status}</Badge>
          </div>
        </Card>
      </div>

      <Card title={t('interviewDetail.summary')}>
        <p className="text-sm text-slate-700">{interview.summary_text || '-'}</p>
      </Card>

      <Card title={t('interviewDetail.topics')}>
        <div className="flex flex-wrap gap-2">
          {(interview.topics_json || []).map((topic) => (
            <Badge key={topic} tone="neutral">
              {topic}
            </Badge>
          ))}
          {(interview.topics_json || []).length === 0 ? <p className="text-sm text-slate-500">-</p> : null}
        </div>
      </Card>
    </div>
  );
}
