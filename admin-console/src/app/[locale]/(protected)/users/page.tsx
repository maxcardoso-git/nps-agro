'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { apiClient, ApiError } from '@/lib/api/client';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function UsersPage() {
  const t = useTranslations('user');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState(session?.user.tenant_id || '');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'interviewer',
    is_active: true
  });

  const usersQuery = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: () => apiClient.users.listByTenant(session!, tenantId),
    enabled: Boolean(session && tenantId)
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.users.create(session!, tenantId, form),
    onSuccess: () => {
      setError(null);
      setForm({ name: '', email: '', password: '', role: 'interviewer', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role, is_active }: { userId: string; role: string; is_active: boolean }) =>
      apiClient.users.update(session!, tenantId, userId, { role, is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', tenantId] });
    }
  });

  const users = usersQuery.data || [];

  useEffect(() => {
    if (session?.user.tenant_id && !tenantId) {
      setTenantId(session.user.tenant_id);
    }
  }, [session?.user.tenant_id, tenantId]);

  return (
    <PermissionGate permission="user.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('tenantScopeTitle')}>
          <Input value={tenantId} onChange={(event) => setTenantId(event.target.value)} />
        </Card>

        <Card title={t('createTitle')}>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder={t('fields.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder={t('fields.email')}
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <Input
              placeholder={t('fields.password')}
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <Select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              <option value="platform_admin">platform_admin</option>
              <option value="tenant_admin">tenant_admin</option>
              <option value="campaign_manager">campaign_manager</option>
              <option value="analyst">analyst</option>
              <option value="interviewer">interviewer</option>
            </Select>
            <Select
              value={String(form.is_active)}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_active: event.target.value === 'true' }))
              }
            >
              <option value="true">active</option>
              <option value="false">inactive</option>
            </Select>
          </div>
          <div className="mt-3">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!tenantId || !form.name || !form.email || !form.password}
            >
              {t('actions.create')}
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </Card>

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.email'), t('table.role'), t('table.active')]}
            rows={users.map((user) => [
              user.name,
              user.email,
              <Select
                key={`role-${user.id}`}
                value={user.role}
                onChange={(event) =>
                  updateMutation.mutate({
                    userId: user.id,
                    role: event.target.value,
                    is_active: user.is_active
                  })
                }
              >
                <option value="platform_admin">platform_admin</option>
                <option value="tenant_admin">tenant_admin</option>
                <option value="campaign_manager">campaign_manager</option>
                <option value="analyst">analyst</option>
                <option value="interviewer">interviewer</option>
              </Select>,
              <Select
                key={`active-${user.id}`}
                value={String(user.is_active)}
                onChange={(event) =>
                  updateMutation.mutate({
                    userId: user.id,
                    role: user.role,
                    is_active: event.target.value === 'true'
                  })
                }
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </Select>
            ])}
          />
        </Card>
      </div>
    </PermissionGate>
  );
}
