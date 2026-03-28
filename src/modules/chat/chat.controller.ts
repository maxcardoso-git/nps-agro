import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser, EffectiveTenantId } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { AuthUserClaims } from '../../common/types';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Permissions('report.read')
  async chat(
    @EffectiveTenantId() tenantId: string,
    @Body() body: { message: string; history?: Array<{ role: string; content: string }> },
  ) {
    return this.chatService.chat(tenantId, body.message, body.history || []);
  }
}
