import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AudioService } from './audio.service';

const POLL_INTERVAL_MS = 10_000; // 10 seconds

@Injectable()
export class AudioScheduler implements OnModuleInit {
  private readonly logger = new Logger(AudioScheduler.name);

  constructor(private readonly audioService: AudioService) {}

  onModuleInit() {
    this.logger.log('Audio processing scheduler started (poll every 10s)');
    setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private async poll() {
    try {
      let processed = 0;

      // Process transcription jobs
      for (let i = 0; i < 3; i++) {
        const had = await this.audioService.processTranscriptionJob();
        if (!had) break;
        processed++;
      }

      // Process answer extraction jobs
      for (let i = 0; i < 3; i++) {
        const had = await this.audioService.processExtractionJob();
        if (!had) break;
        processed++;
      }

      if (processed > 0) {
        this.logger.log(`AUDIO_POLL processed=${processed}`);
      }
    } catch (error) {
      this.logger.error(`AUDIO_POLL_ERROR ${error instanceof Error ? error.message : error}`);
    }
  }
}
