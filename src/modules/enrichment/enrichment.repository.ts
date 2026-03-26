import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface ProcessingJobRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  interview_id: string;
  job_type: string;
  status: string;
  payload_json: Record<string, unknown>;
  result_json: Record<string, unknown> | null;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
}

export interface InterviewAnswersRow {
  question_id: string;
  answer_type: string;
  value_numeric: number | null;
  value_text: string | null;
  value_boolean: boolean | null;
  value_json: unknown;
}

export interface EnrichmentRow {
  id: string;
  interview_id: string;
}

@Injectable()
export class EnrichmentRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  claimPendingJob(jobType: string): Promise<ProcessingJobRow | null> {
    return this.one<ProcessingJobRow>(
      `
      UPDATE core.processing_job
      SET status = 'processing', started_at = NOW()
      WHERE id = (
        SELECT id FROM core.processing_job
        WHERE job_type = $1 AND status = 'queued'
        ORDER BY created_at
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
      `,
      [jobType],
    );
  }

  completeJob(jobId: string, result: Record<string, unknown>): Promise<void> {
    return this.execute(
      `UPDATE core.processing_job SET status = 'completed', result_json = $2, finished_at = NOW() WHERE id = $1`,
      [jobId, JSON.stringify(result)],
    ).then(() => undefined);
  }

  failJob(jobId: string, errorMessage: string): Promise<void> {
    return this.execute(
      `UPDATE core.processing_job SET status = 'failed', error_message = $2, finished_at = NOW() WHERE id = $1`,
      [jobId, errorMessage],
    ).then(() => undefined);
  }

  getInterviewAnswers(interviewId: string): Promise<InterviewAnswersRow[]> {
    return this.many<InterviewAnswersRow>(
      `
      SELECT question_id, answer_type, value_numeric, value_text, value_boolean, value_json
      FROM core.answer
      WHERE interview_id = $1
      ORDER BY created_at
      `,
      [interviewId],
    );
  }

  getRespondentInfo(interviewId: string) {
    return this.one<{ respondent_name: string; region: string; segment: string; account_name: string | null }>(
      `
      SELECT r.name AS respondent_name, r.region, r.segment,
             a.name AS account_name
      FROM core.interview i
      JOIN core.respondent r ON r.id = i.respondent_id
      LEFT JOIN core.account a ON a.id = r.account_id
      WHERE i.id = $1
      `,
      [interviewId],
    );
  }

  enrichmentExists(interviewId: string): Promise<boolean> {
    return this.one<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM core.enrichment WHERE interview_id = $1) AS exists`,
      [interviewId],
    ).then((row) => row?.exists ?? false);
  }

  insertEnrichment(params: {
    tenant_id: string;
    campaign_id: string;
    interview_id: string;
    nps_score: number | null;
    nps_class: string | null;
    sentiment: string | null;
    topics_json: string[] | null;
    summary_text: string | null;
    driver_positive_json: string[] | null;
    driver_negative_json: string[] | null;
    keywords_json: string[] | null;
    confidence_score: number | null;
    enrichment_model: string | null;
  }): Promise<EnrichmentRow | null> {
    return this.one<EnrichmentRow>(
      `
      INSERT INTO core.enrichment (
        tenant_id, campaign_id, interview_id,
        nps_score, nps_class, sentiment,
        topics_json, summary_text,
        driver_positive_json, driver_negative_json,
        keywords_json, confidence_score, enrichment_model
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (interview_id) DO UPDATE SET
        nps_score = EXCLUDED.nps_score,
        nps_class = EXCLUDED.nps_class,
        sentiment = EXCLUDED.sentiment,
        topics_json = EXCLUDED.topics_json,
        summary_text = EXCLUDED.summary_text,
        driver_positive_json = EXCLUDED.driver_positive_json,
        driver_negative_json = EXCLUDED.driver_negative_json,
        keywords_json = EXCLUDED.keywords_json,
        confidence_score = EXCLUDED.confidence_score,
        enrichment_model = EXCLUDED.enrichment_model
      RETURNING id, interview_id
      `,
      [
        params.tenant_id,
        params.campaign_id,
        params.interview_id,
        params.nps_score,
        params.nps_class,
        params.sentiment,
        params.topics_json ? JSON.stringify(params.topics_json) : null,
        params.summary_text,
        params.driver_positive_json ? JSON.stringify(params.driver_positive_json) : null,
        params.driver_negative_json ? JSON.stringify(params.driver_negative_json) : null,
        params.keywords_json ? JSON.stringify(params.keywords_json) : null,
        params.confidence_score,
        params.enrichment_model,
      ],
    );
  }

  getLlmResource(tenantId: string, purpose: string) {
    return this.one<{
      id: string;
      provider: string;
      model_id: string;
      api_key: string | null;
      base_url: string | null;
      config_json: Record<string, unknown>;
    }>(
      `
      SELECT id, provider, model_id, api_key, base_url, config_json
      FROM ai.llm_resource
      WHERE tenant_id = $1 AND purpose = $2 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [tenantId, purpose],
    );
  }

  countPendingJobs(jobType: string): Promise<number> {
    return this.one<{ count: string }>(
      `SELECT COUNT(*) AS count FROM core.processing_job WHERE job_type = $1 AND status = 'queued'`,
      [jobType],
    ).then((row) => Number(row?.count ?? 0));
  }
}
