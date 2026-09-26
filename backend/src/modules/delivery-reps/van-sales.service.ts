import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { DeliveryRepsService } from './delivery-reps.service';
import { applyStockDelta } from '../../common/utils/location-stock-ledger';
import { formatDailyDocumentNumber } from '../../common/utils/document-number.util';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { calculateRepTargetMetrics, type RepTargetCalculationResult } from './rep-target.engine';

export interface VanStockItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  mainWarehouseQty?: number;
  costPrice: number;
  retailPrice: number;
  unitName?: string;
}

export interface VanTripSummary {
  id: number;
  repId: number;
  repName: string;
  vehicleId?: number;
  vehiclePlate?: string;
  vehicleModel?: string;
  shiftName?: string;
  startOdometer?: number;
  endOdometer?: number;
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
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  private get anyDb(): any {
    return this.db as any;
  }

  /**
   * Van-sales endpoints are reached via the driver's portal token, not a staff session, so there is
   * no AuthContext to post the journal under. Falls back to the tenant's earliest active user rather
   * than a bare id — journal_entries.created_by/posted_by are FK'd to users(id), and an id that
   * doesn't exist there fails the insert.
   */
  private async resolveSystemAuthContext(tenantId: string, accountId: string): Promise<AuthContext> {
    const user = await this.anyDb
      .selectFrom('users')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('id', 'asc')
      .executeTakeFirst();

    return {
      userId: user ? Number(user.id) : 0,
      sessionId: 'van-sales-system',
      username: 'van-sales-system',
      role: 'admin',
      permissions: ['accounting'],
      tenantId,
      accountId,
    };
  }

  private sortItemsByProductId<T extends { productId: number }>(items: T[]): T[] {
    // Matches the ascending-productId lock order the rest of the codebase uses (sales-write.service.ts,
    // reserveLocationStock) — applyStockDelta locks products then product_location_stock per item, so two
    // concurrent trips touching the same products in a different order can deadlock otherwise.
    return [...items].sort((a, b) => Number(a.productId) - Number(b.productId));
  }

  /**
   * Single entry point for every van stock movement.
   *
   * Van sales previously wrote `product_location_stock` with raw `qty + n` / `qty - n` statements
   * and never touched `products.stock_qty` or `stock_movements`. Two consequences:
   *  - the global stock counter drifted from the sum of location balances on every load, sale and
   *    return, so any report reading products.stock_qty showed phantom quantities;
   *  - none of it appeared in the perpetual inventory ledger, so van movements were invisible to
   *    stock audits and to cost reconstruction.
   *
   * Routing through applyStockDelta also restores the canonical lock order
   * (products before product_location_stock) that the raw writes bypassed.
   */
  private async moveVanStock(
    trx: Kysely<Database>,
    params: {
      productId: number;
      delta: number;
      locationId: number;
      branchId?: number | null;
      tenantId: string;
      accountId: string;
      userId?: number | null;
      movementType: string;
      note: string;
      referenceType: string;
      referenceId: number;
      /**
       * Every caller must pass this explicitly (see the deadlock/inflation write-up in
       * openTripAndLoad). Even a pure location-to-location transfer needs `false` on BOTH legs —
       * applyStockDelta always recomputes the global total from the true location sum, and skipping
       * that write on one leg leaves products.stock_qty stale for the other leg's own read, which
       * its "unassigned stock" reconciliation then folds into whichever location writes next.
       */
      skipGlobalUpdate: boolean;
      unitCost?: number;
    },
  ): Promise<{ scopeBefore: number; scopeAfter: number }> {
    const change = await applyStockDelta(trx, {
      productId: params.productId,
      delta: params.delta,
      branchId: params.branchId ?? null,
      locationId: params.locationId,
      tenantId: params.tenantId,
      accountId: params.accountId,
      skipGlobalUpdate: params.skipGlobalUpdate,
      errorCode: 'INSUFFICIENT_VAN_STOCK',
      errorMessage: 'رصيد غير كافٍ لتنفيذ حركة سيارة التوزيع',
    });

    await (trx as any)
      .insertInto('stock_movements')
      .values({
        tenant_id: params.tenantId,
        account_id: params.accountId,
        product_id: params.productId,
        movement_type: params.movementType,
        qty: params.delta,
        before_qty: change.scopeBefore,
        after_qty: change.scopeAfter,
        unit_cost: params.unitCost ?? 0,
        total_cost: Number((Math.abs(params.delta) * (params.unitCost ?? 0)).toFixed(4)),
        reason: params.movementType,
        note: params.note,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        branch_id: params.branchId ?? null,
        location_id: params.locationId,
        created_by: params.userId ?? null,
      })
      .execute();

    return { scopeBefore: change.scopeBefore, scopeAfter: change.scopeAfter };
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
      .where('tenant_id', '=', tenantId)
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
    targetMetrics?: RepTargetCalculationResult;
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

    // Determine source warehouse to query main stock
    let sourceWarehouseId = tripRow?.sourceWarehouseId ? Number(tripRow.sourceWarehouseId) : null;
    if (!sourceWarehouseId) {
      const defaultWh = await this.anyDb
        .selectFrom('stock_locations')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where(sql<boolean>`location_type in ('branch_stock', 'internal_warehouse')`)
        .orderBy('is_primary', 'desc')
        .executeTakeFirst();
      if (defaultWh) sourceWarehouseId = Number(defaultWh.id);
    }

    const mainStockMap = new Map<number, number>();
    if (sourceWarehouseId) {
      const sourceStocks = await this.anyDb
        .selectFrom('product_location_stock')
        .select(['product_id', sql<number>`cast(coalesce(qty, 0) as numeric)`.as('qty')])
        .where('location_id', '=', sourceWarehouseId)
        .where('tenant_id', '=', tenantId)
        .execute();
      for (const s of sourceStocks) {
        mainStockMap.set(Number(s.product_id), Number(s.qty || 0));
      }
    }

    const inventory: VanStockItem[] = invRows.map((r: any) => ({
      productId: Number(r.productId),
      productName: r.productName || `صنف #${r.productId}`,
      barcode: r.barcode || '',
      qty: Number(r.qty || 0),
      mainWarehouseQty: mainStockMap.get(Number(r.productId)) || 0,
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
          's.payment_type as paymentMethod',
          's.created_at as createdAt',
          'c.name as customerName',
        ])
        .where('s.tenant_id', '=', tenantId)
        .where(sql<boolean>`s.van_trip_id = ${Number(tripRow.id)}`)
        .orderBy('s.id', 'desc')
        .limit(20)
        .execute();
    }

    // Calculate Monthly Sales Target for this representative
    const now = new Date();
    const currentPeriodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const targetRow = await this.anyDb
      .selectFrom('delivery_rep_targets')
      .select(['target_amount'])
      .where('rep_id', '=', repId)
      .where('period_month', '=', currentPeriodMonth)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const targetAmount = Number(targetRow?.target_amount || 0);

    const salesMtdRow = await this.anyDb
      .selectFrom('sales')
      .select([sql<number>`coalesce(sum(cast(total as numeric)), 0)`.as('total_mtd')])
      .where('delivery_rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', startOfMonth)
      .where('created_at', '<=', endOfMonth)
      .executeTakeFirst();
    const actualSalesMtd = Number(salesMtdRow?.total_mtd || 0);

    const holidays = await this.anyDb
      .selectFrom('hr_holidays')
      .select(['holiday_date'])
      .where('tenant_id', '=', tenantId)
      .where('holiday_date', '>=', startOfMonth.toISOString().slice(0, 10))
      .where('holiday_date', '<=', endOfMonth.toISOString().slice(0, 10))
      .execute();
    const officialHolidays = holidays.map((h: any) => String(h.holiday_date).slice(0, 10));

    const targetMetrics = calculateRepTargetMetrics({
      targetAmount,
      actualSalesMTD: actualSalesMtd,
      currentDate: now,
      weekendDays: [5], // Friday
      officialHolidays,
    });

    if (!tripRow) {
      return {
        hasActiveTrip: false,
        vanLocation: vanLoc,
        inventory,
        customers,
        recentSales: [],
        targetMetrics,
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
      targetMetrics,
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
      for (const item of this.sortItemsByProductId(payload.items)) {
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
          const prod = await trxAny.selectFrom('products').select(['name']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();
          throw new AppError(
            `رصيد المستودع المصدر لا يكفي للصنف "${prod?.name || pid}". المتوفر: ${avail}، المطلوب: ${qty}`,
            'INSUFFICIENT_SOURCE_STOCK',
            400,
          );
        }

        // Loading a van is a location-to-location move: the company's total stock is unchanged
        // *net*, once both legs have landed. But each leg must still WRITE the real global count
        // (skipGlobalUpdate: false) rather than skip it — applyStockDelta recomputes the global
        // total from the true sum of location rows on every call, and if products.stock_qty is
        // left stale between the two legs, the second leg reads a global figure that no longer
        // matches the (already-updated) location sum. Its "unassigned stock" reconciliation then
        // mistakes that gap for real untracked inventory and folds it into whichever location
        // writes next — silently inflating the van's balance by the transferred qty on every
        // single trip. Confirmed by an actual load+sale run against a real database
        // (van-sales-field-flow.e2e.ts): with skipGlobalUpdate left at its default `true`, loading
        // 10 units left the van holding 20. Raw qty +/- writes were used here before either problem
        // existed, which never touched products.stock_qty or stock_movements at all.
        await this.moveVanStock(trx, {
          productId: pid,
          delta: -qty,
          locationId: sourceLocId,
          tenantId,
          accountId,
          userId: null,
          movementType: 'van_load_out',
          note: `تحميل سيارة توزيع - خروج من المستودع`,
          referenceType: 'van_sales_trip',
          referenceId: 0,
          skipGlobalUpdate: false,
        });

        await this.moveVanStock(trx, {
          productId: pid,
          delta: qty,
          locationId: vanLoc.id,
          tenantId,
          accountId,
          userId: null,
          movementType: 'van_load_in',
          note: `تحميل سيارة توزيع - دخول للسيارة`,
          referenceType: 'van_sales_trip',
          referenceId: 0,
          skipGlobalUpdate: false,
        });

        const prod = await trxAny.selectFrom('products').select(['retail_price']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();
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
      deliveryGpsLat?: number;
      deliveryGpsLng?: number;
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
      .leftJoin('stock_locations as van', 'van.id', 'vt.van_location_id')
      .select(['vt.id', 'vt.van_location_id', 'vt.status', 'van.branch_id as vanBranchId'])
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.rep_id', '=', repId)
      .executeTakeFirst();

    if (!trip || trip.status !== 'open') {
      throw new AppError('رحلة التوزيع المحددة مغلقة أو غير صالحة', 'INVALID_TRIP', 400);
    }

    const vanLocId = Number(trip.van_location_id);
    const branchId = trip.vanBranchId ? Number(trip.vanBranchId) : null;

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
      // O27: customerId comes from the driver's request body. Without the tenant filter this read
      // returned another tenant's customer name, and the balance update below (correctly scoped)
      // then matched nothing, writing balance_after = 0 into customer_ledger.
      const cust = await this.anyDb
        .selectFrom('customers')
        .select(['name'])
        .where('id', '=', resolvedCustomerId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      if (!cust) throw new AppError('العميل غير موجود', 'CUSTOMER_NOT_FOUND', 404);
      customerName = cust.name;
    }

    let docNo = '';
    let totalSale = 0;
    let createdSaleId = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      const saleItemRecords: any[] = [];

      for (const item of this.sortItemsByProductId(payload.items)) {
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
          const prod = await trxAny.selectFrom('products').select(['name']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();
          throw new AppError(
            `رصيد سيارة التوزيع لا يكفي للصنف "${prod?.name || pid}". المتوفر بالسيارة: ${currentQty}، المطلوب: ${qty}`,
            'INSUFFICIENT_VAN_STOCK',
            400,
          );
        }

        const prod = await trxAny.selectFrom('products').select(['name', 'cost_price', 'retail_price']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();

        // O27: name, price and cost must come from this tenant's product, never from a foreign row.
        // A van sale leaves the company for good, so unlike a load it DOES reduce global stock.
        await this.moveVanStock(trx, {
          productId: pid,
          delta: -qty,
          locationId: vanLocId,
          tenantId,
          accountId,
          userId: null,
          movementType: 'van_sale',
          note: 'بيع من سيارة التوزيع',
          referenceType: 'van_sales_trip',
          referenceId: Number(trip?.id || 0),
          skipGlobalUpdate: false,
          unitCost: Number(prod?.cost_price || 0),
        });

        const unitPrice = item.unitPrice ? Number(item.unitPrice) : Number(prod?.retail_price || 0);
        const lineTotal = unitPrice * qty;
        totalSale += lineTotal;

        saleItemRecords.push({
          product_id: pid,
          product_name: prod?.name || `صنف #${pid}`,
          qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          cost_price: Number(prod?.cost_price || 0),
        });
      }

      const systemAuth = await this.resolveSystemAuthContext(tenantId, accountId);
      const createdByUserId = systemAuth.userId > 0 ? systemAuth.userId : null;

      const tempDocNo = `TMP-VAN-${Date.now()}`;
      const insertedSale = await trxAny
        .insertInto('sales')
        .values({
          doc_no: tempDocNo,
          total: totalSale,
          subtotal: totalSale,
          discount: 0,
          tax_amount: 0,
          // Money collected in the field sits with the rep, not the till, until settleTrip — so
          // this is never marked paid here. postSale below books the full total as a receivable,
          // exactly like a cash-on-delivery order, and postVanTripSettlement clears it later.
          paid_amount: 0,
          store_credit_used: 0,
          prices_include_tax: false,
          status: 'posted',
          payment_type: payload.paymentMethod,
          payment_channel: payload.paymentMethod === 'cash' ? 'cash' : 'credit',
          collection_status: payload.paymentMethod === 'cash' ? 'prepaid_by_rep' : null,
          customer_id: resolvedCustomerId,
          branch_id: branchId,
          location_id: vanLocId,
          created_by: createdByUserId,
          delivery_rep_id: repId,
          van_trip_id: payload.tripId,
          sale_origin: 'van_sale',
          note: payload.notes || `فاتورة بيع ميداني من سيارة المندوب`,
          delivery_gps_lat: payload.deliveryGpsLat != null ? Number(payload.deliveryGpsLat) : null,
          delivery_gps_lng: payload.deliveryGpsLng != null ? Number(payload.deliveryGpsLng) : null,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      createdSaleId = Number(insertedSale.id);
      docNo = formatDailyDocumentNumber('VAN', createdSaleId);

      await trxAny
        .updateTable('sales')
        .set({ doc_no: docNo })
        .where('id', '=', createdSaleId)
        .where('tenant_id', '=', tenantId)
        .execute();

      for (const it of saleItemRecords) {
        await trxAny
          .insertInto('sale_items')
          .values({
            sale_id: createdSaleId,
            product_id: it.product_id,
            product_name: it.product_name,
            qty: it.qty,
            unit_price: it.unit_price,
            line_total: it.line_total,
            cost_price: it.cost_price,
            tenant_id: tenantId,
            account_id: accountId,
          })
          .execute();
      }

      // The journal entry doesn't stop the sale — the rep's stock and cash records must land
      // regardless of the accounting module's state. A failure here is recorded and retried by
      // AccountingRecoveryService, matching how SalesWriteService.createSale handles postSale.
      try {
        await this.accountingPosting.postSale(trx, createdSaleId, systemAuth);
        await this.accountingPosting.clearPostingFailure(trx, { tenantId, accountId }, 'sale', createdSaleId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.accountingPosting.recordPostingFailure(trx, { tenantId, accountId }, 'sale', createdSaleId, message);
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
          .where('tenant_id', '=', tenantId)
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
          .where('tenant_id', '=', tenantId)
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
      gpsLat?: number;
      gpsLng?: number;
    },
  ): Promise<{ ok: boolean; receiptNo: string; amount: number; customerName: string; newBalance: number }> {
    const amount = Number(payload.amount || 0);
    if (amount <= 0) throw new AppError('المبلغ المحصل يجب أن يكون أكبر من صفر', 'INVALID_AMOUNT', 400);

    // tripId arrives straight from the driver-portal request body, so it must be
    // proven to belong to this tenant before anything is written against it —
    // exactly as settleTrip already does.
    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .leftJoin('stock_locations as van', 'van.id', 'vt.van_location_id')
      .select(['vt.id', 'vt.van_location_id', 'van.branch_id as vanBranchId'])
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.rep_id', '=', repId)
      .executeTakeFirst();

    if (!trip) throw new AppError('رحلة التوزيع المحددة غير صالحة', 'INVALID_TRIP', 400);

    const cust = await this.anyDb.selectFrom('customers').select(['id', 'name']).where('id', '=', payload.customerId).where('tenant_id', '=', tenantId).executeTakeFirst();
    if (!cust) throw new AppError('العميل غير موجود', 'CUSTOMER_NOT_FOUND', 404);

    const branchId = trip.vanBranchId ? Number(trip.vanBranchId) : null;
    const vanLocId = trip.van_location_id ? Number(trip.van_location_id) : null;
    let receiptNo = '';
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

      const insertedPayment = await trxAny
        .insertInto('customer_payments')
        .values({
          customer_id: payload.customerId,
          amount: amount,
          note: payload.notes || `سند تحصيل نقدي ميداني بواسطة المندوب`,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      receiptNo = formatDailyDocumentNumber('COL', Number(insertedPayment.id));
      const finalNote = payload.notes || `سند تحصيل نقدي ميداني بواسطة المندوب (#${receiptNo})`;

      await trxAny
        .updateTable('customer_payments')
        .set({ note: finalNote })
        .where('id', '=', insertedPayment.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      await trxAny
        .insertInto('customer_ledger')
        .values({
          customer_id: payload.customerId,
          entry_type: 'payment',
          amount: -amount,
          balance_after: finalBalance,
          note: finalNote,
          reference_type: 'van_collection',
          reference_id: payload.tripId,
          van_trip_id: payload.tripId,
          gps_lat: payload.gpsLat != null ? Number(payload.gpsLat) : null,
          gps_lng: payload.gpsLng != null ? Number(payload.gpsLng) : null,
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
        .where('tenant_id', '=', tenantId)
        .execute();

      // The cash just collected is with the rep, not the till, until settleTrip — this only moves
      // the debt off the customer's receivable and into the same pooled bucket postVanTripSettlement
      // later clears against real cash.
      const systemAuth = await this.resolveSystemAuthContext(tenantId, accountId);
      await this.accountingPosting.postVanFieldCollection(
        trx,
        Number(insertedPayment.id),
        { amount, customerId: payload.customerId, branchId, locationId: vanLocId },
        systemAuth,
      );
    });

    return {
      ok: true,
      receiptNo,
      amount,
      customerName: cust.name,
      newBalance: finalBalance,
    };
  }

  // recordFieldReturn (the original immediate, unapproved return path) was removed: it wrote stock
  // and the customer's ledger straight away with no review step at all, while submitFieldReturn below
  // parks the same action at status='pending_approval' until a manager calls approveFieldReturn. Both
  // were reachable from the driver portal at once — POST /returns bypassed the approval gate entirely,
  // so a driver (or a stale app build) could still skip it completely. Removed rather than kept
  // alongside, since the whole point of the approval workflow is that no return posts unreviewed.

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
      .where('vt.rep_id', '=', repId)
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

        const sortedRemainingStocks: any[] = this.sortItemsByProductId(
          remainingStocks.map((r: any) => ({ ...r, productId: Number(r.product_id) })),
        );
        for (const rem of sortedRemainingStocks) {
          const qty = Number(rem.qty);
          if (qty <= 0) continue;

          // Settling a trip returns unsold goods from the van to the source warehouse: a pure
          // location-to-location move. Both legs still write the real global count
          // (skipGlobalUpdate: false) — see the matching note in openTripAndLoad for why skipping
          // it corrupts the destination balance instead of merely leaving it stale.
          await this.moveVanStock(trx, {
            productId: Number(rem.product_id),
            delta: -qty,
            locationId: Number(trip.van_location_id),
            tenantId,
            accountId,
            userId: null,
            movementType: 'van_unload_out',
            note: 'تصفية رحلة - خروج من السيارة',
            referenceType: 'van_sales_trip',
            referenceId: Number(trip.id),
            skipGlobalUpdate: false,
          });

          await this.moveVanStock(trx, {
            productId: Number(rem.product_id),
            delta: qty,
            locationId: Number(trip.source_warehouse_id),
            tenantId,
            accountId,
            userId: null,
            movementType: 'van_unload_in',
            note: 'تصفية رحلة - عودة للمستودع',
            referenceType: 'van_sales_trip',
            referenceId: Number(trip.id),
            skipGlobalUpdate: false,
          });

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
        .where('tenant_id', '=', tenantId)
        .execute();

      // Converts the pooled receivable that executeFieldSale/recordFieldCollection debited during
      // the trip into real company cash, reconciling any shortage/overage the count turned up.
      const vanLoc = await trxAny
        .selectFrom('stock_locations')
        .select(['branch_id'])
        .where('id', '=', Number(trip.van_location_id))
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const branchId = vanLoc?.branch_id ? Number(vanLoc.branch_id) : null;
      const systemAuth = await this.resolveSystemAuthContext(tenantId, accountId);
      await this.accountingPosting.postVanTripSettlement(
        trx,
        payload.tripId,
        { expectedCash, countedCash, branchId, locationId: Number(trip.van_location_id) },
        systemAuth,
      );
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
      .leftJoin('fleet_vehicles as fv', 'fv.id', 'vt.vehicle_id')
      .select([
        'vt.id',
        'vt.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        'vt.vehicle_id as vehicleId',
        sql<string>`coalesce(fv.plate_number, '')`.as('vehiclePlate'),
        sql<string>`coalesce(fv.model_name, '')`.as('vehicleModel'),
        'vt.shift_name as shiftName',
        sql<number>`cast(coalesce(vt.start_odometer, 0) as numeric)`.as('startOdometer'),
        sql<number>`cast(coalesce(vt.end_odometer, 0) as numeric)`.as('endOdometer'),
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
      vehicleId: r.vehicleId ? Number(r.vehicleId) : undefined,
      vehiclePlate: r.vehiclePlate || undefined,
      vehicleModel: r.vehicleModel || undefined,
      shiftName: r.shiftName || 'صباحي',
      startOdometer: Number(r.startOdometer || 0),
      endOdometer: r.endOdometer ? Number(r.endOdometer) : undefined,
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

  /**
   * Admin detailed audit of a single van trip, including all sales (with GPS), collections (with GPS), and returns.
   */
  async getTripDetailsForAdmin(tenantId: string, tripId: number) {
    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .leftJoin('stock_locations as src', 'src.id', 'vt.source_warehouse_id')
      .leftJoin('stock_locations as van', 'van.id', 'vt.van_location_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'vt.rep_id')
      .leftJoin('fleet_vehicles as fv', 'fv.id', 'vt.vehicle_id')
      .select([
        'vt.id',
        'vt.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        sql<string>`coalesce(dr.phone, '')`.as('repPhone'),
        'vt.vehicle_id as vehicleId',
        sql<string>`coalesce(fv.plate_number, '')`.as('vehiclePlate'),
        sql<string>`coalesce(fv.model_name, '')`.as('vehicleModel'),
        'vt.shift_name as shiftName',
        sql<number>`cast(coalesce(vt.start_odometer, 0) as numeric)`.as('startOdometer'),
        sql<number>`cast(coalesce(vt.end_odometer, 0) as numeric)`.as('endOdometer'),
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
      .where('vt.id', '=', tripId)
      .where('vt.tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!trip) {
      throw new AppError('رحلة التوزيع الميداني غير موجودة', 'TRIP_NOT_FOUND', 404);
    }

    // Sales executed in this trip
    const sales = await this.anyDb
      .selectFrom('sales as s')
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .select([
        's.id',
        's.doc_no as docNo',
        sql<number>`cast(coalesce(s.total, 0) as numeric)`.as('total'),
        sql<string>`coalesce(s.payment_type, 'cash')`.as('paymentMethod'),
        's.created_at as createdAt',
        sql<string>`coalesce(c.name, 'عميل نقدي')`.as('customerName'),
        sql<string>`coalesce(c.phone, '')`.as('customerPhone'),
        sql<number>`cast(s.delivery_gps_lat as double precision)`.as('deliveryGpsLat'),
        sql<number>`cast(s.delivery_gps_lng as double precision)`.as('deliveryGpsLng'),
      ])
      .where('s.tenant_id', '=', tenantId)
      .where(sql<boolean>`s.van_trip_id = ${tripId}`)
      .orderBy('s.id', 'desc')
      .execute();

    // Collections recorded in this trip
    const collections = await this.anyDb
      .selectFrom('customer_ledger as cl')
      .leftJoin('customers as c', 'c.id', 'cl.customer_id')
      .select([
        'cl.id',
        sql<number>`cast(abs(coalesce(cl.amount, 0)) as numeric)`.as('amount'),
        'cl.created_at as createdAt',
        sql<string>`coalesce(c.name, 'عميل')`.as('customerName'),
        'cl.note',
        sql<number>`cast(cl.gps_lat as double precision)`.as('gpsLat'),
        sql<number>`cast(cl.gps_lng as double precision)`.as('gpsLng'),
      ])
      .where('cl.tenant_id', '=', tenantId)
      .where(sql<boolean>`cl.van_trip_id = ${tripId}`)
      .where('cl.entry_type', '=', 'payment')
      .orderBy('cl.id', 'desc')
      .execute();

    // Field returns recorded in this trip
    const returns = await this.anyDb
      .selectFrom('van_field_returns as vfr')
      .leftJoin('customers as c', 'c.id', 'vfr.customer_id')
      .select([
        'vfr.id',
        'vfr.doc_no as docNo',
        sql<number>`cast(coalesce(vfr.total_amount, 0) as numeric)`.as('totalAmount'),
        'vfr.return_reason as returnReason',
        'vfr.status',
        'vfr.created_at as createdAt',
        sql<string>`coalesce(c.name, '')`.as('customerName'),
      ])
      .where('vfr.tenant_id', '=', tenantId)
      .where('vfr.trip_id', '=', tripId)
      .orderBy('vfr.id', 'desc')
      .execute();

    // Inventory currently on van location
    const vanStock = await this.anyDb
      .selectFrom('product_location_stock as pls')
      .innerJoin('products as p', 'p.id', 'pls.product_id')
      .select([
        'p.id as productId',
        'p.name as productName',
        'p.barcode as barcode',
        sql<number>`cast(coalesce(p.retail_price, 0) as numeric)`.as('retailPrice'),
        sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
      ])
      .where('pls.location_id', '=', Number(trip.vanLocationId))
      .where('pls.tenant_id', '=', tenantId)
      .where(sql<boolean>`pls.qty > 0`)
      .orderBy('p.name', 'asc')
      .execute();

    return {
      trip: {
        ...trip,
        id: Number(trip.id),
        repId: Number(trip.repId),
        startOdometer: Number(trip.startOdometer || 0),
        endOdometer: trip.endOdometer ? Number(trip.endOdometer) : undefined,
        loadedAmount: Number(trip.loadedAmount || 0),
        salesAmount: Number(trip.salesAmount || 0),
        cashCollected: Number(trip.cashCollected || 0),
        creditSales: Number(trip.creditSales || 0),
        returnsAmount: Number(trip.returnsAmount || 0),
        variance: Number(trip.variance || 0),
      },
      sales: sales.map((s: any) => ({
        ...s,
        id: Number(s.id),
        total: Number(s.total || 0),
        deliveryGpsLat: s.deliveryGpsLat != null ? Number(s.deliveryGpsLat) : undefined,
        deliveryGpsLng: s.deliveryGpsLng != null ? Number(s.deliveryGpsLng) : undefined,
      })),
      collections: collections.map((c: any) => ({
        ...c,
        id: Number(c.id),
        amount: Number(c.amount || 0),
        gpsLat: c.gpsLat != null ? Number(c.gpsLat) : undefined,
        gpsLng: c.gpsLng != null ? Number(c.gpsLng) : undefined,
      })),
      returns: returns.map((r: any) => ({
        ...r,
        id: Number(r.id),
        totalAmount: Number(r.totalAmount || 0),
      })),
      vanStock: vanStock.map((v: any) => ({
        ...v,
        productId: Number(v.productId),
        retailPrice: Number(v.retailPrice || 0),
        qty: Number(v.qty || 0),
      })),
    };
  }

  /**
   * Fleet Management: List all vehicles registered under the company fleet.
   */
  async listFleetVehicles(tenantId: string) {
    const rows = await this.anyDb
      .selectFrom('fleet_vehicles as fv')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'fv.assigned_rep_id')
      .leftJoin('stock_locations as loc', 'loc.id', 'fv.van_location_id')
      .leftJoin('branches as b', 'b.id', 'fv.branch_id')
      .select([
        'fv.id',
        'fv.plate_number as plateNumber',
        'fv.model_name as modelName',
        'fv.vehicle_type as vehicleType',
        'fv.vin_chassis as vinChassis',
        'fv.van_location_id as vanLocationId',
        sql<string>`coalesce(loc.name, '')`.as('vanLocationName'),
        'fv.branch_id as branchId',
        sql<string>`coalesce(b.name, '')`.as('branchName'),
        sql<number>`cast(coalesce(fv.current_odometer, 0) as numeric)`.as('currentOdometer'),
        'fv.fuel_type as fuelType',
        'fv.license_expires_at as licenseExpiresAt',
        'fv.status',
        'fv.assigned_rep_id as assignedRepId',
        sql<string>`coalesce(dr.name, '')`.as('assignedRepName'),
        sql<string>`coalesce(dr.phone, '')`.as('assignedRepPhone'),
        'fv.notes',
        'fv.created_at as createdAt',
      ])
      .where('fv.tenant_id', '=', tenantId)
      .orderBy('fv.id', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: Number(r.id),
      plateNumber: String(r.plateNumber || ''),
      modelName: r.modelName || '',
      vehicleType: r.vehicleType || 'van',
      vinChassis: r.vinChassis || '',
      vanLocationId: r.vanLocationId ? Number(r.vanLocationId) : null,
      vanLocationName: r.vanLocationName || '',
      branchId: r.branchId ? Number(r.branchId) : null,
      branchName: r.branchName || '',
      currentOdometer: Number(r.currentOdometer || 0),
      fuelType: r.fuelType || 'gasoline',
      licenseExpiresAt: r.licenseExpiresAt ? String(r.licenseExpiresAt) : null,
      status: r.status || 'available',
      assignedRepId: r.assignedRepId ? Number(r.assignedRepId) : null,
      assignedRepName: r.assignedRepName || '',
      assignedRepPhone: r.assignedRepPhone || '',
      notes: r.notes || '',
      createdAt: String(r.createdAt),
    }));
  }

  private static readonly FLEET_VEHICLE_STATUSES = ['available', 'assigned', 'maintenance', 'retired'] as const;

  /**
   * Single entry point for changing which rep drives a fleet vehicle — createFleetVehicle,
   * updateFleetVehicle and assignVehicleRep all route through this rather than writing
   * fleet_vehicles/delivery_representatives directly, because a naive "just set the new rep's
   * van_location_id" (the previous code) leaves three real gaps once a vehicle actually changes
   * hands mid-operation:
   *  - the OUTGOING rep's own van_location_id is never cleared, so both reps end up pointed at
   *    the same physical stock location and either one's next sale/load resolves to it;
   *  - nothing stops the same rep being "assigned" to a second vehicle while still holding the
   *    first, so the fleet list shows one rep on two cars simultaneously;
   *  - nothing stops reassigning a vehicle while it still has an open, unsettled trip — the
   *    incoming rep could then open a second trip against the same van_location the outgoing
   *    rep's trip is still using, and settling either one would sweep goods that belong to the
   *    other.
   * Must run inside a transaction with the vehicle row locked, since two concurrent reassignment
   * requests interleaving would defeat these same checks.
   */
  private async reassignVehicleRep(
    trx: Kysely<Database>,
    tenantId: string,
    vehicle: { id: number; van_location_id: number | null; assigned_rep_id: number | null; plate_number: string },
    newRepId: number | null,
  ): Promise<void> {
    const trxAny = trx as any;
    const currentRepId = vehicle.assigned_rep_id ? Number(vehicle.assigned_rep_id) : null;
    const nextRepId = newRepId ? Number(newRepId) : null;

    if (currentRepId === nextRepId) return; // no-op: same rep already assigned, or both unassigned

    if (nextRepId) {
      const elsewhere = await trxAny
        .selectFrom('fleet_vehicles')
        .select(['id', 'plate_number'])
        .where('tenant_id', '=', tenantId)
        .where('assigned_rep_id', '=', nextRepId)
        .where('id', '!=', vehicle.id)
        .executeTakeFirst();
      if (elsewhere) {
        throw new AppError(
          `هذا المندوب مخصَّص بالفعل للمركبة رقم لوحتها "${elsewhere.plate_number}" — يجب فك ارتباطه بها أولاً`,
          'REP_ALREADY_ASSIGNED_TO_VEHICLE',
          400,
        );
      }
    }

    if (vehicle.van_location_id) {
      const openTrip = await trxAny
        .selectFrom('van_sales_trips')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where('van_location_id', '=', Number(vehicle.van_location_id))
        .where('status', '=', 'open')
        .executeTakeFirst();
      if (openTrip) {
        throw new AppError(
          'هذه المركبة عليها رحلة توزيع مفتوحة لم تُصفَّ بعد — يجب تصفية الرحلة الحالية قبل تغيير السائق',
          'VEHICLE_HAS_OPEN_TRIP',
          400,
        );
      }
    }

    if (currentRepId) {
      await trxAny
        .updateTable('delivery_representatives')
        .set({ van_location_id: null, vehicle_plate: null, updated_at: sql`NOW()` })
        .where('id', '=', currentRepId)
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    await trxAny
      .updateTable('fleet_vehicles')
      .set({
        assigned_rep_id: nextRepId,
        status: nextRepId ? 'assigned' : 'available',
        updated_at: sql`NOW()`,
      })
      .where('id', '=', vehicle.id)
      .where('tenant_id', '=', tenantId)
      .execute();

    if (nextRepId) {
      await trxAny
        .updateTable('delivery_representatives')
        .set({
          is_van_rep: true,
          van_location_id: vehicle.van_location_id,
          vehicle_plate: vehicle.plate_number,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', nextRepId)
        .where('tenant_id', '=', tenantId)
        .execute();
    }
  }

  /**
   * Fleet Management: Register a new vehicle and provision its mobile warehouse location.
   */
  async createFleetVehicle(
    tenantId: string,
    accountId: string,
    payload: {
      plateNumber: string;
      modelName?: string;
      vehicleType?: string;
      vinChassis?: string;
      branchId?: number;
      currentOdometer?: number;
      fuelType?: string;
      licenseExpiresAt?: string;
      assignedRepId?: number;
      notes?: string;
    },
  ) {
    const plateNumber = String(payload.plateNumber || '').trim();
    if (!plateNumber) throw new AppError('رقم لوحة المركبة مطلوب', 'PLATE_REQUIRED', 400);

    // Date.now() alone (last 4 digits) collides under any two near-simultaneous creations; code has
    // no DB uniqueness constraint so a collision would not fail loudly, just look confusing.
    const locationCode = `VAN-CAR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const locationName = `سيارة فان (${plateNumber}) - ${payload.modelName || 'أسطول التوزيع'}`;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;

      const loc = await trxAny
        .insertInto('stock_locations')
        .values({
          name: locationName,
          code: locationCode,
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          location_type: 'van_stock',
          is_active: true,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .returning(['id', 'name'])
        .executeTakeFirstOrThrow();

      const inserted = await trxAny
        .insertInto('fleet_vehicles')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          plate_number: plateNumber,
          model_name: payload.modelName?.trim() || null,
          vehicle_type: payload.vehicleType || 'van',
          vin_chassis: payload.vinChassis?.trim() || null,
          van_location_id: Number(loc.id),
          branch_id: payload.branchId ? Number(payload.branchId) : null,
          current_odometer: Number(payload.currentOdometer || 0),
          fuel_type: payload.fuelType || 'gasoline',
          license_expires_at: payload.licenseExpiresAt || null,
          status: 'available',
          assigned_rep_id: null,
          notes: payload.notes?.trim() || null,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      if (payload.assignedRepId) {
        await this.reassignVehicleRep(
          trx,
          tenantId,
          { id: Number(inserted.id), van_location_id: Number(loc.id), assigned_rep_id: null, plate_number: plateNumber },
          Number(payload.assignedRepId),
        );
      }
    });

    return this.listFleetVehicles(tenantId);
  }

  /**
   * Fleet Management: Update vehicle profile and specifications.
   */
  async updateFleetVehicle(
    tenantId: string,
    accountId: string,
    id: number,
    payload: {
      plateNumber?: string;
      modelName?: string;
      vehicleType?: string;
      vinChassis?: string;
      branchId?: number;
      currentOdometer?: number;
      fuelType?: string;
      licenseExpiresAt?: string;
      status?: string;
      assignedRepId?: number | null;
      notes?: string;
    },
  ) {
    if (payload.status && !VanSalesService.FLEET_VEHICLE_STATUSES.includes(payload.status as any)) {
      throw new AppError(
        `حالة مركبة غير صالحة: "${payload.status}"`,
        'INVALID_VEHICLE_STATUS',
        400,
      );
    }

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;

      const existing = await trxAny
        .selectFrom('fleet_vehicles')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();
      if (!existing) throw new AppError('المركبة غير موجودة', 'NOT_FOUND', 404);

      if (payload.assignedRepId !== undefined) {
        await this.reassignVehicleRep(
          trx,
          tenantId,
          {
            id: Number(existing.id),
            van_location_id: existing.van_location_id ? Number(existing.van_location_id) : null,
            assigned_rep_id: existing.assigned_rep_id ? Number(existing.assigned_rep_id) : null,
            plate_number: payload.plateNumber?.trim() || existing.plate_number,
          },
          payload.assignedRepId ? Number(payload.assignedRepId) : null,
        );
      }

      // reassignVehicleRep already wrote assigned_rep_id/status when the assignment changed —
      // re-read so this update doesn't clobber that with the stale `existing` value.
      const afterReassign = payload.assignedRepId !== undefined
        ? await trxAny.selectFrom('fleet_vehicles').select(['assigned_rep_id', 'status']).where('id', '=', id).where('tenant_id', '=', tenantId).executeTakeFirstOrThrow()
        : { assigned_rep_id: existing.assigned_rep_id, status: existing.status };

      await trxAny
        .updateTable('fleet_vehicles')
        .set({
          plate_number: payload.plateNumber?.trim() || existing.plate_number,
          model_name: payload.modelName !== undefined ? payload.modelName?.trim() : existing.model_name,
          vehicle_type: payload.vehicleType || existing.vehicle_type,
          vin_chassis: payload.vinChassis !== undefined ? payload.vinChassis?.trim() : existing.vin_chassis,
          branch_id: payload.branchId !== undefined ? (payload.branchId ? Number(payload.branchId) : null) : existing.branch_id,
          current_odometer: payload.currentOdometer !== undefined ? Number(payload.currentOdometer) : existing.current_odometer,
          fuel_type: payload.fuelType || existing.fuel_type,
          license_expires_at: payload.licenseExpiresAt !== undefined ? payload.licenseExpiresAt : existing.license_expires_at,
          status: payload.status || afterReassign.status,
          assigned_rep_id: afterReassign.assigned_rep_id,
          notes: payload.notes !== undefined ? payload.notes?.trim() : existing.notes,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', id)
        .where('tenant_id', '=', tenantId)
        .execute();
    });

    return this.listFleetVehicles(tenantId);
  }

  /**
   * Fleet Management: Assign a representative to a vehicle for shifts.
   */
  async assignVehicleRep(tenantId: string, vehicleId: number, repId: number | null, shiftName?: string) {
    void shiftName; // recorded on the trip itself when one is opened, not on the vehicle record

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      const vehicle = await trxAny
        .selectFrom('fleet_vehicles')
        .selectAll()
        .where('id', '=', vehicleId)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();
      if (!vehicle) throw new AppError('المركبة غير موجودة', 'VEHICLE_NOT_FOUND', 404);

      await this.reassignVehicleRep(
        trx,
        tenantId,
        {
          id: Number(vehicle.id),
          van_location_id: vehicle.van_location_id ? Number(vehicle.van_location_id) : null,
          assigned_rep_id: vehicle.assigned_rep_id ? Number(vehicle.assigned_rep_id) : null,
          plate_number: vehicle.plate_number,
        },
        repId,
      );
    });

    return this.listFleetVehicles(tenantId);
  }

  /**
   * Sums qty already claimed against each sale_item by a pending or approved field return, so a
   * driver can't return more of a line than was actually sold — across separate return requests,
   * not just within one. Shared by getCustomerEligibleSales (advisory, for the UI) and
   * submitFieldReturn (enforced) so the two can never disagree on what "already returned" means.
   */
  private async computeAlreadyReturnedQtyBySaleItem(tenantId: string, saleIds: number[]): Promise<Map<number, number>> {
    const returnedQtyBySaleItem = new Map<number, number>();
    if (!saleIds.length) return returnedQtyBySaleItem;

    const existingReturns = await this.anyDb
      .selectFrom('van_field_returns')
      .select(['sale_id', 'items_json', 'status'])
      .where('sale_id', 'in', saleIds)
      .where('tenant_id', '=', tenantId)
      .where(sql<boolean>`status in ('approved', 'pending_approval')`)
      .execute();

    for (const ret of existingReturns) {
      const parsedItems = typeof ret.items_json === 'string' ? JSON.parse(ret.items_json) : (ret.items_json || []);
      for (const it of parsedItems) {
        if (it.saleItemId) {
          const sid = Number(it.saleItemId);
          returnedQtyBySaleItem.set(sid, (returnedQtyBySaleItem.get(sid) || 0) + Number(it.qty || 0));
        }
      }
    }
    return returnedQtyBySaleItem;
  }

  /**
   * Fetches recent sales for a customer with eligible items and their calculated net unit prices.
   */
  async getCustomerEligibleSales(tenantId: string, customerId: number) {
    const sales = await this.anyDb
      .selectFrom('sales as s')
      .select([
        's.id',
        's.doc_no as docNo',
        's.created_at as createdAt',
        sql<number>`cast(coalesce(s.total, 0) as numeric)`.as('total'),
        sql<number>`cast(coalesce(s.discount, 0) as numeric)`.as('discount'),
      ])
      .where('s.customer_id', '=', customerId)
      .where('s.tenant_id', '=', tenantId)
      .where('s.status', '=', 'posted')
      .orderBy('s.id', 'desc')
      .limit(20)
      .execute();

    if (!sales.length) return [];

    const saleIds = sales.map((s: any) => Number(s.id));
    const items = await this.anyDb
      .selectFrom('sale_items as si')
      .innerJoin('products as p', 'p.id', 'si.product_id')
      .select([
        'si.id as saleItemId',
        'si.sale_id as saleId',
        'si.product_id as productId',
        'si.product_name as productName',
        sql<number>`cast(coalesce(si.qty, 0) as numeric)`.as('soldQty'),
        sql<number>`cast(coalesce(si.unit_price, 0) as numeric)`.as('unitPrice'),
        sql<number>`cast(coalesce(si.line_total, 0) as numeric)`.as('lineTotal'),
      ])
      .where('si.sale_id', 'in', saleIds)
      .where('si.tenant_id', '=', tenantId)
      .execute();

    const returnedQtyBySaleItem = await this.computeAlreadyReturnedQtyBySaleItem(tenantId, saleIds);

    const itemsBySale = new Map<number, any[]>();
    for (const it of items) {
      const sid = Number(it.saleId);
      const soldQty = Number(it.soldQty || 0);
      const lineTotal = Number(it.lineTotal || 0);
      const netUnitPrice = soldQty > 0 ? Number((lineTotal / soldQty).toFixed(2)) : 0;
      const alreadyReturned = returnedQtyBySaleItem.get(Number(it.saleItemId)) || 0;
      const remainingReturnableQty = Math.max(0, soldQty - alreadyReturned);

      const entry = {
        saleItemId: Number(it.saleItemId),
        productId: Number(it.productId),
        productName: it.productName,
        soldQty,
        alreadyReturnedQty: alreadyReturned,
        remainingReturnableQty,
        unitPrice: Number(it.unitPrice || 0),
        netUnitPrice,
      };

      if (!itemsBySale.has(sid)) itemsBySale.set(sid, []);
      itemsBySale.get(sid)!.push(entry);
    }

    return sales.map((s: any) => ({
      id: Number(s.id),
      docNo: s.docNo || `#${s.id}`,
      createdAt: String(s.createdAt),
      total: Number(s.total || 0),
      discount: Number(s.discount || 0),
      items: itemsBySale.get(Number(s.id)) || [],
    }));
  }

  /**
   * Submits a field return request by the driver, recorded with 'pending_approval'
   * until approved by warehouse manager/admin.
   */
  async submitFieldReturn(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      customerId: number;
      saleId?: number | null;
      returnReason: 'damaged' | 'expired' | 'manufacturing_defect' | 'stagnant' | 'order_mismatch' | 'customer_request';
      items: {
        productId: number;
        qty: number;
        unitPrice: number;
        saleItemId?: number;
      }[];
      notes?: string;
    },
  ) {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل للمرتجع', 'EMPTY_RETURN_ITEMS', 400);
    }

    const trip = await this.anyDb
      .selectFrom('van_sales_trips')
      .select(['id', 'status', 'van_location_id'])
      .where('id', '=', payload.tripId)
      .where('tenant_id', '=', tenantId)
      .where('rep_id', '=', repId)
      .executeTakeFirst();
    if (!trip || trip.status !== 'open') {
      throw new AppError('رحلة التوزيع المحددة مغلقة أو غير صالحة', 'INVALID_TRIP', 400);
    }

    const cust = await this.anyDb
      .selectFrom('customers')
      .select(['id', 'name'])
      .where('id', '=', payload.customerId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!cust) throw new AppError('العميل غير موجود', 'CUSTOMER_NOT_FOUND', 404);

    // If saleId is linked, validate against original invoice lines
    if (payload.saleId) {
      const sale = await this.anyDb
        .selectFrom('sales')
        .select(['id', 'customer_id'])
        .where('id', '=', payload.saleId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      if (!sale) throw new AppError('الفاتورة الأصلية غير موجودة', 'SALE_NOT_FOUND', 404);
      if (Number(sale.customer_id) !== Number(payload.customerId)) {
        throw new AppError('الفاتورة المحددة لا تخص هذا العميل', 'SALE_CUSTOMER_MISMATCH', 400);
      }

      const saleLines = await this.anyDb
        .selectFrom('sale_items')
        .selectAll()
        .where('sale_id', '=', payload.saleId)
        .where('tenant_id', '=', tenantId)
        .execute();

      // Sold qty alone isn't the cap: a prior return (still pending, or already approved) against
      // the same line already claimed some of it. Same computation getCustomerEligibleSales shows
      // the driver as "remainingReturnableQty" — enforced here, not just displayed there.
      const alreadyReturnedBySaleItem = await this.computeAlreadyReturnedQtyBySaleItem(tenantId, [Number(payload.saleId)]);

      for (const item of payload.items) {
        const line = item.saleItemId
          ? saleLines.find((sl: any) => Number(sl.id) === Number(item.saleItemId))
          : saleLines.find((sl: any) => Number(sl.product_id) === Number(item.productId));
        if (!line) {
          throw new AppError(`الصنف #${item.productId} لم يتم العثور عليه في الفاتورة الأصلية`, 'ITEM_NOT_IN_SALE', 400);
        }
        const soldQty = Number(line.qty || 0);
        const lineTotal = Number(line.line_total || 0);
        const netUnit = soldQty > 0 ? Number((lineTotal / soldQty).toFixed(2)) : 0;
        if (Number(item.unitPrice) > netUnit + 0.05) {
          throw new AppError(`سعر المرتجع (${item.unitPrice}) يتجاوز السعر الصافي بعد الخصم بالفاتورة الأصلية (${netUnit})`, 'RETURN_PRICE_EXCEEDS_NET', 400);
        }

        const alreadyReturned = alreadyReturnedBySaleItem.get(Number(line.id)) || 0;
        const remainingReturnableQty = Number((soldQty - alreadyReturned).toFixed(3));
        if (Number(item.qty) > remainingReturnableQty + 0.001) {
          throw new AppError(
            `الكمية المطلوب ردها (${item.qty}) تتجاوز المتبقي القابل للرد من الفاتورة الأصلية (${Math.max(0, remainingReturnableQty)}) — بيع ${soldQty}، مرتجع سابقاً ${alreadyReturned}`,
            'RETURN_QTY_EXCEEDS_SOLD',
            400,
          );
        }
      }
    }

    let totalAmount = 0;
    for (const item of payload.items) {
      const q = Number(item.qty || 0);
      const p = Number(item.unitPrice || 0);
      if (q <= 0) continue;
      totalAmount += q * p;
    }
    totalAmount = Number(totalAmount.toFixed(2));

    const tempDocNo = `TMP-VRET-${Date.now()}`;
    const [inserted] = await this.anyDb
      .insertInto('van_field_returns')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        doc_no: tempDocNo,
        trip_id: payload.tripId,
        rep_id: repId,
        customer_id: payload.customerId,
        sale_id: payload.saleId || null,
        status: 'pending_approval',
        return_reason: payload.returnReason,
        total_amount: totalAmount,
        items_json: JSON.stringify(payload.items),
        notes: payload.notes || null,
      })
      .returning(['id'])
      .execute();

    const returnId = Number(inserted.id);
    const docNo = formatDailyDocumentNumber('VRET', returnId);
    await this.anyDb
      .updateTable('van_field_returns')
      .set({ doc_no: docNo })
      .where('id', '=', returnId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return {
      ok: true,
      returnDocNo: docNo,
      returnId,
      status: 'pending_approval',
      totalAmount,
    };
  }

  /**
   * Lists field returns for admin review and auditing.
   */
  async listFieldReturns(
    tenantId: string,
    filters: { status?: string; repId?: number; tripId?: number; customerId?: number } = {},
  ) {
    let q = this.anyDb
      .selectFrom('van_field_returns as vfr')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'vfr.rep_id')
      .leftJoin('customers as c', 'c.id', 'vfr.customer_id')
      .leftJoin('sales as s', 's.id', 'vfr.sale_id')
      .leftJoin('users as u', 'u.id', 'vfr.approved_by')
      .select([
        'vfr.id',
        'vfr.doc_no as docNo',
        'vfr.trip_id as tripId',
        'vfr.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        'vfr.customer_id as customerId',
        sql<string>`coalesce(c.name, '')`.as('customerName'),
        'vfr.sale_id as saleId',
        sql<string>`coalesce(s.doc_no, '')`.as('saleDocNo'),
        'vfr.status',
        'vfr.return_reason as returnReason',
        sql<number>`cast(vfr.total_amount as numeric)`.as('totalAmount'),
        'vfr.items_json as itemsJson',
        'vfr.notes',
        'vfr.rejection_reason as rejectionReason',
        sql<string>`coalesce(u.username, '')`.as('approvedByName'),
        'vfr.approved_at as approvedAt',
        'vfr.created_at as createdAt',
      ])
      .where('vfr.tenant_id', '=', tenantId);

    if (filters.status) q = q.where('vfr.status', '=', filters.status);
    if (filters.repId) q = q.where('vfr.rep_id', '=', filters.repId);
    if (filters.tripId) q = q.where('vfr.trip_id', '=', filters.tripId);
    if (filters.customerId) q = q.where('vfr.customer_id', '=', filters.customerId);

    const rows = await q.orderBy('vfr.id', 'desc').limit(100).execute();

    return rows.map((r: any) => ({
      ...r,
      totalAmount: Number(r.totalAmount || 0),
      items: typeof r.itemsJson === 'string' ? JSON.parse(r.itemsJson) : (r.itemsJson || []),
    }));
  }

  /**
   * Approves a pending field return, crediting the customer and moving stock.
   */
  async approveFieldReturn(tenantId: string, accountId: string, returnId: number, approvedByUserId: number) {
    return this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      const ret = await trxAny
        .selectFrom('van_field_returns')
        .selectAll()
        .where('id', '=', returnId)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();

      if (!ret) throw new AppError('طلب المرتجع غير موجود', 'RETURN_NOT_FOUND', 404);
      if (ret.status !== 'pending_approval') {
        throw new AppError(`طلب المرتجع تمت معالجته بالفعل بحالة (${ret.status})`, 'RETURN_ALREADY_PROCESSED', 400);
      }

      const trip = await trxAny
        .selectFrom('van_sales_trips as vt')
        .leftJoin('stock_locations as van', 'van.id', 'vt.van_location_id')
        .select(['vt.id', 'vt.van_location_id', 'vt.source_warehouse_id', 'van.branch_id as vanBranchId'])
        .where('vt.id', '=', ret.trip_id)
        .where('vt.tenant_id', '=', tenantId)
        .executeTakeFirst();
      if (!trip) throw new AppError('رحلة التوزيع المربوطة بالمرتجع غير صالحة', 'INVALID_TRIP', 400);

      const items = typeof ret.items_json === 'string' ? JSON.parse(ret.items_json) : (ret.items_json || []);
      const totalAmount = Number(ret.total_amount || 0);
      const isDamaged = ret.return_reason === 'damaged' || ret.return_reason === 'expired';
      const branchId = trip.vanBranchId ? Number(trip.vanBranchId) : null;

      // If damaged, check if a damaged warehouse exists, otherwise put into van or source
      let targetLocationId = Number(trip.van_location_id);
      if (isDamaged) {
        const damagedLoc = await trxAny
          .selectFrom('stock_locations')
          .select(['id'])
          .where('tenant_id', '=', tenantId)
          .where('location_type', '=', 'damaged')
          .executeTakeFirst();
        if (damagedLoc?.id) targetLocationId = Number(damagedLoc.id);
      }

      const itemsWithCost: { productId: number; qty: number; costPrice: number }[] = [];
      for (const item of items) {
        const pid = Number(item.productId);
        const qty = Number(item.qty || 0);
        const price = Number(item.unitPrice || 0);
        if (qty <= 0) continue;

        await this.moveVanStock(trx, {
          productId: pid,
          delta: qty,
          locationId: targetLocationId,
          tenantId,
          accountId,
          userId: approvedByUserId,
          movementType: 'van_sale_return',
          note: `مرتجع عميل معتمد (${ret.doc_no}) - سبب: ${ret.return_reason}`,
          referenceType: 'van_field_return',
          referenceId: returnId,
          skipGlobalUpdate: false,
          unitCost: price,
        });

        // COGS reversal needs the product's actual cost, not the (net selling) return price above.
        const prod = await trxAny.selectFrom('products').select(['cost_price']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();
        itemsWithCost.push({ productId: pid, qty, costPrice: Number(prod?.cost_price || 0) });
      }

      const updatedCust = await trxAny
        .updateTable('customers')
        .set({ balance: sql`COALESCE(balance, 0) - ${totalAmount}`, updated_at: sql`NOW()` })
        .where('id', '=', ret.customer_id)
        .where('tenant_id', '=', tenantId)
        .returning(['balance'])
        .executeTakeFirst();
      const balanceAfter = Number(updatedCust?.balance || 0);

      await trxAny
        .insertInto('customer_ledger')
        .values({
          customer_id: ret.customer_id,
          entry_type: 'return',
          amount: -totalAmount,
          balance_after: balanceAfter,
          note: `مرتجع بضاعة ميداني معتمد (#${ret.doc_no})`,
          reference_type: 'van_field_return',
          reference_id: returnId,
          van_trip_id: ret.trip_id,
          tenant_id: tenantId,
          account_id: accountId,
          created_by: approvedByUserId,
        })
        .execute();

      await trxAny
        .updateTable('van_sales_trips')
        .set({
          returns_amount: sql`returns_amount + ${totalAmount}`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', ret.trip_id)
        .where('tenant_id', '=', tenantId)
        .execute();

      await trxAny
        .updateTable('van_field_returns')
        .set({
          status: 'approved',
          approved_by: approvedByUserId,
          approved_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', returnId)
        .where('tenant_id', '=', tenantId)
        .execute();

      // Reverses the revenue/COGS the original sale posted and the receivable this same approval
      // just credited above — an approved return updates stock and the customer sub-ledger but,
      // until this call existed, never touched the general ledger at all.
      const auth: AuthContext = {
        userId: approvedByUserId,
        sessionId: 'van-field-return-approval',
        username: 'admin',
        role: 'admin',
        permissions: ['accounting'],
        tenantId,
        accountId,
      };
      await this.accountingPosting.postVanFieldReturn(
        trx,
        returnId,
        { customerId: Number(ret.customer_id), totalAmount, items: itemsWithCost, branchId, locationId: targetLocationId },
        auth,
      );

      return { ok: true, returnId, status: 'approved' };
    });
  }

  /**
   * Rejects a pending field return with a reason.
   */
  async rejectFieldReturn(tenantId: string, returnId: number, rejectionReason: string, rejectedByUserId: number) {
    const ret = await this.anyDb
      .selectFrom('van_field_returns')
      .select(['id', 'status'])
      .where('id', '=', returnId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!ret) throw new AppError('طلب المرتجع غير موجود', 'RETURN_NOT_FOUND', 404);
    if (ret.status !== 'pending_approval') {
      throw new AppError(`طلب المرتجع تمت معالجته بالفعل بحالة (${ret.status})`, 'RETURN_ALREADY_PROCESSED', 400);
    }

    await this.anyDb
      .updateTable('van_field_returns')
      .set({
        status: 'rejected',
        rejection_reason: rejectionReason || 'تم الرفض بواسطة الإدارة',
        approved_by: rejectedByUserId,
        approved_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', returnId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, returnId, status: 'rejected' };
  }

  /**
   * Sets or updates a representative's monthly sales target.
   */
  async setRepTarget(tenantId: string, accountId: string, repId: number, periodMonth: string, targetAmount: number) {
    const target = Math.max(0, Number(Number(targetAmount || 0).toFixed(2)));
    const rep = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name'])
      .where('id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!rep) throw new AppError('المندوب غير موجود', 'REP_NOT_FOUND', 404);

    const existing = await this.anyDb
      .selectFrom('delivery_rep_targets')
      .select(['id'])
      .where('rep_id', '=', repId)
      .where('period_month', '=', periodMonth)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (existing) {
      await this.anyDb
        .updateTable('delivery_rep_targets')
        .set({ target_amount: target, updated_at: sql`NOW()` })
        .where('id', '=', existing.id)
        .where('tenant_id', '=', tenantId)
        .execute();
    } else {
      await this.anyDb
        .insertInto('delivery_rep_targets')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          rep_id: repId,
          period_month: periodMonth,
          target_amount: target,
        })
        .execute();
    }

    return this.getRepTarget(tenantId, repId, periodMonth);
  }

  /**
   * Gets computed target metrics for a representative.
   */
  async getRepTarget(tenantId: string, repId: number, periodMonth?: string) {
    const now = new Date();
    const month = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = month.split('-').map(Number);
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const rep = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name', 'phone', 'vehicle_plate as vehiclePlate'])
      .where('id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!rep) throw new AppError('المندوب غير موجود', 'REP_NOT_FOUND', 404);

    const targetRow = await this.anyDb
      .selectFrom('delivery_rep_targets')
      .select(['target_amount'])
      .where('rep_id', '=', repId)
      .where('period_month', '=', month)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const targetAmount = Number(targetRow?.target_amount || 0);

    const salesMtdRow = await this.anyDb
      .selectFrom('sales')
      .select([sql<number>`coalesce(sum(cast(total as numeric)), 0)`.as('total_mtd')])
      .where('delivery_rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', startOfMonth)
      .where('created_at', '<=', endOfMonth)
      .executeTakeFirst();
    const actualSalesMtd = Number(salesMtdRow?.total_mtd || 0);

    const holidays = await this.anyDb
      .selectFrom('hr_holidays')
      .select(['holiday_date'])
      .where('tenant_id', '=', tenantId)
      .where('holiday_date', '>=', startOfMonth.toISOString().slice(0, 10))
      .where('holiday_date', '<=', endOfMonth.toISOString().slice(0, 10))
      .execute();
    const officialHolidays = holidays.map((h: any) => String(h.holiday_date).slice(0, 10));

    const metrics = calculateRepTargetMetrics({
      targetAmount,
      actualSalesMTD: actualSalesMtd,
      currentDate: now,
      weekendDays: [5], // Friday
      officialHolidays,
    });

    return {
      repId,
      repName: rep.name,
      phone: rep.phone,
      vehiclePlate: rep.vehiclePlate,
      metrics,
    };
  }

  /**
   * Lists all delivery representatives with their target metrics for a given month.
   */
  async listAllRepTargets(tenantId: string, periodMonth?: string) {
    const now = new Date();
    const month = periodMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = month.split('-').map(Number);
    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const reps = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name', 'phone', 'vehicle_plate as vehiclePlate', 'rep_type as repType'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();

    const targets = await this.anyDb
      .selectFrom('delivery_rep_targets')
      .select(['rep_id', 'target_amount'])
      .where('period_month', '=', month)
      .where('tenant_id', '=', tenantId)
      .execute();
    const targetMap = new Map<number, number>();
    for (const t of targets) targetMap.set(Number(t.rep_id), Number(t.target_amount || 0));

    const salesMtd = await this.anyDb
      .selectFrom('sales')
      .select(['delivery_rep_id', sql<number>`coalesce(sum(cast(total as numeric)), 0)`.as('total_mtd')])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', startOfMonth)
      .where('created_at', '<=', endOfMonth)
      .where(sql<boolean>`delivery_rep_id is not null`)
      .groupBy('delivery_rep_id')
      .execute();
    const salesMap = new Map<number, number>();
    for (const s of salesMtd) salesMap.set(Number(s.delivery_rep_id), Number(s.total_mtd || 0));

    const holidays = await this.anyDb
      .selectFrom('hr_holidays')
      .select(['holiday_date'])
      .where('tenant_id', '=', tenantId)
      .where('holiday_date', '>=', startOfMonth.toISOString().slice(0, 10))
      .where('holiday_date', '<=', endOfMonth.toISOString().slice(0, 10))
      .execute();
    const officialHolidays = holidays.map((h: any) => String(h.holiday_date).slice(0, 10));

    return reps.map((r: any) => {
      const repId = Number(r.id);
      const targetAmount = targetMap.get(repId) || 0;
      const actualSales = salesMap.get(repId) || 0;
      const metrics = calculateRepTargetMetrics({
        targetAmount,
        actualSalesMTD: actualSales,
        currentDate: now,
        weekendDays: [5],
        officialHolidays,
      });

      return {
        repId,
        repName: r.name,
        phone: r.phone || '',
        vehiclePlate: r.vehiclePlate || '',
        repType: r.repType || 'van_sales',
        targetAmount,
        actualSales,
        achievementRate: metrics.achievementRate,
        remainingTarget: metrics.remainingTarget,
        remainingWorkingDays: metrics.remainingWorkingDays,
        requiredDailyTarget: metrics.requiredDailyTarget,
        isTargetAchieved: metrics.isTargetAchieved,
      };
    });
  }

  /**
   * Driver submits a morning loading requisition from mobile app.
   */
  async submitLoadRequisition(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      sourceWarehouseId: number;
      items: { productId: number; qty: number }[];
      notes?: string;
    },
  ) {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل لطلب التحميل', 'EMPTY_LOAD_ITEMS', 400);
    }

    const tempDocNo = `TMP-REQ-${Date.now()}`;
    const [inserted] = await this.anyDb
      .insertInto('van_load_requisitions')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        doc_no: tempDocNo,
        rep_id: repId,
        source_warehouse_id: payload.sourceWarehouseId,
        status: 'pending',
        requested_items: JSON.stringify(payload.items),
        approved_items: JSON.stringify(payload.items),
        notes: payload.notes || null,
      })
      .returning(['id'])
      .execute();

    const requisitionId = Number(inserted.id);
    const docNo = formatDailyDocumentNumber('REQ', requisitionId);
    await this.anyDb
      .updateTable('van_load_requisitions')
      .set({ doc_no: docNo })
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, docNo, requisitionId };
  }

  /**
   * Lists load requisitions for review and auditing.
   */
  async listLoadRequisitions(tenantId: string, filters: { status?: string; repId?: number } = {}) {
    let q = this.anyDb
      .selectFrom('van_load_requisitions as vlr')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'vlr.rep_id')
      .leftJoin('stock_locations as src', 'src.id', 'vlr.source_warehouse_id')
      .leftJoin('users as u', 'u.id', 'vlr.reviewed_by')
      .select([
        'vlr.id',
        'vlr.doc_no as docNo',
        'vlr.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        sql<string>`coalesce(dr.vehicle_plate, '')`.as('vehiclePlate'),
        'vlr.source_warehouse_id as sourceWarehouseId',
        sql<string>`coalesce(src.name, '')`.as('sourceWarehouseName'),
        'vlr.status',
        'vlr.requested_items as requestedItems',
        'vlr.approved_items as approvedItems',
        'vlr.notes',
        'vlr.rejection_reason as rejectionReason',
        'vlr.trip_id as tripId',
        sql<string>`coalesce(u.username, '')`.as('reviewedByName'),
        'vlr.reviewed_at as reviewedAt',
        'vlr.created_at as createdAt',
      ])
      .where('vlr.tenant_id', '=', tenantId);

    if (filters.status) q = q.where('vlr.status', '=', filters.status);
    if (filters.repId) q = q.where('vlr.rep_id', '=', filters.repId);

    const rows = await q.orderBy('vlr.id', 'desc').limit(50).execute();

    const allProductIds = new Set<number>();
    const parsedRows = rows.map((r: any) => {
      const req = typeof r.requestedItems === 'string' ? JSON.parse(r.requestedItems) : (r.requestedItems || []);
      const app = typeof r.approvedItems === 'string' ? JSON.parse(r.approvedItems) : (r.approvedItems || req);
      req.forEach((it: any) => allProductIds.add(Number(it.productId)));
      app.forEach((it: any) => allProductIds.add(Number(it.productId)));
      return { ...r, requestedItems: req, approvedItems: app };
    });

    if (allProductIds.size > 0) {
      const pids = Array.from(allProductIds);
      const prods = await this.anyDb
        .selectFrom('products')
        .select(['id', 'name', 'barcode', 'retail_price as retailPrice'])
        .where('id', 'in', pids)
        .where('tenant_id', '=', tenantId)
        .execute();
      const prodMap = new Map<number, any>();
      prods.forEach((p: any) => prodMap.set(Number(p.id), p));

      for (const r of parsedRows) {
        const stocks = await this.anyDb
          .selectFrom('product_location_stock')
          .select(['product_id', 'qty'])
          .where('location_id', '=', r.sourceWarehouseId)
          .where('product_id', 'in', pids)
          .where('tenant_id', '=', tenantId)
          .execute();
        const stockMap = new Map<number, number>();
        stocks.forEach((s: any) => stockMap.set(Number(s.product_id), Number(s.qty || 0)));

        r.requestedItems = r.requestedItems.map((it: any) => ({
          ...it,
          productName: prodMap.get(Number(it.productId))?.name || `صنف #${it.productId}`,
          barcode: prodMap.get(Number(it.productId))?.barcode || '',
          retailPrice: Number(prodMap.get(Number(it.productId))?.retailPrice || 0),
          warehouseAvailQty: stockMap.get(Number(it.productId)) || 0,
        }));

        r.approvedItems = r.approvedItems.map((it: any) => ({
          ...it,
          productName: prodMap.get(Number(it.productId))?.name || `صنف #${it.productId}`,
          barcode: prodMap.get(Number(it.productId))?.barcode || '',
          retailPrice: Number(prodMap.get(Number(it.productId))?.retailPrice || 0),
          warehouseAvailQty: stockMap.get(Number(it.productId)) || 0,
        }));
      }
    }

    return parsedRows;
  }

  /**
   * Manager reviews and modifies approved quantities (increase / decrease).
   */
  async reviewLoadRequisition(
    tenantId: string,
    requisitionId: number,
    approvedItems: { productId: number; qty: number }[],
    notes?: string,
  ) {
    const req = await this.anyDb
      .selectFrom('van_load_requisitions')
      .select(['id', 'status'])
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!req) throw new AppError('طلب التحميل غير موجود', 'REQUISITION_NOT_FOUND', 404);
    if (req.status !== 'pending') {
      throw new AppError('لا يمكن تعديل طلب تمت معالجته بالفعل', 'ALREADY_PROCESSED', 400);
    }

    await this.anyDb
      .updateTable('van_load_requisitions')
      .set({
        approved_items: JSON.stringify(approvedItems),
        notes: notes || undefined,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, requisitionId };
  }

  /**
   * Manager approves and dispatches the requisition: automatically loads van & starts trip!
   */
  async approveAndDispatchRequisition(tenantId: string, accountId: string, requisitionId: number, reviewedByUserId: number) {
    const req = await this.anyDb
      .selectFrom('van_load_requisitions')
      .selectAll()
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!req) throw new AppError('طلب التحميل غير موجود', 'REQUISITION_NOT_FOUND', 404);
    if (req.status !== 'pending') {
      throw new AppError('طلب التحميل تمت معالجته بالفعل', 'ALREADY_PROCESSED', 400);
    }

    const itemsToLoad = typeof req.approved_items === 'string'
      ? JSON.parse(req.approved_items)
      : (req.approved_items || (typeof req.requested_items === 'string' ? JSON.parse(req.requested_items) : req.requested_items));

    // Call openTripAndLoad with the approved items
    const tripResult = await this.openTripAndLoad(
      Number(req.rep_id),
      tenantId,
      accountId,
      {
        sourceWarehouseId: Number(req.source_warehouse_id),
        items: itemsToLoad,
        notes: req.notes || `صرف وتحميل بناءً على طلب إذن تحميل #${req.doc_no}`,
      },
    );

    await this.anyDb
      .updateTable('van_load_requisitions')
      .set({
        status: 'dispatched',
        trip_id: tripResult.tripId,
        reviewed_by: reviewedByUserId,
        reviewed_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, requisitionId, tripId: tripResult.tripId, docNo: req.doc_no };
  }

  /**
   * Manager rejects a loading requisition with a stated reason.
   */
  async rejectLoadRequisition(tenantId: string, requisitionId: number, rejectionReason: string, reviewedByUserId: number) {
    const req = await this.anyDb
      .selectFrom('van_load_requisitions')
      .select(['id', 'status'])
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!req) throw new AppError('طلب التحميل غير موجود', 'REQUISITION_NOT_FOUND', 404);
    if (req.status !== 'pending') {
      throw new AppError('طلب التحميل تمت معالجته بالفعل', 'ALREADY_PROCESSED', 400);
    }

    await this.anyDb
      .updateTable('van_load_requisitions')
      .set({
        status: 'rejected',
        rejection_reason: rejectionReason || 'تم الرفض بواسطة المشرف',
        reviewed_by: reviewedByUserId,
        reviewed_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, requisitionId, status: 'rejected' };
  }
}
