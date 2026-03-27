'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';

export default function OperationsPage() {
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['ops-campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });
  const campaigns = extractItems(campaignsQuery.data);

  // Get contact stats for selected campaign
  const contactStatsQuery = useQuery({
    queryKey: ['ops-contact-stats', campaignId],
    queryFn: async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      const res = await fetch(`${API_URL}/campaigns/${campaignId}/contact-stats`, {
        headers: { 'Authorization': `Bearer ${session!.access_token}`, 'x-tenant-id': session!.user.tenant_id },
      });
      if (!res.ok) return [];
      const body = await res.json();
      return body?.data || body || [];
    },
    enabled: Boolean(session && campaignId),
  });

  // Get executive summary for NPS data
  const summaryQuery = useQuery({
    queryKey: ['ops-summary', campaignId],
    queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  const qualityQuery = useQuery({
    queryKey: ['ops-quality'],
    queryFn: () => apiClient.reports.qualityStats(session!),
    enabled: Boolean(session),
  });

  const contactStats = (contactStatsQuery.data || []) as Array<{ status: string; count: number }>;
  const summary = summaryQuery.data;
  const quality = qualityQuery.data as { pending: number; approved: number; rejected: number; avg_score: number | null; rejection_rate: number | null } | null;

  // Aggregate contact stats
  const getCount = (status: string) => contactStats.find((s) => s.status === status)?.count || 0;
  const totalContacts = contactStats.reduce((s, r) => s + r.count, 0);
  const completed = getCount('completed');
  const pending = getCount('pending');
  const inProgress = getCount('in_progress');
  const success = getCount('success');
  const noAnswer = getCount('no_answer');
  const refused = getCount('refused');
  const scheduled = getCount('scheduled');
  const wrongNumber = getCount('wrong_number');
  const busy = getCount('busy');
  const contacted = completed + success + inProgress;
  const conversionRate = totalContacts > 0 ? ((completed / totalContacts) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Métricas Operacionais</h1>
        <p className="mt-1 text-sm text-slate-500">Acompanhamento da operação de coleta e qualidade</p>
      </div>

      {/* Campaign selector */}
      <Card>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Campanha</label>
          <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="flex-1">
            <option value="">Selecione uma campanha...</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      {campaignId && (
        <>
          {/* Main KPIs */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="border-l-4 border-l-blue-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Contatos</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{totalContacts}</p>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Concluídos</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{completed}</p>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Pendentes</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{pending}</p>
            </Card>
            <Card className="border-l-4 border-l-cyan-500">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Contatados</p>
              <p className="mt-2 text-3xl font-bold text-cyan-600">{contacted}</p>
            </Card>
            <Card className="border-l-4 border-l-primary">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Conversão</p>
              <p className="mt-2 text-3xl font-bold text-primary">{conversionRate}%</p>
            </Card>
          </div>

          {/* Progress bar */}
          {totalContacts > 0 && (
            <Card>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Progresso da Campanha</span>
                <span>{completed} de {totalContacts} concluídos</span>
              </div>
              <div className="h-4 rounded-full bg-slate-200 overflow-hidden">
                <div className="flex h-full">
                  <div className="bg-green-500" style={{ width: `${(completed / totalContacts) * 100}%` }} />
                  <div className="bg-cyan-400" style={{ width: `${(inProgress / totalContacts) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(scheduled / totalContacts) * 100}%` }} />
                  <div className="bg-red-400" style={{ width: `${((noAnswer + refused) / totalContacts) * 100}%` }} />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Concluído ({completed})</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" /> Em andamento ({inProgress})</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Agendado ({scheduled})</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Sem sucesso ({noAnswer + refused})</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Pendente ({pending})</span>
              </div>
            </Card>
          )}

          {/* Detail breakdown table */}
          <Card title="Breakdown por Status">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold">Quantidade</th>
                  <th className="px-3 py-2 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: 'Concluído', count: completed, tone: 'success' },
                  { label: 'Contatado (sucesso)', count: success, tone: 'success' },
                  { label: 'Em andamento', count: inProgress, tone: 'warning' },
                  { label: 'Agendado', count: scheduled, tone: 'warning' },
                  { label: 'Não atendeu', count: noAnswer, tone: 'danger' },
                  { label: 'Ocupado', count: busy, tone: 'warning' },
                  { label: 'Nº errado', count: wrongNumber, tone: 'danger' },
                  { label: 'Recusou', count: refused, tone: 'danger' },
                  { label: 'Pendente', count: pending, tone: 'neutral' },
                ].filter((r) => r.count > 0).map((r) => (
                  <tr key={r.label}>
                    <td className="px-3 py-2">
                      <Badge tone={r.tone as 'success' | 'warning' | 'danger' | 'neutral'}>{r.label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{r.count}</td>
                    <td className="px-3 py-2 text-right">{totalContacts > 0 ? `${((r.count / totalContacts) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">{totalContacts}</td>
                  <td className="px-3 py-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* NPS Summary if available */}
          {summary && (
            <Card title="NPS da Campanha">
              <div className="grid gap-4 md:grid-cols-4 text-center">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className={`text-3xl font-bold ${summary.kpis.nps >= 50 ? 'text-green-600' : summary.kpis.nps >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{summary.kpis.nps}</p>
                  <p className="text-xs text-slate-500">NPS Score</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-2xl font-bold text-green-600">{summary.kpis.promoters}</p>
                  <p className="text-xs text-green-700">Promotores ({summary.kpis.total_interviews > 0 ? Math.round((summary.kpis.promoters / summary.kpis.total_interviews) * 100) : 0}%)</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-2xl font-bold text-amber-600">{summary.kpis.neutrals}</p>
                  <p className="text-xs text-amber-700">Neutros ({summary.kpis.total_interviews > 0 ? Math.round((summary.kpis.neutrals / summary.kpis.total_interviews) * 100) : 0}%)</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-2xl font-bold text-red-600">{summary.kpis.detractors}</p>
                  <p className="text-xs text-red-700">Detratores ({summary.kpis.total_interviews > 0 ? Math.round((summary.kpis.detractors / summary.kpis.total_interviews) * 100) : 0}%)</p>
                </div>
              </div>
            </Card>
          )}

          {/* Quality stats */}
          {quality && (quality.pending > 0 || quality.approved > 0 || quality.rejected > 0) && (
            <Card title="Controle de Qualidade">
              <div className="grid gap-4 md:grid-cols-4 text-center">
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-2xl font-bold text-amber-600">{quality.pending}</p>
                  <p className="text-xs text-amber-700">Pendentes</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-2xl font-bold text-green-600">{quality.approved}</p>
                  <p className="text-xs text-green-700">Aprovadas</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-2xl font-bold text-red-600">{quality.rejected}</p>
                  <p className="text-xs text-red-700">Rejeitadas</p>
                </div>
                <div className="rounded-lg bg-purple-50 p-3">
                  <p className="text-2xl font-bold text-purple-600">{quality.avg_score ?? '—'}</p>
                  <p className="text-xs text-purple-700">Score Médio</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {!campaignId && (
        <p className="py-8 text-center text-sm text-slate-400">Selecione uma campanha para ver as métricas operacionais</p>
      )}
    </div>
  );
}
