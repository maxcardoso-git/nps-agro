import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface QuestionnaireRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionnaireVersionRow {
  id: string;
  questionnaire_id: string;
  version_number: number;
  status: string;
  schema_json: Record<string, unknown>;
  published_at: Date | null;
  created_by: string | null;
  created_at: Date;
}

@Injectable()
export class QuestionnaireRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  createQuestionnaire(params: {
    tenantId: string;
    name: string;
    description?: string;
    createdBy?: string;
  }): Promise<QuestionnaireRow | null> {
    return this.one<QuestionnaireRow>(
      `
      INSERT INTO core.questionnaire (
        tenant_id,
        name,
        description,
        status,
        created_by
      )
      VALUES ($1, $2, $3, 'draft', $4)
      RETURNING id, tenant_id, name, description, status, created_by, created_at, updated_at
      `,
      [params.tenantId, params.name, params.description ?? null, params.createdBy ?? null],
    );
  }

  listQuestionnaires(filters: {
    tenantId?: string;
    status?: string;
    search?: string;
  }): Promise<QuestionnaireRow[]> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filters.tenantId) {
      values.push(filters.tenantId);
      where.push(`tenant_id = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      where.push(`name ILIKE $${values.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return this.many<QuestionnaireRow>(
      `
      SELECT id, tenant_id, name, description, status, created_by, created_at, updated_at
      FROM core.questionnaire
      ${whereClause}
      ORDER BY updated_at DESC
      `,
      values,
    );
  }

  getQuestionnaireById(id: string): Promise<QuestionnaireRow | null> {
    return this.one<QuestionnaireRow>(
      `
      SELECT id, tenant_id, name, description, status, created_by, created_at, updated_at
      FROM core.questionnaire
      WHERE id = $1
      `,
      [id],
    );
  }

  listVersions(questionnaireId: string): Promise<QuestionnaireVersionRow[]> {
    return this.many<QuestionnaireVersionRow>(
      `
      SELECT id, questionnaire_id, version_number, status, schema_json, published_at, created_by, created_at
      FROM core.questionnaire_version
      WHERE questionnaire_id = $1
      ORDER BY version_number DESC
      `,
      [questionnaireId],
    );
  }

  async getNextVersionNumber(questionnaireId: string): Promise<number> {
    const row = await this.one<{ next_version: string }>(
      `
      SELECT (COALESCE(MAX(version_number), 0) + 1)::text AS next_version
      FROM core.questionnaire_version
      WHERE questionnaire_id = $1
      `,
      [questionnaireId],
    );

    return row ? Number(row.next_version) : 1;
  }

  createVersion(params: {
    questionnaireId: string;
    versionNumber: number;
    schemaJson: Record<string, unknown>;
    createdBy?: string;
  }): Promise<QuestionnaireVersionRow | null> {
    return this.one<QuestionnaireVersionRow>(
      `
      INSERT INTO core.questionnaire_version (
        questionnaire_id,
        version_number,
        status,
        schema_json,
        created_by
      )
      VALUES ($1, $2, 'draft', $3, $4)
      RETURNING id, questionnaire_id, version_number, status, schema_json, published_at, created_by, created_at
      `,
      [params.questionnaireId, params.versionNumber, JSON.stringify(params.schemaJson), params.createdBy ?? null],
    );
  }

  getVersionById(versionId: string): Promise<QuestionnaireVersionRow | null> {
    return this.one<QuestionnaireVersionRow>(
      `
      SELECT id, questionnaire_id, version_number, status, schema_json, published_at, created_by, created_at
      FROM core.questionnaire_version
      WHERE id = $1
      `,
      [versionId],
    );
  }

  updateDraftVersion(versionId: string, schemaJson: Record<string, unknown>): Promise<QuestionnaireVersionRow | null> {
    return this.one<QuestionnaireVersionRow>(
      `
      UPDATE core.questionnaire_version
      SET schema_json = $2
      WHERE id = $1
        AND status = 'draft'
      RETURNING id, questionnaire_id, version_number, status, schema_json, published_at, created_by, created_at
      `,
      [versionId, JSON.stringify(schemaJson)],
    );
  }

  publishVersion(versionId: string): Promise<QuestionnaireVersionRow | null> {
    return this.one<QuestionnaireVersionRow>(
      `
      UPDATE core.questionnaire_version
      SET status = 'published',
          published_at = NOW()
      WHERE id = $1
        AND status = 'draft'
      RETURNING id, questionnaire_id, version_number, status, schema_json, published_at, created_by, created_at
      `,
      [versionId],
    );
  }

  setQuestionnaireStatus(questionnaireId: string, status: string): Promise<QuestionnaireRow | null> {
    return this.one<QuestionnaireRow>(
      `
      UPDATE core.questionnaire
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, tenant_id, name, description, status, created_by, created_at, updated_at
      `,
      [questionnaireId, status],
    );
  }
}
