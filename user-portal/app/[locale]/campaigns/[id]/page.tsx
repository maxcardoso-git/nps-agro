'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';
import { extractItems } from '@/lib/utils';
import { applyFilters, buildNpsTrend } from '@/modules/dashboard/transform';
import { KpiCard } from '@/modules/dashboard/components/KpiCard';
import { FilterPanel } from '@/modules/campaign-analytics/components/FilterPanel';

const TrendChart = dynamic(() => import('@/components/charts/TrendChart').then((mod) => mod.TrendChart), {
  ssr: false
});

const SentimentPieChart = dynamic(
  () => import('@/components/charts/SentimentPieChart').then((mod) => mod.SentimentPieChart),
  { ssr: false }
);

export default function CampaignDetailPage() {
  const t = useTranslations('reports');
  const common = useTranslations('common');
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, logout } = useAuth();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [region, setRegion] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [npsMin, setNpsMin] = useState('');
  const [npsMax, setNpsMax] = useState('');

  const campaignId = params.id;

  const campaignsQuery = useQuery({
    queryKey: ['campaign-detail', 'campaigns'],
    queryFn: async () => api.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const summaryQuery = useQuery({
    queryKey: ['campaign-detail', 'summary', campaignId],
    queryFn: async () => api.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId)
  });

  const interviewsQuery = useQuery({
    queryKey: ['campaign-detail', 'interviews', campaignId],
    queryFn: async () => api.reports.campaignInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId)
  });

  const campaigns = extractItems(campaignsQuery.data);
  const summary = summaryQuery.data;
  const interviews = extractItems(interviewsQuery.data);
  const onError = [campaignsQuery.error, summaryQuery.error, interviewsQuery.error].find(Boolean);

  useEffect(() => {
    if (onError instanceof ApiError && onError.status === 401) {
      logout();
    }
  }, [onError, logout]);

  const filteredInterviews = useMemo(
    () =>
      applyFilters(interviews, {
        date_from: dateFrom,
        date_to: dateTo,
        region,
        sentiment,
        nps_min: npsMin,
        nps_max: npsMax
      }),
    [interviews, dateFrom, dateTo, region, sentiment, npsMin, npsMax]
  );

  const trend = useMemo(() => buildNpsTrend(filteredInterviews), [filteredInterviews]);

  if (campaignsQuery.isLoading || summaryQuery.isLoading || interviewsQuery.isLoading) {
    return (
      <Card>
        <p className="text-sm text-slate-500">{common('loading')}</p>
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

  if (!summary) {
    return (
      <Card>
        <p className="text-sm text-slate-500">{t('empty')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('campaignDetail.title')}</h1>

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
        onCampaignChange={(value) => {
          if (!value || value === campaignId) {
            return;
          }
          router.push(`/${locale}/campaigns/${value}`);
        }}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onRegionChange={setRegion}
        onSentimentChange={setSentiment}
        onNpsMinChange={setNpsMin}
        onNpsMaxChange={setNpsMax}
      />

      <div className="grid gap-4 md:grid-cols-5">
        <KpiCard label={t('kpis.nps')} value={summary.kpis.nps} />
        <KpiCard label={t('kpis.totalInterviews')} value={summary.kpis.total_interviews} />
        <KpiCard label={t('kpis.promoters')} value={summary.kpis.promoters} />
        <KpiCard label={t('kpis.neutrals')} value={summary.kpis.neutrals} />
        <KpiCard label={t('kpis.detractors')} value={summary.kpis.detractors} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('charts.trend')}>
          <TrendChart data={trend} />
        </Card>
        <Card title={t('charts.sentiment')}>
          <SentimentPieChart data={summary.sentiment_distribution} />
        </Card>
      </div>

      <Card title={t('campaignDetail.interviews')}>
        <Table
          headers={[
            t('interviews.headers.id'),
            t('interviews.headers.respondent'),
            t('interviews.headers.region'),
            t('interviews.headers.nps'),
            t('interviews.headers.sentiment'),
            t('interviews.headers.action')
          ]}
          emptyLabel={t('interviews.empty')}
          rows={filteredInterviews.map((item) => [
            item.interview_id,
            item.respondent_name,
            item.region || '-',
            item.nps_score ?? '-',
            item.sentiment || '-',
            <Link key={item.interview_id} href={`/${locale}/interviews/${item.interview_id}?campaignId=${campaignId}` as never} className="text-primary underline">
              {t('interviews.open')}
            </Link>
          ])}
        />
      </Card>
    </div>
  );
}
