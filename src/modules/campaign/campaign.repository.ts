import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface CampaignRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: string;
  segment: string | null;
  start_date: string | null;
  end_date: string | null;
  questionnaire_version_id: string;
  channel_config_json: Record<string, unknown>;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CampaignRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    tenantId: string;
    name: string;
    description?: string;
    segment?: string;
    startDate?: string;
    endDate?: string;
    questionnaireVersionId: string;
    channelConfigJson: Record<string, unknown>;
    createdBy?: string;
  }): Promise<CampaignRow | null> {
    return this.one<CampaignRow>(
      `
      INSERT INTO core.campaign (
        tenant_id,
        name,
        description,
        status,
        segment,
        start_date,
        end_date,
        questionnaire_version_id,
        channel_config_json,
        created_by
      )
      VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        tenant_id,
        name,
        description,
        status,
        segment,
        start_date,
        end_date,
        questionnaire_version_id,
        channel_config_json,
        created_by,
        created_at,
        updated_at
      `,
      [
        params.tenantId,
        params.name,
        params.description ?? null,
        params.segment ?? null,
        params.startDate ?? null,
        params.endDate ?? null,
        params.questionnaireVersionId,
        JSON.stringify(params.channelConfigJson),
        params.createdBy ?? null,
      ],
    );
  }

  list(filters: {
    tenantId?: string;
    status?: string;
    segment?: string;
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<CampaignRow[]> {
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

    if (filters.segment) {
      values.push(filters.segment);
      where.push(`segment = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      where.push(`name ILIKE $${values.length}`);
    }

    values.push(filters.pageSize);
    const limitParam = `$${values.length}`;
    values.push((filters.page - 1) * filters.pageSize);
    const offsetParam = `$${values.length}`;

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return this.many<CampaignRow>(
      `
      SELECT
        id,
        tenant_id,
        name,
        description,
        status,
        segment,
        start_date,
        end_date,
        questionnaire_version_id,
        channel_config_json,
        created_by,
        created_at,
        updated_at
      FROM core.campaign
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
      `,
      values,
    );
  }

  getById(id: string): Promise<CampaignRow | null> {
    return this.one<CampaignRow>(
      `
      SELECT
        id,
        tenant_id,
        name,
        description,
        status,
        segment,
        start_date,
        end_date,
        questionnaire_version_id,
        channel_config_json,
        created_by,
        created_at,
        updated_at
      FROM core.campaign
      WHERE id = $1
      `,
      [id],
    );
  }

  async update(id: string, payload: Record<string, unknown>): Promise<CampaignRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const pushField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (payload.name !== undefined) pushField('name', payload.name);
    if (payload.description !== undefined) pushField('description', payload.description);
    if (payload.segment !== undefined) pushField('segment', payload.segment);
    if (payload.start_date !== undefined) pushField('start_date', payload.start_date);
    if (payload.end_date !== undefined) pushField('end_date', payload.end_date);
    if (payload.questionnaire_version_id !== undefined) {
      pushField('questionnaire_version_id', payload.questionnaire_version_id);
    }
    if (payload.channel_config_json !== undefined) {
      pushField('channel_config_json', JSON.stringify(payload.channel_config_json));
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    return this.one<CampaignRow>(
      `
      UPDATE core.campaign
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING
        id,
        tenant_id,
        name,
        description,
        status,
        segment,
        start_date,
        end_date,
        questionnaire_version_id,
        channel_config_json,
        created_by,
        created_at,
        updated_at
      `,
      values,
    );
  }

  updateStatus(id: string, status: string): Promise<CampaignRow | null> {
    return this.one<CampaignRow>(
      `
      UPDATE core.campaign
      SET status = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        tenant_id,
        name,
        description,
        status,
        segment,
        start_date,
        end_date,
        questionnaire_version_id,
        channel_config_json,
        created_by,
        created_at,
        updated_at
      `,
      [id, status],
    );
  }

  async isQuestionnaireVersionPublishedAndScoped(questionnaireVersionId: string, tenantId: string): Promise<boolean> {
    const row = await this.one<{ ok: number }>(
      `
      SELECT 1 AS ok
      FROM core.questionnaire_version qv
      JOIN core.questionnaire q ON q.id = qv.questionnaire_id
      WHERE qv.id = $1
        AND qv.status = 'published'
        AND q.tenant_id = $2
      LIMIT 1
      `,
      [questionnaireVersionId, tenantId],
    );

    return row !== null;
  }

  async isQuestionnaireVersionScoped(questionnaireVersionId: string, tenantId: string): Promise<boolean> {
    const row = await this.one<{ ok: number }>(
      `
      SELECT 1 AS ok
      FROM core.questionnaire_version qv
      JOIN core.questionnaire q ON q.id = qv.questionnaire_id
      WHERE qv.id = $1
        AND q.tenant_id = $2
      LIMIT 1
      `,
      [questionnaireVersionId, tenantId],
    );

    return row !== null;
  }
}
