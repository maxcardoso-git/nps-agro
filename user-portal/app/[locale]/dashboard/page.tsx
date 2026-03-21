'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import { extractItems } from '@/lib/utils';
import { applyFilters, buildNpsTrend } from '@/modules/dashboard/transform';
import { KpiCard } from '@/modules/dashboard/components/KpiCard';
import { NpsScore } from '@/modules/dashboard/components/NpsScore';
import { TopTopics } from '@/modules/dashboard/components/TopTopics';
import { FilterPanel } from '@/modules/campaign-analytics/components/FilterPanel';
import { InterviewTable } from '@/modules/interview-explorer/components/InterviewTable';

const TrendChart = dynamic(() => import('@/components/charts/TrendChart').then((mod) => mod.TrendChart), {
  ssr: false
});

const SentimentPieChart = dynamic(
  () => import('@/components/charts/SentimentPieChart').then((mod) => mod.SentimentPieChart),
  { ssr: false }
);

const RegionalBarChart = dynamic(
  () => import('@/components/charts/RegionalBarChart').then((mod) => mod.RegionalBarChart),
  { ssr: false }
);

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const locale = useLocale();
  const { session, logout } = useAuth();

  const [campaignId, setCampaignId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [region, setRegion] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [npsMin, setNpsMin] = useState('');
  const [npsMax, setNpsMax] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['user-portal', 'campaigns'],
    queryFn: async () => api.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session),
    retry: 0
  });

  const campaigns = extractItems(campaignsQuery.data);

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaignId, campaigns]);

  const summaryQuery = useQuery({
    queryKey: ['user-portal', 'summary', campaignId],
    queryFn: async () => api.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId),
    retry: 0
  });

  const interviewsQuery = useQuery({
    queryKey: ['user-portal', 'interviews', campaignId],
    queryFn: async () => api.reports.campaignInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId),
    retry: 0
  });

  const onError = [campaignsQuery.error, summaryQuery.error, interviewsQuery.error].find(Boolean);
  useEffect(() => {
    if (onError instanceof ApiError && onError.status === 401) {
      logout();
    }
  }, [onError, logout]);

  const interviews = extractItems(interviewsQuery.data);
  const filteredInterviews = useMemo(
    () =>
      applyFilters(interviews, {
        region,
        sentiment,
        date_from: dateFrom,
        date_to: dateTo,
        nps_min: npsMin,
        nps_max: npsMax
      }),
    [interviews, region, sentiment, dateFrom, dateTo, npsMin, npsMax]
  );

  const trend = useMemo(() => buildNpsTrend(filteredInterviews), [filteredInterviews]);
  const summary = summaryQuery.data;

  if (campaignsQuery.isLoading || summaryQuery.isLoading || interviewsQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-500">{common('loading')}</p>
      </Card>
    );
  }

  if (onError && onError instanceof ApiError && onError.status === 403) {
    return (
      <Card>
        <p className="text-sm text-red-600">{t('errors.forbidden')}</p>
      </Card>
    );
  }

  if (onError) {
    return (
      <Card>
        <p className="text-sm text-red-600">{t('errors.generic')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        <div className="w-72">
          <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
            <option value="">{t('filters.allCampaigns')}</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <FilterPanel
        labels={{
          title: t('filters.title'),
          campaign: t('filters.campaign'),
          dateFrom: t('filters.dateRangeStart'),
          dateTo: t('filters.dateRangeEnd'),
          region: t('filters.region'),
          sentiment: t('filters.sentiment'),
          npsMin: t('filters.npsMin'),
          npsMax: t('filters.npsMax'),
          allCampaigns: t('filters.allCampaigns'),
          allSentiments: t('filters.allSentiments'),
          sentiments: {
            positive: t('sentiments.positive'),
            neutral: t('sentiments.neutral'),
            negative: t('sentiments.negative'),
            mixed: t('sentiments.mixed'),
            unknown: t('sentiments.unknown')
          }
        }}
        campaignId={campaignId}
        campaignOptions={campaigns.map((item) => ({ id: item.id, name: item.name }))}
        dateFrom={dateFrom}
        dateTo={dateTo}
        region={region}
        sentiment={sentiment}
        npsMin={npsMin}
        npsMax={npsMax}
        onCampaignChange={setCampaignId}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRegionChange={setRegion}
        onSentimentChange={setSentiment}
        onNpsMinChange={setNpsMin}
        onNpsMaxChange={setNpsMax}
      />

      {summary ? (
        <>
          <div className="grid gap-4 md:grid-cols-6">
            <NpsScore label={t('kpis.nps')} value={summary.kpis.nps} />
            <KpiCard label={t('kpis.totalInterviews')} value={summary.kpis.total_interviews} />
            <KpiCard label={t('kpis.promoters')} value={summary.kpis.promoters} />
            <KpiCard label={t('kpis.neutrals')} value={summary.kpis.neutrals} />
            <KpiCard label={t('kpis.detractors')} value={summary.kpis.detractors} />
            <Card>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('campaign.title')}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{summary.campaign.name}</p>
              <div className="mt-3 text-primary underline">
                <Link href={`/${locale}/campaigns/${summary.campaign.id}` as never}>{t('campaign.open')}</Link>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={t('charts.trend')}>
              <TrendChart data={trend} />
            </Card>
            <Card title={t('charts.sentiment')}>
              <SentimentPieChart data={summary.sentiment_distribution} />
            </Card>
            <Card title={t('charts.regional')}>
              <RegionalBarChart data={summary.regional_breakdown.map((item) => ({ region: item.region, count: item.count }))} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopTopics title={t('insights.topTopics')} topics={summary.top_topics.slice(0, 8)} emptyLabel={t('insights.empty')} />
            <Card title={t('insights.alerts')}>
              <div className="space-y-2">
                {filteredInterviews.filter((item) => item.nps_class === 'detractor').slice(0, 6).map((item) => (
                  <div key={item.interview_id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.respondent_name}</p>
                      <p className="text-xs text-slate-500">{item.region || '-'}</p>
                    </div>
                    <Badge tone="danger">
                      {t('kpis.nps')} {item.nps_score ?? '-'}
                    </Badge>
                  </div>
                ))}
                {filteredInterviews.filter((item) => item.nps_class === 'detractor').length === 0 ? (
                  <p className="text-sm text-slate-500">{t('insights.noAlerts')}</p>
                ) : null}
              </div>
            </Card>
          </div>

          <Card title={t('interviews.title')}>
            <InterviewTable
              interviews={filteredInterviews.slice(0, 20)}
              labels={{
                headers: [
                  t('interviews.headers.id'),
                  t('interviews.headers.respondent'),
                  t('interviews.headers.region'),
                  t('interviews.headers.nps'),
                  t('interviews.headers.sentiment'),
                  t('interviews.headers.action')
                ],
                empty: t('interviews.empty'),
                open: t('interviews.open')
              }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">{t('empty')}</p>
        </Card>
      )}
    </div>
  );
}
