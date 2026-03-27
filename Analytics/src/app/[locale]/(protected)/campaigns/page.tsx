'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';

const CampaignCompareChart = dynamic(
  () => import('@/components/charts/campaign-compare-chart').then((mod) => mod.CampaignCompareChart),
  { ssr: false }
);

export default function CampaignsPage() {
  const t = useTranslations('reports');
  const locale = useLocale();
  const { session } = useRequiredSession();

  const campaignsQuery = useQuery({
    queryKey: ['analytics-campaigns', 'list'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const allCampaigns = extractItems(campaignsQuery.data);
  const campaigns = allCampaigns.filter((c) => c.status === 'active');

  // Auto-select all active campaigns for comparison
  const campaignIds = campaigns.map((c) => c.id);

  const summaryQueries = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: ['analytics-campaigns', 'summary', campaignId],
      queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
      enabled: Boolean(session && campaignId)
    }))
  });

  const summaries = summaryQueries.filter((q) => q.data).map((q) => q.data!);

  // Aggregate totals
  const totals = summaries.reduce((acc, s) => ({
    interviews: acc.interviews + s.kpis.total_interviews,
    promoters: acc.promoters + s.kpis.promoters,
    neutrals: acc.neutrals + s.kpis.neutrals,
    detractors: acc.detractors + s.kpis.detractors,
  }), { interviews: 0, promoters: 0, neutrals: 0, detractors: 0 });

  const globalNps = totals.interviews > 0
    ? Math.round(((totals.promoters - totals.detractors) / totals.interviews) * 100)
    : 0;

  const compareData = summaries.map((s) => ({ campaign: s.campaign.name, nps: s.kpis.nps }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Campanhas Ativas</h1>

      {/* Global KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">NPS Global</p>
          <p className={`mt-2 text-4xl font-bold ${globalNps >= 50 ? 'text-green-600' : globalNps >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{globalNps}</p>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Entrevistas</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totals.interviews}</p>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Promotores</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{totals.promoters}</p>
          <p className="text-xs text-slate-400">{totals.interviews > 0 ? `${Math.round((totals.promoters / totals.interviews) * 100)}%` : '—'}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Neutros</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totals.neutrals}</p>
          <p className="text-xs text-slate-400">{totals.interviews > 0 ? `${Math.round((totals.neutrals / totals.interviews) * 100)}%` : '—'}</p>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Detratores</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{totals.detractors}</p>
          <p className="text-xs text-slate-400">{totals.interviews > 0 ? `${Math.round((totals.detractors / totals.interviews) * 100)}%` : '—'}</p>
        </Card>
      </div>

      {/* NPS Comparison chart */}
      {compareData.length > 0 && (
        <Card title="NPS por Campanha">
          <div className="h-64">
            <CampaignCompareChart data={compareData} />
          </div>
        </Card>
      )}

      {/* Campaign cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((campaign, idx) => {
          const summary = summaries[idx];
          return (
            <Link key={campaign.id} href={`/${locale}/campaigns/${campaign.id}` as never}>
              <Card className="cursor-pointer transition hover:border-primary/50 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                    {campaign.segment && <Badge tone="neutral">{campaign.segment}</Badge>}
                  </div>
                  {summary && (
                    <span className={`text-2xl font-bold ${summary.kpis.nps >= 50 ? 'text-green-600' : summary.kpis.nps >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                      {summary.kpis.nps}
                    </span>
                  )}
                </div>
                {summary && (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded bg-slate-50 p-2">
                      <p className="font-bold text-slate-700">{summary.kpis.total_interviews}</p>
                      <p className="text-slate-500">Entrevistas</p>
                    </div>
                    <div className="rounded bg-green-50 p-2">
                      <p className="font-bold text-green-600">{summary.kpis.promoters}</p>
                      <p className="text-green-700">Promotores</p>
                    </div>
                    <div className="rounded bg-amber-50 p-2">
                      <p className="font-bold text-amber-600">{summary.kpis.neutrals}</p>
                      <p className="text-amber-700">Neutros</p>
                    </div>
                    <div className="rounded bg-red-50 p-2">
                      <p className="font-bold text-red-600">{summary.kpis.detractors}</p>
                      <p className="text-red-700">Detratores</p>
                    </div>
                  </div>
                )}
                {summary && summary.top_topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {summary.top_topics.slice(0, 5).map((topic) => (
                      <span key={topic.topic} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                        {topic.topic} ({topic.frequency})
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      {campaigns.length === 0 && !campaignsQuery.isLoading && (
        <p className="py-8 text-center text-sm text-slate-400">Nenhuma campanha ativa</p>
      )}
    </div>
  );
}
