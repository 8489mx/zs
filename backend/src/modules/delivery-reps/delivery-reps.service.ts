import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { UpsertDeliveryRepDto } from './dto/upsert-delivery-rep.dto';

import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { SalesFinanceService } from '../sales/services/sales-finance.service';

@Injectable()
export class DeliveryRepsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly salesFinance: SalesFinanceService,
  ) {}

  private tenantPredicate(actor: AuthContext) {
    const { tenantId } = requireTenantScope(actor);
    return sql<boolean>`tenant_id = ${tenantId}`;
  }

  private tenantFields(actor: AuthContext) {
    const { tenantId, accountId } = requireTenantScope(actor);
    return { tenant_id: tenantId, account_id: accountId };
  }

  private async findOwnOpenShift(trx: Kysely<Database>, actor: AuthContext): Promise<{ id: number; branchId: number | null; locationId: number | null } | null> {
    const shift = await trx
      .selectFrom('cashier_shifts')
      .select(['id', 'branch_id', 'location_id'])
      .where('opened_by', '=', actor.userId)
      .where('status', '=', 'open')
      .where(this.tenantPredicate(actor))
      .orderBy('id', 'desc')
      .executeTakeFirst();
      
    if (!shift || !shift.id) return null;
    return { id: Number(shift.id), branchId: shift.branch_id ? Number(shift.branch_id) : null, locationId: shift.location_id ? Number(shift.location_id) : null };
  }

  async list(actor: AuthContext): Promise<Record<string, unknown>> {
    const reps = await this.db
      .selectFrom('delivery_representatives')
      .selectAll()
      .where(this.tenantPredicate(actor))
      .orderBy('is_active', 'desc')
      .orderBy('name', 'asc')
      .execute();
    return { ok: true, deliveryReps: reps };
  }

  async create(payload: UpsertDeliveryRepDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Name is required', 'NAME_REQUIRED', 400);

    const [inserted] = await this.db
      .insertInto('delivery_representatives')
      .values({
        name,
        phone: payload.phone || null,
        full_name: payload.fullName || null,
        national_id: payload.nationalId || null,
        address: payload.address || null,
        vehicle_plate: payload.vehiclePlate || null,
        is_active: payload.isActive !== false,
        ...this.tenantFields(actor),
      } as any)
      .returning(['id'])
      .execute();

    await this.audit.log('إضافة مندوب توصيل', `تم إضافة المندوب ${name} بواسطة ${actor.username}`, actor);
    return this.list(actor);
  }

  async update(id: number, payload: UpsertDeliveryRepDto, actor: AuthContext): Promise<Record<string, unknown>> {
    const name = String(payload.name || '').trim();
    if (!name) throw new AppError('Name is required', 'NAME_REQUIRED', 400);

    const existing = await this.db
      .selectFrom('delivery_representatives')
      .select(['id'])
      .where('id', '=', id)
      .where(this.tenantPredicate(actor))
      .executeTakeFirst();
    if (!existing) throw new AppError('Delivery representative not found', 'NOT_FOUND', 404);

    await this.db
      .updateTable('delivery_representatives')
      .set({
        name,
        phone: payload.phone || null,
        full_name: payload.fullName !== undefined ? (payload.fullName || null) : undefined,
        national_id: payload.nationalId !== undefined ? (payload.nationalId || null) : undefined,
        address: payload.address !== undefined ? (payload.address || null) : undefined,
        vehicle_plate: payload.vehiclePlate !== undefined ? (payload.vehiclePlate || null) : undefined,
        is_active: payload.isActive !== undefined ? payload.isActive : undefined,
        updated_at: sql`NOW()`,
      } as any)
      .where('id', '=', id)
      .where(this.tenantPredicate(actor))
      .execute();

    await this.audit.log('تعديل مندوب توصيل', `تم تعديل المندوب #${id} بواسطة ${actor.username}`, actor);
    return this.list(actor);
  }

  async remove(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const existing = await this.db
      .selectFrom('delivery_representatives')
      .select(['id'])
      .where('id', '=', id)
      .where(this.tenantPredicate(actor))
      .executeTakeFirst();
    if (!existing) throw new AppError('Delivery representative not found', 'NOT_FOUND', 404);

    await this.db
      .updateTable('delivery_representatives')
      .set({ is_active: false, updated_at: sql`NOW()` })
      .where('id', '=', id)
      .where(this.tenantPredicate(actor))
      .execute();

    await this.audit.log('حذف مندوب توصيل', `تم تعطيل المندوب #${id} بواسطة ${actor.username}`, actor);
    return this.list(actor);
  }

  async listOrders(repId: number, actor: AuthContext, filters?: { dateFrom?: string; dateTo?: string; status?: string }): Promise<Record<string, unknown>> {
    const { tenantId } = requireTenantScope(actor);
    let query = this.db
      .selectFrom('sales')
      .leftJoin('customers', 'customers.id', 'sales.customer_id')
      .leftJoin('users', 'users.id', 'sales.settled_by')
      .select([
        'sales.id',
        'sales.doc_no as docNo',
        'sales.total',
        'customers.name as customerName',
        'sales.order_type as orderType',
        'sales.delivery_rep_id as deliveryRepId',
        'sales.delivery_status as deliveryStatus',
        'sales.collection_status as collectionStatus',
        'sales.settled_at as settledAt',
        'sales.created_at as createdAt',
        'users.username as settledByName'
      ])
      .where('sales.delivery_rep_id', '=', repId)
      .where('sales.tenant_id', '=', tenantId);

    if (filters?.status) {
      if (filters.status === 'unsettled') {
        query = query.where((eb) => eb.or([
          eb('sales.delivery_status', '!=', 'settled'),
          eb('sales.delivery_status', 'is', null)
        ]));
      } else {
        query = query.where('sales.delivery_status', '=', filters.status as any);
      }
    }
    
    if (filters?.dateFrom) {
      query = query.where('sales.created_at', '>=', new Date(filters.dateFrom));
    }

    if (filters?.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      query = query.where('sales.created_at', '<=', dateTo);
    }

    const orders = await query.orderBy('sales.created_at', 'desc').execute();
    return { ok: true, orders };
  }

  async listSettlements(repId: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId } = requireTenantScope(actor);
    const settlements = await this.db
      .selectFrom('sales as s')
      .leftJoin('users as u', 'u.id', 's.settled_by')
      .select([
        's.id',
        's.doc_no as docNo',
        's.total as amount',
        's.created_at as orderDate',
        's.settled_at as createdAt',
        'u.username as settledByName'
      ])
      .where('s.tenant_id', '=', tenantId)
      .where('s.delivery_rep_id', '=', repId)
      .where('s.delivery_status', '=', 'settled')
      .orderBy('s.settled_at', 'desc')
      .execute();
      
    return { ok: true, settlements };
  }

  async getRepKPIs(repId: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const { tenantId } = requireTenantScope(actor);
    
    const orders = await this.db
      .selectFrom('sales')
      .select(['id', 'delivery_status', 'status', 'created_at as createdAt', 'settled_at as settledAt'])
      .where('delivery_rep_id', '=', repId)
      .where('tenant_id', '=', tenantId)
      .execute();

    const totalOrders = orders.length;
    let successfulOrders = 0;
    let returnedOrders = 0;
    let totalDelayMs = 0;
    let delayCount = 0;

    for (const order of orders) {
      if (order.status === 'returned') {
        returnedOrders++;
      } else if (order.delivery_status === 'settled') {
        successfulOrders++;
        if (order.createdAt && order.settledAt) {
          const delay = new Date(order.settledAt).getTime() - new Date(order.createdAt).getTime();
          if (delay > 0) {
            totalDelayMs += delay;
            delayCount++;
          }
        }
      }
    }

    const averageDelayHours = delayCount > 0 ? (totalDelayMs / delayCount) / (1000 * 60 * 60) : 0;
    const successRate = totalOrders > 0 ? (successfulOrders / totalOrders) * 100 : 0;
    
    // Rating logic (Starts at 5, deducts based on issues)
    let rating = 5.0;
    
    // Deduct 0.5 for every 10% returns
    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
    rating -= (returnRate / 10) * 0.5;
    
    // Deduct for delay: 0.1 for every hour of average delay above 2 hours
    if (averageDelayHours > 2) {
      rating -= (averageDelayHours - 2) * 0.1;
    }
    
    // Ensure rating is between 0 and 5
    rating = Math.max(0, Math.min(5, Number(rating.toFixed(1))));

    return { 
      ok: true, 
      kpis: {
        totalOrders,
        successfulOrders,
        returnedOrders,
        successRate: Number(successRate.toFixed(1)),
        averageDelayHours: Number(averageDelayHours.toFixed(1)),
        rating
      } 
    };
  }

  async settleOrder(saleId: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const sale = await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'delivery_status', 'delivery_rep_id', 'collection_status', 'customer_id'])
      .where('id', '=', saleId)
      .where(this.tenantPredicate(actor))
      .executeTakeFirst();

    if (!sale) throw new AppError('Order not found', 'ORDER_NOT_FOUND', 404);
    if (!sale.delivery_rep_id) throw new AppError('Order is not assigned to a delivery rep', 'NOT_ASSIGNED', 400);
    if (sale.delivery_status === 'settled') throw new AppError('Order is already settled', 'ALREADY_SETTLED', 400);

    await this.db.transaction().execute(async (trx) => {
      let shiftId: number | null = null;
      let branchId: number | null = null;
      let locationId: number | null = null;

      if (sale.collection_status === 'cod') {
        const openShift = await this.findOwnOpenShift(trx, actor);
        if (!openShift) throw new AppError('لا بد من فتح وردية أولاً لاستلام الفلوس من المندوب', 'NO_OPEN_SHIFT', 400);
        shiftId = openShift.id;
        branchId = openShift.branchId;
        locationId = openShift.locationId;

        await trx.insertInto('treasury_transactions').values({
          txn_type: 'cash_in',
          amount: Number(sale.total),
          note: `تسوية أوردر دليفري رقم #${saleId} من مندوب #${sale.delivery_rep_id}`,
          reference_type: 'cashier_shift',
          reference_id: shiftId,
          branch_id: branchId,
          location_id: locationId,
          created_by: actor.userId,
          ...this.tenantFields(actor)
        }).execute();

        if (sale.customer_id) {
          await this.salesFinance.createCustomerLedgerEntry(trx, sale.customer_id, -Number(sale.total), `تسديد من مندوب للأوردر #${saleId}`, saleId, actor);
        }

        await this.accountingPosting.postDeliveryRepSettlement(trx, saleId, Number(sale.total), branchId, locationId, actor);
      }

      await trx
        .updateTable('sales')
        .set({
          delivery_status: 'settled',
          settled_at: sql`NOW()`,
          settled_by: actor.userId,
          updated_at: sql`NOW()`,
        })
        .where('id', '=', saleId)
        .where(this.tenantPredicate(actor))
        .execute();
    });

    await this.audit.log('تسوية طلب توصيل', `تمت تسوية الطلب #${saleId} بواسطة ${actor.username}`, actor);
    return { ok: true };
  }

  async getRepSummary(repId: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const rep = await this.db
      .selectFrom('delivery_representatives')
      .select(['id', 'name'])
      .where('id', '=', repId)
      .where(this.tenantPredicate(actor))
      .executeTakeFirst();
    if (!rep) throw new AppError('Delivery representative not found', 'NOT_FOUND', 404);

    const summary = await this.db
      .selectFrom('sales')
      .select([
        sql<number>`count(*)`.as('total_orders'),
        sql<number>`sum(case when delivery_status = 'settled' then total else 0 end)`.as('collected_amount'),
        sql<number>`sum(case when (delivery_status != 'settled' or delivery_status is null) and collection_status = 'cod' then total else 0 end)`.as('pending_amount')
      ])
      .where('delivery_rep_id', '=', repId)
      .where(this.tenantPredicate(actor))
      .executeTakeFirst();

    return {
      ok: true,
      summary: {
        totalOrders: Number(summary?.total_orders || 0),
        collectedAmount: Number(summary?.collected_amount || 0),
        pendingAmount: Number(summary?.pending_amount || 0),
      }
    };
  }

  async settleAllOrders(repId: number, expectedAmount: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const unsettledOrders = await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'customer_id'])
      .where('delivery_rep_id', '=', repId)
      .where('collection_status', '=', 'cod')
      .where((eb) => eb.or([
        eb('delivery_status', '!=', 'settled'),
        eb('delivery_status', 'is', null)
      ]))
      .where(this.tenantPredicate(actor))
      .execute();

    if (unsettledOrders.length === 0) {
      throw new AppError('No unsettled orders found for this representative', 'NO_ORDERS', 400);
    }

    const actualTotal = unsettledOrders.reduce((sum, order) => sum + Number(order.total), 0);

    if (Math.abs(actualTotal - expectedAmount) > 0.01) {
      throw new AppError(`مبلغ التسوية (${expectedAmount}) لا يتطابق مع إجمالي المطلوب من المندوب (${actualTotal}).`, 'AMOUNT_MISMATCH', 400);
    }

    const saleIds = unsettledOrders.map(o => o.id);
    
    await this.db.transaction().execute(async (trx) => {
      const openShift = await this.findOwnOpenShift(trx, actor);
      if (!openShift) throw new AppError('لا بد من فتح وردية أولاً لاستلام الفلوس من المندوب', 'NO_OPEN_SHIFT', 400);
      
      await trx.insertInto('treasury_transactions').values({
        txn_type: 'cash_in',
        amount: actualTotal,
        note: `تسوية أوردرات دليفري (${saleIds.length} أوردر) من مندوب #${repId}`,
        reference_type: 'cashier_shift',
        reference_id: openShift.id,
        branch_id: openShift.branchId,
        location_id: openShift.locationId,
        created_by: actor.userId,
        ...this.tenantFields(actor)
      }).execute();

      for (const order of unsettledOrders) {
        if (order.customer_id) {
          await this.salesFinance.createCustomerLedgerEntry(trx, order.customer_id, -Number(order.total), `تسديد من مندوب للأوردر #${order.id}`, order.id, actor);
        }
        await this.accountingPosting.postDeliveryRepSettlement(trx, order.id, Number(order.total), openShift.branchId, openShift.locationId, actor);
      }

      await trx
        .updateTable('sales')
        .set({
          delivery_status: 'settled',
          settled_at: sql`NOW()`,
          settled_by: actor.userId,
          updated_at: sql`NOW()`,
        })
        .where('id', 'in', saleIds)
        .where(this.tenantPredicate(actor))
        .execute();
    });

    await this.audit.log('تسوية كل الطلبات', `تمت تسوية ${saleIds.length} طلب للمندوب #${repId} بواسطة ${actor.username}`, actor);
    return { ok: true, settledCount: saleIds.length, totalAmount: actualTotal };
  }
}
