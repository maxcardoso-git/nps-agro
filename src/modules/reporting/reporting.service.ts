import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { ReportingRepository } from './reporting.repository';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(private readonly reportingRepository: ReportingRepository) {}

  async getExecutiveSummary(actor: AuthUserClaims, campaignId: string) {
    const campaign = await this.reportingRepository.getCampaign(campaignId);
    if (!campaign) {
      throw new DomainException('REPORT_NOT_AVAILABLE', 'Relatório não disponível', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, campaign.tenant_id);

    const [nps, sentimentDistribution, topTopics, regionalBreakdown] = await Promise.all([
      this.reportingRepository.getNpsByCampaign(campaignId),
      this.reportingRepository.getSentimentDistribution(campaignId),
      this.reportingRepository.getTopTopics(campaignId, 10),
      this.reportingRepository.getRegionalBreakdown(campaignId),
    ]);

    this.logger.log(`REPORT_EXECUTIVE_SUMMARY_ACCESSED campaign_id=${campaignId} user_id=${actor.sub}`);

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        segment: campaign.segment,
        status: campaign.status,
      },
      kpis: {
        nps: nps?.nps ?? 0,
        total_interviews: nps?.total_interviews ?? 0,
        promoters: nps?.promoters ?? 0,
        neutrals: nps?.neutrals ?? 0,
        detractors: nps?.detractors ?? 0,
      },
      sentiment_distribution: sentimentDistribution,
      top_topics: topTopics,
      regional_breakdown: regionalBreakdown,
    };
  }

  async listCampaignInterviewSummaries(
    actor: AuthUserClaims,
    campaignId: string,
    query: {
      region?: string;
      sentiment?: string;
      nps_class?: string;
      page?: number;
      page_size?: number;
    },
  ) {
    const campaign = await this.reportingRepository.getCampaign(campaignId);
    if (!campaign) {
      throw new DomainException('REPORT_NOT_AVAILABLE', 'Relatório não disponível', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, campaign.tenant_id);

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.page_size && query.page_size > 0 ? Math.min(query.page_size, 200) : 20;

    return this.reportingRepository.listInterviewSummaries({
      campaignId,
      region: query.region,
      sentiment: query.sentiment,
      npsClass: query.nps_class,
      page,
      pageSize,
    });
  }

  async getNpsBySegment(actor: AuthUserClaims, campaignId?: string) {
    return this.reportingRepository.getNpsBySegment(actor.tenant_id, campaignId);
  }

  async getNpsByRegion(actor: AuthUserClaims, campaignId?: string) {
    return this.reportingRepository.getNpsByRegion(actor.tenant_id, campaignId);
  }

  async getNpsByAccount(actor: AuthUserClaims, campaignId?: string) {
    return this.reportingRepository.getNpsByAccount(actor.tenant_id, campaignId);
  }

  async getCampaignIndicators(actor: AuthUserClaims, campaignId: string, actionId?: string) {
    const campaign = await this.reportingRepository.getCampaign(campaignId);
    if (!campaign) throw new DomainException('REPORT_NOT_AVAILABLE', 'Relatório não disponível', HttpStatus.NOT_FOUND);
    this.assertScope(actor, campaign.tenant_id);
    return this.reportingRepository.getCampaignIndicators(campaignId, actionId);
  }

  async getExecutionStats(actor: AuthUserClaims, campaignId?: string) {
    return this.reportingRepository.getExecutionStats(actor.tenant_id, campaignId);
  }

  async getQualityStats(actor: AuthUserClaims) {
    return this.reportingRepository.getQualityStats(actor.tenant_id);
  }

  private assertScope(actor: AuthUserClaims, tenantId: string): void {
    if (actor.role !== 'platform_admin' && actor.tenant_id !== tenantId) {
      throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
    }
  }
}

