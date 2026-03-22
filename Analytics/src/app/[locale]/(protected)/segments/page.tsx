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

export default function SegmentAnalyticsPage() {
  const t = useTranslations('analytics.segments');
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['analytics-campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page_size: 100 }),
    enabled: Boolean(session),
  });

  const segmentsQuery = useQuery({
    queryKey: ['nps-by-segment', campaignId],
    queryFn: () => apiClient.reports.npsBySegment(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const regionsQuery = useQuery({
    queryKey: ['nps-by-region', campaignId],
    queryFn: () => apiClient.reports.npsByRegion(session!, campaignId || undefined),
    enabled: Boolean(session),
  });

  const campaigns = extractItems(campaignsQuery.data);
  const segments = segmentsQuery.data ?? [];
  const regions = regionsQuery.data ?? [];

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

      {segments.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <>
          {/* Chart */}
          <Card title={t('chartTitle')}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segments} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
                  <YAxis domain={[-100, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="nps_score" name="NPS" radius={[4, 4, 0, 0]}>
                    {segments.map((s, i) => (
                      <Cell key={i} fill={NPS_COLORS(s.nps_score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t('colSegment')}</th>
                  <th className="px-3 py-2 font-semibold text-right">{t('colInterviews')}</th>
                  <th className="px-3 py-2 font-semibold text-right">{t('colNps')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {segments.map((s) => (
                  <tr key={s.segment}>
                    <td className="px-3 py-2 font-medium">{s.segment}</td>
                    <td className="px-3 py-2 text-right">{s.total_interviews}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={s.nps_score >= 50 ? 'success' : s.nps_score >= 0 ? 'warning' : 'danger'}>
                        {s.nps_score}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Regions */}
          {regions.length > 0 && (
            <Card title={t('regions.title', { ns: 'analytics' })}>
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Região</th>
                    <th className="px-3 py-2 font-semibold">UF</th>
                    <th className="px-3 py-2 font-semibold text-right">Entrevistas</th>
                    <th className="px-3 py-2 font-semibold text-right">NPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {regions.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.region || '—'}</td>
                      <td className="px-3 py-2">{r.state || '—'}</td>
                      <td className="px-3 py-2 text-right">{r.total_interviews}</td>
                      <td className="px-3 py-2 text-right">
                        <Badge tone={r.nps_score >= 50 ? 'success' : r.nps_score >= 0 ? 'warning' : 'danger'}>
                          {r.nps_score}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
