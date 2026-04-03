import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../audit/audit.service';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { TransactionHelper } from '../database/helpers/transaction.helper';
import { Database } from '../database/database.types';
import { CreateDamagedStockDto } from './dto/create-damaged-stock.dto';
import { CreateStockCountSessionDto } from './dto/create-stock-count-session.dto';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { InventoryAdjustmentDto } from './dto/inventory-adjustment.dto';

function asJsonArray(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
}

@Injectable()
export class InventoryService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  private async branchScope(auth: AuthContext): Promise<number[]> {
    if (auth.role === 'super_admin') return [];
    const user = await this.db.selectFrom('users').select(['branch_ids_json', 'default_branch_id']).where('id', '=', auth.userId).executeTakeFirst();
    if (!user) return [];
    const ids = asJsonArray(user.branch_ids_json).map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0);
    if (user.default_branch_id && !ids.includes(user.default_branch_id)) ids.push(user.default_branch_id);
    return Array.from(new Set(ids));
  }

  private async assertLocationScope(locationId: number, auth: AuthContext): Promise<{ id: number; name: string; branchId: number | null }> {
    const location = await this.db
      .selectFrom('stock_locations')
      .select(['id', 'name', 'branch_id'])
      .where('id', '=', locationId)
      .where('is_active', '=', true)
      .executeTakeFirst();
    if (!location) throw new AppError('Location not found', 'LOCATION_NOT_FOUND', 404);
    const scope = await this.branchScope(auth);
    if (scope.length && location.branch_id && !scope.includes(location.branch_id)) {
      throw new AppError('Selected location is outside your assigned scope', 'LOCATION_SCOPE_FORBIDDEN', 400);
    }
    return { id: location.id, name: location.name || '', branchId: location.branch_id || null };
  }

  private async filterByScope<T extends { branchId?: string; fromBranchId?: string; toBranchId?: string }>(rows: T[], auth: AuthContext): Promise<T[]> {
    const scope = await this.branchScope(auth);
    if (!scope.length) return rows;
    return rows.filter((row) => {
      const ids = [Number(row.branchId || 0), Number(row.fromBranchId || 0), Number(row.toBranchId || 0)].filter((id) => id > 0);
      if (!ids.length) return true;
      return ids.some((id) => scope.includes(id));
    });
  }

  private paginate<T>(rows: T[], query: Record<string, unknown>, pageSizeDefault: number): { rows: T[]; pagination: Record<string, number> } {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || pageSizeDefault)));
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      pagination: { page: safePage, pageSize, totalItems, totalPages },
    };
  }

  async listLocations(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = await this.branchScope(auth);
    let query = this.db
      .selectFrom('stock_locations as l')
      .leftJoin('branches as b', 'b.id', 'l.branch_id')
      .select(['l.id', 'l.name', 'l.code', 'l.branch_id', 'b.name as branch_name'])
      .where('l.is_active', '=', true)
      .orderBy('l.id asc');

    if (scope.length) query = query.where('l.branch_id', 'in', scope);

    const rows = await query.execute();
    return {
      locations: rows.map((row) => ({
        id: String(row.id),
        name: row.name || '',
        code: row.code || '',
        branchId: row.branch_id ? String(row.branch_id) : '',
        branchName: row.branch_name || '',
      })),
    };
  }

  async listStockTransfers(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('inventory') && !auth.permissions.includes('canAdjustInventory')) throw new ForbiddenException('Missing required permissions');

    const transfers = await this.db
      .selectFrom('stock_transfers as t')
      .leftJoin('stock_locations as fl', 'fl.id', 't.from_location_id')
      .leftJoin('stock_locations as tl', 'tl.id', 't.to_location_id')
      .leftJoin('branches as fb', 'fb.id', 't.from_branch_id')
      .leftJoin('branches as tb', 'tb.id', 't.to_branch_id')
      .leftJoin('users as cu', 'cu.id', 't.created_by')
      .leftJoin('users as ru', 'ru.id', 't.received_by')
      .leftJoin('users as xu', 'xu.id', 't.cancelled_by')
      .select([
        't.id', 't.doc_no', 't.from_location_id', 't.to_location_id', 't.from_branch_id', 't.to_branch_id', 't.status', 't.note', 't.received_at', 't.cancelled_at', 't.created_at',
        'fl.name as from_location_name', 'tl.name as to_location_name', 'fb.name as from_branch_name', 'tb.name as to_branch_name',
        'cu.username as created_by_name', 'ru.username as received_by_name', 'xu.username as cancelled_by_name',
      ])
      .orderBy('t.id desc')
      .execute();

    const items = await this.db.selectFrom('stock_transfer_items').select(['id', 'transfer_id', 'product_id', 'product_name', 'qty']).orderBy('transfer_id asc').execute();
    const byTransfer = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const key = String(item.transfer_id);
      if (!byTransfer.has(key)) byTransfer.set(key, []);
      byTransfer.get(key)!.push({ id: String(item.id), productId: String(item.product_id), productName: item.product_name || '', qty: Number(item.qty || 0) });
    }

    let rows = transfers.map((t) => ({
      id: String(t.id),
      docNo: t.doc_no || `TR-${t.id}`,
      fromLocationId: String(t.from_location_id),
      toLocationId: String(t.to_location_id),
      fromBranchId: t.from_branch_id ? String(t.from_branch_id) : '',
      toBranchId: t.to_branch_id ? String(t.to_branch_id) : '',
      fromLocationName: t.from_location_name || '',
      toLocationName: t.to_location_name || '',
      fromBranchName: t.from_branch_name || '',
      toBranchName: t.to_branch_name || '',
      status: t.status || 'sent',
      note: t.note || '',
      receivedAt: t.received_at || '',
      cancelledAt: t.cancelled_at || '',
      createdBy: t.created_by_name || '',
      receivedBy: t.received_by_name || '',
      cancelledBy: t.cancelled_by_name || '',
      date: t.created_at,
      items: byTransfer.get(String(t.id)) || [],
    }));

    rows = await this.filterByScope(rows, auth);
    const search = String(query.search || query.q || '').toLowerCase();
    const filter = String(query.filter || query.view || 'all').toLowerCase();
    const filtered = rows.filter((row) => {
      if (filter !== 'all' && String(row.status).toLowerCase() !== filter) return false;
      if (!search) return true;
      return [row.docNo, row.note, row.fromLocationName, row.toLocationName].some((val) => String(val).toLowerCase().includes(search));
    });

    if (!query.page && !query.pageSize && !query.search && !query.q && !query.filter && !query.view) return { stockTransfers: filtered };
    const paged = this.paginate(filtered, query, 10);
    return {
      stockTransfers: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: filtered.length,
        sent: filtered.filter((r) => r.status === 'sent').length,
        received: filtered.filter((r) => r.status === 'received').length,
        cancelled: filtered.filter((r) => r.status === 'cancelled').length,
        totalQty: Number(filtered.reduce((sum, row) => sum + Number((row.items as Array<{ qty: number }>).reduce((x, i) => x + Number(i.qty || 0), 0)), 0).toFixed(3)),
      },
    };
  }

  async listStockMovements(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('inventory') && !auth.permissions.includes('canAdjustInventory')) throw new ForbiddenException('Missing required permissions');

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
      id: String(r.id), productId: r.product_id ? String(r.product_id) : '', productName: r.product_name || '', type: r.movement_type || '', qty: Number(r.qty || 0),
      beforeQty: Number(r.before_qty || 0), afterQty: Number(r.after_qty || 0), reason: r.reason || '', note: r.note || '', referenceType: r.reference_type || '', referenceId: r.reference_id ? String(r.reference_id) : '',
      branchId: r.branch_id ? String(r.branch_id) : '', branchName: r.branch_name || '', locationId: r.location_id ? String(r.location_id) : '', locationName: r.location_name || '', createdBy: r.created_by_name || '', date: r.created_at,
    }));

    mapped = await this.filterByScope(mapped, auth);
    const search = String(query.search || '').toLowerCase();
    const type = String(query.type || 'all').toLowerCase();
    const filtered = mapped.filter((r) => {
      if (type !== 'all' && String(r.type).toLowerCase() !== type) return false;
      if (!search) return true;
      return [r.productName, r.reason, r.note, r.referenceType].some((x) => String(x).toLowerCase().includes(search));
    });

    if (!query.page && !query.pageSize && !query.search && !query.type) return { stockMovements: filtered };
    const paged = this.paginate(filtered, query, 20);
    const sum = filtered.reduce((acc, r) => {
      if (r.qty >= 0) acc.positive += Number(r.qty);
      else acc.negative += Math.abs(Number(r.qty));
      return acc;
    }, { positive: 0, negative: 0, totalItems: filtered.length });

    return { stockMovements: paged.rows, pagination: paged.pagination, summary: sum };
  }

  async createStockTransfer(payload: CreateStockTransferDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (payload.fromLocationId === payload.toLocationId) throw new AppError('Source and destination locations must be different', 'INVALID_TRANSFER', 400);
    const from = await this.assertLocationScope(payload.fromLocationId, auth);
    const to = await this.assertLocationScope(payload.toLocationId, auth);

    const transferId = await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await trx
        .insertInto('stock_transfers')
        .values({
          from_location_id: from.id,
          to_location_id: to.id,
          from_branch_id: from.branchId,
          to_branch_id: to.branchId,
          status: 'sent',
          note: String(payload.note || '').trim(),
          created_by: auth.userId,
        })
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(result.id);
      await trx.updateTable('stock_transfers').set({ doc_no: `TR-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).execute();

      for (const item of payload.items) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        if (Number(product.stock_qty || 0) < Number(item.qty || 0)) throw new AppError(`Insufficient stock for ${product.name}`, 'INSUFFICIENT_STOCK', 400);
        await trx.insertInto('stock_transfer_items').values({ transfer_id: id, product_id: item.productId, product_name: product.name || '', qty: item.qty }).execute();
      }

      return id;
    });

    await this.audit.log('إنشاء تحويل مخزون', `تم إنشاء تحويل TR-${transferId} من ${from.name} إلى ${to.name}`, auth.userId);
    return { ok: true, transferId: String(transferId), stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
  }

  async receiveStockTransfer(transferId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const transfer = await trx.selectFrom('stock_transfers').selectAll().where('id', '=', transferId).executeTakeFirst();
      if (!transfer) throw new AppError('Transfer not found', 'TRANSFER_NOT_FOUND', 404);
      if ((transfer.status || 'sent') !== 'sent') throw new AppError('Only sent transfers can be received', 'TRANSFER_STATUS_INVALID', 400);

      const items = await trx.selectFrom('stock_transfer_items').select(['product_id', 'qty']).where('transfer_id', '=', transferId).execute();
      for (const item of items) {
        const product = await trx.selectFrom('products').select(['id', 'stock_qty']).where('id', '=', item.product_id).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.product_id} not found`, 'PRODUCT_NOT_FOUND', 404);
        const beforeQty = Number(product.stock_qty || 0);
        await trx.insertInto('stock_movements').values({
          product_id: product.id,
          movement_type: 'transfer_receive',
          qty: item.qty,
          before_qty: beforeQty,
          after_qty: beforeQty,
          reason: 'transfer_receive',
          note: `Received transfer TR-${transferId}`,
          reference_type: 'transfer',
          reference_id: transferId,
          created_by: auth.userId,
          branch_id: transfer.to_branch_id,
          location_id: transfer.to_location_id,
        }).execute();
      }

      await trx
        .updateTable('stock_transfers')
        .set({ status: 'received', received_by: auth.userId, received_at: sql`NOW()`, updated_at: sql`NOW()` })
        .where('id', '=', transferId)
        .execute();
    });

    await this.audit.log('استلام تحويل مخزون', `تم استلام التحويل TR-${transferId}`, auth.userId);
    return { ok: true, stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
  }

  async cancelStockTransfer(transferId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const transfer = await trx.selectFrom('stock_transfers').selectAll().where('id', '=', transferId).executeTakeFirst();
      if (!transfer) throw new AppError('Transfer not found', 'TRANSFER_NOT_FOUND', 404);
      if ((transfer.status || 'sent') !== 'sent') throw new AppError('Only sent transfers can be cancelled', 'TRANSFER_STATUS_INVALID', 400);
      await trx.updateTable('stock_transfers').set({ status: 'cancelled', cancelled_by: auth.userId, cancelled_at: sql`NOW()`, updated_at: sql`NOW()` }).where('id', '=', transferId).execute();
    });

    await this.audit.log('إلغاء تحويل مخزون', `تم إلغاء التحويل TR-${transferId}`, auth.userId);
    return { ok: true, stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
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
      bySession.get(key)!.push({ id: String(item.id), productId: String(item.product_id), productName: item.product_name || '', expectedQty: Number(item.expected_qty || 0), countedQty: Number(item.counted_qty || 0), varianceQty: Number(item.variance_qty || 0), reason: item.reason || '', note: item.note || '' });
    }

    let mapped = sessions.map((row) => ({
      id: String(row.id), docNo: row.doc_no || `COUNT-${row.id}`, branchId: row.branch_id ? String(row.branch_id) : '', branchName: row.branch_name || '',
      locationId: row.location_id ? String(row.location_id) : '', locationName: row.location_name || '', status: row.status || 'draft', note: row.note || '',
      countedBy: row.counted_by_name || '', approvedBy: row.approved_by_name || '', postedAt: row.posted_at || '', createdAt: row.created_at,
      items: bySession.get(String(row.id)) || [],
    }));

    mapped = await this.filterByScope(mapped, auth);

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

    const paged = this.paginate(filtered, query, 8);
    return {
      stockCountSessions: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: filtered.length,
        draft: filtered.filter((r) => r.status === 'draft').length,
        posted: filtered.filter((r) => r.status === 'posted').length,
        totalVariance: Number(filtered.reduce((sum, row) => sum + Number((row.items as Array<{ varianceQty: number }>).reduce((x, i) => x + Number(i.varianceQty || 0), 0)), 0).toFixed(3)),
      },
    };
  }

  async createStockCountSession(payload: CreateStockCountSessionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.assertLocationScope(payload.locationId, auth);
    if (payload.branchId && location.branchId && payload.branchId !== location.branchId) throw new AppError('Location does not belong to the selected branch', 'LOCATION_BRANCH_MISMATCH', 400);

    const sessionId = await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await trx
        .insertInto('stock_count_sessions')
        .values({ doc_no: `COUNT-${Date.now()}`, branch_id: location.branchId, location_id: location.id, status: 'draft', note: String(payload.note || '').trim(), counted_by: auth.userId })
        .returning('id')
        .executeTakeFirstOrThrow();
      const id = Number(result.id);

      for (const item of payload.items) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where('id', '=', item.productId).where('is_active', '=', true).executeTakeFirst();
        if (!product) throw new AppError('Product not found in stock count session', 'PRODUCT_NOT_FOUND', 404);
        const expectedQty = Number(product.stock_qty || 0);
        const countedQty = Number(item.countedQty || 0);
        const varianceQty = Number((countedQty - expectedQty).toFixed(3));
        await trx.insertInto('stock_count_items').values({
          session_id: id,
          product_id: item.productId,
          product_name: product.name || '',
          expected_qty: expectedQty,
          counted_qty: countedQty,
          variance_qty: varianceQty,
          reason: String(item.reason || ''),
          note: String(item.note || ''),
        }).execute();
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

  async postStockCountSession(sessionId: number, _managerPin: string | undefined, auth: AuthContext): Promise<Record<string, unknown>> {
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
        await trx.insertInto('stock_movements').values({
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
        }).execute();

        if (String(item.reason || '').toLowerCase() === 'damage' && Math.abs(variance) > 0) {
          await trx.insertInto('damaged_stock_records').values({
            product_id: item.product_id,
            branch_id: session.branch_id,
            location_id: session.location_id,
            qty: Math.abs(Math.min(variance, 0)) || Math.abs(variance),
            reason: 'damage',
            note: item.note || 'جلسة جرد',
            created_by: auth.userId,
          }).execute();
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
      .select(['d.id', 'd.product_id', 'd.branch_id', 'd.location_id', 'd.qty', 'd.reason', 'd.note', 'd.created_at', 'p.name as product_name', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .orderBy('d.id desc')
      .execute();

    let mapped = rows.map((r) => ({
      id: String(r.id), productId: String(r.product_id), productName: r.product_name || '', branchId: r.branch_id ? String(r.branch_id) : '', branchName: r.branch_name || '',
      locationId: r.location_id ? String(r.location_id) : '', locationName: r.location_name || '', qty: Number(r.qty || 0), reason: r.reason || 'damage', note: r.note || '', createdBy: r.created_by_name || '', date: r.created_at,
    }));
    mapped = await this.filterByScope(mapped, auth);

    const search = String(query.search || query.q || '').toLowerCase();
    const filtered = mapped.filter((r) => !search || [r.productName, r.reason, r.note, r.locationName, r.branchName].some((x) => String(x).toLowerCase().includes(search)));

    if (!query.page && !query.pageSize && !query.search && !query.q) return { damagedStockRecords: filtered };
    const paged = this.paginate(filtered, query, 10);
    return {
      damagedStockRecords: paged.rows,
      pagination: paged.pagination,
      summary: { totalItems: filtered.length, totalQty: Number(filtered.reduce((sum, r) => sum + Number(r.qty || 0), 0).toFixed(3)) },
    };
  }

  async createDamagedStock(payload: CreateDamagedStockDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const location = await this.assertLocationScope(payload.locationId, auth);
    if (payload.branchId && location.branchId && payload.branchId !== location.branchId) throw new AppError('Location does not belong to the selected branch', 'LOCATION_BRANCH_MISMATCH', 400);
    if (String(payload.note || '').trim().length < 8) throw new AppError('اكتب سبب التالف بوضوح في 8 أحرف على الأقل', 'DAMAGE_NOTE_REQUIRED', 400);

    await this.tx.runInTransaction(this.db, async (trx) => {
      const product = await trx.selectFrom('products').selectAll().where('id', '=', payload.productId).where('is_active', '=', true).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const beforeQty = Number(product.stock_qty || 0);
      const afterQty = beforeQty - Number(payload.qty || 0);
      if (afterQty < 0) throw new AppError('Cannot mark more damaged stock than current stock', 'INSUFFICIENT_STOCK', 400);

      await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', payload.productId).execute();
      await trx.insertInto('stock_movements').values({ product_id: payload.productId, movement_type: 'damaged', qty: -Number(payload.qty || 0), before_qty: beforeQty, after_qty: afterQty, reason: payload.reason || 'damage', note: payload.note || '', reference_type: 'damaged_stock', reference_id: payload.productId, created_by: auth.userId }).execute();
      await trx.insertInto('damaged_stock_records').values({ product_id: payload.productId, branch_id: location.branchId, location_id: location.id, qty: Number(payload.qty || 0), reason: payload.reason || 'damage', note: payload.note || '', created_by: auth.userId }).execute();
    });

    await this.audit.log('تسجيل تالف', JSON.stringify({ actorUserId: auth.userId, productId: payload.productId, qty: payload.qty }), auth.userId);

    return {
      ok: true,
      products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).execute()).map((p) => ({ id: String(p.id), name: p.name })),
      damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords,
      stockMovements: (await this.listStockMovements({}, auth)).stockMovements,
    };
  }

  async createInventoryAdjustment(payload: InventoryAdjustmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    let result: { productId: number; beforeQty: number; afterQty: number } = { productId: payload.productId, beforeQty: 0, afterQty: 0 };
    await this.tx.runInTransaction(this.db, async (trx) => {
      const product = await trx.selectFrom('products').selectAll().where('id', '=', payload.productId).where('is_active', '=', true).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const beforeQty = Number(product.stock_qty || 0);
      let afterQty = beforeQty;
      let movementQty = Number(payload.qty || 0);

      if (payload.actionType === 'adjust') {
        afterQty = Number(payload.qty || 0);
        movementQty = Math.abs(afterQty - beforeQty);
      } else if (payload.actionType === 'add') {
        afterQty = beforeQty + Number(payload.qty || 0);
      } else {
        afterQty = beforeQty - Number(payload.qty || 0);
        if (afterQty < 0) throw new AppError('Cannot deduct more than current stock', 'INSUFFICIENT_STOCK', 400);
      }

      await trx.updateTable('products').set({ stock_qty: afterQty, stock: afterQty, updated_at: sql`NOW()` }).where('id', '=', payload.productId).execute();
      await trx.insertInto('stock_movements').values({
        product_id: payload.productId,
        movement_type: payload.actionType,
        qty: payload.actionType === 'deduct' ? -movementQty : movementQty,
        before_qty: beforeQty,
        after_qty: afterQty,
        reason: payload.reason,
        note: payload.note || '',
        reference_type: 'inventory_adjustment',
        reference_id: payload.productId,
        created_by: auth.userId,
      }).execute();
      result = { productId: payload.productId, beforeQty, afterQty };
    });

    await this.audit.log('تعديل مخزون', `تم تعديل مخزون الصنف #${payload.productId} من ${result.beforeQty} إلى ${result.afterQty} بسبب ${payload.reason}`, auth.userId);

    return {
      ok: true,
      adjustment: result,
      products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).execute()).map((p) => ({ id: String(p.id), name: p.name })),
      stockMovements: (await this.listStockMovements({}, auth)).stockMovements,
      auditLogs: [],
    };
  }
}
