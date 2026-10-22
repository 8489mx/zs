import { Kysely, sql } from 'kysely';

/** Keep original lot identity and destroyed-asset provenance in the audit ledger. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE purchase_items
      ADD COLUMN IF NOT EXISTS batch_number TEXT;
    ALTER TABLE damaged_stock_records
      ADD COLUMN IF NOT EXISTS serial_tracking JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS batch_tracking JSONB NOT NULL DEFAULT '[]'::jsonb;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE damaged_stock_records
      DROP COLUMN IF EXISTS batch_tracking,
      DROP COLUMN IF EXISTS serial_tracking;
    ALTER TABLE purchase_items DROP COLUMN IF EXISTS batch_number;
  `.execute(db);
}
