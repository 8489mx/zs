import { Inject, Injectable, Logger } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AppError } from '../../../common/errors/app-error';
import { VanFraudRadarService } from './van-fraud-radar.service';
import { FmcgVisitExecutionEngine, GeofenceEvaluationResult } from '../fmcg-visit-execution.engine';

export interface CheckInVisitPayload {
  tripId?: number | null;
  customerId: number;
  customerName?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RecordNoSalePayload {
  noSaleReason: string;
  noSaleNotes?: string;
}

export interface RecordStoreInventoryPayload {
  items: Array<{
    productId: number;
    productName: string;
    qtyOnShelf: number;
    expiryDate?: string | null;
  }>;
}

export interface CheckOutVisitPayload {
  hasSale?: boolean;
  saleId?: number | null;
  saleAmount?: number;
  hasCollection?: boolean;
  collectionAmount?: number;
}

export interface TradeSurveyPayload {
  tripId?: number | null;
  customerId: number;
  visitId?: number | null;
  surveyType: 'cooler_inspection' | 'asset_tracking' | 'competitor_survey';
  assetId?: string | null;
  assetName?: string | null;
  assetCondition?: string | null;
  isPureCompanyProducts?: boolean;
  temperatureCelsius?: number | null;
  cleanlinessRating?: number;
  photoUrl?: string | null;
  competitorName?: string | null;
  competitorProduct?: string | null;
  competitorPrice?: number | null;
  competitorOfferDetails?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
}

export interface BreadcrumbPayload {
  tripId: number;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  batteryLevel?: number;
}

@Injectable()
export class VanFieldExecutionService {
  private readonly logger = new Logger(VanFieldExecutionService.name);

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly fraudRadar: VanFraudRadarService,
  ) {}

  /**
   * 1. Check-In: Initiates a structured store visit with GPS geofencing verification
   */
  async checkInVisit(
    tenantId: string,
    accountId: number,
    repId: number,
    payload: CheckInVisitPayload,
  ) {
    if (!payload.customerId) {
      throw new AppError('معرف العميل مطلوب لتسجيل الزيارة', 'CUSTOMER_ID_REQUIRED', 400);
    }

    // Fetch customer GPS and details
    const customer = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'metadata'])
      .where('id', '=', payload.customerId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!customer) {
      throw new AppError('العميل غير مسجل في النظام', 'CUSTOMER_NOT_FOUND', 404);
    }

    const meta = typeof customer.metadata === 'string'
      ? JSON.parse(customer.metadata || '{}')
      : (customer.metadata || {});

    const customerLat = meta.latitude ?? meta.gps_lat ?? meta.lat ?? null;
    const customerLng = meta.longitude ?? meta.gps_lng ?? meta.lng ?? null;

    const geofenceResult: GeofenceEvaluationResult = FmcgVisitExecutionEngine.evaluateGeofence(
      customerLat,
      customerLng,
      payload.latitude,
      payload.longitude,
      300,
    );

    // If geofence is violated (more than 300m away), trigger fraud radar suspicion event
    if (!geofenceResult.isValid && !geofenceResult.isUnmappedCustomer) {
      await this.fraudRadar.recordSuspicionEvent({
        tenantId,
        accountId: String(accountId),
        repId,
        tripId: payload.tripId ?? null,
        customerId: payload.customerId,
        customerName: customer.name,
        eventCode: 'VAN_SUSPICION_GEOFENCE_VIOLATION',
        severity: 'high',
        titleAr: 'تسجيل زيارة وهمية خارج النطاق الجغرافي للمحل (Geofence Breach)',
        detailsAr: `قام المندوب بتسجيل وصول للعميل "${customer.name}" على بعد (${geofenceResult.distanceMeters} متر) متجاوزاً النطاق المسموح (300 متر).`,
        attemptedAmount: 0,
        metadata: {
          customerLat,
          customerLng,
          repLat: payload.latitude,
          repLng: payload.longitude,
          distanceMeters: geofenceResult.distanceMeters,
        },
      });
    }

    // Insert visit record
    const [visit] = await this.db
      .insertInto('van_store_visits')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        trip_id: payload.tripId ?? null,
        rep_id: repId,
        customer_id: payload.customerId,
        customer_name: customer.name,
        check_in_at: new Date().toISOString(),
        check_in_lat: payload.latitude != null ? payload.latitude : null,
        check_in_lng: payload.longitude != null ? payload.longitude : null,
        is_geofence_valid: geofenceResult.isValid,
        geofence_distance_meters: geofenceResult.distanceMeters,
        store_inventory: JSON.stringify([]),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returningAll()
      .execute();

    return {
      ok: true,
      visitId: visit.id,
      customerName: customer.name,
      geofence: geofenceResult,
      checkInAt: visit.check_in_at,
    };
  }

  /**
   * 2. Store Shelf Inventory: Records optional shelf stock counts and expiries
   */
  async recordVisitInventory(
    tenantId: string,
    visitId: number,
    payload: RecordStoreInventoryPayload,
  ) {
    const visit = await this.db
      .selectFrom('van_store_visits')
      .select(['id'])
      .where('id', '=', visitId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!visit) {
      throw new AppError('سجل الزيارة غير موجود', 'VISIT_NOT_FOUND', 404);
    }

    await this.db
      .updateTable('van_store_visits')
      .set({
        store_inventory: JSON.stringify(payload.items || []),
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', visitId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, visitId, itemsCount: (payload.items || []).length };
  }

  /**
   * 3. Reason for No-Sale: Records mandatory reason when visit yielded no transaction
   */
  async recordVisitNoSale(
    tenantId: string,
    visitId: number,
    payload: RecordNoSalePayload,
  ) {
    if (!payload.noSaleReason) {
      throw new AppError('سبب عدم البيع إلزامي', 'NO_SALE_REASON_REQUIRED', 400);
    }

    await this.db
      .updateTable('van_store_visits')
      .set({
        no_sale_reason: payload.noSaleReason,
        no_sale_notes: payload.noSaleNotes || null,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', visitId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, visitId, reason: payload.noSaleReason };
  }

  /**
   * 4. Check-Out: Completes visit and computes dwell time
   */
  async checkOutVisit(
    tenantId: string,
    visitId: number,
    payload?: CheckOutVisitPayload,
  ) {
    const visit = await this.db
      .selectFrom('van_store_visits')
      .selectAll()
      .where('id', '=', visitId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!visit) {
      throw new AppError('سجل الزيارة غير موجود', 'VISIT_NOT_FOUND', 404);
    }

    const checkOutAt = new Date();
    const dwellSeconds = FmcgVisitExecutionEngine.calculateDwellTimeSeconds(
      visit.check_in_at,
      checkOutAt,
    );

    const hasSale = payload?.hasSale ?? (payload?.saleAmount != null && payload.saleAmount > 0);
    const hasCollection = payload?.hasCollection ?? (payload?.collectionAmount != null && payload.collectionAmount > 0);

    const [updated] = await this.db
      .updateTable('van_store_visits')
      .set({
        check_out_at: checkOutAt.toISOString(),
        dwell_time_seconds: dwellSeconds,
        has_sale: hasSale,
        sale_id: payload?.saleId ?? visit.sale_id,
        sale_amount: payload?.saleAmount != null ? payload.saleAmount : visit.sale_amount,
        has_collection: hasCollection,
        collection_amount: payload?.collectionAmount != null ? payload.collectionAmount : visit.collection_amount,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', visitId)
      .where('tenant_id', '=', tenantId)
      .returningAll()
      .execute();

    return {
      ok: true,
      visitId,
      dwellTimeSeconds: dwellSeconds,
      dwellTimeMinutes: Number((dwellSeconds / 60).toFixed(1)),
      hasSale,
      hasCollection,
    };
  }

  /**
   * 5. Trade Marketing Survey: Records cooler inspection or competitor survey
   */
  async recordTradeSurvey(
    tenantId: string,
    accountId: number,
    repId: number,
    payload: TradeSurveyPayload,
  ) {
    const [survey] = await this.db
      .insertInto('van_trade_marketing_surveys')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        visit_id: payload.visitId ?? null,
        trip_id: payload.tripId ?? null,
        rep_id: repId,
        customer_id: payload.customerId,
        survey_type: payload.surveyType,
        asset_id: payload.assetId || null,
        asset_name: payload.assetName || null,
        asset_condition: payload.assetCondition || null,
        is_pure_company_products: payload.isPureCompanyProducts !== false,
        temperature_celsius: payload.temperatureCelsius != null ? payload.temperatureCelsius : null,
        cleanliness_rating: payload.cleanlinessRating != null ? payload.cleanlinessRating : 5,
        photo_url: payload.photoUrl || null,
        competitor_name: payload.competitorName || null,
        competitor_product: payload.competitorProduct || null,
        competitor_price: payload.competitorPrice != null ? payload.competitorPrice : null,
        competitor_offer_details: payload.competitorOfferDetails || null,
        notes: payload.notes || null,
        metadata: JSON.stringify(payload.metadata || {}),
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .execute();

    return { ok: true, surveyId: survey.id };
  }

  /**
   * 6. Live Breadcrumb Recording: Saves rep GPS points for breadcrumb trail
   */
  async recordLiveBreadcrumb(
    tenantId: string,
    accountId: number,
    repId: number,
    payload: BreadcrumbPayload,
  ) {
    if (!payload.tripId || payload.latitude == null || payload.longitude == null) {
      throw new AppError('بيانات التتبع ناقصة', 'INVALID_BREADCRUMB_DATA', 400);
    }

    const [breadcrumb] = await this.db
      .insertInto('van_rep_live_breadcrumbs')
      .values({
        tenant_id: tenantId,
        account_id: accountId,
        trip_id: payload.tripId,
        rep_id: repId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed_kmh: payload.speedKmh || 0,
        battery_level: payload.batteryLevel || 100,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .returningAll()
      .execute();

    return { ok: true, breadcrumbId: breadcrumb.id };
  }

  /**
   * 7. Get Live Trip Breadcrumbs for Supervisor Map
   */
  async getLiveTripBreadcrumbs(tenantId: string, tripId: number) {
    const points = await this.db
      .selectFrom('van_rep_live_breadcrumbs')
      .selectAll()
      .where('trip_id', '=', tripId)
      .where('tenant_id', '=', tenantId)
      .orderBy('recorded_at', 'asc')
      .execute();

    return {
      ok: true,
      tripId,
      pointsCount: points.length,
      breadcrumbs: points.map((p) => ({
        id: p.id,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        speedKmh: Number(p.speed_kmh || 0),
        batteryLevel: Number(p.battery_level || 100),
        recordedAt: p.recorded_at,
      })),
    };
  }

  /**
   * 8. Get Store Visits History & Strike-Rate KPIs for Supervisor
   */
  async getVisitsHistory(
    tenantId: string,
    filters?: {
      tripId?: number;
      repId?: number;
      customerId?: number;
      date?: string;
      noSaleOnly?: boolean;
    },
  ) {
    let q = this.db
      .selectFrom('van_store_visits')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.tripId) q = q.where('trip_id', '=', filters.tripId);
    if (filters?.repId) q = q.where('rep_id', '=', filters.repId);
    if (filters?.customerId) q = q.where('customer_id', '=', filters.customerId);
    if (filters?.noSaleOnly) q = q.where('has_sale', '=', false);
    if (filters?.date) {
      q = q.where(sql`DATE(check_in_at)`, '=', filters.date);
    }

    const rows = await q.orderBy('check_in_at', 'desc').limit(200).execute();
    const metrics = FmcgVisitExecutionEngine.calculateStrikeRateMetrics(rows);

    return {
      ok: true,
      metrics,
      visits: rows.map((r) => ({
        id: r.id,
        tripId: r.trip_id,
        repId: r.rep_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        checkInAt: r.check_in_at,
        checkOutAt: r.check_out_at,
        dwellTimeSeconds: r.dwell_time_seconds,
        isGeofenceValid: r.is_geofence_valid,
        geofenceDistanceMeters: Number(r.geofence_distance_meters || 0),
        hasSale: r.has_sale,
        saleId: r.sale_id,
        saleAmount: Number(r.sale_amount || 0),
        hasCollection: r.has_collection,
        collectionAmount: Number(r.collection_amount || 0),
        noSaleReason: r.no_sale_reason,
        noSaleNotes: r.no_sale_notes,
        storeInventory: typeof r.store_inventory === 'string' ? JSON.parse(r.store_inventory) : r.store_inventory,
      })),
    };
  }

  /**
   * 9. Get Trade Marketing Surveys for Supervisor
   */
  async getTradeSurveys(
    tenantId: string,
    filters?: {
      tripId?: number;
      customerId?: number;
      surveyType?: string;
    },
  ) {
    let q = this.db
      .selectFrom('van_trade_marketing_surveys')
      .selectAll()
      .where('tenant_id', '=', tenantId);

    if (filters?.tripId) q = q.where('trip_id', '=', filters.tripId);
    if (filters?.customerId) q = q.where('customer_id', '=', filters.customerId);
    if (filters?.surveyType) q = q.where('survey_type', '=', filters.surveyType);

    const rows = await q.orderBy('created_at', 'desc').limit(150).execute();

    return {
      ok: true,
      surveys: rows.map((s) => ({
        id: s.id,
        tripId: s.trip_id,
        repId: s.rep_id,
        customerId: s.customer_id,
        surveyType: s.survey_type,
        assetId: s.asset_id,
        assetName: s.asset_name,
        assetCondition: s.asset_condition,
        isPureCompanyProducts: s.is_pure_company_products,
        temperatureCelsius: s.temperature_celsius != null ? Number(s.temperature_celsius) : null,
        cleanlinessRating: s.cleanliness_rating,
        photoUrl: s.photo_url,
        competitorName: s.competitor_name,
        competitorProduct: s.competitor_product,
        competitorPrice: s.competitor_price != null ? Number(s.competitor_price) : null,
        competitorOfferDetails: s.competitor_offer_details,
        notes: s.notes,
        createdAt: s.created_at,
      })),
    };
  }
}
