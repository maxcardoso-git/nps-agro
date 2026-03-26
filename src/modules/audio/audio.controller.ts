import { Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, EffectiveTenantId } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { AudioService } from './audio.service';

@Controller('interviews')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post(':id/audio')
  @Permissions('interview.execute')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  async uploadAudio(
    @Param('id') interviewId: string,
    @CurrentUser() user: AuthUserClaims,
    @EffectiveTenantId() tenantId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    return this.audioService.uploadAudio(interviewId, tenantId, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Get(':id/audio')
  @Permissions('interview.execute')
  async getAudio(
    @Param('id') interviewId: string,
  ) {
    return this.audioService.getAudioByInterview(interviewId);
  }
}
