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

    await this.tx.runInTransaction(this.db, async (trx) => {
      const product = await trx
        .selectFrom('products')
        .selectAll()
        .where('id', '=', payload.productId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .where('is_active', '=', true)
        .executeTakeFirst();
      if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);
      const stockScope = { tenantId: scope.tenantId, accountId: scope.accountId, productId: payload.productId, branchId: payload.branchId, locationId: payload.locationId };
      const beforeQty = payload.locationId
        ? await previewAssignedLocationStockQty(trx, stockScope)
        : Number(product.stock_qty || 0);
      let afterQty = beforeQty;
      let movementQty = Number(payload.qty || 0);
      let stockChange: { scopeBefore: number; scopeAfter: number; globalBefore: number; globalAfter: number; };

      if (payload.actionType === 'adjust') {
        afterQty = Number(payload.qty || 0);
        movementQty = Math.abs(afterQty - beforeQty);
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
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .execute();
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

    return result as Record<string, unknown>;
  }
}
