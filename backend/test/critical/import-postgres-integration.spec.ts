import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { Kysely, sql } from 'kysely';
import { PGlite } from '@electric-sql/pglite';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { BadRequestException } from '@nestjs/common';
import type { Database } from '../../src/database/database.types';
import { ImportSalesService } from '../../src/modules/import-sales/import-sales.service';

/**
 * IMPORT-POSTGRES-INTEGRATION — اختبارات التكامل الحقيقية على محرك PostgreSQL (PGlite).
 *
 * يختبر هذا الجناح العمليات الفعلية واستعلامات قاعدة البيانات الحقيقية:
 * 1. تطابق أعمدة supplier_ledger وقيد اليومية المتزن لفروق العملات وسداد الموردين.
 * 2. استخدام العمود الحقيقي qty في product_location_stock وتوزيع المصروفات المتأخرة.
 * 3. عمل setProjectPartners بنمط upsert دون تعارض مع قيد UNIQUE (tenant_id, project_id, partner_id).
 * 4. عزل أرباح المشروع بمصدر المخزون الفعلي المستورد وعدم احتساب مبيعات تتجاوز الكمية المستلمة.
 * 5. حظر إقفال المشروع closeProject عند وجود فواتير مسددة جزئياً أو التزامات غير مسواة.
 * 6. حظر اعتبار التعريفات غير الرسمية كتعريفات موثقة في calculateCustomsTax.
 */

async function setupDatabase(): Promise<Kysely<Database>> {
  const pglite = new PGlite();
  const db = new Kysely<Database>({
    dialect: new PGliteDialect(pglite),
  });

  // Create core schema tables via raw multi-statement DDL execution
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

    CREATE TABLE products (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      account_id TEXT DEFAULT '1',
      name TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      price NUMERIC(15, 2) DEFAULT 0,
      cost_price NUMERIC(15, 6) DEFAULT 0,
      stock_qty NUMERIC(15, 2) DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
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
      phone TEXT,
      balance NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
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
      account_id BIGINT NOT NULL,
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
      table_number TEXT DEFAULT '',
      order_type TEXT DEFAULT 'takeaway',
      doc_no TEXT,
      customer_id BIGINT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      payment_type TEXT DEFAULT 'cash',
      payment_channel TEXT DEFAULT 'cash',
      subtotal NUMERIC(15, 2) DEFAULT 0,
      discount NUMERIC(15, 2) DEFAULT 0,
      tax_rate NUMERIC(5, 2) DEFAULT 0,
      tax_amount NUMERIC(15, 2) DEFAULT 0,
      delivery_fee NUMERIC(15, 2) DEFAULT 0,
      prices_include_tax BOOLEAN DEFAULT FALSE,
      total NUMERIC(15, 2) DEFAULT 0,
      paid_amount NUMERIC(15, 2) DEFAULT 0,
      tendered_amount NUMERIC(15, 2) DEFAULT 0,
      change_amount NUMERIC(15, 2) DEFAULT 0,
      store_credit_used NUMERIC(15, 2) DEFAULT 0,
      status TEXT DEFAULT 'completed',
      note TEXT,
      branch_id BIGINT,
      location_id BIGINT,
      created_by BIGINT,
      cancelled_at TIMESTAMPTZ,
      cancelled_by BIGINT,
      cancel_reason TEXT DEFAULT '',
      delivery_rep_id BIGINT,
      delivery_status TEXT,
      collection_status TEXT,
      settled_at TIMESTAMPTZ,
      settled_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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
      unit_name TEXT DEFAULT 'PCS',
      unit_multiplier NUMERIC(10, 2) DEFAULT 1,
      cost_price NUMERIC(15, 6) DEFAULT 0,
      allocated_discount NUMERIC(15, 2) DEFAULT 0,
      price_type TEXT DEFAULT 'retail',
      notes TEXT DEFAULT '',
      modifiers JSONB DEFAULT '{}'
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

    CREATE TABLE purchases (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      doc_no TEXT,
      project_id UUID,
      total NUMERIC(15, 2) DEFAULT 0,
      paid_amount NUMERIC(15, 2) DEFAULT 0,
      status TEXT DEFAULT 'received',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_no TEXT NOT NULL,
      title TEXT NOT NULL,
      target_market TEXT DEFAULT NULL,
      country_origin TEXT DEFAULT NULL,
      country_destination TEXT DEFAULT NULL,
      budget_currency TEXT DEFAULT 'EGP',
      allocated_capital NUMERIC(15, 2) DEFAULT 0,
      target_roi_percentage NUMERIC(5, 2) DEFAULT 0,
      status TEXT DEFAULT 'active',
      feasibility_data JSONB DEFAULT NULL,
      closure_data JSONB DEFAULT NULL,
      closure_date TIMESTAMPTZ DEFAULT NULL,
      closed_by BIGINT,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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
      type TEXT NOT NULL,
      amount NUMERIC(15, 2) NOT NULL,
      transaction_date DATE NOT NULL,
      note TEXT,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_shipments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID REFERENCES import_projects(id),
      container_number TEXT NOT NULL,
      status TEXT DEFAULT 'In Transit',
      pricing_exchange_rate NUMERIC(10, 4) DEFAULT 50.0,
      shipping_cost_usd NUMERIC(12, 2) DEFAULT 0,
      customs_cost_egp NUMERIC(12, 2) DEFAULT 0,
      internal_transport_cost_egp NUMERIC(12, 2) DEFAULT 0,
      shipping_expense_id BIGINT,
      customs_expense_id BIGINT,
      transport_expense_id BIGINT,
      late_expenses_total_egp NUMERIC(12, 2) DEFAULT 0,
      late_cogs_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
      late_inventory_adjustment_egp NUMERIC(12, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_shipment_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      quantity NUMERIC(12, 2) NOT NULL,
      factory_unit_price_usd NUMERIC(12, 2) NOT NULL,
      allocated_overhead_egp NUMERIC(12, 2) DEFAULT 0,
      landed_cost_egp NUMERIC(12, 6) DEFAULT 0,
      received_quantity NUMERIC(12, 2) DEFAULT 0,
      shortage_handling_method TEXT,
      target_margin_percent NUMERIC(5, 2) DEFAULT 0,
      target_retail_margin NUMERIC(5, 2) DEFAULT 0,
      target_wholesale_margin NUMERIC(5, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_inventory_receipts (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      shipment_id UUID NOT NULL REFERENCES import_shipments(id) ON DELETE CASCADE,
      state TEXT NOT NULL CHECK (state IN ('posted', 'legacy_review_required')),
      review_reason TEXT,
      posted_at TIMESTAMPTZ,
      created_by BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tenant_id, shipment_id)
    );

    CREATE TABLE import_sourcing_trips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID REFERENCES import_projects(id),
      trip_title TEXT NOT NULL,
      destination_city TEXT DEFAULT '',
      start_date DATE DEFAULT CURRENT_DATE,
      end_date DATE DEFAULT CURRENT_DATE,
      actual_cost_egp NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_proforma_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      project_id UUID REFERENCES import_projects(id),
      supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
      pi_number TEXT NOT NULL,
      pi_date DATE DEFAULT CURRENT_DATE,
      total_amount_foreign NUMERIC(15, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      status TEXT DEFAULT 'approved',
      payment_status VARCHAR(50) DEFAULT 'unpaid',
      paid_amount_foreign NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE import_customs_tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      hs_code VARCHAR(50) NOT NULL,
      description_ar VARCHAR(255) NOT NULL,
      description_en VARCHAR(255),
      duty_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      vat_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
      regulatory_body VARCHAR(100),
      inspection_fees_percent NUMERIC(5, 2) DEFAULT 0.00,
      official_source VARCHAR(255) DEFAULT NULL,
      effective_date DATE DEFAULT CURRENT_DATE,
      is_official BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_import_customs_tariffs UNIQUE (tenant_id, hs_code)
    );
  `;
  await pglite.exec(ddl);

  return db;
}

async function testAll(): Promise<void> {
  console.log('--- STARTING REAL POSTGRESQL (PGLITE) INTEGRATION AUDIT ---');
  const db = await setupDatabase();
  const service = new ImportSalesService(db as any);

  const TENANT_ID = 'tenant_prod_1';
  const USER_ID = 101;

  // Insert seed tenant and user
  await db.insertInto('tenants').values({ id: TENANT_ID } as any).execute();
  await db.insertInto('users').values({
    id: USER_ID,
    tenant_id: TENANT_ID,
    username: 'accountant_master',
    password_hash: 'hash',
    role: 'admin',
  } as any).execute();

  // Insert suppliers
  const supp = await db.insertInto('suppliers').values({
    tenant_id: TENANT_ID,
    account_id: '2110',
    name: 'Shenzhen Tech Factory Ltd',
    balance: 50000, // $50,000 USD initial liability
  } as any).returning('id').executeTakeFirstOrThrow();
  const supplierId = Number(supp.id);

  // -------------------------------------------------------------
  // TEST 1: setProjectPartners UPSERT & UNIQUE CONSTRAINT SAFETY
  // -------------------------------------------------------------
  console.log('Running Test 1: setProjectPartners UPSERT & UNIQUE Constraint Safety...');
  const proj = await db.insertInto('import_projects').values({
    tenant_id: TENANT_ID,
    project_no: 'PRJ-261020-0001',
    title: 'Electronics Import Q4',
    allocated_capital: 2000000,
    status: 'active',
  } as any).returning('id').executeTakeFirstOrThrow();
  const projectId = String(proj.id);

  const partner1 = await db.insertInto('import_partners').values({
    tenant_id: TENANT_ID,
    name: 'Partner Alpha',
    capital_amount: 1000000,
  } as any).returning('id').executeTakeFirstOrThrow();

  const partner2 = await db.insertInto('import_partners').values({
    tenant_id: TENANT_ID,
    name: 'Partner Beta',
    capital_amount: 1000000,
  } as any).returning('id').executeTakeFirstOrThrow();

  const p1Id = String(partner1.id);
  const p2Id = String(partner2.id);

  // First assignment: Alpha (50%), Beta (50%)
  await service.setProjectPartners(TENANT_ID, projectId, [
    { partnerId: p1Id, profitPercentage: 50, capitalShare: 1000000 },
    { partnerId: p2Id, profitPercentage: 50, capitalShare: 1000000 },
  ]);

  // Second assignment: Modifying the exact SAME partners (Alpha 60%, Beta 40%)
  // In PostgreSQL, this previously crashed with UNIQUE constraint violation on uq_import_project_partners.
  // Our fix must cleanly upsert!
  await service.setProjectPartners(TENANT_ID, projectId, [
    { partnerId: p1Id, profitPercentage: 60, capitalShare: 1200000 },
    { partnerId: p2Id, profitPercentage: 40, capitalShare: 800000 },
  ]);

  const assignedPartners = await db
    .selectFrom('import_project_partners')
    .selectAll()
    .where('project_id', '=', projectId)
    .where('tenant_id', '=', TENANT_ID)
    .where('is_active', '=', true)
    .execute();

  assert.equal(assignedPartners.length, 2, 'Must have exactly 2 active partner rows after update');
  const alphaRow = assignedPartners.find((p) => p.partner_id === p1Id);
  assert.equal(Number(alphaRow?.profit_percentage), 60, 'Partner Alpha must be cleanly updated to 60% without duplicate error');
  console.log('PASS Test 1: setProjectPartners UPSERT & UNIQUE constraint handled flawlessly.');

  // -------------------------------------------------------------
  // TEST 2: recordForeignTransfer REAL SCHEMA & BALANCED JOURNAL
  // -------------------------------------------------------------
  console.log('Running Test 2: recordForeignTransfer Real Schema & Balanced Double-Entry Journal...');
  // Scenario: Proforma of $10,000 USD agreed at 48 EGP/USD. Bank executed at 50 EGP/USD.
  // Cash paid = 500,000 EGP. Contract value = 480,000 EGP. Forex variance = 20,000 EGP (Loss).
  const pi = await db.insertInto('import_proforma_invoices').values({
    tenant_id: TENANT_ID,
    project_id: projectId,
    supplier_id: supplierId,
    pi_number: 'PI-CHINA-101',
    total_amount_foreign: 10000,
    paid_amount_foreign: 0,
    status: 'approved',
    currency: 'USD',
    payment_status: 'unpaid',
  } as any).returning('id').executeTakeFirstOrThrow();

  const transferResult = await service.recordForeignTransfer(TENANT_ID, USER_ID, {
    supplierId: String(supplierId),
    amountForeign: 10000,
    amountEgp: 500000,
    currency: 'USD',
    exchangeRateContract: 48,
    proformaInvoiceId: String(pi.id),
    notes: 'Payment for PI-CHINA-101',
  });

  assert.equal(transferResult.forexVarianceEgp, 20000, 'Forex variance must be exactly 20,000 EGP');

  // Verify real supplier_ledger row
  const ledgerRows = await db
    .selectFrom('supplier_ledger')
    .selectAll()
    .where('supplier_id', '=', supplierId)
    .where('tenant_id', '=', TENANT_ID)
    .execute();

  assert.equal(ledgerRows.length, 1, 'Supplier ledger row must exist in PostgreSQL');
  const lRow = ledgerRows[0];
  assert.equal(lRow.entry_type, 'payment', 'Real column entry_type must be payment');
  assert.equal(Number(lRow.amount), 10000, 'Ledger amount must be 10000');
  assert.equal(Number(lRow.balance_after), 40000, 'Balance after must be 50,000 - 10,000 = 40,000');
  assert.equal(lRow.reference_type, 'supplier_payment');

  // Verify balanced journal entry in journal_entries & lines
  const jeLines = await db
    .selectFrom('journal_entry_lines')
    .selectAll()
    .where('journal_entry_id', '=', transferResult.journalEntryId!)
    .execute();

  assert.ok(jeLines.length >= 3, 'Must have at least 3 journal lines (AP debit, Forex loss debit, Cash credit)');
  const sumDebit = jeLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const sumCredit = jeLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  assert.equal(sumDebit, 500000, 'Total debit must be 500,000 EGP');
  assert.equal(sumCredit, 500000, 'Total credit must be 500,000 EGP');
  assert.equal(sumDebit, sumCredit, 'Journal entry must be 100% mathematically balanced (Debits === Credits)');
  console.log('PASS Test 2: recordForeignTransfer real schema & balanced journal confirmed.');

  // -------------------------------------------------------------
  // TEST 3: processLateShipmentExpense REAL SCHEMA (qty) & IAS 2
  // -------------------------------------------------------------
  console.log('Running Test 3: processLateShipmentExpense Real Schema (qty) & IAS 2...');
  const prod = await db.insertInto('products').values({
    tenant_id: TENANT_ID,
    name: 'Smart Gadget Pro',
    cost_price: 500,
    stock_qty: 60,
  } as any).returning('id').executeTakeFirstOrThrow();
  const productId = Number(prod.id);

  // Insert location stock using real column qty (NOT qty_on_hand)
  await db.insertInto('product_location_stock').values({
    tenant_id: TENANT_ID,
    product_id: productId,
    qty: 60, // 60 on hand in warehouse
  } as any).execute();

  // Create shipment with 100 units (60 on hand, 40 already sold)
  const ship = await db.insertInto('import_shipments').values({
    tenant_id: TENANT_ID,
    project_id: projectId,
    container_number: 'MSKU-LATE-1',
    status: 'Arrived',
    pricing_exchange_rate: 50,
  } as any).returning('id').executeTakeFirstOrThrow();
  const shipmentId = String(ship.id);

  await db.insertInto('import_shipment_items').values({
    tenant_id: TENANT_ID,
    shipment_id: shipmentId,
    product_id: productId,
    quantity: 100,
    received_quantity: 100,
    factory_unit_price_usd: 10,
    landed_cost_egp: 500,
  } as any).execute();

  await db.insertInto('import_inventory_receipts').values({
    tenant_id: TENANT_ID,
    shipment_id: shipmentId,
    state: 'posted',
    posted_at: new Date(),
  } as any).execute();

  // Late expense of 30,000 EGP arrives post-sale (40 sold = 40%, 60 on-hand = 60%)
  const lateRes = await service.processLateShipmentExpense(TENANT_ID, USER_ID, shipmentId, {
    lateExpenseAmount: 30000,
    title: 'Late Port Demurrage Invoice',
  });

  assert.equal(lateRes.allocation.lateCogsAdjustmentEgp, 12000, '40% (12,000 EGP) must be allocated to COGS for 40 sold units');
  assert.equal(lateRes.allocation.lateInventoryAdjustmentEgp, 18000, '60% (18,000 EGP) must be allocated to inventory asset for 60 on-hand units');

  // Verify balanced journal entry for late expense
  const lateJeLines = await db
    .selectFrom('journal_entry_lines')
    .selectAll()
    .where('journal_entry_id', '=', lateRes.allocation.journalEntryId!)
    .execute();

  const lateDebit = lateJeLines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const lateCredit = lateJeLines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  assert.equal(lateDebit, 30000, 'Late expense debit must equal 30,000 EGP');
  assert.equal(lateCredit, 30000, 'Late expense credit must equal 30,000 EGP');
  assert.equal(lateDebit, lateCredit, 'Late expense journal entry must be 100% balanced');
  console.log('PASS Test 3: processLateShipmentExpense real schema (qty) & IAS 2 passed.');

  // -------------------------------------------------------------
  // TEST 4: generatePeriodProfitReport PROJECT INVENTORY SCOPING
  // -------------------------------------------------------------
  console.log('Running Test 4: generatePeriodProfitReport Project Inventory Scoping...');
  // Record sales: Total store sold 150 units @ 1,000 EGP = 150,000 EGP
  // But Project Alpha only imported 100 units!
  // Project Alpha must ONLY be attributed 100 units (100 * 1,000 = 100,000 EGP) with landed cost 500 (COGS = 50,000 EGP)!
  const sale = await db.insertInto('sales').values({
    tenant_id: TENANT_ID,
    total: 150000,
    status: 'completed',
    created_at: new Date().toISOString() as any,
  } as any).returning('id').executeTakeFirstOrThrow();

  await db.insertInto('sale_items').values({
    tenant_id: TENANT_ID,
    sale_id: Number(sale.id),
    product_id: productId,
    product_name: 'Smart Gadget Pro',
    qty: 150,
    unit_price: 1000,
    line_total: 150000,
    cost_price: 500,
    unit_name: 'PCS',
    unit_multiplier: 1,
    price_type: 'retail',
  } as any).execute();

  const profitRep = await service.generatePeriodProfitReport(
    TENANT_ID,
    new Date('2020-01-01'),
    new Date('2030-01-01'),
    projectId
  );

  // Revenue must be capped at 100 units * 1,000 = 100,000 EGP (not the entire store's 150,000 EGP!)
  assert.equal(profitRep.data.grossSalesRevenue, 100000, 'Project revenue must be strictly bounded by project imported inventory (100 units)');
  // Landed cost was initially 500 EGP + 300 EGP late expense = 800 EGP per unit!
  assert.equal(profitRep.data.grossCogs, 80000, 'Project COGS must equal 100 units * 800 EGP landed cost (including late expense)');
  assert.equal(profitRep.data.grossProfit, 20000, 'Project Gross profit must equal 100,000 - 80,000 = 20,000 EGP');
  console.log('PASS Test 4: generatePeriodProfitReport project inventory source scoping confirmed.');

  // -------------------------------------------------------------
  // TEST 5: closeProject PRE-CLOSURE AUDIT GATE
  // -------------------------------------------------------------
  console.log('Running Test 5: closeProject Pre-Closure Audit Gate...');
  // Create another project with a partially paid proforma
  const projBeta = await db.insertInto('import_projects').values({
    tenant_id: TENANT_ID,
    project_no: 'PRJ-261020-0002',
    title: 'Machinery Import',
    status: 'active',
  } as any).returning('id').executeTakeFirstOrThrow();
  const projBetaId = String(projBeta.id);

  const shipBeta = await db.insertInto('import_shipments').values({
    tenant_id: TENANT_ID,
    project_id: projBetaId,
    container_number: 'MSKU-BETA-1',
    status: 'Arrived',
  } as any).returning('id').executeTakeFirstOrThrow();

  await db.insertInto('import_inventory_receipts').values({
    tenant_id: TENANT_ID,
    shipment_id: shipBeta.id,
    state: 'posted',
    posted_at: new Date(),
  } as any).execute();

  // Proforma is partially paid ($3,000 of $10,000)
  await db.insertInto('import_proforma_invoices').values({
    tenant_id: TENANT_ID,
    project_id: projBetaId,
    supplier_id: supplierId,
    pi_number: 'PI-BETA-01',
    total_amount_foreign: 10000,
    paid_amount_foreign: 3000,
    status: 'approved',
    currency: 'USD',
    payment_status: 'partially_paid',
  } as any).execute();

  // Must reject closure due to unsettled partially paid proforma!
  let threw = false;
  try {
    await service.closeProject(TENANT_ID, USER_ID, projBetaId);
  } catch (err: any) {
    threw = true;
    assert.ok(err instanceof BadRequestException, 'Must throw BadRequestException');
    assert.ok(err.message.includes('غير مسددة بالكامل'), 'Message must indicate unpaid proforma balance');
  }
  assert.equal(threw, true, 'closeProject must strictly block projects with partially paid proformas');
  console.log('Test 5 part 1 passed: correctly rejected partially paid proforma.');

  // Now pay in full:
  console.log('Test 5 part 2: updating proforma to paid in full...');
  await db.updateTable('import_proforma_invoices')
    .set({ paid_amount_foreign: 10000, payment_status: 'paid' })
    .where('project_id', '=', projBetaId)
    .execute();

  console.log('Test 5 part 3: calling closeProject for fully paid project...');
  // Closure must now succeed!
  const closeRes = await service.closeProject(TENANT_ID, USER_ID, projBetaId);
  console.log('Test 5 part 4: closeProject returned success:', closeRes.success);
  assert.equal(closeRes.success, true);

  const closedProj = await db
    .selectFrom('import_projects')
    .selectAll()
    .where('id', '=', projBetaId)
    .executeTakeFirstOrThrow();

  assert.equal(closedProj.status, 'closed');
  assert.ok(closedProj.closure_data, 'Frozen closure_data snapshot must be saved in database');
  console.log('PASS Test 5: closeProject pre-closure audit gate confirmed.');

  // -------------------------------------------------------------
  // TEST 6: calculateCustomsTax OFFICIAL TARIFF REALITY CHECK
  // -------------------------------------------------------------
  console.log('Running Test 6: calculateCustomsTax Official Tariff Reality Check...');
  await db.insertInto('import_customs_tariffs').values({
    tenant_id: TENANT_ID,
    hs_code: '8517.12.00',
    description_ar: 'هواتف ذكية',
    duty_rate_percent: 5,
    vat_rate_percent: 14,
    is_official: false, // NOT official
    official_source: null,
  } as any).execute();

  const unverifiedTax = await service.calculateCustomsTax(TENANT_ID, '8517.12.00', 100000);
  assert.equal(unverifiedTax.isOfficialTariff, false, 'Unverified tariff must have isOfficialTariff = false');
  assert.equal(unverifiedTax.isDocumentedTariff, false, 'Unverified tariff must not be treated as documented official');

  // Update to official
  await db.updateTable('import_customs_tariffs')
    .set({ is_official: true, official_source: 'مصلحة الجمارك المصرية - التعريفة الرسمية 2026' } as any)
    .where('hs_code', '=', '8517.12.00')
    .execute();

  const officialTax = await service.calculateCustomsTax(TENANT_ID, '8517.12.00', 100000);
  assert.equal(officialTax.isOfficialTariff, true, 'Official tariff must have isOfficialTariff = true');
  assert.equal(officialTax.isDocumentedTariff, true, 'Official tariff must be documented');
  console.log('PASS Test 6: calculateCustomsTax official tariff reality check confirmed.');

  await db.destroy();
  console.log('--- ALL REAL POSTGRESQL (PGLITE) INTEGRATION AUDITS PASSED (100%) ---');
}

testAll().catch((err) => {
  console.error('FAIL in PostgreSQL Integration Suite:', err);
  process.exit(1);
});
