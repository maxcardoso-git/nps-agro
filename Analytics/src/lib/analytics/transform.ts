import { formatDateKey } from '@/lib/api/helpers';
import type { ExecutiveSummary, InterviewSummary } from '@/lib/types';

export function filterInterviews(
  interviews: InterviewSummary[],
  filters: { region?: string; sentiment?: string; dateFrom?: string; dateTo?: string }
): InterviewSummary[] {
  return interviews.filter((item) => {
    const regionMatch = filters.region
      ? (item.region || '').toLowerCase().includes(filters.region.toLowerCase())
      : true;
    const sentimentMatch = filters.sentiment ? item.sentiment === filters.sentiment : true;

    const date = item.completed_at ? new Date(item.completed_at) : null;
    const fromMatch = filters.dateFrom ? (date ? date >= new Date(filters.dateFrom) : false) : true;
    const toMatch = filters.dateTo ? (date ? date <= new Date(filters.dateTo) : false) : true;

    return regionMatch && sentimentMatch && fromMatch && toMatch;
  });
}

export function buildTrendFromInterviews(interviews: InterviewSummary[]): Array<{ period: string; value: number }> {
  const map = new Map<string, { sum: number; count: number }>();

  interviews.forEach((item) => {
    if (item.nps_score === null || item.nps_score === undefined) {
      return;
    }

    const period = formatDateKey(item.completed_at || item.started_at);
    if (!period) {
      return;
    }

    const current = map.get(period) || { sum: 0, count: 0 };
    current.sum += Number(item.nps_score);
    current.count += 1;
    map.set(period, current);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({
      period,
      value: Number((value.sum / value.count).toFixed(2))
    }));
}

export function buildInsights(summary: ExecutiveSummary): Array<{
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
}> {
  const insights: Array<{
    title: string;
    description: string;
    tone: 'success' | 'warning' | 'danger' | 'neutral';
  }> = [];

  const nps = summary.kpis.nps;
  if (nps >= 50) {
    insights.push({
      title: 'NPS Strong',
      description: `NPS em nível alto (${nps}). Estratégia atual gera boa percepção.`,
      tone: 'success'
    });
  } else if (nps <= 0) {
    insights.push({
      title: 'NPS Risk',
      description: `NPS crítico (${nps}). Priorizar plano de recuperação de detratores.`,
      tone: 'danger'
    });
  } else {
    insights.push({
      title: 'NPS Moderate',
      description: `NPS intermediário (${nps}). Existe espaço de melhoria incremental.`,
      tone: 'warning'
    });
  }

  const topTopic = summary.top_topics[0];
  if (topTopic) {
    insights.push({
      title: 'Top Topic',
      description: `Tema mais citado: ${topTopic.topic} (${topTopic.frequency} menções).`,
      tone: 'neutral'
    });
  }

  const topRegion = summary.regional_breakdown[0];
  if (topRegion) {
    insights.push({
      title: 'Top Region',
      description: `Região com maior volume: ${topRegion.region} (${topRegion.count}).`,
      tone: 'neutral'
    });
  }

  return insights;
}
