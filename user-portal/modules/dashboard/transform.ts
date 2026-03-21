import { monthKey } from '@/lib/utils';
import type { InterviewSummary } from '@/lib/types';

export function buildNpsTrend(interviews: InterviewSummary[]): Array<{ period: string; nps: number }> {
  const map = new Map<string, { sum: number; count: number }>();

  interviews.forEach((item) => {
    if (item.nps_score === undefined || item.nps_score === null) {
      return;
    }

    const key = monthKey(item.completed_at);
    if (!key) {
      return;
    }

    const current = map.get(key) || { sum: 0, count: 0 };
    current.sum += Number(item.nps_score);
    current.count += 1;
    map.set(key, current);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      period,
      nps: Number((value.sum / value.count).toFixed(2))
    }));
}

export function applyFilters(
  interviews: InterviewSummary[],
  filters: { region?: string; sentiment?: string; date_from?: string; date_to?: string; nps_min?: string; nps_max?: string }
): InterviewSummary[] {
  return interviews.filter((item) => {
    const regionOk = filters.region
      ? (item.region || '').toLowerCase().includes(filters.region.toLowerCase())
      : true;
    const sentimentOk = filters.sentiment ? item.sentiment === filters.sentiment : true;

    const score = item.nps_score ?? null;
    const npsMinOk = filters.nps_min ? (score !== null ? score >= Number(filters.nps_min) : false) : true;
    const npsMaxOk = filters.nps_max ? (score !== null ? score <= Number(filters.nps_max) : false) : true;

    const completed = item.completed_at ? new Date(item.completed_at) : null;
    const fromOk = filters.date_from ? (completed ? completed >= new Date(filters.date_from) : false) : true;
    const toOk = filters.date_to ? (completed ? completed <= new Date(filters.date_to) : false) : true;

    return regionOk && sentimentOk && npsMinOk && npsMaxOk && fromOk && toOk;
  });
}
