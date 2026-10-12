import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AppError } from '../../../common/errors/app-error';
import { VanFleetService } from './van-fleet.service';
import { normalizeCustomerCode, getCustomerRepBalancesMap } from './van-common.util';
import {
  extractCoordinatesFromCustomerLocation,
  evaluateGeofenceCompliance,
  extractAssignedRepIds,
  resolveIsolatedRepCustomerBalance,
} from '../rep-target.engine';

@Injectable()
export class VanRoutesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly vanFleetService: VanFleetService,
  ) {}

  private get anyDb(): any {
    return this.db as any;
  }

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

    const customerIds: number[] = [];
    const customerTotalBalances: Record<number, number> = {};
    for (const c of customers) {
      const cid = Number(c.id);
      customerIds.push(cid);
      customerTotalBalances[cid] = Number(c.balance || 0);
    }
    const repBalancesMap = await getCustomerRepBalancesMap(this.anyDb, tenantId, {
      customerIds,
      customerTotalBalances,
    });

    // 1. Calculate today's Arabic & English day names
    const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const englishDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIdx = new Date().getDay();
    const currentDayName = arabicDays[dayIdx];
    const currentEnglishDayName = englishDays[dayIdx];

    // 2. Filter customers based on rep assignment (supporting multi-rep shared customers & ledger ownership)
    const parseCustMeta = (raw: any): any => {
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      return raw && typeof raw === 'object' ? raw : {};
    };

    const numRepId = Number(repId);
    const repHasExplicitAssignments = customers.some((c: any) => {
      const assignedIds = extractAssignedRepIds(c.metadata);
      return assignedIds.includes(numRepId);
    });

    const repCustomers = customers.filter((c: any) => {
      const cid = Number(c.id);
      const assignedIds = extractAssignedRepIds(c.metadata);
      const hasRepLedgerActivity = Boolean(repBalancesMap.get(cid)?.byRepId[numRepId]);
      if (repHasExplicitAssignments) {
        return assignedIds.includes(numRepId) || hasRepLedgerActivity;
      }
      return assignedIds.length === 0 || assignedIds.includes(numRepId) || hasRepLedgerActivity;
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
      .where('rep_id', '=', repId)
      .groupBy('customer_id')
      .execute();

    const negativeMap = new Map<number, number>();
    for (const r of recentNegativeCounts) {
      negativeMap.set(Number(r.customerId), Number(r.negativeCount || 0));
    }

    return repCustomers.map((c: any) => {
      const cId = Number(c.id);
      const meta = parseCustMeta(c.metadata);
      const assignedRepIds = extractAssignedRepIds(meta);
      const isolated = resolveIsolatedRepCustomerBalance({
        repId: numRepId,
        breakdown: repBalancesMap.get(cId),
        assignedRepIds,
        fallbackTotalBalance: Number(c.balance || 0),
      });
      const todayVisit = visitMap.get(cId);
      const totalNegatives = negativeMap.get(cId) || 0;

      let status: 'pending' | 'positive' | 'negative' = 'pending';
      if (todayVisit) {
        status = todayVisit.visitType;
      }

      const visitDays: string[] = Array.isArray(meta.visit_days)
        ? meta.visit_days
        : (meta.visit_day ? [meta.visit_day] : []);
      const isScheduledToday =
        visitDays.length > 0
          ? visitDays.some((d: string) => {
              if (!d) return false;
              const s = String(d).trim().toLowerCase();
              return (
                s === currentDayName ||
                s === currentEnglishDayName ||
                s.includes(currentDayName) ||
                s.includes(currentEnglishDayName)
              );
            })
          : true;
      const assignedRepId = assignedRepIds.includes(numRepId)
        ? numRepId
        : (meta.assigned_rep_id ? Number(meta.assigned_rep_id) : null);

      return {
        customerId: cId,
        customerName: c.name,
        customerPhone: c.phone || '',
        customerAddress: c.address || '',
        customerCode: normalizeCustomerCode(meta.customer_code || meta.code, cId),
        route: meta.route || 'الخط العام',
        district: meta.district || meta.area || meta.neighborhood || '',
        routeSequence: Number(meta.route_sequence || 0),
        visitDay: meta.visit_day || '',
        visitDays,
        isScheduledToday,
        currentDayName,
        assignedRepId,
        assignedRepIds,
        assignedRepName: meta.assigned_rep_name || '',
        locationUrl: meta.location_url || '',
        balance: isolated.repBalance,
        totalCompanyBalance: isolated.totalCustomerBalance,
        creditLimit: Number(c.creditLimit || 0),
        visitStatus: status,
        todayVisit: todayVisit || null,
        repeatedNegativesCount: totalNegatives,
        hasRepeatedNegativeAlert: totalNegatives >= 3,
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
        'c.metadata as customerMetadata',
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
    return rows.map((r: any) => {
      const custCoords = extractCoordinatesFromCustomerLocation({ metadata: r.customerMetadata });
      const geo = evaluateGeofenceCompliance({
        repLat: r.gpsLat != null ? Number(r.gpsLat) : null,
        repLng: r.gpsLng != null ? Number(r.gpsLng) : null,
        customerLat: custCoords?.lat ?? null,
        customerLng: custCoords?.lng ?? null,
        maxAllowedMeters: 300,
      });
      const { customerMetadata: _cm, ...rest } = r;
      return {
        ...rest,
        customerLat: custCoords?.lat ?? null,
        customerLng: custCoords?.lng ?? null,
        distanceMeters: geo.distanceMeters,
        isWithinGeofence: geo.isCompliant,
        geofenceStatus: geo.status,
      };
    });
  }

  async getSupervisorRouteKpis(tenantId: string, dateFrom?: string, dateTo?: string) {
    let visitQuery = this.anyDb
      .selectFrom('van_field_visits as vfv')
      .leftJoin('customers as c', 'c.id', 'vfv.customer_id')
      .select([
        'vfv.id',
        'vfv.visit_type as visitType',
        'vfv.negative_reason as negativeReason',
        'vfv.customer_id as customerId',
        'vfv.rep_id as repId',
        'vfv.gps_lat as gpsLat',
        'vfv.gps_lng as gpsLng',
        'c.metadata as customerMetadata',
      ])
      .where('vfv.tenant_id', '=', tenantId);

    if (dateFrom) visitQuery = visitQuery.where('vfv.visited_at', '>=', dateFrom);
    if (dateTo) visitQuery = visitQuery.where('vfv.visited_at', '<=', `${dateTo} 23:59:59`);

    const visits = await visitQuery.execute();

    const totalVisits = visits.length;
    const positiveVisits = visits.filter((v: any) => v.visitType === 'positive').length;
    const negativeVisits = visits.filter((v: any) => v.visitType === 'negative').length;
    const strikeRate = totalVisits > 0 ? Number(((positiveVisits / totalVisits) * 100).toFixed(1)) : 0;

    let geofenceCompliantCount = 0;
    let geofenceViolationsCount = 0;
    for (const v of visits) {
      const custCoords = extractCoordinatesFromCustomerLocation({ metadata: v.customerMetadata });
      const geo = evaluateGeofenceCompliance({
        repLat: v.gpsLat != null ? Number(v.gpsLat) : null,
        repLng: v.gpsLng != null ? Number(v.gpsLng) : null,
        customerLat: custCoords?.lat ?? null,
        customerLng: custCoords?.lng ?? null,
        maxAllowedMeters: 300,
      });
      if (geo.status === 'within_geofence') geofenceCompliantCount++;
      else if (geo.status === 'outside_geofence') geofenceViolationsCount++;
    }

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

    const fuelLogs = await this.vanFleetService.listFuelLogs(tenantId, { dateFrom, dateTo });
    const totalFuelLiters = fuelLogs.reduce((sum: number, f: any) => sum + Number(f.liters || 0), 0);
    const totalFuelCost = fuelLogs.reduce((sum: number, f: any) => sum + Number(f.totalCost || 0), 0);
    const totalKmDriven = fuelLogs.reduce((sum: number, f: any) => sum + Number(f.kmSinceLastFuel || 0), 0);
    const avgConsumptionRate = totalFuelLiters > 0 && totalKmDriven > 0
      ? Number((totalKmDriven / totalFuelLiters).toFixed(2))
      : 0;

    const alertsRes = await this.vanFleetService.getFleetMaintenanceAlerts(tenantId);
    const alerts = alertsRes.alerts || [];

    return {
      totalVisits,
      positiveVisits,
      negativeVisits,
      strikeRate,
      geofenceCompliantCount,
      geofenceViolationsCount,
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
      assignedRepId?: number | null;
      assignedRepIds?: number[];
      assignedRepName?: string | null;
    },
  ) {
    const cust = await this.anyDb
      .selectFrom('customers')
      .select(['id', 'metadata'])
      .where('id', '=', customerId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!cust) throw new AppError('العميل غير موجود', 'CUSTOMER_NOT_FOUND', 404);

    let existingMeta: any = {};
    if (typeof cust.metadata === 'string') {
      try { existingMeta = JSON.parse(cust.metadata); } catch { existingMeta = {}; }
    } else if (cust.metadata && typeof cust.metadata === 'object') {
      existingMeta = { ...cust.metadata };
    }

    let targetRepIds: number[] | undefined;
    if (Array.isArray(payload.assignedRepIds)) {
      targetRepIds = Array.from(
        new Set(
          payload.assignedRepIds
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      );
    } else if (payload.assignedRepId !== undefined) {
      if (payload.assignedRepId === null) {
        targetRepIds = [];
      } else {
        const singleId = Number(payload.assignedRepId);
        targetRepIds = Number.isInteger(singleId) && singleId > 0 ? [singleId] : [];
      }
    }

    let resolvedRepName = payload.assignedRepName ?? existingMeta.assigned_rep_name ?? null;
    let resolvedRepNames: string[] = Array.isArray(existingMeta.assigned_rep_names)
      ? existingMeta.assigned_rep_names
      : [];

    if (targetRepIds !== undefined) {
      if (targetRepIds.length > 0) {
        const reps = await this.anyDb
          .selectFrom('delivery_representatives')
          .select(['id', 'name'])
          .where('id', 'in', targetRepIds)
          .where('tenant_id', '=', tenantId)
          .execute();
        const nameById = new Map<number, string>();
        for (const r of reps || []) {
          nameById.set(Number(r.id), String(r.name || `مندوب #${r.id}`));
        }
        resolvedRepNames = targetRepIds.map((id) => nameById.get(id) || `مندوب #${id}`);
        resolvedRepName = resolvedRepNames.join(' ، ');
      } else {
        resolvedRepNames = [];
        resolvedRepName = null;
      }
    }

    const parsedCoords = payload.locationUrl !== undefined
      ? extractCoordinatesFromCustomerLocation({ locationUrl: payload.locationUrl })
      : null;

    const updatedMeta: any = {
      ...existingMeta,
      ...(payload.route !== undefined ? { route: payload.route } : {}),
      ...(payload.routeSequence !== undefined ? { route_sequence: payload.routeSequence } : {}),
      ...(payload.visitDays !== undefined ? { visit_days: payload.visitDays } : {}),
      ...(payload.customerCode !== undefined ? { customer_code: payload.customerCode } : {}),
      ...(payload.locationUrl !== undefined ? { location_url: payload.locationUrl } : {}),
      ...(parsedCoords ? { gps_lat: parsedCoords.lat, gps_lng: parsedCoords.lng } : {}),
    };

    if (targetRepIds !== undefined) {
      updatedMeta.assigned_rep_ids = targetRepIds;
      updatedMeta.assigned_rep_names = resolvedRepNames;
      updatedMeta.assigned_rep_id = targetRepIds.length > 0 ? targetRepIds[0] : null;
      updatedMeta.assigned_rep_name = resolvedRepName;
    }

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

  async bulkAssignCustomerRoutes(
    tenantId: string,
    payload: {
      customerIds: number[];
      assignedRepId?: number | null;
      assignedRepIds?: number[];
      appendReps?: boolean;
      assignedRepName?: string | null;
      route?: string;
      visitDays?: string[];
    },
  ) {
    if (!Array.isArray(payload.customerIds) || payload.customerIds.length === 0) {
      throw new AppError('يرجى تحديد عميل واحد على الأقل', 'INVALID_CUSTOMER_IDS', 400);
    }

    const allReps = await this.anyDb
      .selectFrom('delivery_representatives')
      .select(['id', 'name'])
      .where('tenant_id', '=', tenantId)
      .execute();
    const repNameById = new Map<number, string>();
    for (const r of allReps || []) {
      repNameById.set(Number(r.id), String(r.name || `مندوب #${r.id}`));
    }

    let resolvedRepName = payload.assignedRepName;
    if (payload.assignedRepId) {
      resolvedRepName = repNameById.get(Number(payload.assignedRepId)) || resolvedRepName;
    } else if (payload.assignedRepId === null) {
      resolvedRepName = null;
    }

    const customers = await this.anyDb
      .selectFrom('customers')
      .select(['id', 'metadata'])
      .where('id', 'in', payload.customerIds)
      .where('tenant_id', '=', tenantId)
      .execute();

    for (const c of customers) {
      let meta: any = {};
      if (typeof c.metadata === 'string') {
        try { meta = JSON.parse(c.metadata); } catch { meta = {}; }
      } else if (c.metadata && typeof c.metadata === 'object') {
        meta = { ...c.metadata };
      }

      if (Array.isArray(payload.assignedRepIds)) {
        const existingIds = payload.appendReps ? extractAssignedRepIds(meta) : [];
        const mergedIds = Array.from(
          new Set(
            [...existingIds, ...payload.assignedRepIds.map((id) => Number(id))].filter(
              (id) => Number.isInteger(id) && id > 0,
            ),
          ),
        );
        const names = mergedIds.map((id) => repNameById.get(id) || `مندوب #${id}`);
        meta.assigned_rep_ids = mergedIds;
        meta.assigned_rep_names = names;
        meta.assigned_rep_id = mergedIds.length > 0 ? mergedIds[0] : null;
        meta.assigned_rep_name = names.length > 0 ? names.join(' ، ') : null;
      } else if (payload.assignedRepId !== undefined) {
        if (payload.assignedRepId === null) {
          meta.assigned_rep_id = null;
          meta.assigned_rep_ids = [];
          meta.assigned_rep_name = null;
          meta.assigned_rep_names = [];
        } else {
          const rId = Number(payload.assignedRepId);
          const existingIds = payload.appendReps ? extractAssignedRepIds(meta) : [];
          const mergedIds = Array.from(new Set([...existingIds, rId]));
          const names = mergedIds.map((id) => repNameById.get(id) || resolvedRepName || `مندوب #${id}`);
          meta.assigned_rep_id = mergedIds[0] ?? rId;
          meta.assigned_rep_ids = mergedIds;
          meta.assigned_rep_name = names.join(' ، ');
          meta.assigned_rep_names = names;
        }
      }
      if (payload.route !== undefined && payload.route.trim()) {
        meta.route = payload.route.trim();
      }
      if (payload.visitDays !== undefined) {
        meta.visit_days = payload.visitDays;
      }

      await this.anyDb
        .updateTable('customers')
        .set({
          metadata: JSON.stringify(meta),
          updated_at: sql`NOW()`,
        })
        .where('id', '=', c.id)
        .where('tenant_id', '=', tenantId)
        .execute();
    }

    return {
      ok: true,
      updatedCount: customers.length,
      assignedRepId: payload.assignedRepId,
      assignedRepName: resolvedRepName,
    };
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
    let query = this.anyDb
      .selectFrom('customers as c')
      .select([
        'c.id',
        'c.name',
        'c.phone',
        'c.address',
        'c.metadata',
        sql<number>`cast(coalesce(c.credit_limit, 0) as numeric)`.as('creditLimit'),
        sql<number>`coalesce(c.balance, 0)`.as('balance'),
        'c.created_at as createdAt',
      ])
      .where('c.tenant_id', '=', tenantId)
      .where('c.is_active', '=', true);

    if (filters?.search && filters.search.trim()) {
      const rawTrim = filters.search.trim();
      const q = `%${rawTrim.toLowerCase()}%`;
      const codeDigitsMatch = rawTrim.match(/^(?:c-|#)?0*(\d+)$/i);
      const numericId = codeDigitsMatch ? Number(codeDigitsMatch[1]) : null;
      query = query.where((eb: any) => {
        const conds: any[] = [
          sql<boolean>`TRANSLATE(LOWER(COALESCE(c.name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE TRANSLATE(${q}, 'أإآٱٲٳؤئىة', 'ااااااويهه')`,
          sql<boolean>`c.phone like ${q}`,
          sql<boolean>`LPAD(CAST(c.id AS TEXT), 4, '0') LIKE ${q}`,
          sql<boolean>`cast(c.metadata as text) ilike ${q}`,
        ];
        if (numericId && Number.isInteger(numericId) && numericId > 0) {
          conds.push(eb('c.id', '=', numericId));
        }
        return eb.or(conds);
      });
    }

    const [rows, allReps] = await Promise.all([
      query.orderBy('c.name', 'asc').limit(3000).execute(),
      this.anyDb
        .selectFrom('delivery_representatives')
        .select(['id', 'name'])
        .where('tenant_id', '=', tenantId)
        .execute(),
    ]);

    const repNameById = new Map<number, string>();
    for (const rep of allReps || []) {
      repNameById.set(Number(rep.id), String(rep.name || `مندوب #${rep.id}`));
    }

    const customerIds: number[] = [];
    const customerTotalBalances: Record<number, number> = {};
    for (const r of rows) {
      const cid = Number(r.id);
      customerIds.push(cid);
      customerTotalBalances[cid] = Number(r.balance || 0);
    }

    const repBalancesMap = await getCustomerRepBalancesMap(this.anyDb, tenantId, {
      customerIds,
      customerTotalBalances,
    });

    let results = rows.map((r: any) => {
      const cid = Number(r.id);
      let meta: any = {};
      if (typeof r.metadata === 'string') {
        try { meta = JSON.parse(r.metadata); } catch { meta = {}; }
      } else if (r.metadata && typeof r.metadata === 'object') {
        meta = r.metadata;
      }

      const breakdown = repBalancesMap.get(cid);
      const repBalances = breakdown?.repBalances || [];
      const metaRepIds = extractAssignedRepIds(meta);
      const ledgerRepIds = repBalances.filter((rb) => rb.balance !== 0).map((rb) => rb.repId);
      const assignedRepIds = Array.from(new Set([...metaRepIds, ...ledgerRepIds]));
      const assignedRepNames = assignedRepIds.map(
        (id) => repNameById.get(id) || breakdown?.byRepId[id]?.repName || `مندوب #${id}`,
      );
      const primaryRepId = meta.assigned_rep_id
        ? Number(meta.assigned_rep_id)
        : (assignedRepIds.length > 0 ? assignedRepIds[0] : null);
      const displayRepName =
        assignedRepNames.length > 0
          ? assignedRepNames.join(' ، ')
          : (meta.assigned_rep_name || null);

      return {
        customerId: cid,
        customerName: r.name,
        customerPhone: r.phone || '',
        customerAddress: r.address || '',
        customerCode: normalizeCustomerCode(meta.customer_code || meta.code, cid),
        route: meta.route || 'غير محدد',
        routeSequence: Number(meta.route_sequence || 1),
        visitDays: Array.isArray(meta.visit_days) ? meta.visit_days : [],
        assignedRepId: primaryRepId,
        assignedRepIds,
        assignedRepNames,
        assignedRepName: displayRepName,
        locationUrl: meta.location_url || (meta.gps_lat && meta.gps_lng ? `https://maps.google.com/?q=${meta.gps_lat},${meta.gps_lng}` : ''),
        balance: Number(r.balance || 0),
        repBalances,
        unassignedBalance: breakdown?.unassignedBalance || 0,
        creditLimit: Number(r.creditLimit || 0),
      };
    });

    if (filters?.unassignedOnly || filters?.repId === 'unassigned') {
      results = results.filter((c: any) => (!c.assignedRepIds || c.assignedRepIds.length === 0) && !c.assignedRepId);
    } else if (filters?.repId && filters.repId !== 'all') {
      const targetRepId = Number(filters.repId);
      results = results.filter(
        (c: any) =>
          c.assignedRepId === targetRepId ||
          (Array.isArray(c.assignedRepIds) && c.assignedRepIds.includes(targetRepId)) ||
          (Array.isArray(c.repBalances) && c.repBalances.some((rb: any) => Number(rb.repId) === targetRepId && rb.balance !== 0)),
      );
    }

    if (filters?.route && filters.route !== 'all') {
      results = results.filter((c: any) => c.route === filters.route);
    }

    return results;
  }
}
