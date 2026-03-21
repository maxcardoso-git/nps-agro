import { QueryResultRow } from 'pg';
import { DatabaseService } from './database.service';

export abstract class SqlRepositoryBase {
  constructor(protected readonly db: DatabaseService) {}

  protected async many<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.db.query<T>(sql, params);
    return result.rows;
  }

  protected async one<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const result = await this.db.query<T>(sql, params);
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }
    return result.rows[0] ?? null;
  }

  protected async execute(sql: string, params: unknown[] = []): Promise<number> {
    const result = await this.db.query(sql, params);
    return result.rowCount ?? 0;
  }
}
