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

  async listRespondentsByAction(
    actor: AuthUserClaims,
    actionId: string,
    filters: { search?: string; status?: string; page?: number; page_size?: number },
  ) {
    const [items, total] = await Promise.all([
      this.contactAttemptRepository.listRespondentsByAction(actor.tenant_id, actionId, filters),
      this.contactAttemptRepository.countRespondentsByAction(actor.tenant_id, actionId, { search: filters.search, status: filters.status }),
    ]);
    return { items, total, page: filters.page ?? 1, page_size: filters.page_size ?? 50 };
  }

  async createContactAttempt(
    actor: AuthUserClaims,
    campaignId: string,
    respondentId: string,
    dto: CreateContactAttemptDto,
  ) {
    this.validateScheduled(dto);

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
      throw new DomainException('CONTACT_ATTEMPT_NOT_CREATED', 'Could not create contact attempt', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return attempt;
  }

  async createContactAttemptByAction(
    actor: AuthUserClaims,
    actionId: string,
    respondentId: string,
    dto: CreateContactAttemptDto,
  ) {
    this.validateScheduled(dto);

    // Get campaign_id from action
    const campaignId = await this.contactAttemptRepository.getCampaignIdForAction(actionId, actor.tenant_id);
    if (!campaignId) {
      throw new DomainException('ACTION_NOT_FOUND', 'Action not found', HttpStatus.NOT_FOUND);
    }

    const attempt = await this.contactAttemptRepository.createByAction({
      tenant_id: actor.tenant_id,
      action_id: actionId,
      campaign_id: campaignId,
      respondent_id: respondentId,
      interviewer_user_id: actor.sub,
      outcome: dto.outcome,
      notes: dto.notes,
      scheduled_at: dto.scheduled_at,
    });

    if (!attempt) {
      throw new DomainException('CONTACT_ATTEMPT_NOT_CREATED', 'Could not create contact attempt', HttpStatus.INTERNAL_SERVER_ERROR);
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

  async reserveNextContact(actor: AuthUserClaims, actionId: string) {
    const contact = await this.contactAttemptRepository.reserveNextContact(
      actor.tenant_id, actionId, actor.sub,
    );
    return contact ? { contact } : { contact: null };
  }

  async releaseReservation(actor: AuthUserClaims, respondentId: string) {
    await this.contactAttemptRepository.releaseReservation(respondentId, actor.sub);
    return { released: true };
  }

  async getCampaignContactStats(actor: AuthUserClaims, campaignId: string) {
    return this.contactAttemptRepository.getCampaignContactStats(actor.tenant_id, campaignId);
  }

  private validateScheduled(dto: CreateContactAttemptDto) {
    if (dto.outcome === 'scheduled' && !dto.scheduled_at) {
      throw new DomainException('INVALID_INPUT', 'scheduled_at is required when outcome is scheduled', HttpStatus.BAD_REQUEST);
    }
  }
}
