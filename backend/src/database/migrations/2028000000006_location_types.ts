import { Kysely, sql } from 'kysely';
import { Database } from '../database.types';

export async function up(db: Kysely<Database>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await sql`
      ALTER TABLE stock_locations 
      ADD COLUMN IF NOT EXISTS location_type TEXT NOT NULL DEFAULT 'internal_warehouse';
    `.execute(trx);

    await sql`
      ALTER TABLE stock_locations 
      ADD CONSTRAINT stock_locations_type_valid 
      CHECK (location_type IN ('branch_stock', 'internal_warehouse', 'external_warehouse', 'damaged', 'in_transit'));
    `.execute(trx);
  });
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await sql`
      ALTER TABLE stock_locations 
      DROP CONSTRAINT IF EXISTS stock_locations_type_valid;
    `.execute(trx);

    await sql`
      ALTER TABLE stock_locations 
      DROP COLUMN IF EXISTS location_type;
    `.execute(trx);
  });
}
