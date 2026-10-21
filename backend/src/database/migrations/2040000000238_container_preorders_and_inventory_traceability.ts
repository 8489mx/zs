import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // 1. In-Transit Container Pre-orders & Customer Allotments
  await sql`
    CREATE TABLE IF NOT EXISTS import_container_preorders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      preorder_no VARCHAR(50) NOT NULL,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE CASCADE,
      customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      reserved_quantity NUMERIC(12, 2) NOT NULL,
      unit_price_egp NUMERIC(15, 2) NOT NULL,
      total_price_egp NUMERIC(15, 2) NOT NULL,
      deposit_amount_egp NUMERIC(15, 2) NOT NULL DEFAULT 0,
      deposit_treasury_account_id BIGINT REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'reserved', -- reserved, allocated, invoiced, cancelled
      sale_invoice_id BIGINT,
      expected_delivery_date DATE,
      notes TEXT,
      created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_preorders_no UNIQUE (tenant_id, preorder_no)
    );

    CREATE INDEX IF NOT EXISTS idx_import_preorders_tenant_shipment
      ON import_container_preorders(tenant_id, shipment_id, status);
    CREATE INDEX IF NOT EXISTS idx_import_preorders_tenant_customer
      ON import_container_preorders(tenant_id, customer_id);
  `.execute(db);

  // 2. Operational Inventory Lots for Strict Container-to-Sale Traceability
  // (Maintains WAC on the General Ledger, while tracking operational source profitability)
  await sql`
    CREATE TABLE IF NOT EXISTS import_inventory_lots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      lot_number VARCHAR(100) NOT NULL,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE CASCADE,
      shipment_item_id UUID REFERENCES import_shipment_items(id) ON DELETE SET NULL,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      location_id BIGINT,
      initial_quantity NUMERIC(12, 2) NOT NULL,
      remaining_quantity NUMERIC(12, 2) NOT NULL,
      unit_landed_cost_egp NUMERIC(15, 4) NOT NULL,
      status VARCHAR(50) DEFAULT 'active', -- active, depleted
      receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_inventory_lots_no UNIQUE (tenant_id, lot_number)
    );

    CREATE INDEX IF NOT EXISTS idx_import_lots_tenant_prod_status
      ON import_inventory_lots(tenant_id, product_id, status);
    CREATE INDEX IF NOT EXISTS idx_import_lots_tenant_shipment
      ON import_inventory_lots(tenant_id, shipment_id);
  `.execute(db);

  // 3. Sales Allocations to Import Lots (Auditable connection from sale invoice lines to import source)
  await sql`
    CREATE TABLE IF NOT EXISTS import_sale_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      sale_id BIGINT NOT NULL,
      sale_item_id BIGINT,
      lot_id UUID NOT NULL REFERENCES import_inventory_lots(id) ON DELETE RESTRICT,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      shipment_id UUID REFERENCES import_shipments(id) ON DELETE SET NULL,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity NUMERIC(12, 2) NOT NULL,
      unit_sale_price_egp NUMERIC(15, 2) NOT NULL,
      unit_cost_egp NUMERIC(15, 4) NOT NULL,
      gross_margin_egp NUMERIC(15, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_sale_alloc_tenant_lot
      ON import_sale_allocations(tenant_id, lot_id);
    CREATE INDEX IF NOT EXISTS idx_sale_alloc_tenant_proj
      ON import_sale_allocations(tenant_id, project_id);
  `.execute(db);

  // 4. Item-Level Multi-Modal Landed Cost Metrics
  await sql`
    ALTER TABLE import_shipment_items
      ADD COLUMN IF NOT EXISTS gross_weight_kg_unit NUMERIC(10, 3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cbm_unit NUMERIC(10, 4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_cbm NUMERIC(12, 3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS allocated_duty_egp NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS allocated_freight_egp NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS allocated_other_expenses_egp NUMERIC(12, 2) DEFAULT 0;
  `.execute(db);

  // 5. FX Acquisitions Desk
  await sql`
    CREATE TABLE IF NOT EXISTS import_fx_acquisitions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      currency VARCHAR(10) NOT NULL,
      foreign_amount NUMERIC(15, 2) NOT NULL,
      egp_cost NUMERIC(15, 2) NOT NULL,
      effective_exchange_rate NUMERIC(10, 4) NOT NULL,
      acquisition_date DATE NOT NULL DEFAULT CURRENT_DATE,
      source VARCHAR(50) DEFAULT 'bank', -- bank, partner_contribution, market
      bank_account_id BIGINT REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_import_fx_tenant_curr
      ON import_fx_acquisitions(tenant_id, currency);
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TABLE IF EXISTS import_fx_acquisitions;

    ALTER TABLE import_shipment_items
      DROP COLUMN IF EXISTS allocated_other_expenses_egp,
      DROP COLUMN IF EXISTS allocated_freight_egp,
      DROP COLUMN IF EXISTS allocated_duty_egp,
      DROP COLUMN IF EXISTS total_cbm,
      DROP COLUMN IF EXISTS total_weight_kg,
      DROP COLUMN IF EXISTS cbm_unit,
      DROP COLUMN IF EXISTS gross_weight_kg_unit;

    DROP TABLE IF EXISTS import_sale_allocations;
    DROP TABLE IF EXISTS import_inventory_lots;
    DROP TABLE IF EXISTS import_container_preorders;
  `.execute(db);
}
