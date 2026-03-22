import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

export interface AccountRow {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AccountWithCount extends AccountRow {
  respondent_count: number;
}

@Injectable()
export class AccountRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  create(params: { tenant_id: string; name: string }): Promise<AccountRow | null> {
    return this.one<AccountRow>(
      `INSERT INTO core.account (tenant_id, name)
       VALUES ($1, $2)
       ON CONFLICT (tenant_id, name) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [params.tenant_id, params.name],
    );
  }

  findById(id: string, tenantId: string): Promise<AccountRow | null> {
    return this.one<AccountRow>(
      `SELECT * FROM core.account WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
  }

  list(tenantId: string, search?: string): Promise<AccountWithCount[]> {
    const conditions = ['a.tenant_id = $1'];
    const values: unknown[] = [tenantId];

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`a.name ILIKE $${values.length}`);
    }

    return this.many<AccountWithCount>(
      `SELECT a.*, COALESCE(rc.cnt, 0)::int AS respondent_count
       FROM core.account a
       LEFT JOIN (
         SELECT account_id, COUNT(*) AS cnt
         FROM core.respondent
         GROUP BY account_id
       ) rc ON rc.account_id = a.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.name`,
      values,
    );
  }

  update(id: string, tenantId: string, params: { name?: string }): Promise<AccountRow | null> {
    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (params.name !== undefined) {
      values.push(params.name);
      sets.push(`name = $${idx++}`);
    }

    values.push(id, tenantId);

    return this.one<AccountRow>(
      `UPDATE core.account SET ${sets.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
      values,
    );
  }
}
