import { Kysely, sql } from 'kysely';

/** Real numeric source documents for accrued import late expenses, including wholly capitalized costs. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS import_late_expense_events (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      total_amount_egp NUMERIC(15, 2) NOT NULL,
      inventory_amount_egp NUMERIC(15, 2) NOT NULL,
      cogs_amount_egp NUMERIC(15, 2) NOT NULL,
      journal_entry_id BIGINT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT chk_import_late_amounts CHECK (
        total_amount_egp > 0 AND inventory_amount_egp >= 0 AND cogs_amount_egp >= 0
        AND abs((inventory_amount_egp + cogs_amount_egp) - total_amount_egp) <= 0.02
      )
    );
    CREATE INDEX IF NOT EXISTS idx_import_late_events_tenant_shipment
      ON import_late_expense_events(tenant_id, shipment_id, id);
  `.execute(db);
}
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS import_late_expense_events;`.execute(db);
}
