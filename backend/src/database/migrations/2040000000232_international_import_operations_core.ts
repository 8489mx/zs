import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Projects Table
  await sql`
    CREATE TABLE IF NOT EXISTS import_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_no VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      target_market VARCHAR(100) DEFAULT 'Egypt',
      country_origin VARCHAR(100) DEFAULT 'China',
      country_destination VARCHAR(100) DEFAULT 'Egypt',
      budget_currency VARCHAR(10) DEFAULT 'USD',
      allocated_capital NUMERIC(15, 2) DEFAULT 0,
      target_roi_percentage NUMERIC(5, 2) DEFAULT 25.00,
      status VARCHAR(50) DEFAULT 'feasibility',
      feasibility_data JSONB DEFAULT '{}'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_projects_tenant_project_no UNIQUE (tenant_id, project_no)
    );

    CREATE INDEX IF NOT EXISTS idx_import_projects_tenant_status
      ON import_projects(tenant_id, status);
  `.execute(db);

  // 2. Project Partners Allocation
  await sql`
    CREATE TABLE IF NOT EXISTS import_project_partners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES import_projects(id) ON DELETE CASCADE,
      partner_id UUID NOT NULL REFERENCES import_partners(id) ON DELETE CASCADE,
      capital_share_amount NUMERIC(15, 2) DEFAULT 0,
      profit_percentage NUMERIC(5, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_project_partners UNIQUE (tenant_id, project_id, partner_id)
    );
  `.execute(db);

  // 3. Factory / Supplier China Metadata
  await sql`
    CREATE TABLE IF NOT EXISTS import_suppliers_meta (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      chinese_name VARCHAR(255),
      city VARCHAR(100),
      province VARCHAR(100),
      moq_description TEXT,
      production_lead_time_days INTEGER DEFAULT 30,
      verified_bank_details JSONB DEFAULT '{}'::jsonb,
      incoterms_accepted JSONB DEFAULT '["FOB", "EXW", "CIF"]'::jsonb,
      qc_rating NUMERIC(3, 1) DEFAULT 5.0,
      quality_certifications JSONB DEFAULT '[]'::jsonb,
      audit_status VARCHAR(50) DEFAULT 'verified',
      notes TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_suppliers_meta UNIQUE (tenant_id, supplier_id)
    );
  `.execute(db);

  // 4. Sourcing Trips
  await sql`
    CREATE TABLE IF NOT EXISTS import_sourcing_trips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      trip_title VARCHAR(255) NOT NULL,
      destination_city VARCHAR(100) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      budget_egp NUMERIC(12, 2) DEFAULT 0,
      actual_cost_egp NUMERIC(12, 2) DEFAULT 0,
      notes TEXT,
      findings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `.execute(db);

  // 5. Proforma Invoices & Purchase Contracts
  await sql`
    CREATE TABLE IF NOT EXISTS import_proforma_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      pi_number VARCHAR(100) NOT NULL,
      pi_date DATE NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      total_amount_foreign NUMERIC(15, 2) NOT NULL,
      incoterm VARCHAR(20) DEFAULT 'FOB',
      delivery_port VARCHAR(100),
      payment_terms VARCHAR(255),
      exchange_rate_contract NUMERIC(10, 4),
      status VARCHAR(50) DEFAULT 'draft',
      notes TEXT,
      items JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `.execute(db);

  // 6. QC Inspections & Production Milestones
  await sql`
    CREATE TABLE IF NOT EXISTS import_qc_inspections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      stage VARCHAR(50) NOT NULL,
      inspection_date DATE NOT NULL,
      inspector_name VARCHAR(150),
      sample_size INTEGER DEFAULT 0,
      passed_quantity INTEGER DEFAULT 0,
      failed_quantity INTEGER DEFAULT 0,
      defect_notes TEXT,
      status VARCHAR(50) DEFAULT 'passed',
      report_file_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `.execute(db);

  // 7. ACI / ACID Compliance
  await sql`
    CREATE TABLE IF NOT EXISTS import_aci_compliance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      acid_number VARCHAR(50) NOT NULL,
      acid_issue_date DATE,
      acid_expiry_date DATE,
      cargox_document_id VARCHAR(100),
      importer_tax_number VARCHAR(50),
      exporter_id VARCHAR(100),
      status VARCHAR(50) DEFAULT 'pending',
      compliance_checklist JSONB DEFAULT '{}'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `.execute(db);

  // 8. Expand import_shipments
  await sql`
    ALTER TABLE import_shipments
      ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS freight_type VARCHAR(20) DEFAULT 'FCL',
      ADD COLUMN IF NOT EXISTS container_size VARCHAR(20) DEFAULT '40HQ',
      ADD COLUMN IF NOT EXISTS port_of_loading VARCHAR(100) DEFAULT 'Ningbo',
      ADD COLUMN IF NOT EXISTS port_of_discharge VARCHAR(100) DEFAULT 'Alexandria',
      ADD COLUMN IF NOT EXISTS cbm_volume NUMERIC(10, 3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gross_weight_kg NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS free_demurrage_days INTEGER DEFAULT 14,
      ADD COLUMN IF NOT EXISTS demurrage_start_date DATE,
      ADD COLUMN IF NOT EXISTS demurrage_rate_per_day NUMERIC(10, 2) DEFAULT 50.00,
      ADD COLUMN IF NOT EXISTS actual_demurrage_fees NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS customs_declaration_no VARCHAR(100),
      ADD COLUMN IF NOT EXISTS vat_refundable_egp NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_consolidated BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS cost_allocation_method VARCHAR(50) DEFAULT 'value';
  `.execute(db);

  // 9. Egypt Customs Tariffs & HS Code Reference
  await sql`
    CREATE TABLE IF NOT EXISTS import_customs_tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      hs_code VARCHAR(50) NOT NULL,
      description_ar VARCHAR(255) NOT NULL,
      description_en VARCHAR(255),
      duty_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
      vat_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 14.00,
      regulatory_body VARCHAR(100),
      inspection_fees_percent NUMERIC(5, 2) DEFAULT 1.00,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_customs_tariffs UNIQUE (tenant_id, hs_code)
    );

    CREATE INDEX IF NOT EXISTS idx_import_customs_tariffs_hs
      ON import_customs_tariffs(tenant_id, hs_code);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS import_customs_tariffs;

    ALTER TABLE import_shipments
      DROP COLUMN IF EXISTS cost_allocation_method,
      DROP COLUMN IF EXISTS is_consolidated,
      DROP COLUMN IF EXISTS vat_refundable_egp,
      DROP COLUMN IF EXISTS customs_declaration_no,
      DROP COLUMN IF EXISTS actual_demurrage_fees,
      DROP COLUMN IF EXISTS demurrage_rate_per_day,
      DROP COLUMN IF EXISTS demurrage_start_date,
      DROP COLUMN IF EXISTS free_demurrage_days,
      DROP COLUMN IF EXISTS carrier_name,
      DROP COLUMN IF EXISTS gross_weight_kg,
      DROP COLUMN IF EXISTS cbm_volume,
      DROP COLUMN IF EXISTS port_of_discharge,
      DROP COLUMN IF EXISTS port_of_loading,
      DROP COLUMN IF EXISTS container_size,
      DROP COLUMN IF EXISTS freight_type,
      DROP COLUMN IF EXISTS project_id;

    DROP TABLE IF EXISTS import_aci_compliance;
    DROP TABLE IF EXISTS import_qc_inspections;
    DROP TABLE IF EXISTS import_proforma_invoices;
    DROP TABLE IF EXISTS import_sourcing_trips;
    DROP TABLE IF EXISTS import_suppliers_meta;
    DROP TABLE IF EXISTS import_project_partners;
    DROP TABLE IF EXISTS import_projects;
  `.execute(db);
}
