import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Permissions } from '../access/permissions.decorator';
import { CurrentUser } from '../access/current-user.decorator';
import { AuthUserClaims } from '../../common/types';
import { ContactAttemptService } from './contact-attempt.service';
import { CreateContactAttemptDto } from './dto/create-contact-attempt.dto';

@Controller()
export class ContactAttemptController {
  constructor(private readonly contactAttemptService: ContactAttemptService) {}

  // Action-scoped routes (new)
  @Get('actions/:actionId/respondents')
  @Permissions('campaign.read')
  listRespondentsByAction(
    @CurrentUser() user: AuthUserClaims,
    @Param('actionId') actionId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.contactAttemptService.listRespondentsByAction(user, actionId, {
      search,
      status,
      page: page ? Number(page) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('actions/:actionId/respondents/:respondentId/contact-attempts')
  @Permissions('campaign.read')
  createContactAttemptByAction(
    @CurrentUser() user: AuthUserClaims,
    @Param('actionId') actionId: string,
    @Param('respondentId') respondentId: string,
    @Body() body: CreateContactAttemptDto,
  ) {
    return this.contactAttemptService.createContactAttemptByAction(user, actionId, respondentId, body);
  }

  // Legacy campaign-scoped routes (kept for backward compat)
  @Get('campaigns/:campaignId/respondents')
  @Permissions('campaign.read')
  listRespondents(
    @CurrentUser() user: AuthUserClaims,
    @Param('campaignId') campaignId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    return this.contactAttemptService.listRespondents(user, campaignId, {
      search,
      status,
      page: page ? Number(page) : undefined,
      page_size: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('campaigns/:campaignId/respondents/:respondentId/contact-attempts')
  @Permissions('campaign.read')
  createContactAttempt(
    @CurrentUser() user: AuthUserClaims,
    @Param('campaignId') campaignId: string,
    @Param('respondentId') respondentId: string,
    @Body() body: CreateContactAttemptDto,
  ) {
    return this.contactAttemptService.createContactAttempt(user, campaignId, respondentId, body);
  }

  @Get('contact-attempts/my-scheduled')
  @Permissions('campaign.read')
  getMyScheduledCallbacks(
    @CurrentUser() user: AuthUserClaims,
    @Query('date') date?: string,
  ) {
    return this.contactAttemptService.getMyScheduledCallbacks(user, date);
  }
}
