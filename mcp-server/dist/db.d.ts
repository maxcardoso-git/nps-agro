import pg from 'pg';
export declare function query<T extends pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>;
export declare function queryOne<T extends pg.QueryResultRow>(sql: string, params?: unknown[]): Promise<T | null>;
export declare function close(): Promise<void>;
