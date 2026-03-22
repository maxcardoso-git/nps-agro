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
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function TenantsPage() {
  const t = useTranslations('tenant');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', code: '', status: 'active', timezone: 'America/Sao_Paulo' });
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', timezone: '', status: 'active' });

  const listQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list(session!, { page: 1, page_size: 50 }),
    enabled: Boolean(session),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.tenants.create(session!, {
        name: form.name, code: form.code.toUpperCase(),
        status: form.status as 'active', timezone: form.timezone, settings_json: {},
      }),
    onSuccess: () => {
      setError(null);
      setForm({ name: '', code: '', status: 'active', timezone: 'America/Sao_Paulo' });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (cause) => { setError(cause instanceof ApiError ? cause.message : t('errors.generic')); },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      apiClient.tenants.update(session!, editId!, {
        name: editForm.name, timezone: editForm.timezone,
        status: editForm.status as 'active' | 'inactive' | 'suspended',
      }),
    onSuccess: () => {
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (cause) => { setError(cause instanceof ApiError ? cause.message : t('errors.generic')); },
  });

  const tenants = extractItems(listQuery.data);

  const openEdit = (t: { id: string; name: string; status: string; timezone?: string }) => {
    setEditId(t.id);
    setEditForm({ name: t.name, timezone: t.timezone || 'America/Sao_Paulo', status: t.status });
    setError(null);
    setShowEdit(true);
  };

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'suspended') return 'danger' as const;
    return 'warning' as const;
  };

  return (
    <PermissionGate permission="tenant.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('createTitle')}>
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder={t('fields.name')} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder={t('fields.code')} value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">{t('statusActive')}</option>
              <option value="inactive">{t('statusInactive')}</option>
            </Select>
            <Input placeholder={t('fields.timezone')} value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))} />
          </div>
          <div className="mt-3">
            <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.code}>{t('actions.create')}</Button>
          </div>
          {error && !showEdit && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.code'), t('table.status'), t('table.actions')]}
            rows={tenants.map((tenant) => [
              tenant.name,
              tenant.code,
              <Badge key={`s-${tenant.id}`} tone={statusTone(tenant.status)}>{tenant.status}</Badge>,
              <Button key={`e-${tenant.id}`} variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(tenant)}>
                {t('actions.edit')}
              </Button>,
            ])}
          />
        </Card>

        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('editTitle')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder={t('fields.name')} value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder={t('fields.timezone')} value={editForm.timezone} onChange={(e) => setEditForm((p) => ({ ...p, timezone: e.target.value }))} />
              <Select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">{t('statusActive')}</option>
                <option value="inactive">{t('statusInactive')}</option>
                <option value="suspended">{t('statusSuspended')}</option>
              </Select>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowEdit(false)}>{t('actions.cancel')}</Button>
              <Button onClick={() => editMutation.mutate()} disabled={!editForm.name || editMutation.isPending}>{t('actions.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
