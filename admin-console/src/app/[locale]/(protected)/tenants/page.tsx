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
  const [showBranding, setShowBranding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', timezone: '', status: 'active' });
  const [brandingForm, setBrandingForm] = useState({
    app_name: '', logo_url: '', primary_color: '#1168bd', secondary_color: '#0b4884',
    background_color: '#f6f8fb', text_color: '#1f2937',
  });

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

  const brandingMutation = useMutation({
    mutationFn: async () => {
      const tenant = await apiClient.tenants.getById(session!, editId!);
      return apiClient.tenants.update(session!, editId!, {
        settings_json: {
          ...(tenant.settings_json || {}),
          branding: brandingForm,
        },
      });
    },
    onSuccess: () => {
      setShowBranding(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (cause) => { setError(cause instanceof ApiError ? cause.message : t('errors.generic')); },
  });

  const tenants = extractItems(listQuery.data);

  const openEdit = (tenant: { id: string; name: string; status: string; timezone?: string }) => {
    setEditId(tenant.id);
    setEditForm({ name: tenant.name, timezone: tenant.timezone || 'America/Sao_Paulo', status: tenant.status });
    setError(null);
    setShowEdit(true);
  };

  const openBranding = async (tenant: { id: string }) => {
    setEditId(tenant.id);
    setError(null);
    try {
      const detail = await apiClient.tenants.getById(session!, tenant.id);
      const b = detail.settings_json?.branding;
      setBrandingForm({
        app_name: b?.app_name || detail.name,
        logo_url: b?.logo_url || '',
        primary_color: b?.primary_color || '#1168bd',
        secondary_color: b?.secondary_color || '#0b4884',
        background_color: b?.background_color || '#f6f8fb',
        text_color: b?.text_color || '#1f2937',
      });
    } catch {
      setBrandingForm({ app_name: '', logo_url: '', primary_color: '#1168bd', secondary_color: '#0b4884', background_color: '#f6f8fb', text_color: '#1f2937' });
    }
    setShowBranding(true);
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
          {error && !showEdit && !showBranding && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.code'), t('table.status'), t('table.actions')]}
            rows={tenants.map((tenant) => [
              tenant.name,
              tenant.code,
              <Badge key={`s-${tenant.id}`} tone={statusTone(tenant.status)}>{tenant.status}</Badge>,
              <div key={`a-${tenant.id}`} className="flex gap-1">
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(tenant)}>
                  {t('actions.edit')}
                </Button>
                <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => openBranding(tenant)}>
                  {t('actions.branding')}
                </Button>
              </div>,
            ])}
          />
        </Card>

        {/* Edit Dialog */}
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

        {/* Branding Dialog */}
        <Dialog open={showBranding} onOpenChange={setShowBranding}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>{t('brandingTitle')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={t('brandingFields.appName')}
                value={brandingForm.app_name}
                onChange={(e) => setBrandingForm((p) => ({ ...p, app_name: e.target.value }))}
              />
              <Input
                placeholder={t('brandingFields.logoUrl')}
                value={brandingForm.logo_url}
                onChange={(e) => setBrandingForm((p) => ({ ...p, logo_url: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <ColorField label={t('brandingFields.primaryColor')} value={brandingForm.primary_color} onChange={(v) => setBrandingForm((p) => ({ ...p, primary_color: v }))} />
                <ColorField label={t('brandingFields.secondaryColor')} value={brandingForm.secondary_color} onChange={(v) => setBrandingForm((p) => ({ ...p, secondary_color: v }))} />
                <ColorField label={t('brandingFields.backgroundColor')} value={brandingForm.background_color} onChange={(v) => setBrandingForm((p) => ({ ...p, background_color: v }))} />
                <ColorField label={t('brandingFields.textColor')} value={brandingForm.text_color} onChange={(v) => setBrandingForm((p) => ({ ...p, text_color: v }))} />
              </div>

              {/* Preview */}
              <div className="rounded-xl border p-4" style={{ backgroundColor: brandingForm.background_color, color: brandingForm.text_color }}>
                <div className="flex items-center gap-3">
                  {brandingForm.logo_url && (
                    <img src={brandingForm.logo_url} alt="" className="h-10 w-auto max-w-[100px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <span className="text-lg font-bold" style={{ color: brandingForm.primary_color }}>{brandingForm.app_name || '...'}</span>
                </div>
                <div className="mt-2 h-1.5 rounded" style={{ backgroundColor: brandingForm.secondary_color }} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowBranding(false)}>{t('actions.cancel')}</Button>
              <Button onClick={() => brandingMutation.mutate()} disabled={brandingMutation.isPending}>{t('actions.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = value || '#000000';
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-300 p-0.5" />
        <span className="text-xs font-mono text-slate-500">{hex}</span>
      </div>
    </div>
  );
}
