import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { ensureNonNegativeStock } from '../../../common/utils/financial-integrity';
import { applyStockDelta, previewAssignedLocationStockQty, setScopedStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { Database } from '../../../database/database.types';
import { InventoryAdjustmentDto } from '../dto/inventory-adjustment.dto';
import { InventoryCountService } from './inventory-count.service';
import { InventoryScopeService } from './inventory-scope.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';
import { IdempotencyService } from '../../../core/idempotency/idempotency.service';
import { idempotencyStorage } from '../../../core/idempotency/idempotency.context';

@Injectable()
export class InventoryAdjustmentService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
    private readonly countService: InventoryCountService,
    private readonly scopeService: InventoryScopeService,
    private readonly idempotency: IdempotencyService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  async createInventoryAdjustment(payload: InventoryAdjustmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const idemCtx = idempotencyStorage.getStore();
    if (idemCtx?.idempotencyKey) {
      const cached = await this.idempotency.check(idemCtx.idempotencyKey, scope);
      if (cached) return cached.response;
    }

    let result: any = { productId: payload.productId, locationId: payload.locationId, beforeQty: 0, afterQty: 0, scopeBefore: 0, scopeAfter: 0, globalBefore: 0, globalAfter: 0 };

    if (payload.locationId) {
      await this.scopeService.assertLocationScope(payload.locationId, auth, false, 'write');
    }

    const finalResponse = await this.tx.runInTransaction(this.db, async (trx) => {
      const requestedQty = Number(payload.qty);
      if (!Number.isFinite(requestedQty) || requestedQty < 0
        || Math.abs(requestedQty * 1000 - Math.round(requestedQty * 1000)) > 0.000001) {
        throw new AppError('Quantity must be finite, non-negative and have at most three decimal places', 'INVALID_QTY', 400);
      }
      const product = await trx
        .selectFrom('products')
        .selectAll()
        .where('id', '=', payload.productId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .where('account_id', '=', scope.accountId)
        .where('is_active', '=', true)
        .forUpdate()
        .executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const unitCost = Number(product.cost_price);
      if (!Number.isFinite(unitCost) || unitCost <= 0) {
        throw new AppError('A positive product cost is required for inventory journal posting', 'INVENTORY_COST_MISSING', 400);
      }
      const stockScope = { tenantId: scope.tenantId, accountId: scope.accountId, productId: payload.productId, branchId: payload.branchId, locationId: payload.locationId };
      const beforeQty = payload.locationId
        ? await previewAssignedLocationStockQty(trx, stockScope)
        : Number(product.stock_qty || 0);
      let afterQty = beforeQty;
      let movementQty = requestedQty;
      let stockChange: { scopeBefore: number; scopeAfter: number; globalBefore: number; globalAfter: number; };

      if (payload.actionType !== 'adjust' && movementQty <= 0) {
        throw new AppError('Quantity must be strictly positive for add and deduct operations', 'INVALID_QTY', 400);
      }

      if (payload.actionType === 'adjust') {
        afterQty = requestedQty;
        stockChange = await setScopedStockQty(trx, {
          ...stockScope,
          nextQty: afterQty,
          errorCode: 'INSUFFICIENT_STOCK',
          errorMessage: 'Cannot deduct more than current stock',
        });
      } else if (payload.actionType === 'add') {
        afterQty = beforeQty + Number(payload.qty || 0);
        stockChange = await applyStockDelta(trx, {
          ...stockScope,
          delta: Number(payload.qty || 0),
        });
      } else {
        afterQty = beforeQty - Number(payload.qty || 0);
        ensureNonNegativeStock(afterQty, 'INSUFFICIENT_STOCK', 'Cannot deduct more than current stock');
        stockChange = await applyStockDelta(trx, {
          ...stockScope,
          delta: -Number(payload.qty || 0),
          errorCode: 'INSUFFICIENT_STOCK',
          errorMessage: 'Cannot deduct more than current stock',
        });
      }

      // The actual post-lock delta is authoritative. A physical count may decrease
      // stock even though the requested target quantity itself is positive.
      const signedDelta = Number((stockChange.scopeAfter - stockChange.scopeBefore).toFixed(3));
      movementQty = Math.abs(signedDelta);
      if (movementQty < 0.001) throw new AppError('Adjustment did not change stock', 'STOCK_ADJUSTMENT_NO_CHANGE', 400);
      const totalCost = Number((movementQty * unitCost).toFixed(2));
      if (totalCost <= 0) throw new AppError('Inventory adjustment has no financial value', 'INVENTORY_COST_MISSING', 400);

      const insertedMovement = await trx
        .insertInto('stock_movements')
        .values({
          product_id: payload.productId,
          movement_type: payload.actionType,
          qty: signedDelta,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: payload.reason,
          note: payload.note || '',
          reference_type: 'inventory_adjustment',
          reference_id: payload.productId,
          branch_id: payload.branchId ?? null,
          location_id: payload.locationId ?? null,
          created_by: auth.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          unit_cost: unitCost,
          total_cost: totalCost,
        } as any)
        .returning('id')
        .executeTakeFirst();

      if (!insertedMovement?.id) {
         throw new AppError('Failed to capture stock movement ID for accounting', 'MOVEMENT_INSERT_FAILED', 500);
      }

      const posting = await this.accountingPosting.postInventoryAdjustment(trx, insertedMovement.id, auth);
      if (Math.abs(stockChange.scopeAfter - stockChange.scopeBefore) >= 0.001 && !posting.journalEntryId) {
        throw new AppError(`Inventory adjustment ${insertedMovement.id} has no journal entry`, 'LEDGER_POSTING_MISSING', 500);
      }
      result = { productId: payload.productId, locationId: payload.locationId, beforeQty: stockChange.scopeBefore, afterQty: stockChange.scopeAfter, scopeBefore: stockChange.scopeBefore, scopeAfter: stockChange.scopeAfter, globalBefore: stockChange.globalBefore, globalAfter: stockChange.globalAfter };

      await this.audit.logWithExecutor(trx, 'تعديل مخزون', `تم تعديل مخزون الصنف #${payload.productId} من ${result.beforeQty} إلى ${result.afterQty} بسبب ${payload.reason}`, auth);

      const responsePayload = {
        ok: true,
        adjustment: result,
        products: (await trx.selectFrom('products').select(['id', 'name']).where(sql<boolean>`tenant_id = ${scope.tenantId}`).where('is_active', '=', true).execute()).map((p) => ({ id: String(p.id), name: p.name })),
        stockMovements: (await this.countService.listStockMovements({}, auth)).stockMovements,
        auditLogs: [],
      };

      if (idemCtx && idemCtx.idempotencyKey && idemCtx.operationType) {
        await this.idempotency.commitOperation(
          trx,
          { tenantId: scope.tenantId, accountId: scope.accountId, idempotencyKey: idemCtx.idempotencyKey, operationType: idemCtx.operationType },
          responsePayload
        );
      }

      return responsePayload;
    });

    return finalResponse;
  }
}
