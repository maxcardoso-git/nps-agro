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

  @Get('active')
  async findActiveInterview(
    @Query('tenant_id') tenantId: string,
    @Query('campaign_id') campaignId: string,
    @Query('respondent_id') respondentId: string,
  ) {
    return this.surveyService.findActiveInterview(tenantId, campaignId, respondentId);
  }
}

