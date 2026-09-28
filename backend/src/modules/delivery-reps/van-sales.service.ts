import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { DeliveryRepsService } from './delivery-reps.service';
import { applyStockDelta } from '../../common/utils/location-stock-ledger';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../common/utils/document-number.util';
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
    assignedVehicle?: {
      id: number;
      plateNumber: string;
      modelName?: string;
      vehicleType: string;
      currentOdometer: number;
      fuelType: string;
      licenseExpiresAt?: string;
      status: string;
    } | null;
    vanLocation?: { id: number; name: string };
    inventory: VanStockItem[];
    customers: { id: number; name: string; phone?: string; address?: string; balance: number }[];
    recentSales: any[];
    targetMetrics?: RepTargetCalculationResult;
  }> {
    const vanLoc = await this.getOrCreateVanLocation(repId, tenantId, accountId);

    const assignedVehicleRow = await this.anyDb
      .selectFrom('fleet_vehicles')
      .select([
        'id',
        'plate_number as plateNumber',
        'model_name as modelName',
        'vehicle_type as vehicleType',
        sql<number>`cast(coalesce(current_odometer, 0) as numeric)`.as('currentOdometer'),
        'fuel_type as fuelType',
        'license_expires_at as licenseExpiresAt',
        'status',
      ])
      .where('tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('assigned_rep_id', '=', repId),
          eb('van_location_id', '=', vanLoc.id),
        ])
      )
      .orderBy('id', 'desc')
      .executeTakeFirst();

    const assignedVehicle = assignedVehicleRow
      ? {
          id: Number(assignedVehicleRow.id),
          plateNumber: String(assignedVehicleRow.plateNumber || ''),
          modelName: assignedVehicleRow.modelName || '',
          vehicleType: assignedVehicleRow.vehicleType || 'van',
          currentOdometer: Number(assignedVehicleRow.currentOdometer || 0),
          fuelType: assignedVehicleRow.fuelType || 'petrol_92',
          licenseExpiresAt: assignedVehicleRow.licenseExpiresAt ? String(assignedVehicleRow.licenseExpiresAt) : undefined,
          status: String(assignedVehicleRow.status || 'assigned'),
        }
      : null;

    const tripRow = await this.anyDb
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
        sql<number>`cast(coalesce(vt.start_odometer, fv.current_odometer, 0) as numeric)`.as('startOdometer'),
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
        .where('is_active', '=', true)
        .orderBy('id', 'asc')
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
        'c.metadata',
        sql<number>`cast(coalesce(c.credit_limit, 0) as numeric)`.as('creditLimit'),
        sql<number>`coalesce(c.balance, 0)`.as('balance'),
      ])
      .where('c.tenant_id', '=', tenantId)
      .where('c.is_active', '=', true)
      .orderBy('c.name', 'asc')
      .limit(2500)
      .execute();

    const customers = customerRows.map((c: any) => {
      let meta: any = {};
      if (typeof c.metadata === 'string') {
        try { meta = JSON.parse(c.metadata); } catch { meta = {}; }
      } else if (c.metadata && typeof c.metadata === 'object') {
        meta = c.metadata;
      }
      return {
        id: Number(c.id),
        name: c.name || `عميل #${c.id}`,
        phone: c.phone || '',
        address: c.address || '',
        balance: Number(c.balance || 0),
        creditLimit: Number(c.creditLimit || 0),
        customerCode: meta.customer_code || meta.code || String(c.id),
        route: meta.route || '',
        locationUrl: meta.location_url || (meta.gps_lat && meta.gps_lng ? `https://maps.google.com/?q=${meta.gps_lat},${meta.gps_lng}` : ''),
      };
    });

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
      .select(['target_amount', 'collection_target', 'visits_target'])
      .where('rep_id', '=', repId)
      .where('period_month', '=', currentPeriodMonth)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const targetAmount = Number(targetRow?.target_amount || 0);
    const collectionTarget = targetRow?.collection_target !== null && targetRow?.collection_target !== undefined
      ? Number(targetRow.collection_target)
      : null;
    const visitsTarget = targetRow?.visits_target !== null && targetRow?.visits_target !== undefined
      ? Number(targetRow.visits_target)
      : null;

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

    const collectionsMtdRow = await this.anyDb
      .selectFrom('van_sales_trips')
      .select([sql<number>`coalesce(sum(cast(cash_collected as numeric)), 0)`.as('total_collected')])
      .where('rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('opened_at', '>=', startOfMonth)
      .where('opened_at', '<=', endOfMonth)
      .executeTakeFirst();
    const actualCollectionsMtd = Number(collectionsMtdRow?.total_collected || 0);

    const visitsMtdRow = await this.anyDb
      .selectFrom('van_field_visits')
      .select([sql<number>`count(*)`.as('total_visits')])
      .where('rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('visited_at', '>=', startOfMonth)
      .where('visited_at', '<=', endOfMonth)
      .executeTakeFirst();
    const actualVisitsMtd = Number(visitsMtdRow?.total_visits || 0);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayVisitsRow = await this.anyDb
      .selectFrom('van_field_visits')
      .select([sql<number>`count(*)`.as('today_visits')])
      .where('rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('visited_at', '>=', startOfToday)
      .where('visited_at', '<=', endOfToday)
      .executeTakeFirst();
    const todayVisits = Number(todayVisitsRow?.today_visits || 0);

    const officialHolidays = await this.getMonthlyOfficialHolidayDates(tenantId, startOfMonth, endOfMonth);

    const baseMetrics = calculateRepTargetMetrics({
      targetAmount,
      actualSalesMTD: actualSalesMtd,
      collectionTarget,
      actualCollectionsMTD: actualCollectionsMtd,
      visitsTarget,
      actualVisitsMTD: actualVisitsMtd,
      currentDate: now,
      weekendDays: [5], // Friday
      officialHolidays,
    });

    const todaySales = Number(tripRow?.salesAmount || 0);
    const todayCollections = Number(tripRow?.cashCollected || 0);

    const targetMetrics = {
      ...baseMetrics,
      todaySales,
      todayCollections,
      todayVisits,
    };

    if (!tripRow) {
      return {
        hasActiveTrip: false,
        assignedVehicle,
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
      vehicleId: tripRow.vehicleId ? Number(tripRow.vehicleId) : (assignedVehicle ? assignedVehicle.id : undefined),
      vehiclePlate: tripRow.vehiclePlate || assignedVehicle?.plateNumber,
      vehicleModel: tripRow.vehicleModel || assignedVehicle?.modelName,
      startOdometer: Number(tripRow.startOdometer || assignedVehicle?.currentOdometer || 0),
      endOdometer: Number(tripRow.endOdometer || 0),
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
      assignedVehicle,
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
      sourceWarehouseId?: number;
      items?: { productId: number; qty: number }[];
      notes?: string;
    },
  ): Promise<{ ok: boolean; tripId: number; totalLoadedValue: number; itemsCount: number }> {
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
    let sourceLocId = payload.sourceWarehouseId ? Number(payload.sourceWarehouseId) : null;
    if (!sourceLocId) {
      const defaultWh = await this.anyDb
        .selectFrom('stock_locations')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where(sql<boolean>`location_type in ('branch_stock', 'internal_warehouse')`)
        .where('is_active', '=', true)
        .orderBy('id', 'asc')
        .executeTakeFirst();
      sourceLocId = defaultWh ? Number(defaultWh.id) : 0;
    }

    // Lookup rep's assigned vehicle for starting odometer & plate
    const assignedVehicle = await this.anyDb
      .selectFrom('fleet_vehicles')
      .select(['id', 'current_odometer'])
      .where('tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('assigned_rep_id', '=', repId),
          eb('van_location_id', '=', vanLoc.id),
        ])
      )
      .orderBy('id', 'desc')
      .executeTakeFirst();

    let totalLoadedValue = 0;
    const hasItemsToLoad = Boolean(payload.items && payload.items.length > 0);

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;

      if (hasItemsToLoad) {
        if (sourceLocId === vanLoc.id) {
          throw new AppError('لا يمكن أن يكون المستودع المصدر هو نفس سيارة المندوب', 'INVALID_SOURCE_WAREHOUSE', 400);
        }

        for (const item of this.sortItemsByProductId(payload.items!)) {
          const pid = Number(item.productId);
          const qty = Number(item.qty || 0);
          if (qty <= 0) continue;

          const effectiveLocId = Number((item as any).sourceWarehouseId || sourceLocId);
          if (effectiveLocId === vanLoc.id) {
            throw new AppError('لا يمكن أن يكون المستودع المصدر هو نفس سيارة المندوب', 'INVALID_SOURCE_WAREHOUSE', 400);
          }

          const sourceStock = await trxAny
            .selectFrom('product_location_stock')
            .select(['qty'])
            .where('product_id', '=', pid)
            .where('location_id', '=', effectiveLocId)
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

          // Loading a van is a location-to-location move
          await this.moveVanStock(trx, {
            productId: pid,
            delta: -qty,
            locationId: effectiveLocId,
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
      } else {
        // Start trip with existing stock already in van
        const existingStock = await trxAny
          .selectFrom('product_location_stock as pls')
          .innerJoin('products as p', 'p.id', 'pls.product_id')
          .select([
            sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
            sql<number>`cast(coalesce(p.retail_price, 0) as numeric)`.as('retailPrice'),
          ])
          .where('pls.location_id', '=', vanLoc.id)
          .where('pls.tenant_id', '=', tenantId)
          .where(sql<boolean>`cast(pls.qty as numeric) > 0`)
          .execute();

        for (const s of existingStock) {
          totalLoadedValue += Number(s.qty || 0) * Number(s.retailPrice || 0);
        }
      }

      await trxAny
        .insertInto('van_sales_trips')
        .values({
          tenant_id: tenantId,
          account_id: accountId,
          rep_id: repId,
          vehicle_id: assignedVehicle?.id ? Number(assignedVehicle.id) : null,
          start_odometer: assignedVehicle?.current_odometer ? Number(assignedVehicle.current_odometer) : null,
          van_location_id: vanLoc.id,
          source_warehouse_id: sourceLocId || vanLoc.id,
          status: 'open',
          loaded_amount: Number(totalLoadedValue.toFixed(2)),
          sales_amount: 0,
          cash_collected: 0,
          credit_sales: 0,
          returns_amount: 0,
          variance: 0,
          notes: payload.notes || (hasItemsToLoad ? 'تحميل وتجهيز بضاعة الصباح لرحلة التوزيع الميداني' : 'بدء رحلة التوزيع بالبضاعة المتوفرة بالسيارة'),
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
      itemsCount: payload.items?.length || 0,
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
      paymentMethod: 'cash' | 'credit' | 'card' | 'split';
      paidAmount?: number;
      items: { productId: number; qty: number; unitPrice?: number }[];
      notes?: string;
      deliveryGpsLat?: number;
      deliveryGpsLng?: number;
      deliveryProofPhoto?: string;
      packagingBreakdown?: { cartonsCount?: number; piecesCount?: number; itemsCount?: number };
    },
  ): Promise<{
    ok: boolean;
    saleId: number;
    docNo: string;
    total: number;
    paymentMethod: string;
    customerName: string;
    itemsCount: number;
    cashPaid?: number;
    creditOwed?: number;
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

    const isCreditOrSplit = payload.paymentMethod === 'credit' || payload.paymentMethod === 'split';
    if (isCreditOrSplit && !resolvedCustomerId && !payload.customerName) {
      throw new AppError('البيع الآجل أو المجزأ يتطلب تحديد أو إدخال اسم العميل / المحل', 'CREDIT_REQUIRES_CUSTOMER', 400);
    }

    if (!resolvedCustomerId && payload.customerName && payload.customerName.trim() && payload.customerName !== 'عميل نقدي ميداني') {
      const existing = await this.anyDb
        .selectFrom('customers')
        .select(['id', 'name'])
        .where('name', '=', payload.customerName.trim())
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      if (existing) {
        resolvedCustomerId = Number(existing.id);
        customerName = existing.name;
      } else {
        const [newCust] = await this.anyDb
          .insertInto('customers')
          .values({
            name: payload.customerName.trim(),
            phone: payload.customerPhone || null,
            is_active: true,
            tenant_id: tenantId,
            account_id: accountId,
          })
          .returning(['id', 'name'])
          .execute();
        resolvedCustomerId = Number(newCust.id);
        customerName = newCust.name;
      }
    } else if (resolvedCustomerId) {
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
    let cashPaid = 0;
    let creditOwed = 0;

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

      const isCash = payload.paymentMethod === 'cash';
      const isCard = payload.paymentMethod === 'card';
      const isCredit = payload.paymentMethod === 'credit';
      const isSplit = payload.paymentMethod === 'split';

      cashPaid = 0;
      creditOwed = 0;

      if (isCash) {
        cashPaid = totalSale;
        creditOwed = 0;
      } else if (isCredit) {
        cashPaid = 0;
        creditOwed = totalSale;
      } else if (isCard) {
        cashPaid = 0;
        creditOwed = 0;
      } else if (isSplit) {
        const rawPaid = Number(payload.paidAmount || 0);
        cashPaid = Math.max(0, Math.min(totalSale, Number(rawPaid.toFixed(2))));
        creditOwed = Math.max(0, Number((totalSale - cashPaid).toFixed(2)));
      }

      const tempDocNo = `TMP-VAN-${Date.now()}`;
      const insertedSale = await trxAny
        .insertInto('sales')
        .values({
          doc_no: tempDocNo,
          total: totalSale,
          subtotal: totalSale,
          discount: 0,
          // Money collected in the field sits with the rep, not the till, until settleTrip — so
          // this is never marked paid here. postSale below books the full total as a receivable,
          // exactly like a cash-on-delivery order, and postVanTripSettlement clears it later.
          paid_amount: 0,
          store_credit_used: 0,
          prices_include_tax: false,
          status: 'posted',
          payment_type: payload.paymentMethod,
          payment_channel: isCash ? 'cash' : (isCard ? 'card' : (isCredit ? 'credit' : 'mixed')),
          collection_status: isCash ? 'prepaid_by_rep' : (isSplit && cashPaid > 0 ? 'prepaid_by_rep' : null),
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
          delivery_proof_photo: payload.deliveryProofPhoto || null,
          packaging_breakdown: payload.packagingBreakdown ? JSON.stringify(payload.packagingBreakdown) : null,
          tenant_id: tenantId,
          account_id: accountId,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      createdSaleId = Number(insertedSale.id);
      docNo = await this.generateDailySequenceNumber(trxAny, 'sales', 'doc_no', 'VAN', tenantId);

      await trxAny
        .updateTable('sales')
        .set({ doc_no: docNo })
        .where('id', '=', createdSaleId)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (resolvedCustomerId) {
        await trxAny
          .insertInto('van_field_visits')
          .values({
            tenant_id: tenantId,
            account_id: accountId,
            trip_id: payload.tripId,
            rep_id: repId,
            customer_id: resolvedCustomerId,
            visit_type: 'positive',
            sale_id: createdSaleId,
            gps_lat: payload.deliveryGpsLat != null ? Number(payload.deliveryGpsLat) : null,
            gps_lng: payload.deliveryGpsLng != null ? Number(payload.deliveryGpsLng) : null,
            notes: payload.notes || null,
            visited_at: sql`NOW()`,
            created_at: sql`NOW()`,
          })
          .execute();
      }

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

      if (isCash) {
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
      } else if (isCard) {
        await trxAny
          .updateTable('van_sales_trips')
          .set({
            sales_amount: sql`sales_amount + ${totalSale}`,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', payload.tripId)
          .where('tenant_id', '=', tenantId)
          .execute();
      } else if (isCredit) {
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
      } else if (isSplit) {
        await trxAny
          .updateTable('van_sales_trips')
          .set({
            sales_amount: sql`sales_amount + ${totalSale}`,
            cash_collected: sql`cash_collected + ${cashPaid}`,
            credit_sales: sql`credit_sales + ${creditOwed}`,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', payload.tripId)
          .where('tenant_id', '=', tenantId)
          .execute();

        if (resolvedCustomerId && creditOwed > 0) {
          const updatedCust = await trxAny
            .updateTable('customers')
            .set({ balance: sql`COALESCE(balance, 0) + ${creditOwed}`, updated_at: sql`NOW()` })
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
              amount: creditOwed,
              balance_after: balanceAfter,
              note: `فاتورة بيع ميدانية مجزأة (#${docNo}) - مسدد نقداً: ${cashPaid.toFixed(2)}، متبقي آجل: ${creditOwed.toFixed(2)}`,
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
      cashPaid,
      creditOwed,
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

      receiptNo = await this.generateDailySequenceNumber(trxAny, 'customer_payments', 'note', 'COL', tenantId);
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
    const docNo = await this.generateDailySequenceNumber(this.anyDb, 'van_field_returns', 'doc_no', 'VRET', tenantId);
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
   * Sets or updates a representative's monthly sales, collection, and visits targets.
   */
  async setRepTarget(
    tenantId: string,
    accountId: string,
    repId: number,
    periodMonth: string,
    targetAmount: number,
    collectionTarget?: number | null,
    visitsTarget?: number | null,
  ) {
    const target = Math.max(0, Number(Number(targetAmount || 0).toFixed(2)));
    const colTarget = collectionTarget !== undefined && collectionTarget !== null && !isNaN(Number(collectionTarget))
      ? Math.max(0, Number(Number(collectionTarget).toFixed(2)))
      : null;
    const visTarget = visitsTarget !== undefined && visitsTarget !== null && !isNaN(Number(visitsTarget))
      ? Math.max(0, Math.round(Number(visitsTarget)))
      : null;

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
        .set({
          target_amount: target,
          collection_target: colTarget,
          visits_target: visTarget,
          updated_at: sql`NOW()`,
        })
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
          collection_target: colTarget,
          visits_target: visTarget,
        })
        .execute();
    }

    return this.getRepTarget(tenantId, repId, periodMonth);
  }

  private async getMonthlyOfficialHolidayDates(tenantId: string, startOfMonth: Date, endOfMonth: Date): Promise<string[]> {
    try {
      const startStr = startOfMonth.toISOString().slice(0, 10);
      const endStr = endOfMonth.toISOString().slice(0, 10);
      const rows = await this.anyDb
        .selectFrom('hr_holidays')
        .select(['start_date', 'end_date'])
        .where('tenant_id', '=', tenantId)
        .where('end_date', '>=', startStr)
        .where('start_date', '<=', endStr)
        .execute();

      const datesSet = new Set<string>();
      for (const row of (rows || [])) {
        if (!row.start_date || !row.end_date) continue;
        const cur = new Date(row.start_date);
        const end = new Date(row.end_date);
        while (cur <= end) {
          const dStr = cur.toISOString().slice(0, 10);
          if (dStr >= startStr && dStr <= endStr) {
            datesSet.add(dStr);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
      return Array.from(datesSet);
    } catch {
      return [];
    }
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
      .select(['target_amount', 'collection_target', 'visits_target'])
      .where('rep_id', '=', repId)
      .where('period_month', '=', month)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const targetAmount = Number(targetRow?.target_amount || 0);
    const collectionTarget = targetRow?.collection_target !== null && targetRow?.collection_target !== undefined
      ? Number(targetRow.collection_target)
      : null;
    const visitsTarget = targetRow?.visits_target !== null && targetRow?.visits_target !== undefined
      ? Number(targetRow.visits_target)
      : null;

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

    const collectionsMtdRow = await this.anyDb
      .selectFrom('van_sales_trips')
      .select([sql<number>`coalesce(sum(cast(cash_collected as numeric)), 0)`.as('total_collected')])
      .where('rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('opened_at', '>=', startOfMonth)
      .where('opened_at', '<=', endOfMonth)
      .executeTakeFirst();
    const actualCollections = Number(collectionsMtdRow?.total_collected || 0);

    const visitsMtdRow = await this.anyDb
      .selectFrom('van_field_visits')
      .select([sql<number>`count(*)`.as('total_visits')])
      .where('rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .where('visited_at', '>=', startOfMonth)
      .where('visited_at', '<=', endOfMonth)
      .executeTakeFirst();
    const actualVisits = Number(visitsMtdRow?.total_visits || 0);

    const officialHolidays = await this.getMonthlyOfficialHolidayDates(tenantId, startOfMonth, endOfMonth);

    const metrics = calculateRepTargetMetrics({
      targetAmount,
      actualSalesMTD: actualSalesMtd,
      collectionTarget,
      actualCollectionsMTD: actualCollections,
      visitsTarget,
      actualVisitsMTD: actualVisits,
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
      collectionTarget,
      actualCollections,
      collectionAchievementRate: metrics.collectionAchievementRate,
      remainingCollection: metrics.remainingCollection,
      requiredDailyCollection: metrics.requiredDailyCollection,
      isCollectionAchieved: metrics.isCollectionAchieved,
      visitsTarget,
      actualVisits,
      visitsAchievementRate: metrics.visitsAchievementRate,
      remainingVisits: metrics.remainingVisits,
      requiredDailyVisits: metrics.requiredDailyVisits,
      isVisitsAchieved: metrics.isVisitsAchieved,
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
      .select(['rep_id', 'target_amount', 'collection_target', 'visits_target'])
      .where('period_month', '=', month)
      .where('tenant_id', '=', tenantId)
      .execute();
    const targetMap = new Map<number, { targetAmount: number; collectionTarget: number | null; visitsTarget: number | null }>();
    for (const t of targets) {
      targetMap.set(Number(t.rep_id), {
        targetAmount: Number(t.target_amount || 0),
        collectionTarget: t.collection_target !== null && t.collection_target !== undefined ? Number(t.collection_target) : null,
        visitsTarget: t.visits_target !== null && t.visits_target !== undefined ? Number(t.visits_target) : null,
      });
    }

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

    const collectionsMtd = await this.anyDb
      .selectFrom('van_sales_trips')
      .select(['rep_id', sql<number>`coalesce(sum(cast(cash_collected as numeric)), 0)`.as('total_collected')])
      .where('tenant_id', '=', tenantId)
      .where('opened_at', '>=', startOfMonth)
      .where('opened_at', '<=', endOfMonth)
      .where(sql<boolean>`rep_id is not null`)
      .groupBy('rep_id')
      .execute();
    const collectionsMap = new Map<number, number>();
    for (const c of collectionsMtd) collectionsMap.set(Number(c.rep_id), Number(c.total_collected || 0));

    const visitsMtd = await this.anyDb
      .selectFrom('van_field_visits')
      .select(['rep_id', sql<number>`count(*)`.as('total_visits')])
      .where('tenant_id', '=', tenantId)
      .where('visited_at', '>=', startOfMonth)
      .where('visited_at', '<=', endOfMonth)
      .where(sql<boolean>`rep_id is not null`)
      .groupBy('rep_id')
      .execute();
    const visitsMap = new Map<number, number>();
    for (const v of visitsMtd) visitsMap.set(Number(v.rep_id), Number(v.total_visits || 0));

    const officialHolidays = await this.getMonthlyOfficialHolidayDates(tenantId, startOfMonth, endOfMonth);

    return reps.map((r: any) => {
      const repId = Number(r.id);
      const repTargetInfo = targetMap.get(repId);
      const targetAmount = repTargetInfo?.targetAmount || 0;
      const collectionTarget = repTargetInfo?.collectionTarget ?? null;
      const visitsTarget = repTargetInfo?.visitsTarget ?? null;
      const actualSales = salesMap.get(repId) || 0;
      const actualCollections = collectionsMap.get(repId) || 0;
      const actualVisits = visitsMap.get(repId) || 0;

      const metrics = calculateRepTargetMetrics({
        targetAmount,
        actualSalesMTD: actualSales,
        collectionTarget,
        actualCollectionsMTD: actualCollections,
        visitsTarget,
        actualVisitsMTD: actualVisits,
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
        collectionTarget,
        actualCollections,
        collectionAchievementRate: metrics.collectionAchievementRate,
        remainingCollection: metrics.remainingCollection,
        requiredDailyCollection: metrics.requiredDailyCollection,
        isCollectionAchieved: metrics.isCollectionAchieved,
        visitsTarget,
        actualVisits,
        visitsAchievementRate: metrics.visitsAchievementRate,
        remainingVisits: metrics.remainingVisits,
        requiredDailyVisits: metrics.requiredDailyVisits,
        isVisitsAchieved: metrics.isVisitsAchieved,
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
      sourceWarehouseId?: number;
      items: { productId: number; qty: number; sourceWarehouseId?: number; sourceWarehouseName?: string }[];
      notes?: string;
    },
  ) {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل لطلب التحميل', 'EMPTY_LOAD_ITEMS', 400);
    }

    let sourceWarehouseId = payload.sourceWarehouseId ? Number(payload.sourceWarehouseId) : 0;
    if (!sourceWarehouseId) {
      if (payload.items[0]?.sourceWarehouseId) {
        sourceWarehouseId = Number(payload.items[0].sourceWarehouseId);
      } else {
        const defaultWh = await this.anyDb
          .selectFrom('stock_locations')
          .select(['id'])
          .where('tenant_id', '=', tenantId)
          .where('is_active', '=', true)
          .where('location_type', '!=', 'van_stock')
          .orderBy('id', 'asc')
          .executeTakeFirst();
        if (defaultWh) sourceWarehouseId = Number(defaultWh.id);
      }
    }

    if (!sourceWarehouseId) {
      throw new AppError('تعذر تحديد المستودع المصدر لطلب التحميل', 'INVALID_SOURCE_WAREHOUSE', 400);
    }

    const tempDocNo = `TMP-REQ-${Date.now()}`;
    const [inserted] = await this.anyDb
      .insertInto('van_load_requisitions')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        doc_no: tempDocNo,
        rep_id: repId,
        source_warehouse_id: sourceWarehouseId,
        status: 'pending',
        requested_items: JSON.stringify(payload.items),
        approved_items: JSON.stringify(payload.items),
        notes: payload.notes || null,
      })
      .returning(['id'])
      .execute();

    const requisitionId = Number(inserted.id);
    const docNo = await this.generateDailySequenceNumber(this.anyDb, 'van_load_requisitions', 'doc_no', 'REQ', tenantId);
    await this.anyDb
      .updateTable('van_load_requisitions')
      .set({ doc_no: docNo })
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, docNo, requisitionId };
  }

  /**
   * Manager directly creates a load requisition for a specific representative/van,
   * with the option to dispatch and load the vehicle immediately (opening the trip).
   */
  async createLoadRequisitionByAdmin(
    tenantId: string,
    accountId: string,
    userId: number,
    payload: {
      repId: number;
      sourceWarehouseId?: number;
      items: { productId: number; qty: number; sourceWarehouseId?: number; sourceWarehouseName?: string }[];
      notes?: string;
      dispatchImmediately?: boolean;
    },
  ) {
    const repId = Number(payload.repId);
    if (!repId) {
      throw new AppError('يرجى تحديد مندوب التوزيع أولاً', 'REP_REQUIRED', 400);
    }
    const subRes = await this.submitLoadRequisition(repId, tenantId, accountId, {
      sourceWarehouseId: payload.sourceWarehouseId,
      items: payload.items,
      notes: payload.notes,
    });

    if (payload.dispatchImmediately) {
      const dispatchRes = await this.approveAndDispatchRequisition(
        tenantId,
        accountId,
        subRes.requisitionId,
        userId,
      );
      return {
        ok: true,
        docNo: subRes.docNo,
        requisitionId: subRes.requisitionId,
        dispatched: true,
        tripId: dispatchRes.tripId,
      };
    }

    return {
      ok: true,
      docNo: subRes.docNo,
      requisitionId: subRes.requisitionId,
      dispatched: false,
    };
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
        sql<string>`coalesce(
          dr.vehicle_plate,
          (SELECT fv.plate_number 
           FROM fleet_vehicle_drivers fvd 
           JOIN fleet_vehicles fv ON fv.id = fvd.vehicle_id 
           WHERE fvd.rep_id = vlr.rep_id AND fvd.tenant_id = vlr.tenant_id AND fvd.is_active = true 
           ORDER BY fvd.id DESC LIMIT 1),
          (SELECT fv2.plate_number 
           FROM fleet_vehicles fv2 
           WHERE fv2.assigned_rep_id = vlr.rep_id AND fv2.tenant_id = vlr.tenant_id 
           ORDER BY fv2.id DESC LIMIT 1),
          ''
        )`.as('vehiclePlate'),
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

  /**
   * Deletes a pending or rejected requisition.
   */
  async deleteLoadRequisition(tenantId: string, requisitionId: number) {
    const req = await this.anyDb
      .selectFrom('van_load_requisitions')
      .select(['id', 'status', 'doc_no'])
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!req) throw new AppError('طلب التحميل غير موجود', 'REQUISITION_NOT_FOUND', 404);
    if (req.status === 'dispatched') {
      throw new AppError('لا يمكن حذف إذن تحميل تم صرفه وتحميله بالفعل على السيارة، يمكنك تصفية الرحلة من شاشة الرحلات', 'CANNOT_DELETE_DISPATCHED', 400);
    }
    await this.anyDb
      .deleteFrom('van_load_requisitions')
      .where('id', '=', requisitionId)
      .where('tenant_id', '=', tenantId)
      .execute();
    return { ok: true, requisitionId, docNo: req.doc_no };
  }

  /**
   * Returns active non-van storage warehouses for driver loading requisitions.
   */
  async getDriverWarehouses(tenantId: string) {
    const rows = await this.anyDb
      .selectFrom('stock_locations')
      .select(['id', 'name', 'code', 'location_type'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where('location_type', '!=', 'van_stock')
      .orderBy('id', 'asc')
      .execute();

    return rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      code: r.code || '',
      locationType: r.location_type,
    }));
  }

  /**
   * Returns available products and real-time stock levels across warehouses for driver requisition.
   */
  async getDriverAvailableProducts(tenantId: string, warehouseId?: number) {
    const products = await this.anyDb
      .selectFrom('products as p')
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        'p.retail_price',
        'p.is_active',
      ])
      .where('p.tenant_id', '=', tenantId)
      .where('p.is_active', '=', true)
      .orderBy('p.name', 'asc')
      .execute();

    let stockQuery = this.anyDb
      .selectFrom('product_location_stock as pls')
      .innerJoin('stock_locations as sl', 'sl.id', 'pls.location_id')
      .select([
        'pls.product_id',
        'pls.location_id',
        'sl.name as location_name',
        sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
      ])
      .where('pls.tenant_id', '=', tenantId)
      .where('sl.is_active', '=', true)
      .where('sl.location_type', '!=', 'van_stock');

    if (warehouseId && warehouseId > 0) {
      stockQuery = stockQuery.where('pls.location_id', '=', warehouseId);
    }

    const stockRows = await stockQuery.execute();

    const stockMap = new Map<number, Array<{ warehouseId: number; warehouseName: string; qty: number }>>();
    for (const row of stockRows) {
      const pid = Number(row.product_id);
      const qty = Number(row.qty || 0);
      if (qty > 0) {
        const list = stockMap.get(pid) || [];
        list.push({
          warehouseId: Number(row.location_id),
          warehouseName: row.location_name,
          qty,
        });
        stockMap.set(pid, list);
      }
    }

    return products.map((p: any) => {
      const pId = Number(p.id);
      const whStocks = stockMap.get(pId) || [];
      const totalStock = whStocks.reduce((sum, w) => sum + w.qty, 0);

      return {
        id: pId,
        name: p.name,
        barcode: p.barcode || '',
        sku: p.barcode || '',
        retailPrice: Number(p.retail_price || 0),
        unit: 'قطعة',
        totalStock,
        warehouseStocks: whStocks,
      };
    });
  }

  // =========================================================================
  // 1. FLEET FUEL LOGS & CONSUMPTION ENGINE
  // =========================================================================

  async recordFuelLog(
    tenantId: string,
    accountId: string,
    repId: number | null,
    payload: {
      vehicleId: number;
      tripId?: number | null;
      odometer: number;
      liters: number;
      pricePerLiter: number;
      stationName?: string;
      notes?: string;
    },
  ) {
    if (!payload.vehicleId || payload.vehicleId <= 0) {
      throw new AppError('يرجى تحديد مركبة التوزيع', 'INVALID_VEHICLE', 400);
    }
    const odo = Number(payload.odometer || 0);
    const lit = Number(payload.liters || 0);
    const ppl = Number(payload.pricePerLiter || 0);

    if (odo <= 0) {
      throw new AppError('يرجى إدخال قراءة عداد الكيلومترات الصحيحة', 'INVALID_ODOMETER', 400);
    }
    if (lit <= 0) {
      throw new AppError('يرجى إدخال كمية الوقود باللترات', 'INVALID_LITERS', 400);
    }
    if (ppl <= 0) {
      throw new AppError('يرجى إدخال سعر لتر الوقود', 'INVALID_PRICE_PER_LITER', 400);
    }

    const totalCost = Number((lit * ppl).toFixed(2));

    const lastFuelLog = await this.anyDb
      .selectFrom('fleet_fuel_logs')
      .select(['odometer'])
      .where('tenant_id', '=', tenantId)
      .where('vehicle_id', '=', payload.vehicleId)
      .orderBy('odometer', 'desc')
      .executeTakeFirst();

    let kmSinceLast = 0;
    let consumptionRate = 0;
    if (lastFuelLog && Number(lastFuelLog.odometer) > 0) {
      const prevOdo = Number(lastFuelLog.odometer);
      if (odo > prevOdo) {
        kmSinceLast = odo - prevOdo;
        consumptionRate = Number((kmSinceLast / lit).toFixed(2));
      }
    }

    const inserted = await this.anyDb
      .insertInto('fleet_fuel_logs')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        vehicle_id: payload.vehicleId,
        trip_id: payload.tripId || null,
        rep_id: repId || null,
        odometer: odo,
        liters: lit,
        price_per_liter: ppl,
        total_cost: totalCost,
        station_name: payload.stationName || null,
        km_since_last_fuel: kmSinceLast,
        consumption_rate: consumptionRate,
        notes: payload.notes || null,
        created_at: sql`NOW()`,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await this.anyDb
      .updateTable('fleet_vehicles')
      .set({
        current_odometer: sql`GREATEST(coalesce(current_odometer, 0), ${odo})`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', payload.vehicleId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return {
      ok: true,
      fuelLogId: Number(inserted.id),
      kmSinceLastFuel: kmSinceLast,
      consumptionRate,
      totalCost,
    };
  }

  async listFuelLogs(
    tenantId: string,
    filters?: { vehicleId?: number; repId?: number; dateFrom?: string; dateTo?: string },
  ) {
    let query = this.anyDb
      .selectFrom('fleet_fuel_logs as fl')
      .innerJoin('fleet_vehicles as fv', 'fv.id', 'fl.vehicle_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'fl.rep_id')
      .select([
        'fl.id',
        'fl.vehicle_id as vehicleId',
        'fv.plate_number as plateNumber',
        'fv.model_name as modelName',
        'fl.trip_id as tripId',
        'fl.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        sql<number>`cast(fl.odometer as numeric)`.as('odometer'),
        sql<number>`cast(fl.liters as numeric)`.as('liters'),
        sql<number>`cast(fl.price_per_liter as numeric)`.as('pricePerLiter'),
        sql<number>`cast(fl.total_cost as numeric)`.as('totalCost'),
        sql<string>`coalesce(fl.station_name, '')`.as('stationName'),
        sql<number>`cast(fl.km_since_last_fuel as numeric)`.as('kmSinceLastFuel'),
        sql<number>`cast(fl.consumption_rate as numeric)`.as('consumptionRate'),
        'fl.notes',
        'fl.created_at as createdAt',
      ])
      .where('fl.tenant_id', '=', tenantId);

    if (filters?.vehicleId) query = query.where('fl.vehicle_id', '=', filters.vehicleId);
    if (filters?.repId) query = query.where('fl.rep_id', '=', filters.repId);
    if (filters?.dateFrom) query = query.where('fl.created_at', '>=', filters.dateFrom);
    if (filters?.dateTo) query = query.where('fl.created_at', '<=', `${filters.dateTo} 23:59:59`);

    const rows = await query.orderBy('fl.created_at', 'desc').limit(200).execute();
    return rows;
  }

  // =========================================================================
  // 2. FLEET OIL CHANGES & CUSTOMIZABLE MAINTENANCE ALERTS
  // =========================================================================

  async recordOilChange(
    tenantId: string,
    accountId: string,
    repId: number | null,
    payload: {
      vehicleId: number;
      odometerAtChange: number;
      oilType: string;
      ratedKm: number;
      withFilter: boolean;
      alertKmBefore?: number;
      cost?: number;
      performedBy?: string;
      notes?: string;
    },
  ) {
    if (!payload.vehicleId || payload.vehicleId <= 0) {
      throw new AppError('يرجى تحديد مركبة التوزيع', 'INVALID_VEHICLE', 400);
    }
    const odo = Number(payload.odometerAtChange || 0);
    const rated = Number(payload.ratedKm || 0);
    const alertKm = Number(payload.alertKmBefore ?? 500);

    if (odo <= 0) {
      throw new AppError('يرجى إدخال قراءة عداد السيارة عند تغيير الزيت', 'INVALID_ODOMETER', 400);
    }
    if (rated <= 0) {
      throw new AppError('يرجى إدخال المسافة المقررة للزيت (مثال: 5000 أو 10000 كم)', 'INVALID_RATED_KM', 400);
    }
    if (!payload.oilType?.trim()) {
      throw new AppError('يرجى كتابة نوع الزيت المستخدم', 'INVALID_OIL_TYPE', 400);
    }

    const nextDue = odo + rated;

    await this.anyDb
      .updateTable('fleet_oil_changes')
      .set({ status: 'completed' })
      .where('vehicle_id', '=', payload.vehicleId)
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'active')
      .execute();

    const inserted = await this.anyDb
      .insertInto('fleet_oil_changes')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        vehicle_id: payload.vehicleId,
        rep_id: repId || null,
        odometer_at_change: odo,
        oil_type: payload.oilType.trim(),
        rated_km: rated,
        with_filter: payload.withFilter ?? true,
        alert_km_before: alertKm,
        next_due_odometer: nextDue,
        cost: Number(payload.cost || 0),
        performed_by: payload.performedBy || null,
        status: 'active',
        notes: payload.notes || null,
        created_at: sql`NOW()`,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    await this.anyDb
      .updateTable('fleet_vehicles')
      .set({
        current_odometer: sql`GREATEST(coalesce(current_odometer, 0), ${odo})`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', payload.vehicleId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return {
      ok: true,
      oilChangeId: Number(inserted.id),
      nextDueOdometer: nextDue,
      alertKmBefore: alertKm,
    };
  }

  async listOilChanges(tenantId: string, vehicleId?: number) {
    let query = this.anyDb
      .selectFrom('fleet_oil_changes as foc')
      .innerJoin('fleet_vehicles as fv', 'fv.id', 'foc.vehicle_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'foc.rep_id')
      .select([
        'foc.id',
        'foc.vehicle_id as vehicleId',
        'fv.plate_number as plateNumber',
        'fv.model_name as modelName',
        sql<number>`cast(fv.current_odometer as numeric)`.as('currentOdometer'),
        'foc.rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        sql<number>`cast(foc.odometer_at_change as numeric)`.as('odometerAtChange'),
        'foc.oil_type as oilType',
        sql<number>`cast(foc.rated_km as numeric)`.as('ratedKm'),
        'foc.with_filter as withFilter',
        sql<number>`cast(foc.alert_km_before as numeric)`.as('alertKmBefore'),
        sql<number>`cast(foc.next_due_odometer as numeric)`.as('nextDueOdometer'),
        sql<number>`cast(foc.cost as numeric)`.as('cost'),
        'foc.performed_by as performedBy',
        'foc.status',
        'foc.notes',
        'foc.created_at as createdAt',
      ])
      .where('foc.tenant_id', '=', tenantId);

    if (vehicleId) {
      query = query.where('foc.vehicle_id', '=', vehicleId);
    }

    const rows = await query.orderBy('foc.created_at', 'desc').limit(200).execute();
    return rows;
  }

  async getFleetMaintenanceAlerts(tenantId: string, vehicleId?: number) {
    let vehicleQuery = this.anyDb
      .selectFrom('fleet_vehicles as fv')
      .leftJoin('delivery_representatives as dr', 'dr.id', 'fv.assigned_rep_id')
      .select([
        'fv.id',
        'fv.plate_number as plateNumber',
        'fv.model_name as modelName',
        sql<number>`cast(fv.current_odometer as numeric)`.as('currentOdometer'),
        'fv.license_expires_at as licenseExpiresAt',
        'fv.status',
        'fv.assigned_rep_id as repId',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
      ])
      .where('fv.tenant_id', '=', tenantId);

    if (vehicleId) {
      vehicleQuery = vehicleQuery.where('fv.id', '=', vehicleId);
    }

    const vehicles = await vehicleQuery.execute();
    const alerts: Array<{
      id: string;
      vehicleId: number;
      plateNumber: string;
      repName: string;
      type: 'oil_change' | 'license_expiry';
      severity: 'warning' | 'critical';
      title: string;
      description: string;
      currentValue: string | number;
      thresholdValue: string | number;
      dueDate?: string;
    }> = [];

    const now = new Date();

    for (const v of vehicles) {
      const vId = Number(v.id);
      const currOdo = Number(v.currentOdometer || 0);

      if (v.licenseExpiresAt) {
        const expDate = new Date(v.licenseExpiresAt);
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          alerts.push({
            id: `license-exp-${vId}`,
            vehicleId: vId,
            plateNumber: v.plateNumber,
            repName: v.repName,
            type: 'license_expiry',
            severity: 'critical',
            title: `رخصة منتهية للمركبة (${v.plateNumber})`,
            description: `انتهت رخصة المركبة بتاريخ ${v.licenseExpiresAt} (منذ ${Math.abs(diffDays)} يوم).`,
            currentValue: 'منتهية',
            thresholdValue: v.licenseExpiresAt,
            dueDate: v.licenseExpiresAt,
          });
        } else if (diffDays <= 30) {
          alerts.push({
            id: `license-due-${vId}`,
            vehicleId: vId,
            plateNumber: v.plateNumber,
            repName: v.repName,
            type: 'license_expiry',
            severity: 'warning',
            title: `اقتراب انتهاء رخصة المركبة (${v.plateNumber})`,
            description: `متبقي ${diffDays} يوم على انتهاء رخصة المركبة (تاريخ الانتهاء: ${v.licenseExpiresAt}).`,
            currentValue: `${diffDays} يوم متبقي`,
            thresholdValue: v.licenseExpiresAt,
            dueDate: v.licenseExpiresAt,
          });
        }
      }

      const latestOilChange = await this.anyDb
        .selectFrom('fleet_oil_changes')
        .selectAll()
        .where('vehicle_id', '=', vId)
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'active')
        .orderBy('created_at', 'desc')
        .executeTakeFirst();

      if (latestOilChange) {
        const nextDue = Number(latestOilChange.next_due_odometer || 0);
        const alertKm = Number(latestOilChange.alert_km_before || 500);
        const kmRemaining = nextDue - currOdo;

        if (kmRemaining <= 0) {
          alerts.push({
            id: `oil-overdue-${vId}`,
            vehicleId: vId,
            plateNumber: v.plateNumber,
            repName: v.repName,
            type: 'oil_change',
            severity: 'critical',
            title: `تجاوز موعد غيار الزيت (${v.plateNumber})`,
            description: `تجاوزت السيارة موعد غيار الزيت بـ ${Math.abs(kmRemaining)} كم! (العداد الحالي: ${currOdo}، المقرر: ${nextDue} كم - نوع الزيت: ${latestOilChange.oil_type}).`,
            currentValue: currOdo,
            thresholdValue: nextDue,
          });
        } else if (kmRemaining <= alertKm) {
          alerts.push({
            id: `oil-due-${vId}`,
            vehicleId: vId,
            plateNumber: v.plateNumber,
            repName: v.repName,
            type: 'oil_change',
            severity: 'warning',
            title: `اقتراب موعد غيار الزيت (${v.plateNumber})`,
            description: `متبقي ${kmRemaining} كم فقط على موعد غيار الزيت (العداد الحالي: ${currOdo}، المقرر: ${nextDue} كم - نوع الزيت: ${latestOilChange.oil_type}${latestOilChange.with_filter ? ' مع فلتر' : ''}).`,
            currentValue: currOdo,
            thresholdValue: nextDue,
          });
        }
      }
    }

    return { ok: true, alerts };
  }

  // =========================================================================
  // 3. MULTI-DRIVER VEHICLE ASSIGNMENTS / SHIFTS
  // =========================================================================

  async listVehicleDrivers(tenantId: string, vehicleId: number) {
    const rows = await this.anyDb
      .selectFrom('fleet_vehicle_drivers as fvd')
      .innerJoin('delivery_representatives as dr', 'dr.id', 'fvd.rep_id')
      .select([
        'fvd.id',
        'fvd.vehicle_id as vehicleId',
        'fvd.rep_id as repId',
        'dr.name as repName',
        'dr.phone as repPhone',
        'fvd.shift_name as shiftName',
        'fvd.shift_start_time as shiftStartTime',
        'fvd.shift_end_time as shiftEndTime',
        'fvd.is_active as isActive',
        'fvd.notes',
        'fvd.created_at as createdAt',
      ])
      .where('fvd.tenant_id', '=', tenantId)
      .where('fvd.vehicle_id', '=', vehicleId)
      .orderBy('fvd.id', 'asc')
      .execute();

    return rows;
  }

  async assignVehicleDriver(
    tenantId: string,
    accountId: string,
    payload: {
      vehicleId: number;
      repId: number;
      shiftName: string;
      shiftStartTime?: string;
      shiftEndTime?: string;
      notes?: string;
    },
  ) {
    if (!payload.vehicleId || !payload.repId) {
      throw new AppError('يرجى تحديد المركبة والمندوب/السائق', 'INVALID_PARAMS', 400);
    }

    const inserted = await this.anyDb
      .insertInto('fleet_vehicle_drivers')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        vehicle_id: payload.vehicleId,
        rep_id: payload.repId,
        shift_name: payload.shiftName || 'صباحي',
        shift_start_time: payload.shiftStartTime || null,
        shift_end_time: payload.shiftEndTime || null,
        is_active: true,
        notes: payload.notes || null,
        created_at: sql`NOW()`,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    // Sync vehicle info to delivery_representatives
    const vehicle = await this.anyDb
      .selectFrom('fleet_vehicles')
      .select(['id', 'plate_number', 'van_location_id', 'assigned_rep_id'])
      .where('id', '=', payload.vehicleId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (vehicle) {
      await this.anyDb
        .updateTable('delivery_representatives')
        .set({
          vehicle_plate: vehicle.plate_number,
          is_van_rep: true,
          van_location_id: vehicle.van_location_id || undefined,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', payload.repId)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (!vehicle.assigned_rep_id) {
        await this.anyDb
          .updateTable('fleet_vehicles')
          .set({
            assigned_rep_id: payload.repId,
            status: 'assigned',
            updated_at: sql`NOW()`,
          })
          .where('id', '=', payload.vehicleId)
          .where('tenant_id', '=', tenantId)
          .execute();
      }
    }

    return { ok: true, assignmentId: Number(inserted.id) };
  }

  async removeVehicleDriver(tenantId: string, assignmentId: number) {
    const assignment = await this.anyDb
      .selectFrom('fleet_vehicle_drivers')
      .select(['id', 'vehicle_id', 'rep_id'])
      .where('id', '=', assignmentId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    await this.anyDb
      .deleteFrom('fleet_vehicle_drivers')
      .where('id', '=', assignmentId)
      .where('tenant_id', '=', tenantId)
      .execute();

    if (assignment) {
      const otherAssignment = await this.anyDb
        .selectFrom('fleet_vehicle_drivers as fvd')
        .innerJoin('fleet_vehicles as fv', 'fv.id', 'fvd.vehicle_id')
        .select(['fv.plate_number', 'fv.van_location_id'])
        .where('fvd.tenant_id', '=', tenantId)
        .where('fvd.rep_id', '=', assignment.rep_id)
        .where('fvd.is_active', '=', true)
        .orderBy('fvd.id', 'desc')
        .executeTakeFirst();

      if (otherAssignment) {
        await this.anyDb
          .updateTable('delivery_representatives')
          .set({
            vehicle_plate: otherAssignment.plate_number,
            van_location_id: otherAssignment.van_location_id || undefined,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', assignment.rep_id)
          .where('tenant_id', '=', tenantId)
          .execute();
      } else {
        const vehicle = await this.anyDb
          .selectFrom('fleet_vehicles')
          .select(['plate_number', 'assigned_rep_id'])
          .where('id', '=', assignment.vehicle_id)
          .where('tenant_id', '=', tenantId)
          .executeTakeFirst();

        if (vehicle) {
          await this.anyDb
            .updateTable('delivery_representatives')
            .set({
              vehicle_plate: null,
              updated_at: sql`NOW()`,
            })
            .where('id', '=', assignment.rep_id)
            .where('tenant_id', '=', tenantId)
            .where('vehicle_plate', '=', vehicle.plate_number)
            .execute();

          if (vehicle.assigned_rep_id === assignment.rep_id) {
            const nextDriver = await this.anyDb
              .selectFrom('fleet_vehicle_drivers')
              .select(['rep_id'])
              .where('vehicle_id', '=', assignment.vehicle_id)
              .where('tenant_id', '=', tenantId)
              .where('is_active', '=', true)
              .orderBy('id', 'asc')
              .executeTakeFirst();

            await this.anyDb
              .updateTable('fleet_vehicles')
              .set({
                assigned_rep_id: nextDriver?.rep_id || null,
                status: nextDriver?.rep_id ? 'assigned' : 'available',
                updated_at: sql`NOW()`,
              })
              .where('id', '=', assignment.vehicle_id)
              .where('tenant_id', '=', tenantId)
              .execute();
          }
        }
      }
    }

    return { ok: true };
  }

  // =========================================================================
  // 4. FIELD VISITS & CUSTOMER ITINERARY
  // =========================================================================

  async getDriverTodayItinerary(tenantId: string, repId: number, tripId?: number) {
    void tripId;
    const customers = await this.anyDb
      .selectFrom('customers')
      .select([
        'id',
        'name',
        'phone',
        'address',
        sql<number>`cast(coalesce(balance, 0) as numeric)`.as('balance'),
        sql<number>`cast(coalesce(credit_limit, 0) as numeric)`.as('creditLimit'),
        'metadata',
      ])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('id', 'asc')
      .execute();

    // 1. Calculate today's Arabic day name
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const currentDayName = arabicDays[new Date().getDay()];

    // 2. Filter customers based on rep assignment:
    // If the rep has explicit assignments: include ONLY customers assigned to him.
    // If the rep has no explicit assignments yet: include unassigned customers, but exclude any customer assigned to other reps.
    const repHasExplicitAssignments = customers.some((c: any) => {
      const m = typeof c.metadata === 'object' && c.metadata !== null ? c.metadata : {};
      return m.assigned_rep_id && Number(m.assigned_rep_id) === Number(repId);
    });

    const repCustomers = customers.filter((c: any) => {
      const m = typeof c.metadata === 'object' && c.metadata !== null ? c.metadata : {};
      const cAssignedRepId = m.assigned_rep_id ? Number(m.assigned_rep_id) : null;
      if (repHasExplicitAssignments) {
        return cAssignedRepId === Number(repId);
      }
      return cAssignedRepId === null || cAssignedRepId === Number(repId);
    });

    const todayVisits = await this.anyDb
      .selectFrom('van_field_visits as vfv')
      .leftJoin('sales as s', 's.id', 'vfv.sale_id')
      .select([
        'vfv.id',
        'vfv.customer_id as customerId',
        'vfv.visit_type as visitType',
        'vfv.sale_id as saleId',
        sql<string>`coalesce(s.doc_no, '')`.as('saleDocNo'),
        sql<number>`cast(coalesce(s.total, 0) as numeric)`.as('saleTotal'),
        'vfv.negative_reason as negativeReason',
        'vfv.postponed_to_date as postponedToDate',
        'vfv.visited_at as visitedAt',
        'vfv.notes',
      ])
      .where('vfv.tenant_id', '=', tenantId)
      .where('vfv.rep_id', '=', repId)
      .where(sql`vfv.visited_at >= CURRENT_DATE`)
      .execute();

    const visitMap = new Map<number, any>();
    for (const v of todayVisits) {
      visitMap.set(Number(v.customerId), v);
    }

    const recentNegativeCounts = await this.anyDb
      .selectFrom('van_field_visits')
      .select([
        'customer_id as customerId',
        sql<number>`count(*) filter (where visit_type = 'negative')`.as('negativeCount'),
      ])
      .where('tenant_id', '=', tenantId)
      .groupBy('customer_id')
      .execute();

    const negativeMap = new Map<number, number>();
    for (const r of recentNegativeCounts) {
      negativeMap.set(Number(r.customerId), Number(r.negativeCount || 0));
    }

    return repCustomers.map((c: any) => {
      const cId = Number(c.id);
      const meta = typeof c.metadata === 'object' && c.metadata !== null ? c.metadata : {};
      const todayVisit = visitMap.get(cId);
      const totalNegatives = negativeMap.get(cId) || 0;

      let status: 'pending' | 'positive' | 'negative' = 'pending';
      if (todayVisit) {
        status = todayVisit.visitType;
      }

      const visitDays: string[] = Array.isArray(meta.visit_days)
        ? meta.visit_days
        : (meta.visit_day ? [meta.visit_day] : []);
      const isScheduledToday = visitDays.length > 0 ? visitDays.includes(currentDayName) : true;
      const assignedRepId = meta.assigned_rep_id ? Number(meta.assigned_rep_id) : null;

      return {
        customerId: cId,
        customerName: c.name,
        customerPhone: c.phone || '',
        customerAddress: c.address || '',
        customerCode: meta.customer_code || `#CUST-${cId}`,
        route: meta.route || 'الخط العام',
        routeSequence: Number(meta.route_sequence || 0),
        visitDay: meta.visit_day || '',
        visitDays,
        isScheduledToday,
        currentDayName,
        assignedRepId,
        assignedRepName: meta.assigned_rep_name || '',
        locationUrl: meta.location_url || '',
        balance: Number(c.balance || 0),
        creditLimit: Number(c.creditLimit || 0),
        visitStatus: status,
        todayVisit: todayVisit || null,
        repeatedNegativesCount: totalNegatives,
        hasRepeatedNegativeAlert: totalNegatives >= 3,
      };
    });
  }

  /**
   * Lists field sales executed by or assigned to a delivery representative,
   * supporting filtering by date scope, customer, payment method, or search query.
   * Includes line items for seamless reprinting on thermal receipts or sharing.
   */
  async listDriverSales(
    tenantId: string,
    repId: number,
    filters?: {
      dateScope?: 'today' | 'yesterday' | 'week' | 'all';
      customerId?: number;
      paymentMethod?: string;
      search?: string;
      tripId?: number;
      limit?: number;
    },
  ) {
    let query = this.anyDb
      .selectFrom('sales as s')
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .leftJoin('delivery_representatives as dr', 'dr.id', 's.delivery_rep_id')
      .leftJoin('van_sales_trips as vt', 'vt.id', 's.van_trip_id')
      .leftJoin('fleet_vehicles as fv', 'fv.id', 'vt.vehicle_id')
      .select([
        's.id',
        's.doc_no as docNo',
        sql<number>`cast(s.total as numeric)`.as('total'),
        sql<number>`cast(coalesce(s.subtotal, s.total) as numeric)`.as('subtotal'),
        sql<number>`cast(coalesce(s.discount, 0) as numeric)`.as('discount'),
        's.payment_type as paymentMethod',
        's.payment_channel as paymentChannel',
        's.created_at as createdAt',
        's.packaging_breakdown as packagingBreakdown',
        's.delivery_proof_photo as deliveryProofPhoto',
        's.customer_id as customerId',
        'c.name as customerName',
        'c.phone as customerPhone',
        sql<string | null>`null`.as('customerCode'),
        'c.address as customerAddress',
        sql<string>`coalesce(dr.name, '')`.as('repName'),
        sql<string>`coalesce(fv.plate_number, dr.vehicle_plate, '')`.as('vehiclePlate'),
        'vt.id as tripId',
      ])
      .where('s.tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('s.delivery_rep_id', '=', repId),
          eb('vt.rep_id', '=', repId),
        ]),
      );

    if (filters?.customerId) {
      query = query.where('s.customer_id', '=', filters.customerId);
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query = query.where('s.payment_type', '=', filters.paymentMethod);
    }

    if (filters?.tripId) {
      query = query.where('s.van_trip_id', '=', filters.tripId);
    }

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      query = query.where((eb: any) =>
        eb.or([
          eb('s.doc_no', 'ilike', q),
          eb('c.name', 'ilike', q),
          eb('c.phone', 'ilike', q),
        ]),
      );
    }

    if (filters?.dateScope && filters.dateScope !== 'all') {
      const now = new Date();
      if (filters.dateScope === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        query = query.where('s.created_at', '>=', startOfToday);
      } else if (filters.dateScope === 'yesterday') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        query = query.where('s.created_at', '>=', startOfYesterday).where('s.created_at', '<', startOfToday);
      } else if (filters.dateScope === 'week') {
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
        query = query.where('s.created_at', '>=', startOfWeek);
      }
    }

    const maxLimit = Math.min(Number(filters?.limit || 100), 200);
    const rows = await query.orderBy('s.id', 'desc').limit(maxLimit).execute();

    if (!rows.length) {
      return [];
    }

    const saleIds = rows.map((r: any) => Number(r.id));
    const items = await this.anyDb
      .selectFrom('sale_items as si')
      .select([
        'si.sale_id as saleId',
        'si.product_id as productId',
        'si.product_name as name',
        sql<number>`cast(si.qty as numeric)`.as('qty'),
        sql<number>`cast(si.unit_price as numeric)`.as('unitPrice'),
        sql<number>`cast(si.line_total as numeric)`.as('lineTotal'),
      ])
      .where('si.tenant_id', '=', tenantId)
      .where('si.sale_id', 'in', saleIds)
      .orderBy('si.id', 'asc')
      .execute();

    const itemsBySaleId = new Map<number, any[]>();
    for (const item of items) {
      const sId = Number(item.saleId);
      if (!itemsBySaleId.has(sId)) {
        itemsBySaleId.set(sId, []);
      }
      itemsBySaleId.get(sId)!.push({
        productId: Number(item.productId),
        name: item.name,
        qty: Number(item.qty),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      });
    }

    return rows.map((r: any) => {
      let packagingBreakdown = null;
      if (r.packagingBreakdown) {
        try {
          packagingBreakdown = typeof r.packagingBreakdown === 'string'
            ? JSON.parse(r.packagingBreakdown)
            : r.packagingBreakdown;
        } catch {}
      }

      const saleItems = itemsBySaleId.get(Number(r.id)) || [];

      return {
        id: Number(r.id),
        docNo: r.docNo,
        total: Number(r.total),
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        paymentMethod: r.paymentMethod || 'cash',
        createdAt: r.createdAt,
        packagingBreakdown,
        deliveryProofPhoto: r.deliveryProofPhoto || null,
        customerId: r.customerId ? Number(r.customerId) : null,
        customerName: r.customerName || 'عميل نقدي',
        customerPhone: r.customerPhone || null,
        customerCode: r.customerCode || null,
        customerAddress: r.customerAddress || null,
        repName: r.repName || 'مندوب التوزيع',
        vehiclePlate: r.vehiclePlate || null,
        tripId: r.tripId ? Number(r.tripId) : null,
        itemsCount: saleItems.length,
        items: saleItems,
      };
    });
  }

  async recordFieldVisit(
    tenantId: string,
    accountId: string,
    repId: number,
    payload: {
      tripId: number;
      customerId: number;
      visitType: 'positive' | 'negative';
      saleId?: number | null;
      negativeReason?: 'no_cash' | 'shop_closed' | 'sufficient_stock' | 'item_unavailable' | 'postponed' | 'other';
      postponedToDate?: string | null;
      gpsLat?: number | null;
      gpsLng?: number | null;
      notes?: string;
    },
  ) {
    if (!payload.customerId || !payload.tripId) {
      throw new AppError('يرجى تحديد الرحلة والعميل', 'INVALID_PARAMS', 400);
    }
    if (payload.visitType === 'negative' && !payload.negativeReason) {
      throw new AppError('يرجى تحديد سبب الزيارة السلبية', 'MISSING_NEGATIVE_REASON', 400);
    }

    const inserted = await this.anyDb
      .insertInto('van_field_visits')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        trip_id: payload.tripId,
        rep_id: repId,
        customer_id: payload.customerId,
        visit_type: payload.visitType,
        sale_id: payload.saleId || null,
        negative_reason: payload.negativeReason || null,
        postponed_to_date: payload.postponedToDate || null,
        gps_lat: payload.gpsLat != null ? Number(payload.gpsLat) : null,
        gps_lng: payload.gpsLng != null ? Number(payload.gpsLng) : null,
        notes: payload.notes || null,
        visited_at: sql`NOW()`,
        created_at: sql`NOW()`,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const lastThreeVisits = await this.anyDb
      .selectFrom('van_field_visits')
      .select(['visit_type'])
      .where('customer_id', '=', payload.customerId)
      .where('tenant_id', '=', tenantId)
      .orderBy('visited_at', 'desc')
      .limit(3)
      .execute();

    const isConsecutiveThreeNegatives =
      lastThreeVisits.length >= 3 && lastThreeVisits.every((v: any) => v.visit_type === 'negative');

    return {
      ok: true,
      visitId: Number(inserted.id),
      consecutiveNegativeAlert: isConsecutiveThreeNegatives,
    };
  }

  async listFieldVisits(
    tenantId: string,
    filters?: { repId?: number; customerId?: number; visitType?: string; dateFrom?: string; dateTo?: string },
  ) {
    let query = this.anyDb
      .selectFrom('van_field_visits as vfv')
      .innerJoin('customers as c', 'c.id', 'vfv.customer_id')
      .innerJoin('delivery_representatives as dr', 'dr.id', 'vfv.rep_id')
      .leftJoin('sales as s', 's.id', 'vfv.sale_id')
      .select([
        'vfv.id',
        'vfv.trip_id as tripId',
        'vfv.rep_id as repId',
        'dr.name as repName',
        'vfv.customer_id as customerId',
        'c.name as customerName',
        'c.phone as customerPhone',
        'vfv.visit_type as visitType',
        'vfv.sale_id as saleId',
        sql<string>`coalesce(s.doc_no, '')`.as('saleDocNo'),
        sql<number>`cast(coalesce(s.total, 0) as numeric)`.as('saleTotal'),
        'vfv.negative_reason as negativeReason',
        'vfv.postponed_to_date as postponedToDate',
        'vfv.gps_lat as gpsLat',
        'vfv.gps_lng as gpsLng',
        'vfv.notes',
        'vfv.visited_at as visitedAt',
      ])
      .where('vfv.tenant_id', '=', tenantId);

    if (filters?.repId) query = query.where('vfv.rep_id', '=', filters.repId);
    if (filters?.customerId) query = query.where('vfv.customer_id', '=', filters.customerId);
    if (filters?.visitType) query = query.where('vfv.visit_type', '=', filters.visitType);
    if (filters?.dateFrom) query = query.where('vfv.visited_at', '>=', filters.dateFrom);
    if (filters?.dateTo) query = query.where('vfv.visited_at', '<=', `${filters.dateTo} 23:59:59`);

    const rows = await query.orderBy('vfv.visited_at', 'desc').limit(300).execute();
    return rows;
  }

  // =========================================================================
  // 5. INTER-VAN STREET STOCK TRANSFERS (Driver A -> Driver B)
  // =========================================================================

  async createInterVanTransfer(
    tenantId: string,
    accountId: string,
    fromRepId: number,
    payload: {
      toRepId: number;
      fromTripId?: number;
      toTripId?: number;
      items: { productId: number; qty: number }[];
      notes?: string;
    },
  ) {
    if (!payload.toRepId || payload.toRepId === fromRepId) {
      throw new AppError('يرجى اختيار مندوب مستلم مختلف عن المندوب المحوّل', 'INVALID_TARGET_REP', 400);
    }
    if (!payload.items || !payload.items.length) {
      throw new AppError('يرجى إضافة صنف واحد على الأقل للتحويل', 'EMPTY_ITEMS', 400);
    }

    const fromRep = await this.anyDb
      .selectFrom('delivery_representatives')
      .selectAll()
      .where('id', '=', fromRepId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const toRep = await this.anyDb
      .selectFrom('delivery_representatives')
      .selectAll()
      .where('id', '=', payload.toRepId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!fromRep) throw new AppError('المندوب المحوّل غير موجود', 'FROM_REP_NOT_FOUND', 404);
    if (!toRep) throw new AppError('المندوب المستلم غير موجود', 'TO_REP_NOT_FOUND', 404);

    const fromVanLoc = await this.getOrCreateVanLocation(fromRepId, tenantId, accountId);
    const toVanLoc = await this.getOrCreateVanLocation(payload.toRepId, tenantId, accountId);

    for (const item of payload.items) {
      const pid = Number(item.productId);
      const qty = Number(item.qty || 0);
      if (qty <= 0) continue;

      const currentStock = await this.anyDb
        .selectFrom('product_location_stock')
        .select(['qty'])
        .where('product_id', '=', pid)
        .where('location_id', '=', fromVanLoc.id)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();

      const avail = Number(currentStock?.qty || 0);
      if (avail < qty) {
        const prod = await this.anyDb.selectFrom('products').select(['name']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();
        throw new AppError(
          `رصيد السيارة غير كافٍ لتحويل الصنف "${prod?.name || pid}". المتوفر: ${avail}، المطلوب تحويله: ${qty}`,
          'INSUFFICIENT_STOCK_FOR_TRANSFER',
          400,
        );
      }
    }

    const tempDoc = `TMP-XFR-${Date.now()}`;
    const totalQty = payload.items.reduce((s: number, it: any) => s + Number(it.qty || 0), 0);

    const inserted = await this.anyDb
      .insertInto('van_stock_transfers')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        transfer_no: tempDoc,
        from_rep_id: fromRepId,
        from_trip_id: payload.fromTripId || null,
        from_van_location_id: fromVanLoc.id,
        to_rep_id: payload.toRepId,
        to_trip_id: payload.toTripId || null,
        to_van_location_id: toVanLoc.id,
        status: 'pending',
        total_items_count: payload.items.length,
        total_qty: totalQty,
        notes: payload.notes || null,
        created_at: sql`NOW()`,
        updated_at: sql`NOW()`,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const transferId = Number(inserted.id);
    const transferNo = await this.generateDailySequenceNumber(this.anyDb, 'van_stock_transfers', 'transfer_no', 'XFR', tenantId);

    await this.anyDb
      .updateTable('van_stock_transfers')
      .set({ transfer_no: transferNo })
      .where('id', '=', transferId)
      .where('tenant_id', '=', tenantId)
      .execute();

    for (const item of payload.items) {
      const pid = Number(item.productId);
      const qty = Number(item.qty || 0);
      const prod = await this.anyDb.selectFrom('products').select(['cost_price', 'retail_price']).where('id', '=', pid).where('tenant_id', '=', tenantId).executeTakeFirst();

      await this.anyDb
        .insertInto('van_stock_transfer_items')
        .values({
          transfer_id: transferId,
          tenant_id: tenantId,
          product_id: pid,
          qty,
          unit_cost: Number(prod?.cost_price || 0),
          unit_price: Number(prod?.retail_price || 0),
        })
        .execute();
    }

    return {
      ok: true,
      transferId,
      transferNo,
      status: 'pending',
    };
  }

  async acceptInterVanTransfer(tenantId: string, accountId: string, toRepId: number, transferId: number) {
    const transfer = await this.anyDb
      .selectFrom('van_stock_transfers')
      .selectAll()
      .where('id', '=', transferId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!transfer) {
      throw new AppError('طلب التحويل غير موجود', 'TRANSFER_NOT_FOUND', 404);
    }
    if (Number(transfer.to_rep_id) !== toRepId) {
      throw new AppError('غير مصرح لك بقبول هذا التحويل', 'UNAUTHORIZED_TRANSFER', 403);
    }
    if (transfer.status !== 'pending') {
      throw new AppError(`طلب التحويل تمت معالجته مسبقاً (${transfer.status})`, 'ALREADY_PROCESSED', 400);
    }

    const items = await this.anyDb
      .selectFrom('van_stock_transfer_items')
      .selectAll()
      .where('transfer_id', '=', transferId)
      .where('tenant_id', '=', tenantId)
      .execute();

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;

      const sortedItems = this.sortItemsByProductId<{ productId: number; qty: number }>(
        items.map((it: any) => ({ productId: Number(it.product_id), qty: Number(it.qty) })),
      );

      for (const item of sortedItems) {
        const pid = Number(item.productId);
        const qty = Number(item.qty);

        await this.moveVanStock(trx, {
          productId: pid,
          delta: -qty,
          locationId: Number(transfer.from_van_location_id),
          tenantId,
          accountId,
          userId: null,
          movementType: 'van_transfer_out',
          note: `تحويل بضاعة بين سيارتين (${transfer.transfer_no})`,
          referenceType: 'van_stock_transfers',
          referenceId: Number(transfer.id),
          skipGlobalUpdate: false,
        });

        await this.moveVanStock(trx, {
          productId: pid,
          delta: qty,
          locationId: Number(transfer.to_van_location_id),
          tenantId,
          accountId,
          userId: null,
          movementType: 'van_transfer_in',
          note: `استلام بضاعة محولة من سيارة (${transfer.transfer_no})`,
          referenceType: 'van_stock_transfers',
          referenceId: Number(transfer.id),
          skipGlobalUpdate: false,
        });
      }

      await trxAny
        .updateTable('van_stock_transfers')
        .set({
          status: 'accepted',
          accepted_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', transferId)
        .where('tenant_id', '=', tenantId)
        .execute();
    });

    return { ok: true, transferId, status: 'accepted' };
  }

  async rejectInterVanTransfer(tenantId: string, toRepId: number, transferId: number, reason?: string) {
    const transfer = await this.anyDb
      .selectFrom('van_stock_transfers')
      .selectAll()
      .where('id', '=', transferId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!transfer) {
      throw new AppError('طلب التحويل غير موجود', 'TRANSFER_NOT_FOUND', 404);
    }
    if (Number(transfer.to_rep_id) !== toRepId) {
      throw new AppError('غير مصرح لك برفض هذا التحويل', 'UNAUTHORIZED_TRANSFER', 403);
    }
    if (transfer.status !== 'pending') {
      throw new AppError(`طلب التحويل تمت معالجته مسبقاً (${transfer.status})`, 'ALREADY_PROCESSED', 400);
    }

    await this.anyDb
      .updateTable('van_stock_transfers')
      .set({
        status: 'rejected',
        rejected_at: sql`NOW()`,
        notes: sql`concat(coalesce(notes, ''), ' [تم الرفض: ', ${reason || 'بواسطة المندوب المستلم'}, ']')`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', transferId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, transferId, status: 'rejected' };
  }

  async listInterVanTransfers(
    tenantId: string,
    filters?: { repId?: number; status?: string },
  ) {
    let query = this.anyDb
      .selectFrom('van_stock_transfers as vst')
      .innerJoin('delivery_representatives as from_rep', 'from_rep.id', 'vst.from_rep_id')
      .innerJoin('delivery_representatives as to_rep', 'to_rep.id', 'vst.to_rep_id')
      .select([
        'vst.id',
        'vst.transfer_no as transferNo',
        'vst.from_rep_id as fromRepId',
        'from_rep.name as fromRepName',
        'vst.to_rep_id as toRepId',
        'to_rep.name as toRepName',
        'vst.status',
        sql<number>`cast(vst.total_items_count as integer)`.as('totalItemsCount'),
        sql<number>`cast(vst.total_qty as numeric)`.as('totalQty'),
        'vst.notes',
        'vst.created_at as createdAt',
        'vst.accepted_at as acceptedAt',
        'vst.rejected_at as rejectedAt',
      ])
      .where('vst.tenant_id', '=', tenantId);

    if (filters?.repId) {
      query = query.where((eb: any) =>
        eb.or([
          eb('vst.from_rep_id', '=', filters.repId),
          eb('vst.to_rep_id', '=', filters.repId),
        ]),
      );
    }
    if (filters?.status) {
      query = query.where('vst.status', '=', filters.status);
    }

    const rows = await query.orderBy('vst.created_at', 'desc').limit(200).execute();

    const transferIds = rows.map((r: any) => Number(r.id));
    const itemsMap = new Map<number, any[]>();
    if (transferIds.length > 0) {
      const items = await this.anyDb
        .selectFrom('van_stock_transfer_items as vsti')
        .innerJoin('products as p', 'p.id', 'vsti.product_id')
        .select([
          'vsti.transfer_id as transferId',
          'vsti.product_id as productId',
          'p.name as productName',
          'p.barcode as barcode',
          sql<number>`cast(vsti.qty as numeric)`.as('qty'),
          sql<number>`cast(vsti.unit_price as numeric)`.as('unitPrice'),
        ])
        .where('vsti.transfer_id', 'in', transferIds)
        .where('vsti.tenant_id', '=', tenantId)
        .execute();

      for (const it of items) {
        const tId = Number(it.transferId);
        const list = itemsMap.get(tId) || [];
        list.push(it);
        itemsMap.set(tId, list);
      }
    }

    return rows.map((r: any) => ({
      ...r,
      items: itemsMap.get(Number(r.id)) || [],
    }));
  }

  // =========================================================================
  // 6. SUPERVISOR ROUTE KPIS & PERFORMANCE INTELLIGENCE
  // =========================================================================

  async getSupervisorRouteKpis(tenantId: string, dateFrom?: string, dateTo?: string) {
    let visitQuery = this.anyDb
      .selectFrom('van_field_visits as vfv')
      .select([
        'vfv.id',
        'vfv.visit_type as visitType',
        'vfv.negative_reason as negativeReason',
        'vfv.customer_id as customerId',
        'vfv.rep_id as repId',
      ])
      .where('vfv.tenant_id', '=', tenantId);

    if (dateFrom) visitQuery = visitQuery.where('vfv.visited_at', '>=', dateFrom);
    if (dateTo) visitQuery = visitQuery.where('vfv.visited_at', '<=', `${dateTo} 23:59:59`);

    const visits = await visitQuery.execute();

    const totalVisits = visits.length;
    const positiveVisits = visits.filter((v: any) => v.visitType === 'positive').length;
    const negativeVisits = visits.filter((v: any) => v.visitType === 'negative').length;
    const strikeRate = totalVisits > 0 ? Number(((positiveVisits / totalVisits) * 100).toFixed(1)) : 0;

    const reasonsMap: Record<string, number> = {
      no_cash: 0,
      shop_closed: 0,
      sufficient_stock: 0,
      item_unavailable: 0,
      postponed: 0,
      other: 0,
    };
    for (const v of visits) {
      if (v.visitType === 'negative' && v.negativeReason) {
        reasonsMap[v.negativeReason] = (reasonsMap[v.negativeReason] || 0) + 1;
      }
    }

    const custNegatives: Record<number, number> = {};
    for (const v of visits) {
      if (v.visitType === 'negative') {
        custNegatives[Number(v.customerId)] = (custNegatives[Number(v.customerId)] || 0) + 1;
      }
    }
    const repeatedNegativeCustomersCount = Object.values(custNegatives).filter((cnt) => cnt >= 3).length;

    const fuelLogs = await this.listFuelLogs(tenantId, { dateFrom, dateTo });
    const totalFuelLiters = fuelLogs.reduce((sum: number, f: any) => sum + Number(f.liters || 0), 0);
    const totalFuelCost = fuelLogs.reduce((sum: number, f: any) => sum + Number(f.totalCost || 0), 0);
    const totalKmDriven = fuelLogs.reduce((sum: number, f: any) => sum + Number(f.kmSinceLastFuel || 0), 0);
    const avgConsumptionRate = totalFuelLiters > 0 && totalKmDriven > 0
      ? Number((totalKmDriven / totalFuelLiters).toFixed(2))
      : 0;

    const alertsRes = await this.getFleetMaintenanceAlerts(tenantId);
    const alerts = alertsRes.alerts || [];

    return {
      totalVisits,
      positiveVisits,
      negativeVisits,
      strikeRate,
      negativeReasonsBreakdown: reasonsMap,
      repeatedNegativeCustomersCount,
      totalFuelLiters,
      totalFuelCost,
      totalKmDriven,
      avgConsumptionRate,
      alertsCount: alerts.length,
      alerts,
    };
  }

  async setCustomerRouteSchedule(
    tenantId: string,
    customerId: number,
    payload: {
      route?: string;
      routeSequence?: number;
      visitDays?: string[];
      customerCode?: string;
      locationUrl?: string;
    },
  ) {
    const cust = await this.anyDb
      .selectFrom('customers')
      .select(['id', 'metadata'])
      .where('id', '=', customerId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!cust) throw new AppError('العميل غير موجود', 'CUSTOMER_NOT_FOUND', 404);

    const existingMeta = typeof cust.metadata === 'object' && cust.metadata !== null ? cust.metadata : {};
    const updatedMeta = {
      ...existingMeta,
      ...(payload.route !== undefined ? { route: payload.route } : {}),
      ...(payload.routeSequence !== undefined ? { route_sequence: payload.routeSequence } : {}),
      ...(payload.visitDays !== undefined ? { visit_days: payload.visitDays } : {}),
      ...(payload.customerCode !== undefined ? { customer_code: payload.customerCode } : {}),
      ...(payload.locationUrl !== undefined ? { location_url: payload.locationUrl } : {}),
    };

    await this.anyDb
      .updateTable('customers')
      .set({
        metadata: JSON.stringify(updatedMeta),
        updated_at: sql`NOW()`,
      })
      .where('id', '=', customerId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, customerId, metadata: updatedMeta };
  }

  async getPeerReps(tenantId: string, currentRepId: number) {
    const rows = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name', 'phone', 'vehicle_plate'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where('id', '!=', currentRepId)
      .orderBy('name', 'asc')
      .execute();

    return rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      phone: r.phone || '',
      vehiclePlate: r.vehicle_plate || '',
    }));
  }

  /**
   * Generates a collision-proof, tenant-scoped daily sequence number (0001, 0002, ...)
   * strictly adhering to the Universal Document Numbering Standard (PREFIX-YYMMDD-XXXX).
   * Automatically resets to 0001 every single day, and guards against legacy high IDs.
   */
  private async generateDailySequenceNumber(
    trxOrDb: any,
    tableName: string,
    columnName: string,
    prefix: string,
    tenantId: string,
    date = new Date(),
  ): Promise<string> {
    const dailyPrefix = getDailyDocumentPrefix(prefix, date);

    // Advisory transaction lock to prevent concurrent races for this tenant + daily prefix
    try {
      await trxOrDb.executeQuery(
        sql`SELECT pg_advisory_xact_lock(hashtext(${'daily_seq_' + tenantId + '_' + dailyPrefix}))`.compile(this.db),
      );
    } catch {
      // Fallback if advisory lock is not supported in test mocks
    }

    let lastSeq = 0;
    if (tableName === 'customer_payments') {
      const res = await trxOrDb
        .selectFrom('customer_payments')
        .select(
          sql<number>`COALESCE(MAX(
            CASE WHEN note ~ ${'#' + dailyPrefix + '[0-9]{1,4}\\)'}
                 THEN CAST(SUBSTRING(note FROM ${'#' + dailyPrefix + '([0-9]{1,4})\\)'}) AS INTEGER)
                 ELSE 0 END
          ), 0)`.as('last_seq'),
        )
        .where('tenant_id', '=', tenantId)
        .where('note', 'like', `%#${dailyPrefix}%`)
        .executeTakeFirst();
      lastSeq = Number(res?.last_seq || 0);
    } else {
      const res = await trxOrDb
        .selectFrom(tableName)
        .select(
          sql<number>`COALESCE(MAX(
            CASE WHEN ${sql.ref(columnName)} ~ ${'^' + dailyPrefix + '[0-9]{1,4}$'}
                 THEN CAST(SPLIT_PART(${sql.ref(columnName)}, '-', 3) AS INTEGER)
                 ELSE 0 END
          ), 0)`.as('last_seq'),
        )
        .where('tenant_id', '=', tenantId)
        .where(sql.ref(columnName), 'like', `${dailyPrefix}%`)
        .executeTakeFirst();
      lastSeq = Number(res?.last_seq || 0);
    }

    const nextSeq = lastSeq + 1;
    return formatDailyDocumentNumber(prefix, nextSeq, date);
  }
}

