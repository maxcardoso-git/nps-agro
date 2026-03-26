import { Module } from '@nestjs/common';
import { LlmResourceController } from './llm-resource.controller';
import { LlmResourceRepository } from './llm-resource.repository';
import { LlmResourceService } from './llm-resource.service';

@Module({
  controllers: [LlmResourceController],
  providers: [LlmResourceService, LlmResourceRepository],
  exports: [LlmResourceService],
})
export class LlmResourceModule {}
