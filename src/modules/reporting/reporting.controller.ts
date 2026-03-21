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

