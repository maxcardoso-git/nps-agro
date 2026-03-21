'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/analytics/kpi-card';
import { FilterPanel } from '@/components/analytics/filter-panel';
import { InterviewTable } from '@/components/analytics/interview-table';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { buildTrendFromInterviews, filterInterviews } from '@/lib/analytics/transform';
import { extractItems } from '@/lib/api/helpers';
import type { InterviewSummary } from '@/lib/types';

const TrendChart = dynamic(
  () => import('@/components/charts/trend-chart').then((mod) => mod.TrendChart),
  { ssr: false }
);

const SentimentPieChart = dynamic(
  () => import('@/components/charts/sentiment-pie-chart').then((mod) => mod.SentimentPieChart),
  { ssr: false }
);

const TopicBarChart = dynamic(
  () => import('@/components/charts/topic-bar-chart').then((mod) => mod.TopicBarChart),
  { ssr: false }
);

export default function CampaignDetailPage() {
  const t = useTranslations('reports');
  const locale = useLocale();
  const params = useParams<{ campaignId: string }>();
  const router = useRouter();
  const { session } = useRequiredSession();

  const [region, setRegion] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const campaignId = params.campaignId;

  const campaignsQuery = useQuery({
    queryKey: ['campaign-detail', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const summaryQuery = useQuery({
    queryKey: ['campaign-detail', 'summary', campaignId],
    queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId)
  });

  const interviewsQuery = useQuery({
    queryKey: ['campaign-detail', 'interviews', campaignId],
    queryFn: () => apiClient.reports.listInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId)
  });

  const campaigns = extractItems(campaignsQuery.data);
  const summary = summaryQuery.data;
  const interviews = extractItems(interviewsQuery.data) as InterviewSummary[];

  const filteredInterviews = useMemo(
    () => filterInterviews(interviews, { region, sentiment, dateFrom, dateTo }),
    [interviews, region, sentiment, dateFrom, dateTo]
  );

  const trendData = useMemo(() => buildTrendFromInterviews(filteredInterviews), [filteredInterviews]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        {t('campaignDetail.title')} {summary?.campaign?.name ? `- ${summary.campaign.name}` : ''}
      </h1>

      <FilterPanel
        campaignId={campaignId}
        campaignOptions={campaigns.map((item) => ({ id: item.id, name: item.name }))}
        region={region}
        sentiment={sentiment}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onCampaignChange={(value) => {
          if (value) {
            router.push(`/${locale}/campaigns/${value}` as never);
          }
        }}
        onRegionChange={setRegion}
        onSentimentChange={setSentiment}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        labels={{
          title: t('filters.title'),
          campaign: t('filters.campaign'),
          region: t('filters.region'),
          sentiment: t('filters.sentiment'),
          dateFrom: t('filters.dateFrom'),
          dateTo: t('filters.dateTo'),
          allCampaigns: t('filters.allCampaigns'),
          allSentiments: t('filters.allSentiments')
        }}
      />

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <KpiCard title={t('kpi.nps')} value={summary.kpis.nps} />
            <KpiCard title={t('kpi.totalInterviews')} value={summary.kpis.total_interviews} />
            <KpiCard title={t('kpi.promoters')} value={summary.kpis.promoters} />
            <KpiCard title={t('kpi.neutrals')} value={summary.kpis.neutrals} />
            <KpiCard title={t('kpi.detractors')} value={summary.kpis.detractors} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={t('charts.trend')}>
              <TrendChart data={trendData} />
            </Card>
            <Card title={t('charts.sentiment')}>
              <SentimentPieChart data={summary.sentiment_distribution} />
            </Card>
            <Card title={t('charts.topics')}>
              <TopicBarChart data={summary.top_topics.slice(0, 10)} />
            </Card>
          </div>

          <InterviewTable
            title={t('campaignDetail.interviews')}
            interviews={filteredInterviews}
            emptyLabel={t('interviews.empty')}
            labels={{
              id: t('interviews.table.id'),
              respondent: t('interviews.table.respondent'),
              region: t('interviews.table.region'),
              nps: t('interviews.table.nps'),
              sentiment: t('interviews.table.sentiment'),
              status: t('interviews.table.status')
            }}
          />
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">{t('empty')}</p>
        </Card>
      )}
    </div>
  );
}
