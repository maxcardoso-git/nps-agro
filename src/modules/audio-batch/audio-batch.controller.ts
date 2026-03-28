import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, EffectiveTenantId } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { AudioBatchService } from './audio-batch.service';

@Controller('audio-batch')
export class AudioBatchController {
  constructor(private readonly service: AudioBatchService) {}

  @Post('configs')
  @Permissions('campaign.update')
  createConfig(@EffectiveTenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.createConfig(tenantId, body);
  }

  @Get('configs')
  @Permissions('campaign.read')
  listConfigs(@EffectiveTenantId() tenantId: string) {
    return this.service.listConfigs(tenantId);
  }

  @Get('configs/:id')
  @Permissions('campaign.read')
  getConfig(@Param('id') id: string, @EffectiveTenantId() tenantId: string) {
    return this.service.getConfig(id, tenantId);
  }

  @Patch('configs/:id')
  @Permissions('campaign.update')
  updateConfig(@Param('id') id: string, @EffectiveTenantId() tenantId: string, @Body() body: Record<string, unknown>) {
    return this.service.updateConfig(id, tenantId, body);
  }

  @Delete('configs/:id')
  @Permissions('campaign.update')
  deleteConfig(@Param('id') id: string, @EffectiveTenantId() tenantId: string) {
    return this.service.deleteConfig(id, tenantId);
  }

  @Get('configs/:id/status')
  @Permissions('campaign.read')
  getStatus(@Param('id') id: string, @EffectiveTenantId() tenantId: string) {
    return this.service.getConfigStatus(id, tenantId);
  }

  @Get('configs/:id/files')
  @Permissions('campaign.read')
  listFiles(@Param('id') id: string, @Query('status') status?: string) {
    return this.service.listFiles(id, status);
  }

  @Post('configs/:id/scan')
  @Permissions('campaign.update')
  scan(@Param('id') id: string) {
    return this.service.scanFolder(id).then((found) => ({ found }));
  }

  @Post('configs/:id/process')
  @Permissions('campaign.update')
  process(@Param('id') id: string, @Query('batch_size') batchSize?: string) {
    const size = batchSize ? Math.min(Number(batchSize), 20) : 5;
    return this.service.processBatch(id, size).then((processed) => ({ processed }));
  }
}
