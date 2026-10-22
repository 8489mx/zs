import { Kysely, sql } from 'kysely';
/** Original deposits are immutable; partial cash refunds have individually unique journal sources. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE import_container_preorders
      ADD COLUMN IF NOT EXISTS refunded_amount_egp NUMERIC(15,2) NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS import_preorder_refund_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      serial_id BIGSERIAL UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      preorder_id UUID NOT NULL REFERENCES import_container_preorders(id) ON DELETE RESTRICT,
      idempotency_key VARCHAR(128) NOT NULL,
      amount_egp NUMERIC(15,2) NOT NULL CHECK (amount_egp > 0),
      treasury_account_id BIGINT NOT NULL REFERENCES accounting_accounts(id) ON DELETE RESTRICT,
      journal_entry_id BIGINT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, preorder_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS idx_import_preorder_refunds ON import_preorder_refund_events(tenant_id, preorder_id);
  `.execute(db);
}
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS import_preorder_refund_events;
    ALTER TABLE import_container_preorders DROP COLUMN IF EXISTS refunded_amount_egp;`.execute(db);
}
