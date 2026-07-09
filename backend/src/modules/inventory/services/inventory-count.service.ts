import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { paginateRows } from '../../../common/utils/pagination';
import { applyStockDelta, previewAssignedLocationStockQty, previewConsumableStockQty, setScopedStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { Database } from '../../../database/database.types';
import { CreateDamagedStockDto } from '../dto/create-damaged-stock.dto';
import { CreateStockCountSessionDto } from '../dto/create-stock-count-session.dto';
import { buildDamagedStockSummary, buildStockCountSummary, buildStockMovementSummary, groupStockCountItemsBySession, mapDamagedStockRow, mapStockCountSessionRow, mapStockMovementRow } from '../helpers/inventory-count-listing.helper';
import { assertInventoryLocationBranchMatch, buildDamagedStockWriteModels, buildDamageRecordFromCount, buildStockCountItemValues, buildStockCountPostingMovement, buildStockCountSessionDocNo, shouldCreateDamageRecordFromCount } from '../helpers/inventory-count-write.helper';
import { InventoryScopeService } from './inventory-scope.service';

@Injectable()
export class InventoryCountService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly scope: InventoryScopeService,
  ) {}

  private tenantScope(auth: AuthContext) { return requireTenantScope(auth); }
  private tenantPredicate(auth: AuthContext, alias?: string) { const tenantId = this.tenantScope(auth).tenantId; return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}` : sql<boolean>`tenant_id = ${tenantId}`; }
  private tenantFields(auth: AuthContext) { const scope = this.tenantScope(auth); return { tenant_id: scope.tenantId, account_id: scope.accountId }; }

    async listStockMovements(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
      const rows = await this.db
        .selectFrom('stock_movements as m')
        .leftJoin('products as p', 'p.id', 'm.product_id')
        .leftJoin('branches as b', 'b.id', 'm.branch_id')
        .leftJoin('stock_locations as l', 'l.id', 'm.location_id')
        .leftJoin('users as u', 'u.id', 'm.created_by')
        .leftJoin('stock_transfers as st', (join) => join.on('m.reference_type', '=', 'transfer').onRef('m.reference_id', '=', 'st.id'))
        .select(['m.id', 'm.product_id', 'm.movement_type', 'm.qty', 'm.before_qty', 'm.after_qty', 'm.reason', 'm.note', 'm.reference_type', 'm.reference_id', 'm.branch_id', 'm.location_id', 'm.created_at', 'p.name as product_name', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
        .where(this.tenantPredicate(auth, 'm'))
        .where((eb) => eb.or([eb('st.status', 'is', null), eb('st.status', '!=', 'cancelled')]))
        .orderBy('m.id', 'desc')
        .execute();
    let mapped = rows.map(mapStockMovementRow);
    mapped = await this.scope.filterByScope(mapped, auth);
    const search = String(query.search || '').toLowerCase();
    const type = String(query.type || 'all').toLowerCase();
    const locationId = query.locationId ? String(query.locationId) : 'all';
    
    const filtered = mapped.filter((r) => 
      (type === 'all' || String(r.type).toLowerCase() === type) && 
      (locationId === 'all' || String(r.locationId) === locationId) && 
      (!search || [r.productName, r.reason, r.note, r.referenceType, r.locationName, r.branchName].some((x) => String(x).toLowerCase().includes(search)))
    );
    
    if (!query.page && !query.pageSize && !query.search && !query.type && !query.locationId) return { stockMovements: filtered, scope: this.tenantScope(auth) };
    const paged = paginateRows(filtered, query, { defaultSize: 20 });
    return { stockMovements: paged.rows, pagination: paged.pagination, summary: buildStockMovementSummary(filtered as Array<{ qty: number }>), scope: this.tenantScope(auth) };
  }

  async listStockCountSessions(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const sessions = await this.db
      .selectFrom('stock_count_sessions as s')
      .leftJoin('branches as b', 'b.id', 's.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 's.location_id')
      .leftJoin('users as cu', 'cu.id', 's.counted_by')
      .leftJoin('users as au', 'au.id', 's.approved_by')
      .select(['s.id', 's.doc_no', 's.branch_id', 's.location_id', 's.status', 's.note', 's.posted_at', 's.created_at', 'b.name as branch_name', 'l.name as location_name', 'cu.username as counted_by_name', 'au.username as approved_by_name'])
      .where(this.tenantPredicate(auth, 's'))
      .orderBy('s.id', 'desc')
      .execute();

    const sessionIds = sessions.map((row) => Number(row.id || 0)).filter((id) => id > 0);
    const items = sessionIds.length ? await this.db.selectFrom('stock_count_items').selectAll().where('session_id', 'in', sessionIds).where(this.tenantPredicate(auth)).orderBy('session_id', 'asc').execute() : [];
    const bySession = groupStockCountItemsBySession(items as never);
    let mapped = sessions.map((row) => mapStockCountSessionRow(row as never, bySession));
    mapped = await this.scope.filterByScope(mapped, auth);

    if (!query.page && !query.pageSize && !query.search && !query.filter && !query.view) return { stockCountSessions: mapped, damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords, scope: this.tenantScope(auth) };
    const search = String(query.search || query.q || '').toLowerCase();
    const filter = String(query.filter || query.view || 'all').toLowerCase();
    const filtered = mapped.filter((row) => (filter === 'all' || String(row.status).toLowerCase() === filter) && (!search || [row.docNo, row.note, row.locationName, row.branchName].some((x) => String(x).toLowerCase().includes(search))));
    const paged = paginateRows(filtered, query, { defaultSize: 8 });
    return { stockCountSessions: paged.rows, pagination: paged.pagination, summary: buildStockCountSummary(filtered as unknown as Array<{ status: string; items: Array<{ varianceQty: number }> }>), scope: this.tenantScope(auth) };
  }

  async createStockCountSession(payload: CreateStockCountSessionDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantScope = this.tenantScope(auth);
    const location = await this.scope.assertLocationScope(payload.locationId, auth);
    assertInventoryLocationBranchMatch(payload.branchId, location.branchId);
    const sessionId = await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await trx.insertInto('stock_count_sessions').values({ doc_no: buildStockCountSessionDocNo(), branch_id: location.branchId, location_id: location.id, status: 'draft', note: String(payload.note || '').trim(), counted_by: auth.userId, ...this.tenantFields(auth) }).returning('id').executeTakeFirstOrThrow();
      const id = Number(result.id);
      for (const item of payload.items) {
        const product = await trx.selectFrom('products').select(['id', 'name', 'stock_qty']).where('id', '=', item.productId).where('is_active', '=', true).where(this.tenantPredicate(auth)).executeTakeFirst();
        if (!product) throw new AppError('Product not found in stock count session', 'PRODUCT_NOT_FOUND', 404);
        const expectedQty = await previewAssignedLocationStockQty(trx, { productId: item.productId, branchId: location.branchId, locationId: location.id, tenantId: tenantScope.tenantId, accountId: tenantScope.accountId });
        await trx.insertInto('stock_count_items').values({ ...buildStockCountItemValues({ ...product, stock_qty: expectedQty }, item, id), ...this.tenantFields(auth) }).execute();
      }
      return id;
    });
    await this.audit.log('جلسة جرد مخزون', JSON.stringify({ actorUserId: auth.userId, after: { sessionId, branchId: location.branchId, locationId: location.id, status: 'draft' } }), auth);
    return { ok: true, sessionId: String(sessionId), stockCountSessions: (await this.listStockCountSessions({}, auth)).stockCountSessions, damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords };
  }

  async postStockCountSession(sessionId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantScope = this.tenantScope(auth);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const session = await trx.selectFrom('stock_count_sessions').selectAll().where('id', '=', sessionId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!session) throw new AppError('Stock count session not found', 'SESSION_NOT_FOUND', 404);
      if ((session.status || 'draft') !== 'draft') throw new AppError('Stock count session already posted', 'SESSION_ALREADY_POSTED', 400);
      const items = await trx.selectFrom('stock_count_items').selectAll().where('session_id', '=', sessionId).where(this.tenantPredicate(auth)).orderBy('id', 'asc').execute();
      if (!items.length) throw new AppError('Stock count session has no items', 'SESSION_EMPTY', 400);
      for (const item of items) {
        const variance = Number(item.variance_qty || 0);
        if (variance === 0) continue;
        const counted = Number(item.counted_qty || 0);
        const stockChange = await setScopedStockQty(trx, { productId: Number(item.product_id), nextQty: counted, branchId: session.branch_id, locationId: session.location_id, tenantId: tenantScope.tenantId, accountId: tenantScope.accountId, errorCode: 'INSUFFICIENT_STOCK', errorMessage: 'Stock count posting cannot drive total stock below zero' });
        await trx.insertInto('stock_movements').values({ ...buildStockCountPostingMovement(item, sessionId, auth.userId), before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, branch_id: session.branch_id, location_id: session.location_id, ...this.tenantFields(auth) }).execute();
        if (shouldCreateDamageRecordFromCount(item)) await trx.insertInto('damaged_stock_records').values({ ...buildDamageRecordFromCount(item, session, auth.userId), ...this.tenantFields(auth) }).execute();
      }
      await trx.updateTable('stock_count_sessions').set({ status: 'posted', approved_by: auth.userId, posted_at: sql`NOW()`, updated_at: sql`NOW()` }).where('id', '=', sessionId).where(this.tenantPredicate(auth)).execute();
    });
    await this.audit.log('اعتماد جلسة جرد', JSON.stringify({ actorUserId: auth.userId, after: { sessionId, status: 'posted' } }), auth);
    return { ok: true, stockCountSessions: (await this.listStockCountSessions({}, auth)).stockCountSessions, products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).where(this.tenantPredicate(auth)).execute()).map((p) => ({ id: String(p.id), name: p.name })), stockMovements: (await this.listStockMovements({}, auth)).stockMovements, damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords };
  }

  async listDamagedStock(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('damaged_stock_records as d')
      .leftJoin('products as p', 'p.id', 'd.product_id')
      .leftJoin('branches as b', 'b.id', 'd.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'd.location_id')
      .leftJoin('users as u', 'u.id', 'd.created_by')
      .select(['d.id', 'd.product_id', 'd.branch_id', 'd.location_id', 'd.qty', 'd.reason', 'd.note', 'd.created_at', 'p.name as product_name', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .where(this.tenantPredicate(auth, 'd'))
      .orderBy('d.id', 'desc')
      .execute();
    let mapped = rows.map(mapDamagedStockRow);
    mapped = await this.scope.filterByScope(mapped, auth);
    const search = String(query.search || query.q || '').toLowerCase();
    const filtered = mapped.filter((r) => !search || [r.productName, r.reason, r.note, r.locationName, r.branchName].some((x) => String(x).toLowerCase().includes(search)));
    if (!query.page && !query.pageSize && !query.search && !query.q) return { damagedStockRecords: filtered, scope: this.tenantScope(auth) };
    const paged = paginateRows(filtered, query, { defaultSize: 10 });
    return { damagedStockRecords: paged.rows, pagination: paged.pagination, summary: buildDamagedStockSummary(filtered as Array<{ qty: number }>), scope: this.tenantScope(auth) };
  }

  async createDamagedStock(payload: CreateDamagedStockDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantScope = this.tenantScope(auth);
    const location = await this.scope.assertLocationScope(payload.locationId, auth);
    assertInventoryLocationBranchMatch(payload.branchId, location.branchId);
    if (String(payload.note || '').trim().length < 8) throw new AppError('اكتب سبب التالف بوضوح في 8 أحرف على الأقل', 'DAMAGE_NOTE_REQUIRED', 400);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const product = await trx.selectFrom('products').selectAll().where('id', '=', payload.productId).where('is_active', '=', true).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const availableQty = await previewConsumableStockQty(trx, { productId: payload.productId, branchId: location.branchId, locationId: location.id, tenantId: tenantScope.tenantId, accountId: tenantScope.accountId });
      const writeModels = buildDamagedStockWriteModels({ ...product, stock_qty: availableQty }, payload, location, auth.userId);
      const stockChange = await applyStockDelta(trx, { productId: payload.productId, delta: -Number(payload.qty || 0), branchId: location.branchId, locationId: location.id, tenantId: tenantScope.tenantId, accountId: tenantScope.accountId, errorCode: 'INSUFFICIENT_STOCK', errorMessage: 'Cannot mark more damaged stock than current stock' });
      await trx.insertInto('stock_movements').values({ ...writeModels.stockMovement, before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, branch_id: location.branchId ?? null, location_id: location.id, ...this.tenantFields(auth) }).execute();
      await trx.insertInto('damaged_stock_records').values({ ...writeModels.damagedRecord, ...this.tenantFields(auth) }).execute();
    });
    await this.audit.log('تسجيل تالف', JSON.stringify({ actorUserId: auth.userId, productId: payload.productId, qty: payload.qty }), auth);
    return { ok: true, products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).where(this.tenantPredicate(auth)).execute()).map((p) => ({ id: String(p.id), name: p.name })), damagedStockRecords: (await this.listDamagedStock({}, auth)).damagedStockRecords, stockMovements: (await this.listStockMovements({}, auth)).stockMovements };
  }
}
