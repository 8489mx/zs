import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS min_selling_price NUMERIC(14, 2) NULL`.execute(db);
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_cashier_shifts_one_open_per_cashier
      ON cashier_shifts (tenant_id, opened_by) WHERE status = 'open'`.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_cashier_shifts_one_open_per_cashier`.execute(db);
    await sql`ALTER TABLE products DROP COLUMN IF EXISTS min_selling_price`.execute(db);
  },
};
