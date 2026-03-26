import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';

const POLL_INTERVAL_MS = 15_000; // 15 seconds

@Injectable()
export class EnrichmentScheduler implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly enrichmentService: EnrichmentService) {}

  onModuleInit() {
    this.logger.log('Enrichment scheduler started (poll every 15s)');
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private async poll() {
    try {
      const processed = await this.enrichmentService.processBatch(5);
      if (processed > 0) {
        this.logger.log(`ENRICHMENT_POLL processed=${processed}`);
      }
    } catch (error) {
      this.logger.error(`ENRICHMENT_POLL_ERROR ${error instanceof Error ? error.message : error}`);
    }
  }
}
