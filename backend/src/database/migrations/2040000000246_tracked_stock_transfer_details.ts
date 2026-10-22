import { Kysely, sql } from 'kysely';

/** Immutable dispatch provenance for serials and batches, even after receipt/loss. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE stock_transfer_items
      ADD COLUMN IF NOT EXISTS serial_tracking JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS batch_tracking JSONB NOT NULL DEFAULT '[]'::jsonb;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE stock_transfer_items
      DROP COLUMN IF EXISTS batch_tracking,
      DROP COLUMN IF EXISTS serial_tracking;
  `.execute(db);
}
