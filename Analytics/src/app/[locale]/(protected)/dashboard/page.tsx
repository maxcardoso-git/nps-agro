'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { InsightCard } from '@/components/analytics/insight-card';
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

function NpsGauge({ value }: { value: number }) {
  const color = value >= 50 ? '#10b981' : value >= 0 ? '#f59e0b' : '#ef4444';
  const label = value >= 50 ? 'Excelente' : value >= 0 ? 'Bom' : 'Crítico';
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${Math.max(0, (value + 100) / 200) * 264} 264`}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
      </div>
      <span className="mt-1 text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { session } = useRequiredSession();

  const [campaignId, setCampaignId] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['analytics-dashboard', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session),
  });

  const campaigns = extractItems(campaignsQuery.data);

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) setCampaignId(campaigns[0].id);
  }, [campaignId, campaigns]);

  const summaryQuery = useQuery({
    queryKey: ['analytics-dashboard', 'summary', campaignId],
    queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  const interviewsQuery = useQuery({
    queryKey: ['analytics-dashboard', 'interviews', campaignId],
    queryFn: () => apiClient.reports.listInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId),
  });

  // New analytics views
  const segmentQuery = useQuery({
    queryKey: ['analytics-dashboard', 'segments', campaignId],
    queryFn: () => apiClient.reports.npsBySegment(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const regionQuery = useQuery({
    queryKey: ['analytics-dashboard', 'regions', campaignId],
    queryFn: () => apiClient.reports.npsByRegion(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const accountQuery = useQuery({
    queryKey: ['analytics-dashboard', 'accounts', campaignId],
    queryFn: () => apiClient.reports.npsByAccount(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const interviewItems = extractItems(interviewsQuery.data) as InterviewSummary[];
  const filteredInterviews = useMemo(() => filterInterviews(interviewItems, {}), [interviewItems]);
  const trendData = useMemo(() => buildTrendFromInterviews(filteredInterviews), [filteredInterviews]);
  const summary = summaryQuery.data;
  const insights = summary ? buildInsights(summary) : [];
  const segments = segmentQuery.data ?? [];
  const regions = regionQuery.data ?? [];
  const topAccounts = (accountQuery.data ?? []).slice(0, 10);

  const recentDetractors = filteredInterviews
    .filter((item) => item.nps_class === 'detractor')
    .slice(0, 5);

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          {selectedCampaign && (
            <p className="mt-1 text-sm text-slate-500">
              {selectedCampaign.name}
              {selectedCampaign.segment && <Badge tone="neutral" className="ml-2">{selectedCampaign.segment}</Badge>}
            </p>
          )}
        </div>
        <Select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="max-w-xs"
        >
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>

      {summary ? (
        <>
          {/* KPI Row — NPS gauge + 4 metric cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="flex items-center justify-center border-l-4 border-l-primary">
              <NpsGauge value={summary.kpis.nps} />
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t('kpi.totalInterviews')}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.kpis.total_interviews}</p>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t('kpi.promoters')}</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{summary.kpis.promoters}</p>
              <p className="text-xs text-slate-400">
                {summary.kpis.total_interviews > 0
                  ? `${((summary.kpis.promoters / summary.kpis.total_interviews) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t('kpi.neutrals')}</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{summary.kpis.neutrals}</p>
              <p className="text-xs text-slate-400">
                {summary.kpis.total_interviews > 0
                  ? `${((summary.kpis.neutrals / summary.kpis.total_interviews) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{t('kpi.detractors')}</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{summary.kpis.detractors}</p>
              <p className="text-xs text-slate-400">
                {summary.kpis.total_interviews > 0
                  ? `${((summary.kpis.detractors / summary.kpis.total_interviews) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </Card>
          </div>

          {/* Charts — 2 columns */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t('charts.trend')}>
              <div className="h-72">
                <TrendChart data={trendData} />
              </div>
            </Card>
            <Card title={t('charts.sentiment')}>
              <div className="h-72">
                <SentimentPieChart data={summary.sentiment_distribution} />
              </div>
            </Card>
          </div>

          {/* Topics + Insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title={t('charts.topics')}>
              <div className="h-64">
                <TopicBarChart data={summary.top_topics.slice(0, 10)} />
              </div>
            </Card>
            <Card title={t('insights.title')}>
              <div className="space-y-2">
                {insights.map((item, i) => (
                  <InsightCard key={i} title={item.title} description={item.description} tone={item.tone} />
                ))}
                {recentDetractors.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-red-500">{t('alerts.title')}</p>
                    {recentDetractors.map((d) => (
                      <InsightCard
                        key={d.interview_id}
                        title={d.respondent_name}
                        description={`${d.region || '—'} · NPS ${d.nps_score ?? '—'}`}
                        tone="danger"
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* NPS by Segment + Region + Top Accounts — 3 columns */}
          <div className="grid gap-4 lg:grid-cols-3">
            {segments.length > 0 && (
              <Card title="NPS por Segmento">
                <div className="space-y-2">
                  {segments.map((s) => (
                    <div key={s.segment} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-sm font-medium">{s.segment}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{s.total_interviews} ent.</span>
                        <Badge tone={s.nps_score >= 50 ? 'success' : s.nps_score >= 0 ? 'warning' : 'danger'}>
                          {s.nps_score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {regions.length > 0 && (
              <Card title="NPS por Região">
                <div className="space-y-2">
                  {regions.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-sm font-medium">{r.region || '—'} <span className="text-xs text-slate-400">{r.state}</span></span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{r.total_interviews} ent.</span>
                        <Badge tone={r.nps_score >= 50 ? 'success' : r.nps_score >= 0 ? 'warning' : 'danger'}>
                          {r.nps_score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {topAccounts.length > 0 && (
              <Card title="Top 10 Contas">
                <div className="space-y-2">
                  {topAccounts.map((a) => (
                    <div key={a.account_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span className="truncate text-sm font-medium" title={a.account_name}>{a.account_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{a.total_interviews}</span>
                        <Badge tone={a.nps_score >= 50 ? 'success' : a.nps_score >= 0 ? 'warning' : 'danger'}>
                          {a.nps_score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Interviews table */}
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
              status: t('interviews.table.status'),
            }}
          />
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">{summaryQuery.isLoading ? t('loading') : t('empty')}</p>
        </Card>
      )}
    </div>
  );
}
