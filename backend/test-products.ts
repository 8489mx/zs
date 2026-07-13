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
  const p = await db.selectFrom('products').select(['id', 'name', 'barcode', 'stock_qty']).where('barcode', '=', '00002').execute();
  console.log(JSON.stringify(p, null, 2));
  await db.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
