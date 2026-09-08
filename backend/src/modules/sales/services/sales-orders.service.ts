import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from '../dto/sales-order.dto';
import { SalesWriteService } from './sales-write.service';

@Injectable()
export class SalesOrdersService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly salesWrite: SalesWriteService,
  ) {}

  async listOrders(
    auth: AuthContext,
    query?: { status?: string; search?: string; limit?: number; offset?: number }
  ): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    let qb = this.db
      .selectFrom('sales_orders')
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
          eb('customer_name', 'ilike', term),
          eb('customer_phone', 'ilike', term),
        ]),
      );
    }

    const limit = query?.limit ? Math.min(query.limit, 100) : 50;
    const offset = query?.offset || 0;

    const items = await qb.orderBy('created_at', 'desc').limit(limit).offset(offset).execute();

    // Summary counts by status
    const counts = await this.db
      .selectFrom('sales_orders')
      .select(['status', sql<number>`count(*)::int`.as('count')])
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .groupBy('status')
      .execute();

    const statusCounts: Record<string, number> = {
      all: 0,
      draft: 0,
      confirmed: 0,
      converted: 0,
      cancelled: 0,
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
      .selectFrom('sales_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر البيع غير موجود');
    }

    const items = await this.db
      .selectFrom('sales_order_items as soi')
      .leftJoin('products as p', 'p.id', 'soi.product_id')
      .select([
        'soi.id',
        'soi.sales_order_id',
        'soi.product_id',
        'soi.product_name',
        'soi.unit_name',
        'soi.quantity',
        'soi.reserved_quantity',
        'soi.delivered_quantity',
        'soi.unit_price',
        'soi.discount',
        'soi.total',
        'soi.notes',
        sql<number>`COALESCE(p.stock_qty, 0)`.as('current_stock_qty'),
        sql<number>`COALESCE(p.reserved_qty, 0)`.as('current_reserved_qty'),
        sql<number>`COALESCE(p.stock_qty, 0) - COALESCE(p.reserved_qty, 0)`.as('available_qty'),
      ])
      .where('soi.sales_order_id', '=', id)
      .where('soi.tenant_id', '=', scope.tenantId)
      .where('soi.account_id', '=', scope.accountId)
      .orderBy('soi.id', 'asc')
      .execute();

    return { ...order, items };
  }

  async createOrder(dto: CreateSalesOrderDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SO-${dateStr}-${randomSuffix}`;
    const now = new Date();
    const shouldReserve = dto.autoReserve !== false;
    const initialStatus = shouldReserve ? 'confirmed' : 'draft';

    const result = await this.db.transaction().execute(async (trx) => {
      const order = await trx
        .insertInto('sales_orders')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          order_number: orderNumber,
          customer_id: dto.customerId || null,
          customer_name: dto.customerName.trim(),
          customer_phone: dto.customerPhone?.trim() || null,
          customer_address: dto.customerAddress?.trim() || null,
          branch_id: dto.branchId || null,
          subtotal: dto.subtotal,
          discount_amount: dto.discountAmount || 0,
          tax_amount: dto.taxAmount || 0,
          total_amount: dto.totalAmount,
          status: initialStatus,
          reservation_expires_at: dto.reservationExpiresAt ? new Date(dto.reservationExpiresAt) : null,
          delivery_date: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
          quotation_id: dto.quotationId || null,
          notes: dto.notes?.trim() || null,
          terms_conditions: dto.termsConditions?.trim() || null,
          created_by: auth.userId ? Number(auth.userId) : null,
          created_at: now,
          updated_at: now,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          const qty = Number(item.quantity);
          const reservedQty = shouldReserve ? qty : 0;

          await trx
            .insertInto('sales_order_items')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              sales_order_id: order.id,
              product_id: item.productId,
              product_name: item.productName.trim(),
              unit_name: item.unitName?.trim() || null,
              quantity: qty,
              reserved_quantity: reservedQty,
              delivered_quantity: 0,
              unit_price: item.unitPrice,
              discount: item.discount || 0,
              total: item.total,
              notes: item.notes?.trim() || null,
              created_at: now,
            })
            .execute();

          // If reserving, increment reserved_qty on product
          if (shouldReserve && qty > 0) {
            await trx
              .updateTable('products')
              .set((eb) => ({
                reserved_qty: eb('reserved_qty', '+', qty),
              }))
              .where('id', '=', item.productId)
              .where('tenant_id', '=', scope.tenantId)
              .execute();
          }
        }
      }

      return order;
    });

    return {
      ok: true,
      message: shouldReserve
        ? 'تم إنشاء أمر البيع وحجز الكميات في المخزون بنجاح'
        : 'تم حفظ مسودة أمر البيع بنجاح',
      order: result,
    };
  }

  async confirmAndReserve(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('sales_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر البيع غير موجود');
    }

    if (order.status === 'confirmed') {
      return { ok: true, message: 'أمر البيع مؤكد والمخزون محجوز بالفعل' };
    }

    if (order.status === 'converted') {
      throw new BadRequestException('لا يمكن تعديل أمر بيع تم تحويله إلى فاتورة بالفعل');
    }

    const items = await this.db
      .selectFrom('sales_order_items')
      .selectAll()
      .where('sales_order_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .execute();

    if (items.length === 0) {
      throw new BadRequestException('أمر البيع لا يحتوي على بنود');
    }

    await this.db.transaction().execute(async (trx) => {
      for (const item of items) {
        const qtyToReserve = Number(item.quantity) - Number(item.reserved_quantity || 0);
        if (qtyToReserve > 0) {
          await trx
            .updateTable('products')
            .set((eb) => ({
              reserved_qty: eb('reserved_qty', '+', qtyToReserve),
            }))
            .where('id', '=', Number(item.product_id))
            .where('tenant_id', '=', scope.tenantId)
            .execute();

          await trx
            .updateTable('sales_order_items')
            .set({ reserved_quantity: Number(item.quantity) })
            .where('id', '=', Number(item.id))
            .where('tenant_id', '=', scope.tenantId)
            .execute();
        }
      }

      await trx
        .updateTable('sales_orders')
        .set({
          status: 'confirmed',
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    });

    return { ok: true, message: 'تم تأكيد أمر البيع وحجز المخزون بنجاح' };
  }

  async cancelOrder(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('sales_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر البيع غير موجود');
    }

    if (order.status === 'cancelled') {
      return { ok: true, message: 'أمر البيع ملغي بالفعل' };
    }

    if (order.status === 'converted') {
      throw new BadRequestException('لا يمكن إلغاء أمر بيع تم تحويله إلى فاتورة؛ يجب إلغاء الفاتورة من شاشة المبيعات أولاً');
    }

    const items = await this.db
      .selectFrom('sales_order_items')
      .selectAll()
      .where('sales_order_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .execute();

    await this.db.transaction().execute(async (trx) => {
      // Release any reserved quantities
      for (const item of items) {
        const reservedQty = Number(item.reserved_quantity || 0);
        if (reservedQty > 0) {
          await trx
            .updateTable('products')
            .set((eb) => ({
              reserved_qty: sql`GREATEST(0, ${eb('reserved_qty', '-', reservedQty)})`,
            }))
            .where('id', '=', Number(item.product_id))
            .where('tenant_id', '=', scope.tenantId)
            .execute();

          await trx
            .updateTable('sales_order_items')
            .set({ reserved_quantity: 0 })
            .where('id', '=', Number(item.id))
            .where('tenant_id', '=', scope.tenantId)
            .execute();
        }
      }

      await trx
        .updateTable('sales_orders')
        .set({
          status: 'cancelled',
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    });

    return { ok: true, message: 'تم إلغاء أمر البيع وإلغاء حجز المخزون بنجاح' };
  }

  async convertToSale(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const order = await this.db
      .selectFrom('sales_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!order) {
      throw new NotFoundException('أمر البيع غير موجود');
    }

    if (order.status === 'converted' && order.sale_id) {
      return { ok: true, message: 'تم تحويل أمر البيع مسبقاً إلى فاتورة', saleId: order.sale_id };
    }

    const items = await this.db
      .selectFrom('sales_order_items')
      .selectAll()
      .where('sales_order_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .execute();

    if (items.length === 0) {
      throw new BadRequestException('لا يمكن تحويل أمر بيع فارغ إلى فاتورة');
    }

    // Resolve branch
    let branchId = order.branch_id;
    if (!branchId) {
      const primaryBranch = await this.db
        .selectFrom('branches')
        .select('id')
        .where('tenant_id', '=', scope.tenantId)
        .orderBy('id', 'asc')
        .executeTakeFirst();
      branchId = primaryBranch ? Number(primaryBranch.id) : 1;
    }

    // Release reserved quantity first so createSale has clean stock allocation
    for (const item of items) {
      const reservedQty = Number(item.reserved_quantity || 0);
      if (reservedQty > 0) {
        await this.db
          .updateTable('products')
          .set((eb) => ({
            reserved_qty: sql`GREATEST(0, ${eb('reserved_qty', '-', reservedQty)})`,
          }))
          .where('id', '=', Number(item.product_id))
          .where('tenant_id', '=', scope.tenantId)
          .execute();
      }
    }

    // Prepare sale items
    const saleItems = items.map((item) => ({
      productId: Number(item.product_id),
      qty: Number(item.quantity),
      price: Number(item.unit_price),
      discount: Number(item.discount || 0),
      unitName: item.unit_name || undefined,
    }));

    const totalAmount = Number(order.total_amount);

    const salePayload: any = {
      branchId,
      customerId: order.customer_id ? Number(order.customer_id) : undefined,
      customerName: order.customer_name,
      customerPhone: order.customer_phone || undefined,
      note: `تم إنشاؤها تحويلاً من أمر البيع #${order.order_number}${order.notes ? ` - ${order.notes}` : ''}`,
      items: saleItems,
      discount: Number(order.discount_amount || 0),
      paymentType: 'cash',
      paymentChannel: 'cash',
      source: 'dashboard',
      payments: [
        {
          paymentChannel: 'cash',
          amount: totalAmount,
        },
      ],
    };

    const saleResult: any = await this.salesWrite.createSale(salePayload, auth);
    const saleId = Number(saleResult?.sale?.id || saleResult?.id);

    // Mark sales order as converted
    await this.db
      .updateTable('sales_orders')
      .set({
        status: 'converted',
        sale_id: saleId,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    // Mark items as delivered
    await this.db
      .updateTable('sales_order_items')
      .set((eb) => ({
        delivered_quantity: eb.ref('quantity'),
        reserved_quantity: 0,
      }))
      .where('sales_order_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return {
      ok: true,
      message: 'تم تحويل أمر البيع إلى فاتورة بيع بنجاح وتحديث المخزون الفعلي',
      orderId: id,
      saleId,
      sale: saleResult?.sale || saleResult,
    };
  }

  async deleteOrder(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('sales_orders')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .where('account_id', '=', scope.accountId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('أمر البيع غير موجود');
    }

    if (existing.status === 'converted') {
      throw new BadRequestException('لا يمكن حذف أمر بيع تم تحويله إلى فاتورة');
    }

    // Cancel / release stock first
    if (existing.status === 'confirmed') {
      await this.cancelOrder(id, auth);
    }

    await this.db.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('sales_order_items')
        .where('sales_order_id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      await trx
        .deleteFrom('sales_orders')
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    });

    return { ok: true, message: 'تم حذف أمر البيع بنجاح' };
  }
}
