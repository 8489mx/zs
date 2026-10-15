import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS pager_number VARCHAR(50);

    ALTER TABLE online_orders
    ADD COLUMN IF NOT EXISTS pager_number VARCHAR(50);

    CREATE INDEX IF NOT EXISTS idx_sales_pager_number
      ON sales (tenant_id, pager_number)
      WHERE pager_number IS NOT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS idx_sales_pager_number;
    ALTER TABLE sales DROP COLUMN IF EXISTS pager_number;
    ALTER TABLE online_orders DROP COLUMN IF EXISTS pager_number;
  `.execute(db);
}
