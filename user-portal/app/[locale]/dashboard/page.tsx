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
  const { session, user } = useAuth();
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? t('dashboard.goodMorning') : now.getHours() < 18 ? t('dashboard.goodAfternoon') : t('dashboard.goodEvening');
  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t('dashboard.subtitle')}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {t('dashboard.activeCampaigns')}
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {campaignsQuery.isLoading ? '...' : campaigns.length}
          </p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {t('dashboard.todayCallbacks')}
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {scheduledQuery.isLoading ? '...' : callbacks.length}
          </p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {t('dashboard.todayDate')}
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-700">
            {now.toLocaleDateString(locale as string, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </Card>
      </div>

      {/* Scheduled Callbacks */}
      {callbacks.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-700">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
              {callbacks.length}
            </span>
            {t('dashboard.scheduledCallbacks')}
          </h2>
          <Card>
            <Table
              emptyLabel={t('dashboard.noCallbacks')}
              headers={[t('dashboard.colTime'), t('dashboard.colName'), t('dashboard.colPhone'), t('dashboard.colAccount'), t('dashboard.colCampaign'), '']}
              rows={callbacks.map((cb) => [
                <span key={`t-${cb.id}`} className="font-mono text-sm font-semibold text-amber-700">
                  {cb.scheduled_at
                    ? new Date(cb.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>,
                <span key={`n-${cb.id}`} className="font-medium">{cb.respondent_name}</span>,
                cb.respondent_phone || '—',
                cb.account_name || '—',
                <Badge key={`c-${cb.id}`} tone="neutral">{cb.campaign_name}</Badge>,
                <Button
                  key={`a-${cb.id}`}
                  variant="primary"
                  className="h-7 px-3 text-xs"
                  onClick={() => router.push(`/${locale}/campaigns/${cb.campaign_id}`)}
                >
                  {t('dashboard.call')}
                </Button>,
              ])}
            />
          </Card>
        </div>
      )}

      {/* Active Campaigns */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-700">{t('dashboard.activeCampaigns')}</h2>
        {campaignsQuery.isLoading ? (
          <p className="text-sm text-slate-400">{t('dashboard.loading')}</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
            <p className="text-lg text-slate-400">{t('dashboard.noCampaigns')}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="group cursor-pointer transition hover:border-primary/50 hover:shadow-md">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => router.push(`/${locale}/campaigns/${c.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary">{c.name}</h3>
                    <Badge tone="success">{c.status}</Badge>
                  </div>
                  {c.segment && (
                    <span className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{c.segment}</span>
                  )}
                  <p className="mt-3 text-xs text-primary font-medium">{t('dashboard.openCampaign')} →</p>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
