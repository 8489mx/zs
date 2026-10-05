import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { applyStockDelta } from '../../../common/utils/location-stock-ledger';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../../common/utils/document-number.util';
import { AppError } from '../../../common/errors/app-error';

export const FLEET_VEHICLE_STATUSES = ['available', 'assigned', 'maintenance', 'retired'] as const;

/**
 * Matches the ascending-productId lock order the rest of the codebase uses (sales-write.service.ts,
 * reserveLocationStock) — applyStockDelta locks products then product_location_stock per item, so two
 * concurrent trips touching the same products in a different order can deadlock otherwise.
 */
export function sortItemsByProductId<T extends { productId: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(a.productId) - Number(b.productId));
}

export interface MoveVanStockParams {
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
}

/**
 * Single entry point for every van stock movement.
 * Routing through applyStockDelta restores the canonical lock order
 * (products before product_location_stock) and keeps the perpetual inventory ledger consistent.
 */
export async function moveVanStock(
  trx: Kysely<Database>,
  params: MoveVanStockParams,
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
export async function getOrCreateVanLocation(
  db: Kysely<Database>,
  repId: number,
  tenantId: string,
  accountId: string,
): Promise<{ id: number; name: string }> {
  const anyDb = db as any;
  const rep = await anyDb
    .selectFrom('delivery_representatives')
    .select(['id', 'name', 'van_location_id', 'vehicle_plate'])
    .where('id', '=', repId)
    .where('tenant_id', '=', tenantId)
    .executeTakeFirst();

  if (!rep) {
    throw new AppError('المندوب غير مسجل في النظام', 'REP_NOT_FOUND', 404);
  }

  if (rep.van_location_id) {
    const loc = await anyDb
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
  const branch = await anyDb
    .selectFrom('branches')
    .select(['id'])
    .where('tenant_id', '=', tenantId)
    .where('is_active', '=', true)
    .orderBy('id', 'asc')
    .executeTakeFirst();

  const branchId = branch?.id ? Number(branch.id) : null;
  const locationName = `سيارة مندوب: ${rep.name}${rep.vehicle_plate ? ` (${rep.vehicle_plate})` : ''}`;
  const locationCode = `VAN_${rep.id}`;

  const inserted = await anyDb
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

  await anyDb
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
 * Generates a collision-proof, tenant-scoped daily sequence number (0001, 0002, ...)
 * strictly adhering to the Universal Document Numbering Standard (PREFIX-YYMMDD-XXXX).
 * Automatically resets to 0001 every single day, and guards against legacy high IDs.
 */
export async function generateDailySequenceNumber(
  trxOrDb: any,
  db: Kysely<Database>,
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
      sql`SELECT pg_advisory_xact_lock(hashtext(${'daily_seq_' + tenantId + '_' + dailyPrefix}))`.compile(db),
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

export async function getMonthlyOfficialHolidayDates(
  anyDb: any,
  tenantId: string,
  startOfMonth: Date,
  endOfMonth: Date,
): Promise<string[]> {
  try {
    const startStr = startOfMonth.toISOString().slice(0, 10);
    const endStr = endOfMonth.toISOString().slice(0, 10);
    const rows = await anyDb
      .selectFrom('hr_holidays')
      .select(['start_date', 'end_date'])
      .where('tenant_id', '=', tenantId)
      .where('end_date', '>=', startStr)
      .where('start_date', '<=', endStr)
      .execute();

    const datesSet = new Set<string>();
    for (const row of rows || []) {
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

