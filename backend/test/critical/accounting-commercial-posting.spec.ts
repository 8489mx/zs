import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';
import { PGliteDialect } from 'kysely-pglite-dialect';
import { Database } from '../../src/database/database.types';
import { AccountingPostingService } from '../../src/modules/accounting/accounting-posting.service';
import { AccountingService } from '../../src/modules/accounting/accounting.service';
import { AccountingTenantFoundationService } from '../../src/modules/accounting/accounting-tenant-foundation.service';
import { accountingDateKey } from '../../src/modules/accounting/accounting-tax-lock';
import { purchaseReceiptBaseUnitCost } from '../../src/modules/purchases/engines/purchase-receipt-cost.engine';
import { calculateCarrierCreditBaseAmount } from '../../src/modules/maritime-freight/engines/carrier-credit.engine';
import { assertAutomatedJournalPeriodOpen } from '../../src/modules/accounting/accounting-period-lock';
import { PurchasesWriteService } from '../../src/modules/purchases/services/purchases-write.service';
import { PurchasesFinanceService } from '../../src/modules/purchases/services/purchases-finance.service';
import { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';

// Exercise the actual posting and journal services against PostgreSQL semantics.
// Foundation seeding is tested separately; these fixtures start with a complete mapping.
async function main() {
  const pg = new PGlite();
  const db = new Kysely<Database>({ dialect: new PGliteDialect(pg) });
  const foundation = { ensureForAuth: async () => {}, ensureForScope: async () => {} } as unknown as AccountingTenantFoundationService;
  const posting = new AccountingPostingService(foundation);
  const accounting = new AccountingService(db, foundation, posting);
  const auth = { tenantId: 't1', accountId: 'a1', role: 'admin', userId: 1, permissions: [] } as unknown as AuthContext;
  try {
    await pg.exec(`
      CREATE TABLE accounting_accounts (id bigint PRIMARY KEY, tenant_id text, code text,
        name_ar text DEFAULT '', name_en text DEFAULT '', is_active boolean DEFAULT true,
        allow_manual_entries boolean DEFAULT true, is_tax boolean DEFAULT false, account_group text DEFAULT '',
        is_control_account boolean DEFAULT false,is_receivable boolean DEFAULT false,is_payable boolean DEFAULT false,is_inventory boolean DEFAULT false);
      CREATE TABLE accounting_settings (id bigint, tenant_id text, cash_account_id bigint,
        bank_account_id bigint, customer_receivable_account_id bigint, supplier_payable_account_id bigint,
        inventory_account_id bigint, sales_revenue_account_id bigint, sales_discount_account_id bigint,
        cogs_account_id bigint, sales_tax_account_id bigint, purchase_tax_account_id bigint,
        lock_date_all date, lock_date_non_adviser date, lock_date_tax date);
      CREATE TABLE accounting_fiscal_periods (tenant_id text, status text, name text,
        period_number int, start_date date, end_date date);
      CREATE TABLE journal_entries (id bigserial PRIMARY KEY, tenant_id text, account_id text,
        entry_no text UNIQUE, entry_date timestamptz, description text, source_type text, source_id bigint,
        status text, branch_id bigint, location_id bigint, created_by bigint, posted_by bigint,
        posted_at timestamptz, updated_at timestamptz, reversal_of_entry_id bigint,
        reversed_by_entry_id bigint, cancelled_by bigint, cancelled_at timestamptz, cancel_reason text,
        dedup_key text, cash_flow_category text);
      CREATE TABLE journal_entry_lines (id bigserial PRIMARY KEY, journal_entry_id bigint,
        tenant_id text, account_id bigint, cost_center_id bigint, description text, debit numeric, credit numeric,
        partner_type text, partner_id bigint, branch_id bigint, location_id bigint, is_reconciled boolean DEFAULT false);
      CREATE TABLE cost_centers (id bigint, tenant_id text, code text, name text);
      CREATE TABLE settings (tenant_id text, key text, value text);
      CREATE TABLE currency_exchange_rates (tenant_id text, currency_code text, is_base boolean, exchange_rate numeric);
      CREATE TABLE customers (id bigint,tenant_id text,balance numeric DEFAULT 0);
      CREATE TABLE suppliers (id bigint,tenant_id text,balance numeric DEFAULT 0,updated_at timestamptz);
      INSERT INTO customers VALUES (25,'t1',0);
      INSERT INTO suppliers VALUES (9,'t1',0,NULL);
      CREATE TABLE sales (id bigint PRIMARY KEY, tenant_id text, doc_no text, customer_id bigint,
        subtotal numeric, discount numeric DEFAULT 0, tax_amount numeric DEFAULT 0, total numeric,
        paid_amount numeric DEFAULT 0, store_credit_used numeric DEFAULT 0, exchange_return_id bigint,
        branch_id bigint, location_id bigint, created_by bigint DEFAULT 1, created_at timestamptz DEFAULT '2026-10-01',
        delivery_fee numeric DEFAULT 0, delivery_fee_mode text, service_charge numeric DEFAULT 0,
        tip_amount numeric DEFAULT 0, prices_include_tax boolean DEFAULT false, sale_origin text,
        payment_type text DEFAULT 'cash', collection_status text);
      CREATE TABLE sale_payments (tenant_id text, sale_id bigint, payment_channel text, amount numeric);
      CREATE TABLE sale_items (id bigint PRIMARY KEY, tenant_id text, sale_id bigint, product_id bigint, qty numeric, cost_price numeric);
      CREATE TABLE purchases (id bigint PRIMARY KEY, tenant_id text, doc_no text, supplier_id bigint,
        payment_type text, subtotal numeric, discount numeric DEFAULT 0, tax_amount numeric, total numeric,
        branch_id bigint, location_id bigint, created_by bigint DEFAULT 1, created_at timestamptz DEFAULT '2026-10-01',
        grn_id bigint, po_id bigint, lifecycle_status text, three_way_match_status text);
      CREATE TABLE purchase_items (tenant_id text, purchase_id bigint, qty numeric, unit_cost numeric,
        grn_line_id bigint, grni_amount numeric);
      CREATE TABLE return_documents (id bigint PRIMARY KEY, tenant_id text, doc_no text, return_type text,
        invoice_id bigint, settlement_mode text, refund_method text, refund_allocations jsonb, total numeric,
        branch_id bigint, location_id bigint, created_by bigint DEFAULT 1, created_at timestamptz DEFAULT '2026-10-02');
      CREATE TABLE return_items (tenant_id text, return_document_id bigint, product_id bigint,
        sale_item_id bigint, qty numeric, cost_price numeric, allocated_tax numeric);
      INSERT INTO accounting_settings VALUES
        (1,'t1',1110,1120,1130,2110,1140,4100,4300,5100,2120,1150,NULL,NULL,NULL);
      INSERT INTO cost_centers VALUES (7,'t1','CC7','Cost center');
    `);
    for (const code of [1110,1120,1130,1140,1150,2110,2120,2125,2150,4100,4300,4400,5100,5190,7290,9001]) {
      await pg.query('INSERT INTO accounting_accounts(id,tenant_id,code,is_tax) VALUES ($1,$2,$3,$4)',
        [code, 't1', String(code), code === 1150 || code === 2120]);
    }
    await pg.exec(`INSERT INTO accounting_accounts(id,tenant_id,code,is_tax) VALUES (9910,'t2','TAX',true)`);
    const amount = async (id: number, code: number, side: 'debit' | 'credit') => {
      const rows = await pg.query<{ amount: string }>(`SELECT coalesce(sum(${side}),0) AS amount FROM journal_entry_lines WHERE journal_entry_id=$1 AND account_id=$2`, [id, code]);
      return Number(rows.rows[0].amount);
    };
    const assertBalanced = async () => {
      const result = await pg.query(`SELECT journal_entry_id FROM journal_entry_lines GROUP BY journal_entry_id HAVING sum(debit) <> sum(credit)`);
      assert.deepEqual(result.rows, [], 'every saved journal balances exactly');
    };
    await pg.exec(`
      INSERT INTO sales(id,tenant_id,doc_no,subtotal,discount,tax_amount,total,paid_amount) VALUES (1,'t1','S1',100,10,12.6,102.6,102.6);
      INSERT INTO sale_payments VALUES ('t1',1,'cash',102.6);
      INSERT INTO sale_items VALUES (1,'t1',1,10,2,30);
      INSERT INTO sales(id,tenant_id,doc_no,customer_id,subtotal,discount,tax_amount,total,prices_include_tax,payment_type)
        VALUES (2,'t1','S2',25,114,11.4,12.6,102.6,true,'credit');
      INSERT INTO sale_items VALUES (2,'t1',2,10,2,30);
    `);
    const sale = await posting.postSale(db, 1, auth);
    assert.equal(await amount(sale.journalEntryId, 1110, 'debit'), 102.6);
    assert.equal(await amount(sale.journalEntryId, 4100, 'credit'), 100);
    assert.equal(await amount(sale.journalEntryId, 4300, 'debit'), 10);
    assert.equal(await amount(sale.journalEntryId, 5100, 'debit'), 60);
    assert.equal(await amount(sale.journalEntryId, 2120, 'credit'), 12.6);
    assert.equal((await posting.postSale(db, 1, auth)).posted, false, 'retry must not post twice');
    const creditSale = await posting.postSale(db, 2, auth);
    assert.equal(await amount(creditSale.journalEntryId, 4100, 'credit'), 101.4);
    assert.equal(await amount(creditSale.journalEntryId, 1130, 'debit'), 102.6);
    await pg.exec(`
      INSERT INTO purchases(id,tenant_id,doc_no,supplier_id,payment_type,subtotal,discount,tax_amount,total)
        VALUES (1,'t1','P1',9,'credit',228,22.8,25.2,205.2);
      INSERT INTO purchase_items VALUES ('t1',1,2,102.6,NULL,NULL);
    `);
    const purchase = await posting.postPurchase(db, 1, auth);
    assert.equal(await amount(purchase.journalEntryId, 1140, 'debit'), 180);
    assert.equal(await amount(purchase.journalEntryId, 1150, 'debit'), 25.2);
    assert.equal(await amount(purchase.journalEntryId, 2110, 'credit'), 205.2);
    await pg.exec(`
      INSERT INTO return_documents(id,tenant_id,doc_no,return_type,invoice_id,refund_allocations,total)
        VALUES (1,'t1','SR1','sale',1,'[{"tender":"cash","amount":51.3}]',51.3),
        (2,'t1','PR1','purchase',1,'[{"tender":"payable","amount":80},{"tender":"card","amount":22.6}]',102.6);
      INSERT INTO return_items VALUES ('t1',1,10,1,1,30,6.3), ('t1',2,10,NULL,1,90,12.6);
    `);
    const saleReturn = await posting.postSalesReturn(db, 1, auth);
    assert.equal(await amount(saleReturn.journalEntryId!, 4400, 'debit'), 45);
    assert.equal(await amount(saleReturn.journalEntryId!, 2120, 'debit'), 6.3);
    assert.equal(await amount(saleReturn.journalEntryId!, 1140, 'debit'), 30);
    assert.equal(await amount(saleReturn.journalEntryId!, 5100, 'credit'), 30);
    const purchaseReturn = await posting.postPurchaseReturn(db, 2, auth);
    assert.equal(await amount(purchaseReturn.journalEntryId!, 1140, 'credit'), 90);
    assert.equal(await amount(purchaseReturn.journalEntryId!, 1150, 'credit'), 12.6);
    assert.equal(await amount(purchaseReturn.journalEntryId!, 2110, 'debit'), 80);
    assert.equal(await amount(purchaseReturn.journalEntryId!, 1120, 'debit'), 22.6);
    assert.equal((await posting.postPurchaseReturn(db, 2, auth)).posted, false);

    // Both invoice reversals must link and retain every original analytical dimension.
    for (const [id, reverse] of [
      [sale.journalEntryId, () => posting.reverseSaleJournal(db, 1, 'cancel', auth)],
      [purchase.journalEntryId, () => posting.reversePurchaseJournal(db, 1, 'cancel', auth)],
    ] as const) {
      await pg.query('UPDATE journal_entry_lines SET cost_center_id=7 WHERE journal_entry_id=$1', [id]);
      const reversed = await reverse();
      const original = await db.selectFrom('journal_entries').select('reversed_by_entry_id').where('id','=',id).executeTakeFirstOrThrow();
      assert.equal(Number(original.reversed_by_entry_id), reversed.journalEntryId);
      const mirror = await db.selectFrom('journal_entries').select('reversal_of_entry_id').where('id','=',reversed.journalEntryId!).executeTakeFirstOrThrow();
      assert.equal(Number(mirror.reversal_of_entry_id), id);
      const lines = await db.selectFrom('journal_entry_lines').select('cost_center_id').where('journal_entry_id','=',reversed.journalEntryId!).execute();
      assert.ok(lines.every(line => Number(line.cost_center_id) === 7));
      assert.equal((await reverse()).reversed, false);
    }
    for (const source of ['sale','purchase','sales_return','purchase_return','fiscal_year_closing','manual_reversal']) {
      const entry = await db.insertInto('journal_entries').values({
        tenant_id:'t1', entry_no:`BLOCK-${source}`, source_type:source, status:'posted',
      } as any).returning('id').executeTakeFirstOrThrow();
      await assert.rejects(accounting.reverseJournalEntry(Number(entry.id),'unsafe direct reversal',auth), /المستند الأصلي/);
    }
    for (const invalid of [-5, -0.001, NaN, Infinity]) {
      await assert.rejects(accounting.createManualJournalEntry({ entryDate:'2026-10-01', description:'invalid', lines:[
        {accountId:1110,debit:100,credit:invalid}, {accountId:9001,debit:0,credit:Number.isFinite(invalid) ? 100-invalid : 100},
      ] },auth));
    }
    const manual = await accounting.createManualJournalEntry({ entryDate:'2026-10-01', description:'manual', lines:[
      {accountId:1110,debit:75,credit:0,costCenterId:7}, {accountId:9001,debit:0,credit:75,costCenterId:7},
    ] },auth) as any;
    const reversal = await accounting.reverseJournalEntry(manual.entry.id,'correct manual entry',auth);
    assert.equal(await amount(reversal.reversalEntryId,1110,'credit'),75);
    const manualDetail = await accounting.getJournalEntry(manual.entry.id,auth) as any;
    assert.equal(manualDetail.entry.canReverse,false);
    await assert.rejects(accounting.reverseJournalEntry(manual.entry.id,'duplicate',auth), /بالفعل/);

    // Exercise delayed receipt end to end: cartons, recoverable VAT, WAC, AP and journal.
    await pg.exec(`
      ALTER TABLE purchases ADD COLUMN status text DEFAULT 'posted', ADD COLUMN tax_rate numeric DEFAULT 14,
        ADD COLUMN prices_include_tax boolean DEFAULT true, ADD COLUMN matched_status text, ADD COLUMN updated_at timestamptz;
      ALTER TABLE purchase_items ADD COLUMN id bigserial, ADD COLUMN product_id bigint,
        ADD COLUMN unit_multiplier numeric DEFAULT 1, ADD COLUMN received_qty numeric DEFAULT 0, ADD COLUMN location_id bigint;
      CREATE TABLE products (id bigint PRIMARY KEY,tenant_id text,account_id text,name text,
        stock_qty numeric,reserved_qty numeric DEFAULT 0,cost_price numeric,updated_at timestamptz);
      CREATE TABLE product_location_stock (id bigserial PRIMARY KEY,tenant_id text,account_id text,product_id bigint,
        branch_id bigint,location_id bigint,qty numeric,reserved_qty numeric DEFAULT 0,updated_at timestamptz);
      CREATE TABLE stock_movements (id bigserial PRIMARY KEY,tenant_id text,account_id text,product_id bigint,
        movement_type text,qty numeric,before_qty numeric,after_qty numeric,unit_cost numeric,total_cost numeric,
        reason text,note text,reference_type text,reference_id bigint,branch_id bigint,location_id bigint,created_by bigint);
      CREATE TABLE supplier_ledger (tenant_id text,account_id text,supplier_id bigint,entry_type text,
        amount numeric,balance_after numeric,note text,reference_type text,reference_id bigint,branch_id bigint,location_id bigint,created_by bigint);
      INSERT INTO products VALUES (10,'t1','a1','Cartons',12,0,80,NULL);
      INSERT INTO purchases(id,tenant_id,doc_no,supplier_id,payment_type,subtotal,tax_amount,total,status)
        VALUES (10,'t1','P10',9,'credit',1368,168,1368,'draft'), (11,'t1','P11',9,'credit',1368,168,1368,'draft');
      INSERT INTO purchase_items(tenant_id,purchase_id,product_id,qty,unit_cost,unit_multiplier)
        VALUES ('t1',10,10,1,1368,12),('t1',11,10,1,1368,12);
    `);
    const purchaseWriter = new PurchasesWriteService(db, {} as any, {} as any, new PurchasesFinanceService(), {} as any, posting, {} as any);
    const receiptLine = await db.selectFrom('purchase_items').select('id').where('purchase_id','=',10).executeTakeFirstOrThrow();
    await purchaseWriter.receivePurchaseGoods(10,[{itemId:Number(receiptLine.id),receivedQty:1}],auth);
    const product = await db.selectFrom('products').select(['stock_qty','cost_price']).where('id','=',10).executeTakeFirstOrThrow();
    assert.equal(Number(product.stock_qty),24);
    assert.equal(Number(product.cost_price),90,'12 units at 80 plus 12 units at net 100 gives WAC 90');
    const movement = await db.selectFrom('stock_movements').select(['unit_cost','total_cost']).where('reference_id','=',10).executeTakeFirstOrThrow();
    assert.equal(Number(movement.unit_cost),100);
    assert.equal(Number(movement.total_cost),1200);
    const receivedJournal = await db.selectFrom('journal_entries').select('id').where('source_type','=','purchase').where('source_id','=',10).executeTakeFirstOrThrow();
    assert.equal(await amount(Number(receivedJournal.id),1140,'debit'),1200);
    assert.equal(await amount(Number(receivedJournal.id),1150,'debit'),168);
    assert.equal(Number((await db.selectFrom('suppliers').select('balance').where('id','=',9).executeTakeFirstOrThrow()).balance),1368);

    // Legacy writers must use the same period rules as the central gateway.
    await pg.exec(`UPDATE accounting_settings SET lock_date_non_adviser='2099-12-31'`);
    await assert.rejects(assertAutomatedJournalPeriodOpen(db,'t1','2026-10-01',[1110,9001]), /التشغيلية/);
    await pg.exec(`UPDATE accounting_settings SET lock_date_non_adviser=NULL;
      INSERT INTO accounting_fiscal_periods VALUES ('t1','closed','October',10,'2026-10-01','2026-10-31');`);
    await assert.rejects(assertAutomatedJournalPeriodOpen(db,'t1','2026-10-01',[1110,9001]), /الشهرية/);
    await pg.exec(`DELETE FROM accounting_fiscal_periods`);
    // Carrier service journeys run against the fully migrated PostgreSQL
    // acceptance database; the historical-rate allocator is checked below.
    const taxManual = await accounting.createManualJournalEntry({entryDate:'2026-10-01',description:'VAT manual',lines:[
      {accountId:1110,debit:14,credit:0},{accountId:2120,debit:0,credit:14},
    ]},auth) as any;
    const aggregated: any[] = [];
    const addLine = (posting as any).addLine.bind(posting);
    const template = {accountId:9001,description:'same description',partnerType:'none',partnerId:null,branchId:null,locationId:null};
    addLine(aggregated,{...template,costCenterId:7,debit:10,credit:0});
    addLine(aggregated,{...template,costCenterId:8,debit:20,credit:0});
    addLine(aggregated,{...template,costCenterId:7,debit:0,credit:10});
    assert.equal(aggregated.length,3,'different cost centers and opposite sides cannot merge');
    assert.throws(() => addLine(aggregated,{...template,debit:-0.001,credit:1}));
    const draftLines = [{accountId:1110,debit:14,credit:0},{accountId:2120,debit:0,credit:14}];
    const domain = (accountId: number, date = '2026-10-01') => posting.postDomainJournal(db, {
      sourceType:'audit',sourceId:1,tenantId:'t1',accountId:'a1',entryDate:new Date(date),description:'tax lock',createdBy:1,
      lines:[{accountId:1110,debit:14,credit:0,description:'cash',partnerType:'none',partnerId:null,branchId:null,locationId:null},
        {accountId,debit:0,credit:14,description:'offset',partnerType:'none',partnerId:null,branchId:null,locationId:null}],
    });
    await pg.exec(`UPDATE accounting_settings SET lock_date_tax='2099-12-31';
      UPDATE accounting_accounts SET is_tax=false WHERE id=2120;`);
    await assert.rejects(accounting.reverseJournalEntry(taxManual.entry.id,'VAT reversal in locked period',auth), /الفترة الضريبية/);
    const blockedReceiptLine = await db.selectFrom('purchase_items').select('id').where('purchase_id','=',11).executeTakeFirstOrThrow();
    await assert.rejects(purchaseWriter.receivePurchaseGoods(11,[{itemId:Number(blockedReceiptLine.id),receivedQty:1}],auth), /الفترة الضريبية/);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty').where('id','=',10).executeTakeFirstOrThrow()).stock_qty),24);
    assert.equal(Number((await db.selectFrom('suppliers').select('balance').where('id','=',9).executeTakeFirstOrThrow()).balance),1368);
    assert.equal(Number((await db.selectFrom('purchase_items').select('received_qty').where('purchase_id','=',11).executeTakeFirstOrThrow()).received_qty),0);
    await assert.rejects(domain(2120), /الفترة الضريبية/, 'configured tax accounts are protected even without the flag');
    await assert.rejects(domain(1150), /الفترة الضريبية/);
    await assert.rejects(accounting.createManualJournalEntry({entryDate:'2026-10-01',description:'VAT',lines:draftLines},auth), /الفترة الضريبية/);
    await assert.rejects(accounting.createDraftJournalEntry({description:'VAT',lines:draftLines},auth), /الفترة الضريبية/);
    await domain(9001); // unrelated tax accounts in t2 cannot block t1's non-tax journal
    await domain(2120,'2100-01-01');
    await pg.exec(`UPDATE return_documents SET refund_allocations='[{"tender":"payable","amount":102.6}]' WHERE id=2;
      INSERT INTO return_documents SELECT 3,tenant_id,'PR2',return_type,invoice_id,settlement_mode,refund_method,
        refund_allocations,total,branch_id,location_id,created_by,created_at FROM return_documents WHERE id=2;
      INSERT INTO return_items VALUES ('t1',3,10,NULL,1,90,12.6);`);
    await assert.rejects(posting.postPurchaseReturn(db,3,auth), /الفترة الضريبية/);
    const before = await db.selectFrom('journal_entries').select('id').execute();
    await assert.rejects(db.transaction().execute(async trx => {
      await trx.insertInto('settings').values({tenant_id:'t1',key:'rollback-proof',value:'1'} as any).execute();
      await posting.postDomainJournal(trx, {sourceType:'audit',sourceId:2,tenantId:'t1',accountId:'a1',entryDate:new Date('2026-10-01'),description:'rollback',createdBy:1,
        lines:draftLines.map(l => ({...l,description:'VAT',partnerType:'none',partnerId:null,branchId:null,locationId:null}))});
    }), /الفترة الضريبية/);
    assert.equal((await db.selectFrom('settings').select('key').where('key','=','rollback-proof').execute()).length,0);
    assert.equal((await db.selectFrom('journal_entries').select('id').execute()).length,before.length);
    await assertBalanced();

    assert.equal(accountingDateKey(new Date('2026-10-01T00:00:00Z')),'2026-10-01');
    assert.deepEqual([0,1,2].map(prior => calculateCarrierCreditBaseAmount(3,1,prior,1)),[0.33,0.34,0.33]);
    assert.throws(() => calculateCarrierCreditBaseAmount(100,5000,90,20));
    assert.ok(Math.abs(purchaseReceiptBaseUnitCost(1368,12,14,true) - 100) < 1e-10);
    assert.equal(purchaseReceiptBaseUnitCost(1200,12,14,false),100);
    assert.ok(Math.abs(purchaseReceiptBaseUnitCost(114,1,14,true) - 100) < 1e-10);
    assert.equal(purchaseReceiptBaseUnitCost(0,12,14,true),0);
    for (const args of [[-1,1,14],[100,0,14],[100,1,-1],[NaN,1,14]] as const) {
      assert.throws(() => purchaseReceiptBaseUnitCost(args[0],args[1],args[2],true));
    }
    console.log('Commercial accounting: numerical sale/purchase/return postings, reversals, tenant tax locks, rollback and receipt costs passed');
  } finally { await db.destroy(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
