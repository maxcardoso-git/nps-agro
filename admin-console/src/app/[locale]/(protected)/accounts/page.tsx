'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function AccountsPage() {
  const t = useTranslations('account');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['accounts', search],
    queryFn: () => apiClient.accounts.list(session!, { search: search || undefined }),
    enabled: Boolean(session),
  });

  const accounts = listQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.accounts.create(session!, {
        tenant_id: session!.user.tenant_id,
        name: newName,
      }),
    onSuccess: () => {
      setShowCreate(false);
      setNewName('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  return (
    <PermissionGate permission="campaign.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
          <Button onClick={() => setShowCreate(true)}>{t('actions.create')}</Button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
        />

        {listQuery.isLoading ? (
          <p className="text-sm text-slate-400">{t('loading')}</p>
        ) : accounts.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
        ) : (
          <Table
            headers={[t('table.name'), t('table.contacts'), t('table.created')]}
            rows={accounts.map((a) => [
              a.name,
              <Badge key={`c-${a.id}`} tone="neutral">
                {a.respondent_count}
              </Badge>,
              a.created_at ? new Date(a.created_at).toLocaleDateString() : '—',
            ])}
          />
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createTitle')}</DialogTitle>
            </DialogHeader>
            <Input
              placeholder={t('fields.name')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                {t('actions.cancel')}
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newName || createMutation.isPending}
              >
                {t('actions.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
