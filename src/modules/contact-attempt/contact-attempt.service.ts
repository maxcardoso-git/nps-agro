import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { ContactAttemptRepository } from './contact-attempt.repository';
import { CreateContactAttemptDto } from './dto/create-contact-attempt.dto';

@Injectable()
export class ContactAttemptService {
  constructor(private readonly contactAttemptRepository: ContactAttemptRepository) {}

  async listRespondents(
    actor: AuthUserClaims,
    campaignId: string,
    filters: { search?: string; status?: string; page?: number; page_size?: number },
  ) {
    return this.contactAttemptRepository.listRespondentsWithStatus(
      actor.tenant_id,
      campaignId,
      filters,
    );
  }

  async createContactAttempt(
    actor: AuthUserClaims,
    campaignId: string,
    respondentId: string,
    dto: CreateContactAttemptDto,
  ) {
    if (dto.outcome === 'scheduled' && !dto.scheduled_at) {
      throw new DomainException(
        'INVALID_INPUT',
        'scheduled_at is required when outcome is scheduled',
        HttpStatus.BAD_REQUEST,
      );
    }

    const attempt = await this.contactAttemptRepository.create({
      tenant_id: actor.tenant_id,
      campaign_id: campaignId,
      respondent_id: respondentId,
      interviewer_user_id: actor.sub,
      outcome: dto.outcome,
      notes: dto.notes,
      scheduled_at: dto.scheduled_at,
    });

    if (!attempt) {
      throw new DomainException(
        'CONTACT_ATTEMPT_NOT_CREATED',
        'Could not create contact attempt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return attempt;
  }

  async getMyScheduledCallbacks(actor: AuthUserClaims, date?: string) {
    return this.contactAttemptRepository.getScheduledCallbacks(
      actor.tenant_id,
      actor.sub,
      date,
    );
  }
}
