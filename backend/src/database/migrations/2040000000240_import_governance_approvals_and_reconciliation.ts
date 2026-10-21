import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Unified Import Document Center
  await sql`
    CREATE TABLE IF NOT EXISTS import_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      document_type VARCHAR(50) NOT NULL, -- commercial_invoice, packing_list, ocean_bl, certificate_of_origin, acid_certificate, form_4, customs_receipt, inspection_report, bank_swift, other
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_size_bytes BIGINT DEFAULT 0,
      mime_type VARCHAR(100),
      issue_date DATE,
      expiry_date DATE,
      is_verified BOOLEAN DEFAULT FALSE,
      verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMPTZ,
      notes TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_import_docs_tenant_proj
      ON import_documents(tenant_id, project_id);
    CREATE INDEX IF NOT EXISTS idx_import_docs_tenant_shipment
      ON import_documents(tenant_id, shipment_id);
  `.execute(db);

  // 2. Maker-Checker Approvals for Sensitive Import Operations
  await sql`
    CREATE TABLE IF NOT EXISTS import_approval_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      module VARCHAR(50) DEFAULT 'import',
      action_type VARCHAR(50) NOT NULL, -- supplier_bank_change, large_transfer, broker_settlement, partner_distribution, project_closure
      reference_id VARCHAR(100) NOT NULL,
      requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
      request_payload JSONB DEFAULT '{}'::jsonb,
      rejection_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      decided_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_import_approvals_tenant_status
      ON import_approval_requests(tenant_id, status);
  `.execute(db);

  // 3. Automated Reconciliation Exceptions Center
  await sql`
    CREATE TABLE IF NOT EXISTS import_reconciliation_exceptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      exception_type VARCHAR(50) NOT NULL, -- supplier_ledger_mismatch, customer_balance_mismatch, inventory_variance, broker_advance_mismatch, partner_equity_mismatch, unrecorded_customs_expense
      severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      discrepancy_amount_egp NUMERIC(15, 2) DEFAULT 0,
      details JSONB DEFAULT '{}'::jsonb,
      status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, dismissed
      resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      resolution_notes TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_import_exceptions_tenant_status
      ON import_reconciliation_exceptions(tenant_id, status);
  `.execute(db);

  // 4. Partner Roles and Cumulative Equity Ledger Summary
  await sql`
    ALTER TABLE import_partners
      ADD COLUMN IF NOT EXISTS partner_role VARCHAR(50) DEFAULT 'financial', -- financial, managing, procurement, distribution
      ADD COLUMN IF NOT EXISTS total_contributed_capital NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_withdrawn_capital NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_approved_profits NUMERIC(15, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_disbursed_profits NUMERIC(15, 2) DEFAULT 0;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE import_partners
      DROP COLUMN IF EXISTS total_disbursed_profits,
      DROP COLUMN IF EXISTS total_approved_profits,
      DROP COLUMN IF EXISTS total_withdrawn_capital,
      DROP COLUMN IF EXISTS total_contributed_capital,
      DROP COLUMN IF EXISTS partner_role;

    DROP TABLE IF EXISTS import_reconciliation_exceptions;
    DROP TABLE IF EXISTS import_approval_requests;
    DROP TABLE IF EXISTS import_documents;
  `.execute(db);
}
