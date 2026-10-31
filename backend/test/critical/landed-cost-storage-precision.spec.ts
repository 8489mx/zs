/*
New file: backend/test/critical/landed-cost-storage-precision.spec.ts
Pins the shipment-item storage widening (INV-LANDED-COST-STORAGE-PRECISION).

THE GAP: import_shipment_items.landed_cost_egp and
allocated_overhead_egp were numeric(10, 2), so Postgres silently
rounded the landed-cost engine's 4-decimal outputs back to cents
at insert time -- and the inventory unit-cost reader then built
costs from the already-truncated value.

THE RULE: migration 0271 widens both columns to numeric(15, 4),
preserving the engine's output exactly and matching the sibling
unit_landed_cost_egp column. Widening only: existing values are
untouched, and running the migration twice is safe.

WHAT THIS PINS, driving the REAL migration up() on PGlite
against a table created at the OLD scale:
- before the migration, a 4-decimal insert reads back cut to
  cents (4856.0625 -> 4856.06): the silent truncation, proven
  in the same run.
- after the migration, a 4-decimal insert reads back exactly,
  a large 4-decimal value that overflows the old precision
  stores exactly, and the pre-migration row is unchanged.
- running up() a second time changes nothing.
*/

import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { PGlite } from '@electric-sql/pglite';
import { Kysely, sql } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Database } from '../../src/database/database.types';
import { up } from '../../src/database/migrations/2040000000271_import_shipment_item_cost_precision';

async function readCost(db: Kysely<Database>, id: string): Promise<{ allocated: string; landed: string }> {
  const row = await sql<{ allocated_overhead_egp: string; landed_cost_egp: string }>`
    SELECT allocated_overhead_egp, landed_cost_egp FROM import_shipment_items WHERE id = ${id}
  `.execute(db);
  return { allocated: String(row.rows[0].allocated_overhead_egp), landed: String(row.rows[0].landed_cost_egp) };
}

async function main(): Promise<void> {
  const pg = new PGlite();
  const db = new Kysely<Database>({ dialect: new PGliteDialect(pg) });

  try {
    await pg.exec(`
      CREATE TABLE import_shipment_items (id text PRIMARY KEY, tenant_id text, allocated_overhead_egp numeric(10, 2) DEFAULT 0, landed_cost_egp numeric(10, 2) DEFAULT 0);
      INSERT INTO import_shipment_items VALUES ('old', 't1', 50.25, 100.12);
      INSERT INTO import_shipment_items VALUES ('truncated', 't1', 12.3456, 4856.0625);
    `);

    const before = await readCost(db, 'truncated');
    assert.equal(Number(before.landed), 4856.06);
    assert.equal(Number(before.allocated), 12.35);

    await up(db as any);

    const oldRow = await readCost(db, 'old');
    assert.equal(Number(oldRow.landed), 100.12);
    assert.equal(Number(oldRow.allocated), 50.25);

    await sql`INSERT INTO import_shipment_items VALUES ('new', 't1', 12.3456, 4856.0625)`.execute(db);
    const after = await readCost(db, 'new');
    assert.equal(Number(after.landed), 4856.0625);
    assert.equal(Number(after.allocated), 12.3456);

    await sql`INSERT INTO import_shipment_items VALUES ('big', 't1', 123456789.1234, 123456789.1234)`.execute(db);
    const big = await readCost(db, 'big');
    assert.equal(Number(big.landed), 123456789.1234);

    await up(db as any);
    const rerun = await readCost(db, 'new');
    assert.equal(Number(rerun.landed), 4856.0625);

    const info = await sql<{ numeric_precision: number; numeric_scale: number }>`
      SELECT numeric_precision, numeric_scale FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'import_shipment_items' AND column_name = 'landed_cost_egp'
    `.execute(db);
    assert.equal(Number(info.rows[0].numeric_precision), 15);
    assert.equal(Number(info.rows[0].numeric_scale), 4);

    console.log('landed cost storage precision checks passed');
  } finally {
    await db.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
