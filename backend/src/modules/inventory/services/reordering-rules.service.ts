import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { AuditService } from '../../../core/audit/audit.service';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../../common/utils/document-number.util';
import {
  evaluateReorderingRule,
  groupReorderItemsBySupplier,
  type BreachedReorderItem,
} from '../engines/reordering-rule.engine';
import {
  CreateReorderingRuleDto,
  UpdateReorderingRuleDto,
  RunReorderingEvaluationDto,
} from '../dto/reordering-rule.dto';

@Injectable()
export class ReorderingRulesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lists all reordering rules enriched with real-time stock levels,
   * incoming pipeline quantities, and automated breach evaluations.
   */
  async listRules(
    query: { warehouseId?: number; status?: 'all' | 'breached' | 'normal'; q?: string },
    auth: AuthContext,
  ): Promise<{
    rules: any[];
    summary: {
      totalRules: number;
      activeRules: number;
      breachedCount: number;
      generatedOrdersCount: number;
    };
  }> {
    const scope = requireTenantScope(auth);

    let baseQuery = this.db
      .selectFrom('reordering_rules as r')
      .leftJoin('products as p', (join: any) =>
        join.onRef('p.id', '=', 'r.product_id').on('p.tenant_id', '=', scope.tenantId),
      )
      .leftJoin('suppliers as s', (join: any) =>
        join.onRef('s.id', '=', 'r.preferred_supplier_id').on('s.tenant_id', '=', scope.tenantId),
      )
      .leftJoin('stock_locations as loc', (join: any) =>
        join.onRef('loc.id', '=', 'r.warehouse_id').on('loc.tenant_id', '=', scope.tenantId),
      )
      .leftJoin('branches as b', (join: any) =>
        join.onRef('b.id', '=', 'r.branch_id').on('b.tenant_id', '=', scope.tenantId),
      )
      .select([
        'r.id',
        'r.tenant_id',
        'r.account_id',
        'r.product_id',
        'r.warehouse_id',
        'r.branch_id',
        'r.min_qty',
        'r.max_qty',
        'r.qty_multiple',
        'r.preferred_supplier_id',
        'r.action_mode',
        'r.is_active',
        'r.last_run_at',
        'r.last_trigger_status',
        'r.last_generated_po_id',
        'r.notes',
        'r.created_at',
        'r.updated_at',
        'p.name as product_name',
        'p.barcode as product_barcode',
        'p.cost_price as product_cost_price',
        'p.stock_qty as product_global_stock',
        'p.reserved_qty as product_global_reserved',
        's.name as preferred_supplier_name',
        's.phone as preferred_supplier_phone',
        'loc.name as warehouse_name',
        'b.name as branch_name',
      ])
      .where('r.tenant_id', '=', scope.tenantId);

    if (query.warehouseId) {
      baseQuery = baseQuery.where('r.warehouse_id', '=', query.warehouseId);
    }

    if (query.q && query.q.trim()) {
      const term = `%${query.q.trim()}%`;
      baseQuery = baseQuery.where((eb: any) =>
        eb.or([
          eb('p.name', 'ilike', term),
          eb('p.barcode', 'ilike', term),
          eb('s.name', 'ilike', term),
        ]),
      );
    }

    const rows: any[] = await baseQuery.orderBy('r.id', 'desc').execute();

    // Fetch incoming PO quantities in transit
    const incomingPoRows: any[] = await this.db
      .selectFrom('purchase_order_items as poi')
      .innerJoin('purchase_orders as po', (join: any) =>
        join.onRef('po.id', '=', 'poi.purchase_order_id').on('po.tenant_id', '=', scope.tenantId),
      )
      .select([
        'poi.product_id',
        'po.warehouse_id',
        sql<number>`COALESCE(SUM(CAST(poi.quantity AS numeric) - CAST(poi.received_quantity AS numeric)), 0)`.as('incoming_qty'),
      ])
      .where('po.tenant_id', '=', scope.tenantId)
      .where('po.status', 'in', ['draft', 'pending', 'approved', 'ordered'])
      .groupBy(['poi.product_id', 'po.warehouse_id'])
      .execute();

    const incomingMap = new Map<string, number>();
    for (const row of incomingPoRows) {
      const key = `${row.product_id}__${row.warehouse_id || 'all'}`;
      incomingMap.set(key, Number(row.incoming_qty || 0));
    }

    // Fetch specific warehouse stocks and reserved allocations
    const locationStocks: any[] = await this.db
      .selectFrom('product_location_stock')
      .select(['product_id', 'location_id', 'qty', 'reserved_qty'])
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    const locationStockMap = new Map<string, { onHand: number; reserved: number }>();
    for (const ls of locationStocks) {
      locationStockMap.set(`${ls.product_id}__${ls.location_id}`, {
        onHand: Number(ls.qty || 0),
        reserved: Number(ls.reserved_qty || 0),
      });
    }

    let activeRulesCount = 0;
    let breachedCount = 0;
    let generatedOrdersCount = 0;

    const evaluatedRules = rows.map((r: any) => {
      if (r.is_active) activeRulesCount++;
      if (r.last_generated_po_id) generatedOrdersCount++;

      let onHand = Number(r.product_global_stock || 0);
      let reservedQty = Number(r.product_global_reserved || 0);

      if (r.warehouse_id) {
        const specificStock = locationStockMap.get(`${r.product_id}__${r.warehouse_id}`);
        if (specificStock !== undefined) {
          onHand = specificStock.onHand;
          reservedQty = specificStock.reserved;
        }
      }

      const specificIncoming = incomingMap.get(`${r.product_id}__${r.warehouse_id || 'all'}`);
      const generalIncoming = incomingMap.get(`${r.product_id}__all`);
      const incomingQty = specificIncoming !== undefined ? specificIncoming : (generalIncoming || 0);

      const decision = evaluateReorderingRule({
        productId: r.product_id,
        minQty: Number(r.min_qty || 0),
        maxQty: Number(r.max_qty || 0),
        qtyMultiple: Number(r.qty_multiple || 1),
        onHandQty: onHand,
        incomingQty,
        outgoingQty: reservedQty,
      });

      if (decision.isBreached) breachedCount++;

      return {
        ...r,
        onHandQty: onHand,
        incomingQty,
        reservedQty,
        forecastedQty: decision.forecastedQty,
        isBreached: decision.isBreached,
        shortageQty: decision.shortageQty,
        suggestedOrderQty: decision.suggestedOrderQty,
        decisionReason: decision.reason,
      };
    });

    let finalRules = evaluatedRules;
    if (query.status === 'breached') {
      finalRules = evaluatedRules.filter((r: any) => r.isBreached);
    } else if (query.status === 'normal') {
      finalRules = evaluatedRules.filter((r: any) => !r.isBreached);
    }

    return {
      rules: finalRules,
      summary: {
        totalRules: rows.length,
        activeRules: activeRulesCount,
        breachedCount,
        generatedOrdersCount,
      },
    };
  }

  /**
   * Creates a new automated reordering rule.
   */
  async createRule(dto: CreateReorderingRuleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);

    if (Number(dto.minQty) < 0) {
      throw new BadRequestException('الحد الأدنى للأمان يجب أن يكون صفرًا أو أكبر');
    }
    if (Number(dto.maxQty) < Number(dto.minQty)) {
      throw new BadRequestException('الحد الأقصى للمخزون يجب أن يكون أكبر من أو مساوياً للحد الأدنى');
    }

    const inserted = await this.db
      .insertInto('reordering_rules')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        product_id: dto.productId,
        warehouse_id: dto.warehouseId || null,
        branch_id: dto.branchId || null,
        min_qty: dto.minQty,
        max_qty: dto.maxQty,
        qty_multiple: dto.qtyMultiple || 1,
        preferred_supplier_id: dto.preferredSupplierId || null,
        action_mode: dto.actionMode || 'auto_draft_po',
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        notes: dto.notes || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.audit.log(
      'إنشاء قاعدة إعادة طلب للمخزون',
      JSON.stringify({ ruleId: inserted.id, productId: dto.productId, min: dto.minQty, max: dto.maxQty }),
      auth,
    );

    return inserted;
  }

  /**
   * Updates an existing reordering rule.
   */
  async updateRule(
    id: number,
    dto: UpdateReorderingRuleDto,
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);

    const existing = await this.db
      .selectFrom('reordering_rules')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('قاعدة إعادة الطلب غير موجودة');
    }

    const minQty = dto.minQty !== undefined ? Number(dto.minQty) : Number(existing.min_qty);
    const maxQty = dto.maxQty !== undefined ? Number(dto.maxQty) : Number(existing.max_qty);

    if (minQty < 0 || maxQty < minQty) {
      throw new BadRequestException('الحد الأقصى للمخزون يجب أن يكون أكبر من أو مساوياً للحد الأدنى');
    }

    const updated = await this.db
      .updateTable('reordering_rules')
      .set({
        warehouse_id: dto.warehouseId !== undefined ? dto.warehouseId : existing.warehouse_id,
        branch_id: dto.branchId !== undefined ? dto.branchId : existing.branch_id,
        min_qty: minQty,
        max_qty: maxQty,
        qty_multiple: dto.qtyMultiple !== undefined ? dto.qtyMultiple : existing.qty_multiple,
        preferred_supplier_id:
          dto.preferredSupplierId !== undefined ? dto.preferredSupplierId : existing.preferred_supplier_id,
        action_mode: dto.actionMode !== undefined ? dto.actionMode : existing.action_mode,
        is_active: dto.isActive !== undefined ? dto.isActive : existing.is_active,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        updated_at: sql`now()`,
      })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .returningAll()
      .executeTakeFirstOrThrow();

    await this.audit.log('تعديل قاعدة إعادة طلب', JSON.stringify({ ruleId: id, min: minQty, max: maxQty }), auth);

    return updated;
  }

  /**
   * Deletes a reordering rule.
   */
  async deleteRule(id: number, auth: AuthContext): Promise<{ ok: boolean }> {
    const scope = requireTenantScope(auth);

    const result = await this.db
      .deleteFrom('reordering_rules')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (Number(result.numDeletedRows || 0) === 0) {
      throw new NotFoundException('قاعدة إعادة الطلب غير موجودة');
    }

    await this.audit.log('حذف قاعدة إعادة طلب', JSON.stringify({ ruleId: id }), auth);
    return { ok: true };
  }

  /**
   * Evaluates all active reordering rules and automatically generates consolidated Draft Purchase Orders (PO-YYMMDD-XXXX)
   * grouped by preferred supplier and warehouse.
   */
  async runEvaluation(
    dto: RunReorderingEvaluationDto,
    auth: AuthContext,
  ): Promise<{
    ok: boolean;
    evaluatedRulesCount: number;
    breachedRulesCount: number;
    generatedOrdersCount: number;
    generatedOrders: any[];
  }> {
    const scope = requireTenantScope(auth);
    const { rules } = await this.listRules({ warehouseId: dto.warehouseId }, auth);

    const activeRules = rules.filter((r: any) => r.is_active);
    const breachedItems: BreachedReorderItem[] = [];

    for (const rule of activeRules) {
      if (dto.productId && rule.product_id !== dto.productId) continue;

      if (rule.isBreached && rule.suggestedOrderQty > 0) {
        breachedItems.push({
          ruleId: rule.id,
          productId: rule.product_id,
          productName: rule.product_name || `صنف #${rule.product_id}`,
          unitCost: Number(rule.product_cost_price || 0),
          supplierId: rule.preferred_supplier_id,
          supplierName: rule.preferred_supplier_name,
          supplierPhone: rule.preferred_supplier_phone,
          warehouseId: rule.warehouse_id,
          warehouseName: rule.warehouse_name,
          branchId: rule.branch_id,
          onHandQty: rule.onHandQty,
          incomingQty: rule.incomingQty,
          forecastedQty: rule.forecastedQty,
          minQty: Number(rule.min_qty),
          maxQty: Number(rule.max_qty),
          qtyMultiple: Number(rule.qty_multiple || 1),
          suggestedOrderQty: rule.suggestedOrderQty,
          estimatedCost: Number((rule.suggestedOrderQty * Number(rule.product_cost_price || 0)).toFixed(3)),
        });
      }
    }

    if (dto.autoCreateOrders === false || breachedItems.length === 0) {
      return {
        ok: true,
        evaluatedRulesCount: activeRules.length,
        breachedRulesCount: breachedItems.length,
        generatedOrdersCount: 0,
        generatedOrders: [],
      };
    }

    // Group breached items into unified supplier PO plans
    const supplierPlans = groupReorderItemsBySupplier(breachedItems);
    const generatedOrders: any[] = [];

    for (const plan of supplierPlans) {
      const prefix = getDailyDocumentPrefix('PO');
      const countRow: any = await this.db
        .selectFrom('purchase_orders')
        .select(sql<number>`count(*)::int`.as('count'))
        .where('tenant_id', '=', scope.tenantId)
        .where('order_number', 'like', `${prefix}%`)
        .executeTakeFirst();

      const seq = Number(countRow?.count || 0) + 1;
      const orderNumber = formatDailyDocumentNumber('PO', seq);

      // Create Draft Purchase Order
      const insertedOrder: any = await this.db
        .insertInto('purchase_orders')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          order_number: orderNumber,
          supplier_id: plan.supplierId || null,
          supplier_name: plan.supplierName,
          supplier_phone: plan.supplierPhone || null,
          warehouse_id: plan.warehouseId || null,
          warehouse_name: plan.warehouseName,
          subtotal: plan.subtotal,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: plan.totalAmount,
          status: 'draft',
          notes: 'أمر شراء تم توليده آلياً بواسطة محرك قواعد إعادة الطلب التلقائي (نواقص المخزون)',
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Insert Purchase Order Items
      for (const item of plan.items) {
        await this.db
          .insertInto('purchase_order_items')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            purchase_order_id: insertedOrder.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            received_quantity: 0,
            unit_cost: item.unitCost,
            tax_rate: 0,
            discount: 0,
            total: item.total,
            notes: 'طلب تلقائي استناداً لحد الأمان وإعادة الطلب',
          })
          .execute();

        // Update the reordering rule with last run and generated PO ID
        await this.db
          .updateTable('reordering_rules')
          .set({
            last_run_at: sql`now()`,
            last_trigger_status: 'po_generated',
            last_generated_po_id: insertedOrder.id,
            updated_at: sql`now()`,
          })
          .where('id', '=', item.ruleId)
          .where('tenant_id', '=', scope.tenantId)
          .execute();
      }

      generatedOrders.push(insertedOrder);
    }

    await this.audit.log(
      'تشغيل محرك إعادة الطلب وتوليد أوامر الشراء',
      JSON.stringify({
        evaluated: activeRules.length,
        breached: breachedItems.length,
        ordersCreated: generatedOrders.length,
        orderNumbers: generatedOrders.map((o: any) => o.order_number),
      }),
      auth,
    );

    return {
      ok: true,
      evaluatedRulesCount: activeRules.length,
      breachedRulesCount: breachedItems.length,
      generatedOrdersCount: generatedOrders.length,
      generatedOrders,
    };
  }
}
