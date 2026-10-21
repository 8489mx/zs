import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. Customs Brokers Registry
  await sql`
    CREATE TABLE IF NOT EXISTS import_customs_brokers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      license_no VARCHAR(100),
      phone VARCHAR(50),
      email VARCHAR(100),
      customs_ports JSONB DEFAULT '["Alexandria", "Dekheila", "Ain Sokhna", "Port Said"]'::jsonb,
      tax_number VARCHAR(50),
      commercial_registry VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_customs_brokers_tenant_name UNIQUE (tenant_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_import_brokers_tenant
      ON import_customs_brokers(tenant_id, is_active);
  `.execute(db);

  // 2. Customs Broker Petty Cash Advances
  await sql`
    CREATE TABLE IF NOT EXISTS import_broker_advances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      broker_id UUID NOT NULL REFERENCES import_customs_brokers(id) ON DELETE RESTRICT,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      advance_no VARCHAR(50) NOT NULL,
      amount_egp NUMERIC(15, 2) NOT NULL,
      disbursement_date DATE NOT NULL DEFAULT CURRENT_DATE,
      payment_method VARCHAR(50) DEFAULT 'bank_transfer',
      treasury_account_id BIGINT REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'active', -- active, settled, partially_settled
      settled_amount_egp NUMERIC(15, 2) DEFAULT 0,
      remaining_amount_egp NUMERIC(15, 2) NOT NULL,
      notes TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_broker_advances_tenant_no UNIQUE (tenant_id, advance_no)
    );

    CREATE INDEX IF NOT EXISTS idx_broker_advances_tenant_broker
      ON import_broker_advances(tenant_id, broker_id, status);
  `.execute(db);

  // 3. Itemized Clearance Expense Liquidation Receipts
  await sql`
    CREATE TABLE IF NOT EXISTS import_broker_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      broker_id UUID NOT NULL REFERENCES import_customs_brokers(id) ON DELETE RESTRICT,
      advance_id UUID REFERENCES import_broker_advances(id) ON DELETE SET NULL,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      receipt_no VARCHAR(100) NOT NULL,
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      category VARCHAR(50) NOT NULL, -- customs_duty, vat, port_fees, demurrage, inspection, broker_fee, transport, other
      amount_egp NUMERIC(15, 2) NOT NULL,
      is_capitalized BOOLEAN DEFAULT TRUE, -- capitalized to landed cost vs period expense
      is_refundable_vat BOOLEAN DEFAULT FALSE, -- 14% VAT claimable from tax authority
      attachment_url TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      verified_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_broker_expenses_tenant_receipt UNIQUE (tenant_id, broker_id, receipt_no)
    );

    CREATE INDEX IF NOT EXISTS idx_broker_expenses_tenant_shipment
      ON import_broker_expenses(tenant_id, shipment_id);
  `.execute(db);

  // 4. Container Security Deposits (Paid to Shipping Lines)
  await sql`
    CREATE TABLE IF NOT EXISTS import_container_deposits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE CASCADE,
      container_no VARCHAR(50) NOT NULL,
      shipping_line VARCHAR(150) NOT NULL,
      deposit_amount_egp NUMERIC(15, 2) NOT NULL,
      payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
      expected_return_date DATE NOT NULL,
      actual_return_date DATE,
      refund_status VARCHAR(50) DEFAULT 'pending', -- pending, refunded, partially_refunded, forfeited
      refunded_amount_egp NUMERIC(15, 2) DEFAULT 0,
      deductions_amount_egp NUMERIC(15, 2) DEFAULT 0,
      deduction_reason TEXT,
      treasury_account_id BIGINT REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_container_deposits_tenant_shipment_container UNIQUE (tenant_id, shipment_id, container_no)
    );

    CREATE INDEX IF NOT EXISTS idx_container_deposits_tenant_status
      ON import_container_deposits(tenant_id, refund_status);
  `.execute(db);

  // 5. Expand import_shipments with Maritime Freight Integration & Lifecycle tracking
  await sql`
    ALTER TABLE import_shipments
      ADD COLUMN IF NOT EXISTS freight_job_id UUID DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES import_customs_brokers(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS container_status VARCHAR(50) DEFAULT 'on_water', -- on_water, port_arrived, customs_cleared, warehouse_received, empty_returned
      ADD COLUMN IF NOT EXISTS gate_out_date DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS unstuffing_date DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS empty_returned_date DATE DEFAULT NULL;
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE import_shipments
      DROP COLUMN IF EXISTS empty_returned_date,
      DROP COLUMN IF EXISTS unstuffing_date,
      DROP COLUMN IF EXISTS gate_out_date,
      DROP COLUMN IF EXISTS container_status,
      DROP COLUMN IF EXISTS broker_id,
      DROP COLUMN IF EXISTS freight_job_id;

    DROP TABLE IF EXISTS import_container_deposits;
    DROP TABLE IF EXISTS import_broker_expenses;
    DROP TABLE IF EXISTS import_broker_advances;
    DROP TABLE IF EXISTS import_customs_brokers;
  `.execute(db);
}
