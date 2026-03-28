import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AudioBatchService } from './audio-batch.service';
import { AudioBatchRepository } from './audio-batch.repository';

const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds

@Injectable()
export class AudioBatchScheduler implements OnModuleInit {
  private readonly logger = new Logger(AudioBatchScheduler.name);

  constructor(
    private readonly batchService: AudioBatchService,
    private readonly repo: AudioBatchRepository,
  ) {}

  onModuleInit() {
    this.logger.log('Audio batch scheduler started (poll every 60s)');
    setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private async poll() {
    try {
      const configs = await this.repo.getActiveConfigs();
      for (const config of configs) {
        // Check if it's time to run based on last_run_at
        if (config.last_run_at) {
          const lastRun = new Date(config.last_run_at).getTime();
          const intervalMs = this.cronToMs(config.schedule_cron);
          if (Date.now() - lastRun < intervalMs) continue;
        }

        const processed = await this.batchService.processBatch(config.id, 3);
        if (processed > 0) {
          this.logger.log(`BATCH_POLL config=${config.id} processed=${processed}`);
        }
      }
    } catch (error) {
      this.logger.error(`BATCH_POLL_ERROR ${error instanceof Error ? error.message : error}`);
    }
  }

  private cronToMs(cron: string): number {
    // Simple cron parser: extract minutes
    const parts = cron.split(' ');
    const minPart = parts[0] || '*/30';
    if (minPart.startsWith('*/')) {
      return parseInt(minPart.substring(2), 10) * 60_000;
    }
    return 30 * 60_000; // default 30 min
  }
}
