'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Table } from '@/components/ui/Table';
import type { InterviewSummary } from '@/lib/types';

interface InterviewTableProps {
  interviews: InterviewSummary[];
  labels: {
    headers: [string, string, string, string, string, string];
    empty: string;
    open: string;
  };
}

export function InterviewTable({ interviews, labels }: InterviewTableProps) {
  const locale = useLocale();

  return (
    <Table
      headers={labels.headers}
      emptyLabel={labels.empty}
      rows={interviews.map((item) => [
        item.interview_id,
        item.respondent_name,
        item.region || '-',
        item.nps_score ?? '-',
        item.sentiment || '-',
        <Link key={item.interview_id} href={`/${locale}/interviews/${item.interview_id}?campaignId=${item.campaign_id}` as never} className="text-primary underline">
          {labels.open}
        </Link>
      ])}
    />
  );
}
