'use client';

import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';

interface ExecutionStat {
  campaign_id: string;
  total_contacts: number;
  pending: number;
  in_progress: number;
  completed: number;
  exhausted: number;
  completion_rate: number;
  avg_attempts_to_complete: number;
}

interface QualityStat {
  total_reviews: number;
  approved: number;
  rejected: number;
  pending: number;
  avg_score: number | null;
  rejection_rate: number | null;
}

export default function OperationsPage() {
  const { session } = useRequiredSession();

  const execQuery = useQuery({
    queryKey: ['execution-stats'],
    queryFn: () => apiClient.reports.executionStats(session!),
    enabled: Boolean(session),
  });

  const qualityQuery = useQuery({
    queryKey: ['quality-stats'],
    queryFn: () => apiClient.reports.qualityStats(session!),
    enabled: Boolean(session),
  });

  const execStats = (execQuery.data as ExecutionStat[]) || [];
  const quality = qualityQuery.data as QualityStat | null;

  // Aggregate totals
  const totals = execStats.reduce(
    (acc, s) => ({
      contacts: acc.contacts + (s.total_contacts || 0),
      pending: acc.pending + (s.pending || 0),
      in_progress: acc.in_progress + (s.in_progress || 0),
      completed: acc.completed + (s.completed || 0),
      exhausted: acc.exhausted + (s.exhausted || 0),
    }),
    { contacts: 0, pending: 0, in_progress: 0, completed: 0, exhausted: 0 },
  );

  const completionRate = totals.contacts > 0
    ? ((totals.completed / totals.contacts) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Métricas Operacionais</h1>
        <p className="mt-1 text-sm text-slate-500">Acompanhamento da operação de coleta e qualidade</p>
      </div>

      {/* Execution KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-blue-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Contatos</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totals.contacts}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Pendentes</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totals.pending}</p>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Em Progresso</p>
          <p className="mt-2 text-3xl font-bold text-cyan-600">{totals.in_progress}</p>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Completados</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{totals.completed}</p>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Esgotados</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{totals.exhausted}</p>
        </Card>
      </div>

      {/* Conversion + Quality */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Taxa de Conversão</p>
          <p className="mt-2 text-3xl font-bold text-primary">{completionRate}%</p>
          <p className="mt-1 text-xs text-slate-400">{totals.completed} de {totals.contacts} contatos</p>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Score Qualidade</p>
          <p className="mt-2 text-3xl font-bold text-purple-600">{quality?.avg_score ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-400">{quality?.total_reviews ?? 0} reviews</p>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Taxa de Rejeição</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{quality?.rejection_rate ?? '0'}%</p>
          <p className="mt-1 text-xs text-slate-400">{quality?.rejected ?? 0} rejeitadas de {(quality?.approved ?? 0) + (quality?.rejected ?? 0)}</p>
        </Card>
      </div>

      {/* Quality breakdown */}
      {quality && (
        <Card title="Controle de Qualidade">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{quality.pending}</p>
              <p className="text-sm text-amber-700">Pendentes</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{quality.approved}</p>
              <p className="text-sm text-green-700">Aprovadas</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{quality.rejected}</p>
              <p className="text-sm text-red-700">Rejeitadas</p>
            </div>
          </div>
        </Card>
      )}

      {/* Per-campaign execution stats */}
      {execStats.length > 0 && (
        <Card title="Execução por Campanha">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Campanha</th>
                  <th className="px-3 py-2 font-semibold text-right">Contatos</th>
                  <th className="px-3 py-2 font-semibold text-right">Pendentes</th>
                  <th className="px-3 py-2 font-semibold text-right">Completados</th>
                  <th className="px-3 py-2 font-semibold text-right">Esgotados</th>
                  <th className="px-3 py-2 font-semibold text-right">Conversão</th>
                  <th className="px-3 py-2 font-semibold text-right">Média Tentativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {execStats.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium">{s.campaign_id.substring(0, 8)}...</td>
                    <td className="px-3 py-2 text-right">{s.total_contacts}</td>
                    <td className="px-3 py-2 text-right">{s.pending}</td>
                    <td className="px-3 py-2 text-right">{s.completed}</td>
                    <td className="px-3 py-2 text-right">{s.exhausted}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={Number(s.completion_rate) >= 70 ? 'success' : Number(s.completion_rate) >= 40 ? 'warning' : 'danger'}>
                        {s.completion_rate}%
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">{s.avg_attempts_to_complete ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {execStats.length === 0 && !execQuery.isLoading && (
        <Card>
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhum dado de execução disponível. Inicie uma campanha com contact_execution para ver métricas.
          </p>
        </Card>
      )}
    </div>
  );
}
