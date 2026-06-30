import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { paginateRows } from '../../../common/utils/pagination';
import { ensureNonNegativeStock, ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewAssignedLocationStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { Database } from '../../../database/database.types';
import { CreateStockTransferDto } from '../dto/create-stock-transfer.dto';
import { InventoryScopeService } from './inventory-scope.service';

@Injectable()
export class InventoryTransferService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly scope: InventoryScopeService,
  ) {}

  private tenantScope(auth: AuthContext) { return requireTenantScope(auth); }
  private tenantPredicate(auth: AuthContext, alias?: string) { const tenantId = this.tenantScope(auth).tenantId; return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}` : sql<boolean>`tenant_id = ${tenantId}`; }
  private tenantFields(auth: AuthContext) { const scope = this.tenantScope(auth); return { tenant_id: scope.tenantId, account_id: scope.accountId }; }

  async listStockTransfers(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('inventory') && !auth.permissions.includes('canAdjustInventory')) throw new ForbiddenException('Missing required permissions');
    let transfersQuery = this.db
      .selectFrom('stock_transfers as t')
      .leftJoin('stock_locations as fl', 'fl.id', 't.from_location_id')
      .leftJoin('stock_locations as tl', 'tl.id', 't.to_location_id')
      .leftJoin('branches as fb', 'fb.id', 't.from_branch_id')
      .leftJoin('branches as tb', 'tb.id', 't.to_branch_id')
      .leftJoin('users as cu', 'cu.id', 't.created_by')
      .leftJoin('users as ru', 'ru.id', 't.received_by')
      .leftJoin('users as xu', 'xu.id', 't.cancelled_by')
      .select(['t.id', 't.doc_no', 't.from_location_id', 't.to_location_id', 't.from_branch_id', 't.to_branch_id', 't.status', 't.note', 't.recipient_name', 't.received_at', 't.cancelled_at', 't.created_at', 'fl.name as from_location_name', 'tl.name as to_location_name', 'fb.name as from_branch_name', 'tb.name as to_branch_name', 'cu.username as created_by_name', 'ru.username as received_by_name', 'xu.username as cancelled_by_name'])
      .where(this.tenantPredicate(auth, 't'));

    if (query.locationId) {
      const locId = Number(query.locationId);
      transfersQuery = transfersQuery.where((eb) => eb.or([eb('t.from_location_id', '=', locId), eb('t.to_location_id', '=', locId)]));
    }

    const transfers = await transfersQuery.orderBy('t.id desc').execute();

    const transferIds = transfers.map((t) => Number(t.id || 0)).filter((id) => id > 0);
    const items = transferIds.length ? await this.db
      .selectFrom('stock_transfer_items')
      .select(['id', 'transfer_id', 'product_id', 'product_name', 'qty'])
      .where('transfer_id', 'in', transferIds)
      .where(this.tenantPredicate(auth))
      .orderBy('transfer_id asc')
      .execute() : [];

    const byTransfer = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const key = String(item.transfer_id);
      if (!byTransfer.has(key)) byTransfer.set(key, []);
      byTransfer.get(key)!.push({ id: String(item.id), productId: String(item.product_id), productName: item.product_name || '', qty: Number(item.qty || 0) });
    }

    let rows = transfers.map((t) => ({ id: String(t.id), docNo: t.doc_no || `TR-${t.id}`, fromLocationId: String(t.from_location_id), toLocationId: t.to_location_id ? String(t.to_location_id) : '', fromBranchId: t.from_branch_id ? String(t.from_branch_id) : '', toBranchId: t.to_branch_id ? String(t.to_branch_id) : '', fromLocationName: t.from_location_name || '', toLocationName: t.to_location_name || '', fromBranchName: t.from_branch_name || '', toBranchName: t.to_branch_name || '', status: t.status || 'sent', note: t.note || '', recipientName: t.recipient_name || '', receivedAt: t.received_at || '', cancelledAt: t.cancelled_at || '', createdBy: t.created_by_name || '', receivedBy: t.received_by_name || '', cancelledBy: t.cancelled_by_name || '', date: t.created_at, items: byTransfer.get(String(t.id)) || [] }));
    rows = await this.scope.filterByScope(rows, auth);
    const search = String(query.search || query.q || '').toLowerCase();
    const filter = String(query.filter || query.view || 'all').toLowerCase();
    const filtered = rows.filter((row) => (filter === 'all' || String(row.status).toLowerCase() === filter) && (!search || [row.docNo, row.note, row.fromLocationName, row.toLocationName].some((val) => String(val).toLowerCase().includes(search))));
    if (!query.page && !query.pageSize && !query.search && !query.q && !query.filter && !query.view) return { stockTransfers: filtered, scope: this.tenantScope(auth) };
    const paged = paginateRows(filtered, query, { defaultSize: 10 });
    return { stockTransfers: paged.rows, pagination: paged.pagination, summary: { totalItems: filtered.length, sent: filtered.filter((r) => r.status === 'sent').length, received: filtered.filter((r) => r.status === 'received').length, cancelled: filtered.filter((r) => r.status === 'cancelled').length, totalQty: Number(filtered.reduce((sum, row) => sum + Number((row.items as Array<{ qty: number }>).reduce((x, i) => x + Number(i.qty || 0), 0)), 0).toFixed(3)) }, scope: this.tenantScope(auth) };
  }

  async createStockTransfer(payload: CreateStockTransferDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (payload.fromLocationId === payload.toLocationId && payload.toLocationId != null) throw new AppError('Source and destination locations must be different', 'INVALID_TRANSFER', 400);
    ensureUniqueFlowItems(payload.items || [], 'TRANSFER_DUPLICATE_PRODUCT', 'Transfer must not contain duplicate product rows with the same unit');
    const scope = this.tenantScope(auth);
    const from = await this.scope.assertLocationScope(payload.fromLocationId, auth);
    const to = payload.toLocationId ? await this.scope.assertLocationScope(payload.toLocationId, auth) : null;
    
    if (!to && !payload.toBranchId) {
      throw new AppError('Destination location or branch is required', 'INVALID_TRANSFER', 400);
    }
    
    const transferId = await this.tx.runInTransaction(this.db, async (trx) => {
      const result = await trx.insertInto('stock_transfers').values({ 
        from_location_id: from.id, 
        to_location_id: to ? to.id : null, 
        from_branch_id: from.branchId, 
        to_branch_id: to ? to.branchId : (payload.toBranchId || null), 
        status: 'sent', 
        note: String(payload.note || '').trim(), 
        recipient_name: payload.recipientName || null, 
        created_by: auth.userId, 
        ...this.tenantFields(auth) 
      } as any).returning('id').executeTakeFirstOrThrow();
      const id = Number(result.id);
      await trx.updateTable('stock_transfers').set({ doc_no: `TR-${id}`, updated_at: sql`NOW()` }).where('id', '=', id).where(this.tenantPredicate(auth)).execute();
      for (const item of payload.items) {
        const product = await trx.selectFrom('products').select(['id', 'name']).where('id', '=', item.productId).where('is_active', '=', true).where(this.tenantPredicate(auth)).executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const stockScope = { tenantId: scope.tenantId, accountId: scope.accountId, productId: item.productId, branchId: from.branchId, locationId: from.id };
        const availableAtSource = await previewAssignedLocationStockQty(trx, stockScope);
        ensureNonNegativeStock(Number(availableAtSource || 0) - Number(item.qty || 0), 'INSUFFICIENT_LOCATION_STOCK', `Insufficient stock at ${from.name} for ${product.name}`);
        await trx.insertInto('stock_transfer_items').values({ transfer_id: id, product_id: item.productId, product_name: product.name || '', qty: item.qty, ...this.tenantFields(auth) } as any).execute();
        const stockChange = await applyStockDelta(trx, { ...stockScope, delta: -Number(item.qty || 0), errorCode: 'INSUFFICIENT_LOCATION_STOCK', errorMessage: `Insufficient stock at ${from.name} for ${product.name}` });
        await trx.insertInto('stock_movements').values({ product_id: item.productId, movement_type: 'transfer_send', qty: -Number(item.qty || 0), before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, reason: 'transfer_send', note: `Sent transfer TR-${id}`, reference_type: 'transfer', reference_id: id, created_by: auth.userId, branch_id: from.branchId, location_id: from.id, ...this.tenantFields(auth) } as any).execute();
      }
      return id;
    });
    const destinationName = to ? to.name : (payload.toBranchId ? 'الفرع' : 'غير معروف');
    await this.audit.log('إنشاء تحويل مخزون', `تم إنشاء تحويل TR-${transferId} من ${from.name} إلى ${destinationName}`, auth);
    return { ok: true, transferId: String(transferId), stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
  }

  async receiveStockTransfer(transferId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.tenantScope(auth);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const transfer = await trx.selectFrom('stock_transfers').selectAll().where('id', '=', transferId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!transfer) throw new AppError('Transfer not found', 'TRANSFER_NOT_FOUND', 404);
      if ((transfer.status || 'sent') !== 'sent') throw new AppError('Only sent transfers can be received', 'TRANSFER_STATUS_INVALID', 400);
      const items = await trx.selectFrom('stock_transfer_items').select(['product_id', 'qty']).where('transfer_id', '=', transferId).where(this.tenantPredicate(auth)).execute();
      // Notice: No transfer_receive movement is generated and stock is not increased at destination
      // because branch transfers are considered external issues.
      await trx.updateTable('stock_transfers').set({ status: 'received', received_by: auth.userId, received_at: sql`NOW()`, updated_at: sql`NOW()` }).where('id', '=', transferId).where(this.tenantPredicate(auth)).execute();
    });
    await this.audit.log('استلام تحويل مخزون', `تم استلام التحويل TR-${transferId}`, auth);
    return { ok: true, stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
  }

  async cancelStockTransfer(transferId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.tenantScope(auth);
    await this.tx.runInTransaction(this.db, async (trx) => {
      const transfer = await trx.selectFrom('stock_transfers').selectAll().where('id', '=', transferId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!transfer) throw new AppError('Transfer not found', 'TRANSFER_NOT_FOUND', 404);
      if ((transfer.status || 'sent') !== 'sent') throw new AppError('Only sent transfers can be cancelled', 'TRANSFER_STATUS_INVALID', 400);
      const items = await trx.selectFrom('stock_transfer_items').select(['product_id', 'qty']).where('transfer_id', '=', transferId).where(this.tenantPredicate(auth)).execute();
      for (const item of items) {
        const stockScope = { tenantId: scope.tenantId, accountId: scope.accountId, productId: Number(item.product_id), branchId: transfer.from_branch_id, locationId: transfer.from_location_id };
        const stockChange = await applyStockDelta(trx, { ...stockScope, delta: Number(item.qty || 0), errorCode: 'TRANSFER_CANCEL_ERROR', errorMessage: `Transfer TR-${transferId} cannot be cancelled` });
        await trx.insertInto('stock_movements').values({ product_id: Number(item.product_id), movement_type: 'transfer_cancel', qty: Number(item.qty || 0), before_qty: stockChange.scopeBefore, after_qty: stockChange.scopeAfter, reason: 'transfer_cancel', note: `Cancelled transfer TR-${transferId}`, reference_type: 'transfer', reference_id: transferId, created_by: auth.userId, branch_id: transfer.from_branch_id, location_id: transfer.from_location_id, ...this.tenantFields(auth) } as any).execute();
      }
      await trx.updateTable('stock_transfers').set({ status: 'cancelled', cancelled_by: auth.userId, cancelled_at: sql`NOW()`, updated_at: sql`NOW()` }).where('id', '=', transferId).where(this.tenantPredicate(auth)).execute();
    });
    await this.audit.log('إلغاء تحويل مخزون', `تم إلغاء التحويل TR-${transferId}`, auth);
    return { ok: true, stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
  }
}
