import { Inject, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
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

  private async getDeliveryFeeMode(trx: Kysely<Database>, actor: AuthContext): Promise<'freelance_courier' | 'store_fleet'> {
    const row = await trx
      .selectFrom('settings')
      .select(['value'])
      .where('key', '=', 'deliveryFeeMode')
      .where(this.tenantPredicate(actor))
      .executeTakeFirst();
    if (!row?.value) return 'freelance_courier';
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return parsed === 'store_fleet' ? 'store_fleet' : 'freelance_courier';
    } catch {
      return String(row.value).includes('store_fleet') ? 'store_fleet' : 'freelance_courier';
    }
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
        pin_code: payload.pinCode || null,
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
        pin_code: payload.pinCode !== undefined ? (payload.pinCode || null) : undefined,
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
      .leftJoin('users as settled_user', 'settled_user.id', 'sales.settled_by')
      .leftJoin('users as created_user', 'created_user.id', 'sales.created_by')
      .select([
        'sales.id',
        'sales.doc_no as docNo',
        'sales.total',
        'sales.delivery_fee as deliveryFee',
        'customers.name as customerName',
        'customers.phone as customerPhone',
        'customers.address as customerAddress',
        'sales.order_type as orderType',
        'sales.delivery_rep_id as deliveryRepId',
        'sales.delivery_status as deliveryStatus',
        'sales.collection_status as collectionStatus',
        sql<string | null>`sales.delivery_signature`.as('deliverySignature'),
        sql<string | null>`sales.delivery_photo_url`.as('deliveryPhotoUrl'),
        sql<number | null>`sales.delivery_gps_lat`.as('deliveryGpsLat'),
        sql<number | null>`sales.delivery_gps_lng`.as('deliveryGpsLng'),
        sql<string | null>`sales.delivery_notes`.as('deliveryNotes'),
        'sales.settled_at as settledAt',
        'sales.created_at as createdAt',
        'settled_user.username as settledByName',
        'created_user.username as createdByName'
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

  async listSettlements(repId: number, actor: AuthContext, filters?: { dateFrom?: string; dateTo?: string }): Promise<Record<string, unknown>> {
    const { tenantId } = requireTenantScope(actor);
    let query = this.db
      .selectFrom('sales as s')
      .leftJoin('users as u', 'u.id', 's.settled_by')
      .leftJoin('users as cu', 'cu.id', 's.created_by')
      .select([
        's.id',
        's.doc_no as docNo',
        's.total as amount',
        's.delivery_fee as deliveryFee',
        's.collection_status as collectionStatus',
        's.created_at as orderDate',
        's.settled_at as createdAt',
        'u.username as settledByName',
        'cu.username as createdByName'
      ])
      .where('s.tenant_id', '=', tenantId)
      .where('s.delivery_rep_id', '=', repId)
      .where('s.delivery_status', '=', 'settled');

    if (filters?.dateFrom) {
      query = query.where('s.settled_at', '>=', new Date(filters.dateFrom));
    }

    if (filters?.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      query = query.where('s.settled_at', '<=', dateTo);
    }

    const settlements = await query.orderBy('s.settled_at', 'desc').execute();
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
    const averageDelayMins = delayCount > 0 ? Math.round(totalDelayMs / delayCount / 60000) : 0;
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
        averageDelayMins,
        rating
      } 
    };
  }

  async settleOrder(
    saleId: number,
    actor: AuthContext,
    payload?: { signatureDataUrl?: string; proofPhotoUrl?: string; gpsLat?: number; gpsLng?: number; notes?: string }
  ): Promise<Record<string, unknown>> {
    const sale = await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'delivery_fee', 'delivery_fee_mode', 'delivery_status', 'delivery_rep_id', 'collection_status', 'customer_id'])
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

        const deliveryFeeMode = (sale as any).delivery_fee_mode || await this.getDeliveryFeeMode(trx, actor);
        const deliveryFee = Number((sale as any).delivery_fee || 0);
        const settledCashAmount = deliveryFeeMode === 'store_fleet' ? Number(sale.total) : Math.max(0, Number(sale.total) - deliveryFee);

        if (settledCashAmount > 0) {
          const repRow = sale.delivery_rep_id ? await trx.selectFrom('delivery_representatives').select(['name']).where('id', '=', Number(sale.delivery_rep_id)).where(this.tenantPredicate(actor)).executeTakeFirst() : null;
          const repLabel = repRow?.name ? `${repRow.name} (#${sale.delivery_rep_id})` : `مندوب #${sale.delivery_rep_id}`;
          await trx.insertInto('treasury_transactions').values({
            txn_type: 'cash_in',
            amount: settledCashAmount,
            note: `تسوية أوردر دليفري رقم #${saleId} من ${repLabel}${deliveryFee > 0 && deliveryFeeMode === 'freelance_courier' ? ` (مخصوماً منها ${deliveryFee} ج رسوم المندوب)` : ''}`,
            reference_type: 'cashier_shift',
            reference_id: shiftId,
            branch_id: branchId,
            location_id: locationId,
            created_by: actor.userId,
            ...this.tenantFields(actor)
          }).execute();
        }

        if (sale.customer_id) {
          await this.salesFinance.createCustomerLedgerEntry(trx, sale.customer_id, -Number(sale.total), `تسديد من مندوب للأوردر #${saleId}`, saleId, actor);
        }

        await this.accountingPosting.postDeliveryRepSettlement(trx, saleId, settledCashAmount, branchId, locationId, actor);
      }

      const updateData: Record<string, any> = {
        delivery_status: 'settled',
        settled_at: sql`NOW()`,
        settled_by: actor.userId,
        updated_at: sql`NOW()`,
      };
      if (payload?.signatureDataUrl) updateData.delivery_signature = payload.signatureDataUrl;
      if (payload?.proofPhotoUrl) updateData.delivery_photo_url = payload.proofPhotoUrl;
      if (payload?.gpsLat !== undefined && payload?.gpsLat !== null) updateData.delivery_gps_lat = payload.gpsLat;
      if (payload?.gpsLng !== undefined && payload?.gpsLng !== null) updateData.delivery_gps_lng = payload.gpsLng;
      if (payload?.notes) updateData.delivery_notes = payload.notes;

      await trx
        .updateTable('sales')
        .set(updateData)
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
    const result = await this.db.transaction().execute(async (trx) => {
      const openShift = await this.findOwnOpenShift(trx, actor);
      if (!openShift) throw new AppError('لا بد من فتح وردية أولاً لاستلام الفلوس من المندوب', 'NO_OPEN_SHIFT', 400);

      const unsettledOrders = await trx
        .selectFrom('sales')
        .select(['id', 'total', 'customer_id'])
        .where('delivery_rep_id', '=', repId)
        .where('collection_status', '=', 'cod')
        .where((eb) => eb.or([
          eb('delivery_status', '!=', 'settled'),
          eb('delivery_status', 'is', null)
        ]))
        .where(this.tenantPredicate(actor))
        .forUpdate()
        .execute();

      if (unsettledOrders.length === 0) {
        throw new AppError('No unsettled orders found for this representative', 'NO_ORDERS', 400);
      }

      const actualTotal = unsettledOrders.reduce((sum, order) => sum + Number(order.total), 0);

      if (Math.abs(actualTotal - expectedAmount) > 0.01) {
        throw new AppError(`مبلغ التسوية (${expectedAmount}) لا يتطابق مع إجمالي المطلوب من المندوب (${actualTotal}).`, 'AMOUNT_MISMATCH', 400);
      }

      const saleIds = unsettledOrders.map(o => o.id);
      
      const repRow = await trx.selectFrom('delivery_representatives').select(['name']).where('id', '=', repId).where(this.tenantPredicate(actor)).executeTakeFirst();
      const repLabel = repRow?.name ? `${repRow.name} (#${repId})` : `مندوب #${repId}`;

      await trx.insertInto('treasury_transactions').values({
        txn_type: 'cash_in',
        amount: actualTotal,
        note: `تسوية أوردرات دليفري (${saleIds.length} أوردر) من ${repLabel}`,
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

      return { settledCount: saleIds.length, totalAmount: actualTotal };
    });

    await this.audit.log('تسوية كل الطلبات', `تمت تسوية ${result.settledCount} طلب للمندوب #${repId} بواسطة ${actor.username}`, actor);
    return { ok: true, settledCount: result.settledCount, totalAmount: result.totalAmount };
  }

  async driverLogin(payload: { phone: string; pinCode: string }): Promise<{ token: string; rep: Record<string, unknown> }> {
    const rawPhone = String(payload?.phone || '').trim();
    const pinCode = String(payload?.pinCode || '').trim();
    if (!rawPhone || !pinCode) {
      throw new AppError('رقم الهاتف ورمز الدخول السريع (PIN) مطلوبان', 'INVALID_CREDENTIALS', 400);
    }

    const cleanDigits = rawPhone.replace(/\D/g, '');
    const cleanNoCountry = cleanDigits.startsWith('20') ? cleanDigits.slice(2) : (cleanDigits.startsWith('0') ? cleanDigits.slice(1) : cleanDigits);

    const reps = await this.db
      .selectFrom('delivery_representatives')
      .selectAll()
      .where('is_active', '=', true)
      .execute();

    const matchedRep = reps.find((r) => {
      if (!r.phone || !r.pin_code) return false;
      const rDigits = String(r.phone).replace(/\D/g, '');
      const rNoCountry = rDigits.startsWith('20') ? rDigits.slice(2) : (rDigits.startsWith('0') ? rDigits.slice(1) : rDigits);
      return (rNoCountry === cleanNoCountry || rDigits === cleanDigits) && String(r.pin_code).trim() === pinCode;
    });

    if (!matchedRep) {
      throw new AppError('بيانات الدخول غير صحيحة أو حساب المندوب غير مفعّل', 'UNAUTHORIZED_DRIVER', 401);
    }

    const tokenPayload = {
      repId: Number(matchedRep.id),
      tenantId: matchedRep.tenant_id,
      accountId: matchedRep.account_id,
      name: matchedRep.name,
      phone: matchedRep.phone,
      iat: Date.now(),
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    const tokenSecret = process.env.SESSION_SECRET || 'zs-delivery-secret-token-key-2026';
    const payloadEncoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    const signature = createHmac('sha256', tokenSecret).update(payloadEncoded).digest('base64url');
    const token = `${payloadEncoded}.${signature}`;

    return {
      token,
      rep: {
        id: matchedRep.id,
        name: matchedRep.name,
        fullName: matchedRep.full_name,
        phone: matchedRep.phone,
        vehiclePlate: matchedRep.vehicle_plate,
        tenantId: matchedRep.tenant_id,
      },
    };
  }

  verifyDriverToken(token: string): { repId: number; tenantId: string; accountId: string; name: string; phone: string } {
    if (!token) throw new AppError('غير مصرح - مطلوب تسجيل الدخول', 'UNAUTHORIZED_DRIVER', 401);
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 2) throw new AppError('رمز الدخول غير صالح', 'INVALID_DRIVER_TOKEN', 401);
    const [payloadEncoded, signature] = parts;
    const tokenSecret = process.env.SESSION_SECRET || 'zs-delivery-secret-token-key-2026';
    const expectedSignature = createHmac('sha256', tokenSecret).update(payloadEncoded).digest('base64url');
    if (signature !== expectedSignature) {
      throw new AppError('رمز الدخول غير صالح أو مزور', 'INVALID_DRIVER_TOKEN', 401);
    }
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) {
      throw new AppError('انتهت صلاحية جلسة المندوب، يرجى إعادة تسجيل الدخول', 'DRIVER_SESSION_EXPIRED', 401);
    }
    return payload;
  }

  async driverListOrders(repId: number, tenantId: string, filters?: { dateFrom?: string; dateTo?: string; status?: string }): Promise<Record<string, unknown>> {
    let query = this.db
      .selectFrom('sales')
      .leftJoin('customers', 'customers.id', 'sales.customer_id')
      .select([
        'sales.id',
        'sales.doc_no as docNo',
        'sales.total',
        'sales.delivery_fee as deliveryFee',
        'customers.name as customerName',
        'customers.phone as customerPhone',
        'customers.address as customerAddress',
        'sales.order_type as orderType',
        'sales.delivery_rep_id as deliveryRepId',
        'sales.delivery_status as deliveryStatus',
        'sales.collection_status as collectionStatus',
        sql<string | null>`sales.delivery_signature`.as('deliverySignature'),
        sql<string | null>`sales.delivery_photo_url`.as('deliveryPhotoUrl'),
        sql<number | null>`sales.delivery_gps_lat`.as('deliveryGpsLat'),
        sql<number | null>`sales.delivery_gps_lng`.as('deliveryGpsLng'),
        sql<string | null>`sales.delivery_notes`.as('deliveryNotes'),
        'sales.settled_at as settledAt',
        'sales.created_at as createdAt',
      ])
      .where('sales.delivery_rep_id', '=', repId)
      .where('sales.tenant_id', '=', tenantId);

    if (filters?.status) {
      if (filters.status === 'pending') {
        query = query.where((eb) => eb.or([
          eb('sales.delivery_status', '!=', 'settled'),
          eb('sales.delivery_status', 'is', null),
        ]));
      } else if (filters.status === 'settled') {
        query = query.where('sales.delivery_status', '=', 'settled');
      }
    }

    const orders = await query.orderBy('sales.created_at', 'desc').execute();
    return { ok: true, orders };
  }

  async driverSettleOrder(
    saleId: number,
    repId: number,
    tenantId: string,
    payload?: { signatureDataUrl?: string; proofPhotoUrl?: string; gpsLat?: number; gpsLng?: number; notes?: string }
  ): Promise<Record<string, unknown>> {
    const sale = await this.db
      .selectFrom('sales')
      .select(['id', 'delivery_rep_id', 'delivery_status', 'tenant_id'])
      .where('id', '=', saleId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();

    if (!sale) throw new AppError('الطلب غير موجود', 'ORDER_NOT_FOUND', 404);
    if (Number(sale.delivery_rep_id) !== Number(repId)) {
      throw new AppError('هذا الطلب غير مسند إلى هذا المندوب', 'NOT_ASSIGNED', 403);
    }
    if (sale.delivery_status === 'settled') {
      throw new AppError('تمت تسوية هذا الطلب مسبقاً', 'ALREADY_SETTLED', 400);
    }

    const updateData: Record<string, any> = {
      delivery_status: 'settled',
      settled_at: sql`NOW()`,
      updated_at: sql`NOW()`,
    };
    if (payload?.signatureDataUrl) updateData.delivery_signature = payload.signatureDataUrl;
    if (payload?.proofPhotoUrl) updateData.delivery_photo_url = payload.proofPhotoUrl;
    if (payload?.gpsLat !== undefined && payload?.gpsLat !== null) updateData.delivery_gps_lat = payload.gpsLat;
    if (payload?.gpsLng !== undefined && payload?.gpsLng !== null) updateData.delivery_gps_lng = payload.gpsLng;
    if (payload?.notes) updateData.delivery_notes = payload.notes;

    await this.db
      .updateTable('sales')
      .set(updateData)
      .where('id', '=', saleId)
      .where('tenant_id', '=', tenantId)
      .execute();

    return { ok: true, message: 'تم تأكيد تسليم الشحنة بنجاح' };
  }
}
