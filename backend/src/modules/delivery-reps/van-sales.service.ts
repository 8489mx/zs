import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { DeliveryRepsService } from './delivery-reps.service';

export interface VanStockItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  costPrice: number;
  retailPrice: number;
  unitName?: string;
}

export interface VanTripSummary {
  id: number;
  repId: number;
  repName: string;
  vanLocationId: number;
  vanLocationName: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  status: 'open' | 'settled';
  openedAt: string;
  closedAt?: string;
  loadedAmount: number;
  salesAmount: number;
  cashCollected: number;
  creditSales: number;
  returnsAmount: number;
  variance: number;
  notes?: string;
}

@Injectable()
export class VanSalesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
    private readonly deliveryRepsService: DeliveryRepsService,
  ) {}

  private get anyDb(): any {
    return this.db as any;
  }

  /**
   * Ensures the delivery rep has an assigned mobile warehouse (stock_location) of type van_stock.
   */
  async getOrCreateVanLocation(repId: number, tenantId: string, accountId: string): Promise<{ id: number; name: string }> {
    const rep = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name', 'van_location_id', 'vehicle_plate'])
      .where('id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!rep) {
      throw new AppError('المندوب غير مسجل في النظام', 'REP_NOT_FOUND', 404);
    }

    if (rep.van_location_id) {
      const loc = await this.anyDb
        .selectFrom('stock_locations')
        .select(['id', 'name'])
        .where('id', '=', Number(rep.van_location_id))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (loc) {
        return { id: Number(loc.id), name: loc.name || `سيارة ${rep.name}` };
      }
    }

    // Get default branch
    const branch = await this.anyDb
      .selectFrom('branches')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('id', 'asc')
      .executeTakeFirst();

    const branchId = branch?.id ? Number(branch.id) : null;
    const locationName = `سيارة مندوب: ${rep.name}${rep.vehicle_plate ? ` (${rep.vehicle_plate})` : ''}`;
    const locationCode = `VAN_${rep.id}`;

    const inserted = await this.anyDb
      .insertInto('stock_locations')
      .values({
        name: locationName,
        code: locationCode,
        branch_id: branchId,
        location_type: 'van_stock',
        is_active: true,
        tenant_id: tenantId,
        account_id: accountId,
      })
      .returning(['id', 'name'])
      .executeTakeFirstOrThrow();

    await this.anyDb
      .updateTable('delivery_representatives')
      .set({
        van_location_id: Number(inserted.id),
        is_van_rep: true,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', repId)
      .execute();

    return { id: Number(inserted.id), name: inserted.name || locationName };
  }

  /**
   * Retrieves active open trip and current car inventory for a delivery representative.
   */
  async getActiveTrip(repId: number, tenantId: string, accountId: string): Promise<{
    hasActiveTrip: boolean;
    trip?: VanTripSummary;
    vanLocation?: { id: number; name: string };
    inventory: VanStockItem[];
    customers: { id: number; name: string; phone?: string; address?: string; balance: number }[];
    recentSales: any[];
  }> {
    const vanLoc = await this.getOrCreateVanLocation(repId, tenantId, accountId);

    const tripRow = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .leftJoin('stock_locations as src', 'src.id', 'vt.source_warehouse_id')
      .leftJoin('stock_locations as van', 'van.id', 'vt.van_location_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'vt.rep_id')
      .select([
        'vt.id',
        'vt.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        'vt.van_location_id as vanLocationId',
        sql<string>`coalesce(van.name, '')`.as('vanLocationName'),
        'vt.source_warehouse_id as sourceWarehouseId',
        sql<string>`coalesce(src.name, '')`.as('sourceWarehouseName'),
        'vt.status',
        'vt.opened_at as openedAt',
        'vt.closed_at as closedAt',
        sql<number>`cast(coalesce(vt.loaded_amount, 0) as numeric)`.as('loadedAmount'),
        sql<number>`cast(coalesce(vt.sales_amount, 0) as numeric)`.as('salesAmount'),
        sql<number>`cast(coalesce(vt.cash_collected, 0) as numeric)`.as('cashCollected'),
        sql<number>`cast(coalesce(vt.credit_sales, 0) as numeric)`.as('creditSales'),
        sql<number>`cast(coalesce(vt.returns_amount, 0) as numeric)`.as('returnsAmount'),
        sql<number>`cast(coalesce(vt.variance, 0) as numeric)`.as('variance'),
        'vt.notes',
      ])
      .where('vt.rep_id', '=', repId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.status', '=', 'open')
      .orderBy('vt.id', 'desc')
      .executeTakeFirst();

    // Fetch current inventory in the Van
    const invRows = await this.anyDb
      .selectFrom('product_location_stock as pls')
      .innerJoin('products as p', 'p.id', 'pls.product_id')
      .leftJoin('product_units as pu', (join: any) =>
        join.onRef('pu.product_id', '=', 'p.id').on('pu.multiplier', '>', 1),
      )
      .select([
        'p.id as productId',
        'p.name as productName',
        'p.barcode',
        sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
        sql<number>`cast(coalesce(p.cost_price, 0) as numeric)`.as('costPrice'),
        sql<number>`cast(coalesce(p.retail_price, 0) as numeric)`.as('retailPrice'),
        'pu.name as unitName',
      ])
      .where('pls.location_id', '=', vanLoc.id)
      .where('pls.tenant_id', '=', tenantId)
      .where(sql<boolean>`cast(pls.qty as numeric) > 0`)
      .orderBy('p.name', 'asc')
      .execute();

    const inventory: VanStockItem[] = invRows.map((r: any) => ({
      productId: Number(r.productId),
      productName: r.productName || `صنف #${r.productId}`,
      barcode: r.barcode || '',
      qty: Number(r.qty || 0),
      costPrice: Number(r.costPrice || 0),
      retailPrice: Number(r.retailPrice || 0),
      unitName: r.unitName || 'قطعة',
    }));

    // Fetch route customers with current debt balances
    const customerRows = await this.anyDb
      .selectFrom('customers as c')
      .select([
        'c.id',
        'c.name',
        'c.phone',
        'c.address',
        sql<number>`coalesce(c.balance, 0)`.as('balance'),
      ])
      .where('c.tenant_id', '=', tenantId)
      .where('c.is_active', '=', true)
      .orderBy('c.name', 'asc')
      .limit(100)
      .execute();

    const customers = customerRows.map((c: any) => ({
      id: Number(c.id),
      name: c.name || `عميل #${c.id}`,
      phone: c.phone || '',
      address: c.address || '',
      balance: Number(c.balance || 0),
    }));

    // Fetch recent sales on this trip
    let recentSales: any[] = [];
    if (tripRow?.id) {
      recentSales = await this.anyDb
        .selectFrom('sales as s')
        .leftJoin('customers as c', 'c.id', 's.customer_id')
        .select([
          's.id',
          's.doc_no as docNo',
          sql<number>`cast(s.total as numeric)`.as('total'),
          's.payment_method as paymentMethod',
          's.created_at as createdAt',
          'c.name as customerName',
        ])
        .where('s.tenant_id', '=', tenantId)
        .where(sql<boolean>`s.van_trip_id = ${Number(tripRow.id)}`)
        .orderBy('s.id', 'desc')
        .limit(20)
        .execute();
    }

    if (!tripRow) {
      return {
        hasActiveTrip: false,
        vanLocation: vanLoc,
        inventory,
        customers,
        recentSales: [],
      };
    }

    const trip: VanTripSummary = {
      id: Number(tripRow.id),
      repId: Number(tripRow.repId),
      repName: tripRow.repName,
      vanLocationId: Number(tripRow.vanLocationId),
      vanLocationName: tripRow.vanLocationName,
      sourceWarehouseId: Number(tripRow.sourceWarehouseId),
      sourceWarehouseName: tripRow.sourceWarehouseName,
      status: tripRow.status as any,
      openedAt: String(tripRow.openedAt),
      closedAt: tripRow.closedAt ? String(tripRow.closedAt) : undefined,
      loadedAmount: Number(tripRow.loadedAmount || 0),
      salesAmount: Number(tripRow.salesAmount || 0),
      cashCollected: Number(tripRow.cashCollected || 0),
      creditSales: Number(tripRow.creditSales || 0),
      returnsAmount: Number(tripRow.returnsAmount || 0),
      variance: Number(tripRow.variance || 0),
      notes: tripRow.notes || '',
    };

    return {
      hasActiveTrip: true,
      trip,
      vanLocation: vanLoc,
      inventory,
      customers,
      recentSales,
    };
  }

  /**
   * Opens a new morning trip and loads merchandise from the main warehouse into the car stock.
   */
  async openTripAndLoad(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      sourceWarehouseId: number;
      items: { productId: number; qty: number }[];
      notes?: string;
    },
  ): Promise<{ ok: boolean; tripId: number; totalLoadedValue: number; itemsCount: number }> {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل لتحميله بالسيارة', 'EMPTY_LOAD_ITEMS', 400);
    }

    const existingTrip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .select(['vt.id'])
      .where('vt.rep_id', '=', repId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.status', '=', 'open')
      .executeTakeFirst();

    if (existingTrip) {
      throw new AppError('توجد رحلة توزيع مفتوحة بالفعل لهذا المندوب، يرجى تصفيتها أولاً قبل فتح رحلة جديدة', 'TRIP_ALREADY_OPEN', 400);
    }

    const vanLoc = await this.getOrCreateVanLocation(repId, tenantId, accountId);
    const sourceLocId = Number(payload.sourceWarehouseId);

    if (sourceLocId === vanLoc.id) {
      throw new AppError('لا يمكن أن يكون المستودع المصدر هو نفس سيارة المندوب', 'INVALID_SOURCE_WAREHOUSE', 400);
    }

    let totalLoadedValue = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      for (const item of payload.items) {
        const pid = Number(item.productId);
        const qty = Number(item.qty || 0);
        if (qty <= 0) continue;

        const sourceStock = await trxAny
          .selectFrom('product_location_stock')
          .select(['qty'])
          .where('product_id', '=', pid)
          .where('location_id', '=', sourceLocId)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        const avail = Number(sourceStock?.qty || 0);
        if (avail < qty) {
          const prod = await trxAny.selectFrom('products').select(['name']).where('id', '=', pid).executeTakeFirst();
          throw new AppError(
            `رصيد المستودع المصدر لا يكفي للصنف "${prod?.name || pid}". المتوفر: ${avail}، المطلوب: ${qty}`,
            'INSUFFICIENT_SOURCE_STOCK',
            400,
          );
        }

        // Deduct source
        await trxAny
          .updateTable('product_location_stock')
          .set({ qty: sql`qty - ${qty}` })
          .where('product_id', '=', pid)
          .where('location_id', '=', sourceLocId)
          .where('tenant_id', '=', tenantId)
          .execute();

        // Credit van stock
        const vanStock = await trxAny
          .selectFrom('product_location_stock')
          .select(['id', 'qty'])
          .where('product_id', '=', pid)
          .where('location_id', '=', vanLoc.id)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        if (vanStock) {
          await trxAny
            .updateTable('product_location_stock')
            .set({ qty: sql`qty + ${qty}` })
            .where('id', '=', vanStock.id)
            .execute();
        } else {
          await trxAny
            .insertInto('product_location_stock')
            .values({
              product_id: pid,
              location_id: vanLoc.id,
              qty,
              tenant_id: tenantId,
              account_id: accountId,
            })
            .execute();
        }

        const prod = await trxAny.selectFrom('products').select(['retail_price']).where('id', '=', pid).executeTakeFirst();
        const price = Number(prod?.retail_price || 0);
        totalLoadedValue += price * qty;
      }

      await trxAny
        .insertInto('van_sales_trips')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          rep_id: repId,
          van_location_id: vanLoc.id,
          source_warehouse_id: sourceLocId,
          status: 'open',
          loaded_amount: Number(totalLoadedValue.toFixed(2)),
          sales_amount: 0,
          cash_collected: 0,
          credit_sales: 0,
          returns_amount: 0,
          variance: 0,
          notes: payload.notes || 'تحميل وتجهيز بضاعة الصباح لرحلة التوزيع الميداني',
          opened_at: sql`NOW()`,
        })
        .execute();
    });

    const createdTrip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .select(['vt.id'])
      .where('vt.rep_id', '=', repId)
      .where('vt.status', '=', 'open')
      .orderBy('vt.id', 'desc')
      .executeTakeFirstOrThrow();

    return {
      ok: true,
      tripId: Number(createdTrip.id),
      totalLoadedValue: Number(totalLoadedValue.toFixed(2)),
      itemsCount: payload.items.length,
    };
  }

  /**
   * Executes a direct field sale in the street from van stock (Cash or Credit).
   */
  async executeFieldSale(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      customerId?: number;
      customerName?: string;
      customerPhone?: string;
      paymentMethod: 'cash' | 'credit';
      items: { productId: number; qty: number; unitPrice?: number }[];
      notes?: string;
    },
  ): Promise<{
    ok: boolean;
    saleId: number;
    docNo: string;
    total: number;
    paymentMethod: 'cash' | 'credit';
    customerName: string;
    itemsCount: number;
  }> {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل لإصدار الفاتورة', 'EMPTY_SALE_ITEMS', 400);
    }

    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .select(['vt.id', 'vt.van_location_id', 'vt.status'])
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!trip || trip.status !== 'open') {
      throw new AppError('رحلة التوزيع المحددة مغلقة أو غير صالحة', 'INVALID_TRIP', 400);
    }

    const vanLocId = Number(trip.van_location_id);

    let resolvedCustomerId: number | null = payload.customerId ? Number(payload.customerId) : null;
    let customerName = payload.customerName || 'عميل نقدي ميداني';

    if (payload.paymentMethod === 'credit' && !resolvedCustomerId) {
      if (!payload.customerName) {
        throw new AppError('البيع الآجل يتطلب تحديد أو إدخال اسم العميل / المحل', 'CREDIT_REQUIRES_CUSTOMER', 400);
      }
      const [newCust] = await this.anyDb
        .insertInto('customers')
        .values({
          name: payload.customerName,
          phone: payload.customerPhone || null,
          is_active: true,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .returning(['id', 'name'])
        .execute();
      resolvedCustomerId = Number(newCust.id);
      customerName = newCust.name;
    } else if (resolvedCustomerId) {
      const cust = await this.anyDb.selectFrom('customers').select(['name']).where('id', '=', resolvedCustomerId).executeTakeFirst();
      if (cust) customerName = cust.name;
    }

    const docNo = `VAN-${Date.now().toString().slice(-6)}`;
    let totalSale = 0;
    let createdSaleId = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      const saleItemRecords: any[] = [];

      for (const item of payload.items) {
        const pid = Number(item.productId);
        const qty = Number(item.qty || 0);
        if (qty <= 0) continue;

        const vanStock = await trxAny
          .selectFrom('product_location_stock')
          .select(['id', 'qty'])
          .where('product_id', '=', pid)
          .where('location_id', '=', vanLocId)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        const currentQty = Number(vanStock?.qty || 0);
        if (currentQty < qty) {
          const prod = await trxAny.selectFrom('products').select(['name']).where('id', '=', pid).executeTakeFirst();
          throw new AppError(
            `رصيد سيارة التوزيع لا يكفي للصنف "${prod?.name || pid}". المتوفر بالسيارة: ${currentQty}، المطلوب: ${qty}`,
            'INSUFFICIENT_VAN_STOCK',
            400,
          );
        }

        await trxAny
          .updateTable('product_location_stock')
          .set({ qty: sql`qty - ${qty}` })
          .where('id', '=', vanStock.id)
          .execute();

        const prod = await trxAny.selectFrom('products').select(['name', 'cost_price', 'retail_price']).where('id', '=', pid).executeTakeFirst();
        const unitPrice = item.unitPrice ? Number(item.unitPrice) : Number(prod?.retail_price || 0);
        const lineTotal = unitPrice * qty;
        totalSale += lineTotal;

        saleItemRecords.push({
          product_id: pid,
          qty,
          unit_price: unitPrice,
          total_price: lineTotal,
          cost_price: Number(prod?.cost_price || 0),
        });
      }

      const insertedSale = await trxAny
        .insertInto('sales')
        .values({
          doc_no: docNo,
          total: totalSale,
          subtotal: totalSale,
          status: 'completed',
          payment_method: payload.paymentMethod,
          customer_id: resolvedCustomerId,
          location_id: vanLocId,
          delivery_rep_id: repId,
          van_trip_id: payload.tripId,
          sale_origin: 'van_sale',
          notes: payload.notes || `فاتورة بيع ميداني من سيارة المندوب`,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      createdSaleId = Number(insertedSale.id);

      for (const it of saleItemRecords) {
        await trxAny
          .insertInto('sale_items')
          .values({
            sale_id: createdSaleId,
            product_id: it.product_id,
            qty: it.qty,
            unit_price: it.unit_price,
            total_price: it.total_price,
            cost_price: it.cost_price,
            tenant_id: tenantId,
            account_id: accountId,
          })
          .execute();
      }

      if (payload.paymentMethod === 'cash') {
        await trxAny
          .updateTable('van_sales_trips')
          .set({
            sales_amount: sql`sales_amount + ${totalSale}`,
            cash_collected: sql`cash_collected + ${totalSale}`,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', payload.tripId)
          .execute();
      } else {
        await trxAny
          .updateTable('van_sales_trips')
          .set({
            sales_amount: sql`sales_amount + ${totalSale}`,
            credit_sales: sql`credit_sales + ${totalSale}`,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', payload.tripId)
          .execute();

        if (resolvedCustomerId) {
          const updatedCust = await trxAny
            .updateTable('customers')
            .set({ balance: sql`COALESCE(balance, 0) + ${totalSale}`, updated_at: sql`NOW()` })
            .where('id', '=', resolvedCustomerId)
            .where('tenant_id', '=', tenantId)
            .returning(['balance'])
            .executeTakeFirst();
          const balanceAfter = Number(updatedCust?.balance || 0);

          await trxAny
            .insertInto('customer_ledger')
            .values({
              customer_id: resolvedCustomerId,
              entry_type: 'sale_credit',
              amount: totalSale,
              balance_after: balanceAfter,
              note: `فاتورة بيع آجل ميدانية من المندوب (#${docNo})`,
              reference_type: 'sale',
              reference_id: createdSaleId,
              van_trip_id: payload.tripId,
              tenant_id: tenantId,
              account_id: accountId,
            })
            .execute();
        }
      }
    });

    return {
      ok: true,
      saleId: createdSaleId,
      docNo,
      total: Number(totalSale.toFixed(2)),
      paymentMethod: payload.paymentMethod,
      customerName,
      itemsCount: payload.items.length,
    };
  }

  /**
   * Records a field debt collection from a customer in the street.
   */
  async recordFieldCollection(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      customerId: number;
      amount: number;
      notes?: string;
    },
  ): Promise<{ ok: boolean; receiptNo: string; amount: number; customerName: string; newBalance: number }> {
    const amount = Number(payload.amount || 0);
    if (amount <= 0) throw new AppError('المبلغ المحصل يجب أن يكون أكبر من صفر', 'INVALID_AMOUNT', 400);

    const cust = await this.anyDb.selectFrom('customers').select(['id', 'name']).where('id', '=', payload.customerId).where('tenant_id', '=', tenantId).executeTakeFirst();
    if (!cust) throw new AppError('العميل غير موجود', 'CUSTOMER_NOT_FOUND', 404);

    const receiptNo = `COL-${Date.now().toString().slice(-6)}`;
    let finalBalance = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;

      const updatedCust = await trxAny
        .updateTable('customers')
        .set({ balance: sql`COALESCE(balance, 0) - ${amount}`, updated_at: sql`NOW()` })
        .where('id', '=', payload.customerId)
        .where('tenant_id', '=', tenantId)
        .returning(['balance'])
        .executeTakeFirst();
      finalBalance = Number(updatedCust?.balance || 0);

      await trxAny
        .insertInto('customer_payments')
        .values({
          customer_id: payload.customerId,
          amount: amount,
          note: payload.notes || `سند تحصيل نقدي ميداني بواسطة المندوب (#${receiptNo})`,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .execute();

      await trxAny
        .insertInto('customer_ledger')
        .values({
          customer_id: payload.customerId,
          entry_type: 'payment',
          amount: -amount,
          balance_after: finalBalance,
          note: payload.notes || `سند تحصيل نقدي ميداني بواسطة المندوب (#${receiptNo})`,
          reference_type: 'van_collection',
          reference_id: payload.tripId,
          van_trip_id: payload.tripId,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .execute();

      await trxAny
        .updateTable('van_sales_trips')
        .set({
          cash_collected: sql`cash_collected + ${amount}`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', payload.tripId)
        .execute();
    });

    return {
      ok: true,
      receiptNo,
      amount,
      customerName: cust.name,
      newBalance: finalBalance,
    };
  }

  /**
   * Records a field return from a customer, adding items back to the van stock and crediting customer.
   */
  async recordFieldReturn(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      customerId: number;
      items: { productId: number; qty: number; unitPrice: number }[];
      notes?: string;
    },
  ): Promise<{ ok: boolean; returnDocNo: string; totalReturned: number }> {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل للمرتجع', 'EMPTY_RETURN_ITEMS', 400);
    }

    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .select(['vt.id', 'vt.van_location_id'])
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .executeTakeFirstOrThrow();

    const vanLocId = Number(trip.van_location_id);
    const returnDocNo = `RET-${Date.now().toString().slice(-6)}`;
    let totalReturned = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      for (const item of payload.items) {
        const pid = Number(item.productId);
        const qty = Number(item.qty || 0);
        const price = Number(item.unitPrice || 0);
        if (qty <= 0) continue;

        totalReturned += price * qty;

        await trxAny
          .updateTable('product_location_stock')
          .set({ qty: sql`qty + ${qty}` })
          .where('product_id', '=', pid)
          .where('location_id', '=', vanLocId)
          .where('tenant_id', '=', tenantId)
          .execute();
      }

      const updatedCust = await trxAny
        .updateTable('customers')
        .set({ balance: sql`COALESCE(balance, 0) - ${totalReturned}`, updated_at: sql`NOW()` })
        .where('id', '=', payload.customerId)
        .where('tenant_id', '=', tenantId)
        .returning(['balance'])
        .executeTakeFirst();
      const balanceAfter = Number(updatedCust?.balance || 0);

      await trxAny
        .insertInto('customer_ledger')
        .values({
          customer_id: payload.customerId,
          entry_type: 'return',
          amount: -totalReturned,
          balance_after: balanceAfter,
          note: payload.notes || `مرتجع بضاعة ميداني بواسطة المندوب (#${returnDocNo})`,
          reference_type: 'van_return',
          reference_id: payload.tripId,
          van_trip_id: payload.tripId,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .execute();

      await trxAny
        .updateTable('van_sales_trips')
        .set({
          returns_amount: sql`returns_amount + ${totalReturned}`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', payload.tripId)
        .execute();
    });

    return {
      ok: true,
      returnDocNo,
      totalReturned: Number(totalReturned.toFixed(2)),
    };
  }

  /**
   * End-of-Day Van Settlement: audits cash collected, reconciles variance, unloads remaining stock.
   */
  async settleTrip(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      countedCash: number;
      unloadRemainingToWarehouse: boolean;
      notes?: string;
    },
  ): Promise<{
    ok: boolean;
    tripId: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
    unloadedItemsCount: number;
    status: 'settled';
  }> {
    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .selectAll()
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.status', '=', 'open')
      .executeTakeFirst();

    if (!trip) {
      throw new AppError('الرحلة غير موجودة أو تم تصفيتها بالفعل', 'TRIP_NOT_FOUND', 404);
    }

    const expectedCash = Number(trip.cash_collected || 0);
    const countedCash = Number(payload.countedCash || 0);
    const variance = Number((countedCash - expectedCash).toFixed(2));
    let unloadedItemsCount = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      if (payload.unloadRemainingToWarehouse) {
        const remainingStocks = await trxAny
          .selectFrom('product_location_stock')
          .select(['id', 'product_id', 'qty'])
          .where('location_id', '=', Number(trip.van_location_id))
          .where('tenant_id', '=', tenantId)
          .where(sql<boolean>`cast(qty as numeric) > 0`)
          .forUpdate()
          .execute();

        for (const rem of remainingStocks) {
          const qty = Number(rem.qty);
          if (qty <= 0) continue;

          await trxAny
            .updateTable('product_location_stock')
            .set({ qty: 0 })
            .where('id', '=', rem.id)
            .execute();

          await trxAny
            .updateTable('product_location_stock')
            .set({ qty: sql`qty + ${qty}` })
            .where('product_id', '=', rem.product_id)
            .where('location_id', '=', Number(trip.source_warehouse_id))
            .where('tenant_id', '=', tenantId)
            .execute();

          unloadedItemsCount++;
        }
      }

      await trxAny
        .updateTable('van_sales_trips')
        .set({
          status: 'settled',
          closed_at: sql`NOW()`,
          variance,
          notes: payload.notes || `تم إغلاق وتصفية رحلة التوزيع بنجاح. عجز/زيادة الكاش: ${variance}`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', payload.tripId)
        .execute();
    });

    return {
      ok: true,
      tripId: payload.tripId,
      expectedCash,
      countedCash,
      variance,
      unloadedItemsCount,
      status: 'settled',
    };
  }

  /**
   * Admin audit list of all van trips.
   */
  async listTripsForAdmin(
    tenantId: string,
    filters?: { repId?: number; status?: string; dateFrom?: string; dateTo?: string },
  ): Promise<VanTripSummary[]> {
    let query = this.anyDb
      .selectFrom('van_sales_trips as vt')
      .leftJoin('stock_locations as src', 'src.id', 'vt.source_warehouse_id')
      .leftJoin('stock_locations as van', 'van.id', 'vt.van_location_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'vt.rep_id')
      .select([
        'vt.id',
        'vt.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        'vt.van_location_id as vanLocationId',
        sql<string>`coalesce(van.name, '')`.as('vanLocationName'),
        'vt.source_warehouse_id as sourceWarehouseId',
        sql<string>`coalesce(src.name, '')`.as('sourceWarehouseName'),
        'vt.status',
        'vt.opened_at as openedAt',
        'vt.closed_at as closedAt',
        sql<number>`cast(coalesce(vt.loaded_amount, 0) as numeric)`.as('loadedAmount'),
        sql<number>`cast(coalesce(vt.sales_amount, 0) as numeric)`.as('salesAmount'),
        sql<number>`cast(coalesce(vt.cash_collected, 0) as numeric)`.as('cashCollected'),
        sql<number>`cast(coalesce(vt.credit_sales, 0) as numeric)`.as('creditSales'),
        sql<number>`cast(coalesce(vt.returns_amount, 0) as numeric)`.as('returnsAmount'),
        sql<number>`cast(coalesce(vt.variance, 0) as numeric)`.as('variance'),
        'vt.notes',
      ])
      .where('vt.tenant_id', '=', tenantId);

    if (filters?.repId) {
      query = query.where('vt.rep_id', '=', Number(filters.repId));
    }
    if (filters?.status) {
      query = query.where('vt.status', '=', filters.status);
    }
    if (filters?.dateFrom) {
      query = query.where('vt.opened_at', '>=', new Date(filters.dateFrom));
    }
    if (filters?.dateTo) {
      query = query.where('vt.opened_at', '<=', new Date(filters.dateTo));
    }

    const rows = await query.orderBy('vt.id', 'desc').limit(50).execute();

    return rows.map((r: any) => ({
      id: Number(r.id),
      repId: Number(r.repId),
      repName: r.repName,
      vanLocationId: Number(r.vanLocationId),
      vanLocationName: r.vanLocationName,
      sourceWarehouseId: Number(r.sourceWarehouseId),
      sourceWarehouseName: r.sourceWarehouseName,
      status: r.status as any,
      openedAt: String(r.openedAt),
      closedAt: r.closedAt ? String(r.closedAt) : undefined,
      loadedAmount: Number(r.loadedAmount || 0),
      salesAmount: Number(r.salesAmount || 0),
      cashCollected: Number(r.cashCollected || 0),
      creditSales: Number(r.creditSales || 0),
      returnsAmount: Number(r.returnsAmount || 0),
      variance: Number(r.variance || 0),
      notes: r.notes || '',
    }));
  }
}
