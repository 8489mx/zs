import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { paginateRows } from '../../../common/utils/pagination';
import { ensureNonNegativeStock } from '../../../common/utils/financial-integrity';
import { KYSELY_DB } from '../../../database/database.constants';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { Database } from '../../../database/database.types';
import { CreateDamagedStockDto } from '../dto/create-damaged-stock.dto';
import { CreateStockCountSessionDto } from '../dto/create-stock-count-session.dto';
import { InventoryScopeService } from './inventory-scope.service';

@Injectable()
export class InventoryCountService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly scope: InventoryScopeService,
  ) {}

  async listStockMovements(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('stock_movements as m')
      .leftJoin('products as p', 'p.id', 'm.product_id')
      .leftJoin('branches as b', 'b.id', 'm.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'm.location_id')
      .leftJoin('users as u', 'u.id', 'm.created_by')
      .select([
        'm.id', 'm.product_id', 'm.movement_type', 'm.qty', 'm.before_qty', 'm.after_qty', 'm.reason', 'm.note', 'm.reference_type', 'm.reference_id', 'm.branch_id', 'm.location_id', 'm.created_at',
        'p.name as product_name', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('m.id desc')
      .execute();

    let mapped = rows.map((r) => ({
      id: String(r.id),
      productId: r.product_id ? String(r.product_id) : '',
      productName: r.product_name || '',
      type: r.movement_type || '',
      qty: Number(r.qty || 0),
      beforeQty: Number(r.before_qty || 0),
      afterQty: Number(r.after_qty || 0),
      reason: r.reason || '',
      note: r.note || '',
      referenceType: r.reference_type || '',
      referenceId: r.reference_id ? String(r.reference_id) : '',
      branchId: r.branch_id ? String(r.branch_id) : '',
      branchName: r.branch_name || '',
      locationId: r.location_id ? String(r.location_id) : '',
      locationName: r.location_name || '',
      createdBy: r.created_by_name || '',
      date: r.created_at,
    }));

    mapped = await this.scope.filterByScope(mapped, auth);
    const search = String(query.search || '').toLowerCase();
    const type = String(query.type || 'all').toLowerCase();
    const filtered = mapped.filter((r) => {
      if (type !== 'all' && String(r.type).toLowerCase() !== type) return false;
      if (!search) return true;
      return [r.productName, r.reason, r.note, r.referenceType].some((x) => String(x).toLowerCase().includes(search));
    });

    if (!query.page && !query.pageSize && !query.search && !query.type) return { stockMovements: filtered };
    const paged = paginateRows(filtered, query, { defaultSize: 20 });
    const sum = filtered.reduce(
      (acc, r) => {
        if (r.qty >= 0) acc.positive += Number(r.qty);
        else acc.negative += Math.abs(Number(r.qty));
        return acc;
      },
      { positive: 0, negative: 0, totalItems: filtered.length },
    );

    return { stockMovements: paged.rows, pagination: paged.pagination, summary: sum };
  }

  async listStockCountSessions(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const sessions = await this.db
      .selectFrom('stock_count_sessions as s')
      .leftJoin('branches as b', 'b.id', 's.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 's.location_id')
      .leftJoin('users as cu', 'cu.id', 's.counted_by')
      .leftJoin('users as au', 'au.id', 's.approved_by')
      .select([
        's.id', 's.doc_no', 's.branch_id', 's.location_id', 's.status', 's.note', 's.posted_at', 's.created_at',
        'b.name as branch_name', 'l.name as location_name', 'cu.username as counted_by_name', 'au.username as approved_by_name',
      ])
      .orderBy('s.id desc')
      .execute();

    const items = await this.db.selectFrom('stock_count_items').selectAll().orderBy('session_id asc').execute();
    const bySession = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const key = String(item.session_id);
      if (!bySession.has(key)) bySession.set(key, []);
      bySession.get(key)!.push({
        id: String(item.id),
        productId: String(item.product_id),
        productName: item.product_name || '',
        expectedQty: Number(item.expected_qty || 0),
        countedQty: Number(item.counted_qty || 0),
        varianceQty: Number(item.variance_qty || 0),
        reason: item.reason || '',
        note: item.note || '',
      });
    }

    let mapped = sessions.map((row) => ({
      id: String(row.id),
      docNo: row.doc_no || `COUNT-${row.id}`,
      branchId: row.branch_id ? String(row.branch_id) : '',
      branchName: row.branch_name || '',
      locationId: row.location_id ? String(row.location_id) : '',
      locationName: row.location_name || '',
      status: row.status || 'draft',
      note: row.note || '',
      countedBy: row.counted_by_name || '',
      approvedBy: row.approved_by_name || '',
      postedAt: row.posted_at || '',
      createdAt: row.created_at,
      items: bySession.get(String(row.id)) || [],
    }));

    mapped = await this.scope.filterByScope(mapped, auth);

    if (!query.page && !query.pageSize && !query.search && !query.filter && !query.view) {
      return { stockCountSessions: mapped, damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords };
    }

    const search = String(query.search || query.q || '').toLowerCase();
    const filter = String(query.filter || query.view || 'all').toLowerCase();
    const filtered = mapped.filter((row) => {
      if (filter !== 'all' && String(row.status).toLowerCase() !== filter) return false;
      if (!search) return true;
      return [row.docNo, row.note, row.locationName, row.branchName].some((x) => String(x).toLowerCase().includes(search));
    });

    const paged = paginateRows(filtered, query, { defaultSize: 8 });
    return {
      stockCountSessions: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: filtered.length,
        draft: filtered.filter((r) => r.status === 'draft').length,
        posted: filtered.filter((r) => r.status === 'posted').length,
        totalVariance: Number(
          filtered
            .reduce((sum, row) => sum + Number((row.items as Array<{ varianceQty: number }>).reduce((x, i) => x + Number(i.varianceQty || 0), 0)), 0)
            .toFixed(3),
        ),
      },
    };
  }

  async createStockCountSession(payload: CreateStockCountSessionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.scope.assertLocationScope(payload.locationId, auth);
    if (payload.branchId && location.branchId && payload.branchId !== location.branchId) {
      throw new AppError('Location does not belong to the selected branch', 'LOCATION_BRANCH_MISMATCH', 400);
    }

    const sessionId = await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await trx
        .insertInto('stock_count_sessions')
        .values({
          doc_no: `COUNT-${Date.now()}`,
          branch_id: location.branchId,
          location_id: location.id,
          status: 'draft',
          note: String(payload.note || '').trim(),
          counted_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      const id = Number(result.id);

      for (const item of payload.items) {
        const product = await trx
          .selectFrom('products')
          .select(['id', 'name', 'stock_qty'])
          .where('id', '=', item.productId)
          .where('is_active', '=', true)
          .executeTakeFirst();
        if (!product) throw new AppError('Product not found in stock count session', 'PRODUCT_NOT_FOUND', 404);
        const expectedQty = Number(product.stock_qty || 0);
        const countedQty = Number(item.countedQty || 0);
        const varianceQty = Number((countedQty - expectedQty).toFixed(3));
        await trx
          .insertInto('stock_count_items')
          .values({
            session_id: id,
            product_id: item.productId,
            product_name: product.name || '',
            expected_qty: expectedQty,
            counted_qty: countedQty,
            variance_qty: varianceQty,
            reason: String(item.reason || ''),
            note: String(item.note || ''),
          })
          .execute();
      }

      return id;
    });

    await this.audit.log('جلسة جرد مخزون', JSON.stringify({ actorUserId: auth.userId, after: { sessionId, branchId: location.branchId, locationId: location.id, status: 'draft' } }), auth.userId);

    return {
      ok: true,
      sessionId: String(sessionId),
      stockCountSessions: (await this.listStockCountSessions({}, auth)).stockCountSessions,
      damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords,
    };
  }

  async postStockCountSession(sessionId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const session = await trx.selectFrom('stock_count_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst();
      if (!session) throw new AppError('Stock count session not found', 'SESSION_NOT_FOUND', 404);
      if ((session.status || 'draft') !== 'draft') throw new AppError('Stock count session already posted', 'SESSION_ALREADY_POSTED', 400);

      const items = await trx.selectFrom('stock_count_items').selectAll().where('session_id', '=', sessionId).orderBy('id asc').execute();
      if (!items.length) throw new AppError('Stock count session has no items', 'SESSION_EMPTY', 400);

      for (const item of items) {
        const variance = Number(item.variance_qty || 0);
        if (variance === 0) continue;
        const counted = Number(item.counted_qty || 0);

        await trx.updateTable('products').set({ stock_qty: counted, stock: counted, updated_at: sql`NOW()` }).where('id', '=', item.product_id).execute();
        await trx
          .insertInto('stock_movements')
          .values({
            product_id: item.product_id,
            movement_type: variance > 0 ? 'stock_count_gain' : 'stock_count_loss',
            qty: variance,
            before_qty: Number(item.expected_qty || 0),
            after_qty: counted,
            reason: item.reason || 'inventory_count',
            note: item.note || '',
            reference_type: 'stock_count_session',
            reference_id: sessionId,
            created_by: auth.userId,
          })
          .execute();

        if (String(item.reason || '').toLowerCase() === 'damage' && Math.abs(variance) > 0) {
          await trx
            .insertInto('damaged_stock_records')
            .values({
              product_id: item.product_id,
              branch_id: session.branch_id,
              location_id: session.location_id,
              qty: Math.abs(Math.min(variance, 0)) || Math.abs(variance),
              reason: 'damage',
              note: item.note || 'جلسة جرد',
              created_by: auth.userId,
            })
            .execute();
        }
      }

      await trx.updateTable('stock_count_sessions').set({ status: 'posted', approved_by: auth.userId, posted_at: sql`NOW()`, updated_at: sql`NOW()` }).where('id', '=', sessionId).execute();
    });

    await this.audit.log('اعتماد جلسة جرد', JSON.stringify({ actorUserId: auth.userId, after: { sessionId, status: 'posted' } }), auth.userId);

    return {
      ok: true,
      stockCountSessions: (await this.listStockCountSessions({}, auth)).stockCountSessions,
      products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).execute()).map((p) => ({ id: String(p.id), name: p.name })),
      stockMovements: (await this.listStockMovements({}, auth)).stockMovements,
      damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords,
    };
  }

  async listDamagedStock(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('damaged_stock_records as d')
      .leftJoin('products as p', 'p.id', 'd.product_id')
      .leftJoin('branches as b', 'b.id', 'd.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'd.location_id')
      .leftJoin('users as u', 'u.id', 'd.created_by')
      .select([
        'd.id', 'd.product_id', 'd.branch_id', 'd.location_id', 'd.qty', 'd.reason', 'd.note', 'd.created_at', 'p.name as product_name', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('d.id desc')
      .execute();

    let mapped = rows.map((r) => ({
      id: String(r.id),
      productId: String(r.product_id),
      productName: r.product_name || '',
      branchId: r.branch_id ? String(r.branch_id) : '',
      branchName: r.branch_name || '',
      locationId: r.location_id ? String(r.location_id) : '',
      locationName: r.location_name || '',
      qty: Number(r.qty || 0),
      reason: r.reason || 'damage',
      note: r.note || '',
      createdBy: r.created_by_name || '',
      date: r.created_at,
    }));
    mapped = await this.scope.filterByScope(mapped, auth);

    const search = String(query.search || query.q || '').toLowerCase();
    const filtered = mapped.filter((r) => !search || [r.productName, r.reason, r.note, r.locationName, r.branchName].some((x) => String(x).toLowerCase().includes(search)));

    if (!query.page && !query.pageSize && !query.search && !query.q) return { damagedStockRecords: filtered };
    const paged = paginateRows(filtered, query, { defaultSize: 10 });
    return {
      damagedStockRecords: paged.rows,
      pagination: paged.pagination,
      summary: { totalItems: filtered.length, totalQty: Number(filtered.reduce((sum, r) => sum + Number(r.qty || 0), 0).toFixed(3)) },
    };
  }

  async createDamagedStock(payload: CreateDamagedStockDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.scope.assertLocationScope(payload.locationId, auth);
    if (payload.branchId && location.branchId && payload.branchId !== location.branchId) {
      throw new AppError('Location does not belong to the selected branch', 'LOCATION_BRANCH_MISMATCH', 400);
    }
    if (String(payload.note || '').trim().length < 8) {
      throw new AppError('اكتب سبب التالف بوضوح في 8 أحرف على الأقل', 'DAMAGE_NOTE_REQUIRED', 400);
    }

    await this.tx.runInTransaction(this.db, async (trx) => {
      const product = await trx.selectFrom('products').selectAll().where('id', '=', payload.productId).where('is_active', '=', true).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const beforeQty = Number(product.stock_qty || 0);
      const afterQty = beforeQty - Number(payload.qty || 0);
      ensureNonNegativeStock(afterQty, 'INSUFFICIENT_STOCK', 'Cannot mark more damaged stock than current stock');

      await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', payload.productId).execute();
      await trx
        .insertInto('stock_movements')
        .values({
          product_id: payload.productId,
          movement_type: 'damaged',
          qty: -Number(payload.qty || 0),
          before_qty: beforeQty,
          after_qty: afterQty,
          reason: payload.reason || 'damage',
          note: payload.note || '',
          reference_type: 'damaged_stock',
          reference_id: payload.productId,
          created_by: auth.userId,
        })
        .execute();
      await trx
        .insertInto('damaged_stock_records')
        .values({
          product_id: payload.productId,
          branch_id: location.branchId,
          location_id: location.id,
          qty: Number(payload.qty || 0),
          reason: payload.reason || 'damage',
          note: payload.note || '',
          created_by: auth.userId,
        })
        .execute();
    });

    await this.audit.log('تسجيل تالف', JSON.stringify({ actorUserId: auth.userId, productId: payload.productId, qty: payload.qty }), auth.userId);

    return {
      ok: true,
      products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).execute()).map((p) => ({ id: String(p.id), name: p.name })),
      damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords,
      stockMovements: (await this.listStockMovements({}, auth)).stockMovements,
    };
  }
}
