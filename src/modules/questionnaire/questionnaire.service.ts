import { HttpStatus, Injectable } from '@nestjs/common';
import { DomainException } from '../../common/errors';
import { AuthUserClaims } from '../../common/types';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { CreateQuestionnaireVersionDto } from './dto/create-questionnaire-version.dto';
import { QuestionnaireRepository } from './questionnaire.repository';
import { SchemaValidatorService } from './schema-validator.service';
import { VersioningService } from './versioning.service';

@Injectable()
export class QuestionnaireService {
  constructor(
    private readonly questionnaireRepository: QuestionnaireRepository,
    private readonly schemaValidator: SchemaValidatorService,
    private readonly versioningService: VersioningService,
  ) {}

  async createQuestionnaire(actor: AuthUserClaims, dto: CreateQuestionnaireDto) {
    const tenantId = this.resolveTenantId(actor, dto.tenant_id, true);
    const questionnaire = await this.questionnaireRepository.createQuestionnaire({
      tenantId,
      name: dto.name,
      description: dto.description,
      createdBy: actor.sub,
    });

    if (!questionnaire) {
      throw new DomainException(
        'QUESTIONNAIRE_NOT_CREATED',
        'Questionário não foi criado',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return questionnaire;
  }

  listQuestionnaires(
    actor: AuthUserClaims,
    query: { tenant_id?: string; status?: string; search?: string },
  ) {
    return this.questionnaireRepository.listQuestionnaires({
      tenantId: this.resolveTenantId(actor, query.tenant_id, true),
      status: query.status,
      search: query.search,
    });
  }

  async getQuestionnaireById(actor: AuthUserClaims, questionnaireId: string) {
    const questionnaire = await this.questionnaireRepository.getQuestionnaireById(questionnaireId);
    if (!questionnaire) {
      throw new DomainException('QUESTIONNAIRE_NOT_FOUND', 'Questionário não encontrado', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, questionnaire.tenant_id);

    const versions = await this.questionnaireRepository.listVersions(questionnaireId);
    return { ...questionnaire, versions };
  }

  async createVersion(
    actor: AuthUserClaims,
    questionnaireId: string,
    dto: CreateQuestionnaireVersionDto,
  ) {
    const questionnaire = await this.questionnaireRepository.getQuestionnaireById(questionnaireId);
    if (!questionnaire) {
      throw new DomainException('QUESTIONNAIRE_NOT_FOUND', 'Questionário não encontrado', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, questionnaire.tenant_id);

    const validation = this.schemaValidator.validate(dto.schema_json);
    if (!validation.valid) {
      throw new DomainException(
        'QUESTIONNAIRE_SCHEMA_INVALID',
        'O schema do questionário é inválido',
        HttpStatus.BAD_REQUEST,
        { errors: validation.errors },
      );
    }

    const versionNumber = await this.versioningService.getNextVersionNumber(questionnaireId);
    const version = await this.questionnaireRepository.createVersion({
      questionnaireId,
      versionNumber,
      schemaJson: dto.schema_json,
      createdBy: actor.sub,
    });

    if (!version) {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_CREATED',
        'Versão não foi criada',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return version;
  }

  async updateDraftVersion(actor: AuthUserClaims, versionId: string, schemaJson: Record<string, unknown>) {
    const version = await this.questionnaireRepository.getVersionById(versionId);
    if (!version) {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_FOUND',
        'Versão de questionário não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    const questionnaire = await this.questionnaireRepository.getQuestionnaireById(version.questionnaire_id);
    if (!questionnaire) {
      throw new DomainException('QUESTIONNAIRE_NOT_FOUND', 'Questionário não encontrado', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, questionnaire.tenant_id);

    if (version.status !== 'draft') {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_DRAFT',
        'Apenas versões draft podem ser alteradas',
        HttpStatus.CONFLICT,
      );
    }

    const validation = this.schemaValidator.validate(schemaJson);
    if (!validation.valid) {
      throw new DomainException(
        'QUESTIONNAIRE_SCHEMA_INVALID',
        'O schema do questionário é inválido',
        HttpStatus.BAD_REQUEST,
        { errors: validation.errors },
      );
    }

    const updated = await this.questionnaireRepository.updateDraftVersion(versionId, schemaJson);
    if (!updated) {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_DRAFT',
        'Apenas versões draft podem ser alteradas',
        HttpStatus.CONFLICT,
      );
    }

    return updated;
  }

  async validateVersionSchema(actor: AuthUserClaims, versionId: string) {
    const version = await this.questionnaireRepository.getVersionById(versionId);
    if (!version) {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_FOUND',
        'Versão de questionário não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    const questionnaire = await this.questionnaireRepository.getQuestionnaireById(version.questionnaire_id);
    if (!questionnaire) {
      throw new DomainException('QUESTIONNAIRE_NOT_FOUND', 'Questionário não encontrado', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, questionnaire.tenant_id);

    return this.schemaValidator.validate(version.schema_json);
  }

  async publishVersion(actor: AuthUserClaims, versionId: string) {
    const version = await this.questionnaireRepository.getVersionById(versionId);
    if (!version) {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_FOUND',
        'Versão de questionário não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }

    const questionnaire = await this.questionnaireRepository.getQuestionnaireById(version.questionnaire_id);
    if (!questionnaire) {
      throw new DomainException('QUESTIONNAIRE_NOT_FOUND', 'Questionário não encontrado', HttpStatus.NOT_FOUND);
    }
    this.assertScope(actor, questionnaire.tenant_id);

    const validation = this.schemaValidator.validate(version.schema_json);
    if (!validation.valid) {
      throw new DomainException(
        'QUESTIONNAIRE_PUBLISH_VALIDATION_FAILED',
        'Não foi possível publicar a versão devido a erros de validação',
        HttpStatus.BAD_REQUEST,
        { errors: validation.errors },
      );
    }

    const published = await this.questionnaireRepository.publishVersion(versionId);
    if (!published) {
      throw new DomainException(
        'QUESTIONNAIRE_VERSION_NOT_DRAFT',
        'Apenas versões draft podem ser publicadas',
        HttpStatus.CONFLICT,
      );
    }

    await this.questionnaireRepository.setQuestionnaireStatus(version.questionnaire_id, 'published');

    return published;
  }

  private resolveTenantId(actor: AuthUserClaims, requestedTenantId?: string, allowFallback = false): string {
    if (actor.role !== 'platform_admin') {
      if (requestedTenantId && requestedTenantId !== actor.tenant_id) {
        throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
      }
      return actor.tenant_id;
    }

    if (allowFallback) {
      return requestedTenantId ?? actor.tenant_id;
    }

    if (!requestedTenantId) {
      throw new DomainException(
        'INVALID_INPUT',
        'tenant_id é obrigatório para platform_admin neste endpoint',
        HttpStatus.BAD_REQUEST,
      );
    }

    return requestedTenantId;
  }

  private assertScope(actor: AuthUserClaims, tenantId: string): void {
    if (actor.role !== 'platform_admin' && actor.tenant_id !== tenantId) {
      throw new DomainException('FORBIDDEN_TENANT_SCOPE', 'Acesso negado ao tenant solicitado', HttpStatus.FORBIDDEN);
    }
  }
}
