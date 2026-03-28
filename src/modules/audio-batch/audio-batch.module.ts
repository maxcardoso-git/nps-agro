import { Module } from '@nestjs/common';
import { AudioModule } from '../audio/audio.module';
import { AudioBatchController } from './audio-batch.controller';
import { AudioBatchRepository } from './audio-batch.repository';
import { AudioBatchScheduler } from './audio-batch.scheduler';
import { AudioBatchService } from './audio-batch.service';

@Module({
  imports: [AudioModule],
  controllers: [AudioBatchController],
  providers: [AudioBatchService, AudioBatchRepository, AudioBatchScheduler],
  exports: [AudioBatchService],
})
export class AudioBatchModule {}
