import { Module } from '@nestjs/common';
import { EnrichmentController } from './enrichment.controller';
import { EnrichmentRepository } from './enrichment.repository';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentScheduler } from './enrichment.scheduler';

@Module({
  controllers: [EnrichmentController],
  providers: [EnrichmentService, EnrichmentRepository, EnrichmentScheduler],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
