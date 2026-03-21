import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUserClaims } from '../../common/types';
import { CurrentUser } from '../access/current-user.decorator';
import { Permissions } from '../access/permissions.decorator';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { CreateQuestionnaireVersionDto } from './dto/create-questionnaire-version.dto';
import { QuestionnaireService } from './questionnaire.service';

@Controller()
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post('questionnaires')
  @Permissions('questionnaire.create')
  createQuestionnaire(@CurrentUser() user: AuthUserClaims, @Body() body: CreateQuestionnaireDto) {
    return this.questionnaireService.createQuestionnaire(user, body);
  }

  @Get('questionnaires')
  @Permissions('questionnaire.read')
  listQuestionnaires(
    @CurrentUser() user: AuthUserClaims,
    @Query('tenant_id') tenantId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.questionnaireService.listQuestionnaires(user, {
      tenant_id: tenantId,
      status,
      search,
    });
  }

  @Get('questionnaires/:id')
  @Permissions('questionnaire.read')
  getQuestionnaireById(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.questionnaireService.getQuestionnaireById(user, id);
  }

  @Post('questionnaires/:id/versions')
  @Permissions('questionnaire.update')
  createVersion(
    @CurrentUser() user: AuthUserClaims,
    @Param('id') questionnaireId: string,
    @Body() body: CreateQuestionnaireVersionDto,
  ) {
    return this.questionnaireService.createVersion(user, questionnaireId, body);
  }

  @Patch('questionnaire-versions/:versionId')
  @Permissions('questionnaire.update')
  updateDraftVersion(
    @CurrentUser() user: AuthUserClaims,
    @Param('versionId') versionId: string,
    @Body('schema_json') schemaJson: Record<string, unknown>,
  ) {
    return this.questionnaireService.updateDraftVersion(user, versionId, schemaJson);
  }

  @Post('questionnaire-versions/:versionId/validate')
  @Permissions('questionnaire.read')
  validateVersion(@CurrentUser() user: AuthUserClaims, @Param('versionId') versionId: string) {
    return this.questionnaireService.validateVersionSchema(user, versionId);
  }

  @Post('questionnaire-versions/:versionId/publish')
  @Permissions('questionnaire.publish')
  publishVersion(@CurrentUser() user: AuthUserClaims, @Param('versionId') versionId: string) {
    return this.questionnaireService.publishVersion(user, versionId);
  }
}

