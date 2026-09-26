import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000151: idempotency guard for the two new van-sales journal source types
 * (`van_trip_settlement`, `van_field_collection`).
 *
 * Every other posting function in accounting-posting.service.ts checks for an existing journal with
 * a plain SELECT before inserting, then relies on a duplicate-key error from a UNIQUE index (caught
 * by constraint name `idx_..._uniq`) as the real, race-proof guard — the SELECT alone is not atomic
 * under concurrency. `idx_journal_entries_round1_uniq` and its siblings only cover the source_type
 * values each migration explicitly listed; `van_trip_settlement`/`van_field_collection` need their
 * own the same way `idx_journal_entries_pdc_and_wht_uniq` and `idx_journal_entries_hr_eos_uniq` did.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_van_sales_uniq
      ON journal_entries(tenant_id, source_type, source_id)
      WHERE source_type IN ('van_trip_settlement', 'van_field_collection')
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_journal_entries_van_sales_uniq`.execute(db);
  },
};
