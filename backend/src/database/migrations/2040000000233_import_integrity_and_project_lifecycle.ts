import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Enhance import_projects with audited closure snapshot
  await sql`
    ALTER TABLE import_projects
      ADD COLUMN IF NOT EXISTS closure_data JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS closure_date TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS closed_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
  `.execute(db);

  // 2. Enhance import_project_partners with audit/effective dates
  await sql`
    ALTER TABLE import_project_partners
      ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
  `.execute(db);

  // 3. Enhance import_suppliers_meta: default audit_status must be 'unverified'
  await sql`
    ALTER TABLE import_suppliers_meta
      ALTER COLUMN audit_status SET DEFAULT 'unverified',
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS verification_notes TEXT DEFAULT NULL;
  `.execute(db);

  // 4. Enhance import_customs_tariffs with official audit metadata (default is_official = FALSE)
  await sql`
    ALTER TABLE import_customs_tariffs
      ADD COLUMN IF NOT EXISTS official_source VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT FALSE;
  `.execute(db);

  // 5. Enhance import_shipments with late expenses tracking
  await sql`
    ALTER TABLE import_shipments
      ADD COLUMN IF NOT EXISTS late_expenses_total_egp NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS late_cogs_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS late_inventory_adjustment_egp NUMERIC(12, 2) DEFAULT 0;
  `.execute(db);

  // 6. Enhance import_proforma_invoices with settlement status
  await sql`
    ALTER TABLE import_proforma_invoices
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid',
      ADD COLUMN IF NOT EXISTS paid_amount_foreign NUMERIC(15, 2) DEFAULT 0;
  `.execute(db);

  // 7. Enhance supplier_payments with multi-currency & FX tracking
  await sql`
    ALTER TABLE supplier_payments
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'EGP',
      ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1.0000,
      ADD COLUMN IF NOT EXISTS forex_variance_egp NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS proforma_invoice_id UUID REFERENCES import_proforma_invoices(id) ON DELETE SET NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE supplier_payments
      DROP COLUMN IF EXISTS proforma_invoice_id,
      DROP COLUMN IF EXISTS forex_variance_egp,
      DROP COLUMN IF EXISTS exchange_rate,
      DROP COLUMN IF EXISTS currency;

    ALTER TABLE import_proforma_invoices
      DROP COLUMN IF EXISTS paid_amount_foreign,
      DROP COLUMN IF EXISTS payment_status;

    ALTER TABLE import_shipments
      DROP COLUMN IF EXISTS late_inventory_adjustment_egp,
      DROP COLUMN IF EXISTS late_cogs_adjustment_egp,
      DROP COLUMN IF EXISTS late_expenses_total_egp;

    ALTER TABLE import_customs_tariffs
      DROP COLUMN IF EXISTS is_official,
      DROP COLUMN IF EXISTS effective_date,
      DROP COLUMN IF EXISTS official_source;

    ALTER TABLE import_suppliers_meta
      DROP COLUMN IF EXISTS verification_notes,
      DROP COLUMN IF EXISTS verified_by,
      DROP COLUMN IF EXISTS verified_at;

    ALTER TABLE import_project_partners
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS effective_from;

    ALTER TABLE import_projects
      DROP COLUMN IF EXISTS closed_by,
      DROP COLUMN IF EXISTS closure_date,
      DROP COLUMN IF EXISTS closure_data;
  `.execute(db);
}
