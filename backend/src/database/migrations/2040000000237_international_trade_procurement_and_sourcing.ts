import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. International RFQs & Factory Quotations Comparison
  await sql`
    CREATE TABLE IF NOT EXISTS import_quotations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      quotation_no VARCHAR(100) NOT NULL,
      inquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expiry_date DATE,
      incoterm VARCHAR(20) DEFAULT 'FOB',
      currency VARCHAR(10) DEFAULT 'USD',
      item_name VARCHAR(255) NOT NULL,
      product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
      unit_price_foreign NUMERIC(15, 4) NOT NULL,
      moq INTEGER DEFAULT 1,
      production_lead_days INTEGER DEFAULT 30,
      port_of_loading VARCHAR(100),
      estimated_freight_usd NUMERIC(12, 2) DEFAULT 0,
      estimated_customs_rate_percent NUMERIC(5, 2) DEFAULT 5.00,
      estimated_landed_cost_egp NUMERIC(15, 4) DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending', -- pending, selected, rejected
      selection_reason TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_import_quotations_tenant_proj
      ON import_quotations(tenant_id, project_id);
    CREATE INDEX IF NOT EXISTS idx_import_quotations_supplier
      ON import_quotations(tenant_id, supplier_id);
  `.execute(db);

  // 2. Product Samples & Reference Sample Approval
  await sql`
    CREATE TABLE IF NOT EXISTS import_sample_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      sample_code VARCHAR(100) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      sample_cost_foreign NUMERIC(12, 2) DEFAULT 0,
      freight_cost_foreign NUMERIC(12, 2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      request_date DATE NOT NULL DEFAULT CURRENT_DATE,
      received_date DATE,
      courier_tracking_no VARCHAR(100),
      quality_score NUMERIC(3, 1), -- e.g. 1.0 to 10.0
      decision VARCHAR(50) DEFAULT 'pending', -- pending, approved_reference, rejected, rework_requested
      reference_sample_approved BOOLEAN DEFAULT FALSE,
      defect_analysis TEXT,
      photo_urls JSONB DEFAULT '[]'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_import_samples_tenant_proj
      ON import_sample_orders(tenant_id, project_id);
  `.execute(db);

  // 3. Enhance Proforma Invoices & Purchase Contracts
  await sql`
    ALTER TABLE import_proforma_invoices
      ADD COLUMN IF NOT EXISTS po_number VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS po_date DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS po_status VARCHAR(50) DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS advance_percentage NUMERIC(5, 2) DEFAULT 30.00,
      ADD COLUMN IF NOT EXISTS balance_percentage NUMERIC(5, 2) DEFAULT 70.00,
      ADD COLUMN IF NOT EXISTS payment_milestones JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;
  `.execute(db);

  // 4. Enhance Import Projects with Feasibility Conversion & Liquidity Scheduling
  await sql`
    ALTER TABLE import_projects
      ADD COLUMN IF NOT EXISTS feasibility_converted_at TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS cash_flow_schedule JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS initial_po_id UUID DEFAULT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE import_projects
      DROP COLUMN IF EXISTS initial_po_id,
      DROP COLUMN IF EXISTS cash_flow_schedule,
      DROP COLUMN IF EXISTS feasibility_converted_at;

    ALTER TABLE import_proforma_invoices
      DROP COLUMN IF EXISTS approved_at,
      DROP COLUMN IF EXISTS approved_by,
      DROP COLUMN IF EXISTS payment_milestones,
      DROP COLUMN IF EXISTS balance_percentage,
      DROP COLUMN IF EXISTS advance_percentage,
      DROP COLUMN IF EXISTS po_status,
      DROP COLUMN IF EXISTS po_date,
      DROP COLUMN IF EXISTS po_number;

    DROP TABLE IF EXISTS import_sample_orders;
    DROP TABLE IF EXISTS import_quotations;
  `.execute(db);
}
