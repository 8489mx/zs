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
  const locs = await db.selectFrom('product_location_stock').select(['location_id', db.fn.sum('qty').as('total')]).groupBy('location_id').execute();
  console.log(locs);
  await db.destroy();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
