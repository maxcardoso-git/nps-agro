import pg from 'pg';
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
});
export async function query(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
}
export async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows[0] ?? null;
}
export async function close() {
    await pool.end();
}
