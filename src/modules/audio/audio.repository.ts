import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface AudioAssetRow {
  id: string;
  tenant_id: string;
  campaign_id: string;
  interview_id: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  duration_seconds: number | null;
  transcription_text: string | null;
  transcription_confidence: number | null;
  processed: boolean;
  created_at: Date;
}

@Injectable()
export class AudioRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  createAudioAsset(params: {
    tenant_id: string;
    campaign_id: string;
    interview_id: string;
    file_name: string;
    file_url: string;
    mime_type: string;
    duration_seconds?: number;
  }): Promise<AudioAssetRow | null> {
    return this.one<AudioAssetRow>(
      `
      INSERT INTO core.audio_asset (tenant_id, campaign_id, interview_id, file_name, file_url, mime_type, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        params.tenant_id,
        params.campaign_id,
        params.interview_id,
        params.file_name,
        params.file_url,
        params.mime_type,
        params.duration_seconds || null,
      ],
    );
  }

  getByInterviewId(interviewId: string): Promise<AudioAssetRow | null> {
    return this.one<AudioAssetRow>(
      `SELECT * FROM core.audio_asset WHERE interview_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [interviewId],
    );
  }

  updateTranscription(audioId: string, transcription: string, confidence: number): Promise<void> {
    return this.execute(
      `UPDATE core.audio_asset SET transcription_text = $2, transcription_confidence = $3, processed = true, updated_at = NOW() WHERE id = $1`,
      [audioId, transcription, confidence],
    ).then(() => undefined);
  }

  updateAdherence(interviewId: string, score: number, details: unknown): Promise<void> {
    return this.execute(
      `UPDATE core.audio_asset SET adherence_score = $2, adherence_details = $3, updated_at = NOW() WHERE interview_id = $1`,
      [interviewId, score, JSON.stringify(details)],
    ).then(() => undefined);
  }

  getUnprocessed(limit = 10): Promise<AudioAssetRow[]> {
    return this.many<AudioAssetRow>(
      `SELECT * FROM core.audio_asset WHERE processed = false ORDER BY created_at LIMIT $1`,
      [limit],
    );
  }

  getInterviewContext(interviewId: string) {
    return this.one<{
      tenant_id: string;
      campaign_id: string;
      questionnaire_version_id: string;
      respondent_id: string;
      channel: string;
      status: string;
    }>(
      `SELECT tenant_id, campaign_id, questionnaire_version_id, respondent_id, channel, status
       FROM core.interview WHERE id = $1`,
      [interviewId],
    );
  }

  getQuestionnaireSchema(versionId: string) {
    return this.one<{ schema_json: Record<string, unknown> }>(
      `SELECT schema_json FROM core.questionnaire_version WHERE id = $1`,
      [versionId],
    );
  }

  getResource(tenantId: string, type: string, subtype?: string) {
    const where = ['tenant_id = $1', 'type = $2', 'is_active = true'];
    const params: unknown[] = [tenantId, type];
    if (subtype) {
      params.push(subtype);
      where.push(`subtype = $${params.length}`);
    }
    return this.one<{
      id: string;
      endpoint_url: string | null;
      auth_mode: string;
      auth_config: Record<string, unknown>;
      connection_json: Record<string, unknown>;
      config_json: Record<string, unknown>;
      metadata_json: Record<string, unknown>;
    }>(
      `SELECT id, endpoint_url, auth_mode, auth_config, connection_json, config_json, metadata_json
       FROM core.resource WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 1`,
      params,
    );
  }

  getLlmResource(tenantId: string, purpose: string) {
    return this.one<{
      provider: string;
      model_id: string;
      api_key: string | null;
      base_url: string | null;
      config_json: Record<string, unknown>;
    }>(
      `SELECT provider, model_id, api_key, base_url, config_json
       FROM ai.llm_resource WHERE tenant_id = $1 AND purpose = $2 AND is_active = true
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, purpose],
    );
  }

  createProcessingJob(params: {
    tenant_id: string;
    campaign_id: string;
    interview_id: string;
    job_type: string;
    payload_json: Record<string, unknown>;
  }) {
    return this.execute(
      `INSERT INTO core.processing_job (tenant_id, campaign_id, interview_id, job_type, status, payload_json)
       SELECT $1, $2, $3, $4, 'queued', $5
       WHERE NOT EXISTS (SELECT 1 FROM core.processing_job WHERE interview_id = $3 AND job_type = $4 AND status IN ('queued','processing'))`,
      [params.tenant_id, params.campaign_id, params.interview_id, params.job_type, JSON.stringify(params.payload_json)],
    );
  }

  claimJob(jobType: string) {
    return this.one<{
      id: string;
      tenant_id: string;
      campaign_id: string;
      interview_id: string;
      payload_json: Record<string, unknown>;
    }>(
      `UPDATE core.processing_job SET status = 'processing', started_at = NOW()
       WHERE id = (SELECT id FROM core.processing_job WHERE job_type = $1 AND status = 'queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
       RETURNING id, tenant_id, campaign_id, interview_id, payload_json`,
      [jobType],
    );
  }

  completeJob(jobId: string, result: Record<string, unknown>) {
    return this.execute(
      `UPDATE core.processing_job SET status = 'completed', result_json = $2, finished_at = NOW() WHERE id = $1`,
      [jobId, JSON.stringify(result)],
    ).then(() => undefined);
  }

  failJob(jobId: string, error: string) {
    return this.execute(
      `UPDATE core.processing_job SET status = 'failed', error_message = $2, finished_at = NOW() WHERE id = $1`,
      [jobId, error],
    ).then(() => undefined);
  }

  insertAnswer(params: {
    tenant_id: string;
    campaign_id: string;
    interview_id: string;
    questionnaire_version_id: string;
    question_id: string;
    answer_type: string;
    value_numeric: number | null;
    value_text: string | null;
    value_boolean: boolean | null;
    value_json: unknown;
    confidence_score: number;
  }) {
    return this.execute(
      `INSERT INTO core.answer (tenant_id, campaign_id, interview_id, questionnaire_version_id,
         question_id, answer_type, value_numeric, value_text, value_boolean, value_json, confidence_score, raw_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (interview_id, question_id) DO UPDATE SET
         value_numeric = EXCLUDED.value_numeric, value_text = EXCLUDED.value_text,
         value_boolean = EXCLUDED.value_boolean, value_json = EXCLUDED.value_json,
         confidence_score = EXCLUDED.confidence_score`,
      [
        params.tenant_id, params.campaign_id, params.interview_id, params.questionnaire_version_id,
        params.question_id, params.answer_type,
        params.value_numeric, params.value_text, params.value_boolean,
        params.value_json ? JSON.stringify(params.value_json) : null,
        params.confidence_score,
        JSON.stringify({ source: 'audio_extraction', confidence: params.confidence_score }),
      ],
    ).then(() => undefined);
  }

  updateInterviewStatus(interviewId: string, status: string) {
    return this.execute(
      `UPDATE core.interview SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END, updated_at = NOW() WHERE id = $1`,
      [interviewId, status],
    ).then(() => undefined);
  }
}
