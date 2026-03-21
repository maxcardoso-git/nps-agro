'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';

const CampaignCompareChart = dynamic(
  () => import('@/components/charts/campaign-compare-chart').then((mod) => mod.CampaignCompareChart),
  { ssr: false }
);

export default function CampaignsPage() {
  const t = useTranslations('reports');
  const locale = useLocale();
  const { session } = useRequiredSession();
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);

  const campaignsQuery = useQuery({
    queryKey: ['analytics-campaigns', 'list'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const campaigns = extractItems(campaignsQuery.data);

  const summaryQueries = useQueries({
    queries: selectedCampaigns.map((campaignId) => ({
      queryKey: ['analytics-campaigns', 'summary', campaignId],
      queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
      enabled: Boolean(session && campaignId)
    }))
  });

  const compareData = useMemo(
    () =>
      summaryQueries
        .filter((query) => query.data)
        .map((query) => ({
          campaign: query.data!.campaign.name,
          nps: query.data!.kpis.nps
        })),
    [summaryQueries]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('campaigns.title')}</h1>

      <Card title={t('campaigns.compareTitle')}>
        <div className="grid gap-2 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const checked = selectedCampaigns.includes(campaign.id);
            return (
              <label key={campaign.id} className="flex items-center gap-2 rounded border border-slate-200 p-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedCampaigns((prev) => [...prev, campaign.id]);
                    } else {
                      setSelectedCampaigns((prev) => prev.filter((item) => item !== campaign.id));
                    }
                  }}
                />
                {campaign.name}
              </label>
            );
          })}
        </div>

        <div className="mt-4">
          <CampaignCompareChart data={compareData} />
        </div>
      </Card>

      <Card title={t('campaigns.listTitle')}>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700">{t('campaigns.table.name')}</th>
                <th className="px-3 py-2 font-semibold text-slate-700">{t('campaigns.table.status')}</th>
                <th className="px-3 py-2 font-semibold text-slate-700">{t('campaigns.table.segment')}</th>
                <th className="px-3 py-2 font-semibold text-slate-700">{t('campaigns.table.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-3 py-2">{campaign.name}</td>
                  <td className="px-3 py-2">{campaign.status}</td>
                  <td className="px-3 py-2">{campaign.segment || '-'}</td>
                  <td className="px-3 py-2 text-primary underline">
                    <Link href={`/${locale}/campaigns/${campaign.id}` as never}>{t('campaigns.table.open')}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
