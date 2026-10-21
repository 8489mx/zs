import { Kysely, sql } from 'kysely';

/**
 * Immutable cash-refund and late-expense source documents. Each GL posting gets
 * its own durable BIGINT source_id; a deposit's header serial is NOT a refund ID.
 * No legacy rows are altered, and existing unlocated lots are NOT guessed.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS import_container_refund_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      serial_id BIGSERIAL UNIQUE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      deposit_id UUID NOT NULL REFERENCES import_container_deposits(id) ON DELETE RESTRICT,
      idempotency_key VARCHAR(128) NOT NULL,
      refunded_amount_egp NUMERIC(15, 2) NOT NULL CHECK (refunded_amount_egp >= 0),
      deductions_amount_egp NUMERIC(15, 2) NOT NULL CHECK (deductions_amount_egp >= 0),
      actual_return_date DATE NOT NULL,
      treasury_transaction_id BIGINT,
      journal_entry_id BIGINT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_import_refund_key UNIQUE (tenant_id, idempotency_key),
      CONSTRAINT ck_import_refund_positive CHECK (refunded_amount_egp + deductions_amount_egp > 0)
    );
    CREATE INDEX IF NOT EXISTS idx_import_refunds_deposit ON import_container_refund_events (tenant_id, deposit_id, created_at);

    CREATE TABLE IF NOT EXISTS import_late_expense_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      serial_id BIGSERIAL UNIQUE,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE RESTRICT,
      idempotency_key VARCHAR(128),
      title TEXT NOT NULL,
      amount_egp NUMERIC(15, 2) NOT NULL CHECK (amount_egp > 0),
      cogs_adjustment_egp NUMERIC(15, 2) NOT NULL DEFAULT 0,
      inventory_adjustment_egp NUMERIC(15, 2) NOT NULL DEFAULT 0,
      journal_entry_id BIGINT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS uq_import_late_expense_key
      ON import_late_expense_documents (tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL;

    ALTER TABLE import_shipments ADD COLUMN IF NOT EXISTS receipt_location_id BIGINT;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE import_shipments DROP COLUMN IF EXISTS receipt_location_id;
    DROP TABLE IF EXISTS import_late_expense_documents;
    DROP TABLE IF EXISTS import_container_refund_events;
  `.execute(db);
}
