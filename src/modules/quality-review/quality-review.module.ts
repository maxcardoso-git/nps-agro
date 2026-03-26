import { Module } from '@nestjs/common';
import { QualityReviewController } from './quality-review.controller';
import { QualityReviewRepository } from './quality-review.repository';
import { QualityReviewService } from './quality-review.service';

@Module({
  controllers: [QualityReviewController],
  providers: [QualityReviewService, QualityReviewRepository],
  exports: [QualityReviewService],
})
export class QualityReviewModule {}
