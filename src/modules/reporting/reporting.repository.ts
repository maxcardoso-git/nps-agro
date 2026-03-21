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
}

