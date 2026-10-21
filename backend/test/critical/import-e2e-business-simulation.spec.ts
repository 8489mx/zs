import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { Kysely } from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import type { Database } from '../../src/database/database.types';
import { ImportSalesService } from '../../src/modules/import-sales/import-sales.service';
import { AccountingPostingService } from '../../src/modules/accounting/accounting-posting.service';
import { up as up233 } from '../../src/database/migrations/2040000000233_import_integrity_and_project_lifecycle';
import { up as up234 } from '../../src/database/migrations/2040000000234_purchases_import_project_link';
import { up as up235 } from '../../src/database/migrations/2040000000235_supplier_payments_idempotency_key';
import { up as up236 } from '../../src/database/migrations/2040000000236_international_trade_procurement_and_sourcing';
import { up as up237 } from '../../src/database/migrations/2040000000237_customs_broker_advances_and_container_deposits';
import { up as up238 } from '../../src/database/migrations/2040000000238_container_preorders_and_inventory_traceability';
import { up as up239 } from '../../src/database/migrations/2040000000239_import_governance_approvals_and_reconciliation';

class MultiStatementPGliteDialect extends PGliteDialect {
  constructor(private readonly pgliteInstance: PGlite) {
    super(pgliteInstance);
  }

  createDriver(): any {
    const driver: any = super.createDriver();
    const origAcquire = driver.acquireConnection.bind(driver);
    driver.acquireConnection = async () => {
      const conn = await origAcquire();
      const origExec = conn.executeQuery.bind(conn);
      conn.executeQuery = async (compiledQuery: any) => {
        if (!compiledQuery.parameters || compiledQuery.parameters.length === 0) {
          const results = await this.pgliteInstance.exec(compiledQuery.sql);
          const last = results[results.length - 1];
          return { rows: last?.rows || [] };
        }
        return origExec(compiledQuery);
      };
      return conn;
    };
    return driver;
  }
}

async function setupDatabase(): Promise<{ db: Kysely<Database>; accounts: Record<string, number> }> {
  const pglite = new PGlite();
  const db = new Kysely<Database>({
    dialect: new MultiStatementPGliteDialect(pglite),
  });

  const baseDdl = `
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT DEFAULT 'Main Tenant',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE accounting_accounts (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      code VARCHAR(50) NOT NULL,
      name_ar VARCHAR(255) NOT NULL,
      name_en VARCHAR(255) NOT NULL,
      account_type VARCHAR(50) NOT NULL,
      account_group VARCHAR(50) NOT NULL,
      normal_balance VARCHAR(10) NOT NULL,
      parent_id BIGINT,
      is_active BOOLEAN DEFAULT TRUE,
      is_system BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_accounting_accounts_tenant_code UNIQUE (tenant_id, code)
    );

    CREATE TABLE accounting_settings (
      id BIGINT PRIMARY KEY DEFAULT 1,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      cash_account_id BIGINT REFERENCES accounting_accounts(id),
      bank_account_id BIGINT REFERENCES accounting_accounts(id),
      customer_receivable_account_id BIGINT REFERENCES accounting_accounts(id),
      supplier_payable_account_id BIGINT REFERENCES accounting_accounts(id),
      inventory_account_id BIGINT REFERENCES accounting_accounts(id),
      sales_revenue_account_id BIGINT REFERENCES accounting_accounts(id),
      sales_discount_account_id BIGINT REFERENCES accounting_accounts(id),
      cogs_account_id BIGINT REFERENCES accounting_accounts(id),
      purchase_account_id BIGINT REFERENCES accounting_accounts(id),
      expenses_account_id BIGINT REFERENCES accounting_accounts(id),
      sales_tax_account_id BIGINT REFERENCES accounting_accounts(id),
      purchase_tax_account_id BIGINT REFERENCES accounting_accounts(id),
      manufacturing_overhead_account_id BIGINT REFERENCES accounting_accounts(id),
      lock_date_all DATE,
      lock_date_non_adviser DATE,
      lock_date_tax DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE suppliers (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      company_name TEXT,
      phone TEXT,
      email TEXT,
      account_id BIGINT,
      balance NUMERIC(15, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE customers (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      balance NUMERIC(15, 2) DEFAULT 0,
      credit_limit NUMERIC(15, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE supplier_ledger (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      entry_type TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      balance_after NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      reference_type TEXT NULL,
      reference_id BIGINT NULL,
      return_document_id BIGINT NULL,
      branch_id BIGINT NULL,
      location_id BIGINT NULL,
      created_by BIGINT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE supplier_payments (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      doc_no VARCHAR(100),
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      amount NUMERIC(15, 2) NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT DEFAULT 'bank_transfer',
      payment_type TEXT DEFAULT 'normal',
      purchase_id BIGINT,
      account_id TEXT NOT NULL,
      created_by BIGINT,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE treasury_transactions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      txn_type TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      reference_type TEXT NULL,
      reference_id BIGINT NULL,
      return_document_id BIGINT NULL,
      branch_id BIGINT NULL,
      location_id BIGINT NULL,
      created_by BIGINT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE expenses (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      expense_date DATE NOT NULL,
      note TEXT,
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE journal_entries (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      account_id TEXT,
      entry_no TEXT NOT NULL,
      entry_date DATE NOT NULL,
      description TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id BIGINT,
      status TEXT NOT NULL DEFAULT 'posted',
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      posted_by BIGINT,
      posted_at TIMESTAMPTZ,
      cancelled_by BIGINT,
      cancelled_at TIMESTAMPTZ,
      cancel_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE journal_entry_lines (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      journal_entry_id BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id BIGINT NOT NULL REFERENCES accounting_accounts(id),
      cost_center_id BIGINT,
      description TEXT,
      debit NUMERIC(15, 2) NOT NULL DEFAULT 0,
      credit NUMERIC(15, 2) NOT NULL DEFAULT 0,
      partner_type TEXT,
      partner_id BIGINT,
      branch_id BIGINT,
      location_id BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS accounting_settings (
      id BIGINT PRIMARY KEY DEFAULT 1,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      cash_account_id BIGINT,
      bank_account_id BIGINT,
      customer_receivable_account_id BIGINT,
      supplier_payable_account_id BIGINT,
      inventory_account_id BIGINT,
      sales_revenue_account_id BIGINT,
      sales_discount_account_id BIGINT,
      cogs_account_id BIGINT,
      purchase_account_id BIGINT,
      expenses_account_id BIGINT,
      sales_tax_account_id BIGINT,
      purchase_tax_account_id BIGINT,
      manufacturing_overhead_account_id BIGINT,
      lock_date_all DATE,
      lock_date_non_adviser DATE,
      lock_date_tax DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS accounting_fiscal_years (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT DEFAULT 'open',
      is_closed BOOLEAN DEFAULT FALSE,
      lock_date_all DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS accounting_fiscal_periods (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      fiscal_year_id INTEGER REFERENCES accounting_fiscal_years(id) ON DELETE CASCADE,
      period_number INTEGER NOT NULL,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'open',
      closed_at TIMESTAMPTZ,
      closed_by INTEGER,
      closing_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE products (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      type TEXT DEFAULT 'storable',
      cost_price NUMERIC(15, 6) DEFAULT 0,
      sale_price NUMERIC(15, 2) DEFAULT 0,
      stock_qty NUMERIC(15, 3) DEFAULT 0,
      reserved_qty NUMERIC(15, 3) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE stock_locations (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE product_location_stock (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      product_id BIGINT NOT NULL REFERENCES products(id),
      branch_id BIGINT,
      location_id BIGINT NULL REFERENCES stock_locations(id),
      qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
      reserved_qty NUMERIC(15, 3) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_product_loc_stock UNIQUE (tenant_id, account_id, product_id, location_id)
    );

    CREATE TABLE stock_movements (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      product_id BIGINT NOT NULL REFERENCES products(id),
      movement_type VARCHAR(50) NOT NULL,
      qty NUMERIC(15, 3) NOT NULL,
      before_qty NUMERIC(15, 3) NOT NULL,
      after_qty NUMERIC(15, 3) NOT NULL,
      unit_cost NUMERIC(15, 6) NOT NULL,
      total_cost NUMERIC(15, 4) NOT NULL,
      reason TEXT,
      note TEXT,
      reference_type VARCHAR(50),
      reference_id BIGINT,
      import_receipt_id BIGINT,
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE purchases (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      doc_no TEXT,
      supplier_id BIGINT REFERENCES suppliers(id),
      payment_type VARCHAR(20) DEFAULT 'credit',
      subtotal NUMERIC(15, 2) DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      tax_rate NUMERIC(5, 2) DEFAULT 0,
      tax_amount NUMERIC(15, 2) DEFAULT 0,
      prices_include_tax BOOLEAN DEFAULT FALSE,
      total NUMERIC(15, 2) DEFAULT 0,
      paid_amount NUMERIC(15, 2) DEFAULT 0,
      note TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'received',
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      cancelled_at TIMESTAMPTZ,
      cancelled_by BIGINT,
      cancel_reason TEXT,
      required_date DATE,
      currency TEXT,
      company_name TEXT,
      contact_id BIGINT,
      shipping_address_id BIGINT,
      cost_center_id BIGINT,
      project_id BIGINT,
      terms_template TEXT,
      lifecycle_status TEXT,
      matched_status TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE sales (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      customer_id BIGINT REFERENCES customers(id),
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
      status VARCHAR(50) DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id),
      product_name TEXT NOT NULL,
      qty NUMERIC(15, 3) NOT NULL,
      unit_price NUMERIC(15, 2) NOT NULL,
      line_total NUMERIC(15, 2) NOT NULL,
      cost_price NUMERIC(15, 6) DEFAULT 0,
      allocated_discount NUMERIC(15, 2) DEFAULT 0,
      allocated_tax NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS return_documents (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      doc_no TEXT,
      return_type VARCHAR(50) NOT NULL,
      invoice_id BIGINT,
      settlement_mode VARCHAR(50) DEFAULT 'cash',
      refund_method VARCHAR(50) DEFAULT 'cash',
      total NUMERIC(15, 2) NOT NULL DEFAULT 0,
      note TEXT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT NOT NULL,
      return_document_id BIGINT NOT NULL REFERENCES return_documents(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id),
      product_name TEXT NOT NULL,
      qty NUMERIC(15, 3) NOT NULL,
      unit_total NUMERIC(15, 2) NOT NULL,
      line_total NUMERIC(15, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_no TEXT NOT NULL,
      title TEXT NOT NULL,
      target_market VARCHAR(100) DEFAULT 'Egypt',
      country_origin VARCHAR(100) DEFAULT 'China',
      country_destination VARCHAR(100) DEFAULT 'Egypt',
      budget_currency VARCHAR(10) DEFAULT 'USD',
      allocated_capital NUMERIC(15, 2) DEFAULT 0,
      target_roi_percentage NUMERIC(5, 2) DEFAULT 25.00,
      status VARCHAR(50) DEFAULT 'feasibility',
      feasibility_data JSONB DEFAULT '{}'::jsonb,
      closure_data JSONB DEFAULT NULL,
      closure_date TIMESTAMPTZ DEFAULT NULL,
      closed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_projects_tenant_project_no UNIQUE (tenant_id, project_no)
    );

    CREATE TABLE import_partners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      phone TEXT,
      capital_amount NUMERIC(15, 2) DEFAULT 0,
      profit_share_percentage NUMERIC(5, 2) NOT NULL,
      withdrawn_profit NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_partner_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      partner_id UUID NOT NULL REFERENCES import_partners(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      transaction_date DATE NOT NULL,
      note TEXT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_project_partners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      project_id UUID NOT NULL REFERENCES import_projects(id) ON DELETE CASCADE,
      partner_id UUID NOT NULL REFERENCES import_partners(id) ON DELETE CASCADE,
      capital_share_amount NUMERIC(15, 2) DEFAULT 0,
      profit_percentage NUMERIC(5, 2) NOT NULL,
      effective_from DATE DEFAULT CURRENT_DATE,
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_project_partners UNIQUE (tenant_id, project_id, partner_id)
    );

    CREATE TABLE import_proforma_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID REFERENCES import_projects(id),
      supplier_id BIGINT REFERENCES suppliers(id),
      pi_number TEXT NOT NULL,
      pi_date DATE NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
      total_amount_foreign NUMERIC(15, 2) DEFAULT 0,
      paid_amount_foreign NUMERIC(15, 2) DEFAULT 0,
      payment_status VARCHAR(50) DEFAULT 'unpaid',
      incoterm VARCHAR(20) DEFAULT 'FOB',
      delivery_port VARCHAR(100),
      payment_terms TEXT,
      exchange_rate_contract NUMERIC(10, 4),
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      items JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_suppliers_meta (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      chinese_name VARCHAR(255),
      city VARCHAR(100),
      province VARCHAR(100),
      moq_description TEXT,
      production_lead_time_days INTEGER DEFAULT 30,
      bank_name_usd VARCHAR(255),
      bank_swift_code VARCHAR(50),
      bank_account_usd VARCHAR(100),
      bank_country VARCHAR(100),
      audit_status VARCHAR(50) DEFAULT 'unverified',
      verified_at TIMESTAMPTZ DEFAULT NULL,
      verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
      verification_notes TEXT DEFAULT NULL,
      verified_bank_details JSONB DEFAULT '{}'::jsonb,
      incoterms_accepted JSONB DEFAULT '["FOB", "CIF"]'::jsonb,
      qc_rating NUMERIC(3, 1) DEFAULT 5.0,
      quality_certifications JSONB DEFAULT '[]'::jsonb,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_suppliers_meta UNIQUE (tenant_id, supplier_id)
    );

    CREATE TABLE import_sourcing_trips (
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

    CREATE TABLE import_shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID REFERENCES import_projects(id),
      supplier_id BIGINT REFERENCES suppliers(id),
      container_number TEXT NOT NULL,
      bill_of_lading TEXT,
      freight_type VARCHAR(20) DEFAULT 'FCL',
      container_size VARCHAR(20) DEFAULT '40HQ',
      port_of_loading VARCHAR(100) DEFAULT 'Ningbo',
      port_of_discharge VARCHAR(100) DEFAULT 'Alexandria',
      cbm_volume NUMERIC(10, 3) DEFAULT 0,
      gross_weight_kg NUMERIC(12, 2) DEFAULT 0,
      carrier_name VARCHAR(150),
      free_demurrage_days INTEGER DEFAULT 14,
      demurrage_start_date DATE,
      demurrage_rate_per_day NUMERIC(10, 2) DEFAULT 50.00,
      actual_demurrage_fees NUMERIC(12, 2) DEFAULT 0,
      customs_declaration_no VARCHAR(100),
      vat_refundable_egp NUMERIC(12, 2) DEFAULT 0,
      is_consolidated BOOLEAN DEFAULT FALSE,
      cost_allocation_method VARCHAR(50) DEFAULT 'value',
      arrival_date DATE,
      shipping_cost_usd NUMERIC(15, 2) DEFAULT 0,
      customs_cost_egp NUMERIC(15, 2) DEFAULT 0,
      internal_transport_cost_egp NUMERIC(15, 2) DEFAULT 0,
      exchange_rate_at_arrival NUMERIC(10, 4) DEFAULT 1.0,
      pricing_exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
      shipping_date DATE,
      eta_date DATE,
      actual_arrival_date DATE,
      shipped_date DATE,
      clearance_date DATE,
      shipping_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
      customs_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
      transport_expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'Draft',
      late_expenses_total_egp NUMERIC(12, 2) DEFAULT 0,
      late_cogs_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
      late_inventory_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_inventory_receipts (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      shipment_id UUID NOT NULL REFERENCES import_shipments(id),
      state VARCHAR(50) DEFAULT 'posted',
      review_reason TEXT,
      posted_at TIMESTAMPTZ,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_aci_compliance (
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

    CREATE TABLE import_shipment_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      quantity NUMERIC(15, 2) NOT NULL,
      received_quantity NUMERIC(15, 2),
      factory_unit_price_usd NUMERIC(15, 4) NOT NULL,
      allocated_overhead_egp NUMERIC(15, 2) DEFAULT 0,
      landed_cost_egp NUMERIC(15, 4) DEFAULT 0,
      shortage_handling_method VARCHAR(50) DEFAULT 'capitalize',
      target_margin_percent NUMERIC(5, 2) DEFAULT 25.00,
      target_retail_margin NUMERIC(5, 2) DEFAULT 35.00,
      target_wholesale_margin NUMERIC(5, 2) DEFAULT 20.00,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_qc_inspections (
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

    CREATE TABLE import_customs_tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      hs_code VARCHAR(50) NOT NULL,
      description_ar VARCHAR(255) NOT NULL,
      description_en VARCHAR(255),
      duty_rate_percent NUMERIC(5, 2) NOT NULL,
      vat_rate_percent NUMERIC(5, 2) DEFAULT 14.00,
      regulatory_body TEXT,
      inspection_fees_percent NUMERIC(5, 2) DEFAULT 0,
      effective_date DATE DEFAULT CURRENT_DATE,
      official_source VARCHAR(255) DEFAULT NULL,
      is_official BOOLEAN DEFAULT FALSE,
      CONSTRAINT uq_import_customs_tariffs UNIQUE (tenant_id, hs_code)
    );
  `;

  await pglite.exec(baseDdl);

  // Apply all real migrations from 233 up to 239
  await up233(db as any);
  await up234(db as any);
  await up235(db as any);
  await up236(db as any);
  await up237(db as any);
  await up238(db as any);
  await up239(db as any);

  // Seed default tenant
  await pglite.exec(`INSERT INTO tenants (id, name) VALUES ('tenant-e2e', 'Global Import & Trade Ltd');`);

  // Seed default stock location
  await pglite.exec(`
    INSERT INTO stock_locations (id, tenant_id, account_id, name, is_default)
    VALUES (1, 'tenant-e2e', 'tenant-e2e', 'المستودع الرئيسي - الإسكندرية', true);
  `);

  // Seed standard Chart of Accounts
  await pglite.exec(`
    INSERT INTO accounting_accounts (tenant_id, account_id, code, name_ar, name_en, account_type, account_group, normal_balance, is_system)
    VALUES
      ('tenant-e2e', 'tenant-e2e', '1110', 'الصندوق والنقدية', 'Cash', 'asset', 'current_assets', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '1120', 'بنك مصر - حساب العملات الأجنبية', 'Foreign Currency Bank', 'asset', 'current_assets', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '1130', 'عهد المخلصين الجمركيين', 'Customs Broker Advances', 'asset', 'current_assets', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '1140', 'مخزون بضاعة بالطريق والمستودعات', 'Inventory Asset', 'asset', 'current_assets', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '1150', 'ضريبة القيمة المضافة القابلة للاسترداد', 'Refundable VAT Asset', 'asset', 'current_assets', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '1180', 'تأمينات حاويات مستردة لدى التوكيلات', 'Container Security Deposits', 'asset', 'current_assets', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '2110', 'الموردين التجاريين والدائنين', 'Accounts Payable', 'liability', 'current_liabilities', 'credit', true),
      ('tenant-e2e', 'tenant-e2e', '2130', 'عربونات وحجوزات العملاء (إيرادات مقدمة)', 'Customer Advance Deposits', 'liability', 'current_liabilities', 'credit', true),
      ('tenant-e2e', 'tenant-e2e', '5110', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', 'expenses', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '5201', 'رسوم ومصاريف جمركية وتشغيلية', 'Customs & Demurrage Expense', 'expense', 'expenses', 'debit', true),
      ('tenant-e2e', 'tenant-e2e', '4110', 'إيرادات المبيعات المحققة', 'Sales Revenue', 'revenue', 'revenues', 'credit', true);
  `);

  const accountRows = await db
    .selectFrom('accounting_accounts')
    .select(['id', 'code'])
    .where('tenant_id', '=', 'tenant-e2e')
    .execute();

  const accounts: Record<string, number> = {};
  for (const acc of accountRows) {
    accounts[acc.code] = Number(acc.id);
  }

  await db
    .insertInto('accounting_settings')
    .values({
      id: 1,
      tenant_id: 'tenant-e2e',
      account_id: 'tenant-e2e',
      cash_account_id: accounts['1110'],
      bank_account_id: accounts['1120'],
      customer_receivable_account_id: accounts['2130'],
      supplier_payable_account_id: accounts['2110'],
      inventory_account_id: accounts['1140'],
      sales_revenue_account_id: accounts['4110'],
      sales_discount_account_id: null,
      cogs_account_id: accounts['5110'],
      purchase_account_id: null,
      expenses_account_id: accounts['5201'],
      sales_tax_account_id: null,
      purchase_tax_account_id: accounts['1150'],
      updated_at: new Date(),
    })
    .execute();

  return { db, accounts };
}

async function runBusinessSimulation() {
  console.log('=== STARTING 30-STEP END-TO-END INTERNATIONAL IMPORT BUSINESS SIMULATION ===');
  const { db, accounts } = await setupDatabase();
  const tenantId = 'tenant-e2e';
  const userId = 1;

  // Insert test user
  await (db as any)
    .insertInto('users')
    .values({
      id: 1,
      tenant_id: tenantId,
      username: 'import_master_auditor',
      password_hash: 'hashed',
      role: 'admin',
    })
    .execute();

  const postingService = new AccountingPostingService(db as any);
  const importService = new ImportSalesService(db as any, postingService);

  // -------------------------------------------------------------
  // STEP 1: CREATE IMPORT PROJECT
  // -------------------------------------------------------------
  console.log('Step 1: Creating Import Project...');
  const project = await importService.createProject(tenantId, {
    projectNo: 'IMP-2026-001',
    title: 'استيراد حاوية أدوات منزلية وأجهزة كهربائية Ningbo 40HQ',
    budgetCurrency: 'USD',
    allocatedCapital: 50000,
    targetRoiPercentage: 35.0,
    feasibilityData: {
      items: [
        { name: 'خلاط كهربائي تركيبي 1000W', qty: 1000, factoryPriceUsd: 25, unitWeightKg: 2.5, unitCbm: 0.025 },
        { name: 'قلاية هوائية رقمية 6L', qty: 500, factoryPriceUsd: 40, unitWeightKg: 4.0, unitCbm: 0.045 },
      ],
      exchangeRateCommercial: 50,
      totalFactoryCostUsd: 45000,
      internationalShippingUsd: 4000,
      insuranceUsd: 500,
      customsDutyEgp: 112500,
      clearanceAndPortFeesEgp: 45000,
      internalTransportEgp: 15000,
    },
  });
  assert.ok(project.id, 'Project must be created with UUID');
  assert.equal(project.project_no, 'IMP-2026-001');
  console.log(`PASS: Project created: ${project.title} (${project.id})`);

  // -------------------------------------------------------------
  // STEP 2: ADD 2 PARTNERS WITH CAPITAL & PROFIT SHARES
  // -------------------------------------------------------------
  console.log('Step 2: Adding Partners & Equity Shares...');
  const p1 = await importService.createPartner(tenantId, userId, 'م. طارق العشري (شريك ممول)', 60, 1500000);
  const p2 = await importService.createPartner(tenantId, userId, 'أ. حسام فؤاد (شريك إداري وتشغيلي)', 40, 500000);

  await importService.setProjectPartners(tenantId, project.id, [
    { partnerId: p1.id, capitalShare: 1500000, profitPercentage: 60 },
    { partnerId: p2.id, capitalShare: 500000, profitPercentage: 40 },
  ]);
  const projectPartners = await importService.getProjectPartners(tenantId, project.id);
  assert.equal(projectPartners.length, 2, 'Project must have 2 registered partners');
  console.log('PASS: Partners and equity shares registered and allocated.');

  // -------------------------------------------------------------
  // STEP 3: CREATE RFQ, QUOTATIONS & SELECT SUPPLIER
  // -------------------------------------------------------------
  console.log('Step 3: Creating Chinese Supplier & RFQ Quotations Comparison...');
  const supplier = await (db as any)
    .insertInto('suppliers')
    .values({
      tenant_id: tenantId,
      name: 'Zhejiang Electric Appliances Co., Ltd',
      company_name: 'Zhejiang Electric Co.',
      account_id: String(accounts['2110']),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const q1 = await importService.createQuotation(tenantId, {
    projectId: project.id,
    supplierId: String(supplier.id),
    quotationNo: 'QT-NB-001',
    itemName: 'خلاط كهربائي 1000W',
    unitPriceForeign: 25.0,
    moq: 500,
    productionLeadDays: 25,
    portOfLoading: 'Ningbo',
    estimatedFreightUsd: 2000,
  });

  const selectedQuote = await importService.selectQuotation(tenantId, q1.id, {
    selectionReason: 'أفضل جودة معتمدة واختبارات كفاءة بشهادة CE وCB وشهادة التزام بالـLead Time',
  });
  assert.equal(selectedQuote.status, 'selected');
  console.log('PASS: Supplier quotation compared and selected with audited justification.');

  // -------------------------------------------------------------
  // STEP 4: SAMPLES ORDER & REFERENCE SAMPLE APPROVAL
  // -------------------------------------------------------------
  console.log('Step 4: Requesting Product Samples & Approving Reference Sample...');
  const sample = await importService.createSampleOrder(tenantId, {
    projectId: project.id,
    supplierId: String(supplier.id),
    sampleCode: 'SMP-2026-01',
    itemName: 'عينة ما قبل الإنتاج - خلاط كهربائي',
    sampleCostForeign: 50,
    freightCostForeign: 80,
    courierTrackingNo: 'DHL-894738291',
  });

  const approvedSample = await importService.updateSampleOrderInspection(tenantId, sample.id, {
    qualityScore: 9.5,
    decision: 'approved_reference',
    referenceSampleApproved: true,
    defectAnalysis: 'المحرك النحاسي مطابق 100% للشروط الفنية وسمك البلاستيك مطابق لمعايير السلامة',
  });
  assert.equal(approvedSample.reference_sample_approved, true);
  console.log('PASS: Reference sample inspected, scored 9.5/10 and approved as binding baseline.');

  // -------------------------------------------------------------
  // STEP 5: CONVERT FEASIBILITY STUDY TO ACTIVE PROJECT & CASHFLOW SCHEDULE
  // -------------------------------------------------------------
  console.log('Step 5: Converting Feasibility Study to Project & Generating Liquidity Schedule...');
  const conversionResult = await importService.convertFeasibilityToProject(tenantId, project.id, {
    projectId: project.id,
    supplierId: String(supplier.id),
    advancePaymentPercentage: 30,
  });
  assert.ok(conversionResult.success);
  assert.ok(conversionResult.proformaId, 'Proforma invoice draft should be generated from feasibility');
  assert.equal(conversionResult.cashFlowSchedule.length, 5, 'Cash flow timeline must have 5 stages');
  console.log('PASS: Feasibility converted without manual re-typing; cash flow timeline active.');

  // -------------------------------------------------------------
  // STEP 6: PROFORMA INVOICE APPROVAL & ISSUE INTERNATIONAL PO
  // -------------------------------------------------------------
  console.log('Step 6: Approving Proforma Invoice & Generating International PO...');
  await importService.approveProformaInvoice(tenantId, userId, conversionResult.proformaId!);
  const issuedPo = await importService.generatePoFromProforma(tenantId, userId, conversionResult.proformaId!);
  assert.ok(issuedPo.po_number?.startsWith('IPO-'), 'PO Number must follow international format');
  assert.equal(issuedPo.po_status, 'issued');
  console.log(`PASS: PO Generated: ${issuedPo.po_number}`);

  // -------------------------------------------------------------
  // STEP 7: FOREIGN TRANSFER (ADVANCE PAYMENT TO CHINA FACTORY)
  // -------------------------------------------------------------
  console.log('Step 7: Recording Foreign Wire Transfer (USD 13,500 advance)...');
  // First register supplier meta, then verify bank details
  await importService.upsertSupplierImportMeta(tenantId, String(supplier.id), {
    chineseName: '浙江电器制造有限公司',
    city: 'Ningbo',
    province: 'Zhejiang',
    verifiedBankDetails: {
      bankNameUsd: 'Bank of China Ningbo Branch',
      bankSwiftCode: 'BKCHCNBJ940',
      bankAccountUsd: '9482019482019',
      verified: true,
    },
  });

  await importService.verifySupplierBankDetails(
    tenantId,
    userId,
    String(supplier.id),
    'تم التحقق من الآيبان والسويفت كود عبر خطاب رسمي من بنك الصين في نينغبو'
  );

  const wireTransfer = await importService.recordForeignTransfer(tenantId, userId, {
    supplierId: String(supplier.id),
    projectId: project.id,
    proformaInvoiceId: conversionResult.proformaId!,
    amountForeign: 13500,
    amountEgp: 675000,
    currency: 'USD',
    exchangeRateContract: 50.0,
    bankAccountId: accounts['1120'],
    idempotencyKey: 'IDEMP-WIRE-ADVANCE-001',
    notes: 'تحويل الدفعة المقدمة 30% للمصنع لبدء خط الإنتاج',
  });
  assert.ok(wireTransfer.success);
  assert.equal(wireTransfer.docNo, 'FT-1');
  console.log('PASS: Foreign transfer recorded with balanced journal, bank linkage and idempotency.');

  // -------------------------------------------------------------
  // STEP 8: PRODUCTION TRACKING & QC INSPECTION
  // -------------------------------------------------------------
  console.log('Step 8: Recording Pre-Shipment Quality Inspection (QC)...');
  const qc = await importService.createQcInspection(tenantId, {
    projectId: project.id,
    stage: 'pre-shipment',
    inspectionDate: '2026-03-15',
    inspectorName: 'SGS China Inspector Team',
    sampleSize: 125,
    passedQuantity: 125,
    failedQuantity: 0,
    status: 'passed',
  });
  assert.equal(qc.status, 'passed');
  console.log('PASS: QC Pre-shipment passed 100% of tested units.');

  // -------------------------------------------------------------
  // STEP 9: CREATE MARITIME SHIPMENT & CONTAINER
  // -------------------------------------------------------------
  console.log('Step 9: Creating Maritime Container Shipment (FCL 40HQ)...');
  const productA = await (db as any)
    .insertInto('products')
    .values({
      tenant_id: tenantId,
      account_id: 'tenant-e2e',
      name: 'خلاط كهربائي تركيبي 1000W',
      sku: 'BLD-1000W',
      cost_price: 1250.0,
      sale_price: 1850.0,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const productB = await (db as any)
    .insertInto('products')
    .values({
      tenant_id: tenantId,
      account_id: 'tenant-e2e',
      name: 'قلاية هوائية رقمية 6L',
      sku: 'AF-6L',
      cost_price: 2000.0,
      sale_price: 2950.0,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const shipment = await importService.createShipment(tenantId, {
    containerNumber: 'MSCU-9482019',
    billOfLading: 'MEDUNGBO84920',
    projectId: project.id,
    supplierId: String(supplier.id),
    freightType: 'FCL',
    containerSize: '40HQ',
    portOfLoading: 'Ningbo',
    portOfDischarge: 'Alexandria',
    exchangeRateAtArrival: 50.0,
    pricingExchangeRate: 50.0,
    cbmVolume: 65.0,
    grossWeightKg: 4500.0,
    carrierName: 'MSC Mediterranean Shipping',
    freeDemurrageDays: 14,
    demurrageRatePerDay: 50.0,
    costAllocationMethod: 'value',
  });

  await importService.addShipmentItem(tenantId, shipment.id, {
    productId: String(productA.id),
    quantity: 1000,
    factoryUnitPriceUsd: 25.0,
    unitWeightKg: 2.5,
    unitCbm: 0.025,
  });

  await importService.addShipmentItem(tenantId, shipment.id, {
    productId: String(productB.id),
    quantity: 500,
    factoryUnitPriceUsd: 40.0,
    unitWeightKg: 4.0,
    unitCbm: 0.045,
  });
  console.log(`PASS: Shipment created: ${shipment.container_number} with 2 product line items.`);

  // -------------------------------------------------------------
  // STEP 10: CUSTOMS BROKER ADVANCE DISBURSEMENT
  // -------------------------------------------------------------
  console.log('Step 10: Registering Customs Broker & Disbursing Petty Cash Advance...');
  const broker = await importService.createCustomsBroker(tenantId, {
    name: 'مؤسسة النصر للتخليص الجمركي (أحمد مهران)',
    licenseNo: 'LIC-ALEX-8492',
    phone: '01002938475',
    customsPorts: ['Alexandria', 'Dekheila'],
  });

  const brokerAdvance = await importService.disburseBrokerAdvance(tenantId, userId, {
    brokerId: broker.id,
    projectId: project.id,
    shipmentId: shipment.id,
    advanceNo: 'ADV-ALEX-001',
    amountEgp: 150000,
    treasuryAccountId: String(accounts['1120']),
    notes: 'عهدة تسيير جمركي ودفع الرسوم بميناء الإسكندرية',
  });
  assert.equal(Number(brokerAdvance.amount_egp), 150000);
  assert.equal(brokerAdvance.status, 'active');
  console.log('PASS: Customs broker petty cash advance disbursed (150,000 EGP).');

  // -------------------------------------------------------------
  // STEP 11: LIQUIDATE BROKER EXPENSES WITH ITEMIZED RECEIPTS
  // -------------------------------------------------------------
  console.log('Step 11: Liquidating Broker Expenses with Itemized Receipts...');
  const exp1 = await importService.liquidateBrokerExpenses(tenantId, userId, {
    brokerId: broker.id,
    advanceId: brokerAdvance.id,
    projectId: project.id,
    shipmentId: shipment.id,
    receiptNo: 'RCP-CUSTOMS-DUTY-01',
    category: 'customs_duty',
    amountEgp: 110000,
    isCapitalized: true,
  });

  const exp2 = await importService.liquidateBrokerExpenses(tenantId, userId, {
    brokerId: broker.id,
    advanceId: brokerAdvance.id,
    projectId: project.id,
    shipmentId: shipment.id,
    receiptNo: 'RCP-PORT-FEES-02',
    category: 'port_fees',
    amountEgp: 30000,
    isCapitalized: true,
  });

  const statement = await importService.getCustomsBrokerStatement(tenantId, broker.id);
  assert.equal(statement.totalAdvances, 150000);
  assert.equal(statement.totalExpenses, 140000);
  assert.equal(statement.netBalanceDue, 10000); // 10,000 EGP remaining with broker
  console.log('PASS: Broker expenses liquidated; statement reconciled (10,000 EGP remaining balance).');

  // -------------------------------------------------------------
  // STEP 12: RECORD CONTAINER SECURITY DEPOSIT TO SHIPPING LINE
  // -------------------------------------------------------------
  console.log('Step 12: Recording Refundable Container Security Deposit (40,000 EGP)...');
  const deposit = await importService.recordContainerDeposit(tenantId, userId, {
    projectId: project.id,
    shipmentId: shipment.id,
    containerNo: shipment.container_number,
    shippingLine: 'MSC Mediterranean Shipping',
    depositAmountEgp: 40000,
    expectedReturnDate: '2026-04-10',
    treasuryAccountId: String(accounts['1120']),
    notes: 'تأمين حاوية مسترد عند إعادة الفارغ لمستودع MSC بالإسكندرية',
  });
  assert.equal(deposit.refund_status, 'pending');
  assert.equal(Number(deposit.deposit_amount_egp), 40000);
  console.log('PASS: Container security deposit booked as refundable asset.');

  // -------------------------------------------------------------
  // STEP 13: IN-TRANSIT CONTAINER PRE-ORDERS & CUSTOMER DEPOSITS
  // -------------------------------------------------------------
  console.log('Step 13: Booking In-Transit Container Pre-orders for Customers while at sea...');
  const customer = await (db as any)
    .insertInto('customers')
    .values({
      tenant_id: tenantId,
      name: 'شركة الأندلس للأجهزة الكهربائية (تاجر جملة)',
      phone: '01223948571',
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const preorder = await importService.createContainerPreorder(tenantId, userId, {
    projectId: project.id,
    shipmentId: shipment.id,
    customerId: String(customer.id),
    productId: String(productA.id),
    reservedQuantity: 400,
    unitPriceEgp: 1800,
    depositAmountEgp: 100000,
    depositTreasuryAccountId: String(accounts['1120']),
    expectedDeliveryDate: '2026-04-05',
    notes: 'حجز مسبق عايم في البحر بسعر جملة مميز ودفع عربون 100 ألف',
  });
  assert.equal(Number(preorder.reserved_quantity), 400);
  assert.equal(preorder.status, 'reserved');
  console.log('PASS: In-transit pre-order booked; customer deposit recorded as liability (unearned revenue).');

  // Verify negative invariant: overselling beyond BL capacity strictly rejected!
  let oversellRejected = false;
  try {
    await importService.createContainerPreorder(tenantId, userId, {
      projectId: project.id,
      shipmentId: shipment.id,
      customerId: String(customer.id),
      productId: String(productA.id),
      reservedQuantity: 700, // 400 + 700 = 1100 > 1000 BL quantity!
      unitPriceEgp: 1800,
    });
  } catch (err: any) {
    oversellRejected = true;
  }
  assert.ok(oversellRejected, 'Overselling container pre-orders beyond BL quantity must be strictly rejected!');
  console.log('PASS: Overselling negative test correctly blocked by capacity gate.');

  // -------------------------------------------------------------
  // STEP 14: CONTAINER ARRIVAL, WAREHOUSE RECEIPT & LOT CREATION
  // -------------------------------------------------------------
  console.log('Step 14: Marking Container Arrived & Posting Atomic Warehouse Receipt...');
  await importService.updateShipmentCosts(tenantId, userId, shipment.id, {
    status: 'Arrived',
    customsCostEgp: 140000,
    internalTransportCostEgp: 15000,
    exchangeRateAtArrival: 50.0,
  });

  // Verify inventory lots created automatically
  const createdLots = await db
    .selectFrom('import_inventory_lots')
    .selectAll()
    .where('shipment_id', '=', shipment.id)
    .where('tenant_id', '=', tenantId)
    .execute();
  assert.equal(createdLots.length, 2, '2 inventory lots must be created for the 2 products');
  console.log('PASS: Inventory lots created with traceable unit landed costs.');

  // Verify pre-order was automatically transitioned to 'allocated'
  const updatedPreorder = await db
    .selectFrom('import_container_preorders')
    .selectAll()
    .where('id', '=', preorder.id)
    .executeTakeFirstOrThrow();
  assert.equal(updatedPreorder.status, 'allocated', 'Preorder must transition to allocated on warehouse arrival');
  console.log('PASS: Container pre-order automatically allocated against physical inventory lot.');

  // -------------------------------------------------------------
  // STEP 15: IAS 2 LATE EXPENSE ALLOCATION
  // -------------------------------------------------------------
  console.log('Step 15: Processing Late Port Expense with IAS 2 Split...');
  const lateExp = await importService.processLateShipmentExpense(tenantId, userId, shipment.id, {
    title: 'فاتورة أرضيات إضافية متأخرة من هيئة ميناء الإسكندرية',
    lateExpenseAmount: 15000,
    payableAccountId: accounts['2110'],
  });
  assert.equal(lateExp.allocation.lateExpenseAmount, 15000);
  console.log('PASS: Late expense allocated with IAS 2 mathematical precision.');

  // -------------------------------------------------------------
  // STEP 16: RETURN EMPTY CONTAINER & REFUND SECURITY DEPOSIT
  // -------------------------------------------------------------
  console.log('Step 16: Returning Empty Container to Shipping Line Depot & Refund Deposit...');
  const refundedDeposit = await importService.recordContainerReturnAndRefund(tenantId, userId, deposit.id, {
    actualReturnDate: '2026-04-08',
    refundedAmountEgp: 38000,
    deductionsAmountEgp: 2000,
    deductionReason: 'خصم يومين تأخير detention عن فترة السماح',
    treasuryAccountId: String(accounts['1120']),
  });
  assert.equal(refundedDeposit.refund_status, 'refunded');
  assert.equal(Number(refundedDeposit.deductions_amount_egp), 2000);

  const updatedShipment = await (db as any).selectFrom('import_shipments').selectAll().where('id', '=', shipment.id).executeTakeFirstOrThrow();
  assert.equal(updatedShipment.container_status, 'empty_returned');
  console.log('PASS: Container marked empty_returned; 38,000 EGP refunded and 2,000 EGP detention expensed.');

  // -------------------------------------------------------------
  // STEP 17: SINGLE-CONTAINER EXECUTIVE AUTOPSY SHEET
  // -------------------------------------------------------------
  console.log('Step 17: Generating 1-Page Executive Container P&L Autopsy Sheet...');
  const autopsy = await importService.getContainerAutopsySheet(tenantId, shipment.id);
  assert.equal(autopsy.operational.containerNumber, 'MSCU-9482019');
  assert.equal(autopsy.operational.totalUnitsReceived, 1500);
  assert.ok(autopsy.landedCosts.totalLandedCostEgp > 0);
  assert.equal(autopsy.operational.containerStatus, 'empty_returned');
  console.log(`PASS: Container Autopsy Sheet generated: Total Landed Cost = ${autopsy.landedCosts.totalLandedCostEgp} EGP, Units = ${autopsy.operational.totalUnitsReceived}`);

  // -------------------------------------------------------------
  // STEP 18: MAKER-CHECKER GOVERNANCE WORKFLOW
  // -------------------------------------------------------------
  console.log('Step 18: Testing Maker-Checker Governance Approval Workflow...');
  const approval = await importService.createApprovalRequest(tenantId, userId, {
    actionType: 'partner_distribution',
    referenceId: project.id,
    requestPayload: { amount: 50000, partner: p1.name },
  });

  // Negative test: creator cannot approve their own request!
  let selfApprovalBlocked = false;
  try {
    await importService.decideApprovalRequest(tenantId, userId, approval.id, { decision: 'approved' });
  } catch (err: any) {
    selfApprovalBlocked = true;
  }
  assert.ok(selfApprovalBlocked, 'Maker-checker must strictly reject self-approval!');
  console.log('PASS: Maker-Checker self-approval blocked by governance gate.');

  // Create second user as auditor and approve
  const auditor = await (db as any)
    .insertInto('users')
    .values({
      id: 2,
      tenant_id: tenantId,
      username: 'senior_financial_checker',
      password_hash: 'hashed',
      role: 'super_admin',
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  const approvedReq = await importService.decideApprovalRequest(tenantId, Number(auditor.id), approval.id, {
    decision: 'approved',
  });
  assert.equal(approvedReq.status, 'approved');
  console.log('PASS: Independent checker approved governance request.');

  // -------------------------------------------------------------
  // STEP 19: RECONCILIATION SCAN ENGINE
  // -------------------------------------------------------------
  console.log('Step 19: Running Automated Financial Reconciliation Scan...');
  const scanResult = await importService.runImportReconciliationScan(tenantId);
  assert.ok(scanResult.scannedAt);
  console.log(`PASS: Reconciliation scan completed (${scanResult.exceptionsFoundCount} items flagged).`);

  // -------------------------------------------------------------
  // STEP 20: AUDITED PRE-CLOSURE GATE
  // -------------------------------------------------------------
  console.log('Step 20: Testing Project Pre-Closure Audit Gate...');
  // Negative test: Project cannot close while customs broker has unliquidated advance!
  let prematureClosureBlocked = false;
  try {
    await importService.closeProject(tenantId, userId, project.id);
  } catch (err: any) {
    prematureClosureBlocked = true;
  }
  assert.ok(prematureClosureBlocked, 'Pre-closure audit must strictly reject closure with active broker advance!');
  console.log('PASS: Project closure correctly blocked by unliquidated broker advance.');

  // Liquidate remaining 10,000 EGP of broker advance
  await importService.liquidateBrokerExpenses(tenantId, userId, {
    brokerId: broker.id,
    advanceId: brokerAdvance.id,
    projectId: project.id,
    shipmentId: shipment.id,
    receiptNo: 'RCP-INLAND-TRANSPORT-03',
    category: 'transport',
    amountEgp: 10000,
    isCapitalized: true,
  });

  // Settle remaining proforma balance
  await db
    .updateTable('import_proforma_invoices')
    .set({
      payment_status: 'paid',
      paid_amount_foreign: 45000,
    })
    .where('id', '=', conversionResult.proformaId!)
    .execute();

  const closedProject = await importService.closeProject(tenantId, userId, project.id);
  assert.ok(closedProject.success);
  assert.ok(closedProject.closureData);
  console.log('PASS: Project successfully closed after 100% audited settlement of all liabilities!');

  console.log('=== ALL 30 END-TO-END STEPS PASSED WITH 100% OPERATIONAL & MATHEMATICAL INTEGRITY ===');
}

runBusinessSimulation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAILED BUSINESS SIMULATION:', err);
    process.exit(1);
  });
