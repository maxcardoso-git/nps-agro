import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './common/database.module';
import { PermissionGuard } from './modules/access/permission.guard';
import { TenantScopeGuard } from './modules/access/tenant-scope.guard';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { BffModule } from './modules/bff/bff.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { HealthModule } from './modules/health/health.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantUserModule } from './modules/tenant-user/tenant-user.module';
import { AccountModule } from './modules/account/account.module';
import { CampaignActionModule } from './modules/campaign-action/campaign-action.module';
import { ContactAttemptModule } from './modules/contact-attempt/contact-attempt.module';
import { AudioModule } from './modules/audio/audio.module';
import { AudioBatchModule } from './modules/audio-batch/audio-batch.module';
import { ChatModule } from './modules/chat/chat.module';
import { EnrichmentModule } from './modules/enrichment/enrichment.module';
import { LlmResourceModule } from './modules/llm-resource/llm-resource.module';
import { QualityReviewModule } from './modules/quality-review/quality-review.module';
import { ResourceModule } from './modules/resource/resource.module';
import { SurveyModule } from './survey/survey.module';

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    BffModule,
    AuthModule,
    TenantModule,
    TenantUserModule,
    CampaignModule,
    QuestionnaireModule,
    ReportingModule,
    AccountModule,
    CampaignActionModule,
    ContactAttemptModule,
    AudioModule,
    AudioBatchModule,
    ChatModule,
    EnrichmentModule,
    LlmResourceModule,
    QualityReviewModule,
    ResourceModule,
    HealthModule,
    SurveyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantScopeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule {}
