import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface QualityReviewRow {
  id: string;
  tenant_id: string;
  interview_id: string;
  review_status: string;
  reviewer_id: string | null;
  score: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewListItem extends QualityReviewRow {
  respondent_name: string;
  campaign_name: string;
  nps_score: number | null;
  sentiment: string | null;
  summary_text: string | null;
  transcription_text: string | null;
  completed_at: Date | null;
}

@Injectable()
export class QualityReviewRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  listPending(tenantId: string, limit = 20): Promise<ReviewListItem[]> {
    return this.many<ReviewListItem>(
      `
      SELECT
        qr.id, qr.tenant_id, qr.interview_id, qr.review_status,
        qr.reviewer_id, qr.score, qr.notes, qr.created_at, qr.updated_at,
        r.name AS respondent_name,
        c.name AS campaign_name,
        e.nps_score, e.sentiment, e.summary_text,
        a.transcription_text,
        i.completed_at
      FROM core.quality_review qr
      JOIN core.interview i ON i.id = qr.interview_id
      JOIN core.respondent rd ON rd.id = i.respondent_id
      JOIN core.campaign c ON c.id = i.campaign_id
      LEFT JOIN core.enrichment e ON e.interview_id = qr.interview_id
      LEFT JOIN core.audio_asset a ON a.interview_id = qr.interview_id
      LEFT JOIN core.respondent r ON r.id = i.respondent_id
      WHERE qr.tenant_id = $1 AND qr.review_status = 'pending'
      ORDER BY qr.created_at
      LIMIT $2
      `,
      [tenantId, limit],
    );
  }

  listAll(tenantId: string, status?: string, limit = 50): Promise<ReviewListItem[]> {
    const where = ['qr.tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (status) {
      params.push(status);
      where.push(`qr.review_status = $${params.length}`);
    }

    params.push(limit);

    return this.many<ReviewListItem>(
      `
      SELECT
        qr.id, qr.tenant_id, qr.interview_id, qr.review_status,
        qr.reviewer_id, qr.score, qr.notes, qr.created_at, qr.updated_at,
        r.name AS respondent_name,
        c.name AS campaign_name,
        e.nps_score, e.sentiment, e.summary_text,
        a.transcription_text,
        i.completed_at
      FROM core.quality_review qr
      JOIN core.interview i ON i.id = qr.interview_id
      JOIN core.respondent r ON r.id = i.respondent_id
      JOIN core.campaign c ON c.id = i.campaign_id
      LEFT JOIN core.enrichment e ON e.interview_id = qr.interview_id
      LEFT JOIN core.audio_asset a ON a.interview_id = qr.interview_id
      WHERE ${where.join(' AND ')}
      ORDER BY qr.created_at DESC
      LIMIT $${params.length}
      `,
      params,
    );
  }

  getById(id: string, tenantId: string): Promise<ReviewListItem | null> {
    return this.one<ReviewListItem>(
      `
      SELECT
        qr.id, qr.tenant_id, qr.interview_id, qr.review_status,
        qr.reviewer_id, qr.score, qr.notes, qr.created_at, qr.updated_at,
        r.name AS respondent_name,
        c.name AS campaign_name,
        e.nps_score, e.sentiment, e.summary_text,
        a.transcription_text,
        i.completed_at
      FROM core.quality_review qr
      JOIN core.interview i ON i.id = qr.interview_id
      JOIN core.respondent r ON r.id = i.respondent_id
      JOIN core.campaign c ON c.id = i.campaign_id
      LEFT JOIN core.enrichment e ON e.interview_id = qr.interview_id
      LEFT JOIN core.audio_asset a ON a.interview_id = qr.interview_id
      WHERE qr.id = $1 AND qr.tenant_id = $2
      `,
      [id, tenantId],
    );
  }

  approve(id: string, tenantId: string, reviewerId: string, score: number | null, notes: string | null): Promise<QualityReviewRow | null> {
    return this.one<QualityReviewRow>(
      `UPDATE core.quality_review SET review_status = 'approved', reviewer_id = $3, score = $4, notes = $5, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, reviewerId, score, notes],
    );
  }

  reject(id: string, tenantId: string, reviewerId: string, score: number | null, notes: string | null): Promise<QualityReviewRow | null> {
    return this.one<QualityReviewRow>(
      `UPDATE core.quality_review SET review_status = 'rejected', reviewer_id = $3, score = $4, notes = $5, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantId, reviewerId, score, notes],
    );
  }

  createReview(tenantId: string, interviewId: string): Promise<QualityReviewRow | null> {
    return this.one<QualityReviewRow>(
      `INSERT INTO core.quality_review (tenant_id, interview_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [tenantId, interviewId],
    );
  }

  updateInterviewStatus(interviewId: string, status: string) {
    return this.execute(
      `UPDATE core.interview SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN COALESCE(completed_at, NOW()) ELSE completed_at END, updated_at = NOW() WHERE id = $1`,
      [interviewId, status],
    ).then(() => undefined);
  }

  createEnrichmentJob(tenantId: string, campaignId: string, interviewId: string) {
    return this.execute(
      `INSERT INTO core.processing_job (tenant_id, campaign_id, interview_id, job_type, status, payload_json)
       SELECT $1, $2, $3, 'ai_enrichment', 'queued', '{"trigger":"quality_approved"}'
       WHERE NOT EXISTS (SELECT 1 FROM core.processing_job WHERE interview_id = $3 AND job_type = 'ai_enrichment' AND status IN ('queued','processing'))`,
      [tenantId, campaignId, interviewId],
    ).then(() => undefined);
  }

  getInterviewCampaignId(interviewId: string): Promise<string | null> {
    return this.one<{ campaign_id: string }>(
      `SELECT campaign_id FROM core.interview WHERE id = $1`,
      [interviewId],
    ).then((r) => r?.campaign_id ?? null);
  }

  getStats(tenantId: string) {
    return this.one<{ pending: number; approved: number; rejected: number; avg_score: number | null }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE review_status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE review_status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE review_status = 'rejected') AS rejected,
        ROUND(AVG(score) FILTER (WHERE score IS NOT NULL), 1) AS avg_score
      FROM core.quality_review
      WHERE tenant_id = $1
      `,
      [tenantId],
    );
  }
}
