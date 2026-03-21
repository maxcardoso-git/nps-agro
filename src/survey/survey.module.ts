import { Module } from '@nestjs/common';
import { DB_POOL } from '../common/constants';
import { PgSurveyRepository } from './repositories/pg-survey.repository';
import { PG_POOL, SURVEY_REPOSITORY } from './repositories/repository.tokens';
import { RuleEngine } from './rule-engine';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';

@Module({
  controllers: [SurveyController],
  providers: [
    SurveyService,
    RuleEngine,
    {
      provide: PG_POOL,
      useExisting: DB_POOL,
    },
    {
      provide: SURVEY_REPOSITORY,
      useClass: PgSurveyRepository,
    },
  ],
})
export class SurveyModule {}

