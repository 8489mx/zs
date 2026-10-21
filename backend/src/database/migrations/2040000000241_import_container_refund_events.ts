import { Kysely, sql } from 'kysely';
/** Append-only, individually addressable refund events; leaves historical deposit balances unchanged. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS import_container_refund_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      serial_id BIGSERIAL UNIQUE NOT NULL,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      deposit_id UUID NOT NULL REFERENCES import_container_deposits(id) ON DELETE RESTRICT,
      idempotency_key VARCHAR(128) NOT NULL,
      refunded_amount_egp NUMERIC(15, 2) NOT NULL DEFAULT 0,
      deductions_amount_egp NUMERIC(15, 2) NOT NULL DEFAULT 0,
      treasury_account_id BIGINT REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      journal_entry_id BIGINT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_import_refund_event_key UNIQUE (tenant_id, deposit_id, idempotency_key),
      CONSTRAINT chk_import_refund_positive CHECK (
        refunded_amount_egp >= 0 AND deductions_amount_egp >= 0
        AND refunded_amount_egp + deductions_amount_egp > 0
      )
    );
    CREATE INDEX IF NOT EXISTS idx_import_refund_events_deposit
      ON import_container_refund_events(tenant_id, deposit_id, serial_id);
  `.execute(db);
}
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS import_container_refund_events;`.execute(db);
}
