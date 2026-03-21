import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface TenantRow {
  id: string;
  name: string;
  code: string;
  status: string;
  timezone: string;
  settings_json: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class TenantRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    name: string;
    code: string;
    status: string;
    timezone: string;
    settings_json: Record<string, unknown>;
  }): Promise<TenantRow | null> {
    return this.one<TenantRow>(
      `
      INSERT INTO core.tenant (name, code, status, timezone, settings_json)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, code, status, timezone, settings_json, created_at, updated_at
      `,
      [params.name, params.code, params.status, params.timezone, JSON.stringify(params.settings_json)],
    );
  }

  list(filters: {
    status?: string;
    search?: string;
    page: number;
    pageSize: number;
    tenantId?: string;
  }): Promise<TenantRow[]> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (filters.tenantId) {
      values.push(filters.tenantId);
      where.push(`id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      where.push(`status = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      where.push(`(name ILIKE $${values.length} OR code ILIKE $${values.length})`);
    }

    values.push(filters.pageSize);
    const limitParam = `$${values.length}`;
    values.push((filters.page - 1) * filters.pageSize);
    const offsetParam = `$${values.length}`;

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    return this.many<TenantRow>(
      `
      SELECT id, name, code, status, timezone, settings_json, created_at, updated_at
      FROM core.tenant
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
      `,
      values,
    );
  }

  getById(id: string): Promise<TenantRow | null> {
    return this.one<TenantRow>(
      `
      SELECT id, name, code, status, timezone, settings_json, created_at, updated_at
      FROM core.tenant
      WHERE id = $1
      `,
      [id],
    );
  }

  async update(id: string, payload: Record<string, unknown>): Promise<TenantRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const pushField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (payload.name !== undefined) pushField('name', payload.name);
    if (payload.status !== undefined) pushField('status', payload.status);
    if (payload.timezone !== undefined) pushField('timezone', payload.timezone);
    if (payload.settings_json !== undefined) pushField('settings_json', JSON.stringify(payload.settings_json));

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    return this.one<TenantRow>(
      `
      UPDATE core.tenant
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING id, name, code, status, timezone, settings_json, created_at, updated_at
      `,
      values,
    );
  }
}
