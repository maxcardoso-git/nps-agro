'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { NpsChart } from '@/components/charts/nps-chart';
import { SentimentPieChart } from '@/components/charts/sentiment-pie-chart';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table } from '@/components/ui/table';
import { apiClient } from '@/lib/api/client';
import { extractItems } from '@/lib/api/helpers';
import { useRequiredSession } from '@/hooks/use-required-session';

export default function ReportsPage() {
  const t = useTranslations('reporting');
  const { session } = useRequiredSession();
  const [campaignId, setCampaignId] = useState('');
  const [region, setRegion] = useState('');
  const [sentiment, setSentiment] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['reports', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const summaryQuery = useQuery({
    queryKey: ['reports', 'summary', campaignId],
    queryFn: () => apiClient.reports.executiveSummary(session!, campaignId),
    enabled: Boolean(session && campaignId)
  });

  const interviewsQuery = useQuery({
    queryKey: ['reports', 'interviews', campaignId, region, sentiment],
    queryFn: () =>
      apiClient.reports.listInterviews(session!, campaignId, {
        region: region || undefined,
        sentiment: sentiment || undefined,
        page: 1,
        page_size: 20
      }),
    enabled: Boolean(session && campaignId)
  });

  const campaigns = extractItems(campaignsQuery.data);
  const summary = summaryQuery.data;
  const rawInterviewItems =
    Array.isArray(interviewsQuery.data)
      ? interviewsQuery.data
      : (interviewsQuery.data as { items?: Array<Record<string, unknown>> } | undefined)?.items;
  const interviewItems: Array<Record<string, unknown>> = (rawInterviewItems || []) as Array<
    Record<string, unknown>
  >;

  return (
    <PermissionGate permission="report.read">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">{t('title')}</h1>

        <Card title={t('filtersTitle')}>
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
              <option value="">{t('fields.campaign')}</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </Select>
            <Input placeholder={t('fields.region')} value={region} onChange={(event) => setRegion(event.target.value)} />
            <Select value={sentiment} onChange={(event) => setSentiment(event.target.value)}>
              <option value="">{t('fields.sentiment')}</option>
              <option value="positive">positive</option>
              <option value="neutral">neutral</option>
              <option value="negative">negative</option>
              <option value="mixed">mixed</option>
              <option value="unknown">unknown</option>
            </Select>
          </div>
        </Card>

        {summary ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card title={t('kpis.nps')}>
                <p className="text-3xl font-bold text-primary">{summary.kpis.nps}</p>
              </Card>
              <Card title={t('kpis.interviews')}>
                <p className="text-3xl font-bold text-primary">{summary.kpis.total_interviews}</p>
              </Card>
              <Card title={t('kpis.promoters')}>
                <p className="text-3xl font-bold text-primary">{summary.kpis.promoters}</p>
              </Card>
              <Card title={t('kpis.detractors')}>
                <p className="text-3xl font-bold text-primary">{summary.kpis.detractors}</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title={t('charts.npsBreakdown')}>
                <NpsChart
                  promoters={summary.kpis.promoters}
                  neutrals={summary.kpis.neutrals}
                  detractors={summary.kpis.detractors}
                />
              </Card>
              <Card title={t('charts.sentiment')}>
                <SentimentPieChart data={summary.sentiment_distribution} />
              </Card>
            </div>

            <Card title={t('charts.topics')}>
              <Table
                headers={[t('table.topic'), t('table.frequency')]}
                rows={summary.top_topics.map((topic) => [topic.topic, topic.frequency])}
              />
            </Card>
          </>
        ) : null}

        <Card title={t('interviewsTitle')}>
          <Table
            headers={[t('table.interviewId'), t('table.respondent'), t('table.status'), t('table.sentiment')]}
            rows={interviewItems.map((item) => [
              String(item.interview_id || item.id || '-'),
              String(item.respondent_name || '-'),
              String(item.status || '-'),
              String(item.sentiment || '-')
            ])}
          />
        </Card>
      </div>
    </PermissionGate>
  );
}
