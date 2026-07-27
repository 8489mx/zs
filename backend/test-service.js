const { sql, Kysely, PostgresDialect } = require('kysely');
const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5433, database: 'zs_dev', user: 'postgres', password: 'postgres' });
const db = new Kysely({ dialect: new PostgresDialect({ pool }) });

async function test() {
  const id = 56;
  const currentResult = await sql\SELECT * FROM hr_attendance_exceptions WHERE id = \ LIMIT 1\.execute(db);
  console.log('Row:', currentResult.rows[0]);
  pool.end();
}
test();
