import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE stock_count_items ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ NULL`.execute(db);
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_stock_count_chunk_uniq
      ON journal_entries (tenant_id, source_type, source_id)
      WHERE source_type = 'stock_count_chunk'`.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_journal_entries_stock_count_chunk_uniq`.execute(db);
    await sql`ALTER TABLE stock_count_items DROP COLUMN IF EXISTS posted_at`.execute(db);
  },
};
