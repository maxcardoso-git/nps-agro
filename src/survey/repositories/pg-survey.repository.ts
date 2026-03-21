import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import {
  CampaignContext,
  CreateInterviewParams,
  CreateProcessingJobParams,
  InterviewRecord,
  PersistAnswerParams,
  QuestionnaireSchema,
  StoredAnswerRecord,
} from '../survey.types';
import { PG_POOL } from './repository.tokens';
import { SurveyRepository } from './survey.repository';

@Injectable()
export class PgSurveyRepository implements SurveyRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getCampaignContext(tenantId: string, campaignId: string): Promise<CampaignContext | null> {
    const result = await this.pool.query(
      `
      SELECT id, tenant_id, questionnaire_version_id
      FROM core.campaign
      WHERE id = $1
        AND tenant_id = $2
      LIMIT 1
      `,
      [campaignId, tenantId],
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return result.rows[0] as CampaignContext;
  }

  async respondentExists(tenantId: string, campaignId: string, respondentId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
      SELECT 1
      FROM core.respondent
      WHERE id = $1
        AND campaign_id = $2
        AND tenant_id = $3
      LIMIT 1
      `,
      [respondentId, campaignId, tenantId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getQuestionnaireSchema(questionnaireVersionId: string): Promise<QuestionnaireSchema | null> {
    const result = await this.pool.query(
      `
      SELECT schema_json
      FROM core.questionnaire_version
      WHERE id = $1
      LIMIT 1
      `,
      [questionnaireVersionId],
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return result.rows[0].schema_json as QuestionnaireSchema;
  }

  async createInterview(params: CreateInterviewParams): Promise<InterviewRecord> {
    const result = await this.pool.query(
      `
      INSERT INTO core.interview (
        tenant_id,
        campaign_id,
        questionnaire_version_id,
        respondent_id,
        channel,
        status,
        interviewer_user_id,
        started_at
      )
      VALUES ($1, $2, $3, $4, $5, 'in_progress', $6, NOW())
      RETURNING
        id,
        tenant_id,
        campaign_id,
        questionnaire_version_id,
        respondent_id,
        channel,
        status,
        interviewer_user_id,
        started_at,
        completed_at
      `,
      [
        params.tenant_id,
        params.campaign_id,
        params.questionnaire_version_id,
        params.respondent_id,
        params.channel,
        params.interviewer_user_id ?? null,
      ],
    );

    return result.rows[0] as InterviewRecord;
  }

  async getInterview(interviewId: string): Promise<InterviewRecord | null> {
    const result = await this.pool.query(
      `
      SELECT
        id,
        tenant_id,
        campaign_id,
        questionnaire_version_id,
        respondent_id,
        channel,
        status,
        interviewer_user_id,
        started_at,
        completed_at
      FROM core.interview
      WHERE id = $1
      LIMIT 1
      `,
      [interviewId],
    );

    if ((result.rowCount ?? 0) === 0) {
      return null;
    }

    return result.rows[0] as InterviewRecord;
  }

  async getAnswers(interviewId: string): Promise<StoredAnswerRecord[]> {
    const result = await this.pool.query(
      `
      SELECT
        question_id,
        answer_type,
        value_numeric,
        value_text,
        value_boolean,
        value_json,
        created_at
      FROM core.answer
      WHERE interview_id = $1
      ORDER BY created_at ASC
      `,
      [interviewId],
    );

    return result.rows as StoredAnswerRecord[];
  }

  async insertAnswer(params: PersistAnswerParams): Promise<boolean> {
    const result = await this.pool.query(
      `
      INSERT INTO core.answer (
        tenant_id,
        campaign_id,
        interview_id,
        questionnaire_version_id,
        question_id,
        answer_type,
        value_numeric,
        value_text,
        value_boolean,
        value_json,
        raw_json
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11
      )
      ON CONFLICT (interview_id, question_id) DO NOTHING
      RETURNING id
      `,
      [
        params.tenant_id,
        params.campaign_id,
        params.interview_id,
        params.questionnaire_version_id,
        params.question_id,
        params.answer_type,
        params.value_numeric,
        params.value_text,
        params.value_boolean,
        params.value_json ? JSON.stringify(params.value_json) : null,
        JSON.stringify(params.raw_json),
      ],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async updateInterviewStatus(interviewId: string, status: string, completedAt: Date | null): Promise<void> {
    await this.pool.query(
      `
      UPDATE core.interview
      SET
        status = $2,
        completed_at = $3,
        updated_at = NOW()
      WHERE id = $1
      `,
      [interviewId, status, completedAt],
    );
  }

  async createProcessingJob(params: CreateProcessingJobParams): Promise<boolean> {
    const result = await this.pool.query(
      `
      INSERT INTO core.processing_job (
        tenant_id,
        campaign_id,
        interview_id,
        job_type,
        status,
        payload_json
      )
      SELECT
        $1, $2, $3, $4, 'queued', $5
      WHERE NOT EXISTS (
        SELECT 1
        FROM core.processing_job
        WHERE interview_id = $3
          AND job_type = $4
      )
      RETURNING id
      `,
      [
        params.tenant_id,
        params.campaign_id,
        params.interview_id,
        params.job_type,
        JSON.stringify(params.payload_json),
      ],
    );

    return (result.rowCount ?? 0) > 0;
  }
}

