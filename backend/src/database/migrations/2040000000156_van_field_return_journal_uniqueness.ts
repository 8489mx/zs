import { Kysely, sql } from 'kysely';

/**
 * Migration 2040000000156: extends the van-sales journal idempotency guard (migration 151) to
 * cover the new `van_field_return` source type, now that approveFieldReturn posts a reversing
 * journal entry via AccountingPostingService.postVanFieldReturn.
 */
export const migration = {
  up: async (db: Kysely<any>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_journal_entries_van_sales_uniq`.execute(db);
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_van_sales_uniq
      ON journal_entries(tenant_id, source_type, source_id)
      WHERE source_type IN ('van_trip_settlement', 'van_field_collection', 'van_field_return')
    `.execute(db);
  },

  down: async (db: Kysely<any>): Promise<void> => {
    await sql`DROP INDEX IF EXISTS idx_journal_entries_van_sales_uniq`.execute(db);
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_van_sales_uniq
      ON journal_entries(tenant_id, source_type, source_id)
      WHERE source_type IN ('van_trip_settlement', 'van_field_collection')
    `.execute(db);
  },
};
