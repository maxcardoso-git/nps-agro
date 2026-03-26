import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface LlmResourceRow {
  id: string;
  tenant_id: string;
  name: string;
  provider: string;
  model_id: string;
  api_key: string | null;
  base_url: string | null;
  purpose: string;
  config_json: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class LlmResourceRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    tenant_id: string;
    name: string;
    provider: string;
    model_id: string;
    api_key?: string;
    base_url?: string;
    purpose?: string;
    config_json?: Record<string, unknown>;
    is_active?: boolean;
  }): Promise<LlmResourceRow | null> {
    return this.one<LlmResourceRow>(
      `
      INSERT INTO ai.llm_resource (tenant_id, name, provider, model_id, api_key, base_url, purpose, config_json, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, tenant_id, name, provider, model_id, base_url, purpose, config_json, is_active, created_at, updated_at
      `,
      [
        params.tenant_id,
        params.name,
        params.provider,
        params.model_id,
        params.api_key || null,
        params.base_url || null,
        params.purpose || 'general',
        JSON.stringify(params.config_json || {}),
        params.is_active !== false,
      ],
    );
  }

  list(tenantId: string): Promise<LlmResourceRow[]> {
    return this.many<LlmResourceRow>(
      `
      SELECT id, tenant_id, name, provider, model_id, base_url, purpose, config_json, is_active, created_at, updated_at
      FROM ai.llm_resource
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      `,
      [tenantId],
    );
  }

  getById(id: string, tenantId: string): Promise<LlmResourceRow | null> {
    return this.one<LlmResourceRow>(
      `
      SELECT id, tenant_id, name, provider, model_id, base_url, purpose, config_json, is_active, created_at, updated_at
      FROM ai.llm_resource
      WHERE id = $1 AND tenant_id = $2
      `,
      [id, tenantId],
    );
  }

  async update(id: string, tenantId: string, payload: Record<string, unknown>): Promise<LlmResourceRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const pushField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (payload.name !== undefined) pushField('name', payload.name);
    if (payload.provider !== undefined) pushField('provider', payload.provider);
    if (payload.model_id !== undefined) pushField('model_id', payload.model_id);
    if (payload.api_key !== undefined) pushField('api_key', payload.api_key || null);
    if (payload.base_url !== undefined) pushField('base_url', payload.base_url || null);
    if (payload.purpose !== undefined) pushField('purpose', payload.purpose);
    if (payload.config_json !== undefined) pushField('config_json', JSON.stringify(payload.config_json));
    if (payload.is_active !== undefined) pushField('is_active', payload.is_active);

    if (fields.length === 0) {
      return this.getById(id, tenantId);
    }

    values.push(id);
    const idParam = `$${values.length}`;
    values.push(tenantId);
    const tenantParam = `$${values.length}`;

    return this.one<LlmResourceRow>(
      `
      UPDATE ai.llm_resource
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = ${idParam} AND tenant_id = ${tenantParam}
      RETURNING id, tenant_id, name, provider, model_id, base_url, purpose, config_json, is_active, created_at, updated_at
      `,
      values,
    );
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const rowCount = await this.execute(
      `DELETE FROM ai.llm_resource WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    return rowCount > 0;
  }
}
