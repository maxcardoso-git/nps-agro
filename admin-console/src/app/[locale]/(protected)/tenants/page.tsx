'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function TenantsPage() {
  const t = useTranslations('tenant');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    status: 'active',
    timezone: 'America/Sao_Paulo'
  });

  const listQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list(session!, { page: 1, page_size: 50 }),
    enabled: Boolean(session)
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.tenants.create(session!, {
        name: form.name,
        code: form.code.toUpperCase(),
        status: form.status as 'active' | 'inactive' | 'suspended',
        timezone: form.timezone,
        settings_json: {}
      }),
    onSuccess: () => {
      setError(null);
      setForm({ name: '', code: '', status: 'active', timezone: 'America/Sao_Paulo' });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.tenants.update(session!, id, { status: status as 'active' | 'inactive' | 'suspended' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    }
  });

  const tenants = extractItems(listQuery.data);

  return (
    <PermissionGate permission="tenant.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('createTitle')}>
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder={t('fields.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder={t('fields.code')}
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            <Select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
            </Select>
            <Input
              placeholder={t('fields.timezone')}
              value={form.timezone}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            />
          </div>
          <div className="mt-3">
            <Button onClick={() => createMutation.mutate()} disabled={!form.name || !form.code}>
              {t('actions.create')}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </Card>

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.code'), t('table.status'), t('table.actions')]}
            rows={tenants.map((tenant) => [
              tenant.name,
              tenant.code,
              tenant.status,
              <Select
                key={tenant.id}
                value={tenant.status}
                onChange={(event) => updateMutation.mutate({ id: tenant.id, status: event.target.value })}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </Select>
            ])}
          />
        </Card>
      </div>
    </PermissionGate>
  );
}
