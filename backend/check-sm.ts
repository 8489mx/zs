import 'dotenv/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const db = new Kysely<any>({ dialect: new PostgresDialect({ pool }) });

async function main() {
  const meta = await db.introspection.getTables();
  const sm = meta.find(t => t.name === 'stock_movements');
  console.log(sm?.columns.map(c => c.name));
  await db.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
