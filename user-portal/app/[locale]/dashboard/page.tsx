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
import type { Campaign } from '@/lib/types';

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
          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map((c) => (
              <CampaignProgressCard key={c.id} campaign={c} locale={locale as string} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// CAMPAIGN PROGRESS CARD
// =====================================================
const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  in_progress: '#f59e0b',
  success: '#3b82f6',
  scheduled: '#8b5cf6',
  no_answer: '#ef4444',
  wrong_number: '#dc2626',
  busy: '#f97316',
  refused: '#6b7280',
  pending: '#e2e8f0',
};

const STATUS_LABELS_PT: Record<string, string> = {
  completed: 'Concluído',
  in_progress: 'Em andamento',
  success: 'Contatado',
  scheduled: 'Agendado',
  no_answer: 'Não atendeu',
  wrong_number: 'Nº errado',
  busy: 'Ocupado',
  refused: 'Recusou',
  pending: 'Pendente',
};

function CampaignProgressCard({ campaign, locale }: { campaign: Campaign; locale: string }) {
  const t = useTranslations('interviewer.dashboard');
  const { session } = useAuth();
  const router = useRouter();

  const statsQuery = useQuery({
    queryKey: ['campaign-stats', campaign.id],
    queryFn: () => api.campaigns.getContactStats(session!, campaign.id),
    enabled: Boolean(session),
    staleTime: 30000,
  });

  const stats = statsQuery.data ?? [];
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const completedCount = stats.find((s) => s.status === 'completed')?.count ?? 0;
  const pendingCount = stats.find((s) => s.status === 'pending')?.count ?? 0;
  const contactedCount = total - pendingCount;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <Card className="group cursor-pointer transition hover:border-primary/50 hover:shadow-md">
      <button
        type="button"
        className="w-full text-left"
        onClick={() => router.push(`/${locale}/campaigns/${campaign.id}`)}
      >
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-slate-900 group-hover:text-primary">{campaign.name}</h3>
          <Badge tone="success">{campaign.status}</Badge>
        </div>

        {campaign.segment && (
          <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{campaign.segment}</span>
        )}

        {/* Progress stats */}
        {total > 0 && (
          <div className="mt-3 space-y-2">
            {/* Summary numbers */}
            <div className="flex justify-between text-xs text-slate-500">
              <span>{contactedCount}/{total} {t('contacted')}</span>
              <span className="font-semibold text-emerald-600">{pct}% {t('completedLabel')}</span>
            </div>

            {/* Stacked progress bar */}
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {stats
                .filter((s) => s.status !== 'pending')
                .sort((a, b) => {
                  const order = ['completed', 'in_progress', 'success', 'scheduled', 'no_answer', 'wrong_number', 'busy', 'refused'];
                  return order.indexOf(a.status) - order.indexOf(b.status);
                })
                .map((s) => (
                  <div
                    key={s.status}
                    className="h-full transition-all"
                    style={{
                      width: `${(s.count / total) * 100}%`,
                      backgroundColor: STATUS_COLORS[s.status] || '#94a3b8',
                    }}
                    title={`${STATUS_LABELS_PT[s.status] || s.status}: ${s.count}`}
                  />
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {stats
                .filter((s) => s.count > 0 && s.status !== 'pending')
                .map((s) => (
                  <span key={s.status} className="flex items-center gap-1 text-[10px] text-slate-500">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] }} />
                    {STATUS_LABELS_PT[s.status] || s.status} ({s.count})
                  </span>
                ))}
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-200" />
                  Pendente ({pendingCount})
                </span>
              )}
            </div>
          </div>
        )}

        <p className="mt-2 text-xs font-medium text-primary">{t('openCampaign')} →</p>
      </button>
    </Card>
  );
}

