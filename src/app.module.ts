import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './common/database.module';
import { PermissionGuard } from './modules/access/permission.guard';
import { TenantScopeGuard } from './modules/access/tenant-scope.guard';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { BffModule } from './modules/bff/bff.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantUserModule } from './modules/tenant-user/tenant-user.module';
import { SurveyModule } from './survey/survey.module';

@Module({
  imports: [
    DatabaseModule,
    BffModule,
    AuthModule,
    TenantModule,
    TenantUserModule,
    CampaignModule,
    QuestionnaireModule,
    ReportingModule,
    SurveyModule,
  ],
  providers: [
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

