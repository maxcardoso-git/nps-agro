'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { KpiCard } from '@/components/analytics/kpi-card';
import { InsightCard } from '@/components/analytics/insight-card';
import { FilterPanel } from '@/components/analytics/filter-panel';
import { InterviewTable } from '@/components/analytics/interview-table';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { buildInsights, buildTrendFromInterviews, filterInterviews } from '@/lib/analytics/transform';
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

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { session } = useRequiredSession();

  const [campaignId, setCampaignId] = useState('');
  const [region, setRegion] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['analytics-dashboard', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100, status: 'active' }),
    enabled: Boolean(session)
  });

  const campaigns = extractItems(campaignsQuery.data);

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaignId, campaigns]);

  const summaryQuery = useQuery({
    queryKey: ['analytics-dashboard', 'summary', campaignId],
    queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId)
  });

  const interviewsQuery = useQuery({
    queryKey: ['analytics-dashboard', 'interviews', campaignId],
    queryFn: () =>
      apiClient.reports.listInterviews(session!, campaignId, {
        page: 1,
        page_size: 200
      }),
    enabled: Boolean(session && campaignId)
  });

  const interviewItems = extractItems(interviewsQuery.data) as InterviewSummary[];
  const filteredInterviews = useMemo(
    () =>
      filterInterviews(interviewItems, {
        region,
        sentiment,
        dateFrom,
        dateTo
      }),
    [interviewItems, region, sentiment, dateFrom, dateTo]
  );

  const trendData = useMemo(() => buildTrendFromInterviews(filteredInterviews), [filteredInterviews]);
  const summary = summaryQuery.data;
  const insights = summary ? buildInsights(summary) : [];

  const recentDetractors = filteredInterviews
    .filter((item) => item.nps_class === 'detractor')
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

      <FilterPanel
        campaignId={campaignId}
        campaignOptions={campaigns.map((item) => ({ id: item.id, name: item.name }))}
        region={region}
        sentiment={sentiment}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onCampaignChange={setCampaignId}
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
              <TopicBarChart data={summary.top_topics.slice(0, 8)} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t('insights.title')}>
              <div className="space-y-2">
                {insights.map((item, index) => (
                  <InsightCard
                    key={`${item.title}-${index}`}
                    title={item.title}
                    description={item.description}
                    tone={item.tone}
                  />
                ))}
              </div>
            </Card>

            <Card title={t('alerts.title')}>
              <div className="space-y-2">
                {recentDetractors.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('alerts.empty')}</p>
                ) : (
                  recentDetractors.map((item) => (
                    <InsightCard
                      key={item.interview_id}
                      title={t('alerts.recentDetractor')}
                      description={`${item.respondent_name} - ${item.region || '-'} - NPS ${item.nps_score ?? '-'}`}
                      tone="danger"
                    />
                  ))
                )}
              </div>
            </Card>
          </div>

          <InterviewTable
            title={t('interviews.title')}
            interviews={filteredInterviews.slice(0, 20)}
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
