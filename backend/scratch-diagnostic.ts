
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '.env') });

async function run() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  const db = new Kysely<any>({
    dialect: new PostgresDialect({ pool }),
  });

  console.log('--- Diagnostic for Product 00009 ---');
  const prod9 = await db.selectFrom('products').selectAll().where('barcode', '=', '00009').executeTakeFirst();
  console.log('Product 00009:', prod9 ? { id: prod9.id, stock_qty: prod9.stock_qty } : 'Not found');
  
  if (prod9) {
    const locs = await db.selectFrom('product_location_stock').selectAll().where('product_id', '=', prod9.id).execute();
    console.log('Location Stock 00009:');
    console.table(locs.map(l => ({ id: l.id, branch_id: l.branch_id, location_id: l.location_id, qty: l.qty })));
  }

  console.log('\n--- Diagnostic for Product 00002 ---');
  const prod2 = await db.selectFrom('products').selectAll().where('barcode', '=', '00002').executeTakeFirst();
  console.log('Product 00002:', prod2 ? { id: prod2.id, stock_qty: prod2.stock_qty } : 'Not found');
  
  if (prod2) {
    const locs = await db.selectFrom('product_location_stock').selectAll().where('product_id', '=', prod2.id).execute();
    console.log('Location Stock 00002:');
    console.table(locs.map(l => ({ id: l.id, branch_id: l.branch_id, location_id: l.location_id, qty: l.qty })));
  }

  await pool.end();
}

run().catch(console.error);

