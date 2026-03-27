'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { session } = useRequiredSession();

  const campaignsQuery = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const questionnairesQuery = useQuery({
    queryKey: ['dashboard', 'questionnaires'],
    queryFn: () => apiClient.questionnaires.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const tenantQuery = useQuery({
    queryKey: ['dashboard', 'tenant', session?.user.tenant_id],
    queryFn: () => apiClient.tenants.getById(session!, session!.user.tenant_id),
    enabled: Boolean(session?.user.tenant_id)
  });

  const qualityQuery = useQuery({
    queryKey: ['dashboard', 'quality'],
    queryFn: () => apiClient.qualityReviews.stats(session!),
    enabled: Boolean(session)
  });

  const allCampaigns = extractItems(campaignsQuery.data);
  const activeCampaigns = allCampaigns.filter((c) => c.status === 'active');
  const questionnaires = extractItems(questionnairesQuery.data);

  // Fetch summaries for active campaigns
  const summaryQueries = useQueries({
    queries: activeCampaigns.map((c) => ({
      queryKey: ['dashboard', 'summary', c.id],
      queryFn: () => apiClient.reports.executiveSummary(session!, c.id),
      enabled: Boolean(session && c.id),
    })),
  });

  const summaries = summaryQueries.filter((q) => q.data).map((q) => q.data!);
  const totals = summaries.reduce((acc, s) => ({
    interviews: acc.interviews + s.kpis.total_interviews,
    promoters: acc.promoters + s.kpis.promoters,
    neutrals: acc.neutrals + s.kpis.neutrals,
    detractors: acc.detractors + s.kpis.detractors,
  }), { interviews: 0, promoters: 0, neutrals: 0, detractors: 0 });

  const globalNps = totals.interviews > 0
    ? Math.round(((totals.promoters - totals.detractors) / totals.interviews) * 100)
    : 0;

  const quality = qualityQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500">{tenantQuery.data?.name ?? '...'}</p>
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">NPS Global</p>
          <p className={`mt-2 text-4xl font-bold ${globalNps >= 50 ? 'text-green-600' : globalNps >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{globalNps}</p>
          <p className="text-xs text-slate-400">{activeCampaigns.length} campanha{activeCampaigns.length !== 1 ? 's' : ''} ativa{activeCampaigns.length !== 1 ? 's' : ''}</p>
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

      {/* Counts row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Campanhas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{allCampaigns.length}</p>
          <p className="text-xs text-slate-400">{activeCampaigns.length} ativas</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Questionários</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{questionnaires.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Reviews Pendentes</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{quality?.pending ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Reviews Aprovadas</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{quality?.approved ?? 0}</p>
        </Card>
      </div>

      {/* Active campaigns with NPS */}
      <Card title="Campanhas Ativas">
        {activeCampaigns.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Nenhuma campanha ativa</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Campanha</th>
                  <th className="px-3 py-2 text-left font-semibold">Segmento</th>
                  <th className="px-3 py-2 text-right font-semibold">NPS</th>
                  <th className="px-3 py-2 text-right font-semibold">Entrevistas</th>
                  <th className="px-3 py-2 text-right font-semibold">Promotores</th>
                  <th className="px-3 py-2 text-right font-semibold">Detratores</th>
                  <th className="px-3 py-2 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCampaigns.map((c, idx) => {
                  const s = summaries[idx];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/${locale}/campaigns/${c.id}` as never} className="text-primary hover:underline">
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{c.segment || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {s ? (
                          <span className={`text-lg font-bold ${s.kpis.nps >= 50 ? 'text-green-600' : s.kpis.nps >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                            {s.kpis.nps}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">{s?.kpis.total_interviews ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-green-600">{s?.kpis.promoters ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-red-600">{s?.kpis.detractors ?? '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <Link href={`/${locale}/campaigns/${c.id}` as never} className="text-xs text-primary hover:underline">
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Top topics across all campaigns */}
      {summaries.length > 0 && (() => {
        const allTopics = summaries.flatMap((s) => s.top_topics);
        const topicMap = new Map<string, number>();
        allTopics.forEach((t) => topicMap.set(t.topic, (topicMap.get(t.topic) || 0) + t.frequency));
        const sorted = Array.from(topicMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
        if (sorted.length === 0) return null;
        return (
          <Card title="Top Temas (todas as campanhas)">
            <div className="space-y-2">
              {sorted.map(([topic, freq]) => (
                <div key={topic} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium">{topic}</span>
                  <Badge tone="neutral">{freq} menções</Badge>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}
    </div>
  );
}
