import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CampaignActionRepository } from './campaign-action.repository';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';

@Injectable()
export class CampaignActionService {
  constructor(private readonly actionRepository: CampaignActionRepository) {}

  async createAction(actor: AuthUserClaims, campaignId: string, dto: CreateActionDto) {
    const action = await this.actionRepository.create({
      tenant_id: actor.tenant_id,
      campaign_id: campaignId,
      name: dto.name,
      description: dto.description,
      questionnaire_version_id: dto.questionnaire_version_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
    });
    if (!action) {
      throw new DomainException('ACTION_NOT_CREATED', 'Could not create action', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return action;
  }

  async listActions(actor: AuthUserClaims, campaignId: string) {
    return this.actionRepository.listByCampaign(campaignId, actor.tenant_id);
  }

  async getAction(actor: AuthUserClaims, actionId: string) {
    const action = await this.actionRepository.findById(actionId, actor.tenant_id);
    if (!action) {
      throw new DomainException('ACTION_NOT_FOUND', 'Action not found', HttpStatus.NOT_FOUND);
    }
    return action;
  }

  async updateAction(actor: AuthUserClaims, actionId: string, dto: UpdateActionDto) {
    const action = await this.actionRepository.update(actionId, actor.tenant_id, dto as Record<string, unknown>);
    if (!action) {
      throw new DomainException('ACTION_NOT_FOUND', 'Action not found', HttpStatus.NOT_FOUND);
    }
    return action;
  }

  async activateAction(actor: AuthUserClaims, actionId: string) {
    return this.actionRepository.update(actionId, actor.tenant_id, { status: 'active' });
  }

  async pauseAction(actor: AuthUserClaims, actionId: string) {
    return this.actionRepository.update(actionId, actor.tenant_id, { status: 'paused' });
  }

  async setInterviewers(actor: AuthUserClaims, actionId: string, userIds: string[]) {
    const action = await this.actionRepository.findById(actionId, actor.tenant_id);
    if (!action) {
      throw new DomainException('ACTION_NOT_FOUND', 'Action not found', HttpStatus.NOT_FOUND);
    }
    await this.actionRepository.setInterviewers(actionId, userIds);
    return this.actionRepository.getInterviewers(actionId);
  }

  async getInterviewers(actor: AuthUserClaims, actionId: string) {
    return this.actionRepository.getInterviewers(actionId);
  }

  async importContacts(
    actor: AuthUserClaims,
    campaignId: string,
    actionId: string,
    contacts: Array<{ nome: string; celular?: string; conta?: string; cargo?: string; tipo_persona?: string; codigo?: string }>,
  ) {
    const tenantId = actor.tenant_id;
    let imported = 0;
    let accountsCreated = 0;

    for (const contact of contacts) {
      if (!contact.nome?.trim()) continue;

      let accountId: string | null = null;
      if (contact.conta?.trim()) {
        const result = await this.actionRepository.upsertAccount(tenantId, contact.conta.trim());
        accountId = result.id;
        if (result.created) accountsCreated++;
      }

      await this.actionRepository.insertRespondent({
        tenant_id: tenantId,
        campaign_id: campaignId,
        action_id: actionId,
        account_id: accountId,
        external_id: contact.codigo?.trim() || null,
        name: contact.nome.trim(),
        phone: contact.celular?.trim() || null,
        job_title: contact.cargo?.trim() || null,
        persona_type: contact.tipo_persona?.trim() || null,
      });
      imported++;
    }

    return { imported, accounts_created: accountsCreated };
  }
}
