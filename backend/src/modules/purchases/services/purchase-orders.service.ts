import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { formatDailyDocumentNumber, getDailyDocumentPrefix } from '../../../common/utils/document-number.util';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto/purchase-order.dto';
import { PurchasesWriteService } from './purchases-write.service';
import { ApprovalWorkflowService } from '../../approvals/approval-workflow.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly purchasesWrite: PurchasesWriteService,
    private readonly approvals: ApprovalWorkflowService,
  ) {}

  async listOrders(
    auth: AuthContext,
    query?: { status?: string; search?: string; limit?: number; offset?: number }
  ): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    let qb = this.db
      .selectFrom('purchase_orders')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId);

    if (query?.status && query.status !== 'all') {
      qb = qb.where('status', '=', query.status as any);
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb = qb.where((eb) =>
        eb.or([
          eb('order_number', 'ilike', term),
          eb('supplier_name', 'ilike', term),
          eb('supplier_phone', 'ilike', term),
        ]),
      );
    }

    const limit = query?.limit ? Math.min(query.limit, 100) : 50;
    const offset = query?.offset || 0;

    const items = await qb.orderBy('created_at', 'desc').limit(limit).offset(offset).execute();

    // Summary counts by status
    const counts = await this.db
      .selectFrom('purchase_orders')
      .select(['status', sql<number>`count(*)::int`.as('count')])
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .groupBy('status')
      .execute();

    const statusCounts: Record<string, number> = {
      all: 0,
      draft: 0,
      confirmed: 0,
      partially_received: 0,
      received: 0,
      converted_to_bill: 0,
      cancelled: 0,
      pending_approval: 0,
    };

    counts.forEach((c) => {
      const s = String(c.status);
      statusCounts[s] = Number(c.count);
      statusCounts.all += Number(c.count);
    });

    return {
      orders: items,
      summary: statusCounts,
    };
  }

  async getOrderById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('purchase_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر الشراء غير موجود');
    }

    const items = await this.db
      .selectFrom('purchase_order_items as poi')
      .leftJoin('products as p', 'p.id', 'poi.product_id')
      .select([
        'poi.id',
        'poi.purchase_order_id',
        'poi.product_id',
        'poi.product_name',
        'poi.unit_name',
        'poi.quantity',
        'poi.received_quantity',
        'poi.unit_cost',
        'poi.tax_rate',
        'poi.discount',
        'poi.total',
        'poi.notes',
        'p.stock_qty as current_stock',
      ])
      .where('poi.purchase_order_id', '=', id)
      .execute();

    return {
      order,
      items,
    };
  }

  async createOrder(payload: CreatePurchaseOrderDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);

    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('يجب إضافة صنف واحد على الأقل في أمر الشراء');
    }

    const prefix = getDailyDocumentPrefix('PO');
    const countRow = await this.db
      .selectFrom('purchase_orders')
      .select(sql<number>`count(*)::int`.as('count'))
      .where('tenant_id', '=', scope.tenantId)
      .where('order_number', 'like', `${prefix}%`)
      .executeTakeFirst();
    const seq = Number(countRow?.count || 0) + 1;
    const orderNumber = formatDailyDocumentNumber('PO', seq);

    const insertedOrder = await this.db
      .insertInto('purchase_orders')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        order_number: orderNumber,
        supplier_id: payload.supplierId || null,
        supplier_name: payload.supplierName,
        supplier_phone: payload.supplierPhone || null,
        warehouse_id: payload.warehouseId || null,
        warehouse_name: payload.warehouseName || null,
        subtotal: payload.subtotal || 0,
        tax_amount: payload.taxAmount || 0,
        discount_amount: payload.discountAmount || 0,
        total_amount: payload.totalAmount || 0,
        status: 'draft',
        expected_delivery_date: payload.expectedDeliveryDate ? (payload.expectedDeliveryDate as any) : null,
        notes: payload.notes || null,
        terms_conditions: payload.termsConditions || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returning(['id', 'order_number'])
      .executeTakeFirstOrThrow();

    const orderId = insertedOrder.id;

    for (const item of payload.items) {
      await this.db
        .insertInto('purchase_order_items')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          purchase_order_id: orderId,
          product_id: item.productId,
          product_name: item.productName,
          unit_name: item.unitName || null,
          quantity: item.quantity,
          received_quantity: 0,
          unit_cost: item.unitCost,
          tax_rate: item.taxRate || 0,
          discount: item.discount || 0,
          total: item.total,
          notes: item.notes || null,
        })
        .execute();
    }

    return {
      success: true,
      id: orderId,
      orderNumber: insertedOrder.order_number,
      message: 'تم إنشاء أمر الشراء بنجاح',
    };
  }

  async updateOrder(id: number, payload: UpdatePurchaseOrderDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    await this.db.transaction().execute(async (trx) => {
      const order = await trx
        .selectFrom('purchase_orders')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .where('account_id', '=', scope.accountId)
        .forUpdate()
        .executeTakeFirst();

      if (!order) {
        throw new NotFoundException('أمر الشراء غير موجود');
      }

      if (order.status !== 'draft') {
        throw new BadRequestException('يمكن تعديل أمر الشراء في حالة المسودة فقط');
      }
      if (payload.status && payload.status !== 'draft') throw new BadRequestException('تغيير حالة أمر الشراء يتم عبر مسار الاعتماد فقط');

      const updated = await trx
        .updateTable('purchase_orders')
        .set({
          supplier_id: payload.supplierId !== undefined ? payload.supplierId : order.supplier_id,
          supplier_name: payload.supplierName || order.supplier_name,
          supplier_phone: payload.supplierPhone !== undefined ? payload.supplierPhone : order.supplier_phone,
          warehouse_id: payload.warehouseId !== undefined ? payload.warehouseId : order.warehouse_id,
          warehouse_name: payload.warehouseName !== undefined ? payload.warehouseName : order.warehouse_name,
          subtotal: payload.subtotal !== undefined ? payload.subtotal : order.subtotal,
          tax_amount: payload.taxAmount !== undefined ? payload.taxAmount : order.tax_amount,
          discount_amount: payload.discountAmount !== undefined ? payload.discountAmount : order.discount_amount,
          total_amount: payload.totalAmount !== undefined ? payload.totalAmount : order.total_amount,
          expected_delivery_date: payload.expectedDeliveryDate ? (payload.expectedDeliveryDate as any) : order.expected_delivery_date,
          notes: payload.notes !== undefined ? payload.notes : order.notes,
          terms_conditions: payload.termsConditions !== undefined ? payload.termsConditions : order.terms_conditions,
          status: 'draft',
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .where('account_id', '=', scope.accountId)
        .where('status', '=', 'draft')
        .executeTakeFirst();
      if (Number(updated.numUpdatedRows) !== 1) throw new BadRequestException('أمر الشراء لم يعد مسودة');

      if (payload.items && payload.items.length > 0) {
        await trx.deleteFrom('purchase_order_items').where('purchase_order_id', '=', id).where('tenant_id', '=', scope.tenantId).execute();
        for (const item of payload.items) {
          await trx
            .insertInto('purchase_order_items')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              purchase_order_id: id,
              product_id: item.productId,
              product_name: item.productName,
              unit_name: item.unitName || null,
              quantity: item.quantity,
              received_quantity: item.receivedQuantity || 0,
              unit_cost: item.unitCost,
              tax_rate: item.taxRate || 0,
              discount: item.discount || 0,
              total: item.total,
              notes: item.notes || null,
            })
            .execute();
        }
      }
    });

    return { success: true, message: 'تم تحديث أمر الشراء بنجاح' };
  }

  async confirmOrder(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const outcome = await this.db.transaction().execute(async (trx) => {
      const order = await trx.selectFrom('purchase_orders').selectAll()
        .where('id', '=', id).where('tenant_id', '=', scope.tenantId)
        .where('account_id', '=', scope.accountId).forUpdate().executeTakeFirst();
      if (!order) throw new NotFoundException('أمر الشراء غير موجود');
      if (order.status !== 'draft') throw new BadRequestException('أمر الشراء ليس في حالة مسودة');
      const approval = await this.approvals.checkAndInitiateApproval({
        module: 'purchase_orders', recordId: id, recordRef: order.order_number,
        amount: Number(order.total_amount),
      }, auth, trx);
      await trx.updateTable('purchase_orders').set({
        status: approval.requiresApproval ? 'pending_approval' : 'confirmed', updated_at: new Date(),
      }).where('id', '=', id).where('tenant_id', '=', scope.tenantId).where('account_id', '=', scope.accountId).execute();
      return { approval, orderNumber: order.order_number, amount: Number(order.total_amount) };
    });
    if (outcome.approval.requiresApproval) {
      this.approvals.notifyPendingApproval(scope.tenantId, outcome.orderNumber, outcome.amount);
      return { success: true, status: 'pending_approval', requestId: outcome.approval.requestId,
        message: 'أمر الشراء بانتظار موافقة مدير آخر' };
    }
    return { success: true, status: 'confirmed', message: 'تم اعتماد أمر الشراء بنجاح' };
  }

  // `receiveGoods` was removed here (O3 audit finding): it wrote stock directly via
  // applyStockDelta but never created a `goods_receipt_notes` row, never posted a GRNI
  // journal entry, and never ran `computeThreeWayMatch` — a live bypass of the hardened
  // three-way-match/accounting pipeline, with zero frontend callers. The real, hardened
  // receiving flow is `convertToBill` below followed by
  // `purchases.service.ts:receivePurchaseGoods` (GRN/GRNI/3-way-match backed).

  async convertToBill(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('purchase_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر الشراء غير موجود');
    }

    if (!['confirmed', 'partially_received', 'received'].includes(order.status)) {
      throw new BadRequestException('لا يمكن تحويل أمر شراء غير معتمد إلى فاتورة');
    }

    const items = await this.db
      .selectFrom('purchase_order_items')
      .selectAll()
      .where('purchase_order_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    if (!items.length) {
      throw new BadRequestException('أمر الشراء لا يحتوي على أصناف صالحة للتحويل');
    }

    // Call purchasesWrite service to create formal purchase bill
    const purchasePayload = {
      supplierId: order.supplier_id || 1,
      invoiceNumber: `INV-${order.order_number}`,
      items: items.map((item) => ({
        productId: item.product_id,
        quantity: Number(item.quantity),
        cost: Number(item.unit_cost),
        taxRate: Number(item.tax_rate || 0),
        discount: Number(item.discount || 0),
        unitName: item.unit_name || 'قطعة',
      })),
      notes: `فاتورة محولة تلقائياً من أمر الشراء #${order.order_number}`,
    };

    const res = await this.purchasesWrite.createPurchase(purchasePayload as any, auth);
    const createdPurchaseId = Number((res as any)?.id || (res as any)?.purchase?.id || 0);
    if (!createdPurchaseId) throw new BadRequestException('لم يتم إنشاء فاتورة مشتريات صالحة');

    await this.db
      .updateTable('purchase_orders')
      .set({
        status: 'converted_to_bill',
        converted_purchase_id: createdPurchaseId,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return {
      success: true,
      convertedPurchaseId: createdPurchaseId,
      message: 'تم تحويل أمر الشراء إلى فاتورة مشتريات رسمية بنجاح',
    };
  }

  async cancelOrder(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('purchase_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر الشراء غير موجود');
    }

    if (!['draft', 'confirmed'].includes(order.status)) {
      throw new BadRequestException('لا يمكن إلغاء أمر شراء في حالته الحالية');
    }

    const updated = await this.db
      .updateTable('purchase_orders')
      .set({ status: 'cancelled', updated_at: new Date() })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .where('status', 'in', ['draft', 'confirmed'])
      .executeTakeFirst();
    if (Number(updated.numUpdatedRows) !== 1) throw new BadRequestException('حالة أمر الشراء تغيرت؛ لا يمكن إلغاؤه');

    return { success: true, message: 'تم إلغاء أمر الشراء بنجاح' };
  }

  async deleteOrder(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('purchase_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر الشراء غير موجود');
    }

    if (order.status !== 'draft' && order.status !== 'cancelled') {
      throw new BadRequestException('يمكن حذف أوامر الشراء المسودة أو الملغاة فقط');
    }

    await this.db.transaction().execute(async (trx) => {
      const locked = await trx.selectFrom('purchase_orders').select('status')
        .where('id', '=', id).where('tenant_id', '=', scope.tenantId)
        .where('account_id', '=', scope.accountId).forUpdate().executeTakeFirst();
      if (!locked || !['draft', 'cancelled'].includes(locked.status)) {
        throw new BadRequestException('حالة أمر الشراء تغيرت؛ لا يمكن حذفه');
      }
      await trx.deleteFrom('purchase_order_items').where('purchase_order_id', '=', id).where('tenant_id', '=', scope.tenantId).execute();
      await trx.deleteFrom('purchase_orders').where('id', '=', id).where('tenant_id', '=', scope.tenantId)
        .where('account_id', '=', scope.accountId).execute();
    });

    return { success: true, message: 'تم حذف أمر الشراء بنجاح' };
  }
}
