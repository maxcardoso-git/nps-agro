import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface ResourceRow {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  subtype: string | null;
  endpoint_url: string | null;
  http_method: string;
  auth_mode: string;
  auth_config: Record<string, unknown>;
  connection_json: Record<string, unknown>;
  config_json: Record<string, unknown>;
  metadata_json: Record<string, unknown>;
  tags: string[];
  environment: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ResourceRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    tenant_id: string;
    name: string;
    type: string;
    subtype?: string;
    endpoint_url?: string;
    http_method?: string;
    auth_mode?: string;
    auth_config?: Record<string, unknown>;
    connection_json?: Record<string, unknown>;
    config_json?: Record<string, unknown>;
    metadata_json?: Record<string, unknown>;
    tags?: string[];
    environment?: string;
    is_active?: boolean;
  }): Promise<ResourceRow | null> {
    return this.one<ResourceRow>(
      `
      INSERT INTO core.resource (
        tenant_id, name, type, subtype, endpoint_url, http_method,
        auth_mode, auth_config, connection_json, config_json, metadata_json,
        tags, environment, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
      `,
      [
        params.tenant_id,
        params.name,
        params.type,
        params.subtype || null,
        params.endpoint_url || null,
        params.http_method || 'POST',
        params.auth_mode || 'none',
        JSON.stringify(params.auth_config || {}),
        JSON.stringify(params.connection_json || {}),
        JSON.stringify(params.config_json || {}),
        JSON.stringify(params.metadata_json || {}),
        params.tags || [],
        params.environment || 'production',
        params.is_active !== false,
      ],
    );
  }

  list(tenantId: string, type?: string): Promise<ResourceRow[]> {
    const where = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];

    if (type) {
      params.push(type);
      where.push(`type = $${params.length}`);
    }

    return this.many<ResourceRow>(
      `SELECT * FROM core.resource WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params,
    );
  }

  getById(id: string, tenantId: string): Promise<ResourceRow | null> {
    return this.one<ResourceRow>(
      `SELECT * FROM core.resource WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
  }

  async update(id: string, tenantId: string, payload: Record<string, unknown>): Promise<ResourceRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const push = (col: string, val: unknown) => {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    };

    if (payload.name !== undefined) push('name', payload.name);
    if (payload.type !== undefined) push('type', payload.type);
    if (payload.subtype !== undefined) push('subtype', payload.subtype || null);
    if (payload.endpoint_url !== undefined) push('endpoint_url', payload.endpoint_url || null);
    if (payload.http_method !== undefined) push('http_method', payload.http_method);
    if (payload.auth_mode !== undefined) push('auth_mode', payload.auth_mode);
    if (payload.auth_config !== undefined) push('auth_config', JSON.stringify(payload.auth_config));
    if (payload.connection_json !== undefined) push('connection_json', JSON.stringify(payload.connection_json));
    if (payload.config_json !== undefined) push('config_json', JSON.stringify(payload.config_json));
    if (payload.metadata_json !== undefined) push('metadata_json', JSON.stringify(payload.metadata_json));
    if (payload.tags !== undefined) push('tags', payload.tags);
    if (payload.environment !== undefined) push('environment', payload.environment);
    if (payload.is_active !== undefined) push('is_active', payload.is_active);

    if (fields.length === 0) return this.getById(id, tenantId);

    values.push(id);
    values.push(tenantId);

    return this.one<ResourceRow>(
      `UPDATE core.resource SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length - 1} AND tenant_id = $${values.length}
       RETURNING *`,
      values,
    );
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const count = await this.execute(
      `DELETE FROM core.resource WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    return count > 0;
  }
}
