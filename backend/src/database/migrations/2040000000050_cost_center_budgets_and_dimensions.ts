import { sql, type Kysely } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    // 1. Add dimension & budget_amount to cost_centers
    await sql`
      ALTER TABLE cost_centers 
      ADD COLUMN IF NOT EXISTS dimension TEXT NOT NULL DEFAULT 'operational',
      ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(15, 4) NOT NULL DEFAULT 0;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cost_centers_dimension 
      ON cost_centers (tenant_id, dimension);
    `.execute(db);

    // 2. Add cost_center_id to expenses table
    await sql`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS cost_center_id BIGINT NULL REFERENCES cost_centers(id) ON DELETE SET NULL;
    `.execute(db);

    await sql`
      CREATE INDEX IF NOT EXISTS idx_expenses_cost_center 
      ON expenses (tenant_id, cost_center_id) 
      WHERE cost_center_id IS NOT NULL;
    `.execute(db);
  },

  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS idx_expenses_cost_center;`.execute(db);
    await sql`ALTER TABLE expenses DROP COLUMN IF EXISTS cost_center_id;`.execute(db);
    await sql`DROP INDEX IF EXISTS idx_cost_centers_dimension;`.execute(db);
    await sql`ALTER TABLE cost_centers DROP COLUMN IF EXISTS budget_amount;`.execute(db);
    await sql`ALTER TABLE cost_centers DROP COLUMN IF EXISTS dimension;`.execute(db);
  },
};
