import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignRepository } from './campaign.repository';

@Injectable()
export class CampaignService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async createCampaign(actor: AuthUserClaims, dto: CreateCampaignDto) {
    const tenantId = this.resolveTenantId(actor, dto.tenant_id, true);
    this.assertValidDateRange(dto.start_date, dto.end_date);

    const isScoped = await this.campaignRepository.isQuestionnaireVersionScoped(
      dto.questionnaire_version_id,
      tenantId,
    );
    if (!isScoped) {
      throw new DomainException(
        'CAMPAIGN_CROSS_TENANT_DENIED',
        'O questionário informado não pertence ao tenant',
        HttpStatus.FORBIDDEN,
      );
    }

    const campaign = await this.campaignRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      segment: dto.segment,
      startDate: dto.start_date,
      endDate: dto.end_date,
      questionnaireVersionId: dto.questionnaire_version_id,
      channelConfigJson: dto.channel_config_json ?? {},
      createdBy: actor.sub,
    });

    if (!campaign) {
      throw new DomainException('CAMPAIGN_NOT_CREATED', 'Campanha não foi criada', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return campaign;
  }

  async listCampaigns(
    actor: AuthUserClaims,
    query: {
      tenant_id?: string;
      status?: string;
      segment?: string;
      search?: string;
      page?: number;
      page_size?: number;
    },
  ) {
    const tenantId = this.resolveTenantId(actor, query.tenant_id, true);
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.page_size && query.page_size > 0 ? Math.min(query.page_size, 100) : 20;

    return this.campaignRepository.list({
      tenantId: actor.role === 'platform_admin' ? tenantId : actor.tenant_id,
      status: query.status,
      segment: query.segment,
      search: query.search,
      page,
      pageSize,
    });
  }

  async getCampaignById(actor: AuthUserClaims, id: string) {
    const campaign = await this.campaignRepository.getById(id);
    if (!campaign) {
      throw new DomainException('CAMPAIGN_NOT_FOUND', 'Campanha não encontrada', HttpStatus.NOT_FOUND);
    }

    this.assertCampaignScope(actor, campaign.tenant_id);
    return campaign;
  }

  async updateCampaign(actor: AuthUserClaims, id: string, dto: UpdateCampaignDto) {
    const existing = await this.getCampaignById(actor, id);

    if (existing.status === 'completed') {
      throw new DomainException(
        'CAMPAIGN_INVALID_TRANSITION',
        'Campanha completed não pode ser editada',
        HttpStatus.CONFLICT,
      );
    }

    this.assertValidDateRange(dto.start_date ?? existing.start_date ?? undefined, dto.end_date ?? existing.end_date ?? undefined);

    if (dto.questionnaire_version_id) {
      const isScoped = await this.campaignRepository.isQuestionnaireVersionScoped(
        dto.questionnaire_version_id,
        existing.tenant_id,
      );
      if (!isScoped) {
        throw new DomainException(
          'CAMPAIGN_CROSS_TENANT_DENIED',
          'O questionário informado não pertence ao tenant',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const updated = await this.campaignRepository.update(id, dto as unknown as Record<string, unknown>);
    if (!updated) {
      throw new DomainException('CAMPAIGN_NOT_FOUND', 'Campanha não encontrada', HttpStatus.NOT_FOUND);
    }

    return updated;
  }

  async activateCampaign(actor: AuthUserClaims, id: string) {
    const campaign = await this.getCampaignById(actor, id);
    this.assertValidDateRange(campaign.start_date ?? undefined, campaign.end_date ?? undefined);

    if (!['draft', 'paused'].includes(campaign.status)) {
      throw new DomainException(
        'CAMPAIGN_INVALID_TRANSITION',
        'Transição inválida para activate',
        HttpStatus.CONFLICT,
      );
    }

    const publishedScoped = await this.campaignRepository.isQuestionnaireVersionPublishedAndScoped(
      campaign.questionnaire_version_id,
      campaign.tenant_id,
    );

    if (!publishedScoped) {
      throw new DomainException(
        'CAMPAIGN_QUESTIONNAIRE_NOT_PUBLISHED',
        'A campanha só pode ser ativada com questionário publicado',
        HttpStatus.CONFLICT,
      );
    }

    return this.campaignRepository.updateStatus(id, 'active');
  }

  async pauseCampaign(actor: AuthUserClaims, id: string) {
    const campaign = await this.getCampaignById(actor, id);
    if (campaign.status !== 'active') {
      throw new DomainException('CAMPAIGN_INVALID_TRANSITION', 'Apenas campanha active pode ser pausada', HttpStatus.CONFLICT);
    }

    return this.campaignRepository.updateStatus(id, 'paused');
  }

  async completeCampaign(actor: AuthUserClaims, id: string) {
    const campaign = await this.getCampaignById(actor, id);
    if (campaign.status !== 'active') {
      throw new DomainException(
        'CAMPAIGN_INVALID_TRANSITION',
        'Apenas campanha active pode ser encerrada',
        HttpStatus.CONFLICT,
      );
    }

    return this.campaignRepository.updateStatus(id, 'completed');
  }

  private resolveTenantId(actor: AuthUserClaims, requestedTenantId?: string, allowUndefinedForPlatform = false): string {
    if (actor.role !== 'platform_admin') {
      if (requestedTenantId && requestedTenantId !== actor.tenant_id) {
        throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
      }
      return actor.tenant_id;
    }

    if (allowUndefinedForPlatform) {
      return requestedTenantId ?? actor.tenant_id;
    }

    if (!requestedTenantId) {
      throw new DomainException('INVALID_INPUT', 'tenant_id é obrigatório para platform_admin neste endpoint', HttpStatus.BAD_REQUEST);
    }

    return requestedTenantId;
  }

  private assertCampaignScope(actor: AuthUserClaims, tenantId: string): void {
    if (actor.role !== 'platform_admin' && actor.tenant_id !== tenantId) {
      throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
    }
  }

  private assertValidDateRange(startDate?: string, endDate?: string): void {
    if (!startDate || !endDate) {
      return;
    }
    if (startDate > endDate) {
      throw new DomainException(
        'CAMPAIGN_INVALID_DATE_RANGE',
        'Data inicial maior que data final',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
