'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { useRequiredSession } from '@/hooks/use-required-session';
import type { Resource } from '@/lib/types';

const TYPES = [
  { value: 'api_http', label: 'API HTTP (Outbound)' },
  { value: 'database', label: 'Database' },
  { value: 'mcp_server', label: 'MCP Server' },
  { value: 'llm', label: 'LLM Provider' },
  { value: 'queue', label: 'Queue / Worker' },
  { value: 'storage', label: 'Object Storage' },
  { value: 'custom', label: 'Custom' },
];

const SUBTYPES: Record<string, { value: string; label: string }[]> = {
  api_http: [
    { value: '', label: 'Nenhum' },
    { value: 'rest', label: 'REST API' },
    { value: 'graphql', label: 'GraphQL' },
    { value: 'webhook', label: 'Webhook' },
  ],
  llm: [
    { value: '', label: 'Nenhum' },
    { value: 'chat', label: 'Chat Completion' },
    { value: 'embeddings', label: 'Embeddings' },
    { value: 'transcription', label: 'Transcription' },
    { value: 'enrichment', label: 'Enrichment' },
  ],
  database: [
    { value: '', label: 'Nenhum' },
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'redis', label: 'Redis' },
    { value: 'mongodb', label: 'MongoDB' },
  ],
  mcp_server: [{ value: '', label: 'Nenhum' }],
  queue: [{ value: '', label: 'Nenhum' }, { value: 'bullmq', label: 'BullMQ' }],
  storage: [{ value: '', label: 'Nenhum' }, { value: 's3', label: 'S3' }, { value: 'gcs', label: 'GCS' }],
  custom: [{ value: '', label: 'Nenhum' }],
};

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_MODES = [
  { value: 'none', label: 'Nenhum' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key Header' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'custom', label: 'Custom' },
];
const ENVIRONMENTS = [
  { value: 'production', label: 'PROD' },
  { value: 'staging', label: 'STAGING' },
  { value: 'development', label: 'DEV' },
];

interface FormState {
  name: string;
  type: string;
  subtype: string;
  endpoint_url: string;
  http_method: string;
  auth_mode: string;
  auth_config: string;
  connection_json: string;
  config_json: string;
  metadata_json: string;
  tags: string;
  environment: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'api_http',
  subtype: '',
  endpoint_url: '',
  http_method: 'POST',
  auth_mode: 'none',
  auth_config: '{}',
  connection_json: '{\n  "baseUrl": "",\n  "timeout": 30000\n}',
  config_json: '{}',
  metadata_json: '{\n  "version": "v1",\n  "provider": ""\n}',
  tags: '',
  environment: 'production',
  is_active: true,
};

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function resourceToForm(r: Resource): FormState {
  return {
    name: r.name,
    type: r.type,
    subtype: r.subtype || '',
    endpoint_url: r.endpoint_url || '',
    http_method: r.http_method || 'POST',
    auth_mode: r.auth_mode,
    auth_config: JSON.stringify(r.auth_config, null, 2),
    connection_json: JSON.stringify(r.connection_json, null, 2),
    config_json: JSON.stringify(r.config_json, null, 2),
    metadata_json: JSON.stringify(r.metadata_json, null, 2),
    tags: (r.tags || []).join(', '),
    environment: r.environment,
    is_active: r.is_active,
  };
}

function formToPayload(form: FormState): Partial<Resource> {
  return {
    name: form.name,
    type: form.type as Resource['type'],
    subtype: form.subtype || undefined,
    endpoint_url: form.endpoint_url || undefined,
    http_method: form.http_method,
    auth_mode: form.auth_mode as Resource['auth_mode'],
    auth_config: safeParseJson(form.auth_config) || {},
    connection_json: safeParseJson(form.connection_json) || {},
    config_json: safeParseJson(form.config_json) || {},
    metadata_json: safeParseJson(form.metadata_json) || {},
    tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    environment: form.environment as Resource['environment'],
    is_active: form.is_active,
  };
}

export default function ResourcesPage() {
  const t = useTranslations('llmResource');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const listQuery = useQuery({
    queryKey: ['resources'],
    queryFn: () => apiClient.resources.list(session!),
    enabled: Boolean(session),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = formToPayload(form);
      return editId
        ? apiClient.resources.update(session!, editId, payload)
        : apiClient.resources.create(session!, payload);
    },
    onSuccess: () => {
      setError(null);
      setShowDialog(false);
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.resources.delete(session!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiClient.resources.update(session!, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  const resources = Array.isArray(listQuery.data) ? listQuery.data : [];
  const subtypes = SUBTYPES[form.type] || [{ value: '', label: 'Nenhum' }];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError(null);
    setShowDialog(true);
  };

  const openEdit = (r: Resource) => {
    setForm(resourceToForm(r));
    setEditId(r.id);
    setError(null);
    setShowDialog(true);
  };

  const handleDelete = (r: Resource) => {
    if (confirm(t('actions.confirmDelete'))) deleteMutation.mutate(r.id);
  };

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((p) => ({ ...p, [field]: value }));

  const typeLabel = (type: string) => TYPES.find((t) => t.value === type)?.label || type;

  return (
    <PermissionGate permission="llm_resource.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
          <Button onClick={openCreate}>{t('actions.create')}</Button>
        </div>

        <Card title={t('listTitle')}>
          {resources.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
          ) : (
            <Table
              headers={['Nome', 'Tipo', 'Endpoint', 'Ambiente', 'Status', 'Ações']}
              rows={resources.map((r) => [
                <span key={`n-${r.id}`} className="font-medium">{r.name}</span>,
                <Badge key={`t-${r.id}`} tone="neutral">{typeLabel(r.type)}</Badge>,
                <code key={`e-${r.id}`} className="truncate text-xs">{r.endpoint_url || '—'}</code>,
                <Badge key={`env-${r.id}`} tone={r.environment === 'production' ? 'success' : 'warning'}>
                  {ENVIRONMENTS.find((e) => e.value === r.environment)?.label || r.environment}
                </Badge>,
                <button key={`s-${r.id}`} onClick={() => toggleMutation.mutate({ id: r.id, is_active: !r.is_active })} className="cursor-pointer">
                  <Badge tone={r.is_active ? 'success' : 'danger'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge>
                </button>,
                <div key={`a-${r.id}`} className="flex gap-1">
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>Editar</Button>
                  <Button variant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={() => handleDelete(r)}>Excluir</Button>
                </div>,
              ])}
            />
          )}
        </Card>

        {/* Create / Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Resource' : 'Adicionar Resource'}</DialogTitle>
            </DialogHeader>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Nome do Resource <span className="text-red-500">*</span></label>
                <Input placeholder="Ex: OpenAI API" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>

              {/* Type + Subtype */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Tipo</label>
                  <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, subtype: '' }))}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Subtipo</label>
                  <Select value={form.subtype} onChange={(e) => set('subtype', e.target.value)}>
                    {subtypes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </Select>
                </div>
              </div>

              {/* Endpoint + Method */}
              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Endpoint/URL <span className="text-red-500">*</span></label>
                  <Input placeholder="https://api.openai.com/v1/chat/completions" value={form.endpoint_url} onChange={(e) => set('endpoint_url', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Método HTTP</label>
                  <Select value={form.http_method} onChange={(e) => set('http_method', e.target.value)}>
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </div>
              </div>

              {/* Auth Mode */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Modo de Autenticação</label>
                <Select value={form.auth_mode} onChange={(e) => set('auth_mode', e.target.value)}>
                  {AUTH_MODES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </div>

              {/* Auth Config - show only when auth is not none */}
              {form.auth_mode !== 'none' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Auth Config (JSON)</label>
                  <Textarea rows={3} className="font-mono text-xs" value={form.auth_config} onChange={(e) => set('auth_config', e.target.value)} />
                </div>
              )}

              {/* Connection JSON */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Connection (JSON)</label>
                <Textarea rows={4} className="font-mono text-xs" value={form.connection_json} onChange={(e) => set('connection_json', e.target.value)} />
                <p className="mt-1 text-xs text-slate-400">Informe host/porta/usuário/senha/database ou uma connectionString</p>
              </div>

              {/* Configuration JSON */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Configuration (JSON)</label>
                <Textarea rows={3} className="font-mono text-xs" value={form.config_json} onChange={(e) => set('config_json', e.target.value)} />
              </div>

              {/* Metadata JSON */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Metadata (JSON)</label>
                <Textarea rows={4} className="font-mono text-xs" value={form.metadata_json} onChange={(e) => set('metadata_json', e.target.value)} />
              </div>

              {/* Tags + Environment */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Tags</label>
                  <Input placeholder="tag1, tag2, tag3" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Ambiente</label>
                  <Select value={form.environment} onChange={(e) => set('environment', e.target.value)}>
                    {ENVIRONMENTS.map((env) => <option key={env.value} value={env.value}>{env.label}</option>)}
                  </Select>
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2 text-sm font-medium">
                Ativo
                <div
                  className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${form.is_active ? 'bg-primary' : 'bg-slate-300'}`}
                  onClick={() => set('is_active', !form.is_active)}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancelar</Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!form.name || saveMutation.isPending}
              >
                {editId ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
