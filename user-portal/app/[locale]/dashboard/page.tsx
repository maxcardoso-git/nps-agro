'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { api, extractItems } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

export default function DashboardPage() {
  const t = useTranslations('interviewer');
  const { session } = useAuth();
  const router = useRouter();
  const { locale } = useParams();

  const campaignsQuery = useQuery({
    queryKey: ['campaigns', 'active'],
    queryFn: () => api.campaigns.list(session!, { status: 'active', page_size: 50 }),
    enabled: Boolean(session),
  });

  const scheduledQuery = useQuery({
    queryKey: ['scheduled-callbacks'],
    queryFn: () => api.contactAttempts.getMyScheduled(session!),
    enabled: Boolean(session),
  });

  const campaigns = extractItems(campaignsQuery.data);
  const callbacks = scheduledQuery.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{t('dashboard.title')}</h1>

      {/* Active Campaigns */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-700">{t('dashboard.activeCampaigns')}</h2>
        {campaignsQuery.isLoading ? (
          <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-slate-400">{t('dashboard.noCampaigns')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="cursor-pointer transition hover:border-primary/50">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => router.push(`/${locale}/campaigns/${c.id}`)}
                >
                  <h3 className="font-medium text-slate-900">{c.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="success">{c.status}</Badge>
                    {c.segment && <span className="text-xs text-slate-500">{c.segment}</span>}
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled Callbacks */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-700">{t('dashboard.scheduledCallbacks')}</h2>
        {scheduledQuery.isLoading ? (
          <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>
        ) : callbacks.length === 0 ? (
          <p className="text-sm text-slate-400">{t('dashboard.noCallbacks')}</p>
        ) : (
          <Table
            emptyLabel={t('dashboard.noCallbacks')}
            headers={[t('dashboard.colTime'), t('dashboard.colName'), t('dashboard.colPhone'), t('dashboard.colCampaign'), '']}
            rows={callbacks.map((cb) => [
              cb.scheduled_at
                ? new Date(cb.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '—',
              cb.respondent_name,
              cb.respondent_phone || '—',
              cb.campaign_name,
              <Button
                key={cb.id}
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => router.push(`/${locale}/campaigns/${cb.campaign_id}`)}
              >
                {t('dashboard.call')}
              </Button>,
            ])}
          />
        )}
      </div>
    </div>
  );
}
