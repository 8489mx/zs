import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../../common/errors/app-error';
import { ensureNonNegativeStock } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewAssignedLocationStockQty, setScopedStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { Database } from '../../../database/database.types';
import { InventoryAdjustmentDto } from '../dto/inventory-adjustment.dto';
import { InventoryCountService } from './inventory-count.service';

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly countService: InventoryCountService,
  ) {}

  async createInventoryAdjustment(payload: InventoryAdjustmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    let result: { productId: number; beforeQty: number; afterQty: number } = { productId: payload.productId, beforeQty: 0, afterQty: 0 };

    await this.tx.runInTransaction(this.db, async (trx) => {
      const product = await trx.selectFrom('products').selectAll().where('id', '=', payload.productId).where('is_active', '=', true).executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const beforeQty = payload.locationId
        ? await previewAssignedLocationStockQty(trx, { productId: payload.productId, branchId: payload.branchId, locationId: payload.locationId })
        : Number(product.stock_qty || 0);
      let afterQty = beforeQty;
      let movementQty = Number(payload.qty || 0);
      let stockChange: { scopeBefore: number; scopeAfter: number };

      if (payload.actionType === 'adjust') {
        afterQty = Number(payload.qty || 0);
        movementQty = Math.abs(afterQty - beforeQty);
        stockChange = await setScopedStockQty(trx, {
          productId: payload.productId,
          nextQty: afterQty,
          branchId: payload.branchId,
          locationId: payload.locationId,
          errorCode: 'INSUFFICIENT_STOCK',
          errorMessage: 'Cannot deduct more than current stock',
        });
      } else if (payload.actionType === 'add') {
        afterQty = beforeQty + Number(payload.qty || 0);
        stockChange = await applyStockDelta(trx, {
          productId: payload.productId,
          delta: Number(payload.qty || 0),
          branchId: payload.branchId,
          locationId: payload.locationId,
        });
      } else {
        afterQty = beforeQty - Number(payload.qty || 0);
        ensureNonNegativeStock(afterQty, 'INSUFFICIENT_STOCK', 'Cannot deduct more than current stock');
        stockChange = await applyStockDelta(trx, {
          productId: payload.productId,
          delta: -Number(payload.qty || 0),
          branchId: payload.branchId,
          locationId: payload.locationId,
          errorCode: 'INSUFFICIENT_STOCK',
          errorMessage: 'Cannot deduct more than current stock',
        });
      }

      await trx
        .insertInto('stock_movements')
        .values({
          product_id: payload.productId,
          movement_type: payload.actionType,
          qty: payload.actionType === 'deduct' ? -movementQty : movementQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: payload.reason,
          note: payload.note || '',
          reference_type: 'inventory_adjustment',
          reference_id: payload.productId,
          branch_id: payload.branchId ?? null,
          location_id: payload.locationId ?? null,
          created_by: auth.userId,
        })
        .execute();
      result = { productId: payload.productId, beforeQty: stockChange.scopeBefore, afterQty: stockChange.scopeAfter };
    });

    await this.audit.log('تعديل مخزون', `تم تعديل مخزون الصنف #${payload.productId} من ${result.beforeQty} إلى ${result.afterQty} بسبب ${payload.reason}`, auth.userId);

    return {
      ok: true,
      adjustment: result,
      products: (await this.db.selectFrom('products').select(['id', 'name']).where('is_active', '=', true).execute()).map((p) => ({ id: String(p.id), name: p.name })),
      stockMovements: (await this.countService.listStockMovements({}, auth)).stockMovements,
      auditLogs: [],
    };
  }
}
