import type { InterviewSummary } from '@/lib/types';

export function searchInterviews(interviews: InterviewSummary[], text: string): InterviewSummary[] {
  if (!text) {
    return interviews;
  }

  const needle = text.toLowerCase();
  return interviews.filter((item) => {
    const aggregate = `${item.respondent_name} ${item.summary_text || ''} ${item.region || ''} ${item.city || ''}`.toLowerCase();
    return aggregate.includes(needle);
  });
}
