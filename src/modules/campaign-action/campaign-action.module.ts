import { Module } from '@nestjs/common';
import { CampaignActionController } from './campaign-action.controller';
import { CampaignActionService } from './campaign-action.service';
import { CampaignActionRepository } from './campaign-action.repository';

@Module({
  controllers: [CampaignActionController],
  providers: [CampaignActionService, CampaignActionRepository],
  exports: [CampaignActionService, CampaignActionRepository],
})
export class CampaignActionModule {}
