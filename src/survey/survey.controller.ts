import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { StartInterviewInput, SubmitAnswerInput, TenantScopedInput } from './survey.types';

@Controller('interviews')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

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

  @Get('active')
  async findActiveInterview(
    @Query('tenant_id') tenantId: string,
    @Query('campaign_id') campaignId: string,
    @Query('respondent_id') respondentId: string,
  ) {
    return this.surveyService.findActiveInterview(tenantId, campaignId, respondentId);
  }
}

