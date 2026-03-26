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
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { useRequiredSession } from '@/hooks/use-required-session';
import type { LlmResource } from '@/lib/types';

const PROVIDERS = ['openai', 'anthropic', 'google', 'azure', 'ollama', 'custom'] as const;
const PURPOSES = ['general', 'enrichment', 'chat', 'embeddings', 'transcription'] as const;

const PROVIDER_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o4-mini'],
  anthropic: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-4-20250514'],
  google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  azure: ['gpt-4o', 'gpt-4o-mini'],
  ollama: ['llama3', 'mistral', 'codellama', 'mixtral'],
  custom: [],
};

interface FormState {
  name: string;
  provider: string;
  model_id: string;
  api_key: string;
  base_url: string;
  purpose: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  provider: 'openai',
  model_id: '',
  api_key: '',
  base_url: '',
  purpose: 'general',
  is_active: true,
};

export default function LlmResourcesPage() {
  const t = useTranslations('llmResource');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const listQuery = useQuery({
    queryKey: ['llm-resources'],
    queryFn: () => apiClient.llmResources.list(session!),
    enabled: Boolean(session),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.llmResources.create(session!, {
      name: form.name,
      provider: form.provider as LlmResource['provider'],
      model_id: form.model_id,
      api_key: form.api_key || undefined,
      base_url: form.base_url || undefined,
      purpose: form.purpose as LlmResource['purpose'],
      is_active: form.is_active,
    }),
    onSuccess: () => {
      setError(null);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['llm-resources'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const editMutation = useMutation({
    mutationFn: () => apiClient.llmResources.update(session!, editId!, {
      name: form.name,
      provider: form.provider as LlmResource['provider'],
      model_id: form.model_id,
      api_key: form.api_key || undefined,
      base_url: form.base_url || undefined,
      purpose: form.purpose as LlmResource['purpose'],
      is_active: form.is_active,
    }),
    onSuccess: () => {
      setError(null);
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: ['llm-resources'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.llmResources.delete(session!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-resources'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiClient.llmResources.update(session!, id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-resources'] });
    },
  });

  const resources = Array.isArray(listQuery.data) ? listQuery.data : [];

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setShowCreate(true);
  };

  const openEdit = (resource: LlmResource) => {
    setEditId(resource.id);
    setForm({
      name: resource.name,
      provider: resource.provider,
      model_id: resource.model_id,
      api_key: '',
      base_url: resource.base_url || '',
      purpose: resource.purpose,
      is_active: resource.is_active,
    });
    setError(null);
    setShowEdit(true);
  };

  const handleDelete = (resource: LlmResource) => {
    if (confirm(t('actions.confirmDelete'))) {
      deleteMutation.mutate(resource.id);
    }
  };

  const models = PROVIDER_MODELS[form.provider] || [];

  const formFields = (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">{t('fields.name')}</label>
          <Input
            placeholder={t('fields.name')}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">{t('fields.provider')}</label>
          <Select
            value={form.provider}
            onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value, model_id: '' }))}
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{t(`providers.${p}`)}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">{t('fields.modelId')}</label>
          {models.length > 0 ? (
            <Select
              value={form.model_id}
              onChange={(e) => setForm((p) => ({ ...p, model_id: e.target.value }))}
            >
              <option value="">—</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          ) : (
            <Input
              placeholder="model-id"
              value={form.model_id}
              onChange={(e) => setForm((p) => ({ ...p, model_id: e.target.value }))}
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">{t('fields.purpose')}</label>
          <Select
            value={form.purpose}
            onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
          >
            {PURPOSES.map((p) => (
              <option key={p} value={p}>{t(`purposes.${p}`)}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">{t('fields.apiKey')}</label>
        <Input
          type="password"
          placeholder={t('fields.apiKey')}
          value={form.api_key}
          onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">{t('fields.baseUrl')}</label>
        <Input
          placeholder="https://api.example.com/v1"
          value={form.base_url}
          onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
        />
        {t('fields.active')}
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );

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
              headers={[
                t('table.name'),
                t('table.provider'),
                t('table.model'),
                t('table.purpose'),
                t('table.status'),
                t('table.actions'),
              ]}
              rows={resources.map((r) => [
                <span key={`n-${r.id}`} className="font-medium">{r.name}</span>,
                <Badge key={`p-${r.id}`} tone="neutral">{t(`providers.${r.provider}`)}</Badge>,
                <code key={`m-${r.id}`} className="text-xs">{r.model_id}</code>,
                t(`purposes.${r.purpose}`),
                <button
                  key={`s-${r.id}`}
                  onClick={() => toggleMutation.mutate({ id: r.id, is_active: !r.is_active })}
                  className="cursor-pointer"
                >
                  <Badge tone={r.is_active ? 'success' : 'danger'}>
                    {r.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </button>,
                <div key={`a-${r.id}`} className="flex gap-1">
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(r)}>
                    {t('actions.edit')}
                  </Button>
                  <Button variant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={() => handleDelete(r)}>
                    {t('actions.delete')}
                  </Button>
                </div>,
              ])}
            />
          )}
        </Card>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createTitle')}</DialogTitle>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('actions.cancel')}</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || !form.model_id || createMutation.isPending}
              >
                {t('actions.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('editTitle')}</DialogTitle>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowEdit(false)}>{t('actions.cancel')}</Button>
              <Button
                onClick={() => editMutation.mutate()}
                disabled={!form.name || !form.model_id || editMutation.isPending}
              >
                {t('actions.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
