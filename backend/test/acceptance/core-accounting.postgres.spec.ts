import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { Kysely, sql, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Test } from '@nestjs/testing';
import { Database } from '../../src/database/database.types';
import { KYSELY_DB } from '../../src/database/database.constants';
import { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';
import { SUPER_ADMIN_PERMISSIONS } from '../../src/core/auth/constants/super-admin-permissions';
import { createPasswordRecord } from '../../src/core/auth/utils/password-hasher';
import { AccountingTenantFoundationService } from '../../src/modules/accounting/accounting-tenant-foundation.service';
import { AccountingPostingService } from '../../src/modules/accounting/accounting-posting.service';
import { inspectAccountingIntegrity } from '../../src/modules/accounting/accounting-integrity';
import { AccountingService } from '../../src/modules/accounting/accounting.service';
import { BalanceSheetService } from '../../src/modules/accounting/services/balance-sheet.service';
import { PdcChequesService } from '../../src/modules/accounting/services/pdc-cheques.service';
import { WithholdingTaxService } from '../../src/modules/accounting/services/withholding-tax.service';
import { FiscalYearService } from '../../src/modules/accounting/services/fiscal-year.service';
import { MaritimeFreightService } from '../../src/modules/maritime-freight/maritime-freight.service';
import { ensureDomainSupplier } from '../../src/modules/accounting/partner-subledger';
import { MarketplaceSyncService } from '../../src/modules/storefront/services/marketplace-sync.service';
import { PurchasesService } from '../../src/modules/purchases/purchases.service';
import { SalesService } from '../../src/modules/sales/sales.service';
import { ReturnsService } from '../../src/modules/returns/returns.service';
import { TradeInService } from '../../src/modules/tradein/tradein.service';
import { MaintenanceService } from '../../src/modules/maintenance/maintenance.service';
import { PharmacyService } from '../../src/modules/pharmacy/pharmacy.service';
import { ReportsSummaryService } from '../../src/modules/reports/services/reports-summary.service';
import { AuditService } from '../../src/core/audit/audit.service';
import { SettingsDemoDataService } from '../../src/modules/settings/services/settings-demo-data.service';
import { up as up253, down as down253 } from '../../src/database/migrations/2040000000253_core_tenant_reference_integrity';
import { up as up252, down as down252 } from '../../src/database/migrations/2040000000252_arch02_accounting_foundation';

const money = (value: unknown) => Number(Number(value).toFixed(2));

async function main() {
  const target = process.env.ACCEPTANCE_DATABASE_URL;
  assert.ok(target, 'Set ACCEPTANCE_DATABASE_URL to a fully migrated disposable PostgreSQL database');
  const url = new URL(target);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname), 'Acceptance tests are local-only');
  assert.ok(/^\/(zs_core_audit_test|zs_acceptance_[a-z0-9_]+)$/.test(url.pathname), 'Refusing a non-test database');
  Object.assign(process.env, {
    NODE_ENV:'test', APP_MODE:'CLOUD_SAAS', TENANT_ID:'zs', ACCOUNT_ID:'zs',
    DATABASE_HOST:url.hostname, DATABASE_PORT:url.port || '5432', DATABASE_NAME:url.pathname.slice(1),
    DATABASE_USER:decodeURIComponent(url.username), DATABASE_PASSWORD:decodeURIComponent(url.password),
    DATABASE_SSL:'false', DATABASE_POOL_MAX:'8', SESSION_CSRF_SECRET:'isolated-accounting-acceptance-csrf-only',
    ENABLE_BOOTSTRAP_ADMIN:'false', SMTP_HOST:'', ERROR_TRACKING_ENABLED:'false',
  });
  const { AppModule } = await import('../../src/app.module');
  const app = await Test.createTestingModule({imports:[AppModule]}).compile();
  const db = app.get<Kysely<Database>>(KYSELY_DB);
  const foundation = app.get(AccountingTenantFoundationService);
  const posting = app.get(AccountingPostingService);
  const accounting = app.get(AccountingService);
  const purchases = app.get(PurchasesService);
  const sales = app.get(SalesService);
  const returns = app.get(ReturnsService);
  const tradein = app.get(TradeInService);
  const sheet = app.get(BalanceSheetService);
  const tag = randomUUID().replaceAll('-','').slice(0,10);
  const createdTenants: string[] = [];
  const results: string[] = [];
  const pass = (label: string) => { results.push(label); console.log(`PASS ${label}`); };
  const secret = await createPasswordRecord('DisposableAcceptance!2026#Only');
  type Fixture = {auth:AuthContext;branchId:number;locationId:number;supplierId:number;customerId:number;productId:number;accounts:Map<string,number>};
  async function fixture(label:string):Promise<Fixture> {
    const tenantId=`accept_${tag}_${label}`;
    await db.insertInto('tenants').values({id:tenantId,slug:tenantId,business_name:tenantId,owner_name:'Acceptance',owner_phone:tag+label,
      owner_email:`${tenantId}@example.invalid`,activity_type:'retail_general',status:'active',plan_id:'plan_omnichannel',country_code:'EG',
      trial_starts_at:new Date(),trial_ends_at:new Date('2100-01-01'),activated_at:new Date(),extra_features:'[]',
    } as any).execute();
    createdTenants.push(tenantId);
    const user=await db.insertInto('users').values({tenant_id:tenantId,account_id:tenantId,username:tenantId,phone:tag+label,
      password_hash:secret.hash,password_salt:secret.salt,role:'admin',is_active:true,must_change_password:false,permissions_json:JSON.stringify(SUPER_ADMIN_PERMISSIONS),
    } as any).returning('id').executeTakeFirstOrThrow();
    const auth:AuthContext={tenantId,accountId:tenantId,userId:Number(user.id),role:'admin',username:tenantId,sessionId:`session_${tenantId}`,permissions:[...SUPER_ADMIN_PERMISSIONS]};
    const branch=await db.insertInto('branches').values({tenant_id:tenantId,account_id:tenantId,name:'Main',code:`B_${tenantId}`} as any).returning('id').executeTakeFirstOrThrow();
    const location=await db.insertInto('stock_locations').values({tenant_id:tenantId,account_id:tenantId,branch_id:Number(branch.id),name:'Warehouse',code:`L_${tenantId}`,location_type:'internal_warehouse',is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    await db.updateTable('branches').set({default_stock_location_id:Number(location.id)}).where('tenant_id','=',tenantId).where('id','=',branch.id).execute();
    const supplier=await db.insertInto('suppliers').values({tenant_id:tenantId,account_id:tenantId,name:'Supplier',phone:'',address:'',notes:'',balance:0,is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    const customer=await db.insertInto('customers').values({tenant_id:tenantId,account_id:tenantId,name:'Customer',phone:'',address:'',balance:0,store_credit_balance:0,is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    const product=await db.insertInto('products').values({tenant_id:tenantId,account_id:tenantId,name:'Test product',barcode:`P_${tenantId}`,cost_price:0,retail_price:30,wholesale_price:30,stock_qty:0,reserved_qty:0,is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    await db.insertInto('settings').values({tenant_id:tenantId,account_id:tenantId,key:'currency',value:'"EGP"'} as any).execute();
    await foundation.ensureForAuth(db,auth);
    const accounts=await db.selectFrom('accounting_accounts').select(['id','code']).where('tenant_id','=',tenantId).execute();
    return {auth,branchId:Number(branch.id),locationId:Number(location.id),supplierId:Number(supplier.id),customerId:Number(customer.id),productId:Number(product.id),accounts:new Map(accounts.map(row=>[row.code,Number(row.id)]))};
  }
  const postingAmount=async(f:Fixture,code:string,digits:2|3=2)=>{
    const rows=await sql<{amount:string}>`select coalesce(sum(l.debit-l.credit),0) as amount from journal_entry_lines l
      join journal_entries j on j.id=l.journal_entry_id and j.tenant_id=l.tenant_id
      join accounting_accounts a on a.id=l.account_id and a.tenant_id=l.tenant_id
      where l.tenant_id=${f.auth.tenantId} and a.code=${code} and j.status='posted'`.execute(db);
    return Number(Number(rows.rows[0].amount).toFixed(digits));
  };
  const purchase=(f:Fixture,cost:number,qty=10,key=randomUUID())=>purchases.createPurchase({supplierId:f.supplierId,paymentType:'credit',branchId:f.branchId,locationId:f.locationId,taxRate:14,pricesIncludeTax:false,items:[{productId:f.productId,name:'Test product',qty,cost,unitMultiplier:1,locationId:f.locationId}]},f.auth,key);
  const sale=(f:Fixture,qty:number)=>sales.createSale({customerId:f.customerId,paymentType:'credit',branchId:f.branchId,locationId:f.locationId,taxRate:14,pricesIncludeTax:false,items:[{productId:f.productId,name:'Test product',qty,price:30,unitMultiplier:1,priceType:'retail'}],payments:[]} as any,f.auth);
  async function reconciliation(f:Fixture) {
    const customer=await db.selectFrom('customers').select('balance').where('tenant_id','=',f.auth.tenantId!).where('id','=',f.customerId).executeTakeFirstOrThrow();
    const supplier=await db.selectFrom('suppliers').select('balance').where('tenant_id','=',f.auth.tenantId!).where('id','=',f.supplierId).executeTakeFirstOrThrow();
    assert.equal(await postingAmount(f,'1130'),money(customer.balance),'AR GL equals customer subledger');
    assert.equal(money(-(await postingAmount(f,'2110'))),money(supplier.balance),'AP GL equals supplier subledger');
    const product=await db.selectFrom('products').select(['stock_qty','cost_price']).where('tenant_id','=',f.auth.tenantId!).where('id','=',f.productId).executeTakeFirstOrThrow();
    assert.equal(await postingAmount(f,'1140'),money(Number(product.stock_qty)*Number(product.cost_price)),'perpetual inventory GL equals physical WAC value');
    const mismatch=await sql`select j.id from journal_entries j join journal_entry_lines l on l.journal_entry_id=j.id and l.tenant_id=j.tenant_id
      where j.tenant_id=${f.auth.tenantId} and j.status='posted' group by j.id having sum(l.debit)<>sum(l.credit)`.execute(db);
    assert.equal(mismatch.rows.length,0,'every posted source balances');
    const integrity = await db.transaction().setIsolationLevel('repeatable read').execute(async trx=>{
      await sql`SET TRANSACTION READ ONLY`.execute(trx);return inspectAccountingIntegrity(trx,f.auth.tenantId!);
    });
    assert.deepEqual(integrity.checks.filter(check=>check.count>0),[], 'read-only reconciliation finds zero discrepancies');
    const balanceSheet=await sheet.getBalanceSheet(f.auth,{asOfDate:'2100-12-31'});
    assert.equal(balanceSheet.isBalanced,true,`balance-sheet difference ${balanceSheet.difference}`);
  }
  try {
    // P0-C maintenance receipts are liabilities until delivery; spare parts are
    // costed from locked warehouse WAC and every mutation posts in the SAME trx.
    const maintenance = app.get(MaintenanceService);
    const mf = await fixture('maintenance');
    await purchase(mf, 8, 3);
    const ticket = await maintenance.createTicket({
      customerName: 'Repair test', customerPhone: '01000000000',
      deviceModel: 'Test device', problemDescription: 'Repair',
      finalCost: 100, expectedCost: 100, advancePayment: 20,
      branchId: mf.branchId, locationId: mf.locationId,
    } as any, mf.auth);
    const tid = Number(ticket.id);
    assert.equal(await postingAmount(mf, '1110'), 20);
    assert.equal(await postingAmount(mf, '2150'), -20);
    assert.equal(await postingAmount(mf, '4200'), 0);
    const issued = await maintenance.addPart(tid, {
      productId: mf.productId, productName: 'Part', qty: 1,
      unitCost: 9999, unitPrice: 15, locationId: mf.locationId,
    }, mf.auth);
    const recordedPart = await db.selectFrom('maintenance_ticket_parts').select('unit_cost')
      .where('tenant_id', '=', mf.auth.tenantId!).where('id', '=', Number(issued.partId)).executeTakeFirstOrThrow();
    assert.equal(Number(recordedPart.unit_cost), 8, 'caller supplied cost never overrides stock WAC');
    assert.equal(await postingAmount(mf, '1140'), 16);
    assert.equal(await postingAmount(mf, '5100'), 8);
    await purchase(mf, 14, 2);
    assert.equal(await postingAmount(mf, '1140'), 44);
    await maintenance.removePart(tid, Number(issued.partId), mf.auth);
    assert.equal(await postingAmount(mf, '1140'), 52);
    assert.equal(await postingAmount(mf, '5100'), 0);
    const returnedProduct = await db.selectFrom('products').select(['stock_qty','cost_price'])
      .where('tenant_id', '=', mf.auth.tenantId!).where('id', '=', mf.productId).executeTakeFirstOrThrow();
    assert.equal(Number(returnedProduct.stock_qty), 5);
    assert.equal(Number(returnedProduct.cost_price), 10.4, 'return restores historical cost and recalculates WAC');
    const reissued = await maintenance.addPart(tid, {
      productId: mf.productId, productName: 'Part', qty: 1,
      unitPrice: 15, locationId: mf.locationId,
    }, mf.auth);
    await assert.rejects(maintenance.deleteTicket(tid, mf.auth),
      (e:any) => e.code === 'MAINTENANCE_REVERSAL_REQUIRED');
    await assert.rejects(maintenance.updateTicket(tid, {
      customerName: 'Repair test', advancePayment: 30,
    } as any, mf.auth), (e:any) => e.code === 'MAINTENANCE_REVERSAL_REQUIRED');
    await assert.rejects(maintenance.updateTicketStatus(tid, {
      status: 'delivered', finalCost: 100, collectedAmount: 79,
    }, mf.auth), (e:any) => e.code === 'MAINTENANCE_SETTLEMENT_MISMATCH');
    assert.equal(await postingAmount(mf, '1110'), 20, 'failed delivery must roll back cash');
    assert.equal((await db.selectFrom('maintenance_tickets').select('status')
      .where('tenant_id', '=', mf.auth.tenantId!).where('id', '=', tid).executeTakeFirstOrThrow()).status, 'received');
    await maintenance.updateTicketStatus(tid, {
      status: 'delivered', finalCost: 100, collectedAmount: 80,
    }, mf.auth);
    assert.equal(await postingAmount(mf, '1110'), 100);
    assert.equal(await postingAmount(mf, '2150'), 0);
    assert.equal(await postingAmount(mf, '4200'), -100);
    assert.equal(await postingAmount(mf, '1140'), 41.6);
    assert.equal(await postingAmount(mf, '5100'), 10.4);
    await maintenance.updateTicketStatus(tid, {status:'delivered'}, mf.auth);
    const postedDelivery = await db.selectFrom('journal_entries').select('id')
      .where('tenant_id', '=', mf.auth.tenantId!).where('source_type', '=', 'maintenance_delivery')
      .where('source_id', '=', tid).execute();
    assert.equal(postedDelivery.length,1,'delivery retry cannot duplicate revenue or collection');
    await assert.rejects(maintenance.removePart(tid, Number(reissued.partId), mf.auth),
      (e:any) => e.code === 'MAINTENANCE_REVERSAL_REQUIRED');
    await assert.rejects(maintenance.deleteTicket(tid, mf.auth));
    await reconciliation(mf);
    pass('maintenance cash advance liability / WAC spare part issue and return / exact service settlement / retry / GL');

    // The cancellation/refund command may ONLY release a real, unreversed
    // cash advance. A second request cannot refund twice or reopen the ticket.
    const refundFixture = await fixture('maintref');
    const refundTicket = await maintenance.createTicket({
      customerName: 'Cancelled repair', customerPhone: '01090000000',
      deviceModel: 'Faulty device', problemDescription: 'Customer withdrew',
      expectedCost: 20, finalCost: 20, advancePayment: 12,
      branchId: refundFixture.branchId, locationId: refundFixture.locationId,
    } as any, refundFixture.auth);
    const refundId = Number(refundTicket.id);
    await assert.rejects(maintenance.updateTicketStatus(refundId, {status:'cancelled'}, refundFixture.auth),
      (e:any) => e.code === 'MAINTENANCE_REVERSAL_REQUIRED');
    assert.equal(await postingAmount(refundFixture, '1110'), 12);
    assert.equal(await postingAmount(refundFixture, '2150'), -12);
    await maintenance.updateTicketStatus(refundId,
      {status:'cancelled', refundAdvance:true}, refundFixture.auth);
    assert.equal(await postingAmount(refundFixture, '1110'), 0, 'cash returned exactly');
    assert.equal(await postingAmount(refundFixture, '2150'), 0, 'advance liability extinguished');
    const refunds = await db.selectFrom('treasury_transactions').select(['id','amount'])
      .where('tenant_id', '=', refundFixture.auth.tenantId!)
      .where('reference_type', '=', 'maintenance_advance_refund')
      .where('reference_id', '=', refundId).execute();
    assert.equal(refunds.length, 1, 'single cash refund source');
    assert.equal(Number(refunds[0].amount), -12);
    await maintenance.updateTicketStatus(refundId,
      {status:'cancelled', refundAdvance:true}, refundFixture.auth);
    const twice = await db.selectFrom('treasury_transactions').select('id')
      .where('tenant_id', '=', refundFixture.auth.tenantId!)
      .where('reference_type', '=', 'maintenance_advance_refund')
      .where('reference_id', '=', refundId).execute();
    assert.equal(twice.length, 1, 'duplicate request does not double refund');
    const refundJournals = await db.selectFrom('journal_entries').select('id')
      .where('tenant_id', '=', refundFixture.auth.tenantId!)
      .where('source_type', '=', 'maintenance_advance_refund')
      .where('source_id', '=', refundId).where('status', '=', 'posted').execute();
    assert.equal(refundJournals.length, 1, 'single immutable reverse-liability posting');
    await assert.rejects(maintenance.updateTicketStatus(refundId, {status:'received'}, refundFixture.auth),
      (e:any) => e.code === 'MAINTENANCE_REVERSAL_REQUIRED');
    await reconciliation(refundFixture);
    pass('maintenance explicit advance cancellation / cash refund / liability reversal / idempotent retry / GL');

    const f=await fixture('commercial');
    const p1=await purchase(f,10); await purchase(f,20);
    let product=await db.selectFrom('products').select(['stock_qty','cost_price']).where('id','=',f.productId).executeTakeFirstOrThrow();
    assert.equal(Number(product.stock_qty),20);assert.equal(Number(product.cost_price),15);
    const sold=await sale(f,4);const saleId=Number((sold.sale as {id:string}).id);
    const saleItem=await db.selectFrom('sale_items').select('id').where('tenant_id','=',f.auth.tenantId!).where('sale_id','=',saleId).executeTakeFirstOrThrow();
    await returns.createReturn({type:'sale',invoiceId:saleId,items:[{productId:f.productId,saleItemId:Number(saleItem.id),qty:1}],settlementMode:'refund',refundMethod:'cash'},f.auth);
    const purchaseId=Number(p1.purchaseId);const purchaseItem=await db.selectFrom('purchase_items').select('id').where('tenant_id','=',f.auth.tenantId!).where('purchase_id','=',purchaseId).executeTakeFirstOrThrow();
    await returns.createReturn({type:'purchase',invoiceId:purchaseId,items:[{productId:f.productId,purchaseItemId:Number(purchaseItem.id),qty:1}],settlementMode:'refund',refundMethod:'cash'},f.auth);
    await purchases.createCustomerPayment({customerId:f.customerId,amount:50,paymentChannel:'cash',branchId:f.branchId,locationId:f.locationId},f.auth,randomUUID());
    await purchases.createSupplierPayment({supplierId:f.supplierId,amount:30,paymentChannel:'cash',branchId:f.branchId,locationId:f.locationId},f.auth,randomUUID());
    assert.equal(await postingAmount(f,'1130'),52.6);assert.equal(await postingAmount(f,'2110'),-300.6);
    assert.equal(await postingAmount(f,'1140'),240);assert.equal(await postingAmount(f,'1110'),20);
    assert.equal(await postingAmount(f,'1150'),40.6);assert.equal(await postingAmount(f,'2120'),-12.6);
    assert.equal(await postingAmount(f,'5190'),5);assert.equal(await postingAmount(f,'5100'),45);
    await reconciliation(f);pass('complete purchase / credit-sale / both returns / collection / payment / WAC / GL / balance-sheet journey');

    const snapshot=async()=>{
      const result=await sql`select
        (select stock_qty from products where tenant_id=${f.auth.tenantId} and id=${f.productId}) as stock,
        (select balance from customers where tenant_id=${f.auth.tenantId} and id=${f.customerId}) as ar,
        (select count(*) from journal_entries where tenant_id=${f.auth.tenantId}) as journals,
        (select count(*) from sales where tenant_id=${f.auth.tenantId}) as sales,
        (select count(*) from stock_movements where tenant_id=${f.auth.tenantId}) as movements`.execute(db);
      return result.rows[0];
    };
    const before=await snapshot();
    await db.updateTable('accounting_settings').set({lock_date_tax:'2099-12-31'}).where('tenant_id','=',f.auth.tenantId!).execute();
    await assert.rejects(sale(f,1),/مقفلة/);assert.deepEqual(await snapshot(),before,'journal failure rolls back source, stock, AR and movement');
    await db.updateTable('accounting_settings').set({lock_date_tax:null}).where('tenant_id','=',f.auth.tenantId!).execute();
    pass('forced posting failure rolls back the actual sales entrypoint');

    const competitors=await Promise.allSettled([sale(f,10),sale(f,10)]);
    assert.equal(competitors.filter(result=>result.status==='fulfilled').length,1,'only one buyer can consume the last stock');
    product=await db.selectFrom('products').select(['stock_qty','cost_price']).where('id','=',f.productId).executeTakeFirstOrThrow();assert.equal(Number(product.stock_qty),6);
    await reconciliation(f);pass('simultaneous sales use separate PostgreSQL connections without overselling or ledger divergence');

    const manual=await accounting.createManualJournalEntry({entryDate:new Date().toISOString(),description:'Concurrent reversal',cashFlowCategory:'operating',lines:[
      {accountId:f.accounts.get('1110')!,debit:25,credit:0},{accountId:f.accounts.get('6900')!,debit:0,credit:25},
    ]},f.auth) as any;
    const attempts=await Promise.allSettled([accounting.reverseJournalEntry(manual.entry.id,'Concurrent correction',f.auth),accounting.reverseJournalEntry(manual.entry.id,'Concurrent correction',f.auth)]);
    assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
    const reversed=await db.selectFrom('journal_entries').selectAll().where('tenant_id','=',f.auth.tenantId!).where('reversal_of_entry_id','=',manual.entry.id).execute();
    assert.equal(reversed.length,1);assert.equal(reversed[0].cash_flow_category,'operating');
    await reconciliation(f);pass('simultaneous manual reversal posts once and retains cash-flow classification');

    const duplicate=await fixture('idempotency');const key=randomUUID();
    const requests=await Promise.allSettled([purchase(duplicate,10,10,key),purchase(duplicate,10,10,key)]);
    assert.ok(requests.some(result=>result.status==='fulfilled'));
    const retry=await purchase(duplicate,10,10,key);
    const bills=await db.selectFrom('purchases').select('id').where('tenant_id','=',duplicate.auth.tenantId!).execute();
    assert.equal(bills.length,1);assert.equal(Number(retry.purchaseId),Number(bills[0].id));
    assert.equal(Number((await db.selectFrom('products').select('stock_qty').where('id','=',duplicate.productId).executeTakeFirstOrThrow()).stock_qty),10);
    await reconciliation(duplicate);pass('simultaneous and lost-response purchase retries commit exactly one bill and receipt');

    const recovery=await fixture('recovery');
    const unposted=await db.insertInto('purchases').values({tenant_id:recovery.auth.tenantId,account_id:recovery.auth.accountId,doc_no:`REC_${tag}`,supplier_id:recovery.supplierId,payment_type:'credit',subtotal:100,discount:0,tax_rate:0,tax_amount:0,prices_include_tax:false,total:100,status:'posted',note:'Recovery fixture: source persisted without a journal'} as any).returning('id').executeTakeFirstOrThrow();
    const recoveryFiscal=app.get(FiscalYearService);
    const recoveryYear=await recoveryFiscal.createFiscalYear(recovery.auth,{name:'Recovery gate',startDate:'2026-01-01',endDate:'2026-12-31'});
    await assert.rejects(recoveryFiscal.executeFiscalYearClose(recovery.auth,recoveryYear.id,{}),/بدون قيد محاسبي/);
    assert.equal((await recoveryFiscal.getFiscalYear(recovery.auth,recoveryYear.id)).status,'open');
    pass('fiscal close refuses a persisted purchase without a journal and leaves the year open');
    const recovered=await Promise.all([posting.postPurchase(db,Number(unposted.id),recovery.auth),posting.postPurchase(db,Number(unposted.id),recovery.auth)]);
    assert.equal(recovered[0].journalEntryId,recovered[1].journalEntryId,'concurrent recovery returns one journal');
    const recoveryEntries=await db.selectFrom('journal_entries').select('id').where('tenant_id','=',recovery.auth.tenantId!).where('source_type','=','purchase').where('source_id','=',unposted.id).execute();
    assert.equal(recoveryEntries.length,1);assert.equal(await postingAmount(recovery,'2110'),-100);
    pass('concurrent recovery of a persisted purchase posts the source exactly once');

    await assert.rejects(db.insertInto('users').values({tenant_id:f.auth.tenantId,account_id:f.auth.accountId,username:`cross_${tag}`,role:'cashier',password_hash:secret.hash,password_salt:secret.salt,default_branch_id:duplicate.branchId} as any).execute(),(error:any)=>error.code==='23503');
    await assert.rejects(db.insertInto('journal_entry_lines').values({tenant_id:f.auth.tenantId,journal_entry_id:manual.entry.id,account_id:duplicate.accounts.get('1110')!,debit:1,credit:0,partner_type:'none'} as any).execute(),(error:any)=>error.code==='23503');
    await assert.rejects(db.insertInto('journal_entry_lines').values({tenant_id:f.auth.tenantId,journal_entry_id:manual.entry.id,account_id:f.accounts.get('1110')!,debit:sql`'NaN'::numeric`,credit:0,partner_type:'none'} as any).execute(),(error:any)=>error.code==='23514');
    pass('database rejects cross-tenant branch/account references and non-finite journal money');

    const marketplace=await fixture('marketplace');
    const input={bankAccountId:marketplace.accounts.get('1120')!,marketplace:'amazon' as const,settlementId:`settlement_${tag}`,periodStart:'2026-10-01',periodEnd:'2026-10-24',grossSales:1000,referralFees:100,fulfillmentFees:0,refunds:50,storageOrOtherFees:0,netPayout:850,currency:'EGP'};
    const service=app.get(MarketplaceSyncService);
    const settled=await Promise.all([service.reconcileSettlement(input,marketplace.auth),service.reconcileSettlement(input,marketplace.auth)]);
    assert.equal(settled[0].journalEntryId,settled[1].journalEntryId);
    assert.equal(await postingAmount(marketplace,'1120'),850);assert.equal(await postingAmount(marketplace,'4100'),-950);
    await assert.rejects(service.reconcileSettlement({...input,netPayout:840,referralFees:110},marketplace.auth));
    pass('concurrent marketplace settlement is exact, balanced, immutable and deduplicated');

    const singleDb=new Kysely<Database>({dialect:new PostgresDialect({pool:new Pool({connectionString:target,max:1,connectionTimeoutMillis:1500,statement_timeout:5000})})});
    try {
      const singleService=new MarketplaceSyncService(singleDb,app.get(AuditService),posting);
      await singleService.reconcileSettlement({...input,settlementId:`single_${tag}`},marketplace.auth);
      pass('marketplace settlement completes on a one-connection pool');
    } finally {await singleDb.destroy();}

    const cheques=await fixture('cheques');
    const pdc=app.get(PdcChequesService);
    const cheque=await pdc.createCheque(cheques.auth,{type:'receivable',chequeNumber:`FX_${tag}`,bankName:'Test bank',partnerType:'customer',partnerId:cheques.customerId,partnerName:'Customer',amount:100,currency:'USD',exchangeRate:50,issueDate:'2026-10-24',dueDate:'2026-10-25'});
    assert.equal(await postingAmount(cheques,'1122'),5000);assert.equal(await postingAmount(cheques,'1130'),-5000);
    await pdc.updateChequeStatus(cheques.auth,cheque.id,{action:'deposit',depositBankId:cheques.accounts.get('1120')});
    await pdc.updateChequeStatus(cheques.auth,cheque.id,{action:'bounce'});
    assert.equal(await postingAmount(cheques,'1130'),0);
    await pdc.updateChequeStatus(cheques.auth,cheque.id,{action:'restore_to_safe'});
    const collections=await Promise.allSettled([pdc.updateChequeStatus(cheques.auth,cheque.id,{action:'collect',depositBankId:cheques.accounts.get('1120'),settlementExchangeRate:51}),pdc.updateChequeStatus(cheques.auth,cheque.id,{action:'collect',depositBankId:cheques.accounts.get('1120'),settlementExchangeRate:51})]);
    assert.equal(collections.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(await postingAmount(cheques,'1120'),5100);assert.equal(await postingAmount(cheques,'7170'),-100);
    assert.equal(await postingAmount(cheques,'1121'),0);assert.equal(await postingAmount(cheques,'1122'),0);
    await reconciliation(cheques);pass('foreign-currency cheque receive / deposit / bounce / restore / concurrent collection preserves book value and realizes FX once');

    const tax=await fixture('withholding');await purchase(tax,40);
    const wht=app.get(WithholdingTaxService);
    const extracted=await Promise.all([wht.extractFromPurchases(tax.auth,{fromDate:'2026-01-01',toDate:'2026-12-31',defaultWhtType:'goods',defaultWhtRate:1}),wht.extractFromPurchases(tax.auth,{fromDate:'2026-01-01',toDate:'2026-12-31',defaultWhtType:'goods',defaultWhtRate:1})]);
    assert.equal(extracted.reduce((sum,row)=>sum+row.extracted_count,0),1);assert.equal(extracted.reduce((sum,row)=>sum+row.total_tax_added,0),4);
    await reconciliation(tax);pass('concurrent WHT extraction creates one draft with the exact taxable base');

    const freight=await fixture('freight');
    const line=await db.insertInto('shipping_lines').values({tenant_id:freight.auth.tenantId,code:`FX_${tag}`,name_ar:'Carrier',name_en:'Carrier'} as any).returning('id').executeTakeFirstOrThrow();
    const job=await db.insertInto('maritime_jobs').values({tenant_id:freight.auth.tenantId,job_number:`JOB_${tag}`,customer_name:'Customer',shipping_line_id:line.id,shipping_line_name:'Carrier',pol_code:'EGALY',pol_name:'Alexandria',pod_code:'CNSHA',pod_name:'Shanghai',carrier_cost_total:5000} as any).returning('id').executeTakeFirstOrThrow();
    const carrierSupplier=await db.transaction().execute(trx=>ensureDomainSupplier(trx,freight.auth.tenantId!,'shipping_line',line.id,'Carrier'));
    const center=await db.insertInto('cost_centers').values({tenant_id:freight.auth.tenantId,account_id:freight.auth.accountId,code:`CC_${tag}`,name:'Original booking center'} as any).returning('id').executeTakeFirstOrThrow();
    const carrierJournal=await posting.postDomainJournal(db,{tenantId:freight.auth.tenantId!,accountId:freight.auth.accountId!,sourceType:'maritime_carrier_invoice',sourceId:Number(job.id),entryDate:new Date(),description:'Original FX carrier invoice',createdBy:freight.auth.userId,lines:[{costCenterId:Number(center.id),branchId:freight.branchId,locationId:freight.locationId,description:'Original carrier expense',accountId:freight.accounts.get('6400')!,debit:5000,credit:0,partnerType:'none',partnerId:null},{costCenterId:Number(center.id),branchId:freight.branchId,locationId:freight.locationId,description:'Original carrier payable',accountId:freight.accounts.get('2110')!,debit:0,credit:5000,partnerType:'supplier',partnerId:carrierSupplier}]});
    const invoice=await db.insertInto('maritime_carrier_invoices').values({tenant_id:freight.auth.tenantId,job_id:job.id,shipping_line_id:line.id,carrier_name:'Carrier',invoice_number:`INV_${tag}`,invoice_date:'2026-10-24',currency:'USD',total_invoiced_amount:100,journal_entry_id:carrierJournal} as any).returning('id').executeTakeFirstOrThrow();
    const dispute=await db.insertInto('maritime_carrier_disputes').values({tenant_id:freight.auth.tenantId,dispute_number:`DSP_${tag}`,invoice_id:invoice.id,job_id:job.id,carrier_name:'Carrier',disputed_amount:10,currency:'USD',dispute_reason:'Overcharge'} as any).returning('id').executeTakeFirstOrThrow();
    const maritime=app.get(MaritimeFreightService);const resolution={status:'accepted' as const,creditNoteNumber:`CN_${tag}`,creditNoteAmount:10};
    await Promise.all([maritime.resolveCarrierDispute(freight.auth,dispute.id,resolution),maritime.resolveCarrierDispute(freight.auth,dispute.id,resolution)]);
    assert.equal(await postingAmount(freight,'2110'),-4500);assert.equal(await postingAmount(freight,'6400'),4500);
    const creditDimensions=await db.selectFrom('journal_entry_lines as l').innerJoin('journal_entries as j',join=>join.onRef('j.id','=','l.journal_entry_id').onRef('j.tenant_id','=','l.tenant_id')).select(['l.cost_center_id','l.branch_id','l.location_id']).where('l.tenant_id','=',freight.auth.tenantId!).where('j.source_type','=','maritime_carrier_credit_note').execute();
    assert.equal(creditDimensions.length,2);for(const row of creditDimensions){assert.equal(Number(row.cost_center_id),Number(center.id));assert.equal(Number(row.branch_id),freight.branchId);assert.equal(Number(row.location_id),freight.locationId);}
    const freightIntegrity=await inspectAccountingIntegrity(db,freight.auth.tenantId!);assert.equal(freightIntegrity.passed,true,JSON.stringify(freightIntegrity));
    pass('foreign-currency carrier credit uses original invoice rate, maps the supplier and posts concurrent resolution once');

    const closing=await fixture('closing');await purchase(closing,10);await sale(closing,2);
    const fiscal=app.get(FiscalYearService);const year=await fiscal.createFiscalYear(closing.auth,{name:'Acceptance 2026',startDate:'2026-01-01',endDate:'2026-12-31'});
    const preview=await fiscal.previewFiscalYearClose(closing.auth,year.id);assert.equal(preview.canClose,true,JSON.stringify(preview));
    await fiscal.executeFiscalYearClose(closing.auth,year.id,{});
    await assert.rejects(sale(closing,1));await reconciliation(closing);
    await fiscal.reopenFiscalYear(closing.auth,year.id,{reason:'Acceptance reopening verifies full immutable reversal'});
    await assert.rejects(sale(closing,1),'reopening a year preserves independent administrative locks');
    await accounting.updateAccountingSettings({lockDateAll:''},closing.auth);
    const periods=await fiscal.listFiscalPeriods(closing.auth,year.id);
    for(const period of [...periods].sort((a,b)=>b.period_number-a.period_number)) {
      await fiscal.reopenFiscalPeriod(closing.auth,period.id,{reason:'Explicit authorized monthly reopening'});
    }
    await sale(closing,1);await reconciliation(closing);pass('fiscal close balances and blocks posting; reopening reverses closing and preserves independent locks until explicitly released');

    try {await db.transaction().execute(async trx=>{
      await trx.updateTable('customers').set({balance:sql`balance+1`}).where('tenant_id','=',f.auth.tenantId!).where('id','=',f.customerId).execute();
      const detected=await inspectAccountingIntegrity(trx,f.auth.tenantId!);
      assert.equal(detected.passed,false);assert.ok(detected.checks.find(check=>check.code==='CUSTOMER_GL_SUBLEDGER' && check.count===1));
      throw new Error('ROLLBACK_DETECTION_PROBE');
    });} catch(error:any){assert.equal(error.message,'ROLLBACK_DETECTION_PROBE');}
    await reconciliation(f);pass('read-only integrity audit detects a deliberate discrepancy and never repairs historical money silently');

    const foreignDemo=await fixture('foreign_demo');const demoTarget=await fixture('demo_target');
    await db.updateTable('products').set({metadata:JSON.stringify({is_demo:true})}).where('id','=',foreignDemo.productId).where('tenant_id','=',foreignDemo.auth.tenantId!).execute();
    await db.updateTable('customers').set({metadata:JSON.stringify({is_demo:true})}).where('id','=',foreignDemo.customerId).where('tenant_id','=',foreignDemo.auth.tenantId!).execute();
    await db.updateTable('suppliers').set({metadata:JSON.stringify({is_demo:true})}).where('id','=',foreignDemo.supplierId).where('tenant_id','=',foreignDemo.auth.tenantId!).execute();
    // Backup storage is the sole stub; execute the production deletion queries on PostgreSQL.
    const demos=new SettingsDemoDataService(db,app.get(AuditService),{savePreMutationBackup:async()=>{}} as any);
    const cleared=await demos.clearDemoData('',demoTarget.auth);assert.equal(cleared.deletedProductsCount,0);
    assert.ok(await db.selectFrom('products').select('id').where('id','=',foreignDemo.productId).executeTakeFirst());
    assert.ok(await db.selectFrom('customers').select('id').where('id','=',foreignDemo.customerId).executeTakeFirst());
    assert.ok(await db.selectFrom('suppliers').select('id').where('id','=',foreignDemo.supplierId).executeTakeFirst());
    pass('demo cleanup cannot select or delete another tenant\'s spaced JSON demo rows');

    await db.transaction().execute(async trx=>{
      const ledgerSnapshot=()=>sql`SELECT tenant_id,count(*) AS rows,sum(debit) AS debit,sum(credit) AS credit FROM journal_entry_lines GROUP BY tenant_id ORDER BY tenant_id`.execute(trx);
      const before=await ledgerSnapshot();await up252(trx);await up252(trx);
      assert.deepEqual((await ledgerSnapshot()).rows,before.rows,'repeat migration preserves every tenant\'s journal row count and sums');
      // Check the refusal without aborting the transaction or dropping evidence.
      await assert.rejects(down252(trx),/reviewed financial reconciliation/);
    });
    pass('accounting foundation migration up/up preserves per-tenant ledger counts and money; rollback refuses to discard financial evidence');

    const traded=await fixture('tradein_guard');
    const deviceSerial=`ACCEPT-${tag}-001`;
    const intake={sellerName:'Acceptance Seller',sellerPhone:'01000000000',sellerNationalId:'00000000000000',
      deviceModel:'Test used terminal',serialNumber:deviceSerial,agreedPurchasePrice:37.25,
      transactionType:'cash_purchase' as const,paymentMethod:'cash',autoAddToInventory:true,
      branchId:traded.branchId,locationId:traded.locationId};
    // Independent concurrent requests and lost-response repeats must never double-pay.
    const simultaneous=await Promise.allSettled([
      tradein.createTransaction(intake,traded.auth),tradein.createTransaction({...intake},traded.auth),
    ]);
    assert.equal(simultaneous.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(simultaneous.filter(x=>x.status==='rejected' && (x.reason as any).code==='TRADEIN_DUPLICATE_SERIAL').length,1);
    const recorded=await db.selectFrom('trade_in_transactions').select(['id','doc_no'])
      .where('tenant_id','=',traded.auth.tenantId!).where('serial_number','=',deviceSerial).execute();
    assert.equal(recorded.length,1);
    const cashRecorded=await db.selectFrom('treasury_transactions').select(['id','amount'])
      .where('tenant_id','=',traded.auth.tenantId!).where('reference_type','=','trade_in')
      .where('reference_id','=',Number(recorded[0].id)).execute();
    assert.equal(cashRecorded.length,1);
    assert.equal(money(cashRecorded[0].amount),-37.25);
    assert.equal(await postingAmount(traded,'1140'),37.25);
    assert.equal(await postingAmount(traded,'1110'),-37.25);
    const acquired=await db.selectFrom('trade_in_transactions').select('created_product_id')
      .where('tenant_id','=',traded.auth.tenantId!).where('id','=',Number(recorded[0].id)).executeTakeFirstOrThrow();
    const stocked=await db.selectFrom('products').select(['stock_qty','cost_price'])
      .where('tenant_id','=',traded.auth.tenantId!).where('id','=',Number(acquired.created_product_id)).executeTakeFirstOrThrow();
    assert.equal(Number(stocked.stock_qty),1);
    assert.equal(money(stocked.cost_price),37.25);
    const posted=await db.selectFrom('journal_entries').select('id').where('tenant_id','=',traded.auth.tenantId!)
      .where('source_type','=','trade_in').where('source_id','=',Number(recorded[0].id)).where('status','=','posted').execute();
    assert.equal(posted.length,1);
    const integrity=await inspectAccountingIntegrity(db,traded.auth.tenantId!);
    assert.equal(integrity.passed,true,JSON.stringify(integrity));
    await assert.rejects(tradein.createTransaction(intake,traded.auth),(e:any)=>e.code==='TRADEIN_DUPLICATE_SERIAL');
    await assert.rejects(tradein.deleteTransaction(Number(recorded[0].id),traded.auth),(e:any)=>e.code==='TRADEIN_REVERSAL_REQUIRED');
    const retained=await db.selectFrom('trade_in_transactions').select('id')
      .where('tenant_id','=',traded.auth.tenantId!).where('id','=',Number(recorded[0].id)).executeTakeFirst();
    assert.ok(retained,'financially relevant trade-in source must remain immutable');
    pass('concurrent trade-in purchase posts exact cash/inventory GL and WAC once; history is immutable');

    // A product serial from a pre-existing catalog receipt cannot be purchased
    // a second time through trade-in without reconciliation.
    const occupiedSerial = `OCCUPIED-${tag}`;
    await db.insertInto('product_serials').values({
      tenant_id:traded.auth.tenantId!,account_id:traded.auth.accountId!,
      product_id:traded.productId,serial_number:occupiedSerial,status:'in_stock',
      cost_price:12,
    } as any).execute();
    const intakeCountBefore=await db.selectFrom('trade_in_transactions').select(db.fn.countAll().as('n'))
      .where('tenant_id','=',traded.auth.tenantId!).executeTakeFirstOrThrow();
    await assert.rejects(tradein.createTransaction({...intake,serialNumber:occupiedSerial},traded.auth),
      (e:any)=>e.code==='TRADEIN_SERIAL_ALREADY_REGISTERED');
    const intakeCountAfter=await db.selectFrom('trade_in_transactions').select(db.fn.countAll().as('n'))
      .where('tenant_id','=',traded.auth.tenantId!).executeTakeFirstOrThrow();
    assert.equal(Number(intakeCountAfter.n),Number(intakeCountBefore.n),'occupied serial may not create a second payable intake');
    const occupiedMovements=await db.selectFrom('stock_movements').select('id')
      .where('tenant_id','=',traded.auth.tenantId!).where('reference_type','=','trade_in')
      .where('product_id','=',traded.productId).execute();
    assert.equal(occupiedMovements.length,0,'occupied serial must not create a stock receipt');
    pass('pre-registered catalog IMEI rejects duplicate trade-in and rolls back stock and cash');

    // Bank payout is never a cash expense: match physical WAC receipt,
    // channel-specific treasury expense and the actual 1120 bank GL at 0.001.
    const bankTradeFixture = await fixture('tradeinbank');
    await db.updateTable('settings').set({value:'"KWD"'})
      .where('tenant_id','=',bankTradeFixture.auth.tenantId!).where('key','=','currency').execute();
    await db.updateTable('currency_exchange_rates').set({currency_code:'KWD',exchange_rate:1})
      .where('tenant_id','=',bankTradeFixture.auth.tenantId!).where('is_base','=',true).execute();
    const bankSerial = `BANK-${tag}`;
    const bankPayload = {...intake,serialNumber:bankSerial,agreedPurchasePrice:0.001,
      paymentMethod:'bank',branchId:bankTradeFixture.branchId,locationId:bankTradeFixture.locationId};
    const bankPurchase = await tradein.createTransaction(bankPayload,bankTradeFixture.auth);
    const bankPayouts = await db.selectFrom('treasury_transactions').select(['amount','payment_channel','txn_type'])
      .where('tenant_id','=',bankTradeFixture.auth.tenantId!)
      .where('reference_type','=','trade_in').where('reference_id','=',Number(bankPurchase.id)).execute();
    assert.equal(bankPayouts.length,1);
    assert.equal(bankPayouts[0].payment_channel,'bank');
    assert.equal(bankPayouts[0].txn_type,'expense');
    assert.equal(Number(bankPayouts[0].amount),-0.001);
    assert.equal(await postingAmount(bankTradeFixture,'1110',3),0,'bank transfer never credits cash');
    assert.equal(await postingAmount(bankTradeFixture,'1120',3),-0.001,'bank credits exactly one fil');
    assert.equal(await postingAmount(bankTradeFixture,'1140',3),0.001,'stock debited exactly one fil');
    const bankReceipt = await db.selectFrom('stock_movements').select(['qty','total_cost'])
      .where('tenant_id','=',bankTradeFixture.auth.tenantId!)
      .where('reference_type','=','trade_in')
      .where('reference_id','=',Number(bankPurchase.id)).execute();
    assert.equal(bankReceipt.length,1);
    assert.equal(Number(bankReceipt[0].qty),1);
    assert.equal(Number(bankReceipt[0].total_cost),0.001);
    const bankJournal = await db.selectFrom('journal_entries').select('id')
      .where('tenant_id','=',bankTradeFixture.auth.tenantId!)
      .where('source_type','=','trade_in').where('source_id','=',Number(bankPurchase.id)).execute();
    assert.equal(bankJournal.length,1);
    await assert.rejects(tradein.createTransaction(bankPayload,bankTradeFixture.auth),
      (e:any)=>e.code==='TRADEIN_DUPLICATE_SERIAL');
    await assert.rejects(tradein.createTransaction({...bankPayload,serialNumber:`BADBANK-${tag}`,paymentMethod:'wallet'},bankTradeFixture.auth),
      (e:any)=>e.code==='TRADEIN_POSTING_UNSUPPORTED');
    const bankIntegrity = await inspectAccountingIntegrity(db,bankTradeFixture.auth.tenantId!);
    assert.equal(bankIntegrity.passed,true,JSON.stringify(bankIntegrity));
    pass('trade-in default-bank payout: KWD 0.001 source/stock/treasury/GL, retry and unsupported channel rollback');

    // Real PostgreSQL must preserve the third minor unit from journal source
    // through DB storage and the FX/PDC base-currency snapshot.
    const kwd = await fixture('kwd_precision');
    await db.updateTable('settings').set({value:'"KWD"'}).where('tenant_id','=',kwd.auth.tenantId!).where('key','=','currency').execute();
    await db.updateTable('currency_exchange_rates').set({currency_code:'KWD',exchange_rate:1})
      .where('tenant_id','=',kwd.auth.tenantId!).where('is_base','=',true).execute();
    const raw = await sql<{numeric_scale:number}>`select numeric_scale from information_schema.columns
      where table_schema=current_schema() and table_name='journal_entry_lines' and column_name='debit'`.execute(db);
    assert.ok(Number(raw.rows[0]?.numeric_scale)>=3,'journal storage must accept fils');
    const kwdEntry=await posting.postDomainJournal(db,{
      tenantId:kwd.auth.tenantId!,accountId:kwd.auth.accountId!,sourceType:'currency_precision_probe',
      sourceId:kwd.productId,entryDate:new Date(),description:'Three-decimal currency GL acceptance',
      createdBy:kwd.auth.userId,
      lines:[
        {accountId:kwd.accounts.get('1110')!,description:'One fil in cash',debit:0.001,credit:0,partnerType:'none',partnerId:null},
        {accountId:kwd.accounts.get('4200')!,description:'One fil in revenue',debit:0,credit:0.001,partnerType:'none',partnerId:null},
      ],
    });
    const kwdLines=await db.selectFrom('journal_entry_lines').select(['debit','credit'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('journal_entry_id','=',kwdEntry).execute();
    assert.equal(kwdLines.length,2);
    assert.equal(kwdLines.reduce((sum,line)=>sum+Number(line.debit),0),0.001);
    assert.equal(kwdLines.reduce((sum,line)=>sum+Number(line.credit),0),0.001);
    pass('KWD 0.001 journal lines survive real PostgreSQL persistence without cent rounding');

    // Full vendor invoice: source amounts, physical WAC, AP partner ledger and
    // inventory/credit GL must all preserve the same single KWD fil.
    const kwdPurchasePayload={
      supplierId:kwd.supplierId,paymentType:'credit' as const,
      branchId:kwd.branchId,locationId:kwd.locationId,taxRate:0,pricesIncludeTax:false,
      supplierInvoiceNo:`KWD-FIL-${tag}`,
      items:[{productId:kwd.productId,name:'Test product',qty:1,cost:0.001,
        unitMultiplier:1,locationId:kwd.locationId}],
    };
    const kwdPurchaseKey=randomUUID();
    const filInvoice=await purchases.createPurchase(kwdPurchasePayload,kwd.auth,kwdPurchaseKey);
    const filInvoiceId=Number(filInvoice.purchaseId);
    assert.ok(filInvoiceId>0);
    const filHeader=await db.selectFrom('purchases').select(['subtotal','tax_amount','total'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',filInvoiceId).executeTakeFirstOrThrow();
    assert.equal(Number(filHeader.subtotal),0.001);
    assert.equal(Number(filHeader.tax_amount),0);
    assert.equal(Number(filHeader.total),0.001);
    const filItem=await db.selectFrom('purchase_items').select(['unit_cost','line_total'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('purchase_id','=',filInvoiceId).executeTakeFirstOrThrow();
    assert.equal(Number(filItem.unit_cost),0.001);
    assert.equal(Number(filItem.line_total),0.001);
    const filSupplier=await db.selectFrom('suppliers').select('balance')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.supplierId).executeTakeFirstOrThrow();
    assert.equal(Number(filSupplier.balance),0.001);
    const filPartner=await db.selectFrom('supplier_ledger').select(['amount','balance_after'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('reference_type','=','purchase')
      .where('reference_id','=',filInvoiceId).executeTakeFirstOrThrow();
    assert.equal(Number(filPartner.amount),0.001);
    assert.equal(Number(filPartner.balance_after),0.001);
    const filProduct=await db.selectFrom('products').select(['stock_qty','cost_price'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.productId).executeTakeFirstOrThrow();
    assert.equal(Number(filProduct.stock_qty),1);
    assert.equal(Number(filProduct.cost_price),0.001);
    const filReceipt=await db.selectFrom('stock_movements').select(['qty','unit_cost','total_cost'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('reference_type','=','purchase')
      .where('reference_id','=',filInvoiceId).executeTakeFirstOrThrow();
    assert.equal(Number(filReceipt.qty),1);
    assert.equal(Number(filReceipt.unit_cost),0.001);
    assert.equal(Number(filReceipt.total_cost),0.001);
    const filPurchaseLines=await db.selectFrom('journal_entry_lines')
      .innerJoin('journal_entries',j=>j.onRef('journal_entries.id','=','journal_entry_lines.journal_entry_id')
        .onRef('journal_entries.tenant_id','=','journal_entry_lines.tenant_id'))
      .select(['journal_entry_lines.debit','journal_entry_lines.credit'])
      .where('journal_entries.tenant_id','=',kwd.auth.tenantId!)
      .where('journal_entries.source_type','=','purchase')
      .where('journal_entries.source_id','=',filInvoiceId).execute();
    assert.equal(filPurchaseLines.length,2);
    assert.equal(filPurchaseLines.reduce((sum,row)=>sum+Number(row.debit),0),0.001);
    assert.equal(filPurchaseLines.reduce((sum,row)=>sum+Number(row.credit),0),0.001);
    const purchaseRetry=await purchases.createPurchase(kwdPurchasePayload,kwd.auth,kwdPurchaseKey);
    assert.equal(Number(purchaseRetry.purchaseId),filInvoiceId);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.productId)
      .executeTakeFirstOrThrow()).stock_qty),1,'retried purchase must not duplicate one-fil stock');
    pass('KWD purchase 0.001 source, physical WAC, supplier/AP GL and idempotent retry reconcile');

    // One-fil credit sale: cash/AR, revenue, COGS and inventory GL must not
    // disappear at the legacy two-cent sale and journal allocation layers.
    await db.updateTable('products').set({retail_price:0.001,wholesale_price:0.001})
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.productId).execute();
    const oneFilSale=await sales.createSale({
      customerId:kwd.customerId,paymentType:'credit',paymentChannel:'credit',
      branchId:kwd.branchId,locationId:kwd.locationId,taxRate:0,
      pricesIncludeTax:false,payments:[],source:'dashboard',
      items:[{productId:kwd.productId,name:'Test product',qty:1,price:0.001,
        unitMultiplier:1,priceType:'retail'}],
    } as any,kwd.auth);
    const oneFilSaleId=Number((oneFilSale.sale as {id:string}).id);
    assert.ok(oneFilSaleId>0);
    const filSaleHeader=await db.selectFrom('sales').select(['subtotal','total','paid_amount'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',oneFilSaleId).executeTakeFirstOrThrow();
    assert.equal(Number(filSaleHeader.subtotal),0.001);
    assert.equal(Number(filSaleHeader.total),0.001);
    assert.equal(Number(filSaleHeader.paid_amount),0);
    const filSaleItem=await db.selectFrom('sale_items').select(['line_total','unit_price','cost_price'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('sale_id','=',oneFilSaleId).executeTakeFirstOrThrow();
    assert.equal(Number(filSaleItem.line_total),0.001);
    assert.equal(Number(filSaleItem.unit_price),0.001);
    assert.equal(Number(filSaleItem.cost_price),0.001);
    const filCustomer=await db.selectFrom('customers').select('balance')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.customerId).executeTakeFirstOrThrow();
    assert.equal(Number(filCustomer.balance),0.001);
    const filCustomerEntry=await db.selectFrom('customer_ledger').select(['amount','balance_after'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('reference_type','=','sale')
      .where('reference_id','=',oneFilSaleId).executeTakeFirstOrThrow();
    assert.equal(Number(filCustomerEntry.amount),0.001);
    assert.equal(Number(filCustomerEntry.balance_after),0.001);
    const filSaleGL=await sql<{code:string;total:string}>`select a.code,sum(l.debit-l.credit) as total
      from journal_entry_lines l join journal_entries j
        on j.id=l.journal_entry_id and j.tenant_id=l.tenant_id
      join accounting_accounts a on a.id=l.account_id and a.tenant_id=l.tenant_id
      where j.tenant_id=${kwd.auth.tenantId!} and j.source_type='sale'
        and j.source_id=${oneFilSaleId} group by a.code`.execute(db);
    const glByCode=new Map(filSaleGL.rows.map(row=>[row.code,Number(row.total)]));
    assert.equal(glByCode.get('1130'),0.001);
    assert.equal(glByCode.get('4100'),-0.001);
    assert.equal(glByCode.get('5100'),0.001);
    assert.equal(glByCode.get('1140'),-0.001);
    const afterFilSale=await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.productId).executeTakeFirstOrThrow();
    assert.equal(Number(afterFilSale.stock_qty),0);
    pass('KWD credit sale 0.001 receivable, unit cost, inventory and balanced revenue/COGS GL');

    // Reverse the same one-fil sale and purchase through their public return
    // services: recover stock at source cost and settle both partner subledgers.
    const filSaleLineId=await db.selectFrom('sale_items').select('id')
      .where('tenant_id','=',kwd.auth.tenantId!).where('sale_id','=',oneFilSaleId)
      .executeTakeFirstOrThrow();
    const oneFilSaleRefund=await returns.createReturn({
      type:'sale',invoiceId:oneFilSaleId,
      items:[{productId:kwd.productId,saleItemId:Number(filSaleLineId.id),qty:1}],
      settlementMode:'refund',refundMethod:'cash',
    },kwd.auth);
    const oneFilSalesReturn=await db.selectFrom('return_documents').select('total')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',Number(oneFilSaleRefund.returnDocumentId))
      .executeTakeFirstOrThrow();
    assert.equal(Number(oneFilSalesReturn.total),0.001);
    const afterFilSaleReturn=await db.selectFrom('customers').select('balance')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.customerId).executeTakeFirstOrThrow();
    assert.equal(Number(afterFilSaleReturn.balance),0);
    const returnedFilQty=await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.productId).executeTakeFirstOrThrow();
    assert.equal(Number(returnedFilQty.stock_qty),1);
    const filPurchaseLineId=await db.selectFrom('purchase_items').select('id')
      .where('tenant_id','=',kwd.auth.tenantId!).where('purchase_id','=',filInvoiceId).executeTakeFirstOrThrow();
    const oneFilPurchaseRefund=await returns.createReturn({
      type:'purchase',invoiceId:filInvoiceId,
      items:[{productId:kwd.productId,purchaseItemId:Number(filPurchaseLineId.id),qty:1}],
      settlementMode:'refund',refundMethod:'cash',
    },kwd.auth);
    const oneFilVendorReturn=await db.selectFrom('return_documents').select('total')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',Number(oneFilPurchaseRefund.returnDocumentId))
      .executeTakeFirstOrThrow();
    assert.equal(Number(oneFilVendorReturn.total),0.001);
    const afterFilVendor=await db.selectFrom('suppliers').select('balance')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.supplierId).executeTakeFirstOrThrow();
    assert.equal(Number(afterFilVendor.balance),0);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',kwd.productId)
      .executeTakeFirstOrThrow()).stock_qty),0);
    const filReturnGL=await sql<{source_type:string;total_debit:string;total_credit:string}>`
      select j.source_type, sum(l.debit) as total_debit, sum(l.credit) as total_credit
      from journal_entries j join journal_entry_lines l
        on l.journal_entry_id=j.id and l.tenant_id=j.tenant_id
      where j.tenant_id=${kwd.auth.tenantId!} and j.source_type in ('sales_return','purchase_return')
        and j.source_id in (${Number(oneFilSaleRefund.returnDocumentId)},${Number(oneFilPurchaseRefund.returnDocumentId)})
      group by j.source_type
    `.execute(db);
    assert.equal(filReturnGL.rows.length,2);
    for (const row of filReturnGL.rows) {
      assert.ok(Number(row.total_debit)>=0.001);
      assert.equal(Number(row.total_debit),Number(row.total_credit));
    }
    pass('KWD sale and supplier return reverse one-fil AR/AP and COGS with physical stock and balanced journals');
    // Payments must settle a single fil without rounding to a cent or writing
    // an unmatched journal/subledger balance. This uses a fresh tenant fixture.
    const kwdPayments=await fixture('kwd_payment_settlement');
    await db.updateTable('settings').set({value:'"KWD"'}).where('tenant_id','=',kwdPayments.auth.tenantId!).where('key','=','currency').execute();
    await db.updateTable('currency_exchange_rates').set({currency_code:'KWD',exchange_rate:1})
      .where('tenant_id','=',kwdPayments.auth.tenantId!).where('is_base','=',true).execute();
    const paymentPurchase=await purchases.createPurchase({
      supplierId:kwdPayments.supplierId,paymentType:'credit',branchId:kwdPayments.branchId,
      locationId:kwdPayments.locationId,taxRate:0,pricesIncludeTax:false,
      items:[{productId:kwdPayments.productId,name:'Test product',qty:1,cost:0.001,
        unitMultiplier:1,locationId:kwdPayments.locationId}],
    },kwdPayments.auth,randomUUID());
    assert.ok(Number(paymentPurchase.purchaseId)>0);
    await db.updateTable('products').set({retail_price:0.001,wholesale_price:0.001})
      .where('tenant_id','=',kwdPayments.auth.tenantId!).where('id','=',kwdPayments.productId).execute();
    const paymentSale=await sales.createSale({
      customerId:kwdPayments.customerId,paymentType:'credit',paymentChannel:'credit',
      branchId:kwdPayments.branchId,locationId:kwdPayments.locationId,taxRate:0,
      pricesIncludeTax:false,payments:[],source:'dashboard',
      items:[{productId:kwdPayments.productId,name:'Test product',qty:1,price:0.001,
        unitMultiplier:1,priceType:'retail'}],
    } as any,kwdPayments.auth);
    assert.ok(Number((paymentSale.sale as {id:string}).id)>0);
    await purchases.createSupplierPayment({
      supplierId:kwdPayments.supplierId,amount:0.001,paymentChannel:'cash',
      branchId:kwdPayments.branchId,locationId:kwdPayments.locationId,
    },kwdPayments.auth,randomUUID());
    await purchases.createCustomerPayment({
      customerId:kwdPayments.customerId,amount:0.001,paymentChannel:'cash',
      branchId:kwdPayments.branchId,locationId:kwdPayments.locationId,
    },kwdPayments.auth,randomUUID());
    const settledSupplier=await db.selectFrom('suppliers').select('balance')
      .where('tenant_id','=',kwdPayments.auth.tenantId!).where('id','=',kwdPayments.supplierId).executeTakeFirstOrThrow();
    const settledCustomer=await db.selectFrom('customers').select('balance')
      .where('tenant_id','=',kwdPayments.auth.tenantId!).where('id','=',kwdPayments.customerId).executeTakeFirstOrThrow();
    assert.equal(Number(settledSupplier.balance),0);
    assert.equal(Number(settledCustomer.balance),0);
    const supplierPaymentRows=await db.selectFrom('supplier_payments').select('amount')
      .where('tenant_id','=',kwdPayments.auth.tenantId!).execute();
    const customerPaymentRows=await db.selectFrom('customer_payments').select('amount')
      .where('tenant_id','=',kwdPayments.auth.tenantId!).execute();
    assert.equal(supplierPaymentRows.length,1);
    assert.equal(customerPaymentRows.length,1);
    assert.equal(Number(supplierPaymentRows[0].amount),0.001);
    assert.equal(Number(customerPaymentRows[0].amount),0.001);
    const paymentGL=await sql<{source_type:string;debits:string;credits:string}>`
      select j.source_type,sum(l.debit) as debits,sum(l.credit) as credits
      from journal_entries j join journal_entry_lines l
        on l.journal_entry_id=j.id and l.tenant_id=j.tenant_id
      where j.tenant_id=${kwdPayments.auth.tenantId!}
        and j.source_type in ('supplier_payment','customer_payment')
      group by j.source_type
    `.execute(db);
    assert.equal(paymentGL.rows.length,2);
    for(const row of paymentGL.rows){
      assert.equal(Number(row.debits),0.001);
      assert.equal(Number(row.credits),0.001);
    }
    pass('KWD supplier and customer payment 0.001 clears AP/AR and posts balanced GL without duplicate source rows');





    // Exercise actual cross-module 0.001 cash and inventory paths, not merely an isolated journal.
    const filTicket = await maintenance.createTicket({
      customerName:'KWD repair',customerPhone:'01000000000',deviceModel:'Watch',
      problemDescription:'Check',finalCost:0.003,expectedCost:0.003,advancePayment:0.001,
      branchId:kwd.branchId,locationId:kwd.locationId,
    } as any,kwd.auth);
    await maintenance.updateTicketStatus(Number(filTicket.id),{
      status:'delivered',finalCost:0.003,collectedAmount:0.002,
    },kwd.auth);
    const maintenanceLedger=await sql<{account_code:string;value:string}>`select a.code as account_code,
      sum(l.debit-l.credit) as value from journal_entry_lines l
      join journal_entries j on j.id=l.journal_entry_id and j.tenant_id=l.tenant_id
      join accounting_accounts a on a.id=l.account_id and a.tenant_id=l.tenant_id
      where j.tenant_id=${kwd.auth.tenantId} and j.source_id=${Number(filTicket.id)}
        and j.source_type in ('maintenance_advance','maintenance_delivery')
      group by a.code`.execute(db);
    const maintenanceByCode = new Map(maintenanceLedger.rows.map(row=>[row.account_code,Number(row.value)]));
    assert.equal(maintenanceByCode.get('1110'),0.003,'KWD repair cash has three decimal places');
    assert.equal(maintenanceByCode.get('4200'),-0.003,'KWD repair service revenue retains the last fil');
    assert.equal(maintenanceByCode.get('2150'),0,'advance liability clears exactly');
    await assert.rejects(maintenance.createTicket({
      customerName:'Overprecision',customerPhone:'01000000000',deviceModel:'Watch',
      problemDescription:'Reject',finalCost:0.0001,advancePayment:0,
    } as any,kwd.auth),(err:any)=>err.code==='MAINTENANCE_CURRENCY_PRECISION_INVALID');
    pass('KWD maintenance 0.001 advance + 0.002 settlement retains precise cash, liability, revenue and rejects sub-fil amounts');

    const filSerial=`KWD-${tag}-FIL`;
    const filTrade=await tradein.createTransaction({
      sellerName:'KWD test seller',sellerPhone:'01000000000',sellerNationalId:'00000000000000',
      deviceModel:'Used device',serialNumber:filSerial,agreedPurchasePrice:0.001,
      transactionType:'cash_purchase',paymentMethod:'cash',autoAddToInventory:true,
      branchId:kwd.branchId,locationId:kwd.locationId,
    },kwd.auth);
    const filSource=await db.selectFrom('trade_in_transactions').select('created_product_id')
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',Number(filTrade.id)).executeTakeFirstOrThrow();
    const filStock=await db.selectFrom('products').select(['stock_qty','cost_price'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('id','=',Number(filSource.created_product_id)).executeTakeFirstOrThrow();
    assert.equal(Number(filStock.stock_qty),1);
    assert.equal(Number(filStock.cost_price),0.001,'one-fil inventory WAC must not round to zero');
    const filMove=await db.selectFrom('stock_movements').select(['unit_cost','total_cost'])
      .where('tenant_id','=',kwd.auth.tenantId!).where('reference_type','=','trade_in')
      .where('reference_id','=',Number(filTrade.id)).executeTakeFirstOrThrow();
    assert.equal(Number(filMove.total_cost),0.001);
    assert.equal(Number(filMove.unit_cost),0.001);
    const filGL=await db.selectFrom('journal_entry_lines').innerJoin('journal_entries',join=>join
      .onRef('journal_entries.id','=','journal_entry_lines.journal_entry_id')
      .onRef('journal_entries.tenant_id','=','journal_entry_lines.tenant_id'))
      .select(['journal_entry_lines.debit','journal_entry_lines.credit'])
      .where('journal_entries.tenant_id','=',kwd.auth.tenantId!)
      .where('journal_entries.source_type','=','trade_in')
      .where('journal_entries.source_id','=',Number(filTrade.id)).execute();
    assert.equal(filGL.length,2);
    assert.equal(filGL.reduce((sum,x)=>sum+Number(x.debit),0),0.001);
    assert.equal(filGL.reduce((sum,x)=>sum+Number(x.credit),0),0.001);
    const filPayout=await db.selectFrom('treasury_transactions').select('amount')
      .where('tenant_id','=',kwd.auth.tenantId!).where('reference_type','=','trade_in')
      .where('reference_id','=',Number(filTrade.id)).executeTakeFirstOrThrow();
    assert.equal(Number(filPayout.amount),-0.001);
    await assert.rejects(tradein.createTransaction({
      sellerName:'KWD test seller',sellerPhone:'01000000000',sellerNationalId:'00000000000000',
      deviceModel:'Used device',serialNumber:`KWD-${tag}-SUBFIL`,agreedPurchasePrice:0.0001,
      transactionType:'cash_purchase',paymentMethod:'cash',autoAddToInventory:true,
      branchId:kwd.branchId,locationId:kwd.locationId,
    },kwd.auth),(err:any)=>err.code==='TRADEIN_CURRENCY_PRECISION_INVALID');
    pass('KWD trade-in 0.001 physical stock, WAC, cash payout and matching GL; sub-fil amount rejects');

    // Canonical pharmacy importer delegates atomic supplier purchase, batch WAC,
    // physical stock and one posted purchase/AP journal to the purchase engine.
    const pharmacy = app.get(PharmacyService);
    const kwdPh=await fixture('kwd_pharmacy');
    await db.updateTable('settings').set({value:'"KWD"'}).where('tenant_id','=',kwdPh.auth.tenantId!).where('key','=','currency').execute();
    await db.updateTable('currency_exchange_rates').set({currency_code:'KWD',exchange_rate:1})
      .where('tenant_id','=',kwdPh.auth.tenantId!).where('is_base','=',true).execute();
    const kwdDrug=await db.insertInto('pharmacy_drugs').values({
      tenant_id:kwdPh.auth.tenantId!,account_id:kwdPh.auth.accountId!,
      product_id:kwdPh.productId,trade_name:'KWD test drug',active_ingredient:'Acceptance substance',
      dosage_form:'tablets',units_per_box:1,unit_name:'unit',box_price:0.001,strip_price:0.001,
    } as any).returning('id').executeTakeFirstOrThrow();
    const kwdDistributorInvoice={
      distributor:'Supplier',invoiceNumber:`KWD-PHARM-${tag}`,paymentType:'credit' as const,
      lines:[{productName:'KWD test drug',quantity:2,bonusQuantity:1,
        costPrice:0.001,publicPrice:0.002,expiryDate:'2030-12',batchNumber:`KWD-LOT-${tag}`}],
    };
    const kwdPhPosted=await pharmacy.importDistributorInvoice(kwdPh.auth,kwdDistributorInvoice);
    assert.equal(kwdPhPosted.totalCostSum,0.002);
    assert.equal(kwdPhPosted.totalQuantity,3);
    const kwdPhPurchase=await db.selectFrom('purchases').select('total')
      .where('tenant_id','=',kwdPh.auth.tenantId!).where('id','=',kwdPhPosted.purchaseId).executeTakeFirstOrThrow();
    assert.equal(Number(kwdPhPurchase.total),0.002);
    const kwdPhStock=await db.selectFrom('products').select(['stock_qty','cost_price'])
      .where('tenant_id','=',kwdPh.auth.tenantId!).where('id','=',kwdPh.productId).executeTakeFirstOrThrow();
    assert.equal(Number(kwdPhStock.stock_qty),3);
    assert.ok(Math.abs(Number(kwdPhStock.cost_price)*3-0.002)<0.000002,'bonus WAC retains supplier value');
    const kwdPhBatch=await db.selectFrom('pharmacy_batches').select(['quantity','drug_id'])
      .where('tenant_id','=',kwdPh.auth.tenantId!).where('batch_number','=',`KWD-LOT-${tag}`).execute();
    assert.equal(kwdPhBatch.length,1);
    assert.equal(Number(kwdPhBatch[0].quantity),3);
    assert.equal(Number(kwdPhBatch[0].drug_id),Number(kwdDrug.id));
    const kwdPhSupplier=await db.selectFrom('suppliers').select('balance')
      .where('tenant_id','=',kwdPh.auth.tenantId!).where('id','=',kwdPh.supplierId).executeTakeFirstOrThrow();
    assert.equal(Number(kwdPhSupplier.balance),0.002);
    const kwdPhLines=await db.selectFrom('journal_entry_lines')
      .innerJoin('journal_entries',j=>j.onRef('journal_entries.id','=','journal_entry_lines.journal_entry_id')
        .onRef('journal_entries.tenant_id','=','journal_entry_lines.tenant_id'))
      .select(['journal_entry_lines.debit','journal_entry_lines.credit'])
      .where('journal_entries.tenant_id','=',kwdPh.auth.tenantId!)
      .where('journal_entries.source_type','=','purchase')
      .where('journal_entries.source_id','=',kwdPhPosted.purchaseId).execute();
    assert.equal(kwdPhLines.length,2);
    assert.equal(kwdPhLines.reduce((sum,x)=>sum+Number(x.debit),0),0.002);
    assert.equal(kwdPhLines.reduce((sum,x)=>sum+Number(x.credit),0),0.002);
    const kwdPhReplay=await pharmacy.importDistributorInvoice(kwdPh.auth,kwdDistributorInvoice);
    assert.equal(kwdPhReplay.purchaseId,kwdPhPosted.purchaseId);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',kwdPh.auth.tenantId!).where('id','=',kwdPh.productId)
      .executeTakeFirstOrThrow()).stock_qty),3,'pharmacy retry cannot duplicate drug stock');
    pass('KWD pharmacy 0.002 paid + bonus receipt posts one fil-safe supplier/AP/GL journal and WAC');
    // A posted supplier liability of two fils must also appear in the real
    // tenant-scoped report API, not just in the underlying journal.
    const vendorReports = app.get(ReportsSummaryService);
    const supplierBalances = await vendorReports.supplierBalances({} as any, kwdPh.auth);
    const supplierRow = (supplierBalances.suppliers as Array<{id:string;balance:number}>)
      .find(row=>row.id===String(kwdPh.supplierId));
    assert.ok(supplierRow,'Posted KWD supplier must appear in partner balances');
    assert.equal(Number(supplierRow.balance),0.002);
    assert.equal(Number((supplierBalances.summary as {totalBalance:number}).totalBalance),0.002);
    pass('real supplier balance report retains 0.002 KWD posted pharmacy AP rather than rounding to zero');


    const pf = await fixture('pharmacy_invoice');
    const pd = await db.insertInto('pharmacy_drugs').values({
      tenant_id:pf.auth.tenantId!, account_id:pf.auth.accountId!,
      product_id:pf.productId, trade_name:'Test product',
      active_ingredient:'Acceptance substance', dosage_form:'tablets',
      units_per_box:1, unit_name:'unit', box_price:20, strip_price:20,
    } as any).returning('id').executeTakeFirstOrThrow();
    const pharmacyInvoice={
      distributor:'Supplier',invoiceNumber:`DISTRIB-${tag}-001`,
      paymentType:'credit' as const,
      lines:[{productName:'Test product',quantity:2,bonusQuantity:1,
        costPrice:10,publicPrice:20,expiryDate:'2030-12',batchNumber:`LOT-${tag}`}],
    };
    const postedInvoice=await pharmacy.importDistributorInvoice(pf.auth,pharmacyInvoice);
    assert.equal(postedInvoice.totalCostSum,20);
    assert.equal(postedInvoice.totalQuantity,3);
    const purchaseRows=await db.selectFrom('purchases').select(['id','supplier_id','total'])
      .where('tenant_id','=',pf.auth.tenantId!).where('id','=',postedInvoice.purchaseId).execute();
    assert.equal(purchaseRows.length,1);
    assert.equal(Number(purchaseRows[0].supplier_id),pf.supplierId);
    assert.equal(money(purchaseRows[0].total),20);
    const physical=await db.selectFrom('products').select(['stock_qty','cost_price'])
      .where('tenant_id','=',pf.auth.tenantId!).where('id','=',pf.productId).executeTakeFirstOrThrow();
    assert.equal(Number(physical.stock_qty),3);
    assert.equal(money(Number(physical.stock_qty)*Number(physical.cost_price)),20);
    const batches=await db.selectFrom('pharmacy_batches').select(['drug_id','quantity','product_id'])
      .where('tenant_id','=',pf.auth.tenantId!).where('batch_number','=',`LOT-${tag}`).execute();
    assert.equal(batches.length,1);assert.equal(Number(batches[0].quantity),3);
    assert.equal(Number(batches[0].drug_id),Number(pd.id));
    assert.equal(Number(batches[0].product_id),pf.productId);
    assert.equal(await postingAmount(pf,'1140'),20);
    assert.equal(await postingAmount(pf,'2110'),-20);
    const pharmacyRetry=await pharmacy.importDistributorInvoice(pf.auth,pharmacyInvoice);
    assert.equal(pharmacyRetry.purchaseId,postedInvoice.purchaseId);
    const afterRetry=await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',pf.auth.tenantId!).where('id','=',pf.productId).executeTakeFirstOrThrow();
    assert.equal(Number(afterRetry.stock_qty),3,'pharmacyInvoice replay must not add inventory');
    await assert.rejects(
      pharmacy.upsertBatch(pf.auth,{productId:pf.productId,drugId:Number(pd.id),batchNumber:'MANUAL',
        expiryDate:'2030-12',quantity:1,unitCost:10}),
      (err:any)=>err.code==='PHARMACY_BATCH_PURCHASE_REQUIRED',
    );
    await assert.rejects(
      pharmacy.upsertDrug(pf.auth,{
        id:Number(pd.id), productId:null, tradeName:'Test product',
        activeIngredient:'Acceptance substance', dosageForm:'tablets',
      } as any),
      (err:any)=>err.code==='PHARMACY_PRODUCT_LINK_IMMUTABLE');
    await assert.rejects(
      pharmacy.upsertDrug(pf.auth,{
        productId:999999999,tradeName:'Injected cross tenant',activeIngredient:'Substance',
        dosageForm:'tablets',
      } as any),
      (err:any)=>err.code==='PHARMACY_PRODUCT_NOT_LINKED');
    await assert.rejects(pharmacy.deleteDrug(pf.auth,Number(pd.id)),
      (err:any)=>err.code==='PHARMACY_DRUG_BATCH_HISTORY');
    await assert.rejects(pharmacy.importDistributorInvoice(pf.auth,{
      ...pharmacyInvoice,invoiceNumber:`DISTRIB-${tag}-EXP`,
      lines:[{...pharmacyInvoice.lines[0],batchNumber:`OLD-${tag}`,expiryDate:'2020-01'}],
    }));
    const afterFailed=await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',pf.auth.tenantId!).where('id','=',pf.productId).executeTakeFirstOrThrow();
    assert.equal(Number(afterFailed.stock_qty),3,'expired-batch purchase must rollback inventory');
    const failedPurchase=await db.selectFrom('purchases').select('id')
      .where('tenant_id','=',pf.auth.tenantId!).where('supplier_invoice_no','=',`DISTRIB-${tag}-EXP`).execute();
    assert.equal(failedPurchase.length,0,'failed purchase must not retain source document');
    pass('pharmacy pharmacyInvoice posts AP/stock/batches/GL atomically, idempotently, and rolls back expired batches');

    // A paid clinical service or patient copay must be posted atomically:
    // source + one treasury receipt + two balanced GL lines, in KWD fils.
    const pharmacyCash = await fixture('pharmacy_cash');
    await db.updateTable('settings').set({value:'"KWD"'}).where('tenant_id','=',pharmacyCash.auth.tenantId!).where('key','=','currency').execute();
    await db.updateTable('currency_exchange_rates').set({currency_code:'KWD',exchange_rate:1})
      .where('tenant_id','=',pharmacyCash.auth.tenantId!).where('is_base','=',true).execute();
    const clinical = await pharmacy.createClinicalService(pharmacyCash.auth, {
      serviceType:'Blood pressure measurement',customerName:'Acceptance patient',fee:0.001,
    });
    const clinicalReceipt = await db.selectFrom('treasury_transactions').select(['amount'])
      .where('tenant_id','=',pharmacyCash.auth.tenantId!)
      .where('reference_type','=','pharmacy_clinical_service')
      .where('reference_id','=',Number(clinical.id)).execute();
    assert.equal(clinicalReceipt.length,1);
    assert.equal(Number(clinicalReceipt[0].amount),0.001);
    const rxRecord = await pharmacy.upsertPrescription(pharmacyCash.auth,{
      customerName:'Acceptance patient',totalAmount:0.002,patientAmount:0.002,
      status:'dispensed',items:[],
    });
    const copayReceipt = await db.selectFrom('treasury_transactions').select('amount')
      .where('tenant_id','=',pharmacyCash.auth.tenantId!)
      .where('reference_type','=','pharmacy_prescription')
      .where('reference_id','=',Number(rxRecord.id)).execute();
    assert.equal(copayReceipt.length,1);
    assert.equal(Number(copayReceipt[0].amount),0.002);
    await assert.rejects(pharmacy.upsertPrescription(pharmacyCash.auth,{
      id:Number(rxRecord.id),customerName:'Changed prescription',totalAmount:0.003,
      patientAmount:0.003,status:'dispensed',items:[],
    }),(err:any)=>err.code==='PHARMACY_PRESCRIPTION_REVERSAL_REQUIRED');
    await assert.rejects(pharmacy.upsertPrescription(pharmacyCash.auth,{
      customerName:'Insurer',totalAmount:0.01,patientAmount:0,insuranceAmount:0.01,
      status:'dispensed',
    }),(err:any)=>err.code==='PHARMACY_INSURANCE_SETTLEMENT_REQUIRED');
    await assert.rejects(pharmacy.createClinicalService(pharmacyCash.auth,{
      serviceType:'Invalid sub-fil',customerName:'Patient',fee:0.0001,
    }),(err:any)=>err.code==='PHARMACY_CURRENCY_PRECISION_INVALID');
    const pharmacyJournalAmounts=await sql<{code:string;amount:string}>`
      select a.code, sum(l.debit-l.credit) as amount from journal_entry_lines l
      join journal_entries j on j.tenant_id=l.tenant_id and j.id=l.journal_entry_id
      join accounting_accounts a on a.tenant_id=l.tenant_id and a.id=l.account_id
      where j.tenant_id=${pharmacyCash.auth.tenantId}
        and j.source_type in ('pharmacy_clinical_service','pharmacy_prescription_cash')
      group by a.code`.execute(db);
    const phLedger=new Map(pharmacyJournalAmounts.rows.map(row=>[row.code,Number(row.amount)]));
    assert.equal(phLedger.get('1110'),0.003);
    assert.equal(phLedger.get('4200'),-0.003);
    const phEntries = await db.selectFrom('journal_entries').select(['id','source_type'])
      .where('tenant_id','=',pharmacyCash.auth.tenantId!)
      .where('source_type','in',['pharmacy_clinical_service','pharmacy_prescription_cash'])
      .execute();
    assert.equal(phEntries.length,2,'One source-backed immutable GL per collection');
    await db.updateTable('accounting_settings').set({lock_date_all:'2099-12-31'})
      .where('tenant_id','=',pharmacyCash.auth.tenantId!).execute();
    const previousClinical = await db.selectFrom('pharmacy_clinical_services').select('id')
      .where('tenant_id','=',pharmacyCash.auth.tenantId!).execute();
    await assert.rejects(pharmacy.createClinicalService(pharmacyCash.auth,{
      serviceType:'Must rollback',customerName:'Blocked patient',fee:0.001,
    }));
    const afterClinical = await db.selectFrom('pharmacy_clinical_services').select('id')
      .where('tenant_id','=',pharmacyCash.auth.tenantId!).execute();
    assert.equal(afterClinical.length,previousClinical.length,'GL failure rolls back clinical source and cash');
    await db.updateTable('accounting_settings').set({lock_date_all:null})
      .where('tenant_id','=',pharmacyCash.auth.tenantId!).execute();
    pass('pharmacy clinical fee and patient copay preserve KWD fils, post GL once, reject unsafe edits and roll back on posting failure');

    // Named prescription receipts must survive a retry/concurrent replay without duplicate cash/GL.
    const duplicateRx = {
      prescriptionNo:`PH-RX-${tag}-CONC`,
      customerName:'Concurrent payer', totalAmount:0.001, patientAmount:0.001,
      status:'dispensed', items:[],
    };
    const rxRace = await Promise.allSettled([
      pharmacy.upsertPrescription(pharmacyCash.auth, duplicateRx),
      pharmacy.upsertPrescription(pharmacyCash.auth, {...duplicateRx}),
    ]);
    assert.equal(rxRace.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(rxRace.filter(x=>x.status==='rejected' && (x.reason as any).code==='PHARMACY_DUPLICATE_PRESCRIPTION').length,1);
    const matchedRx=await db.selectFrom('pharmacy_prescriptions').select('id')
      .where('tenant_id','=',pharmacyCash.auth.tenantId!)
      .where('prescription_no','=',duplicateRx.prescriptionNo).execute();
    assert.equal(matchedRx.length,1);
    const namedId=Number(matchedRx[0].id);
    const duplicateCash=await db.selectFrom('treasury_transactions').select('id')
      .where('tenant_id','=',pharmacyCash.auth.tenantId!)
      .where('reference_type','=','pharmacy_prescription')
      .where('reference_id','=',namedId).execute();
    assert.equal(duplicateCash.length,1);
    const duplicateGl=await db.selectFrom('journal_entries').select('id')
      .where('tenant_id','=',pharmacyCash.auth.tenantId!)
      .where('source_type','=','pharmacy_prescription_cash')
      .where('source_id','=',namedId).execute();
    assert.equal(duplicateGl.length,1);
    await assert.rejects(pharmacy.upsertPrescription(pharmacyCash.auth, {
      customerName:'Unlinked medicine',totalAmount:0.001,patientAmount:0.001,
      status:'dispensed',items:[{drugName:'Unknown stock item',price:0.001}],
    }),(err:any)=>err.code==='PHARMACY_PRESCRIPTION_SALE_REQUIRED');
    pass('concurrent duplicate prescription number cannot double-collect cash or journal; unlinked drug billing fails closed');

    // The shared cross-sector partner posting helper must never round a 0.001
    // KWD payable away while its posted GL still holds the liability.
    const kwdDomainPartnerFixture=await fixture('kwd_cross_domain_partner');
    await db.updateTable('settings').set({value:'"KWD"'})
      .where('tenant_id','=',kwdDomainPartnerFixture.auth.tenantId!).where('key','=','currency').execute();
    await db.updateTable('currency_exchange_rates').set({currency_code:'KWD',exchange_rate:1})
      .where('tenant_id','=',kwdDomainPartnerFixture.auth.tenantId!).where('is_base','=',true).execute();
    const domainJournal=await posting.postDomainJournal(db,{
      tenantId:kwdDomainPartnerFixture.auth.tenantId!,accountId:kwdDomainPartnerFixture.auth.accountId!,
      sourceType:'contracting_ipc',sourceId:kwdDomainPartnerFixture.productId,
      entryDate:new Date(),description:'Cross-sector supplier one-fil source',
      createdBy:kwdDomainPartnerFixture.auth.userId,
      lines:[
        {accountId:kwdDomainPartnerFixture.accounts.get('5200')!,description:'Recorded cross-sector cost',
          debit:0.001,credit:0,partnerType:'none',partnerId:null},
        {accountId:kwdDomainPartnerFixture.accounts.get('2110')!,description:'One-fil supplier liability',
          debit:0,credit:0.001,partnerType:'supplier',partnerId:kwdDomainPartnerFixture.supplierId},
      ],
    });
    assert.ok(Number(domainJournal)>0);
    const partnerLedgerRows=await db.selectFrom('supplier_ledger').select(['amount','balance_after'])
      .where('tenant_id','=',kwdDomainPartnerFixture.auth.tenantId!)
      .where('reference_type','=','journal_entry')
      .where('reference_id','=',domainJournal).execute();
    assert.equal(partnerLedgerRows.length,1);
    assert.equal(Number(partnerLedgerRows[0].amount),0.001);
    assert.equal(Number(partnerLedgerRows[0].balance_after),0.001);
    const supplierAfter=await db.selectFrom('suppliers').select('balance')
      .where('tenant_id','=',kwdDomainPartnerFixture.auth.tenantId!)
      .where('id','=',kwdDomainPartnerFixture.supplierId).executeTakeFirstOrThrow();
    assert.equal(Number(supplierAfter.balance),0.001);
    assert.equal(await postingAmount(kwdDomainPartnerFixture,'2110',3),-0.001);
    const filReport=await app.get(ReportsSummaryService).supplierBalances({} as any,kwdDomainPartnerFixture.auth);
    assert.equal(Number((filReport.summary as {totalBalance:number}).totalBalance),0.001);
    pass('generic cross-sector posting reconciles 0.001 KWD supplier ledger, GL and vendor balance report');

    // 255 depends on the composite tenant keys introduced by 253.
    // A fully migrated installation must REFUSE rolling 253 back alone; do not
    // drop dependent MFA constraints using CASCADE to make the test green.
    await db.transaction().execute(async trx=>{await up253(trx);await up253(trx);});
    await assert.rejects(
      db.transaction().execute(async trx=>down253(trx)),
      (error:any) => error.code==='2BP01' && /uq_core253_users_tenant_id/.test(error.message),
      'PostgreSQL must refuse downgrade while newer security FKs depend on its key',
    );
    const constraint=await sql`select 1 from pg_constraint where conname='ck_core253_journal_finite'`.execute(db);
    assert.equal(constraint.rows.length,1);
    const dependent=await sql`select 1 from pg_constraint where conname='fk_core255_user_mfa_tenant_user_id'`.execute(db);
    assert.equal(dependent.rows.length,1);
    pass('tenant-reference migration up/up is repeatable; unsafe rollback is refused and guards survive');
    console.log(JSON.stringify({status:'PASS',scenarios:results,tenants:createdTenants},null,2));
  } finally {await app.close();await db.destroy();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
