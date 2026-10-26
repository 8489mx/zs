import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { Test } from '@nestjs/testing';
import { Kysely } from '../../src/database/kysely';
import { Database } from '../../src/database/database.types';
import { KYSELY_DB } from '../../src/database/database.constants';
import { AuthContext } from '../../src/core/auth/interfaces/auth-context.interface';
import { SUPER_ADMIN_PERMISSIONS } from '../../src/core/auth/constants/super-admin-permissions';
import { createPasswordRecord } from '../../src/core/auth/utils/password-hasher';
import { AccountingTenantFoundationService } from '../../src/modules/accounting/accounting-tenant-foundation.service';
import { AccountingPostingService } from '../../src/modules/accounting/accounting-posting.service';
import { inspectAccountingIntegrity } from '../../src/modules/accounting/accounting-integrity';
import { PurchasesService } from '../../src/modules/purchases/purchases.service';
import { SalesService } from '../../src/modules/sales/sales.service';
import { ReturnsService } from '../../src/modules/returns/returns.service';
import { CashDrawerService } from '../../src/modules/cash-drawer/cash-drawer.service';

const PASSWORD = 'DisposableAcceptance!2026#Only';
const cents = (n: unknown) => Number(Number(n).toFixed(2));

async function main(): Promise<void> {
  const target = process.env.ACCEPTANCE_DATABASE_URL;
  assert.ok(target, 'A disposable PostgreSQL ACCEPTANCE_DATABASE_URL is required');
  const url = new URL(target);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname), 'Only local disposable PostgreSQL');
  assert.ok(/^\/(zs_core_audit_test|zs_acceptance_[a-z0-9_]+)$/.test(url.pathname),
    'Refusing production and user databases');
  Object.assign(process.env, {
    NODE_ENV:'test', APP_MODE:'CLOUD_SAAS', TENANT_ID:'zs', ACCOUNT_ID:'zs',
    DATABASE_HOST:url.hostname, DATABASE_PORT:url.port || '5432', DATABASE_NAME:url.pathname.slice(1),
    DATABASE_USER:decodeURIComponent(url.username), DATABASE_PASSWORD:decodeURIComponent(url.password),
    DATABASE_SSL:'false', DATABASE_POOL_MAX:'8', SESSION_CSRF_SECRET:'disposable-priority-sectors-acceptance',
    ENABLE_BOOTSTRAP_ADMIN:'false', SMTP_HOST:'', ERROR_TRACKING_ENABLED:'false',
  });
  const { AppModule } = await import('../../src/app.module');
  const app = await Test.createTestingModule({imports:[AppModule]}).compile();
  const db = app.get<Kysely<Database>>(KYSELY_DB);
  const foundation = app.get(AccountingTenantFoundationService);
  const purchases = app.get(PurchasesService);
  const sales = app.get(SalesService);
  const returns = app.get(ReturnsService);
  const drawer = app.get(CashDrawerService);
  const tag = randomUUID().replaceAll('-','').slice(0,9);
  const creds = await createPasswordRecord(PASSWORD);

  type Shop = {auth:AuthContext;branchId:number;locationId:number;supplierId:number;customerId:number};
  async function shop(sector:string, features:string[]=[]):Promise<Shop> {
    const tenantId = `priority_${tag}_${sector}`;
    await db.insertInto('tenants').values({
      id:tenantId,slug:tenantId,business_name:tenantId,owner_name:'Acceptance',
      owner_phone:`${tag}${sector}`,owner_email:`${tenantId}@example.invalid`,
      activity_type:'retail_general',status:'active',plan_id:'plan_omnichannel',country_code:'EG',
      trial_starts_at:new Date(),trial_ends_at:new Date('2100-01-01'),activated_at:new Date(),
      extra_features:JSON.stringify(features),
    } as any).execute();
    const user = await db.insertInto('users').values({
      tenant_id:tenantId,account_id:tenantId,username:tenantId,phone:`${tag}${sector}`,
      password_hash:creds.hash,password_salt:creds.salt,role:'admin',is_active:true,
      must_change_password:false,permissions_json:JSON.stringify(SUPER_ADMIN_PERMISSIONS),
    } as any).returning('id').executeTakeFirstOrThrow();
    const auth:AuthContext={tenantId,accountId:tenantId,userId:Number(user.id),role:'admin',
      username:tenantId,sessionId:`session_${tenantId}`,permissions:[...SUPER_ADMIN_PERMISSIONS],
      extraFeatures:features,planId:'plan_omnichannel'};
    const branch=await db.insertInto('branches').values({tenant_id:tenantId,account_id:tenantId,
      name:'Sector test',code:`BR_${tenantId}`} as any).returning('id').executeTakeFirstOrThrow();
    const location=await db.insertInto('stock_locations').values({tenant_id:tenantId,account_id:tenantId,
      branch_id:Number(branch.id),name:'Main Store',code:`ST_${tenantId}`,
      location_type:'internal_warehouse',is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    await db.updateTable('branches').set({default_stock_location_id:Number(location.id)})
      .where('tenant_id','=',tenantId).where('id','=',branch.id).execute();
    const supplier=await db.insertInto('suppliers').values({tenant_id:tenantId,account_id:tenantId,
      name:'Supplier',phone:'',address:'',notes:'',balance:0,is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    const customer=await db.insertInto('customers').values({tenant_id:tenantId,account_id:tenantId,
      name:'Customer',phone:'',address:'',balance:0,store_credit_balance:0,is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    await db.insertInto('settings').values({tenant_id:tenantId,account_id:tenantId,key:'currency',value:'"EGP"'} as any).execute();
    await foundation.ensureForAuth(db,auth);
    await drawer.openCashierShift({openingCash:0,branchId:Number(branch.id),
      locationId:Number(location.id),password:PASSWORD},auth);
    return {auth,branchId:Number(branch.id),locationId:Number(location.id),
      supplierId:Number(supplier.id),customerId:Number(customer.id)};
  }
  async function product(f:Shop,name:string,barcode:string) {
    const row=await db.insertInto('products').values({tenant_id:f.auth.tenantId!,account_id:f.auth.accountId!,
      name,barcode:`${tag}_${barcode}`,cost_price:0,retail_price:60,wholesale_price:60,
      stock_qty:0,reserved_qty:0,is_active:true} as any).returning('id').executeTakeFirstOrThrow();
    return Number(row.id);
  }
  async function receive(f:Shop,productId:number,qty:number,cost:number){
    return purchases.createPurchase({supplierId:f.supplierId,paymentType:'credit',
      branchId:f.branchId,locationId:f.locationId,taxRate:0,pricesIncludeTax:false,
      items:[{productId,name:'Stock receipt',qty,cost,unitMultiplier:1,locationId:f.locationId}]},
      f.auth,randomUUID());
  }
  async function checkout(f:Shop,items:any[],extras:Record<string,unknown>={}) {
    const total=items.reduce((sum,item)=>sum+item.qty*(item.price+
      (item.modifiers||[]).reduce((m:number,x:any)=>m+Number(x.price||0)*Number(x.qty??1),0)),0);
    return sales.createSale({source:'pos',branchId:f.branchId,locationId:f.locationId,
      customerId:f.customerId,paymentType:'cash',paymentChannel:'cash',
      taxRate:0,pricesIncludeTax:false,items,
      payments:[{paymentChannel:'cash',amount:cents(total)}],...extras} as any,f.auth);
  }
  async function posted(f:Shop,code:string) {
    const q=await sql<{amount:string}>`select coalesce(sum(l.debit-l.credit),0) as amount
      from journal_entry_lines l
      join journal_entries j on j.id=l.journal_entry_id and j.tenant_id=l.tenant_id
      join accounting_accounts a on a.id=l.account_id and a.tenant_id=l.tenant_id
      where l.tenant_id=${f.auth.tenantId} and a.code=${code} and j.status='posted'`.execute(db);
    return cents(q.rows[0].amount);
  }
  async function check(f:Shop,ids:number[]){
    const rows=await db.selectFrom('products').select(['id','stock_qty','cost_price'])
      .where('tenant_id','=',f.auth.tenantId!).where('id','in',ids).execute();
    const inventory=cents(rows.reduce((s,p)=>s+Number(p.stock_qty)*Number(p.cost_price),0));
    assert.equal(await posted(f,'1140'),inventory,'GL inventory equals physical WAC for sector');
    const integrity=await inspectAccountingIntegrity(db,f.auth.tenantId!);
    assert.equal(integrity.passed,true,JSON.stringify(integrity));
    const unbalanced=await sql`select j.id from journal_entries j
      join journal_entry_lines l on l.journal_entry_id=j.id and l.tenant_id=j.tenant_id
      where j.tenant_id=${f.auth.tenantId} and j.status='posted'
      group by j.id having sum(l.debit)<>sum(l.credit)`.execute(db);
    assert.equal(unbalanced.rows.length,0,'no unbalanced sector journals');
  }
  try {
    // CLOTHING: separate color+size SKUs must never transfer stock/cost between variants.
    const fashion=await shop('clothing');
    const red=await product(fashion,'Jacket / RED / M','JACKET-RED-M');
    const blue=await product(fashion,'Jacket / BLUE / L','JACKET-BLUE-L');
    await receive(fashion,red,3,20);
    await receive(fashion,blue,2,25);
    const redSale=await checkout(fashion,[{productId:red,name:'Red M',qty:2,price:60,unitMultiplier:1}]);
    const redId=Number((redSale.sale as {id:string}).id);
    const line=await db.selectFrom('sale_items').select('id').where('tenant_id','=',fashion.auth.tenantId!)
      .where('sale_id','=',redId).where('product_id','=',red).executeTakeFirstOrThrow();
    await returns.createReturn({type:'sale',invoiceId:redId,items:[
      {productId:red,saleItemId:Number(line.id),qty:1}],settlementMode:'refund',refundMethod:'cash'},fashion.auth);
    const variants=await db.selectFrom('products').select(['id','stock_qty'])
      .where('tenant_id','=',fashion.auth.tenantId!).where('id','in',[red,blue]).execute();
    assert.equal(Number(variants.find(p=>Number(p.id)===red)!.stock_qty),2);
    assert.equal(Number(variants.find(p=>Number(p.id)===blue)!.stock_qty),2);
    assert.equal(await posted(fashion,'5100'),20,'partial return reverses only the returned variant COGS');
    await check(fashion,[red,blue]);
    console.log('PASS sector-clothing PostgreSQL SKU color/size isolation, POS cash sale, return, stock/WAC/GL');

    // Atomic same-customer size/color exchange: return the exact originally
    // sold RED/M line and receive BLUE/L without inventing another cash payment.
    const originalExchange=await checkout(fashion,[{productId:red,name:'Red M',qty:1,price:60,unitMultiplier:1}]);
    const origId=Number((originalExchange.sale as {id:string}).id);
    const origLine=await db.selectFrom('sale_items').select('id')
      .where('tenant_id','=',fashion.auth.tenantId!).where('sale_id','=',origId)
      .where('product_id','=',red).executeTakeFirstOrThrow();
    const exchanged=await sales.createSale({
      source:'pos',branchId:fashion.branchId,locationId:fashion.locationId,
      customerId:fashion.customerId,paymentType:'cash',paymentChannel:'cash',
      taxRate:0,pricesIncludeTax:false,managerPin:PASSWORD,exchangeSaleId:origId,
      exchangeRefundMethod:'store_credit',
      items:[
        {productId:red,name:'Returned Red M',qty:-1,price:60,unitMultiplier:1,
          originalSaleItemId:Number(origLine.id)},
        {productId:blue,name:'New Blue L',qty:1,price:60,unitMultiplier:1},
      ],payments:[],
    } as any,fashion.auth);
    assert.ok(Number((exchanged.sale as {id:string}).id)>0);
    const afterExchange=await db.selectFrom('products').select(['id','stock_qty'])
      .where('tenant_id','=',fashion.auth.tenantId!).where('id','in',[red,blue]).execute();
    assert.equal(Number(afterExchange.find(p=>Number(p.id)===red)!.stock_qty),2);
    assert.equal(Number(afterExchange.find(p=>Number(p.id)===blue)!.stock_qty),1);
    await check(fashion,[red,blue]);
    console.log('PASS sector-clothing PostgreSQL atomic color/size exchange and immutable inventory/GL matching');
    // A separate FULL return must not alter another colour/size or count the refund twice.
    const fullSale=await checkout(fashion,[{productId:red,name:'Red M full-return case',
      qty:1,price:60,unitMultiplier:1}]);
    const fullSaleId=Number((fullSale.sale as {id:string}).id);
    const fullLine=await db.selectFrom('sale_items').select('id')
      .where('tenant_id','=',fashion.auth.tenantId!).where('sale_id','=',fullSaleId)
      .where('product_id','=',red).executeTakeFirstOrThrow();
    await returns.createReturn({type:'sale',invoiceId:fullSaleId,
      items:[{productId:red,saleItemId:Number(fullLine.id),qty:1}],
      settlementMode:'refund',refundMethod:'cash'},fashion.auth);
    const fullReturnStocks=await db.selectFrom('products').select(['id','stock_qty'])
      .where('tenant_id','=',fashion.auth.tenantId!).where('id','in',[red,blue]).execute();
    assert.equal(Number(fullReturnStocks.find(p=>Number(p.id)===red)!.stock_qty),2);
    assert.equal(Number(fullReturnStocks.find(p=>Number(p.id)===blue)!.stock_qty),1);
    assert.equal(await posted(fashion,'1110'),120,'full sale + full refund leave no phantom cash');
    await check(fashion,[red,blue]);
    console.log('PASS sector-clothing PostgreSQL complete refund leaves variant stock and drawer unchanged');

    const clothingShift=await db.selectFrom('cashier_shifts').select('id')
      .where('tenant_id','=',fashion.auth.tenantId!).where('opened_by','=',fashion.auth.userId)
      .where('status','=','open').executeTakeFirstOrThrow();
    await drawer.closeCashierShift(Number(clothingShift.id),
      {countedCash:120,managerPin:PASSWORD},fashion.auth);
    const clothingClosed=await db.selectFrom('cashier_shifts').select(['status','expected_cash','variance'])
      .where('tenant_id','=',fashion.auth.tenantId!).where('id','=',clothingShift.id).executeTakeFirstOrThrow();
    assert.equal(clothingClosed.status,'closed');
    assert.equal(cents(clothingClosed.expected_cash),120,'cash sale minus partial cash refund plus exchange source sale');
    assert.equal(cents(clothingClosed.variance),0,'clothing till must reconcile to zero');
    assert.equal(await posted(fashion,'1110'),120,'clothing cash balance must match GL');
    await check(fashion,[red,blue]);
    console.log('PASS sector-clothing PostgreSQL partial return, size exchange, closed cash shift and GL');


    // MARKET: barcode selection + weighted fractional stock sale with an open till.
    const market=await shop('market');
    const weighted=await product(market,'Market weighable bulk food','WEIGHT-200');
    await receive(market,weighted,10,8);
    const byBarcode=await db.selectFrom('products').select('id')
      .where('tenant_id','=',market.auth.tenantId!).where('barcode','=',`${tag}_WEIGHT-200`).executeTakeFirstOrThrow();
    assert.equal(Number(byBarcode.id),weighted);
    const marketSale=await checkout(market,[{productId:weighted,name:'Bulk food',qty:2.375,price:12,unitMultiplier:1}]);
    const marketId=Number((marketSale.sale as {id:string}).id);
    const saved=await db.selectFrom('sale_items').select(['qty','line_total','cost_price'])
      .where('tenant_id','=',market.auth.tenantId!).where('sale_id','=',marketId).executeTakeFirstOrThrow();
    assert.equal(Number(saved.qty),2.375);
    assert.equal(Number(saved.line_total),28.5);
    assert.equal(await posted(market,'5100'),19);
    assert.equal(await posted(market,'1110'),28.5);
    await check(market,[weighted]);
    console.log('PASS sector-market PostgreSQL barcode, weighted POS, shift open, purchase, WAC, COGS, cash/GL');
    // Fractional return against the exact sold line; supplier settlement must be
    // counted once as cash-out, never as a second POS discount or stock movement.
    const marketLine=await db.selectFrom('sale_items').select('id')
      .where('tenant_id','=',market.auth.tenantId!).where('sale_id','=',marketId)
      .where('product_id','=',weighted).executeTakeFirstOrThrow();
    await returns.createReturn({type:'sale',invoiceId:marketId,
      items:[{productId:weighted,saleItemId:Number(marketLine.id),qty:0.375}],
      settlementMode:'refund',refundMethod:'cash'},market.auth);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',market.auth.tenantId!).where('id','=',weighted)
      .executeTakeFirstOrThrow()).stock_qty),8);
    assert.equal(await posted(market,'5100'),16,'fractional return reverses exact sold WAC');
    assert.equal(await posted(market,'1110'),24,'fractional return refunds 4.50');

    const supplierPaymentKey=randomUUID();
    await purchases.createSupplierPayment({supplierId:market.supplierId,amount:15,
      paymentChannel:'cash',branchId:market.branchId,locationId:market.locationId},
      market.auth,supplierPaymentKey);
    const paymentsAfterFirst=await db.selectFrom('supplier_payments')
      .select(db.fn.countAll().as('n')).where('tenant_id','=',market.auth.tenantId!)
      .executeTakeFirstOrThrow();
    await purchases.createSupplierPayment({supplierId:market.supplierId,amount:15,
      paymentChannel:'cash',branchId:market.branchId,locationId:market.locationId},
      market.auth,supplierPaymentKey);
    const paymentsAfterRetry=await db.selectFrom('supplier_payments')
      .select(db.fn.countAll().as('n')).where('tenant_id','=',market.auth.tenantId!)
      .executeTakeFirstOrThrow();
    assert.equal(Number(paymentsAfterFirst.n),1);
    assert.equal(Number(paymentsAfterRetry.n),1,'repeated supplier settlement must be idempotent');
    assert.equal(await posted(market,'1110'),9,'market cash 28.50 - 4.50 refund - 15 supplier');
    await check(market,[weighted]);
    console.log('PASS sector-market PostgreSQL fractional return, supplier cash settlement and idempotent retry');

    const marketShift=await db.selectFrom('cashier_shifts').select('id')
      .where('tenant_id','=',market.auth.tenantId!).where('opened_by','=',market.auth.userId)
      .where('status','=','open').executeTakeFirstOrThrow();
    await drawer.closeCashierShift(Number(marketShift.id),
      {countedCash:9,managerPin:PASSWORD},market.auth);
    const closed=await db.selectFrom('cashier_shifts').select(['status','expected_cash','variance'])
      .where('tenant_id','=',market.auth.tenantId!).where('id','=',marketShift.id).executeTakeFirstOrThrow();
    assert.equal(closed.status,'closed');
    assert.equal(cents(closed.expected_cash),9);
    assert.equal(cents(closed.variance),0);
    console.log('PASS sector-market PostgreSQL exact shift close balances cash POS and zero variance');

    // RESTAURANT: the real sale service must deduct a costed modifier from raw
    // ingredient stock and POST that identical amount to COGS (not spoofed costPrice).
    const rest=await shop('restaurant',['restaurant']);
    const meal=await product(rest,'Bistro meal','MEAL');
    const cheese=await product(rest,'Cheese ingredient / kg','CHEESE');
    await receive(rest,meal,2,4);
    await receive(rest,cheese,2,10);
    const rSale=await checkout(rest,[{productId:meal,name:'Bistro meal',qty:1,price:60,
      unitMultiplier:1,modifiers:[{productId:cheese,name:'Cheese',qty:0.2,price:0,costPrice:500}]}],
      {tableNumber:'T-4',orderType:'dine_in',guestCount:2});
    const rId=Number((rSale.sale as {id:string}).id);
    const restaurantLine=await db.selectFrom('sale_items').select(['cost_price','modifiers'])
      .where('tenant_id','=',rest.auth.tenantId!).where('sale_id','=',rId).executeTakeFirstOrThrow();
    assert.equal(Number(restaurantLine.cost_price),6,
      'one meal WAC 4 + 0.2 ingredient WAC 10; ignore spoofed cost 500');
    const recordedMods=typeof restaurantLine.modifiers==='string'
      ? JSON.parse(restaurantLine.modifiers) : restaurantLine.modifiers;
    assert.equal(Number(recordedMods[0].costPrice),10,'persist authoritative ingredient WAC');
    const ingredient=await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',rest.auth.tenantId!).where('id','=',cheese).executeTakeFirstOrThrow();
    assert.equal(Number(ingredient.stock_qty),1.8);
    assert.equal(await posted(rest,'5100'),6);
    assert.equal(await posted(rest,'1110'),60);
    await check(rest,[meal,cheese]);
    console.log('PASS sector-restaurant PostgreSQL dine-in table, costed modifier ingredients, cash/COGS/WAC/GL');

    // RESTAURANT: a refund for a prepared dish is not a restock. Preserve the
    // consumed meal and ingredient quantities, their historic COGS and WAC,
    // while reversing the cash and revenue in one atomic transaction.
    const returnsBefore=await db.selectFrom('return_documents').select(db.fn.countAll().as('n'))
      .where('tenant_id','=',rest.auth.tenantId!).executeTakeFirstOrThrow();
    const mealBefore=await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',rest.auth.tenantId!).where('id','=',meal).executeTakeFirstOrThrow();
    const processed=await returns.createReturn({type:'sale',invoiceId:rId,
      items:[{productId:meal,qty:1}],settlementMode:'refund',refundMethod:'cash'},rest.auth);
    const refundId=Number(processed.id);
    const refundLine=await db.selectFrom('return_items')
      .select(['qty','cost_price']).where('tenant_id','=',rest.auth.tenantId!)
      .where('return_document_id','=',refundId).executeTakeFirstOrThrow();
    assert.equal(Number(refundLine.qty),1);
    assert.equal(Number(refundLine.cost_price),0,'consumed composite ingredients cannot be restocked in GL');
    const returnsAfter=await db.selectFrom('return_documents').select(db.fn.countAll().as('n'))
      .where('tenant_id','=',rest.auth.tenantId!).executeTakeFirstOrThrow();
    assert.equal(Number(returnsAfter.n),Number(returnsBefore.n)+1);
    assert.equal(await posted(rest,'5100'),6,'original ingredient and prepared meal COGS remain expensed');
    assert.equal(await posted(rest,'1110'),0,'cash payment and cash refund net to zero');
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',rest.auth.tenantId!).where('id','=',cheese).executeTakeFirstOrThrow()).stock_qty),1.8);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',rest.auth.tenantId!).where('id','=',meal).executeTakeFirstOrThrow()).stock_qty),Number(mealBefore.stock_qty));
    await check(rest,[meal,cheese]);
    await assert.rejects(returns.createReturn({type:'sale',invoiceId:rId,
      items:[{productId:meal,qty:1}],settlementMode:'refund',refundMethod:'cash'},rest.auth),
      (e:any)=>e.code==='RETURN_QTY_EXCEEDED');
    assert.equal(await posted(rest,'1110'),0,'duplicate prepared dish return does not refund twice');
    console.log('PASS sector-restaurant PostgreSQL prepared meal refund preserves consumed inventory/COGS and reverses cash once');

    // A takeaway order goes through the same costed sale, receipt and GL path.
    // This is deliberately not a claim that physical KDS stations were exercised.
    const takeaway=await checkout(rest,[{productId:meal,name:'Bistro takeaway',
      qty:1,price:60,unitMultiplier:1}],{orderType:'takeaway'});
    assert.ok(Number((takeaway.sale as {id:string}).id)>0);
    assert.equal(Number((await db.selectFrom('products').select('stock_qty')
      .where('tenant_id','=',rest.auth.tenantId!).where('id','=',meal)
      .executeTakeFirstOrThrow()).stock_qty),0);
    assert.equal(await posted(rest,'5100'),10,'takeaway meal incurs additional historic COGS');
    assert.equal(await posted(rest,'1110'),60,'takeaway cash paid and earlier meal refunded');
    await check(rest,[meal,cheese]);
    console.log('PASS sector-restaurant PostgreSQL takeaway invoice, cost and cash posting');

    // A configured non-stock menu option may not be turned into a physical
    // ingredient expense by providing an arbitrary productId in the POS body.
    const group=await db.insertInto('pos_modifier_groups').values({
      tenant_id:rest.auth.tenantId!,account_id:rest.auth.accountId!,
      name:'No stock group',name_en:null,selection_type:'single',
      is_mandatory:false,min_selections:0,max_selections:1,display_order:1,
      is_active:true,is_splittable_in_half:false,
    } as any).returning('id').executeTakeFirstOrThrow();
    const noStockOption=await db.insertInto('pos_modifier_options').values({
      tenant_id:rest.auth.tenantId!,account_id:rest.auth.accountId!,
      group_id:Number(group.id),name:'No stock note',name_en:null,
      price:0,cost_price:0,component_product_id:null,
      consumption_qty:1,unit_name:null,portion_allowed:'full',
      is_default:false,is_active:true,display_order:1,preparation_time_minutes:0,
    } as any).returning('id').executeTakeFirstOrThrow();
    await assert.rejects(checkout(rest,[{productId:meal,name:'Bistro meal',qty:1,price:60,
      unitMultiplier:1,modifiers:[{optionId:Number(noStockOption.id),productId:cheese,
        name:'spoof',qty:1,price:0,costPrice:999}]}]),
      (e:any)=>e.code==='RESTAURANT_MODIFIER_COMPONENT_MISMATCH');
    assert.equal(await posted(rest,'5100'),10);
    await check(rest,[meal,cheese]);
    console.log('PASS sector-restaurant PostgreSQL non-stock menu option cannot spoof ingredient intake');

    // Replenish the meal after takeaway: the next rejection must exercise
    // the missing INGREDIENT path, not a previously sold-out meal SKU.
    await receive(rest,meal,1,4);
    // Missing stock must roll back invoice, tender and GL together.
    const salesBefore=await db.selectFrom('sales').select(db.fn.countAll().as('n'))
      .where('tenant_id','=',rest.auth.tenantId!).executeTakeFirstOrThrow();
    await assert.rejects(checkout(rest,[{productId:meal,name:'Bistro meal',qty:1,price:60,
      unitMultiplier:1,modifiers:[{productId:cheese,name:'Cheese',qty:999,price:0,costPrice:0}]}]));
    const salesAfter=await db.selectFrom('sales').select(db.fn.countAll().as('n'))
      .where('tenant_id','=',rest.auth.tenantId!).executeTakeFirstOrThrow();
    assert.equal(Number(salesAfter.n),Number(salesBefore.n),'rejected recipe ingredient allocation is atomic');
    await check(rest,[meal,cheese]);
    console.log('PASS sector-restaurant PostgreSQL shortage rolls back POS source, tender, stock and GL');
  } finally {
    await app.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1});
