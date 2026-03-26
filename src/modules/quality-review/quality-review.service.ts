import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { QualityReviewRepository } from './quality-review.repository';

@Injectable()
export class QualityReviewService {
  constructor(private readonly repo: QualityReviewRepository) {}

  async listPending(user: AuthUserClaims, tenantId: string) {
    return this.repo.listPending(tenantId);
  }

  async listAll(user: AuthUserClaims, tenantId: string, status?: string) {
    return this.repo.listAll(tenantId, status);
  }

  async getById(user: AuthUserClaims, tenantId: string, id: string) {
    const review = await this.repo.getById(id, tenantId);
    if (!review) throw new DomainException('REVIEW_NOT_FOUND', 'Review não encontrada', HttpStatus.NOT_FOUND);
    return review;
  }

  async approve(user: AuthUserClaims, tenantId: string, id: string, score?: number, notes?: string) {
    const review = await this.repo.approve(id, tenantId, user.sub, score ?? null, notes ?? null);
    if (!review) throw new DomainException('REVIEW_NOT_FOUND', 'Review não encontrada', HttpStatus.NOT_FOUND);

    // Move interview to completed and trigger enrichment
    await this.repo.updateInterviewStatus(review.interview_id, 'completed');
    const campaignId = await this.repo.getInterviewCampaignId(review.interview_id);
    if (campaignId) {
      await this.repo.createEnrichmentJob(tenantId, campaignId, review.interview_id);
    }

    return review;
  }

  async reject(user: AuthUserClaims, tenantId: string, id: string, score?: number, notes?: string) {
    const review = await this.repo.reject(id, tenantId, user.sub, score ?? null, notes ?? null);
    if (!review) throw new DomainException('REVIEW_NOT_FOUND', 'Review não encontrada', HttpStatus.NOT_FOUND);

    await this.repo.updateInterviewStatus(review.interview_id, 'cancelled');
    return review;
  }

  async getStats(user: AuthUserClaims, tenantId: string) {
    return this.repo.getStats(tenantId);
  }
}
