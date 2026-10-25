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
  const postingAmount=async(f:Fixture,code:string)=>{
    const rows=await sql<{amount:string}>`select coalesce(sum(l.debit-l.credit),0) as amount from journal_entry_lines l
      join journal_entries j on j.id=l.journal_entry_id and j.tenant_id=l.tenant_id
      join accounting_accounts a on a.id=l.account_id and a.tenant_id=l.tenant_id
      where l.tenant_id=${f.auth.tenantId} and a.code=${code} and j.status='posted'`.execute(db);
    return money(rows.rows[0].amount);
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
      transactionType:'cash_purchase' as const,paymentMethod:'cash',autoAddToInventory:false,
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
    await assert.rejects(tradein.createTransaction(intake,traded.auth),(e:any)=>e.code==='TRADEIN_DUPLICATE_SERIAL');
    await assert.rejects(tradein.deleteTransaction(Number(recorded[0].id),traded.auth),(e:any)=>e.code==='TRADEIN_REVERSAL_REQUIRED');
    const retained=await db.selectFrom('trade_in_transactions').select('id')
      .where('tenant_id','=',traded.auth.tenantId!).where('id','=',Number(recorded[0].id)).executeTakeFirst();
    assert.ok(retained,'financially relevant trade-in source must remain immutable');
    pass('concurrent trade-in duplicate and lost response cannot create a second cash movement; economic history cannot be hard-deleted');

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
