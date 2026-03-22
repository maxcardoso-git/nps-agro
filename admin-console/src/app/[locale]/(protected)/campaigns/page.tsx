'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiClient, ApiError } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function CampaignsPage() {
  const t = useTranslations('campaign');
  const { session } = useRequiredSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { locale } = useParams();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', segment: '', start_date: '', end_date: '' });
  const [error, setError] = useState<string | null>(null);

  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session),
  });

  const campaigns = extractItems(campaignsQuery.data);

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.campaigns.create(session!, {
        tenant_id: session!.user.tenant_id,
        name: form.name,
        description: form.description || undefined,
        segment: form.segment || undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      }),
    onSuccess: (result) => {
      setShowCreate(false);
      setForm({ name: '', description: '', segment: '', start_date: '', end_date: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      router.push(`/${locale}/campaigns/${result.id}`);
    },
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'activate' | 'pause' | 'complete' }) => {
      if (action === 'activate') return apiClient.campaigns.activate(session!, id);
      if (action === 'pause') return apiClient.campaigns.pause(session!, id);
      return apiClient.campaigns.complete(session!, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    onError: (cause) => {
      setError(cause instanceof ApiError ? cause.message : t('errors.generic'));
    },
  });

  const statusTone = (s: string) => {
    if (s === 'active') return 'success' as const;
    if (s === 'paused') return 'warning' as const;
    if (s === 'completed') return 'success' as const;
    if (s === 'archived') return 'danger' as const;
    return 'neutral' as const;
  };

  return (
    <PermissionGate permission="campaign.read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>
          <Button onClick={() => setShowCreate(true)}>{t('actions.create')}</Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card title={t('listTitle')}>
          <Table
            headers={[t('table.name'), t('table.segment'), t('table.status'), t('table.actions')]}
            rows={campaigns.map((c) => [
              <button
                key={`n-${c.id}`}
                type="button"
                className="text-left font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => router.push(`/${locale}/campaigns/${c.id}`)}
              >
                {c.name}
              </button>,
              c.segment || '—',
              <Badge key={`s-${c.id}`} tone={statusTone(c.status)}>
                {c.status}
              </Badge>,
              <div key={`a-${c.id}`} className="flex gap-1">
                {c.status === 'draft' && (
                  <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => statusMutation.mutate({ id: c.id, action: 'activate' })}>
                    {t('actions.activate')}
                  </Button>
                )}
                {c.status === 'active' && (
                  <>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => statusMutation.mutate({ id: c.id, action: 'pause' })}>
                      {t('actions.pause')}
                    </Button>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => statusMutation.mutate({ id: c.id, action: 'complete' })}>
                      {t('actions.complete')}
                    </Button>
                  </>
                )}
                {c.status === 'paused' && (
                  <>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => statusMutation.mutate({ id: c.id, action: 'activate' })}>
                      {t('actions.activate')}
                    </Button>
                    <Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => statusMutation.mutate({ id: c.id, action: 'complete' })}>
                      {t('actions.complete')}
                    </Button>
                  </>
                )}
              </div>,
            ])}
          />
        </Card>

        {/* Create Campaign Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createTitle')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder={t('fields.name')}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder={t('fields.description')}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <Input
                placeholder={t('fields.segment')}
                value={form.segment}
                onChange={(e) => setForm((p) => ({ ...p, segment: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('fields.startDate')}</label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">{t('fields.endDate')}</label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('actions.cancel')}</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.name || createMutation.isPending}
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
