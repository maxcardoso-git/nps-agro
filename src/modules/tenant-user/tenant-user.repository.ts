import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface TenantUserRow {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  password_hash: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class TenantUserRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: {
    tenantId: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    passwordHash: string;
  }): Promise<TenantUserRow | null> {
    return this.one<TenantUserRow>(
      `
      INSERT INTO core.app_user (tenant_id, name, email, role, is_active, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, name, email, role, is_active, password_hash, last_login_at, created_at, updated_at
      `,
      [params.tenantId, params.name, params.email, params.role, params.isActive, params.passwordHash],
    );
  }

  listByTenant(tenantId: string): Promise<TenantUserRow[]> {
    return this.many<TenantUserRow>(
      `
      SELECT id, tenant_id, name, email, role, is_active, password_hash, last_login_at, created_at, updated_at
      FROM core.app_user
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      `,
      [tenantId],
    );
  }

  getById(tenantId: string, userId: string): Promise<TenantUserRow | null> {
    return this.one<TenantUserRow>(
      `
      SELECT id, tenant_id, name, email, role, is_active, password_hash, last_login_at, created_at, updated_at
      FROM core.app_user
      WHERE tenant_id = $1
        AND id = $2
      `,
      [tenantId, userId],
    );
  }

  async update(tenantId: string, userId: string, payload: Record<string, unknown>): Promise<TenantUserRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const pushField = (column: string, value: unknown) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (payload.name !== undefined) pushField('name', payload.name);
    if (payload.email !== undefined) pushField('email', payload.email);
    if (payload.role !== undefined) pushField('role', payload.role);
    if (payload.is_active !== undefined) pushField('is_active', payload.is_active);
    if (payload.password_hash !== undefined) pushField('password_hash', payload.password_hash);

    if (fields.length === 0) {
      return this.getById(tenantId, userId);
    }

    values.push(tenantId);
    values.push(userId);

    return this.one<TenantUserRow>(
      `
      UPDATE core.app_user
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE tenant_id = $${values.length - 1}
        AND id = $${values.length}
      RETURNING id, tenant_id, name, email, role, is_active, password_hash, last_login_at, created_at, updated_at
      `,
      values,
    );
  }

  async countActiveTenantAdmins(tenantId: string, excludeUserId?: string): Promise<number> {
    const values: unknown[] = [tenantId];
    let exclusion = '';

    if (excludeUserId) {
      values.push(excludeUserId);
      exclusion = `AND id <> $${values.length}`;
    }

    const row = await this.one<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM core.app_user
      WHERE tenant_id = $1
        AND role = 'tenant_admin'
        AND is_active = TRUE
        ${exclusion}
      `,
      values,
    );

    return row ? Number(row.total) : 0;
  }
}
