import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Add idempotency_key column to supplier_payments to guarantee atomic deduplication
  await sql`
    ALTER TABLE supplier_payments
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_payments_tenant_idempotency
      ON supplier_payments(tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP INDEX IF EXISTS idx_supplier_payments_tenant_idempotency;
    ALTER TABLE supplier_payments DROP COLUMN IF EXISTS idempotency_key;
  `.execute(db);
}
