import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioRepository } from './audio.repository';
import { AudioScheduler } from './audio.scheduler';
import { AudioService } from './audio.service';

@Module({
  controllers: [AudioController],
  providers: [AudioService, AudioRepository, AudioScheduler],
  exports: [AudioService],
})
export class AudioModule {}
