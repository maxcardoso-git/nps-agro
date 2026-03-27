'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';

interface Indicator {
  question_id: string;
  label: string;
  type: string;
  data: any; // eslint-disable-line
}

const NPS_COLORS = ['#ef4444', '#ef4444', '#ef4444', '#ef4444', '#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#f59e0b', '#10b981', '#10b981'];

export default function IndicatorsPage() {
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['indicator-campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });
  const campaigns = extractItems(campaignsQuery.data);

  const indicatorsQuery = useQuery({
    queryKey: ['indicators', campaignId],
    queryFn: () => apiClient.reports.indicators(session!, campaignId),
    enabled: Boolean(session && campaignId),
  });

  const result = indicatorsQuery.data as { indicators?: Indicator[] } | undefined;
  const indicators = result?.indicators || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Indicadores por Questionário</h1>
        <p className="mt-1 text-sm text-slate-500">Análise das respostas por tipo de pergunta</p>
      </div>

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

      {indicatorsQuery.isLoading && <p className="text-sm text-slate-400">Carregando indicadores...</p>}

      {indicators.length > 0 && (
        <div className="space-y-4">
          {indicators.map((ind) => (
            <Card key={ind.question_id}>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="neutral">{ind.type.toUpperCase()}</Badge>
                <h3 className="text-sm font-semibold text-slate-800">{ind.label}</h3>
              </div>

              {/* NPS Indicator */}
              {ind.type === 'nps' && ind.data.total > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={`text-4xl font-bold ${ind.data.nps >= 50 ? 'text-green-600' : ind.data.nps >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{ind.data.nps}</p>
                      <p className="text-xs text-slate-500">NPS Score</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-lg bg-green-50 p-2">
                        <p className="text-lg font-bold text-green-600">{ind.data.promoters}</p>
                        <p className="text-xs text-green-700">Promotores</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-2">
                        <p className="text-lg font-bold text-amber-600">{ind.data.neutrals}</p>
                        <p className="text-xs text-amber-700">Neutros</p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2">
                        <p className="text-lg font-bold text-red-600">{ind.data.detractors}</p>
                        <p className="text-xs text-red-700">Detratores</p>
                      </div>
                    </div>
                  </div>
                  {/* NPS distribution bar */}
                  <div className="flex gap-0.5 overflow-hidden rounded-lg">
                    {ind.data.distribution.map((d: { value: number; count: number }) => (
                      <div
                        key={d.value}
                        className="flex items-center justify-center py-1 text-[10px] font-bold text-white"
                        style={{
                          backgroundColor: NPS_COLORS[d.value] || '#94a3b8',
                          width: `${(d.count / ind.data.total) * 100}%`,
                          minWidth: d.count > 0 ? '20px' : '0',
                        }}
                        title={`Nota ${d.value}: ${d.count} respostas`}
                      >
                        {d.count > 0 ? d.value : ''}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{ind.data.total} respostas</p>
                </div>
              )}

              {/* Scale Indicator */}
              {ind.type === 'scale' && ind.data.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <p className={`text-3xl font-bold ${ind.data.avg >= 4 ? 'text-green-600' : ind.data.avg >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                      {ind.data.avg}
                    </p>
                    <span className="text-sm text-slate-500">média (1-5)</span>
                  </div>
                  <div className="flex gap-1">
                    {ind.data.distribution.map((d: { value: number; count: number }) => (
                      <div key={d.value} className="flex-1 text-center">
                        <div className="mx-auto h-16 w-full rounded bg-slate-100 relative overflow-hidden">
                          <div
                            className={`absolute bottom-0 w-full rounded transition-all ${d.value >= 4 ? 'bg-green-400' : d.value >= 3 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ height: ind.data.total > 0 ? `${(d.count / ind.data.total) * 100}%` : '0' }}
                          />
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-600">{d.value}</p>
                        <p className="text-[10px] text-slate-400">{d.count}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{ind.data.total} respostas</p>
                </div>
              )}

              {/* Single Choice Indicator */}
              {ind.type === 'single_choice' && ind.data.total > 0 && (
                <div className="space-y-2">
                  {ind.data.options.map((opt: { value: string; count: number; pct: number }) => (
                    <div key={opt.value} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-slate-700">{opt.value}</span>
                          <span className="text-xs font-medium text-slate-500">{opt.count} ({opt.pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${opt.pct}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400">{ind.data.total} respostas</p>
                </div>
              )}

              {/* Multi Choice Indicator */}
              {ind.type === 'multi_choice' && ind.data.options?.length > 0 && (
                <div className="space-y-2">
                  {ind.data.options.map((opt: { value: string; count: number }) => (
                    <div key={opt.value} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                      <span>{opt.value}</span>
                      <Badge tone="neutral">{opt.count}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Indicator */}
              {ind.type === 'text' && ind.data.total > 0 && (
                <div>
                  <p className="mb-2 text-xs text-slate-400">{ind.data.total} respostas</p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {ind.data.responses.map((r: string, i: number) => (
                      <div key={i} className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        &ldquo;{r}&rdquo;
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Number Indicator */}
              {ind.type === 'number' && ind.data?.total > 0 && (
                <div className="flex gap-6 text-center">
                  <div><p className="text-2xl font-bold text-primary">{ind.data.avg}</p><p className="text-xs text-slate-500">Média</p></div>
                  <div><p className="text-2xl font-bold text-slate-600">{ind.data.min}</p><p className="text-xs text-slate-500">Mínimo</p></div>
                  <div><p className="text-2xl font-bold text-slate-600">{ind.data.max}</p><p className="text-xs text-slate-500">Máximo</p></div>
                  <div><p className="text-2xl font-bold text-slate-400">{ind.data.total}</p><p className="text-xs text-slate-500">Respostas</p></div>
                </div>
              )}

              {/* Empty state */}
              {((ind.type !== 'text' && (ind.data.total === 0 || ind.data.total === null)) ||
                (ind.type === 'text' && ind.data.total === 0)) && (
                <p className="text-sm italic text-slate-400">Sem respostas</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {campaignId && !indicatorsQuery.isLoading && indicators.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">Nenhum indicador disponível para esta campanha</p>
      )}
    </div>
  );
}
