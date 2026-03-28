'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';
import type { AuthSession } from '@/lib/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

async function batchRequest(path: string, session: AuthSession, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'x-tenant-id': session.user.tenant_id, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const body = await res.json();
  return body?.data ?? body;
}

interface BatchConfig {
  id: string; name: string; source_path: string; file_pattern: string; code_regex: string;
  schedule_cron: string; campaign_id: string; action_id: string; is_active: boolean;
  last_run_at: string | null; stats?: { total: number; pending: number; processing: number; completed: number; failed: number; skipped: number };
}

interface BatchFile {
  id: string; file_name: string; respondent_code: string | null; status: string; error_message: string | null; processed_at: string | null;
}

export default function AudioBatchPage() {
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showMonitor, setShowMonitor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', campaign_id: '', action_id: '', source_path: '', file_pattern: '*.mp4', code_regex: '([A-Za-z]+_\\d+)', schedule_cron: '*/30 * * * *' });

  // Campaigns + actions
  const campaignsQuery = useQuery({
    queryKey: ['batch-campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });
  const campaigns = extractItems(campaignsQuery.data).filter((c) => c.status === 'active');

  const actionsQuery = useQuery({
    queryKey: ['batch-actions', form.campaign_id],
    queryFn: () => apiClient.campaignActions.list(session!, form.campaign_id),
    enabled: Boolean(session && form.campaign_id),
  });
  const actions = (actionsQuery.data ?? []) as Array<{ id: string; name: string }>;

  // Configs list
  const configsQuery = useQuery({
    queryKey: ['batch-configs'],
    queryFn: () => batchRequest('/audio-batch/configs', session!) as Promise<BatchConfig[]>,
    enabled: Boolean(session),
    refetchInterval: 10000,
  });
  const configs = configsQuery.data || [];

  // Monitor data
  const monitorQuery = useQuery({
    queryKey: ['batch-monitor', showMonitor],
    queryFn: () => batchRequest(`/audio-batch/configs/${showMonitor}/status`, session!) as Promise<{ config: BatchConfig; stats: BatchConfig['stats']; recent_files: BatchFile[] }>,
    enabled: Boolean(session && showMonitor),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: () => batchRequest('/audio-batch/configs', session!, { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => { setShowCreate(false); queryClient.invalidateQueries({ queryKey: ['batch-configs'] }); },
    onError: () => setError('Erro ao criar configuração'),
  });

  const processMutation = useMutation({
    mutationFn: (id: string) => batchRequest(`/audio-batch/configs/${id}/process?batch_size=10`, session!, { method: 'POST' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batch-configs'] }); queryClient.invalidateQueries({ queryKey: ['batch-monitor'] }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      batchRequest(`/audio-batch/configs/${id}`, session!, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['batch-configs'] }),
  });

  const STATUS_TONES: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    pending: 'neutral', processing: 'warning', completed: 'success', failed: 'danger', skipped: 'warning',
  };

  return (
    <PermissionGate permission="campaign.update">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Processamento de Áudio em Lote</h1>
            <p className="text-sm text-slate-500">Configure pastas de áudio para processamento automático</p>
          </div>
          <Button onClick={() => { setForm({ name: '', campaign_id: '', action_id: '', source_path: '', file_pattern: '*.mp4', code_regex: '([A-Za-z]+_\\d+)', schedule_cron: '*/30 * * * *' }); setShowCreate(true); }}>
            Nova Configuração
          </Button>
        </div>

        {/* Config list */}
        {configs.length === 0 ? (
          <Card><p className="py-8 text-center text-sm text-slate-400">Nenhuma configuração de processamento em lote</p></Card>
        ) : (
          <div className="space-y-3">
            {configs.map((config) => (
              <Card key={config.id} className="p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{config.name}</h3>
                    <p className="text-xs text-slate-500">{config.source_path} · {config.file_pattern}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleMutation.mutate({ id: config.id, is_active: !config.is_active })}>
                      <Badge tone={config.is_active ? 'success' : 'danger'}>{config.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  {/* Stats */}
                  {config.stats && (
                    <div className="grid gap-2 md:grid-cols-6 text-center text-xs">
                      <div className="rounded bg-slate-50 p-2"><p className="text-lg font-bold text-slate-700">{config.stats.total}</p><p className="text-slate-500">Total</p></div>
                      <div className="rounded bg-slate-50 p-2"><p className="text-lg font-bold text-slate-500">{config.stats.pending}</p><p className="text-slate-500">Pendentes</p></div>
                      <div className="rounded bg-amber-50 p-2"><p className="text-lg font-bold text-amber-600">{config.stats.processing}</p><p className="text-amber-700">Processando</p></div>
                      <div className="rounded bg-green-50 p-2"><p className="text-lg font-bold text-green-600">{config.stats.completed}</p><p className="text-green-700">Concluídos</p></div>
                      <div className="rounded bg-red-50 p-2"><p className="text-lg font-bold text-red-600">{config.stats.failed}</p><p className="text-red-700">Erros</p></div>
                      <div className="rounded bg-slate-50 p-2"><p className="text-lg font-bold text-slate-400">{config.stats.skipped}</p><p className="text-slate-500">Ignorados</p></div>
                    </div>
                  )}

                  {/* Progress bar */}
                  {config.stats && config.stats.total > 0 && (
                    <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="flex h-full">
                        <div className="bg-green-500" style={{ width: `${(config.stats.completed / config.stats.total) * 100}%` }} />
                        <div className="bg-amber-400" style={{ width: `${(config.stats.processing / config.stats.total) * 100}%` }} />
                        <div className="bg-red-400" style={{ width: `${(config.stats.failed / config.stats.total) * 100}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Regex: <code className="bg-slate-100 px-1 rounded">{config.code_regex}</code>
                      {config.last_run_at && <> · Última exec: {new Date(config.last_run_at).toLocaleString('pt-BR')}</>}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowMonitor(config.id)}>
                        Monitor
                      </Button>
                      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => processMutation.mutate(config.id)} disabled={processMutation.isPending}>
                        {processMutation.isPending ? 'Processando...' : 'Processar agora'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Create Config Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Configuração de Lote</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nome</label>
                <Input placeholder="Ex: Revendas - Lote 1" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Campanha</label>
                  <Select value={form.campaign_id} onChange={(e) => setForm((p) => ({ ...p, campaign_id: e.target.value, action_id: '' }))}>
                    <option value="">Selecione...</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Ação</label>
                  <Select value={form.action_id} onChange={(e) => setForm((p) => ({ ...p, action_id: e.target.value }))}>
                    <option value="">Selecione...</option>
                    {actions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Caminho da pasta</label>
                <Input placeholder="/mnt/audios/revendas/" value={form.source_path} onChange={(e) => setForm((p) => ({ ...p, source_path: e.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Padrão de arquivo</label>
                  <Input placeholder="*.mp4" value={form.file_pattern} onChange={(e) => setForm((p) => ({ ...p, file_pattern: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Regex do código</label>
                  <Input placeholder="([A-Za-z]+_\d+)" value={form.code_regex} onChange={(e) => setForm((p) => ({ ...p, code_regex: e.target.value }))} />
                  <p className="mt-1 text-[10px] text-slate-400">Grupo 1 será o código do contato</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Intervalo (cron)</label>
                <Select value={form.schedule_cron} onChange={(e) => setForm((p) => ({ ...p, schedule_cron: e.target.value }))}>
                  <option value="*/5 * * * *">A cada 5 minutos</option>
                  <option value="*/15 * * * *">A cada 15 minutos</option>
                  <option value="*/30 * * * *">A cada 30 minutos</option>
                  <option value="0 * * * *">A cada hora</option>
                  <option value="0 */6 * * *">A cada 6 horas</option>
                </Select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.campaign_id || !form.action_id || !form.source_path}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Monitor Dialog */}
        <Dialog open={!!showMonitor} onOpenChange={() => setShowMonitor(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Monitor de Processamento</DialogTitle></DialogHeader>
            {monitorQuery.data ? (
              <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                {/* Stats */}
                <div className="grid gap-2 md:grid-cols-3 text-center text-xs">
                  <div className="rounded bg-green-50 p-2"><p className="text-xl font-bold text-green-600">{monitorQuery.data.stats?.completed || 0}</p><p>Concluídos</p></div>
                  <div className="rounded bg-amber-50 p-2"><p className="text-xl font-bold text-amber-600">{(monitorQuery.data.stats?.pending || 0) + (monitorQuery.data.stats?.processing || 0)}</p><p>Na fila</p></div>
                  <div className="rounded bg-red-50 p-2"><p className="text-xl font-bold text-red-600">{monitorQuery.data.stats?.failed || 0}</p><p>Erros</p></div>
                </div>

                {/* Recent files */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-slate-600">Arquivos recentes</h4>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {monitorQuery.data.recent_files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5 text-xs">
                        <div className="flex-1 truncate">
                          <span className="font-medium">{f.file_name}</span>
                          {f.respondent_code && <span className="ml-2 text-slate-400">({f.respondent_code})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={STATUS_TONES[f.status] || 'neutral'}>{f.status}</Badge>
                          {f.error_message && <span className="text-[10px] text-red-500 max-w-32 truncate" title={f.error_message}>{f.error_message}</span>}
                        </div>
                      </div>
                    ))}
                    {monitorQuery.data.recent_files.length === 0 && (
                      <p className="py-4 text-center text-sm text-slate-400">Nenhum arquivo processado ainda</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">Carregando...</p>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowMonitor(null)}>Fechar</Button>
              <Button onClick={() => showMonitor && processMutation.mutate(showMonitor)} disabled={processMutation.isPending}>
                Processar agora
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
