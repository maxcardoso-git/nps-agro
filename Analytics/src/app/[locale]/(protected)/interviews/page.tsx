'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { FilterPanel } from '@/components/analytics/filter-panel';
import { InterviewTable } from '@/components/analytics/interview-table';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRequiredSession } from '@/hooks/use-required-session';
import { apiClient } from '@/lib/api/client';
import { filterInterviews } from '@/lib/analytics/transform';
import { extractItems } from '@/lib/api/helpers';
import type { InterviewSummary } from '@/lib/types';

export default function InterviewsPage() {
  const t = useTranslations('reports');
  const { session } = useRequiredSession();

  const [campaignId, setCampaignId] = useState('');
  const [region, setRegion] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchText, setSearchText] = useState('');

  const campaignsQuery = useQuery({
    queryKey: ['interview-explorer', 'campaigns'],
    queryFn: () => apiClient.campaigns.list(session!, { page: 1, page_size: 100 }),
    enabled: Boolean(session)
  });

  const campaigns = extractItems(campaignsQuery.data);

  useEffect(() => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaignId, campaigns]);

  const interviewsQuery = useQuery({
    queryKey: ['interview-explorer', 'interviews', campaignId],
    queryFn: () => apiClient.reports.listInterviews(session!, campaignId, { page: 1, page_size: 500 }),
    enabled: Boolean(session && campaignId)
  });

  const interviews = extractItems(interviewsQuery.data) as InterviewSummary[];
  const filtered = useMemo(
    () =>
      filterInterviews(interviews, { region, sentiment, dateFrom, dateTo }).filter((item) => {
        if (!searchText) {
          return true;
        }

        const aggregate = `${item.respondent_name} ${item.summary_text || ''} ${item.region || ''}`.toLowerCase();
        return aggregate.includes(searchText.toLowerCase());
      }),
    [interviews, region, sentiment, dateFrom, dateTo, searchText]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{t('interviews.title')}</h1>

      <FilterPanel
        campaignId={campaignId}
        campaignOptions={campaigns.map((item) => ({ id: item.id, name: item.name }))}
        region={region}
        sentiment={sentiment}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onCampaignChange={setCampaignId}
        onRegionChange={setRegion}
        onSentimentChange={setSentiment}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        labels={{
          title: t('filters.title'),
          campaign: t('filters.campaign'),
          region: t('filters.region'),
          sentiment: t('filters.sentiment'),
          dateFrom: t('filters.dateFrom'),
          dateTo: t('filters.dateTo'),
          allCampaigns: t('filters.allCampaigns'),
          allSentiments: t('filters.allSentiments')
        }}
      />

      <Card title={t('interviews.searchTitle')}>
        <Input
          placeholder={t('interviews.searchPlaceholder')}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </Card>

      <InterviewTable
        title={t('interviews.tableTitle')}
        interviews={filtered}
        emptyLabel={t('interviews.empty')}
        labels={{
          id: t('interviews.table.id'),
          respondent: t('interviews.table.respondent'),
          region: t('interviews.table.region'),
          nps: t('interviews.table.nps'),
          sentiment: t('interviews.table.sentiment'),
          status: t('interviews.table.status')
        }}
      />
    </div>
  );
}
