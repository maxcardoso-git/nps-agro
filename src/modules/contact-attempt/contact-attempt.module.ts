import { Module } from '@nestjs/common';
import { ContactAttemptController } from './contact-attempt.controller';
import { ContactAttemptService } from './contact-attempt.service';
import { ContactAttemptRepository } from './contact-attempt.repository';

@Module({
  controllers: [ContactAttemptController],
  providers: [ContactAttemptService, ContactAttemptRepository],
  exports: [ContactAttemptService],
})
export class ContactAttemptModule {}
