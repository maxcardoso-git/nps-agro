'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import type { InterviewSummary } from '@/lib/types';

export default function InterviewDetailPage() {
  const t = useTranslations('reports');
  const params = useParams<{ interviewId: string }>();
  const searchParams = useSearchParams();
  const { session } = useRequiredSession();

  const interviewId = params.interviewId;
  const campaignId = searchParams.get('campaignId') || '';

  const interviewsQuery = useQuery({
    queryKey: ['interview-detail', campaignId],
    queryFn: () => apiClient.reports.listInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId)
  });

  const interviews = extractItems(interviewsQuery.data) as InterviewSummary[];
  const detail = interviews.find((item) => item.interview_id === interviewId);

  if (!campaignId) {
    return (
      <Card>
        <p className="text-sm text-slate-600">{t('interviews.missingCampaign')}</p>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <p className="text-sm text-slate-600">{t('interviews.notFound')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('interviewDetail.title')}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t('interviewDetail.respondent')}>
          <p className="text-sm text-slate-700">{detail.respondent_name}</p>
          <p className="mt-1 text-xs text-slate-500">{detail.region || '-'}</p>
        </Card>

        <Card title={t('interviewDetail.metrics')}>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">NPS {detail.nps_score ?? '-'}</Badge>
            <Badge tone="neutral">{detail.nps_class || '-'}</Badge>
            <Badge tone="neutral">{detail.sentiment || '-'}</Badge>
            <Badge tone="neutral">{detail.channel}</Badge>
          </div>
        </Card>
      </div>

      <Card title={t('interviewDetail.summary')}>
        <p className="text-sm text-slate-700">{detail.summary_text || '-'}</p>
      </Card>

      <Card title={t('interviewDetail.topics')}>
        <div className="flex flex-wrap gap-2">
          {(detail.topics_json || []).map((topic) => (
            <Badge key={topic} tone="neutral">
              {topic}
            </Badge>
          ))}
          {(detail.topics_json || []).length === 0 ? <p className="text-sm text-slate-500">-</p> : null}
        </div>
      </Card>
    </div>
  );
}
