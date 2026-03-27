'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

export default function CampaignDashboardPage() {
  const t = useTranslations('interviewer.actions');
  const { session } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;
  const locale = params.locale as string;

  const actionsQuery = useQuery({
    queryKey: ['actions', campaignId],
    queryFn: () => api.actions.list(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  const actions = actionsQuery.data ?? [];

  const statsQueries = useQueries({
    queries: actions.map((action) => ({
      queryKey: ['action-stats', action.id],
      queryFn: () => api.actions.getStats(session!, action.id),
      enabled: Boolean(session && action.id),
    })),
  });

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'paused') return 'warning' as const;
    if (s === 'completed') return 'success' as const;
    return 'neutral' as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push(`/${locale}/campaigns`)}>
          ← {t('back')}
        </Button>
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
      </div>

      {actionsQuery.isLoading ? (
        <p className="text-sm text-slate-400">{t('loading')}</p>
      ) : actions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <div className="space-y-6">
          {actions.map((action, idx) => {
            const stats = statsQueries[idx]?.data as Record<string, number> | undefined;

            return (
              <Card key={action.id} className="p-0 overflow-hidden">
                {/* Action header */}
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{action.name}</h2>
                      {action.description && <p className="text-xs text-slate-500">{action.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(action.status)}>{action.status}</Badge>
                      {action.questionnaire_name && <span className="text-xs text-slate-400">{action.questionnaire_name}</span>}
                    </div>
                  </div>
                </div>

                {/* KPI cards */}
                {stats ? (
                  <div className="p-5">
                    <div className="grid gap-3 md:grid-cols-5">
                      <div className="rounded-lg border border-slate-200 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{stats.total || 0}</p>
                        <p className="text-xs text-slate-500">Total</p>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
                        <p className="text-xs text-green-700">Concluídos</p>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">{stats.pending || 0}</p>
                        <p className="text-xs text-amber-700">Pendentes</p>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{(stats.no_answer || 0) + (stats.refused || 0)}</p>
                        <p className="text-xs text-red-700">Sem sucesso</p>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.completion_rate || 0}%</p>
                        <p className="text-xs text-blue-700">Conversão</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progresso</span>
                        <span>{stats.completed || 0} de {stats.total || 0}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                        {stats.total > 0 && (
                          <div className="flex h-full">
                            <div className="bg-green-500 transition-all" style={{ width: `${((stats.completed || 0) / stats.total) * 100}%` }} />
                            <div className="bg-amber-400 transition-all" style={{ width: `${((stats.in_progress || 0) / stats.total) * 100}%` }} />
                            <div className="bg-blue-400 transition-all" style={{ width: `${((stats.scheduled || 0) / stats.total) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex gap-4 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Concluído</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Em andamento</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Agendado</span>
                      </div>
                    </div>

                    {/* Audio vs Manual */}
                    <div className="mt-4 flex gap-4">
                      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs">
                        <span>🎤</span>
                        <span className="font-semibold text-blue-700">{stats.via_audio || 0}</span>
                        <span className="text-blue-600">Via áudio</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs">
                        <span>✏️</span>
                        <span className="font-semibold text-slate-700">{stats.via_manual || 0}</span>
                        <span className="text-slate-600">Manual</span>
                      </div>
                    </div>

                    {/* Action button */}
                    <div className="mt-4 flex justify-end">
                      <Button onClick={() => router.push(`/${locale}/actions/${action.id}`)}>
                        Ver contatos →
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    <p className="text-sm text-slate-400">Carregando indicadores...</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
