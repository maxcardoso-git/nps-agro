'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { session } = useRequiredSession();

  const campaignsQuery = useQuery({
    queryKey: ['dashboard', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 5 }),
    enabled: Boolean(session)
  });

  const questionnairesQuery = useQuery({
    queryKey: ['dashboard', 'questionnaires'],
    queryFn: () => apiClient.questionnaires.list(session!, { page: 1, page_size: 5 }),
    enabled: Boolean(session)
  });

  const tenantQuery = useQuery({
    queryKey: ['dashboard', 'tenant', session?.user.tenant_id],
    queryFn: () => apiClient.tenants.getById(session!, session!.user.tenant_id),
    enabled: Boolean(session?.user.tenant_id)
  });

  const campaigns = extractItems(campaignsQuery.data);
  const questionnaires = extractItems(questionnairesQuery.data);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title={t('cards.campaigns')}>
          <p className="text-3xl font-bold text-primary">{campaigns.length}</p>
        </Card>
        <Card title={t('cards.questionnaires')}>
          <p className="text-3xl font-bold text-primary">{questionnaires.length}</p>
        </Card>
        <Card title={t('cards.tenant')}>
          <p className="text-lg font-bold text-primary">{tenantQuery.data?.name ?? '...'}</p>
        </Card>
      </div>

      <Card title={t('recentCampaigns')}>
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
            >
              <p className="font-medium text-slate-800">{campaign.name}</p>
              <Badge tone={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
