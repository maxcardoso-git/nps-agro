import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, EffectiveTenantId } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { QualityReviewService } from './quality-review.service';

@Controller('quality-reviews')
export class QualityReviewController {
  constructor(private readonly service: QualityReviewService) {}

  @Get()
  @Permissions('report.read')
  list(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Query('status') status?: string,
  ) {
    return status === 'pending'
      ? this.service.listPending(user, tenantId)
      : this.service.listAll(user, tenantId, status);
  }

  @Get('stats')
  @Permissions('report.read')
  stats(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
  ) {
    return this.service.getStats(user, tenantId);
  }

  @Get(':id')
  @Permissions('report.read')
  getById(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.getById(user, tenantId, id);
  }

  @Post(':id/approve')
  @Permissions('report.read')
  approve(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { score?: number; notes?: string },
  ) {
    return this.service.approve(user, tenantId, id, body.score, body.notes);
  }

  @Post(':id/reject')
  @Permissions('report.read')
  reject(
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { score?: number; notes?: string },
  ) {
    return this.service.reject(user, tenantId, id, body.score, body.notes);
  }
}
