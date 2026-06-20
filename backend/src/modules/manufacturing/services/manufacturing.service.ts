import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuditService } from '../../../core/audit/audit.service';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AppError } from '../../../common/errors/app-error';
import { applyStockDelta, previewAssignedLocationStockQty } from '../../../common/utils/location-stock-ledger';
import { KYSELY_DB } from '../../../database/database.constants';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { Database } from '../../../database/database.types';
import { CreateBomDto, CreateWorkOrderDto, CompleteWorkOrderDto } from '../dto/manufacturing.dto';

@Injectable()
export class ManufacturingService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly audit: AuditService,
  ) {}

  async createBom(payload: CreateBomDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    let bomId = 0;

    await this.tx.runInTransaction(this.db, async (trx) => {
      const overheadCost = payload.overheadCost || 0;
      const totalExpectedCost = payload.lines.reduce((sum, line) => sum + line.expectedCost * line.quantity, 0) + overheadCost;

      const bom = await trx
        .insertInto('manufacturing_boms')
        .values({
          product_id: payload.productId,
          quantity: payload.quantity,
          expected_cost: totalExpectedCost,
          overhead_cost: overheadCost,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();
      
      bomId = Number(bom.id);

      const lines = payload.lines.map((line) => ({
        bom_id: bomId,
        component_product_id: line.componentProductId,
        quantity: line.quantity,
        unit_name: line.unitName,
        unit_multiplier: line.unitMultiplier,
        expected_cost: line.expectedCost,
        waste_percentage: line.wastePercentage || 0,
      } as any));

      await trx.insertInto('manufacturing_bom_lines').values(lines).execute();
    });

    await this.audit.log('إنشاء قائمة مكونات', `تم إنشاء وصفة جديدة للمنتج #${payload.productId}`, auth);
    return { ok: true, bomId };
  }

  async getBoms(auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const boms = await this.db
      .selectFrom('manufacturing_boms as b')
      .innerJoin('products as p', 'p.id', 'b.product_id')
      .select(['b.id', 'b.product_id', 'p.name as product_name', 'b.quantity', 'b.expected_cost', 'b.overhead_cost', 'b.is_active', 'b.created_at'])
      .where('b.is_active', '=', true)
      .where(sql<boolean>`b.tenant_id = ${scope.tenantId}`)
      .orderBy('b.id', 'desc')
      .execute();

    for (const bom of boms) {
      const lines = await this.db.selectFrom('manufacturing_bom_lines')
        .selectAll()
        .where('bom_id', '=', bom.id)
        .execute();
      
      (bom as any).lines = lines.map(l => ({
        componentId: l.component_product_id,
        quantity: l.quantity,
        unitName: l.unit_name,
        expectedCost: l.expected_cost,
        wastePercentage: l.waste_percentage
      }));
    }

    return { ok: true, boms };
  }

  async updateBom(id: number, payload: CreateBomDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);

    await this.tx.runInTransaction(this.db, async (trx) => {
      const overheadCost = payload.overheadCost || 0;
      const totalExpectedCost = payload.lines.reduce((sum, line) => sum + line.expectedCost * line.quantity, 0) + overheadCost;

      await trx.updateTable('manufacturing_boms')
        .set({
          product_id: payload.productId,
          quantity: payload.quantity,
          expected_cost: totalExpectedCost,
          overhead_cost: overheadCost,
        } as any)
        .where('id', '=', id)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute();

      await trx.deleteFrom('manufacturing_bom_lines')
        .where('bom_id', '=', id)
        .execute();

      const lines = payload.lines.map((line) => ({
        bom_id: id,
        component_product_id: line.componentProductId,
        quantity: line.quantity,
        unit_name: line.unitName,
        unit_multiplier: line.unitMultiplier,
        expected_cost: line.expectedCost,
        waste_percentage: line.wastePercentage || 0,
      } as any));

      await trx.insertInto('manufacturing_bom_lines').values(lines).execute();
    });

    await this.audit.log('تعديل قائمة مكونات', `تم تعديل تركيبة المنتج #${payload.productId}`, auth);
    return { ok: true };
  }

  async deleteBom(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);

    await this.tx.runInTransaction(this.db, async (trx) => {
      const woCount = await trx.selectFrom('manufacturing_work_orders')
        .select(({ fn }) => fn.count('id').as('count'))
        .where('bom_id', '=', id)
        .executeTakeFirst();
      
      if (Number(woCount?.count || 0) > 0) {
        await trx.updateTable('manufacturing_boms')
          .set({ is_active: false })
          .where('id', '=', id)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
      } else {
        await trx.deleteFrom('manufacturing_bom_lines')
          .where('bom_id', '=', id)
          .execute();

        await trx.deleteFrom('manufacturing_boms')
          .where('id', '=', id)
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
      }
    });

    await this.audit.log('حذف قائمة مكونات', `تم حذف/إيقاف التركيبة #${id}`, auth);
    return { ok: true };
  }

  async createWorkOrder(payload: CreateWorkOrderDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    let woId = 0;

    await this.tx.runInTransaction(this.db, async (trx) => {
      const bom = await trx
        .selectFrom('manufacturing_boms')
        .select(['expected_cost'])
        .where('id', '=', payload.bomId)
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst();
      
      if (!bom) throw new AppError('BOM not found', 'NOT_FOUND', 404);

      const totalCost = Number(bom.expected_cost) * Number(payload.quantityToProduce);

      const wo = await trx
        .insertInto('manufacturing_work_orders')
        .values({
          bom_id: payload.bomId,
          quantity_to_produce: payload.quantityToProduce,
          status: 'draft',
          source_location_id: payload.sourceLocationId ?? null,
          destination_location_id: payload.destinationLocationId ?? null,
          total_cost: totalCost,
          note: payload.note || '',
          created_by: auth.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();
      
      woId = Number(wo.id);
    });

    await this.audit.log('إنشاء أمر إنتاج', `تم إنشاء أمر إنتاج #${woId}`, auth);
    return { ok: true, workOrderId: woId };
  }

  async getWorkOrders(auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const workOrders = await this.db
      .selectFrom('manufacturing_work_orders as wo')
      .innerJoin('manufacturing_boms as b', 'b.id', 'wo.bom_id')
      .innerJoin('products as p', 'p.id', 'b.product_id')
      .select([
        'wo.id',
        'wo.status',
        'wo.quantity_to_produce',
        'wo.produced_quantity',
        'p.name as product_name',
        'wo.created_at',
        'wo.created_by as created_by_id',
      ])
      .where(sql<boolean>`wo.tenant_id = ${scope.tenantId}`)
      .orderBy('wo.id', 'desc')
      .execute();
    return { ok: true, workOrders };
  }

  async completeWorkOrder(id: number, payload: CompleteWorkOrderDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);

    await this.tx.runInTransaction(this.db, async (trx) => {
      const wo = await trx
        .selectFrom('manufacturing_work_orders as wo')
        .innerJoin('manufacturing_boms as b', 'b.id', 'wo.bom_id')
        .select([
          'wo.id', 'wo.status', 'wo.quantity_to_produce', 
          'wo.source_location_id', 'wo.destination_location_id',
          'b.product_id as finished_product_id',
          'wo.bom_id', 'b.quantity as bom_quantity', 'b.overhead_cost'
        ])
        .where('wo.id', '=', id)
        .where(sql<boolean>`wo.tenant_id = ${scope.tenantId}`)
        .executeTakeFirst();
      
      if (!wo) throw new AppError('Work order not found', 'NOT_FOUND', 404);
      if (wo.status === 'done') throw new AppError('Work order already completed', 'INVALID_STATE', 400);

      const sourceLocation = payload.sourceLocationId ?? wo.source_location_id;
      const destinationLocation = payload.destinationLocationId ?? wo.destination_location_id;
      const qtyToProduce = Number(wo.quantity_to_produce);

      // Get BOM lines
      const lines = await trx
        .selectFrom('manufacturing_bom_lines as l')
        .innerJoin('products as p', 'p.id', 'l.component_product_id')
        .select([
          'l.id', 'l.component_product_id', 'l.quantity', 'l.unit_name', 'l.expected_cost', 'l.waste_percentage',
          'p.name as component_name'
        ])
        .where('l.bom_id', '=', wo.bom_id)
        .execute();

      let totalCost = 0;

      const bomQuantity = Number(wo.bom_quantity || 1);

      // Deduct raw materials
      for (const line of lines) {
        const wasteFactor = 1 / (1 - (Number(line.waste_percentage || 0) / 100));
        const requiredQty = Number((Number(line.quantity) * wasteFactor * (qtyToProduce / bomQuantity)).toFixed(3));
        const lineTotalCost = Number((Number(line.expected_cost) * wasteFactor * (qtyToProduce / bomQuantity)).toFixed(3));
        totalCost += lineTotalCost;

        await trx.insertInto('manufacturing_wo_consumptions').values({
          work_order_id: wo.id,
          component_product_id: Number(line.component_product_id),
          quantity_consumed: requiredQty,
          unit_cost: Number(line.expected_cost),
          line_total: lineTotalCost,
        } as any).execute();

        const stockScope = { tenantId: scope.tenantId, accountId: scope.accountId, productId: Number(line.component_product_id), branchId: null, locationId: sourceLocation };
        const beforeQty = sourceLocation ? await previewAssignedLocationStockQty(trx, stockScope) : 0;
        
        const stockChange = await applyStockDelta(trx, {
          ...stockScope,
          delta: -requiredQty,
          errorCode: 'INSUFFICIENT_RAW_MATERIAL',
          errorMessage: `لا يوجد رصيد كافٍ من المادة الخام: ${line.component_name}`
        });

        await trx.insertInto('stock_movements').values({
          product_id: Number(line.component_product_id),
          movement_type: 'manufacturing_consumption',
          qty: -requiredQty,
          before_qty: stockChange.scopeBefore,
          after_qty: stockChange.scopeAfter,
          reason: 'استهلاك تصنيع',
          note: `أمر إنتاج #${wo.id}`,
          reference_type: 'manufacturing_work_order',
          reference_id: wo.id,
          location_id: sourceLocation,
          created_by: auth.userId,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
        } as any).execute();
      }

      // Add overhead cost
      const overheadCost = Number(wo.overhead_cost || 0);
      const totalOverheadCost = Number((overheadCost * (qtyToProduce / bomQuantity)).toFixed(3));
      totalCost += totalOverheadCost;

      // Add finished product
      const fgStockScope = { tenantId: scope.tenantId, accountId: scope.accountId, productId: Number(wo.finished_product_id), branchId: null, locationId: destinationLocation };
      const fgStockChange = await applyStockDelta(trx, {
        ...fgStockScope,
        delta: qtyToProduce,
      });

      await trx.insertInto('stock_movements').values({
        product_id: Number(wo.finished_product_id),
        movement_type: 'manufacturing_production',
        qty: qtyToProduce,
        before_qty: fgStockChange.scopeBefore,
        after_qty: fgStockChange.scopeAfter,
        reason: 'إنتاج تام',
        note: `أمر إنتاج #${wo.id}`,
        reference_type: 'manufacturing_work_order',
        reference_id: wo.id,
        location_id: destinationLocation,
        created_by: auth.userId,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      } as any).execute();

      await trx.updateTable('manufacturing_work_orders')
        .set({
          status: 'done',
          produced_quantity: qtyToProduce,
          total_cost: totalCost,
          updated_at: sql`NOW()`,
        } as any)
        .where('id', '=', id)
        .execute();

      // Update finished good average cost_price
      const finishedProduct = await trx.selectFrom('products').select(['stock_qty', 'cost_price']).where('id', '=', Number(wo.finished_product_id)).where(sql<boolean>`tenant_id = ${scope.tenantId}`).executeTakeFirst();
      if (finishedProduct) {
        const oldStock = Number(finishedProduct.stock_qty || 0);
        const oldCost = Number(finishedProduct.cost_price || 0);
        // Avoid division by zero if stock is negative or exactly zero before production
        const newCost = oldStock >= 0 ? (oldStock * oldCost + totalCost) / (oldStock + qtyToProduce) : totalCost / qtyToProduce;
        
        await trx.updateTable('products')
          .set({ cost_price: newCost, updated_at: sql`NOW()` })
          .where('id', '=', Number(wo.finished_product_id))
          .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
          .execute();
      }
    });

    await this.audit.log('إنهاء أمر إنتاج', `تم إنهاء أمر إنتاج #${id}`, auth);
    return { ok: true };
  }
}
