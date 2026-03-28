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

  async getAdherenceStats(tenantId: string, campaignId?: string) {
    const filter = campaignId ? `AND aa.campaign_id = '${campaignId}'` : '';

    const stats = await this.one<{ avg_adherence: number; total: number; high: number; medium: number; low: number }>(
      `SELECT
        ROUND(AVG(aa.adherence_score)::numeric, 1) AS avg_adherence,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE aa.adherence_score >= 80)::int AS high,
        COUNT(*) FILTER (WHERE aa.adherence_score >= 60 AND aa.adherence_score < 80)::int AS medium,
        COUNT(*) FILTER (WHERE aa.adherence_score < 60)::int AS low
      FROM core.audio_asset aa
      WHERE aa.tenant_id = $1 AND aa.adherence_score IS NOT NULL ${filter}`,
      [tenantId],
    );

    const details = await this.many<{ respondent_name: string; code: string; adherence_score: number }>(
      `SELECT r.name AS respondent_name, r.external_id AS code, aa.adherence_score
       FROM core.audio_asset aa
       JOIN core.interview i ON i.id = aa.interview_id
       JOIN core.respondent r ON r.id = i.respondent_id
       WHERE aa.tenant_id = $1 AND aa.adherence_score IS NOT NULL ${filter}
       ORDER BY aa.adherence_score ASC
       LIMIT 20`,
      [tenantId],
    );

    return { ...stats, total_with_adherence: stats?.total || 0, details };
  }

  async getGraph(tenantId: string, campaignId?: string) {
    const campaignFilter = campaignId ? `AND v.campaign_id = '${campaignId}'` : '';
    const tenantFilter = `v.tenant_id = '${tenantId}'`;

    // Campaigns
    const campaigns = await this.many<{ id: string; name: string; segment: string | null; interview_count: number }>(
      `SELECT c.id, c.name, c.segment, COUNT(DISTINCT v.interview_id)::int AS interview_count
       FROM core.campaign c
       LEFT JOIN analytics.vw_interview_summary v ON v.campaign_id = c.id AND ${tenantFilter}
       WHERE c.tenant_id = $1 AND c.status = 'active'
       GROUP BY c.id, c.name, c.segment`,
      [tenantId],
    );

    // Segments with NPS
    const segments = await this.many<{ segment: string; nps: number; count: number }>(
      `SELECT v.segment, ROUND((COUNT(*) FILTER (WHERE v.nps_class='promoter')::numeric - COUNT(*) FILTER (WHERE v.nps_class='detractor')::numeric) / NULLIF(COUNT(*),0) * 100, 0) AS nps, COUNT(*)::int AS count
       FROM analytics.vw_interview_summary v WHERE ${tenantFilter} ${campaignFilter} AND v.segment IS NOT NULL GROUP BY v.segment`,
      [],
    );

    // Sentiments
    const sentiments = await this.many<{ sentiment: string; count: number }>(
      `SELECT v.sentiment, COUNT(*)::int AS count FROM analytics.vw_interview_summary v WHERE ${tenantFilter} ${campaignFilter} AND v.sentiment IS NOT NULL GROUP BY v.sentiment`,
      [],
    );

    // NPS classes
    const npsClasses = await this.many<{ nps_class: string; count: number }>(
      `SELECT v.nps_class, COUNT(*)::int AS count FROM analytics.vw_interview_summary v WHERE ${tenantFilter} ${campaignFilter} AND v.nps_class IS NOT NULL GROUP BY v.nps_class`,
      [],
    );

    // Topics
    const topics = await this.many<{ topic: string; count: number }>(
      `SELECT topic, COUNT(*)::int AS count FROM analytics.vw_topic_frequency WHERE tenant_id = $1 ${campaignId ? `AND campaign_id = '${campaignId}'` : ''} GROUP BY topic ORDER BY count DESC LIMIT 15`,
      [tenantId],
    );

    // Regions
    const regions = await this.many<{ region: string; count: number }>(
      `SELECT v.region, COUNT(*)::int AS count FROM analytics.vw_interview_summary v WHERE ${tenantFilter} ${campaignFilter} AND v.region IS NOT NULL GROUP BY v.region ORDER BY count DESC LIMIT 10`,
      [],
    );

    // Topic-sentiment links
    const topicSentiment = await this.many<{ topic: string; sentiment: string; count: number }>(
      `SELECT t.topic, e.sentiment, COUNT(*)::int AS count
       FROM core.enrichment e, jsonb_array_elements_text(e.topics_json) AS t(topic)
       WHERE e.tenant_id = $1 ${campaignId ? `AND e.campaign_id = '${campaignId}'` : ''} AND e.sentiment IS NOT NULL
       GROUP BY t.topic, e.sentiment ORDER BY count DESC LIMIT 30`,
      [tenantId],
    );

    // Segment-topic links
    const segmentTopic = await this.many<{ segment: string; topic: string; count: number }>(
      `SELECT r.segment, t.topic, COUNT(*)::int AS count
       FROM core.enrichment e
       JOIN core.interview i ON i.id = e.interview_id
       JOIN core.respondent r ON r.id = i.respondent_id, jsonb_array_elements_text(e.topics_json) AS t(topic)
       WHERE e.tenant_id = $1 ${campaignId ? `AND e.campaign_id = '${campaignId}'` : ''} AND r.segment IS NOT NULL
       GROUP BY r.segment, t.topic ORDER BY count DESC LIMIT 30`,
      [tenantId],
    );

    // Build nodes
    const nodes: Array<{ id: string; label: string; type: string; value: number; color?: string }> = [];
    const links: Array<{ source: string; target: string; value: number }> = [];

    campaigns.forEach((c) => nodes.push({ id: `camp_${c.id}`, label: c.name, type: 'campaign', value: c.interview_count || 1 }));
    segments.forEach((s) => nodes.push({ id: `seg_${s.segment}`, label: s.segment, type: 'segment', value: s.count, color: Number(s.nps) >= 50 ? '#10b981' : Number(s.nps) >= 0 ? '#f59e0b' : '#ef4444' }));
    sentiments.forEach((s) => nodes.push({ id: `sent_${s.sentiment}`, label: s.sentiment, type: 'sentiment', value: s.count, color: s.sentiment === 'positive' ? '#10b981' : s.sentiment === 'negative' ? '#ef4444' : s.sentiment === 'neutral' ? '#60a5fa' : '#f59e0b' }));
    npsClasses.forEach((n) => nodes.push({ id: `nps_${n.nps_class}`, label: n.nps_class, type: 'nps_class', value: n.count, color: n.nps_class === 'promoter' ? '#10b981' : n.nps_class === 'detractor' ? '#ef4444' : '#f59e0b' }));
    topics.forEach((t) => nodes.push({ id: `topic_${t.topic}`, label: t.topic, type: 'topic', value: t.count }));
    regions.forEach((r) => nodes.push({ id: `region_${r.region}`, label: r.region, type: 'region', value: r.count }));

    // Campaign → segment links
    campaigns.forEach((c) => {
      if (c.segment) links.push({ source: `camp_${c.id}`, target: `seg_${c.segment}`, value: c.interview_count || 1 });
    });

    // Topic → sentiment links
    topicSentiment.forEach((ts) => {
      if (nodes.find((n) => n.id === `topic_${ts.topic}`) && nodes.find((n) => n.id === `sent_${ts.sentiment}`)) {
        links.push({ source: `topic_${ts.topic}`, target: `sent_${ts.sentiment}`, value: ts.count });
      }
    });

    // Segment → topic links
    segmentTopic.forEach((st) => {
      if (nodes.find((n) => n.id === `seg_${st.segment}`) && nodes.find((n) => n.id === `topic_${st.topic}`)) {
        links.push({ source: `seg_${st.segment}`, target: `topic_${st.topic}`, value: st.count });
      }
    });

    // Sentiment → NPS class links
    const sentNps = await this.many<{ sentiment: string; nps_class: string; count: number }>(
      `SELECT e.sentiment, e.nps_class, COUNT(*)::int AS count FROM core.enrichment e WHERE e.tenant_id = $1 ${campaignId ? `AND e.campaign_id = '${campaignId}'` : ''} AND e.sentiment IS NOT NULL AND e.nps_class IS NOT NULL GROUP BY e.sentiment, e.nps_class`,
      [tenantId],
    );
    sentNps.forEach((sn) => {
      if (nodes.find((n) => n.id === `sent_${sn.sentiment}`) && nodes.find((n) => n.id === `nps_${sn.nps_class}`)) {
        links.push({ source: `sent_${sn.sentiment}`, target: `nps_${sn.nps_class}`, value: sn.count });
      }
    });

    return { nodes, links };
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

