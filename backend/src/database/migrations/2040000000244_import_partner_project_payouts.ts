import { Kysely, sql } from 'kysely';

/** Immutable project-linked partner payouts. Legacy unmapped payouts are not silently allocated. */
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS import_partner_project_payouts (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      partner_id UUID NOT NULL REFERENCES import_partners(id) ON DELETE RESTRICT,
      project_id UUID NOT NULL REFERENCES import_projects(id) ON DELETE RESTRICT,
      treasury_transaction_id BIGINT NOT NULL REFERENCES treasury_transactions(id) ON DELETE RESTRICT,
      amount_egp NUMERIC(15, 2) NOT NULL CHECK (amount_egp > 0),
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, treasury_transaction_id)
    );
    CREATE INDEX IF NOT EXISTS idx_import_payout_project_partner
      ON import_partner_project_payouts(tenant_id, project_id, partner_id);
  `.execute(db);
}
export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP TABLE IF EXISTS import_partner_project_payouts`.execute(db);
}
