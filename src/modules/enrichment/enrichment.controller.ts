import { Controller, Get, Post, Query } from '@nestjs/common';
import { Permissions } from '../access/permissions.decorator';
import { EnrichmentService } from './enrichment.service';

@Controller('enrichment')
export class EnrichmentController {
  constructor(private readonly service: EnrichmentService) {}

  @Post('process')
  @Permissions('llm_resource.update')
  async processNext(@Query('batch_size') batchSize?: string) {
    const size = batchSize ? Math.min(Number(batchSize), 50) : 10;
    const processed = await this.service.processBatch(size);
    return { processed };
  }

  @Get('pending')
  @Permissions('llm_resource.read')
  async getPending() {
    const count = await this.service.getPendingCount();
    return { pending: count };
  }
}
