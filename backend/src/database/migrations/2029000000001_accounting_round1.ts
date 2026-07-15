import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. services: Add revision
    await sql`ALTER TABLE services ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1`.execute(db);

    // 2. stock_movements: Add cost snapshots
    await sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,3)`.execute(db);
    await sql`ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,3)`.execute(db);

    // 3. damaged_stock_records: Add cost snapshots
    await sql`ALTER TABLE damaged_stock_records ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12,3)`.execute(db);
    await sql`ALTER TABLE damaged_stock_records ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,3)`.execute(db);

    // 4. journal_entries: Add unique constraint for round 1 sources to enforce database idempotency
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_round1_uniq
      ON journal_entries(tenant_id, source_type, source_id)
      WHERE source_type IN (
        'inventory_adjustment',
        'damaged_stock',
        'stock_count',
        'service',
        'service_reversal',
        'cashier_shift_variance'
      )
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_journal_entries_round1_uniq`.execute(db);
    await sql`ALTER TABLE damaged_stock_records DROP COLUMN IF EXISTS total_cost`.execute(db);
    await sql`ALTER TABLE damaged_stock_records DROP COLUMN IF EXISTS unit_cost`.execute(db);
    await sql`ALTER TABLE stock_movements DROP COLUMN IF EXISTS total_cost`.execute(db);
    await sql`ALTER TABLE stock_movements DROP COLUMN IF EXISTS unit_cost`.execute(db);
    await sql`ALTER TABLE services DROP COLUMN IF EXISTS revision`.execute(db);
  },
};
