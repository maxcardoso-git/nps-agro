'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

const NPS_COLORS = (nps: number) => {
  if (nps >= 50) return '#10b981';
  if (nps >= 0) return '#f59e0b';
  return '#ef4444';
};

export default function AccountAnalyticsPage() {
  const t = useTranslations('analytics.accounts');
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['analytics-campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });

  const accountsQuery = useQuery({
    queryKey: ['nps-by-account', campaignId],
    queryFn: () => apiClient.reports.npsByAccount(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const campaigns = extractItems(campaignsQuery.data);
  const accounts = accountsQuery.data ?? [];
  const top20 = accounts.slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('description')}</p>
      </div>

      {/* Campaign filter */}
      <Card>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">{t('filterCampaign')}</label>
          <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="max-w-xs">
            <option value="">{t('allCampaigns')}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </Card>

      {accounts.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <>
          {/* Chart — Top 20 */}
          <Card title={`${t('chartTitle')} (${t('top')})`}>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top20} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 150 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[-100, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="account_name" type="category" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="nps_score" name="NPS" radius={[0, 4, 4, 0]}>
                    {top20.map((a, i) => (
                      <Cell key={i} fill={NPS_COLORS(a.nps_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Full table */}
          <Card>
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t('colAccount')}</th>
                  <th className="px-3 py-2 font-semibold text-right">{t('colInterviews')}</th>
                  <th className="px-3 py-2 font-semibold text-right">{t('colNps')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((a) => (
                  <tr key={a.account_id}>
                    <td className="px-3 py-2 font-medium">{a.account_name}</td>
                    <td className="px-3 py-2 text-right">{a.total_interviews}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={a.nps_score >= 50 ? 'success' : a.nps_score >= 0 ? 'warning' : 'danger'}>
                        {a.nps_score}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
