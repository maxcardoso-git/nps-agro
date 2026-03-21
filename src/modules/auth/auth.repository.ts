import { Injectable } from '@nestjs/common';
import { SqlRepositoryBase } from '../../common/sql.repository.base';
import { DatabaseService } from '../../common/database.service';

interface AuthUserRow {
  id: string;
  tenant_id: string;
  tenant_code: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  password_hash: string | null;
}

@Injectable()
export class AuthRepository extends SqlRepositoryBase {
  constructor(db: DatabaseService) {
    super(db);
  }

  async findUserByEmail(email: string, tenantCode?: string): Promise<AuthUserRow | null> {
    if (tenantCode) {
      return this.one<AuthUserRow>(
        `
        SELECT
          u.id,
          u.tenant_id,
          t.code AS tenant_code,
          u.name,
          u.email,
          u.role,
          u.is_active,
          u.password_hash
        FROM core.app_user u
        JOIN core.tenant t ON t.id = u.tenant_id
        WHERE u.email = $1
          AND t.code = $2
        LIMIT 1
        `,
        [email, tenantCode],
      );
    }

    return this.one<AuthUserRow>(
      `
      SELECT
        u.id,
        u.tenant_id,
        t.code AS tenant_code,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.password_hash
      FROM core.app_user u
      JOIN core.tenant t ON t.id = u.tenant_id
      WHERE u.email = $1
      ORDER BY CASE WHEN u.role = 'platform_admin' THEN 0 ELSE 1 END
      LIMIT 1
      `,
      [email],
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.execute(
      `
      UPDATE core.app_user
      SET last_login_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [userId],
    );
  }
}
