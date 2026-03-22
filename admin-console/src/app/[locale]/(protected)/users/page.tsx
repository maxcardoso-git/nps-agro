'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

const ROLES = [
  'platform_admin',
  'tenant_admin',
  'campaign_manager',
  'analyst',
  'interviewer',
] as const;

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  tenant_admin: 'Tenant Admin',
  campaign_manager: 'Campaign Manager',
  analyst: 'Analyst',
  interviewer: 'Interviewer',
};

export default function UsersPage() {
  const t = useTranslations('user');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'interviewer',
    is_active: true,
  });

  const isPlatformAdmin =
    session?.user.role === 'platform_admin' || session?.user.role === 'admin_master';

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => apiClient.tenants.list(session!, { page_size: 200 }),
    enabled: Boolean(session && isPlatformAdmin),
  });
  const tenants = extractItems(tenantsQuery.data);

  const [selectedTenantId, setSelectedTenantId] = useState('');

  useEffect(() => {
    if (session?.user.tenant_id && !selectedTenantId) {
      setSelectedTenantId(session.user.tenant_id);
    }
  }, [session?.user.tenant_id, selectedTenantId]);

  const currentTenantName = useMemo(() => {
    if (!isPlatformAdmin) return null;
    return tenants.find((t) => t.id === selectedTenantId)?.name ?? selectedTenantId;
  }, [isPlatformAdmin, tenants, selectedTenantId]);

  const usersQuery = useQuery({
    queryKey: ['tenant-users', selectedTenantId],
    queryFn: () => apiClient.users.listByTenant(session!, selectedTenantId),
    enabled: Boolean(session && selectedTenantId),
  });

  // Fetch roles for all users
  const users = usersQuery.data || [];
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!session || !selectedTenantId || users.length === 0) return;
    // Fetch roles for each user
    Promise.all(
      users.map(async (u) => {
        try {
          const roles = await apiClient.users.getRoles(session, selectedTenantId, u.id);
          return { userId: u.id, roles: Array.isArray(roles) ? roles : [u.role] };
        } catch {
          return { userId: u.id, roles: [u.role] };
        }
      }),
    ).then((results) => {
      const map: Record<string, string[]> = {};
      for (const r of results) map[r.userId] = r.roles;
      setUserRolesMap(map);
    });
  }, [users, session, selectedTenantId]);

  const createMutation = useMutation({
    mutationFn: () => apiClient.users.create(session!, selectedTenantId, form),
    onSuccess: () => {
      setError(null);
      setForm({ name: '', email: '', password: '', role: 'interviewer', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['tenant-users', selectedTenantId] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, is_active }: { userId: string; is_active: boolean }) =>
      apiClient.users.update(session!, selectedTenantId, userId, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users', selectedTenantId] });
    },
  });

  const toggleRole = async (userId: string, role: string, checked: boolean) => {
    const current = userRolesMap[userId] ?? [];
    const newRoles = checked
      ? [...current, role]
      : current.filter((r) => r !== role);

    if (newRoles.length === 0) return; // Must have at least one role

    try {
      await apiClient.users.setRoles(session!, selectedTenantId, userId, newRoles);
      setUserRolesMap((prev) => ({ ...prev, [userId]: newRoles }));
    } catch {
      // Revert on error
    }
  };

  return (
    <PermissionGate permission="user.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        {/* Tenant selector */}
        {isPlatformAdmin ? (
          <Card title={t('tenantScopeTitle')}>
            <Select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)}>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.code})
                </option>
              ))}
            </Select>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">{t('tenantScopeTitle')}:</span>
              <Badge tone="neutral">{session?.user.tenant_id}</Badge>
            </div>
          </Card>
        )}

        {/* Create user */}
        <Card title={t('createTitle')}>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder={t('fields.name')}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder={t('fields.email')}
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder={t('fields.password')}
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <Select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Select>
            <Select
              value={String(form.is_active)}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.value === 'true' }))}
            >
              <option value="true">{t('statusActive')}</option>
              <option value="false">{t('statusInactive')}</option>
            </Select>
          </div>
          <div className="mt-3">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!selectedTenantId || !form.name || !form.email || !form.password}
            >
              {t('actions.create')}
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </Card>

        {/* User list with role checkboxes */}
        <Card title={isPlatformAdmin && currentTenantName ? `${t('listTitle')} — ${currentTenantName}` : t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.email'), t('table.role'), t('table.active')]}
            rows={users.map((user) => {
              const roles = userRolesMap[user.id] ?? [user.role];
              return [
                user.name,
                user.email,
                <div key={`roles-${user.id}`} className="flex flex-wrap gap-x-3 gap-y-1">
                  {ROLES.map((r) => (
                    <label key={r} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={roles.includes(r)}
                        onChange={(e) => toggleRole(user.id, r, e.target.checked)}
                        className="h-3.5 w-3.5 rounded text-primary"
                      />
                      {ROLE_LABELS[r]}
                    </label>
                  ))}
                </div>,
                <Select
                  key={`active-${user.id}`}
                  value={String(user.is_active)}
                  onChange={(e) =>
                    updateStatusMutation.mutate({
                      userId: user.id,
                      is_active: e.target.value === 'true',
                    })
                  }
                >
                  <option value="true">{t('statusActive')}</option>
                  <option value="false">{t('statusInactive')}</option>
                </Select>,
              ];
            })}
          />
        </Card>
      </div>
    </PermissionGate>
  );
}
