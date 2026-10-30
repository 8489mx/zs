import { sql, type Kysely } from 'kysely';

/**
 * Field-collection twin scope (INV-FIELD-COLLECTION-TWIN-SCOPE): the
 * database rapid-fire backstop for field collections matched customer
 * + amount + 4 seconds only, because customer_payments carried no
 * trip, rep, or client-transaction columns — the client transaction
 * id lived only as a [tx:...] tag inside the free-text note, and the
 * trip/rep context lived only on the sibling customer_ledger row.
 * A second legitimate collection (another trip, another rep, another
 * channel) for the same customer and amount inside 4 seconds was
 * swallowed and reported as the first collection.
 *
 * This migration adds the three scope columns (all nullable: rows
 * written by non-van flows — POS installments, purchase-side
 * payments — have no trip context, and must stay untouched), backfills
 * client_tx_id from the legacy note tag so the column is the single
 * idempotency source for history too, and indexes the narrowed
 * twin-check predicate. The note tag keeps being written (other
 * readers match receipt numbers out of the note); the column lookup
 * runs first and the tag lookup remains as the fallback for any row
 * the backfill could not parse.
 *
 * Deliberately no foreign keys: customer_ledger.van_trip_id is a
 * plain INTEGER the same way, and a collection row must survive a
 * trip row's lifecycle without cascade semantics.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE customer_payments
      ADD COLUMN IF NOT EXISTS van_trip_id INTEGER,
      ADD COLUMN IF NOT EXISTS rep_id INTEGER,
      ADD COLUMN IF NOT EXISTS client_tx_id TEXT
  `.execute(db);
  await sql`
    UPDATE customer_payments
       SET client_tx_id = substring(note FROM '\\[tx:([^\\]]+)\\]')
     WHERE client_tx_id IS NULL
       AND note LIKE '%[tx:%'
  `.execute(db);
  await sql`
    CREATE INDEX IF NOT EXISTS idx_customer_payments_field_collection_twin
      ON customer_payments (tenant_id, customer_id, van_trip_id, rep_id, payment_channel, created_at DESC)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_customer_payments_field_collection_twin`.execute(db);
  await sql`
    ALTER TABLE customer_payments
      DROP COLUMN IF EXISTS client_tx_id,
      DROP COLUMN IF EXISTS rep_id,
      DROP COLUMN IF EXISTS van_trip_id
  `.execute(db);
}

export const migration = { up, down };
