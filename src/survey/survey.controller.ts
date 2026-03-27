import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './repositories/repository.tokens';
import { SurveyService } from './survey.service';
import { StartInterviewInput, SubmitAnswerInput, TenantScopedInput } from './survey.types';

@Controller('interviews')
export class SurveyController {
  constructor(
    private readonly surveyService: SurveyService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  @Post('start')
  async startInterview(@Body() body: StartInterviewInput) {
    return this.surveyService.startInterview(body);
  }

  @Post(':id/answer')
  async answerQuestion(@Param('id') id: string, @Body() body: SubmitAnswerInput) {
    return this.surveyService.answerQuestion(id, body);
  }

  @Get(':id/next')
  async nextQuestion(@Param('id') id: string, @Query() query: TenantScopedInput) {
    return this.surveyService.nextQuestion(id, query);
  }

  @Post(':id/complete')
  async completeInterview(@Param('id') id: string, @Body() body: TenantScopedInput) {
    return this.surveyService.completeInterview(id, body);
  }

  @Get(':id/context')
  async getInterviewContext(@Param('id') id: string) {
    const result = await this.pool.query(
      `SELECT
        c.name AS campaign_name,
        r.name AS respondent_name,
        r.phone AS respondent_phone,
        acc.name AS account_name,
        ca.name AS action_name
      FROM core.interview i
      JOIN core.campaign c ON c.id = i.campaign_id
      JOIN core.respondent r ON r.id = i.respondent_id
      LEFT JOIN core.account acc ON acc.id = r.account_id
      LEFT JOIN core.campaign_action ca ON ca.id = i.action_id
      WHERE i.id = $1`,
      [id],
    );
    return result.rows[0] || {};
  }

  @Get(':id/review')
  async getInterviewReview(@Param('id') id: string) {
    // Interview + respondent + campaign + action info
    const info = await this.pool.query(
      `SELECT
        i.id AS interview_id, i.status, i.channel, i.started_at, i.completed_at,
        c.name AS campaign_name, ca.name AS action_name,
        r.name AS respondent_name, r.phone, r.external_id, r.job_title,
        acc.name AS account_name,
        qv.schema_json AS questionnaire_schema
      FROM core.interview i
      JOIN core.campaign c ON c.id = i.campaign_id
      JOIN core.respondent r ON r.id = i.respondent_id
      LEFT JOIN core.account acc ON acc.id = r.account_id
      LEFT JOIN core.campaign_action ca ON ca.id = i.action_id
      LEFT JOIN core.questionnaire_version qv ON qv.id = i.questionnaire_version_id
      WHERE i.id = $1`,
      [id],
    );

    if (info.rows.length === 0) return { error: 'Interview not found' };

    // Answers
    const answers = await this.pool.query(
      `SELECT question_id, answer_type, value_numeric, value_text, value_boolean, value_json, confidence_score
       FROM core.answer WHERE interview_id = $1 ORDER BY created_at`,
      [id],
    );

    // Audio + transcription
    const audio = await this.pool.query(
      `SELECT file_name, transcription_text, transcription_confidence, processed, duration_seconds
       FROM core.audio_asset WHERE interview_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id],
    );

    // Enrichment
    const enrichment = await this.pool.query(
      `SELECT nps_score, nps_class, sentiment, topics_json, summary_text,
              driver_positive_json, driver_negative_json
       FROM core.enrichment WHERE interview_id = $1`,
      [id],
    );

    return {
      ...info.rows[0],
      answers: answers.rows,
      audio: audio.rows[0] || null,
      enrichment: enrichment.rows[0] || null,
    };
  }

  @Get('active')
  async findActiveInterview(
    @Query('tenant_id') tenantId: string,
    @Query('campaign_id') campaignId: string,
    @Query('respondent_id') respondentId: string,
  ) {
    return this.surveyService.findActiveInterview(tenantId, campaignId, respondentId);
  }
}

