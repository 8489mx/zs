import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { paginateRows } from '../../../common/utils/pagination';
import { ensureNonNegativeStock, ensureUniqueFlowItems } from '../../../common/utils/financial-integrity';
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

  async listStockTransfers(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('inventory') && !auth.permissions.includes('canAdjustInventory')) {
      throw new ForbiddenException('Missing required permissions');
    }

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

    const items = await this.db
      .selectFrom('stock_transfer_items')
      .select(['id', 'transfer_id', 'product_id', 'product_name', 'qty'])
      .orderBy('transfer_id asc')
      .execute();

    const byTransfer = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const key = String(item.transfer_id);
      if (!byTransfer.has(key)) byTransfer.set(key, []);
      byTransfer.get(key)!.push({
        id: String(item.id),
        productId: String(item.product_id),
        productName: item.product_name || '',
        qty: Number(item.qty || 0),
      });
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

    rows = await this.scope.filterByScope(rows, auth);
    const search = String(query.search || query.q || '').toLowerCase();
    const filter = String(query.filter || query.view || 'all').toLowerCase();
    const filtered = rows.filter((row) => {
      if (filter !== 'all' && String(row.status).toLowerCase() !== filter) return false;
      if (!search) return true;
      return [row.docNo, row.note, row.fromLocationName, row.toLocationName].some((val) => String(val).toLowerCase().includes(search));
    });

    if (!query.page && !query.pageSize && !query.search && !query.q && !query.filter && !query.view) return { stockTransfers: filtered };
    const paged = paginateRows(filtered, query, { defaultSize: 10 });
    return {
      stockTransfers: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: filtered.length,
        sent: filtered.filter((r) => r.status === 'sent').length,
        received: filtered.filter((r) => r.status === 'received').length,
        cancelled: filtered.filter((r) => r.status === 'cancelled').length,
        totalQty: Number(
          filtered
            .reduce((sum, row) => sum + Number((row.items as Array<{ qty: number }>).reduce((x, i) => x + Number(i.qty || 0), 0)), 0)
            .toFixed(3),
        ),
      },
    };
  }

  async createStockTransfer(payload: CreateStockTransferDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (payload.fromLocationId === payload.toLocationId) throw new AppError('Source and destination locations must be different', 'INVALID_TRANSFER', 400);
    ensureUniqueFlowItems(payload.items || [], 'TRANSFER_DUPLICATE_PRODUCT', 'Transfer must not contain duplicate product rows with the same unit');
    const from = await this.scope.assertLocationScope(payload.fromLocationId, auth);
    const to = await this.scope.assertLocationScope(payload.toLocationId, auth);

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
        const product = await trx
          .selectFrom('products')
          .select(['id', 'name', 'stock_qty'])
          .where('id', '=', item.productId)
          .where('is_active', '=', true)
          .executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.productId} not found`, 'PRODUCT_NOT_FOUND', 404);
        const remaining = Number(product.stock_qty || 0) - Number(item.qty || 0);
        ensureNonNegativeStock(remaining, 'INSUFFICIENT_STOCK', `Insufficient stock for ${product.name}`);
        await trx
          .insertInto('stock_transfer_items')
          .values({ transfer_id: id, product_id: item.productId, product_name: product.name || '', qty: item.qty })
          .execute();
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
        const product = await trx
          .selectFrom('products')
          .select(['id', 'stock_qty'])
          .where('id', '=', item.product_id)
          .where('is_active', '=', true)
          .executeTakeFirst();
        if (!product) throw new AppError(`Product #${item.product_id} not found`, 'PRODUCT_NOT_FOUND', 404);
        const beforeQty = Number(product.stock_qty || 0);
        await trx
          .insertInto('stock_movements')
          .values({
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
          })
          .execute();
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
      await trx
        .updateTable('stock_transfers')
        .set({ status: 'cancelled', cancelled_by: auth.userId, cancelled_at: sql`NOW()`, updated_at: sql`NOW()` })
        .where('id', '=', transferId)
        .execute();
    });

    await this.audit.log('إلغاء تحويل مخزون', `تم إلغاء التحويل TR-${transferId}`, auth.userId);
    return { ok: true, stockTransfers: (await this.listStockTransfers({}, auth)).stockTransfers };
  }
}
