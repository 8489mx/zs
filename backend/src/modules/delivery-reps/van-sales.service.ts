import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AppError } from '../../common/errors/app-error';
import { boundedPage } from '../../common/utils/bounded-page';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { DeliveryRepsService } from './delivery-reps.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import {
  reconcileTripFinancials,
  reconcileVanStockAudit,
  evaluateCreditLimitCheck,
  evaluateOdometerReadings,
  evaluateMakerCheckerSettlement,
  evaluateNightStockRetention,
} from './van-trip-reconciliation.engine';
import {
  sortItemsByProductId,
  moveVanStock,
  getOrCreateVanLocation,
  generateDailySequenceNumber,
  getMonthlyOfficialHolidayDates,
  FLEET_VEHICLE_STATUSES,
} from './services/van-common.util';
import { calculateRepTargetMetrics, type RepTargetCalculationResult } from './rep-target.engine';
import { VanFleetService } from './services/van-fleet.service';
import { VanRequisitionsService } from './services/van-requisitions.service';
import { VanReturnsService } from './services/van-returns.service';
import { VanTargetsService } from './services/van-targets.service';
import { VanTransfersService } from './services/van-transfers.service';
import { VanRoutesService } from './services/van-routes.service';

export interface VanStockItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  mainWarehouseQty?: number;
  costPrice: number;
  retailPrice: number;
  unitName?: string;
  originalPrice?: number;
  discountPerUnit?: number;
  hasActiveOffer?: boolean;
  offerBadge?: string;
  packagingUnit?: { name: string; multiplier: number };
  availableUnits?: { id: number; name: string; multiplier: number; isBase: boolean }[];
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
  status: 'open' | 'settled' | string;
  settlementStatus?: 'open' | 'submitted_by_rep' | 'settled' | string;
  openedAt: string;
  closedAt?: string;
  submittedAt?: string;
  loadedAmount: number;
  salesAmount: number;
  cashCollected: number;
  creditSales: number;
  returnsAmount: number;
  cashRefunds?: number;
  variance: number;
  distanceKm?: number;
  stockVarianceAmount?: number;
  nightStockApproved?: boolean;
  notes?: string;
}

@Injectable()
export class VanSalesService {
  static readonly FLEET_VEHICLE_STATUSES = FLEET_VEHICLE_STATUSES;

  private readonly vanFleetService: VanFleetService;
  private readonly vanRequisitionsService: VanRequisitionsService;
  private readonly vanReturnsService: VanReturnsService;
  private readonly vanTargetsService: VanTargetsService;
  private readonly vanTransfersService: VanTransfersService;
  private readonly vanRoutesService: VanRoutesService;

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
    private readonly deliveryRepsService: DeliveryRepsService,
    private readonly accountingPosting: AccountingPostingService,
    vanFleetService?: VanFleetService,
    vanRequisitionsService?: VanRequisitionsService,
    vanReturnsService?: VanReturnsService,
    vanTargetsService?: VanTargetsService,
    vanTransfersService?: VanTransfersService,
    vanRoutesService?: VanRoutesService,
  ) {
    this.vanFleetService = vanFleetService ?? new VanFleetService(db);
    this.vanRequisitionsService = vanRequisitionsService ?? new VanRequisitionsService(db);
    this.vanReturnsService = vanReturnsService ?? new VanReturnsService(db, accountingPosting);
    this.vanTargetsService = vanTargetsService ?? new VanTargetsService(db);
    this.vanTransfersService = vanTransfersService ?? new VanTransfersService(db);
    this.vanRoutesService = vanRoutesService ?? new VanRoutesService(db, this.vanFleetService);
  }

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
    return sortItemsByProductId(items);
  }

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
      skipGlobalUpdate: boolean;
      unitCost?: number;
    },
  ): Promise<{ scopeBefore: number; scopeAfter: number }> {
    return moveVanStock(trx, params);
  }

  async getOrCreateVanLocation(repId: number, tenantId: string, accountId: string): Promise<{ id: number; name: string }> {
    return getOrCreateVanLocation(this.db, repId, tenantId, accountId);
  }

  private async generateDailySequenceNumber(
    trxOrDb: any,
    tableName: string,
    columnName: string,
    prefix: string,
    tenantId: string,
    date = new Date(),
  ): Promise<string> {
    return generateDailySequenceNumber(trxOrDb, this.db, tableName, columnName, prefix, tenantId, date);
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
    sales?: any[];
    collections?: any[];
    returns?: any[];
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
        'vt.settlement_status as settlementStatus',
        'vt.opened_at as openedAt',
        'vt.closed_at as closedAt',
        'vt.submitted_at as submittedAt',
        sql<number>`cast(coalesce(vt.loaded_amount, 0) as numeric)`.as('loadedAmount'),
        sql<number>`cast(coalesce(vt.sales_amount, 0) as numeric)`.as('salesAmount'),
        sql<number>`cast(coalesce(vt.cash_collected, 0) as numeric)`.as('cashCollected'),
        sql<number>`cast(coalesce(vt.credit_sales, 0) as numeric)`.as('creditSales'),
        sql<number>`cast(coalesce(vt.returns_amount, 0) as numeric)`.as('returnsAmount'),
        sql<number>`cast(coalesce(vt.cash_refunds, 0) as numeric)`.as('cashRefunds'),
        sql<number>`cast(coalesce(vt.variance, 0) as numeric)`.as('variance'),
        sql<number>`cast(coalesce(vt.distance_km, 0) as numeric)`.as('distanceKm'),
        sql<number>`cast(coalesce(vt.stock_variance_amount, 0) as numeric)`.as('stockVarianceAmount'),
        'vt.night_stock_approved as nightStockApproved',
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

    // Query active promotional offers for van inventory items
    const prodIds = invRows.map((r: any) => Number(r.productId)).filter((id: number) => id > 0);
    const todayIso = new Date().toISOString().slice(0, 10);
    const activeOffers = prodIds.length > 0
      ? await this.anyDb
          .selectFrom('product_offers')
          .select(['id', 'product_id', 'offer_type', 'value', 'start_date', 'end_date', 'min_qty'])
          .where('product_id', 'in', prodIds)
          .where('tenant_id', '=', tenantId)
          .where('is_active', '=', true)
          .where((eb: any) =>
            eb.and([
              eb.or([eb('start_date', 'is', null), eb('start_date', '<=', todayIso)]),
              eb.or([eb('end_date', 'is', null), eb('end_date', '>=', todayIso)]),
            ])
          )
          .orderBy('id', 'desc')
          .execute()
      : [];

    const offersByProdId = new Map<number, any>();
    for (const off of activeOffers) {
      const pid = Number(off.product_id);
      if (!offersByProdId.has(pid)) {
        offersByProdId.set(pid, off);
      }
    }

    // Query product units for multi-UOM field sales
    const rawUnits = prodIds.length > 0
      ? await this.anyDb
          .selectFrom('product_units')
          .select(['id', 'product_id', 'name', 'multiplier', 'is_base_unit'])
          .where('product_id', 'in', prodIds)
          .orderBy('multiplier', 'asc')
          .execute()
      : [];

    const unitsByProdId = new Map<number, any[]>();
    for (const u of rawUnits) {
      const pid = Number(u.product_id);
      if (!unitsByProdId.has(pid)) unitsByProdId.set(pid, []);
      unitsByProdId.get(pid)!.push({
        id: Number(u.id),
        name: u.name,
        multiplier: Number(u.multiplier || 1),
        isBase: Boolean(u.is_base_unit) || Number(u.multiplier) === 1,
      });
    }

    const inventory: VanStockItem[] = invRows.map((r: any) => {
      const pid = Number(r.productId);
      const baseRetail = Number(r.retailPrice || 0);
      const offer = offersByProdId.get(pid);
      const availUnits = unitsByProdId.get(pid) || [];
      const packUnitObj = availUnits.find((u) => u.multiplier > 1);
      let effectiveRetail = baseRetail;
      let discountPerUnit = 0;
      let offerBadge: string | undefined;

      if (offer) {
        const offVal = Number(offer.value || 0);
        if (offer.offer_type === 'percent' && offVal > 0) {
          discountPerUnit = Number(((baseRetail * offVal) / 100).toFixed(2));
          effectiveRetail = Math.max(0, Number((baseRetail - discountPerUnit).toFixed(2)));
          offerBadge = `خصم ${offVal}%`;
        } else if (offer.offer_type === 'fixed' && offVal > 0) {
          discountPerUnit = Math.min(baseRetail, offVal);
          effectiveRetail = Math.max(0, Number((baseRetail - discountPerUnit).toFixed(2)));
          offerBadge = `خصم ${offVal} ج.م`;
        } else if (offer.offer_type === 'price' && offVal > 0) {
          effectiveRetail = offVal;
          discountPerUnit = Math.max(0, Number((baseRetail - effectiveRetail).toFixed(2)));
          offerBadge = `سعر عرض خاص`;
        }
      }

      return {
        productId: pid,
        productName: r.productName || `صنف #${pid}`,
        barcode: r.barcode || '',
        qty: Number(r.qty || 0),
        mainWarehouseQty: mainStockMap.get(pid) || 0,
        costPrice: Number(r.costPrice || 0),
        retailPrice: effectiveRetail,
        originalPrice: offer && discountPerUnit > 0 ? baseRetail : undefined,
        discountPerUnit: discountPerUnit > 0 ? discountPerUnit : undefined,
        hasActiveOffer: Boolean(offer && discountPerUnit > 0),
        offerBadge,
        unitName: r.unitName || 'قطعة',
        packagingUnit: packUnitObj ? { name: packUnitObj.name, multiplier: packUnitObj.multiplier } : undefined,
        availableUnits: availUnits.length > 0 ? availUnits : undefined,
      };
    });

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

    // Fetch sales, collections and returns on this trip
    let recentSales: any[] = [];
    let tripCollections: any[] = [];
    let tripReturns: any[] = [];
    if (tripRow?.id) {
      const rawSales = await this.anyDb
        .selectFrom('sales as s')
        .leftJoin('customers as c', 'c.id', 's.customer_id')
        .select([
          's.id',
          's.doc_no as docNo',
          sql<number>`cast(s.total as double precision)`.as('total'),
          sql<number>`cast(coalesce(s.subtotal, s.total) as double precision)`.as('subtotal'),
          sql<number>`cast(coalesce(s.discount, 0) as double precision)`.as('discount'),
          's.payment_type as paymentMethod',
          's.created_at as createdAt',
          'c.name as customerName',
        ])
        .where('s.tenant_id', '=', tenantId)
        .where(sql<boolean>`s.van_trip_id = ${Number(tripRow.id)}`)
        .orderBy('s.id', 'desc')
        .limit(100)
        .execute();

      recentSales = rawSales.map((s: any) => ({
        ...s,
        id: Number(s.id),
        total: Number(s.total || 0),
        subtotal: Number(s.subtotal || s.total || 0),
        discount: Number(s.discount || 0),
      }));

      tripCollections = await this.anyDb
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
        .where(sql<boolean>`cl.van_trip_id = ${Number(tripRow.id)}`)
        .where('cl.entry_type', '=', 'payment')
        .orderBy('cl.id', 'desc')
        .execute();

      tripReturns = await this.anyDb
        .selectFrom('van_field_returns as vfr')
        .leftJoin('customers as c', 'c.id', 'vfr.customer_id')
        .select([
          'vfr.id',
          'vfr.doc_no as docNo',
          sql<number>`cast(coalesce(vfr.total_amount, 0) as numeric)`.as('totalAmount'),
          'vfr.return_reason as returnReason',
          'vfr.refund_method as refundMethod',
          'vfr.status',
          'vfr.created_at as createdAt',
          sql<string>`coalesce(c.name, '')`.as('customerName'),
        ])
        .where('vfr.tenant_id', '=', tenantId)
        .where(sql<boolean>`vfr.trip_id = ${Number(tripRow.id)}`)
        .orderBy('vfr.id', 'desc')
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

    const officialHolidays = await getMonthlyOfficialHolidayDates(this.anyDb, tenantId, startOfMonth, endOfMonth);

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
      cashRefunds: Number((tripRow as any).cashRefunds || 0),
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
      sales: recentSales,
      collections: tripCollections,
      returns: tripReturns,
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
    let totalLoadedCost = 0;
    let createdTripId = 0;
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

          // CANONICAL LOCK ORDER: Lock products first!
          const prod = await trxAny
            .selectFrom('products')
            .select(['id', 'name', 'cost_price', 'retail_price'])
            .where('id', '=', pid)
            .where('tenant_id', '=', tenantId)
            .forUpdate()
            .executeTakeFirst();

          if (!prod) {
            throw new AppError(`الصنف رقم #${pid} غير موجود في النظام`, 'PRODUCT_NOT_FOUND', 404);
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
            throw new AppError(
              `رصيد المستودع المصدر لا يكفي للصنف "${prod?.name || pid}". المتوفر: ${avail}، المطلوب: ${qty}`,
              'INSUFFICIENT_SOURCE_STOCK',
              400,
            );
          }

          const price = Number(prod?.retail_price || 0);
          const cost = Number(prod?.cost_price || 0);
          totalLoadedValue += price * qty;
          totalLoadedCost += cost * qty;

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
            unitCost: cost,
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
            unitCost: cost,
          });
        }
      } else {
        // Start trip with existing stock already in van
        const existingStock = await trxAny
          .selectFrom('product_location_stock as pls')
          .innerJoin('products as p', 'p.id', 'pls.product_id')
          .select([
            sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
            sql<number>`cast(coalesce(p.retail_price, 0) as numeric)`.as('retailPrice'),
            sql<number>`cast(coalesce(p.cost_price, 0) as numeric)`.as('costPrice'),
          ])
          .where('pls.location_id', '=', vanLoc.id)
          .where('pls.tenant_id', '=', tenantId)
          .where(sql<boolean>`cast(pls.qty as numeric) > 0`)
          .execute();

        for (const s of existingStock) {
          totalLoadedValue += Number(s.qty || 0) * Number(s.retailPrice || 0);
          totalLoadedCost += Number(s.qty || 0) * Number(s.costPrice || 0);
        }
      }

      const insertedTrip = await trxAny
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
          settlement_status: 'open',
          loaded_amount: Number(totalLoadedValue.toFixed(2)),
          sales_amount: 0,
          cash_collected: 0,
          credit_sales: 0,
          returns_amount: 0,
          variance: 0,
          notes: payload.notes || (hasItemsToLoad ? 'تحميل وتجهيز بضاعة الصباح لرحلة التوزيع الميداني' : 'بدء رحلة التوزيع بالبضاعة المتوفرة بالسيارة'),
          opened_at: sql`NOW()`,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      createdTripId = Number(insertedTrip.id);

      // Post van loading stock transfer journal
      if (hasItemsToLoad && totalLoadedCost > 0) {
        const systemAuth = await this.resolveSystemAuthContext(tenantId, accountId);
        const vanLocRow = await trxAny
          .selectFrom('stock_locations')
          .select(['branch_id'])
          .where('id', '=', vanLoc.id)
          .where('tenant_id', '=', tenantId)
          .executeTakeFirst();
        const branchId = vanLocRow?.branch_id ? Number(vanLocRow.branch_id) : null;
        await this.accountingPosting.postVanStockTransfer(
          trx,
          createdTripId,
          {
            sourceLocationId: sourceLocId || vanLoc.id,
            targetLocationId: vanLoc.id,
            totalCost: totalLoadedCost,
            branchId,
            type: 'load',
          },
          systemAuth,
        );
      }
    });

    return {
      ok: true,
      tripId: createdTripId,
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
      items: {
        productId: number;
        qty: number;
        unitPrice?: number;
        unitName?: string;
        unitMultiplier?: number;
        isBonus?: boolean;
        bonusReason?: string;
        originalPrice?: number;
      }[];
      notes?: string;
      deliveryGpsLat?: number;
      deliveryGpsLng?: number;
      deliveryProofPhoto?: string;
      packagingBreakdown?: { cartonsCount?: number; piecesCount?: number; itemsCount?: number };
      clientTxId?: string;
      supervisorOverridePin?: string;
      supervisorOverrideReason?: string;
    },
  ): Promise<{
    ok: boolean;
    saleId: number;
    docNo: string;
    total: number;
    subtotal?: number;
    discount?: number;
    paymentMethod: string;
    customerName: string;
    itemsCount: number;
    cashPaid?: number;
    creditOwed?: number;
  }> {
    if (!payload.items || !payload.items.length) {
      throw new AppError('يجب تحديد صنف واحد على الأقل لإصدار الفاتورة', 'EMPTY_SALE_ITEMS', 400);
    }

    // Idempotency: Prevent duplicate sale posting if offline queue retries
    if (payload.clientTxId) {
      const existingSale = await this.anyDb
        .selectFrom('sales')
        .select(['id', 'doc_no', 'total', 'payment_type'])
        .where('tenant_id', '=', tenantId)
        .where('van_trip_id', '=', payload.tripId)
        .where('note', 'like', `%[tx:${payload.clientTxId}]%`)
        .executeTakeFirst();

      if (existingSale) {
        return {
          ok: true,
          saleId: Number(existingSale.id),
          docNo: existingSale.doc_no,
          total: Number(existingSale.total),
          paymentMethod: existingSale.payment_type || payload.paymentMethod,
          customerName: payload.customerName || 'عميل نقدي ميداني',
          itemsCount: payload.items.length,
          cashPaid: 0,
          creditOwed: 0,
        };
      }
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
    let subtotalSale = 0;
    let discountSale = 0;
    let createdSaleId = 0;
    let cashPaid = 0;
    let creditOwed = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;
      const saleItemRecords: any[] = [];
      const sortedItems = this.sortItemsByProductId(payload.items);
      const productIds = sortedItems.map((it) => Number(it.productId));
      const nowIso = new Date().toISOString().slice(0, 10);

      const rawOffers = productIds.length > 0 ? await trxAny
        .selectFrom('product_offers')
        .select(['product_id', 'offer_type', 'value', 'min_qty', 'start_date', 'end_date'])
        .where('product_id', 'in', productIds)
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .execute() : [];

      const offersByProduct = new Map<number, any[]>();
      for (const off of rawOffers) {
        const pId = Number(off.product_id);
        const start = off.start_date ? String(off.start_date).slice(0, 10) : null;
        const end = off.end_date ? String(off.end_date).slice(0, 10) : null;
        if ((!start || start <= nowIso) && (!end || end >= nowIso)) {
          if (!offersByProduct.has(pId)) offersByProduct.set(pId, []);
          offersByProduct.get(pId)!.push(off);
        }
      }

      for (const item of sortedItems) {
        const pid = Number(item.productId);
        const inputQty = Number(item.qty || 0);
        if (inputQty <= 0) continue;

        const multiplier = Number((item as any).unitMultiplier || 1);
        const unitName = (item as any).unitName || null;
        const isBonus = Boolean((item as any).isBonus);
        const bonusReason = (item as any).bonusReason || (isBonus ? 'بونص ترويجي / عينة مجانية' : null);
        const baseQty = Number((inputQty * multiplier).toFixed(4));

        // CANONICAL LOCK ORDER: Lock products first!
        const prod = await trxAny
          .selectFrom('products')
          .select(['id', 'name', 'cost_price', 'retail_price', 'wholesale_price', 'credit_price', 'consumer_price'])
          .where('id', '=', pid)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        if (!prod) {
          throw new AppError(`الصنف رقم #${pid} غير موجود في النظام`, 'PRODUCT_NOT_FOUND', 404);
        }

        const vanStock = await trxAny
          .selectFrom('product_location_stock')
          .select(['id', 'qty'])
          .where('product_id', '=', pid)
          .where('location_id', '=', vanLocId)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        const currentQty = Number(vanStock?.qty || 0);
        if (currentQty < baseQty) {
          throw new AppError(
            `رصيد سيارة التوزيع لا يكفي للصنف "${prod.name || pid}". المتوفر بالسيارة: ${currentQty} قطعة، المطلوب: ${baseQty} قطعة (${inputQty} ${unitName || 'وحدة'})`,
            'INSUFFICIENT_VAN_STOCK',
            400,
          );
        }

        // O27: name, price and cost must come from this tenant's product, never from a foreign row.
        // A van sale leaves the company for good, so unlike a load it DOES reduce global stock.
        await this.moveVanStock(trx, {
          productId: pid,
          delta: -baseQty,
          locationId: vanLocId,
          tenantId,
          accountId,
          userId: null,
          movementType: 'van_sale',
          note: isBonus ? 'صرف بونص ترويجي من سيارة التوزيع' : 'بيع من سيارة التوزيع',
          referenceType: 'van_sales_trip',
          referenceId: Number(trip?.id || 0),
          skipGlobalUpdate: false,
          unitCost: Number(prod.cost_price || 0),
        });

        const isCreditSale = payload.paymentMethod === 'credit' || payload.paymentMethod === 'split';
        const defaultBasePrice = isCreditSale && prod.credit_price != null && Number(prod.credit_price) > 0
          ? Number(prod.credit_price)
          : Number(prod.retail_price || 0);

        let unitPrice = item.unitPrice ? Number(item.unitPrice) : defaultBasePrice * multiplier;
        let pricingTierType: 'cash' | 'credit' | 'offer' | 'bonus' = isBonus ? 'bonus' : (isCreditSale ? 'credit' : 'cash');
        let unitOfferSavings = 0;

        if (isBonus) {
          unitPrice = 0;
          pricingTierType = 'bonus';
        } else if (!item.unitPrice) {
          const activeOffers = offersByProduct.get(pid) || [];
          const matchingOffer = activeOffers
            .filter((off) => baseQty >= Math.max(1, Number(off.min_qty || 1)))
            .sort((a, b) => Number(b.min_qty || 0) - Number(a.min_qty || 0))[0];

          if (matchingOffer) {
            const offerVal = Number(matchingOffer.value || 0);
            if (matchingOffer.offer_type === 'percent' && offerVal > 0) {
              const discountedBase = Math.max(0, Number((defaultBasePrice * (1 - offerVal / 100)).toFixed(2)));
              unitPrice = Number((discountedBase * multiplier).toFixed(2));
              pricingTierType = 'offer';
              unitOfferSavings = Math.max(0, Number(((defaultBasePrice * multiplier) - unitPrice).toFixed(2)));
            } else if (matchingOffer.offer_type === 'fixed' && offerVal > 0) {
              const discountedBase = Math.max(0, Number((defaultBasePrice - offerVal).toFixed(2)));
              unitPrice = Number((discountedBase * multiplier).toFixed(2));
              pricingTierType = 'offer';
              unitOfferSavings = Math.max(0, Number(((defaultBasePrice * multiplier) - unitPrice).toFixed(2)));
            } else if (matchingOffer.offer_type === 'price' && offerVal > 0) {
              unitPrice = Number((offerVal * multiplier).toFixed(2));
              pricingTierType = 'offer';
              unitOfferSavings = Math.max(0, Number(((defaultBasePrice * multiplier) - unitPrice).toFixed(2)));
            }
          }
        }

        const originalPrice = (item as any).originalPrice
          ? Number((item as any).originalPrice)
          : (isBonus ? defaultBasePrice * multiplier : Math.max(unitPrice, defaultBasePrice * multiplier));
        const lineTotal = Number((unitPrice * inputQty).toFixed(2));
        const lineSubtotal = Number((originalPrice * inputQty).toFixed(2));
        totalSale += lineTotal;
        subtotalSale += lineSubtotal;

        saleItemRecords.push({
          product_id: pid,
          product_name: prod.name || `صنف #${pid}`,
          qty: inputQty,
          unit_price: unitPrice,
          line_total: lineTotal,
          cost_price: Number(prod.cost_price || 0) * multiplier,
          consumer_price: prod.consumer_price != null && Number(prod.consumer_price) > 0 ? Number(prod.consumer_price) * multiplier : null,
          pricing_tier_type: pricingTierType,
          unit_offer_savings: unitOfferSavings,
          unit_name: unitName,
          unit_multiplier: multiplier,
          is_bonus: isBonus,
          bonus_reason: bonusReason,
        });
      }

      if (subtotalSale < totalSale) subtotalSale = totalSale;
      discountSale = Number(Math.max(0, subtotalSale - totalSale).toFixed(2));

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

      // Enforce customer credit limit and credit block in the field
      let isCreditOverridden = false;
      let creditOverrideUserId: number | null = null;
      let creditOverrideReason: string | null = null;

      if ((isCredit || isSplit) && creditOwed > 0 && resolvedCustomerId) {
        const custRecord = await trxAny
          .selectFrom('customers')
          .select(['id', 'name', 'balance', 'credit_limit', 'is_credit_blocked', 'credit_block_reason'])
          .where('id', '=', resolvedCustomerId)
          .where('tenant_id', '=', tenantId)
          .forUpdate()
          .executeTakeFirst();

        if (custRecord) {
          let supervisorOverrideApproved = false;
          let overrideSupervisorName = '';
          let overrideSupervisorId: number | null = null;

          if (payload.supervisorOverridePin) {
            const supervisorUser = await trxAny
              .selectFrom('users')
              .select(['id', 'role', sql<string>`coalesce(display_name, username)`.as('name')])
              .where('tenant_id', '=', tenantId)
              .where('is_active', '=', true)
              .where(sql<boolean>`(role in ('admin', 'supervisor', 'super_admin') or permissions_json::text ilike '%deliveryReps%' or permissions_json::text ilike '%sales%')`)
              .where(sql<boolean>`(pin = ${payload.supervisorOverridePin} or pin_hash = ${payload.supervisorOverridePin})`)
              .executeTakeFirst();

            if (supervisorUser) {
              supervisorOverrideApproved = true;
              overrideSupervisorId = Number(supervisorUser.id);
              overrideSupervisorName = supervisorUser.name;
            } else {
              throw new AppError('رمز اعتماد المشرف (PIN) غير صحيح أو غير مصرح له بتجاوز الائتمان', 'INVALID_SUPERVISOR_PIN', 403);
            }
          }

          const creditCheck = evaluateCreditLimitCheck({
            customerId: resolvedCustomerId,
            customerName: custRecord.name || customerName,
            currentBalance: Number(custRecord.balance || 0),
            creditLimit: Number(custRecord.credit_limit || 0),
            isCreditBlocked: Boolean(custRecord.is_credit_blocked),
            creditBlockReason: custRecord.credit_block_reason,
            requestedCreditAmount: creditOwed,
            supervisorOverride: supervisorOverrideApproved ? {
              approved: true,
              supervisorId: overrideSupervisorId || undefined,
              supervisorName: overrideSupervisorName,
              reason: payload.supervisorOverrideReason || `اعتماد استثنائي من المشرف ${overrideSupervisorName}`,
            } : undefined,
          });

          if (!creditCheck.allowed) {
            throw new AppError(
              creditCheck.errorMessageAr || 'تم رفض العملية لتجاوز سقف الائتمان للعميل',
              creditCheck.reasonCode || 'CREDIT_LIMIT_REJECTED',
              422,
            );
          }

          if (creditCheck.isOverridden) {
            isCreditOverridden = true;
            creditOverrideUserId = overrideSupervisorId;
            creditOverrideReason = creditCheck.overrideReason || null;
          }
        }
      }

      const tempDocNo = `TMP-VAN-${Date.now()}`;
      const insertedSale = await trxAny
        .insertInto('sales')
        .values({
          doc_no: tempDocNo,
          total: totalSale,
          subtotal: subtotalSale,
          discount: discountSale,
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
          is_credit_overridden: isCreditOverridden,
          credit_override_by_user_id: creditOverrideUserId,
          credit_override_reason: creditOverrideReason,
          note: payload.clientTxId
            ? `${payload.notes || 'فاتورة بيع ميداني من سيارة المندوب'} [tx:${payload.clientTxId}]`
            : payload.notes || `فاتورة بيع ميداني من سيارة المندوب`,
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
            consumer_price: it.consumer_price,
            pricing_tier_type: it.pricing_tier_type,
            unit_offer_savings: it.unit_offer_savings,
            unit_name: it.unit_name || 'قطعة',
            unit_multiplier: it.unit_multiplier || 1,
            is_bonus: Boolean(it.is_bonus),
            bonus_reason: it.bonus_reason || null,
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
      subtotal: Number(subtotalSale.toFixed(2)),
      discount: Number(discountSale.toFixed(2)),
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
      clientTxId?: string;
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

    // Idempotency: Prevent duplicate collection posting if offline queue retries
    if (payload.clientTxId) {
      const existingPayment = await this.anyDb
        .selectFrom('customer_payments')
        .select(['id', 'amount', 'note'])
        .where('tenant_id', '=', tenantId)
        .where('customer_id', '=', payload.customerId)
        .where('note', 'like', `%[tx:${payload.clientTxId}]%`)
        .executeTakeFirst();

      if (existingPayment) {
        return {
          ok: true,
          receiptNo: existingPayment.note?.match(/#([A-Z0-9-]+)/)?.[1] || 'COL-SYNCED',
          amount: Number(existingPayment.amount),
          customerName: cust.name,
          newBalance: 0,
        };
      }
    }

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
      const finalNote = payload.clientTxId
        ? `${payload.notes || 'سند تحصيل نقدي ميداني بواسطة المندوب'} (#${receiptNo}) [tx:${payload.clientTxId}]`
        : payload.notes || `سند تحصيل نقدي ميداني بواسطة المندوب (#${receiptNo})`;

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
   * Driver submits daily trip closing report (cash handover, odometer reading, and stock unload request).
   * Status transitions to `submitted_by_rep`, pending supervisor review.
   */
  async submitTripSettlement(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      countedCash: number;
      endOdometer?: number;
      unloadRemainingToWarehouse: boolean;
      notes?: string;
    },
  ): Promise<{
    ok: boolean;
    tripId: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
    distanceKm: number;
    status: 'submitted_by_rep';
    message: string;
  }> {
    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .selectAll()
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.rep_id', '=', repId)
      .where((eb: any) => eb.or([eb('vt.status', '=', 'open'), eb('vt.settlement_status', '=', 'open')]))
      .executeTakeFirst();

    if (!trip) {
      throw new AppError('الرحلة غير موجودة أو تم تقديم إقرارها بالفعل', 'TRIP_NOT_FOUND', 404);
    }

    const odometerResult = evaluateOdometerReadings({
      startOdometer: trip.start_odometer,
      endOdometer: payload.endOdometer,
    });

    if (!odometerResult.valid) {
      throw new AppError(odometerResult.errorMessageAr!, 'INVALID_ODOMETER', 400);
    }

    const expectedCash = Number(trip.cash_collected || 0);
    const countedCash = Number(payload.countedCash || 0);
    const variance = Number((countedCash - expectedCash).toFixed(2));

    await this.anyDb
      .updateTable('van_sales_trips')
      .set({
        settlement_status: 'submitted_by_rep',
        submitted_at: sql`NOW()`,
        end_odometer: payload.endOdometer !== undefined ? payload.endOdometer : null,
        distance_km: odometerResult.distanceKm,
        variance,
        notes: payload.notes || `إقرار تصفية مقدم من المندوب بانتظار اعتماد المشرف. عجز/زيادة: ${variance}`,
        updated_at: sql`NOW()`,
      })
      .where('id', '=', payload.tripId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return {
      ok: true,
      tripId: payload.tripId,
      expectedCash,
      countedCash,
      variance,
      distanceKm: odometerResult.distanceKm,
      status: 'submitted_by_rep',
      message: 'تم تسليم إقرار الرحلة والنقدية بنجاح، وبانتظار اعتماد المشرف وأمين المستودع',
    };
  }

  /**
   * Final audit and settlement of a van trip.
   * Can be executed by supervisor/cashier (with Maker-Checker check against the rep).
   * Performs physical stock audit, handles overnight stock (Night Stock), unloads inventory
   * to warehouse if requested, updates fleet vehicle odometer, and posts closing GL journals.
   */
  async settleTrip(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      countedCash: number;
      unloadRemainingToWarehouse: boolean;
      countedStock?: { productId: number; countedQty: number }[];
      nightStockApproved?: boolean;
      nightStockNotes?: string;
      endOdometer?: number;
      chargeStockVarianceToRep?: boolean;
      notes?: string;
    },
    authContext?: AuthContext,
  ): Promise<{
    ok: boolean;
    tripId: number;
    expectedCash: number;
    countedCash: number;
    tripExpenses?: number;
    variance: number;
    stockVarianceAmount: number;
    unloadedItemsCount: number;
    distanceKm: number;
    status: 'settled';
  }> {
    const trip = await this.anyDb
      .selectFrom('van_sales_trips as vt')
      .selectAll()
      .where('vt.id', '=', payload.tripId)
      .where('vt.tenant_id', '=', tenantId)
      .where('vt.rep_id', '=', repId)
      .where('vt.status', '!=', 'settled')
      .executeTakeFirst();

    if (!trip) {
      throw new AppError('الرحلة غير موجودة أو تم تصفيتها واعتمادها بالفعل', 'TRIP_NOT_FOUND', 404);
    }

    // Lookup rep details to check Maker-Checker against linked user
    const rep = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name', 'phone'])
      .where('id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    const actorUserId = authContext?.userId ? Number(authContext.userId) : 0;
    const repUserId = (rep as any)?.user_id ? Number((rep as any).user_id) : null;

    if (authContext) {
      const isSupervisor =
        ['admin', 'super_admin'].includes(authContext.role) ||
        (authContext.permissions &&
          authContext.permissions.some((p: string) =>
            ['deliveryReps', 'sales', 'accounting', 'inventory'].includes(p),
          ));

      const makerChecker = evaluateMakerCheckerSettlement({
        repUserId,
        actorUserId,
        actorRole: authContext.role,
        isSupervisorOrAdmin: Boolean(isSupervisor),
      });

      if (!makerChecker.allowed) {
        throw new AppError(makerChecker.errorMessageAr!, makerChecker.reasonCode!, 403);
      }
    }

    // Odometer validation
    const effectiveEndOdometer = payload.endOdometer !== undefined ? payload.endOdometer : (trip.end_odometer !== null ? Number(trip.end_odometer) : undefined);
    const odometerResult = evaluateOdometerReadings({
      startOdometer: trip.start_odometer,
      endOdometer: effectiveEndOdometer,
    });
    if (!odometerResult.valid) {
      throw new AppError(odometerResult.errorMessageAr!, 'INVALID_ODOMETER', 400);
    }

    // Fetch total trip expenses recorded for this trip
    const tripExpensesRow = await this.anyDb
      .selectFrom('van_trip_expenses')
      .select(sql<number>`cast(coalesce(sum(amount), 0) as numeric)`.as('totalExpenses'))
      .where('trip_id', '=', payload.tripId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    const totalTripExpenses = Number(tripExpensesRow?.totalExpenses || 0);

    const grossCashCollected = Number(trip.cash_collected || 0);
    const expectedCash = Number((grossCashCollected - totalTripExpenses).toFixed(2));
    const countedCash = Number(payload.countedCash || 0);
    const cashVariance = Number((countedCash - expectedCash).toFixed(2));
    let unloadedItemsCount = 0;
    let totalStockVarianceCost = 0;
    let totalUnloadedCost = 0;

    await this.db.transaction().execute(async (trx) => {
      const trxAny = trx as any;

      // 1. Fetch current remaining van stock
      const vanLocationId = Number(trip.van_location_id);
      const remainingStocks = await trxAny
        .selectFrom('product_location_stock as pls')
        .innerJoin('products as p', 'p.id', 'pls.product_id')
        .select([
          'pls.id as stockLocationRecordId',
          'pls.product_id as productId',
          sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
          sql<string>`coalesce(p.name, '')`.as('name'),
          sql<number>`cast(coalesce(p.cost_price, 0) as numeric)`.as('costPrice'),
          sql<number>`cast(coalesce(p.retail_price, 0) as numeric)`.as('retailPrice'),
        ])
        .where('pls.location_id', '=', vanLocationId)
        .where('pls.tenant_id', '=', tenantId)
        .where(sql<boolean>`cast(pls.qty as numeric) > 0`)
        .execute();

      // 2. Physical Stock Audit Reconciliation via pure engine
      const auditItems = remainingStocks.map((rs: any) => {
        const countedMatch = payload.countedStock?.find((cs) => Number(cs.productId) === Number(rs.productId));
        return {
          productId: Number(rs.productId),
          productName: rs.name,
          systemQty: Number(rs.qty),
          countedQty: countedMatch ? Number(countedMatch.countedQty) : undefined,
          costPrice: Number(rs.costPrice),
          retailPrice: Number(rs.retailPrice),
        };
      });

      const stockAuditResult = reconcileVanStockAudit(auditItems);
      totalStockVarianceCost = stockAuditResult.totalStockShortageCost;

      // Deduct missing stock items if shortage was detected
      for (const itemVariance of stockAuditResult.itemVariances) {
        if (itemVariance.status === 'shortage' && itemVariance.varianceQty < 0) {
          const shortageQty = Math.abs(itemVariance.varianceQty);
          await this.moveVanStock(trx, {
            productId: itemVariance.productId,
            delta: -shortageQty,
            locationId: vanLocationId,
            tenantId,
            accountId,
            userId: actorUserId || null,
            movementType: 'van_stock_shortage',
            note: `عجز جرد سيارة توزيع - رحلة #${trip.id}`,
            referenceType: 'van_sales_trip',
            referenceId: Number(trip.id),
            skipGlobalUpdate: false,
            unitCost: itemVariance.costPrice,
          });
        }
      }

      // 3. Night Stock Governance
      const nightStockEval = evaluateNightStockRetention({
        unloadRemainingToWarehouse: payload.unloadRemainingToWarehouse,
        remainingItemsCount: remainingStocks.length,
        nightStockApproved: Boolean(payload.nightStockApproved),
        nightStockNotes: payload.nightStockNotes,
      });

      if (!nightStockEval.allowed) {
        throw new AppError(nightStockEval.errorMessageAr!, 'NIGHT_STOCK_UNAPPROVED', 422);
      }

      // 4. Unload remaining stock to warehouse if requested
      if (payload.unloadRemainingToWarehouse && remainingStocks.length > 0) {
        // Query remaining stock after any shortage deductions, sorted by product_id
        const postAuditStocks = await trxAny
          .selectFrom('product_location_stock as pls')
          .innerJoin('products as p', 'p.id', 'pls.product_id')
          .select([
            'pls.product_id as productId',
            sql<number>`cast(coalesce(pls.qty, 0) as numeric)`.as('qty'),
            sql<number>`cast(coalesce(p.cost_price, 0) as numeric)`.as('costPrice'),
          ])
          .where('pls.location_id', '=', vanLocationId)
          .where('pls.tenant_id', '=', tenantId)
          .where(sql<boolean>`cast(pls.qty as numeric) > 0`)
          .orderBy('pls.product_id', 'asc')
          .execute();

        for (const rem of postAuditStocks) {
          const pid = Number(rem.productId);
          const qty = Number(rem.qty);
          const cost = Number(rem.costPrice);
          if (qty <= 0) continue;

          // CANONICAL LOCK ORDER: Lock products first!
          await trxAny
            .selectFrom('products')
            .select(['id'])
            .where('id', '=', pid)
            .where('tenant_id', '=', tenantId)
            .forUpdate()
            .executeTakeFirst();

          // Out from van
          await this.moveVanStock(trx, {
            productId: pid,
            delta: -qty,
            locationId: vanLocationId,
            tenantId,
            accountId,
            userId: actorUserId || null,
            movementType: 'van_unload_out',
            note: 'تصفية رحلة - خروج من السيارة',
            referenceType: 'van_sales_trip',
            referenceId: Number(trip.id),
            skipGlobalUpdate: false,
            unitCost: cost,
          });

          // In to warehouse
          await this.moveVanStock(trx, {
            productId: pid,
            delta: qty,
            locationId: Number(trip.source_warehouse_id),
            tenantId,
            accountId,
            userId: actorUserId || null,
            movementType: 'van_unload_in',
            note: 'تصفية رحلة - عودة للمستودع',
            referenceType: 'van_sales_trip',
            referenceId: Number(trip.id),
            skipGlobalUpdate: false,
            unitCost: cost,
          });

          totalUnloadedCost += qty * cost;
          unloadedItemsCount++;
        }
      }

      // 5. Update vehicle current odometer if vehicle was tracked
      if (trip.vehicle_id && effectiveEndOdometer !== undefined) {
        await trxAny
          .updateTable('fleet_vehicles')
          .set({
            current_odometer: effectiveEndOdometer,
            updated_at: sql`NOW()`,
          })
          .where('id', '=', Number(trip.vehicle_id))
          .where('tenant_id', '=', tenantId)
          .execute();
      }

      // 6. Update trip status to settled
      await trxAny
        .updateTable('van_sales_trips')
        .set({
          status: 'settled',
          settlement_status: 'settled',
          closed_at: sql`NOW()`,
          settled_by: actorUserId || null,
          supervisor_id: actorUserId || null,
          stock_variance_amount: totalStockVarianceCost,
          stock_variance_details: stockAuditResult.itemVariances.length ? JSON.stringify(stockAuditResult.itemVariances) : null,
          night_stock_approved: Boolean(payload.nightStockApproved),
          night_stock_approved_by: payload.nightStockApproved ? (actorUserId || null) : null,
          night_stock_notes: payload.nightStockNotes || null,
          end_odometer: effectiveEndOdometer ?? null,
          distance_km: odometerResult.distanceKm,
          variance: cashVariance,
          notes: payload.notes || `تم إغلاق وتصفية رحلة التوزيع بنجاح. عجز/زيادة الكاش: ${cashVariance}، عجز المخزون: ${totalStockVarianceCost}`,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', payload.tripId)
        .where('tenant_id', '=', tenantId)
        .execute();

      // 7. General Ledger Double-Entry Postings
      const vanLocRow = await trxAny
        .selectFrom('stock_locations')
        .select(['branch_id'])
        .where('id', '=', vanLocationId)
        .where('tenant_id', '=', tenantId)
        .executeTakeFirst();
      const branchId = vanLocRow?.branch_id ? Number(vanLocRow.branch_id) : null;
      const systemAuth = authContext || (await this.resolveSystemAuthContext(tenantId, accountId));

      // Post van trip settlement (cash collected + shortage/overage + stock shortage allocation)
      await this.accountingPosting.postVanTripSettlement(
        trx,
        payload.tripId,
        {
          expectedCash,
          countedCash,
          tripExpenses: totalTripExpenses,
          branchId,
          locationId: vanLocationId,
          stockShortageAmount: totalStockVarianceCost,
          chargeStockVarianceToRep: Boolean(payload.chargeStockVarianceToRep),
        },
        systemAuth,
      );

      // Post unload stock transfer if items were returned to warehouse
      if (payload.unloadRemainingToWarehouse && totalUnloadedCost > 0) {
        await this.accountingPosting.postVanStockTransfer(
          trx,
          payload.tripId,
          {
            sourceLocationId: vanLocationId,
            targetLocationId: Number(trip.source_warehouse_id),
            totalCost: totalUnloadedCost,
            branchId,
            type: 'unload',
          },
          systemAuth,
        );
      }
    });

    return {
      ok: true,
      tripId: payload.tripId,
      expectedCash,
      countedCash,
      tripExpenses: totalTripExpenses,
      variance: cashVariance,
      stockVarianceAmount: totalStockVarianceCost,
      unloadedItemsCount,
      distanceKm: odometerResult.distanceKm,
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
        'vt.settlement_status as settlementStatus',
        'vt.opened_at as openedAt',
        'vt.closed_at as closedAt',
        'vt.submitted_at as submittedAt',
        sql<number>`cast(coalesce(vt.loaded_amount, 0) as numeric)`.as('loadedAmount'),
        sql<number>`cast(coalesce(vt.sales_amount, 0) as numeric)`.as('salesAmount'),
        sql<number>`cast(coalesce(vt.cash_collected, 0) as numeric)`.as('cashCollected'),
        sql<number>`cast(coalesce(vt.credit_sales, 0) as numeric)`.as('creditSales'),
        sql<number>`cast(coalesce(vt.returns_amount, 0) as numeric)`.as('returnsAmount'),
        sql<number>`cast(coalesce(vt.cash_refunds, 0) as numeric)`.as('cashRefunds'),
        sql<number>`cast(coalesce(vt.variance, 0) as numeric)`.as('variance'),
        sql<number>`cast(coalesce(vt.distance_km, 0) as numeric)`.as('distanceKm'),
        sql<number>`cast(coalesce(vt.stock_variance_amount, 0) as numeric)`.as('stockVarianceAmount'),
        'vt.night_stock_approved as nightStockApproved',
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
      cashRefunds: Number(r.cashRefunds || 0),
      variance: Number(r.variance || 0),
      notes: r.notes || '',
    }));
  }

  /**
   * Admin detailed audit of a single van trip, including all sales (with GPS), collections (with GPS), and returns.
   */
  async getTripDetailsForAdmin(tenantId: string, tripId: number, pagination?: { page?: number; pageSize?: number }) {
    const { page, pageSize, offset } = boundedPage(pagination?.page, pagination?.pageSize);
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
        sql<number>`cast(coalesce(vt.cash_refunds, 0) as numeric)`.as('cashRefunds'),
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
      .leftJoin('customers as c', (join: any) => join.onRef('c.id', '=', 's.customer_id').onRef('c.tenant_id', '=', 's.tenant_id'))
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
      .limit(pageSize + 1).offset(offset)
      .execute();

    // Collections recorded in this trip
    const collections = await this.anyDb
      .selectFrom('customer_ledger as cl')
      .leftJoin('customers as c', (join: any) => join.onRef('c.id', '=', 'cl.customer_id').onRef('c.tenant_id', '=', 'cl.tenant_id'))
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
      .limit(pageSize + 1).offset(offset)
      .execute();

    // Field returns recorded in this trip
    const returns = await this.anyDb
      .selectFrom('van_field_returns as vfr')
      .leftJoin('customers as c', (join: any) => join.onRef('c.id', '=', 'vfr.customer_id').onRef('c.tenant_id', '=', 'vfr.tenant_id'))
      .select([
        'vfr.id',
        'vfr.doc_no as docNo',
        sql<number>`cast(coalesce(vfr.total_amount, 0) as numeric)`.as('totalAmount'),
        'vfr.return_reason as returnReason',
        'vfr.refund_method as refundMethod',
        'vfr.status',
        'vfr.created_at as createdAt',
        sql<string>`coalesce(c.name, '')`.as('customerName'),
      ])
      .where('vfr.tenant_id', '=', tenantId)
      .where('vfr.trip_id', '=', tripId)
      .orderBy('vfr.id', 'desc')
      .limit(pageSize + 1).offset(offset)
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
        cashRefunds: Number((trip as any).cashRefunds || 0),
        variance: Number(trip.variance || 0),
      },
      pagination: { page, pageSize, salesHasMore: sales.length > pageSize, collectionsHasMore: collections.length > pageSize, returnsHasMore: returns.length > pageSize },
      sales: sales.slice(0, pageSize).map((s: any) => ({
        ...s,
        id: Number(s.id),
        total: Number(s.total || 0),
        deliveryGpsLat: s.deliveryGpsLat != null ? Number(s.deliveryGpsLat) : undefined,
        deliveryGpsLng: s.deliveryGpsLng != null ? Number(s.deliveryGpsLng) : undefined,
      })),
      collections: collections.slice(0, pageSize).map((c: any) => ({
        ...c,
        id: Number(c.id),
        amount: Number(c.amount || 0),
        gpsLat: c.gpsLat != null ? Number(c.gpsLat) : undefined,
        gpsLng: c.gpsLng != null ? Number(c.gpsLng) : undefined,
      })),
      returns: returns.slice(0, pageSize).map((r: any) => ({
        ...r,
        id: Number(r.id),
        totalAmount: Number(r.totalAmount || 0),
        refundMethod: r.refundMethod || 'credit',
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
        sql<number>`cast(si.consumer_price as numeric)`.as('consumerPrice'),
        'si.pricing_tier_type as pricingTierType',
        sql<number>`cast(si.unit_offer_savings as numeric)`.as('unitOfferSavings'),
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
        consumerPrice: item.consumerPrice != null ? Number(item.consumerPrice) : null,
        pricingTierType: item.pricingTierType || null,
        unitOfferSavings: item.unitOfferSavings != null ? Number(item.unitOfferSavings) : 0,
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

  // =========================================================================
  // FLEET MANAGEMENT (Delegated to VanFleetService)
  // =========================================================================

  async listFleetVehicles(tenantId: string) {
    return this.vanFleetService.listFleetVehicles(tenantId);
  }

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
    return this.vanFleetService.createFleetVehicle(tenantId, accountId, payload);
  }

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
    return this.vanFleetService.updateFleetVehicle(tenantId, accountId, id, payload);
  }

  async assignVehicleRep(tenantId: string, vehicleId: number, repId: number | null, shiftName?: string) {
    return this.vanFleetService.assignVehicleRep(tenantId, vehicleId, repId, shiftName);
  }

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
    return this.vanFleetService.recordFuelLog(tenantId, accountId, repId, payload);
  }

  async listFuelLogs(
    tenantId: string,
    filters?: { vehicleId?: number; repId?: number; dateFrom?: string; dateTo?: string },
  ) {
    return this.vanFleetService.listFuelLogs(tenantId, filters);
  }

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
    return this.vanFleetService.recordOilChange(tenantId, accountId, repId, payload);
  }

  async listOilChanges(tenantId: string, vehicleId?: number) {
    return this.vanFleetService.listOilChanges(tenantId, vehicleId);
  }

  async getFleetMaintenanceAlerts(tenantId: string, vehicleId?: number) {
    return this.vanFleetService.getFleetMaintenanceAlerts(tenantId, vehicleId);
  }

  async listVehicleDrivers(tenantId: string, vehicleId: number) {
    return this.vanFleetService.listVehicleDrivers(tenantId, vehicleId);
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
    return this.vanFleetService.assignVehicleDriver(tenantId, accountId, payload);
  }

  async removeVehicleDriver(tenantId: string, assignmentId: number) {
    return this.vanFleetService.removeVehicleDriver(tenantId, assignmentId);
  }

  // =========================================================================
  // LOAD REQUISITIONS (Delegated to VanRequisitionsService)
  // =========================================================================

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
    return this.vanRequisitionsService.submitLoadRequisition(repId, tenantId, accountId, payload);
  }

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

  async listLoadRequisitions(tenantId: string, filters: { status?: string; repId?: number } = {}) {
    return this.vanRequisitionsService.listLoadRequisitions(tenantId, filters);
  }

  async reviewLoadRequisition(
    tenantId: string,
    requisitionId: number,
    approvedItems: { productId: number; qty: number }[],
    notes?: string,
  ) {
    return this.vanRequisitionsService.reviewLoadRequisition(tenantId, requisitionId, approvedItems, notes);
  }

  async approveAndDispatchRequisition(tenantId: string, accountId: string, requisitionId: number, reviewedByUserId: number) {
    const req = await this.vanRequisitionsService.getRequisitionForDispatch(tenantId, requisitionId);

    const tripResult = await this.openTripAndLoad(
      Number(req.rep_id),
      tenantId,
      accountId,
      {
        sourceWarehouseId: Number(req.source_warehouse_id),
        items: req.itemsToLoad,
        notes: req.notes || `صرف وتحميل بناءً على طلب إذن تحميل #${req.doc_no}`,
      },
    );

    await this.vanRequisitionsService.markRequisitionDispatched(tenantId, requisitionId, tripResult.tripId, reviewedByUserId);

    return { ok: true, requisitionId, tripId: tripResult.tripId, docNo: req.doc_no };
  }

  async rejectLoadRequisition(tenantId: string, requisitionId: number, rejectionReason: string, reviewedByUserId: number) {
    return this.vanRequisitionsService.rejectLoadRequisition(tenantId, requisitionId, rejectionReason, reviewedByUserId);
  }

  async deleteLoadRequisition(tenantId: string, requisitionId: number) {
    return this.vanRequisitionsService.deleteLoadRequisition(tenantId, requisitionId);
  }

  async getDriverWarehouses(tenantId: string) {
    return this.vanRequisitionsService.getDriverWarehouses(tenantId);
  }

  async getDriverAvailableProducts(tenantId: string, warehouseId?: number) {
    return this.vanRequisitionsService.getDriverAvailableProducts(tenantId, warehouseId);
  }

  // =========================================================================
  // FIELD RETURNS (Delegated to VanReturnsService)
  // =========================================================================

  async getCustomerEligibleSales(tenantId: string, customerId: number) {
    return this.vanReturnsService.getCustomerEligibleSales(tenantId, customerId);
  }

  async submitFieldReturn(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      customerId: number;
      saleId?: number | null;
      returnReason: 'damaged' | 'expired' | 'manufacturing_defect' | 'stagnant' | 'order_mismatch' | 'customer_request';
      refundMethod?: 'credit' | 'cash';
      items: {
        productId: number;
        qty: number;
        unitPrice: number;
        saleItemId?: number;
      }[];
      notes?: string;
    },
  ) {
    return this.vanReturnsService.submitFieldReturn(repId, tenantId, accountId, payload);
  }

  async listFieldReturns(
    tenantId: string,
    filters: { status?: string; repId?: number; tripId?: number; customerId?: number } = {},
  ) {
    return this.vanReturnsService.listFieldReturns(tenantId, filters);
  }

  async approveFieldReturn(tenantId: string, accountId: string, returnId: number, approvedByUserId: number) {
    return this.vanReturnsService.approveFieldReturn(tenantId, accountId, returnId, approvedByUserId);
  }

  async rejectFieldReturn(tenantId: string, returnId: number, rejectionReason: string, rejectedByUserId: number) {
    return this.vanReturnsService.rejectFieldReturn(tenantId, returnId, rejectionReason, rejectedByUserId);
  }

  // =========================================================================
  // REP TARGETS & PERFORMANCE (Delegated to VanTargetsService)
  // =========================================================================

  async setRepTarget(
    tenantId: string,
    accountId: string,
    repId: number,
    periodMonth: string,
    targetAmount: number,
    collectionTarget?: number | null,
    visitsTarget?: number | null,
  ) {
    return this.vanTargetsService.setRepTarget(tenantId, accountId, repId, periodMonth, targetAmount, collectionTarget, visitsTarget);
  }

  async getRepTarget(tenantId: string, repId: number, periodMonth?: string) {
    return this.vanTargetsService.getRepTarget(tenantId, repId, periodMonth);
  }

  async listAllRepTargets(tenantId: string, periodMonth?: string) {
    return this.vanTargetsService.listAllRepTargets(tenantId, periodMonth);
  }

  // =========================================================================
  // INTER-VAN TRANSFERS (Delegated to VanTransfersService)
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
    return this.vanTransfersService.createInterVanTransfer(tenantId, accountId, fromRepId, payload);
  }

  async acceptInterVanTransfer(tenantId: string, accountId: string, toRepId: number, transferId: number) {
    return this.vanTransfersService.acceptInterVanTransfer(tenantId, accountId, toRepId, transferId);
  }

  async rejectInterVanTransfer(tenantId: string, toRepId: number, transferId: number, reason?: string) {
    return this.vanTransfersService.rejectInterVanTransfer(tenantId, toRepId, transferId, reason);
  }

  async listInterVanTransfers(
    tenantId: string,
    filters?: { repId?: number; status?: string },
  ) {
    return this.vanTransfersService.listInterVanTransfers(tenantId, filters);
  }

  async getPeerReps(tenantId: string, currentRepId: number) {
    return this.vanTransfersService.getPeerReps(tenantId, currentRepId);
  }

  // =========================================================================
  // ROUTES, VISITS & SUPERVISOR (Delegated to VanRoutesService)
  // =========================================================================

  async getDriverTodayItinerary(tenantId: string, repId: number, tripId?: number) {
    return this.vanRoutesService.getDriverTodayItinerary(tenantId, repId, tripId);
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
    return this.vanRoutesService.recordFieldVisit(tenantId, accountId, repId, payload);
  }

  async listFieldVisits(
    tenantId: string,
    filters?: { repId?: number; customerId?: number; visitType?: string; dateFrom?: string; dateTo?: string },
  ) {
    return this.vanRoutesService.listFieldVisits(tenantId, filters);
  }

  async getSupervisorRouteKpis(tenantId: string, dateFrom?: string, dateTo?: string) {
    return this.vanRoutesService.getSupervisorRouteKpis(tenantId, dateFrom, dateTo);
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
      assignedRepId?: number | null;
      assignedRepName?: string | null;
    },
  ) {
    return this.vanRoutesService.setCustomerRouteSchedule(tenantId, customerId, payload);
  }

  async bulkAssignCustomerRoutes(
    tenantId: string,
    payload: {
      customerIds: number[];
      assignedRepId?: number | null;
      assignedRepName?: string | null;
      route?: string;
      visitDays?: string[];
    },
  ) {
    return this.vanRoutesService.bulkAssignCustomerRoutes(tenantId, payload);
  }

  async getSupervisorCustomerRoutes(
    tenantId: string,
    filters?: {
      search?: string;
      repId?: number | string;
      route?: string;
      unassignedOnly?: boolean;
    },
  ) {
    return this.vanRoutesService.getSupervisorCustomerRoutes(tenantId, filters);
  }

  // =========================================================================
  // TRIP OPERATIONAL EXPENSES (Fuel, Tolls, Road Maintenance, Tips)
  // =========================================================================

  /**
   * Records an operational trip expense (fuel, toll, maintenance, tips, meals).
   */
  async recordTripExpense(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      expenseType: 'fuel' | 'toll' | 'maintenance' | 'tips' | 'meals' | 'other' | string;
      amount: number;
      notes?: string;
      receiptPhotoUrl?: string;
    },
    authContext?: AuthContext,
  ): Promise<{ ok: boolean; expenseId: number; totalTripExpenses: number }> {
    if (!payload.amount || Number(payload.amount) <= 0) {
      throw new AppError('مبلغ المصروف يجب أن يكون أكبر من الصفر', 'INVALID_EXPENSE_AMOUNT', 400);
    }

    const trip = await this.anyDb
      .selectFrom('van_sales_trips')
      .select(['id', 'status'])
      .where('id', '=', payload.tripId)
      .where('tenant_id', '=', tenantId)
      .where('rep_id', '=', repId)
      .executeTakeFirst();

    if (!trip || trip.status !== 'open') {
      throw new AppError('لا يمكن تسجيل مصروفات على رحلة مغلقة أو غير موجودة', 'INVALID_TRIP', 400);
    }

    const createdByUserId = authContext?.userId ? Number(authContext.userId) : null;
    const [inserted] = await this.anyDb
      .insertInto('van_trip_expenses')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        trip_id: payload.tripId,
        expense_type: payload.expenseType || 'other',
        amount: Number(payload.amount),
        notes: payload.notes || null,
        receipt_photo_url: payload.receiptPhotoUrl || null,
        created_by_user_id: createdByUserId,
      })
      .returning(['id'])
      .execute();

    const sumRow = await this.anyDb
      .selectFrom('van_trip_expenses')
      .select(sql<number>`cast(coalesce(sum(amount), 0) as numeric)`.as('totalExpenses'))
      .where('trip_id', '=', payload.tripId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    return {
      ok: true,
      expenseId: Number(inserted.id),
      totalTripExpenses: Number(sumRow?.totalExpenses || 0),
    };
  }

  /**
   * Retrieves all recorded trip expenses for a van trip.
   */
  async getTripExpenses(tripId: number, tenantId: string) {
    const rows = await this.anyDb
      .selectFrom('van_trip_expenses as te')
      .leftJoin('users as u', 'u.id', 'te.created_by_user_id')
      .select([
        'te.id',
        'te.trip_id as tripId',
        'te.expense_type as expenseType',
        sql<number>`cast(te.amount as numeric)`.as('amount'),
        'te.notes',
        'te.receipt_photo_url as receiptPhotoUrl',
        'te.created_at as createdAt',
        sql<string>`coalesce(u.display_name, u.username)`.as('createdByName'),
      ])
      .where('te.trip_id', '=', tripId)
      .where('te.tenant_id', '=', tenantId)
      .orderBy('te.created_at', 'desc')
      .execute();

    const total = rows.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    return {
      expenses: rows.map((r: any) => ({
        id: Number(r.id),
        tripId: Number(r.tripId),
        expenseType: r.expenseType,
        amount: Number(r.amount),
        notes: r.notes || '',
        receiptPhotoUrl: r.receiptPhotoUrl || null,
        createdAt: r.createdAt,
        createdByName: r.createdByName || null,
      })),
      totalExpenses: Number(total.toFixed(2)),
    };
  }

  // =========================================================================
  // RETURNABLE PACKAGING & EMPTIES LEDGER (Crates, Bottles, Pallets, Gas Cylinders)
  // =========================================================================

  /**
   * Records movement in the returnable packaging & empties ledger.
   */
  async recordPackagingMovement(
    repId: number,
    tenantId: string,
    accountId: string,
    payload: {
      tripId: number;
      customerId?: number;
      packageType: 'crate_plastic' | 'box_wooden' | 'bottle_glass' | 'cylinder_gas' | 'pallet' | string;
      deliveredQty: number;
      returnedQty: number;
      notes?: string;
    },
  ): Promise<{ ok: boolean; movementId: number }> {
    const delivered = Math.max(0, Number(payload.deliveredQty || 0));
    const returned = Math.max(0, Number(payload.returnedQty || 0));

    if (delivered === 0 && returned === 0) {
      throw new AppError('يجب تسجيل كمية مسلمة أو مستلمة واحدة على الأقل', 'EMPTY_PACKAGING_QTY', 400);
    }

    const [inserted] = await this.anyDb
      .insertInto('van_trip_packaging_movements')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        trip_id: payload.tripId,
        customer_id: payload.customerId ? Number(payload.customerId) : null,
        package_type: payload.packageType || 'crate_plastic',
        delivered_qty: delivered,
        returned_qty: returned,
        notes: payload.notes || null,
      })
      .returning(['id'])
      .execute();

    return {
      ok: true,
      movementId: Number(inserted.id),
    };
  }

  /**
   * Retrieves packaging movements for a van trip.
   */
  async getTripPackagingMovements(tripId: number, tenantId: string) {
    const rows = await this.anyDb
      .selectFrom('van_trip_packaging_movements as pm')
      .leftJoin('customers as c', 'c.id', 'pm.customer_id')
      .select([
        'pm.id',
        'pm.package_type as packageType',
        'pm.delivered_qty as deliveredQty',
        'pm.returned_qty as returnedQty',
        'pm.notes',
        'pm.created_at as createdAt',
        'c.id as customerId',
        'c.name as customerName',
      ])
      .where('pm.trip_id', '=', tripId)
      .where('pm.tenant_id', '=', tenantId)
      .orderBy('pm.created_at', 'desc')
      .execute();

    return rows.map((r: any) => ({
      id: Number(r.id),
      packageType: r.packageType,
      deliveredQty: Number(r.deliveredQty || 0),
      returnedQty: Number(r.returnedQty || 0),
      netBalance: Number(r.deliveredQty || 0) - Number(r.returnedQty || 0),
      notes: r.notes || '',
      createdAt: r.createdAt,
      customerId: r.customerId ? Number(r.customerId) : null,
      customerName: r.customerName || null,
    }));
  }

  /**
   * Retrieves customer returnable packaging balance summary across all trips.
   */
  async getCustomerPackagingBalance(customerId: number, tenantId: string) {
    const rows = await this.anyDb
      .selectFrom('van_trip_packaging_movements')
      .select([
        'package_type as packageType',
        sql<number>`cast(coalesce(sum(delivered_qty), 0) as numeric)`.as('totalDelivered'),
        sql<number>`cast(coalesce(sum(returned_qty), 0) as numeric)`.as('totalReturned'),
      ])
      .where('customer_id', '=', customerId)
      .where('tenant_id', '=', tenantId)
      .groupBy('package_type')
      .execute();

    return rows.map((r: any) => ({
      packageType: r.packageType,
      totalDelivered: Number(r.totalDelivered || 0),
      totalReturned: Number(r.totalReturned || 0),
      netOwedToCompany: Number(r.totalDelivered || 0) - Number(r.totalReturned || 0),
    }));
  }

  /**
   * Driver creates a new field customer directly into their itinerary and customer database.
   */
  async createDriverCustomer(
    repId: number,
    tenantId: string,
    accountId: string,
    body: {
      name: string;
      phone?: string;
      address?: string;
      district?: string;
      route?: string;
      notes?: string;
      metadata?: any;
    },
  ) {
    const name = String(body.name || '').trim();
    if (!name) {
      throw new AppError('اسم المحل أو العميل مطلوب', 'CUSTOMER_NAME_REQUIRED', 400);
    }

    const district = (body.district || body.metadata?.district || '').trim();
    const route = (body.route || body.metadata?.route || '').trim();
    const phone = (body.phone || '').trim();
    const address = (body.address || district || '').trim();

    const metadata = {
      district: district || undefined,
      route: route || undefined,
      assigned_rep_id: repId,
      created_by_rep_id: repId,
      visit_days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    };

    const inserted = await this.anyDb
      .insertInto('customers')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        name,
        phone,
        address,
        balance: 0,
        customer_type: 'cash',
        credit_limit: 0,
        store_credit_balance: 0,
        metadata: JSON.stringify(metadata),
        is_active: true,
      })
      .returning(['id', 'name', 'phone', 'address', 'balance'])
      .executeTakeFirstOrThrow();

    return {
      ok: true,
      customer: {
        id: Number(inserted.id),
        name: inserted.name,
        phone: inserted.phone,
        address: inserted.address,
        balance: 0,
        metadata,
      },
    };
  }
}
