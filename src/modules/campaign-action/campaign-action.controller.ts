import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { Permissions } from '../access/permissions.decorator';
import { CurrentUser } from '../access/current-user.decorator';
import { AuthUserClaims } from '../../common/types';
import { CampaignActionService } from './campaign-action.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@Controller('campaigns/:campaignId/actions')
export class CampaignActionController {
  constructor(private readonly actionService: CampaignActionService) {}

  @Post()
  @Permissions('campaign.update')
  createAction(
    @CurrentUser() user: AuthUserClaims,
    @Param('campaignId') campaignId: string,
    @Body() body: CreateActionDto,
  ) {
    return this.actionService.createAction(user, campaignId, body);
  }

  @Get()
  @Permissions('campaign.read')
  listActions(@CurrentUser() user: AuthUserClaims, @Param('campaignId') campaignId: string) {
    return this.actionService.listActions(user, campaignId);
  }

  @Get(':actionId')
  @Permissions('campaign.read')
  getAction(@CurrentUser() user: AuthUserClaims, @Param('actionId') actionId: string) {
    return this.actionService.getAction(user, actionId);
  }

  @Patch(':actionId')
  @Permissions('campaign.update')
  updateAction(
    @CurrentUser() user: AuthUserClaims,
    @Param('actionId') actionId: string,
    @Body() body: UpdateActionDto,
  ) {
    return this.actionService.updateAction(user, actionId, body);
  }

  @Post(':actionId/activate')
  @Permissions('campaign.update')
  activateAction(@CurrentUser() user: AuthUserClaims, @Param('actionId') actionId: string) {
    return this.actionService.activateAction(user, actionId);
  }

  @Post(':actionId/pause')
  @Permissions('campaign.update')
  pauseAction(@CurrentUser() user: AuthUserClaims, @Param('actionId') actionId: string) {
    return this.actionService.pauseAction(user, actionId);
  }

  @Put(':actionId/interviewers')
  @Permissions('campaign.update')
  setInterviewers(
    @CurrentUser() user: AuthUserClaims,
    @Param('actionId') actionId: string,
    @Body() body: { user_ids: string[] },
  ) {
    return this.actionService.setInterviewers(user, actionId, body.user_ids);
  }

  @Get(':actionId/interviewers')
  @Permissions('campaign.read')
  getInterviewers(@CurrentUser() user: AuthUserClaims, @Param('actionId') actionId: string) {
    return this.actionService.getInterviewers(user, actionId);
  }

  @Post(':actionId/import-contacts')
  @Permissions('campaign.update')
  importContacts(
    @CurrentUser() user: AuthUserClaims,
    @Param('campaignId') campaignId: string,
    @Param('actionId') actionId: string,
    @Body() body: { contacts: Array<{ nome: string; celular?: string; conta?: string; cargo?: string; tipo_persona?: string; codigo?: string }> },
  ) {
    return this.actionService.importContacts(user, campaignId, actionId, body.contacts);
  }
}
