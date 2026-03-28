import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuthUserClaims } from '../../common/types';
import { CurrentUser } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { ReportingService } from './reporting.service';

@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('campaigns/:campaignId/executive-summary')
  @Permissions('report.read')
  getExecutiveSummary(@CurrentUser() user: AuthUserClaims, @Param('campaignId') campaignId: string) {
    return this.reportingService.getExecutiveSummary(user, campaignId);
  }

  @Get('nps-by-segment')
  @Permissions('report.read')
  getNpsBySegment(@CurrentUser() user: AuthUserClaims, @Query('campaign_id') campaignId?: string) {
    return this.reportingService.getNpsBySegment(user, campaignId);
  }

  @Get('nps-by-region')
  @Permissions('report.read')
  getNpsByRegion(@CurrentUser() user: AuthUserClaims, @Query('campaign_id') campaignId?: string) {
    return this.reportingService.getNpsByRegion(user, campaignId);
  }

  @Get('nps-by-account')
  @Permissions('report.read')
  getNpsByAccount(@CurrentUser() user: AuthUserClaims, @Query('campaign_id') campaignId?: string) {
    return this.reportingService.getNpsByAccount(user, campaignId);
  }

  @Get('execution-stats')
  @Permissions('report.read')
  getExecutionStats(@CurrentUser() user: AuthUserClaims, @Query('campaign_id') campaignId?: string) {
    return this.reportingService.getExecutionStats(user, campaignId);
  }

  @Get('quality-stats')
  @Permissions('report.read')
  getQualityStats(@CurrentUser() user: AuthUserClaims) {
    return this.reportingService.getQualityStats(user);
  }

  @Get('adherence-stats')
  @Permissions('report.read')
  getAdherenceStats(@CurrentUser() user: AuthUserClaims, @Query('campaign_id') campaignId?: string) {
    return this.reportingService.getAdherenceStats(user, campaignId);
  }

  @Get('graph')
  @Permissions('report.read')
  getGraph(@CurrentUser() user: AuthUserClaims, @Query('campaign_id') campaignId?: string) {
    return this.reportingService.getGraph(user, campaignId);
  }

  @Get('campaigns/:campaignId/indicators')
  @Permissions('report.read')
  getCampaignIndicators(@CurrentUser() user: AuthUserClaims, @Param('campaignId') campaignId: string, @Query('action_id') actionId?: string) {
    return this.reportingService.getCampaignIndicators(user, campaignId, actionId);
  }

  @Get('campaigns/:campaignId/interviews')
  @Permissions('report.read')
  listInterviewSummaries(
    @CurrentUser() user: AuthUserClaims,
    @Param('campaignId') campaignId: string,
    @Query('region') region?: string,
    @Query('sentiment') sentiment?: string,
    @Query('nps_class') npsClass?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.reportingService.listCampaignInterviewSummaries(user, campaignId, {
      region,
      sentiment,
      nps_class: npsClass,
      page: page ? Number(page) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
    });
  }
}

