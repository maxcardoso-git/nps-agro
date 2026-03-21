import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUserClaims } from '../../common/types';
import { CurrentUser } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Permissions('campaign.create')
  createCampaign(@CurrentUser() user: AuthUserClaims, @Body() body: CreateCampaignDto) {
    return this.campaignService.createCampaign(user, body);
  }

  @Get()
  @Permissions('campaign.read')
  listCampaigns(
    @CurrentUser() user: AuthUserClaims,
    @Query('tenant_id') tenantId?: string,
    @Query('status') status?: string,
    @Query('segment') segment?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.campaignService.listCampaigns(user, {
      tenant_id: tenantId,
      status,
      segment,
      search,
      page: page ? Number(page) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @Permissions('campaign.read')
  getCampaignById(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.campaignService.getCampaignById(user, id);
  }

  @Patch(':id')
  @Permissions('campaign.update')
  updateCampaign(
    @CurrentUser() user: AuthUserClaims,
    @Param('id') id: string,
    @Body() body: UpdateCampaignDto,
  ) {
    return this.campaignService.updateCampaign(user, id, body);
  }

  @Post(':id/activate')
  @Permissions('campaign.update')
  activateCampaign(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.campaignService.activateCampaign(user, id);
  }

  @Post(':id/pause')
  @Permissions('campaign.update')
  pauseCampaign(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.campaignService.pauseCampaign(user, id);
  }

  @Post(':id/complete')
  @Permissions('campaign.update')
  completeCampaign(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.campaignService.completeCampaign(user, id);
  }
}

