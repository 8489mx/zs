import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_selling_price NUMERIC(14, 2) NULL`.execute(db);

    // Auto-close duplicate open shifts for the same cashier, keeping only the most recent one open
    await sql`
      UPDATE cashier_shifts
      SET status = 'closed', closed_at = NOW(), close_note = 'Auto-closed duplicate shift prior to unique index enforcement'
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, opened_by ORDER BY created_at DESC, id DESC) as rn
          FROM cashier_shifts
          WHERE status = 'open'
        ) sub WHERE rn > 1
      )
    `.execute(db);

    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_shifts_one_open_per_cashier
      ON cashier_shifts (tenant_id, opened_by) WHERE status = 'open'`.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_cashier_shifts_one_open_per_cashier`.execute(db);
    await sql`ALTER TABLE products DROP COLUMN IF EXISTS min_selling_price`.execute(db);
  },
};
