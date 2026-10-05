import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AppError } from '../../../common/errors/app-error';
import { calculateRepTargetMetrics } from '../rep-target.engine';
import { getMonthlyOfficialHolidayDates } from './van-common.util';

@Injectable()
export class VanTargetsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private get anyDb(): any {
    return this.db as any;
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

    const officialHolidays = await getMonthlyOfficialHolidayDates(this.anyDb, tenantId, startOfMonth, endOfMonth);

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

    const officialHolidays = await getMonthlyOfficialHolidayDates(this.anyDb, tenantId, startOfMonth, endOfMonth);

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
}
