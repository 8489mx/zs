import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { Kysely } from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import type { Database } from '../../src/database/database.types';
import { ImportSalesService } from '../../src/modules/import-sales/import-sales.service';

/**
 * IMPORT-POSTGRES-INTEGRATION — Real PostgreSQL Integration Tests.
 *
 * Verifies real database operations against production-grade schema and migrations:
 * 1. Project Closure: Architecture link between purchases and import_projects (import_project_id UUID vs project_id BIGINT), rejecting unsettled liabilities.
 * 2. Accounting Entries: Dynamic COA resolution without hardcoded account codes (2110, 1110, 5201, 1130, 5101) with balanced entries and tenant isolation.
 * 3. Foreign Transfers: Proforma supplier/project/currency matching, overpayment and replay duplicate prevention, real bank account linkage, and EGP-only balanced journal.
 * 4. Late Shipment Expenses: Dynamic COA account resolution and IAS 2 split between COGS and on-hand stock (using column `qty`).
 * 5. Partner UPSERT & UNIQUE Constraint Safety.
 * 6. Official Customs Tariff Reality Check.
 */

async function setupDatabase(): Promise<{ db: Kysely<Database>; accounts: Record<string, number> }> {
  const pglite = new PGlite();
  const db = new Kysely<Database>({
    dialect: new PGliteDialect(pglite),
  });

  // Create real tables matching production migrations exactly
  const ddl = `
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
      parent_id BIGINT REFERENCES accounting_accounts(id) ON DELETE RESTRICT,
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
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_accounting_settings_tenant UNIQUE (tenant_id)
    );

    CREATE TABLE products (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT DEFAULT '1',
      name TEXT NOT NULL,
      name_en TEXT,
      barcode TEXT,
      category_id BIGINT,
      supplier_id BIGINT,
      item_type TEXT DEFAULT 'product',
      item_kind TEXT DEFAULT 'standard',
      style_code TEXT,
      color TEXT,
      size TEXT,
      bin_location TEXT,
      default_location_id BIGINT,
      cost_price NUMERIC(15, 6) DEFAULT 0,
      retail_price NUMERIC(15, 2) DEFAULT 0,
      wholesale_price NUMERIC(15, 2) DEFAULT 0,
      stock_qty NUMERIC(15, 2) DEFAULT 0,
      reserved_qty NUMERIC(15, 2) DEFAULT 0,
      min_stock_qty NUMERIC(15, 2) DEFAULT 0,
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      tax_code_type TEXT,
      tax_code TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE product_location_stock (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT DEFAULT '1',
      product_id BIGINT NOT NULL REFERENCES products(id),
      branch_id BIGINT,
      location_id BIGINT,
      qty NUMERIC(15, 2) DEFAULT 0,
      reserved_qty NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE suppliers (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT DEFAULT '2110',
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      balance NUMERIC(15, 2) DEFAULT 0,
      notes TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE supplier_payments (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      amount NUMERIC(15, 2) NOT NULL,
      doc_no TEXT,
      note TEXT,
      payment_date DATE DEFAULT CURRENT_DATE,
      currency VARCHAR(10) DEFAULT 'USD',
      exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
      forex_variance_egp NUMERIC(12, 2) DEFAULT 0,
      proforma_invoice_id UUID,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE supplier_ledger (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      entry_type TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      balance_after NUMERIC(15, 2) NOT NULL,
      note TEXT,
      reference_type TEXT,
      reference_id BIGINT,
      return_document_id BIGINT,
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE treasury_transactions (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT,
      txn_type TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      note TEXT,
      reference_type TEXT,
      reference_id BIGINT,
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
      description TEXT NOT NULL,
      debit NUMERIC(15, 2) DEFAULT 0,
      credit NUMERIC(15, 2) DEFAULT 0,
      partner_type TEXT DEFAULT 'none',
      partner_id BIGINT,
      branch_id BIGINT,
      location_id BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE expenses (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT,
      title TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      cost_center_id BIGINT,
      expense_date DATE NOT NULL,
      note TEXT,
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE sales (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT DEFAULT '1',
      doc_no TEXT,
      total NUMERIC(15, 2) DEFAULT 0,
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE sale_items (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT DEFAULT '1',
      sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id),
      product_name TEXT NOT NULL,
      qty NUMERIC(15, 2) NOT NULL,
      unit_price NUMERIC(15, 2) NOT NULL,
      line_total NUMERIC(15, 2) NOT NULL,
      cost_price NUMERIC(15, 6) DEFAULT 0,
      allocated_discount NUMERIC(15, 2) DEFAULT 0
    );

    CREATE TABLE return_documents (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      return_type TEXT NOT NULL DEFAULT 'sale',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE return_items (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      return_document_id BIGINT NOT NULL REFERENCES return_documents(id) ON DELETE CASCADE,
      product_id BIGINT REFERENCES products(id),
      qty NUMERIC(15, 2) NOT NULL,
      line_total NUMERIC(15, 2) NOT NULL,
      cost_price NUMERIC(15, 6) DEFAULT 0
    );

    CREATE TABLE import_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_no TEXT NOT NULL,
      title TEXT NOT NULL,
      target_market TEXT DEFAULT NULL,
      country_origin TEXT DEFAULT NULL,
      country_destination TEXT DEFAULT NULL,
      budget_currency TEXT DEFAULT 'USD',
      allocated_capital NUMERIC(15, 2) DEFAULT 0,
      target_roi_percentage NUMERIC(5, 2) DEFAULT 0,
      status TEXT DEFAULT 'active',
      feasibility_data JSONB DEFAULT NULL,
      closure_data JSONB DEFAULT NULL,
      closure_date TIMESTAMPTZ DEFAULT NULL,
      closed_by BIGINT,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_projects_tenant_project_no UNIQUE (tenant_id, project_no)
    );

    -- purchases table matching REAL PRODUCTION SCHEMA:
    -- project_id is BIGINT (contracting/legacy)
    -- import_project_id is UUID REFERENCES import_projects(id) (migration 234)
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
      project_id BIGINT, -- REAL PRODUCTION TYPE: BIGINT (Contracting/legacy)
      import_project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL, -- ARCHITECTURAL LINK
      terms_template TEXT,
      lifecycle_status TEXT,
      matched_status TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_partners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      phone TEXT,
      capital_amount NUMERIC(15, 2) DEFAULT 0,
      profit_share_percentage NUMERIC(5, 2) DEFAULT 0,
      withdrawn_profit NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_project_partners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID NOT NULL REFERENCES import_projects(id) ON DELETE CASCADE,
      partner_id UUID NOT NULL REFERENCES import_partners(id) ON DELETE CASCADE,
      capital_share_amount NUMERIC(15, 2) DEFAULT 0,
      profit_percentage NUMERIC(5, 2) NOT NULL,
      effective_from DATE DEFAULT CURRENT_DATE,
      is_active BOOLEAN DEFAULT TRUE,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_project_partners UNIQUE (tenant_id, project_id, partner_id)
    );

    CREATE TABLE import_partner_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      partner_id UUID NOT NULL REFERENCES import_partners(id) ON DELETE CASCADE,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      entry_type TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      notes TEXT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
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

    CREATE TABLE import_proforma_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      pi_number TEXT NOT NULL,
      pi_date DATE NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      total_amount_foreign NUMERIC(15, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      payment_status VARCHAR(50) DEFAULT 'unpaid',
      paid_amount_foreign NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      container_number TEXT NOT NULL,
      supplier_id BIGINT REFERENCES suppliers(id),
      bill_of_lading TEXT,
      arrival_date DATE,
      shipping_date DATE,
      shipped_date DATE,
      eta_date DATE,
      clearance_date DATE,
      shipping_cost_usd NUMERIC(15, 2) DEFAULT 0,
      customs_cost_egp NUMERIC(15, 2) DEFAULT 0,
      internal_transport_cost_egp NUMERIC(15, 2) DEFAULT 0,
      exchange_rate_at_arrival NUMERIC(10, 4) DEFAULT 1.0,
      pricing_exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
      status VARCHAR(50) DEFAULT 'Draft',
      shipping_expense_id BIGINT,
      customs_expense_id BIGINT,
      transport_expense_id BIGINT,
      project_id UUID REFERENCES import_projects(id) ON DELETE SET NULL,
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
      late_expenses_total_egp NUMERIC(12, 2) DEFAULT 0,
      late_cogs_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
      late_inventory_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
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
      landed_cost_egp NUMERIC(15, 4) DEFAULT 0,
      shortage_handling_method VARCHAR(50) DEFAULT 'capitalize'
    );

    CREATE TABLE import_inventory_receipts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      shipment_id UUID NOT NULL REFERENCES import_shipments(id),
      receipt_number VARCHAR(100) DEFAULT 'REC-001',
      receipt_date DATE DEFAULT CURRENT_DATE,
      state VARCHAR(50) NOT NULL DEFAULT 'posted'
    );

    CREATE TABLE import_customs_tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      hs_code VARCHAR(20) NOT NULL,
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

  await pglite.exec(ddl);

  // Seed default tenant
  await pglite.exec(`INSERT INTO tenants (id, name) VALUES ('tenant-audit-1', 'Audited Trading Tenant');`);

  // Seed standard Chart of Accounts
  await pglite.exec(`
    INSERT INTO accounting_accounts (tenant_id, account_id, code, name_ar, name_en, account_type, account_group, normal_balance, is_system)
    VALUES
      ('tenant-audit-1', 'tenant-audit-1', '1110', 'الصندوق والنقدية', 'Cash and Cash Equivalents', 'asset', 'current_assets', 'debit', true),
      ('tenant-audit-1', 'tenant-audit-1', '1120', 'حساب البنك الرئيسي', 'Main Bank Account', 'asset', 'current_assets', 'debit', true),
      ('tenant-audit-1', 'tenant-audit-1', '1140', 'مخزون بضاعة ومواد خام', 'Inventory Asset', 'asset', 'current_assets', 'debit', true),
      ('tenant-audit-1', 'tenant-audit-1', '2110', 'حسابات الموردين والدائنين', 'Accounts Payable', 'liability', 'current_liabilities', 'credit', true),
      ('tenant-audit-1', 'tenant-audit-1', '5110', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', 'expenses', 'debit', true),
      ('tenant-audit-1', 'tenant-audit-1', '5201', 'خسائر فروق أسعار صرف محققة', 'Realized Forex Loss', 'expense', 'expenses', 'debit', true),
      ('tenant-audit-1', 'tenant-audit-1', '4201', 'أرباح فروق أسعار صرف محققة', 'Realized Forex Gain', 'revenue', 'revenues', 'credit', true);
  `);

  // Query account IDs to configure accounting_settings
  const accountRows = await db
    .selectFrom('accounting_accounts')
    .select(['id', 'code'])
    .where('tenant_id', '=', 'tenant-audit-1')
    .execute();

  const accounts: Record<string, number> = {};
  for (const acc of accountRows) {
    accounts[acc.code] = Number(acc.id);
  }

  // Seed accounting_settings linked to real accounts
  await db
    .insertInto('accounting_settings')
    .values({
      id: 1,
      tenant_id: 'tenant-audit-1',
      account_id: 'tenant-audit-1',
      cash_account_id: accounts['1110'],
      bank_account_id: accounts['1120'],
      customer_receivable_account_id: null,
      supplier_payable_account_id: accounts['2110'],
      inventory_account_id: accounts['1140'],
      sales_revenue_account_id: null,
      sales_discount_account_id: null,
      cogs_account_id: accounts['5110'],
      purchase_account_id: null,
      expenses_account_id: null,
      sales_tax_account_id: null,
      purchase_tax_account_id: null,
      updated_at: new Date(),
    })
    .execute();

  return { db, accounts };
}

async function runTests() {
  console.log('--- STARTING AUDITED POSTGRESQL (PGLITE) INTEGRATION AUDIT ---');
  const { db, accounts } = await setupDatabase();
  const service = new ImportSalesService(db as any);
  const tenantId = 'tenant-audit-1';
  const userId = 101;

  // -------------------------------------------------------------
  // Test 1: Project Closure & Purchases Architectural Link
  // -------------------------------------------------------------
  console.log('\nRunning Test 1: Project Closure & Purchases Architectural Link...');
  {
    const project = await db
      .insertInto('import_projects')
      .values({
        tenant_id: tenantId,
        project_no: 'PRJ-CLOSE-01',
        title: 'Project With Architectural Purchase Invoices',
        status: 'active',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const projectId = project.id;

    // Arrived and received shipment
    const shipment = await db
      .insertInto('import_shipments')
      .values({
        tenant_id: tenantId,
        project_id: projectId,
        container_number: 'CONT-CLOSE-01',
        status: 'Arrived',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('import_inventory_receipts')
      .values({
        tenant_id: tenantId,
        shipment_id: shipment.id,
        state: 'posted',
      })
      .execute();

    // Supplier & Fully paid proforma
    const supplier = await db
      .insertInto('suppliers')
      .values({
        tenant_id: tenantId,
        name: 'Guangzhou Electronics Ltd',
        phone: '020-888888',
        address: 'Guangzhou, China',
        balance: 0,
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('import_proforma_invoices')
      .values({
        tenant_id: tenantId,
        project_id: projectId,
        supplier_id: supplier.id,
        pi_number: 'PI-CLOSE-01',
        pi_date: '2026-10-01' as any,
        currency: 'USD',
        status: 'active',
        total_amount_foreign: 10000,
        paid_amount_foreign: 10000,
        payment_status: 'paid',
      })
      .execute();

    // 1-A: Create an UNPAID purchase invoice linked architecturally via import_project_id UUID
    // purchases.project_id BIGINT is left null (or contains a legacy contracting id)
    const unpaidPur = await db
      .insertInto('purchases')
      .values({
        tenant_id: tenantId,
        doc_no: 'PUR-UNSETTLED-01',
        project_id: null, // Legacy BIGINT column untouched!
        import_project_id: projectId, // Architectural UUID link!
        payment_type: 'credit',
        subtotal: 25000,
        discount: 0,
        tax_rate: 0,
        tax_amount: 0,
        prices_include_tax: false,
        total: 25000,
        paid_amount: 10000, // Unsettled remaining 15000 EGP
        note: 'Customs clearance invoice for project',
        status: 'received',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // Attempt to close project: MUST BE REJECTED
    let rejected = false;
    try {
      await service.closeProject(tenantId, userId, projectId);
    } catch (err: any) {
      rejected = true;
      assert.ok(
        err.message.includes('غير مسددة بالكامل') || err.message.includes('رصيد مستحق غير مسوّى'),
        `Unexpected rejection error: ${err.message}`
      );
    }
    assert.ok(rejected, 'closeProject must reject projects with unsettled purchase invoice liabilities');
    console.log('PASS: closeProject correctly rejected closure due to unsettled purchase invoice.');

    // 1-B: Settle the purchase invoice in full
    await db
      .updateTable('purchases')
      .set({ paid_amount: 25000 })
      .where('id', '=', unpaidPur.id)
      .execute();

    // Attempt closure again: MUST SUCCEED
    const closeRes = await service.closeProject(tenantId, userId, projectId);
    assert.strictEqual(closeRes.success, true);

    const closedPrj = await db
      .selectFrom('import_projects')
      .select(['status', 'closure_data'])
      .where('id', '=', projectId)
      .executeTakeFirstOrThrow();
    assert.strictEqual(closedPrj.status, 'closed');
    assert.ok(closedPrj.closure_data !== null, 'closure_data must be frozen');
    console.log('PASS: closeProject succeeded after full settlement of purchase invoice obligations.');
  }

  // -------------------------------------------------------------
  // Test 2: Accounting Entries & Zero Hardcoded Accounts Resolution
  // -------------------------------------------------------------
  console.log('\nRunning Test 2: Accounting Entries & Dynamic COA Resolution...');
  {
    const supplier = await db
      .insertInto('suppliers')
      .values({
        tenant_id: tenantId,
        name: 'Shenzhen Fast Components',
        phone: '0755-666666',
        address: 'Shenzhen, China',
        balance: 5000,
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // Execute foreign transfer without specifying accounts; service must dynamically resolve from COA / settings
    const transferRes = await service.recordForeignTransfer(tenantId, userId, {
      supplierId: String(supplier.id),
      amountForeign: 2000,
      amountEgp: 100000,
      currency: 'USD',
      exchangeRateContract: 49.00, // 2000 * 49 = 98000 contract value -> 2000 EGP forex loss
      notes: 'Dynamic COA resolution verification',
    });

    assert.strictEqual(transferRes.success, true);
    assert.strictEqual(transferRes.forexVarianceEgp, 2000);

    // Verify journal entry lines reference REAL primary keys in accounting_accounts
    const jeLines = await db
      .selectFrom('journal_entry_lines')
      .selectAll()
      .where('journal_entry_id', '=', transferRes.journalEntryId)
      .orderBy('id', 'asc')
      .execute();

    assert.strictEqual(jeLines.length, 3, 'Must have exactly 3 journal lines (Debit AP, Debit FX Loss, Credit Bank)');

    // Line 1: Debit Supplier AP
    const lineAp = jeLines.find((l) => Number(l.debit) > 0 && l.partner_type === 'supplier');
    assert.ok(lineAp, 'Supplier AP line must exist');
    assert.strictEqual(Number(lineAp.debit), 98000);
    assert.strictEqual(Number(lineAp.account_id), accounts['2110'], 'Must dynamically resolve AP account ID');

    // Line 2: Debit Forex Loss
    const lineFx = jeLines.find((l) => Number(l.debit) > 0 && l.partner_type === 'none');
    assert.ok(lineFx, 'Forex Loss line must exist');
    assert.strictEqual(Number(lineFx.debit), 2000);
    assert.strictEqual(Number(lineFx.account_id), accounts['5201'], 'Must dynamically resolve Forex Loss account ID');

    // Line 3: Credit Bank Account
    const lineBank = jeLines.find((l) => Number(l.credit) > 0);
    assert.ok(lineBank, 'Bank line must exist');
    assert.strictEqual(Number(lineBank.credit), 100000);
    assert.strictEqual(Number(lineBank.account_id), accounts['1120'], 'Must dynamically resolve Bank account ID');

    // Total Debits == Total Credits
    const totalDebits = jeLines.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredits = jeLines.reduce((s, l) => s + Number(l.credit), 0);
    assert.strictEqual(totalDebits, totalCredits, 'Journal lines must strictly balance');
    assert.strictEqual(totalDebits, 100000);
    console.log('PASS: Dynamic COA resolution verified with 0 hardcoded accounts and 100% balanced lines.');
  }

  // -------------------------------------------------------------
  // Test 3: Foreign Transfer Real Bank, Currency & Proforma Validation
  // -------------------------------------------------------------
  console.log('\nRunning Test 3: Foreign Transfer Real Bank, Currency & Proforma Validation...');
  {
    const supplierA = await db
      .insertInto('suppliers')
      .values({ tenant_id: tenantId, name: 'Supplier A Global', phone: '111', address: 'China', balance: 0, is_active: true })
      .returning('id')
      .executeTakeFirstOrThrow();

    const supplierB = await db
      .insertInto('suppliers')
      .values({ tenant_id: tenantId, name: 'Supplier B Overseas', phone: '222', address: 'China', balance: 0, is_active: true })
      .returning('id')
      .executeTakeFirstOrThrow();

    const projectA = await db
      .insertInto('import_projects')
      .values({ tenant_id: tenantId, project_no: 'PRJ-FT-01', title: 'Import Project A', status: 'active' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const projectB = await db
      .insertInto('import_projects')
      .values({ tenant_id: tenantId, project_no: 'PRJ-FT-02', title: 'Import Project B', status: 'active' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const proforma = await db
      .insertInto('import_proforma_invoices')
      .values({
        tenant_id: tenantId,
        project_id: projectA.id,
        supplier_id: supplierA.id,
        pi_number: 'PI-VALIDATE-01',
        pi_date: '2026-10-05' as any,
        currency: 'USD',
        status: 'active',
        total_amount_foreign: 5000,
        paid_amount_foreign: 2000,
        payment_status: 'partially_paid',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // 3-A: Supplier mismatch rejection
    let rejectedSupplier = false;
    try {
      await service.recordForeignTransfer(tenantId, userId, {
        supplierId: String(supplierB.id), // Wrong supplier
        amountForeign: 1000,
        amountEgp: 50000,
        currency: 'USD',
        proformaInvoiceId: proforma.id,
      });
    } catch (err: any) {
      rejectedSupplier = true;
      assert.ok(err.message.includes('تخص مورداً آخر'), `Unexpected error: ${err.message}`);
    }
    assert.ok(rejectedSupplier, 'Must reject foreign transfer with mismatched supplier');
    console.log('PASS: Proforma supplier mismatch rejected.');

    // 3-B: Project mismatch rejection
    let rejectedProject = false;
    try {
      await service.recordForeignTransfer(tenantId, userId, {
        supplierId: String(supplierA.id),
        projectId: projectB.id, // Wrong project
        amountForeign: 1000,
        amountEgp: 50000,
        currency: 'USD',
        proformaInvoiceId: proforma.id,
      });
    } catch (err: any) {
      rejectedProject = true;
      assert.ok(err.message.includes('مشروع استيراد آخر'), `Unexpected error: ${err.message}`);
    }
    assert.ok(rejectedProject, 'Must reject foreign transfer with mismatched project');
    console.log('PASS: Proforma project mismatch rejected.');

    // 3-C: Currency mismatch rejection
    let rejectedCurrency = false;
    try {
      await service.recordForeignTransfer(tenantId, userId, {
        supplierId: String(supplierA.id),
        amountForeign: 1000,
        amountEgp: 50000,
        currency: 'EUR', // Wrong currency
        proformaInvoiceId: proforma.id,
      });
    } catch (err: any) {
      rejectedCurrency = true;
      assert.ok(err.message.includes('لا تطابق عملة الفاتورة المبدئية'), `Unexpected error: ${err.message}`);
    }
    assert.ok(rejectedCurrency, 'Must reject foreign transfer with mismatched currency');
    console.log('PASS: Proforma currency mismatch rejected.');

    // 3-D: Overpayment rejection (remaining is 5000 - 2000 = 3000)
    let rejectedOverpay = false;
    try {
      await service.recordForeignTransfer(tenantId, userId, {
        supplierId: String(supplierA.id),
        amountForeign: 3500, // Overpayment!
        amountEgp: 175000,
        currency: 'USD',
        proformaInvoiceId: proforma.id,
      });
    } catch (err: any) {
      rejectedOverpay = true;
      assert.ok(err.message.includes('يتجاوز المتبقي غير المسدد'), `Unexpected error: ${err.message}`);
    }
    assert.ok(rejectedOverpay, 'Must reject overpayment beyond remaining proforma balance');
    console.log('PASS: Proforma overpayment rejected.');

    // 3-E: Successful legitimate transfer paying remainder exactly
    const transferSuccess = await service.recordForeignTransfer(tenantId, userId, {
      supplierId: String(supplierA.id),
      projectId: projectA.id,
      amountForeign: 3000,
      amountEgp: 153000,
      currency: 'USD',
      exchangeRateContract: 50.00, // 3000 * 50 = 150000 -> 3000 EGP forex loss
      proformaInvoiceId: proforma.id,
      bankAccountId: accounts['1120'], // Real bank account
    });
    assert.strictEqual(transferSuccess.success, true);

    const updatedPI = await db
      .selectFrom('import_proforma_invoices')
      .selectAll()
      .where('id', '=', proforma.id)
      .executeTakeFirstOrThrow();
    assert.strictEqual(Number(updatedPI.paid_amount_foreign), 5000);
    assert.strictEqual(updatedPI.payment_status, 'paid');
    console.log('PASS: Proforma settled in full with exact foreign currency tracking.');

    // 3-F: Replay / duplicate transfer rejection
    let rejectedReplay = false;
    try {
      await service.recordForeignTransfer(tenantId, userId, {
        supplierId: String(supplierA.id),
        projectId: projectA.id,
        amountForeign: 3000,
        amountEgp: 153000,
        currency: 'USD',
      });
    } catch (err: any) {
      rejectedReplay = true;
      assert.ok(
        err.message.includes('تم تسجيل حوالة مطابقة مؤخراً') || err.message.includes('مسددة بالكامل'),
        `Unexpected error: ${err.message}`
      );
    }
    assert.ok(rejectedReplay, 'Must reject duplicate transfer within replay window');
    console.log('PASS: Replay / duplicate foreign transfer prevented.');
  }

  // -------------------------------------------------------------
  // Test 4: Late Shipment Expense Real Schema & Dynamic Accounts
  // -------------------------------------------------------------
  console.log('\nRunning Test 4: Late Shipment Expense Real Schema (qty) & Dynamic COA...');
  {
    const product = await db
      .insertInto('products')
      .values({
        tenant_id: tenantId,
        name: 'Industrial Valve 2-inch',
        retail_price: 800,
        cost_price: 400,
        stock_qty: 100,
        min_stock_qty: 0,
        wholesale_price: 600,
        is_active: true,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    // 40 units on hand in stock using real column `qty`
    await db
      .insertInto('product_location_stock')
      .values({
        tenant_id: tenantId,
        product_id: product.id,
        qty: 40,
        reserved_qty: 0,
      })
      .execute();

    const shipment = await db
      .insertInto('import_shipments')
      .values({
        tenant_id: tenantId,
        container_number: 'CONT-EXP-01',
        status: 'Arrived',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('import_inventory_receipts')
      .values({
        tenant_id: tenantId,
        shipment_id: shipment.id,
        state: 'posted',
      })
      .execute();

    // 100 units total received (40 on hand -> 60 sold)
    await db
      .insertInto('import_shipment_items')
      .values({
        tenant_id: tenantId,
        shipment_id: shipment.id,
        product_id: product.id,
        quantity: 100,
        received_quantity: 100,
        factory_unit_price_usd: 8.00,
        landed_cost_egp: 400,
      })
      .execute();

    const res = await service.processLateShipmentExpense(tenantId, userId, shipment.id, {
      title: 'Late Detention & Terminal Charges',
      lateExpenseAmount: 10000,
      note: 'Late demurrage from shipping line',
    });

    assert.strictEqual(res.success, true);
    // 60 units sold (60%) -> 6,000 COGS, 40 units on hand (40%) -> 4,000 Inventory
    assert.strictEqual(res.allocation.lateCogsAdjustmentEgp, 6000);
    assert.strictEqual(res.allocation.lateInventoryAdjustmentEgp, 4000);

    // Verify journal entry lines created with dynamically resolved accounts
    const je = await db
      .selectFrom('journal_entries')
      .selectAll()
      .where('source_type', '=', 'import_late_expense')
      .orderBy('id', 'desc')
      .executeTakeFirstOrThrow();

    const lines = await db
      .selectFrom('journal_entry_lines')
      .selectAll()
      .where('journal_entry_id', '=', je.id)
      .execute();

    assert.strictEqual(lines.length, 3);
    const lineCogs = lines.find((l) => Number(l.debit) === 6000);
    assert.ok(lineCogs, 'COGS line must exist');
    assert.strictEqual(Number(lineCogs.account_id), accounts['5110'], 'COGS account must match dynamic resolution');

    const lineInv = lines.find((l) => Number(l.debit) === 4000);
    assert.ok(lineInv, 'Inventory line must exist');
    assert.strictEqual(Number(lineInv.account_id), accounts['1140'], 'Inventory account must match dynamic resolution');

    const lineAp = lines.find((l) => Number(l.credit) === 10000);
    assert.ok(lineAp, 'Payable line must exist');
    assert.strictEqual(Number(lineAp.account_id), accounts['2110'], 'Payable account must match dynamic resolution');

    console.log('PASS: Late shipment expense dynamic COA resolution and IAS 2 split verified.');
  }

  // -------------------------------------------------------------
  // Test 5: Partner UPSERT & Constraint Safety
  // -------------------------------------------------------------
  console.log('\nRunning Test 5: setProjectPartners UPSERT & Constraint Safety...');
  {
    const project = await db
      .insertInto('import_projects')
      .values({ tenant_id: tenantId, project_no: 'PRJ-UPSERT-01', title: 'Partner Upsert Project', status: 'active' })
      .returning('id')
      .executeTakeFirstOrThrow();

    const partnerA = await db
      .insertInto('import_partners')
      .values({ tenant_id: tenantId, name: 'Investor Alpha', capital_amount: 50000 })
      .returning('id')
      .executeTakeFirstOrThrow();

    const partnerB = await db
      .insertInto('import_partners')
      .values({ tenant_id: tenantId, name: 'Investor Beta', capital_amount: 50000 })
      .returning('id')
      .executeTakeFirstOrThrow();

    // Round 1: Assign 60% Alpha, 40% Beta
    await service.setProjectPartners(tenantId, project.id, [
      { partnerId: partnerA.id, profitPercentage: 60, capitalShare: 60000 },
      { partnerId: partnerB.id, profitPercentage: 40, capitalShare: 40000 },
    ]);

    // Round 2: Update same partners to 70% Alpha, 30% Beta (MUST NOT crash on UNIQUE constraint)
    const updateRes = await service.setProjectPartners(tenantId, project.id, [
      { partnerId: partnerA.id, profitPercentage: 70, capitalShare: 70000 },
      { partnerId: partnerB.id, profitPercentage: 30, capitalShare: 30000 },
    ]);
    assert.strictEqual(updateRes.success, true);

    const partnerRows = await db
      .selectFrom('import_project_partners')
      .selectAll()
      .where('project_id', '=', project.id)
      .where('tenant_id', '=', tenantId)
      .execute();
    assert.strictEqual(partnerRows.length, 2);

    const alphaRow = partnerRows.find((p) => p.partner_id === partnerA.id);
    assert.strictEqual(Number(alphaRow?.profit_percentage), 70);
    console.log('PASS: setProjectPartners UPSERT safely updated partners without constraint conflict.');
  }

  // -------------------------------------------------------------
  // Test 6: Official Customs Tariff Reality Check
  // -------------------------------------------------------------
  console.log('\nRunning Test 6: Customs Tariff Official Source Verification...');
  {
    await db
      .insertInto('import_customs_tariffs')
      .values({
        tenant_id: tenantId,
        hs_code: '8481.80.90',
        description_ar: 'صمامات صناعية',
        description_en: 'Industrial Valves',
        duty_rate_percent: 5.0,
        vat_rate_percent: 14.0,
        is_official: false,
        official_source: null,
      })
      .execute();

    const calculation = await service.calculateCustomsTax(
      tenantId,
      '8481.80.90',
      100000
    );

    assert.strictEqual(calculation.customsDuty, 5000);
    assert.strictEqual(calculation.vatAmount, 14700);
    assert.strictEqual(calculation.isOfficialTariff, false);
    assert.strictEqual(calculation.isDocumentedTariff, false);
    console.log('PASS: Unofficial customs tariff correctly marked without false official designation.');
  }

  console.log('\n--- ALL AUDITED POSTGRESQL (PGLITE) INTEGRATION AUDITS PASSED (100%) ---');
}

runTests().catch((err) => {
  console.error('\nFAILED INTEGRATION AUDIT:', err);
  process.exit(1);
});
