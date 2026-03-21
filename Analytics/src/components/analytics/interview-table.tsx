'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Card } from '@/components/ui/card';
import type { InterviewSummary } from '@/lib/types';

interface InterviewTableProps {
  title: string;
  interviews: InterviewSummary[];
  emptyLabel: string;
  labels: {
    id: string;
    respondent: string;
    region: string;
    nps: string;
    sentiment: string;
    status: string;
  };
}

export function InterviewTable({ title, interviews, emptyLabel, labels }: InterviewTableProps) {
  const locale = useLocale();

  return (
    <Card title={title}>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
              <tr>
              <th className="px-3 py-2 font-semibold text-slate-700">{labels.id}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{labels.respondent}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{labels.region}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{labels.nps}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{labels.sentiment}</th>
              <th className="px-3 py-2 font-semibold text-slate-700">{labels.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {interviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              interviews.map((item) => (
                <tr key={item.interview_id}>
                  <td className="px-3 py-2 text-primary underline">
                    <Link
                      href={`/${locale}/interviews/${item.interview_id}?campaignId=${item.campaign_id}` as never}
                    >
                      {item.interview_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.respondent_name}</td>
                  <td className="px-3 py-2">{item.region || '-'}</td>
                  <td className="px-3 py-2">{item.nps_score ?? '-'}</td>
                  <td className="px-3 py-2">{item.sentiment || '-'}</td>
                  <td className="px-3 py-2">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
