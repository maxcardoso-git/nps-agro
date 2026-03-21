import { Module } from '@nestjs/common';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireRepository } from './questionnaire.repository';
import { QuestionnaireService } from './questionnaire.service';
import { SchemaValidatorService } from './schema-validator.service';
import { VersioningService } from './versioning.service';

@Module({
  controllers: [QuestionnaireController],
  providers: [
    QuestionnaireService,
    QuestionnaireRepository,
    SchemaValidatorService,
    VersioningService,
  ],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}

