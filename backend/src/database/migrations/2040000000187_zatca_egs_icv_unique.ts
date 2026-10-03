import { sql, type Kysely } from 'kysely';

/** A device may issue each cryptographic invoice counter only once per tenant. */
export const migration = {
  async up(db: Kysely<unknown>): Promise<void> {
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_zatca_tenant_egs_icv
      ON sales (tenant_id, zatca_egs_id, zatca_icv)
      WHERE zatca_egs_id IS NOT NULL AND zatca_icv IS NOT NULL
    `.execute(db);
  },
  async down(db: Kysely<unknown>): Promise<void> {
    await sql`DROP INDEX IF EXISTS uq_sales_zatca_tenant_egs_icv`.execute(db);
  },
};
