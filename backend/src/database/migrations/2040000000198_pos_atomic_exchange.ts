import { Kysely, sql } from 'kysely';

export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS exchange_return_id BIGINT`.execute(db);
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_tenant_exchange_return
      ON sales (tenant_id, exchange_return_id) WHERE exchange_return_id IS NOT NULL`.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS uq_sales_tenant_exchange_return`.execute(db);
    await sql`ALTER TABLE sales DROP COLUMN IF EXISTS exchange_return_id`.execute(db);
  },
};
