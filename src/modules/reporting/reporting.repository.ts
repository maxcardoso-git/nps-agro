import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

interface CampaignRow {
  id: string;
  tenant_id: string;
  name: string;
  segment: string | null;
  status: string;
}

@Injectable()
export class ReportingRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  getCampaign(campaignId: string): Promise<CampaignRow | null> {
    return this.one<CampaignRow>(
      `
      SELECT id, tenant_id, name, segment, status
      FROM core.campaign
      WHERE id = $1
      `,
      [campaignId],
    );
  }

  getNpsByCampaign(campaignId: string) {
    return this.one<{
      campaign_id: string;
      total_interviews: number;
      promoters: number;
      neutrals: number;
      detractors: number;
      nps: number;
    }>(
      `
      SELECT campaign_id, total_interviews, promoters, neutrals, detractors, nps
      FROM analytics.vw_nps_by_campaign
      WHERE campaign_id = $1
      `,
      [campaignId],
    );
  }

  getSentimentDistribution(campaignId: string) {
    return this.many<{ sentiment: string; count: number }>(
      `
      SELECT
        COALESCE(sentiment, 'unknown') AS sentiment,
        COUNT(*)::int AS count
      FROM analytics.vw_interview_summary
      WHERE campaign_id = $1
      GROUP BY COALESCE(sentiment, 'unknown')
      ORDER BY count DESC
      `,
      [campaignId],
    );
  }

  getTopTopics(campaignId: string, limit = 10) {
    return this.many<{ topic: string; frequency: number }>(
      `
      SELECT topic, frequency
      FROM analytics.vw_topic_frequency
      WHERE campaign_id = $1
      ORDER BY frequency DESC, topic ASC
      LIMIT $2
      `,
      [campaignId, limit],
    );
  }

  getRegionalBreakdown(campaignId: string) {
    return this.many<{ region: string | null; count: number; avg_nps: number | null }>(
      `
      SELECT
        region,
        COUNT(*)::int AS count,
        ROUND(AVG(nps_score)::numeric, 2) AS avg_nps
      FROM analytics.vw_interview_summary
      WHERE campaign_id = $1
      GROUP BY region
      ORDER BY count DESC
      `,
      [campaignId],
    );
  }

  getNpsBySegment(tenantId: string, campaignId?: string) {
    const conditions = ['1=1'];
    const values: unknown[] = [];
    if (campaignId) {
      values.push(campaignId);
      conditions.push(`campaign_id = $${values.length}`);
    }
    return this.many<{
      segment: string;
      campaign_id: string;
      total_interviews: number;
      promoters: number;
      neutrals: number;
      detractors: number;
      nps_score: number;
    }>(
      `SELECT * FROM analytics.vw_nps_by_segment WHERE ${conditions.join(' AND ')} ORDER BY segment`,
      values,
    );
  }

  getNpsByRegion(tenantId: string, campaignId?: string) {
    const conditions = ['1=1'];
    const values: unknown[] = [];
    if (campaignId) {
      values.push(campaignId);
      conditions.push(`campaign_id = $${values.length}`);
    }
    return this.many<{
      region: string;
      state: string;
      campaign_id: string;
      total_interviews: number;
      nps_score: number;
    }>(
      `SELECT * FROM analytics.vw_nps_by_region WHERE ${conditions.join(' AND ')} ORDER BY total_interviews DESC`,
      values,
    );
  }

  getNpsByAccount(tenantId: string, campaignId?: string) {
    const conditions = ['1=1'];
    const values: unknown[] = [];
    if (campaignId) {
      values.push(campaignId);
      conditions.push(`campaign_id = $${values.length}`);
    }
    return this.many<{
      account_id: string;
      account_name: string;
      campaign_id: string;
      total_interviews: number;
      nps_score: number;
    }>(
      `SELECT * FROM analytics.vw_nps_by_account WHERE ${conditions.join(' AND ')} ORDER BY total_interviews DESC LIMIT 50`,
      values,
    );
  }

  listInterviewSummaries(params: {
    campaignId: string;
    region?: string;
    sentiment?: string;
    npsClass?: string;
    page: number;
    pageSize: number;
  }) {
    const where: string[] = ['campaign_id = $1'];
    const values: unknown[] = [params.campaignId];

    if (params.region) {
      values.push(params.region);
      where.push(`region = $${values.length}`);
    }
    if (params.sentiment) {
      values.push(params.sentiment);
      where.push(`sentiment = $${values.length}`);
    }
    if (params.npsClass) {
      values.push(params.npsClass);
      where.push(`nps_class = $${values.length}`);
    }

    values.push(params.pageSize);
    const limitParam = `$${values.length}`;
    values.push((params.page - 1) * params.pageSize);
    const offsetParam = `$${values.length}`;

    return this.many<{
      interview_id: string;
      respondent_id: string;
      respondent_name: string;
      region: string | null;
      city: string | null;
      state: string | null;
      channel: string;
      status: string;
      nps_score: number | null;
      nps_class: string | null;
      sentiment: string | null;
      summary_text: string | null;
      completed_at: Date | null;
    }>(
      `
      SELECT
        interview_id,
        respondent_id,
        respondent_name,
        region,
        city,
        state,
        channel,
        status,
        nps_score,
        nps_class,
        sentiment,
        summary_text,
        completed_at
      FROM analytics.vw_interview_summary
      WHERE ${where.join(' AND ')}
      ORDER BY completed_at DESC NULLS LAST, interview_id DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
      `,
      values,
    );
  }

  async getCampaignIndicators(campaignId: string, actionId?: string) {
    const schemaRow = await this.one<{ schema_json: { questions: Array<{ id: string; label: string; type: string; options?: string[] }> } }>(
      actionId
        ? `SELECT qv.schema_json FROM core.campaign_action ca JOIN core.questionnaire_version qv ON qv.id = ca.questionnaire_version_id WHERE ca.id = $1`
        : `SELECT qv.schema_json FROM core.campaign c JOIN core.questionnaire_version qv ON qv.id = c.questionnaire_version_id WHERE c.id = $1`,
      [actionId || campaignId],
    );

    if (!schemaRow?.schema_json?.questions) return { questions: [], indicators: [] };

    const questions = schemaRow.schema_json.questions;
    const filter = actionId ? `i.action_id = $1` : `i.campaign_id = $1`;
    const filterVal = actionId || campaignId;
    const indicators = [];

    for (const q of questions) {
      if (q.type === 'nps') {
        const data = await this.many<{ value: number; count: number }>(
          `SELECT a.value_numeric AS value, COUNT(*)::int AS count FROM core.answer a JOIN core.interview i ON i.id = a.interview_id WHERE ${filter} AND a.question_id = $2 AND a.value_numeric IS NOT NULL AND i.status = 'completed' GROUP BY a.value_numeric ORDER BY a.value_numeric`,
          [filterVal, q.id],
        );
        const total = data.reduce((s, r) => s + r.count, 0);
        const promoters = data.filter((r) => r.value >= 9).reduce((s, r) => s + r.count, 0);
        const neutrals = data.filter((r) => r.value >= 7 && r.value <= 8).reduce((s, r) => s + r.count, 0);
        const detractors = data.filter((r) => r.value <= 6).reduce((s, r) => s + r.count, 0);
        const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
        indicators.push({ question_id: q.id, label: q.label, type: 'nps', data: { nps, total, promoters, neutrals, detractors, distribution: data } });
      } else if (q.type === 'scale') {
        const data = await this.many<{ value: number; count: number }>(
          `SELECT a.value_numeric AS value, COUNT(*)::int AS count FROM core.answer a JOIN core.interview i ON i.id = a.interview_id WHERE ${filter} AND a.question_id = $2 AND a.value_numeric IS NOT NULL AND i.status = 'completed' GROUP BY a.value_numeric ORDER BY a.value_numeric`,
          [filterVal, q.id],
        );
        const total = data.reduce((s, r) => s + r.count, 0);
        const avg = total > 0 ? data.reduce((s, r) => s + r.value * r.count, 0) / total : 0;
        indicators.push({ question_id: q.id, label: q.label, type: 'scale', data: { avg: Math.round(avg * 10) / 10, total, distribution: data } });
      } else if (q.type === 'single_choice') {
        const data = await this.many<{ value: string; count: number }>(
          `SELECT a.value_text AS value, COUNT(*)::int AS count FROM core.answer a JOIN core.interview i ON i.id = a.interview_id WHERE ${filter} AND a.question_id = $2 AND a.value_text IS NOT NULL AND i.status = 'completed' GROUP BY a.value_text ORDER BY count DESC`,
          [filterVal, q.id],
        );
        const total = data.reduce((s, r) => s + r.count, 0);
        indicators.push({ question_id: q.id, label: q.label, type: 'single_choice', data: { total, options: data.map((r) => ({ ...r, pct: total > 0 ? Math.round((r.count / total) * 100) : 0 })) } });
      } else if (q.type === 'multi_choice') {
        const data = await this.many<{ value: string; count: number }>(
          `SELECT opt AS value, COUNT(*)::int AS count FROM core.answer a JOIN core.interview i ON i.id = a.interview_id, jsonb_array_elements_text(a.value_json) AS opt WHERE ${filter} AND a.question_id = $2 AND a.value_json IS NOT NULL AND i.status = 'completed' GROUP BY opt ORDER BY count DESC`,
          [filterVal, q.id],
        );
        indicators.push({ question_id: q.id, label: q.label, type: 'multi_choice', data: { options: data } });
      } else if (q.type === 'text') {
        const data = await this.many<{ value: string }>(
          `SELECT a.value_text AS value FROM core.answer a JOIN core.interview i ON i.id = a.interview_id WHERE ${filter} AND a.question_id = $2 AND a.value_text IS NOT NULL AND a.value_text != '' AND i.status = 'completed' ORDER BY a.created_at DESC LIMIT 50`,
          [filterVal, q.id],
        );
        indicators.push({ question_id: q.id, label: q.label, type: 'text', data: { total: data.length, responses: data.map((r) => r.value) } });
      } else if (q.type === 'number') {
        const data = await this.one<{ avg: number; min: number; max: number; total: number }>(
          `SELECT ROUND(AVG(a.value_numeric)::numeric, 1) AS avg, MIN(a.value_numeric)::int AS min, MAX(a.value_numeric)::int AS max, COUNT(*)::int AS total FROM core.answer a JOIN core.interview i ON i.id = a.interview_id WHERE ${filter} AND a.question_id = $2 AND a.value_numeric IS NOT NULL AND i.status = 'completed'`,
          [filterVal, q.id],
        );
        indicators.push({ question_id: q.id, label: q.label, type: 'number', data });
      }
    }

    return { campaign_id: campaignId, action_id: actionId || null, questions, indicators };
  }

  getExecutionStats(tenantId: string, campaignId?: string) {
    const where = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    if (campaignId) {
      params.push(campaignId);
      where.push(`campaign_id = $${params.length}`);
    }
    return this.many(
      `SELECT campaign_id, total_contacts, pending, in_progress, completed, exhausted,
              completion_rate, avg_attempts_to_complete
       FROM analytics.vw_execution_stats
       WHERE ${where.join(' AND ')}`,
      params,
    );
  }

  getQualityStats(tenantId: string) {
    return this.one(
      `SELECT total_reviews, approved, rejected, pending, avg_score, rejection_rate
       FROM analytics.vw_quality_stats
       WHERE tenant_id = $1`,
      [tenantId],
    );
  }
}

