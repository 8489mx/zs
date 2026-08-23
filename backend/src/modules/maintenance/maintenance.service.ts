import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Kysely } from '../../database/kysely';
import { AuditService } from '../../core/audit/audit.service';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { UpsertMaintenanceTicketDto } from './dto/upsert-maintenance-ticket.dto';
import { UpdateTicketStatusDto, AddTicketPartDto } from './dto/update-ticket-status.dto';
import { normalizeArabicSearch } from '../../common/utils/arabic-search.util';

@Injectable()
export class MaintenanceService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly audit: AuditService,
  ) {}

  async listTickets(
    auth: AuthContext,
    filters?: {
      status?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const scope = requireTenantScope(auth);
    let baseQuery = this.db
      .selectFrom('maintenance_tickets')
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.status && filters.status !== 'all') {
      baseQuery = baseQuery.where('status', '=', filters.status as any);
    }

    if (filters?.q && filters.q.trim()) {
      const term = `%${normalizeArabicSearch(filters.q)}%`;
      baseQuery = baseQuery.where(sql<boolean>`(
        lower(ticket_no) like ${term}
        OR TRANSLATE(LOWER(COALESCE(customer_name, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
        OR lower(customer_phone) like ${term}
        OR lower(serial_number) like ${term}
        OR TRANSLATE(LOWER(COALESCE(device_model, '')), 'أإآٱٲٳؤئىة', 'ااااااويهه') LIKE ${term}
      )`);
    }

    const totalRes = await baseQuery
      .select((eb) => eb.fn.count('id').as('count'))
      .executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const tickets = await baseQuery
      .selectAll()
      .orderBy('id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      tickets: tickets.map((t) => ({
        id: String(t.id),
        ticketNo: t.ticket_no,
        customerId: t.customer_id ? String(t.customer_id) : null,
        customerName: t.customer_name,
        customerPhone: t.customer_phone,
        deviceBrand: t.device_brand,
        deviceModel: t.device_model,
        serialNumber: t.serial_number,
        passcode: t.passcode,
        problemDescription: t.problem_description,
        deviceCondition: t.device_condition,
        expectedCost: Number(t.expected_cost),
        finalCost: Number(t.final_cost),
        advancePayment: Number(t.advance_payment),
        status: t.status,
        technicianId: t.technician_id ? String(t.technician_id) : null,
        technicianName: t.technician_name,
        technicianNotes: t.technician_notes,
        branchId: t.branch_id ? String(t.branch_id) : null,
        locationId: t.location_id ? String(t.location_id) : null,
        saleId: t.sale_id ? String(t.sale_id) : null,
        warrantyDays: t.warranty_days,
        receivedAt: t.received_at,
        repairedAt: t.repaired_at,
        deliveredAt: t.delivered_at,
        createdAt: t.created_at,
      })),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getTicket(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const ticket = await this.db
      .selectFrom('maintenance_tickets')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!ticket) {
      throw new AppError('تذكرة الصيانة غير موجودة', 'TICKET_NOT_FOUND', 404);
    }

    const parts = await this.db
      .selectFrom('maintenance_ticket_parts')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('ticket_id', '=', id)
      .orderBy('id', 'asc')
      .execute();

    return {
      ticket: {
        id: String(ticket.id),
        ticketNo: ticket.ticket_no,
        customerId: ticket.customer_id ? String(ticket.customer_id) : null,
        customerName: ticket.customer_name,
        customerPhone: ticket.customer_phone,
        deviceBrand: ticket.device_brand,
        deviceModel: ticket.device_model,
        serialNumber: ticket.serial_number,
        passcode: ticket.passcode,
        problemDescription: ticket.problem_description,
        deviceCondition: ticket.device_condition,
        expectedCost: Number(ticket.expected_cost),
        finalCost: Number(ticket.final_cost),
        advancePayment: Number(ticket.advance_payment),
        status: ticket.status,
        technicianId: ticket.technician_id ? String(ticket.technician_id) : null,
        technicianName: ticket.technician_name,
        technicianNotes: ticket.technician_notes,
        branchId: ticket.branch_id ? String(ticket.branch_id) : null,
        locationId: ticket.location_id ? String(ticket.location_id) : null,
        saleId: ticket.sale_id ? String(ticket.sale_id) : null,
        warrantyDays: ticket.warranty_days,
        receivedAt: ticket.received_at,
        repairedAt: ticket.repaired_at,
        deliveredAt: ticket.delivered_at,
        createdAt: ticket.created_at,
        parts: parts.map((p) => ({
          id: String(p.id),
          ticketId: String(p.ticket_id),
          productId: String(p.product_id),
          productName: p.product_name,
          qty: Number(p.qty),
          unitCost: Number(p.unit_cost),
          unitPrice: Number(p.unit_price),
          totalPrice: Number(p.qty) * Number(p.unit_price),
          locationId: p.location_id ? String(p.location_id) : null,
          createdAt: p.created_at,
        })),
      },
    };
  }

  async createTicket(payload: UpsertMaintenanceTicketDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const countRes = await this.db
      .selectFrom('maintenance_tickets')
      .select((eb) => eb.fn.count('id').as('count'))
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
    const nextNum = Number(countRes?.count || 0) + 1;
    const ticketNo = `ZM-${String(nextNum).padStart(4, '0')}`;

    const result = await this.db
      .insertInto('maintenance_tickets')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        ticket_no: ticketNo,
        customer_id: payload.customerId ?? null,
        customer_name: (payload.customerName || (payload as any).name || 'عميل نقدي').trim(),
        customer_phone: (payload.customerPhone || (payload as any).phone || '').trim(),
        device_brand: payload.deviceBrand?.trim() ?? null,
        device_model: (payload.deviceModel || (payload as any).model || 'جهاز عام').trim(),
        serial_number: payload.serialNumber?.trim() ?? null,
        passcode: payload.passcode?.trim() ?? null,
        problem_description: (payload.problemDescription || (payload as any).customerProblem || (payload as any).problem || 'صيانة عامة').trim(),
        device_condition: payload.deviceCondition?.trim() ?? null,
        expected_cost: payload.expectedCost ?? 0,
        final_cost: payload.finalCost ?? payload.expectedCost ?? 0,
        advance_payment: payload.advancePayment ?? 0,
        status: payload.status ?? 'received',
        technician_id: payload.technicianId ?? null,
        technician_name: payload.technicianName?.trim() ?? null,
        technician_notes: payload.technicianNotes?.trim() ?? null,
        branch_id: payload.branchId ?? null,
        location_id: payload.locationId ?? null,
        warranty_days: payload.warrantyDays ?? 30,
        received_at: new Date(),
      } as any)
      .returning('id')
      .executeTakeFirst();

    if (!result?.id) {
      throw new AppError('تعذر إنشاء تذكرة الصيانة', 'CREATE_TICKET_FAILED', 400);
    }

    // If advance payment was made, record cash-in to treasury
    if (payload.advancePayment && Number(payload.advancePayment) > 0) {
      try {
        await this.db
          .insertInto('treasury_transactions')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            txn_type: 'revenue',
            amount: Number(payload.advancePayment),
            note: `عربون صيانة تذكرة ${ticketNo} - العميل: ${(payload.customerName || '').trim()}`,
            reference_type: 'maintenance_ticket',
            reference_id: Number(result.id),
            branch_id: payload.branchId ?? null,
            location_id: payload.locationId ?? null,
            created_by: auth.userId ? Number(auth.userId) : null,
          })
          .execute();
      } catch (err) {
        console.warn('Failed to record advance payment to treasury:', err);
      }
    }

    await this.audit.log('إنشاء تذكرة صيانة', `تم إنشاء تذكرة صيانة ${ticketNo} للعميل ${payload.customerName}`, auth);
    return { ok: true, id: String(result.id), ticketNo };
  }

  async updateTicket(id: number, payload: UpsertMaintenanceTicketDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('maintenance_tickets')
      .select(['id', 'ticket_no'])
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new AppError('تذكرة الصيانة غير موجودة', 'TICKET_NOT_FOUND', 404);
    }

    await this.db
      .updateTable('maintenance_tickets')
      .set({
        customer_id: payload.customerId ?? null,
        customer_name: (payload.customerName || (payload as any).name || 'عميل نقدي').trim(),
        customer_phone: (payload.customerPhone || (payload as any).phone || '').trim(),
        device_brand: payload.deviceBrand?.trim() ?? null,
        device_model: (payload.deviceModel || (payload as any).model || 'جهاز عام').trim(),
        serial_number: payload.serialNumber?.trim() ?? null,
        passcode: payload.passcode?.trim() ?? null,
        problem_description: (payload.problemDescription || (payload as any).customerProblem || (payload as any).problem || 'صيانة عامة').trim(),
        device_condition: payload.deviceCondition?.trim() ?? null,
        expected_cost: payload.expectedCost ?? 0,
        final_cost: payload.finalCost ?? 0,
        advance_payment: payload.advancePayment ?? 0,
        status: payload.status ?? 'received',
        technician_id: payload.technicianId ?? null,
        technician_name: payload.technicianName?.trim() ?? null,
        technician_notes: payload.technicianNotes?.trim() ?? null,
        branch_id: payload.branchId ?? null,
        location_id: payload.locationId ?? null,
        warranty_days: payload.warrantyDays ?? 30,
        updated_at: new Date(),
      })
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .execute();

    await this.audit.log('تعديل تذكرة صيانة', `تم تحديث بيانات تذكرة الصيانة ${existing.ticket_no}`, auth);
    return { ok: true };
  }

  async updateTicketStatus(id: number, payload: UpdateTicketStatusDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const existing = await this.db
      .selectFrom('maintenance_tickets')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      throw new AppError('تذكرة الصيانة غير موجودة', 'TICKET_NOT_FOUND', 404);
    }

    const updates: Record<string, any> = {
      status: payload.status,
      updated_at: new Date(),
    };

    if (payload.finalCost !== undefined) {
      updates.final_cost = payload.finalCost;
    }
    if (payload.technicianNotes !== undefined) {
      updates.technician_notes = payload.technicianNotes;
    }
    if (payload.status === 'repaired' && !existing.repaired_at) {
      updates.repaired_at = new Date();
    }
    if (payload.status === 'delivered' && !existing.delivered_at) {
      updates.delivered_at = new Date();
    }

    await this.db
      .updateTable('maintenance_tickets')
      .set(updates)
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .execute();

    // When status changes to delivered, collect remaining balance into treasury
    if (payload.status === 'delivered' && existing.status !== 'delivered') {
      const finalCost = payload.finalCost !== undefined ? Number(payload.finalCost) : Number(existing.final_cost || existing.expected_cost || 0);
      const advance = Number(existing.advance_payment || 0);
      const remaining = payload.collectedAmount !== undefined
        ? Number(payload.collectedAmount)
        : Math.max(0, finalCost - advance);
      if (remaining > 0) {
        try {
          await this.db
            .insertInto('treasury_transactions')
            .values({
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
              txn_type: 'revenue',
              amount: remaining,
              note: `تحصيل صيانة وتسليم جهاز ${existing.ticket_no} - العميل: ${existing.customer_name}`,
              reference_type: 'maintenance_ticket',
              reference_id: Number(existing.id),
              branch_id: existing.branch_id ? Number(existing.branch_id) : null,
              location_id: existing.location_id ? Number(existing.location_id) : null,
              created_by: auth.userId ? Number(auth.userId) : null,
            })
            .execute();
        } catch (err) {
          console.warn('Failed to record delivery payment to treasury:', err);
        }
      }
    }

    const statusLabels: Record<string, string> = {
      received: 'تم الاستلام',
      inspecting: 'قيد الفحص والتسعير',
      in_progress: 'قيد الصيانة والإصلاح',
      repaired: 'تم الإصلاح وجاهز للتسليم',
      delivered: 'تم التسليم للعميل',
      unrepairable: 'غير قابل للإصلاح',
      cancelled: 'ملغاة',
      canceled: 'ملغاة',
    };
    const statusLabel = statusLabels[payload.status] || payload.status;
    await this.audit.log('تحديث حالة التذكرة', `تم تغيير حالة التذكرة ${existing.ticket_no} إلى "${statusLabel}"`, auth);
    return { ok: true };
  }

  async addPart(ticketId: number, payload: AddTicketPartDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const ticket = await this.db
      .selectFrom('maintenance_tickets')
      .select(['id', 'expected_cost', 'final_cost'])
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', ticketId)
      .executeTakeFirst();

    if (!ticket) {
      throw new AppError('تذكرة الصيانة غير موجودة', 'TICKET_NOT_FOUND', 404);
    }

    const partRes = await this.db
      .insertInto('maintenance_ticket_parts')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        ticket_id: ticketId,
        product_id: payload.productId,
        product_name: payload.productName.trim(),
        qty: payload.qty,
        unit_cost: payload.unitCost ?? 0,
        unit_price: payload.unitPrice,
        location_id: payload.locationId ?? null,
      })
      .returning('id')
      .executeTakeFirst();

    // Automatically deduct inventory from products table & record stock movement
    const prod = await this.db
      .selectFrom('products')
      .select(['stock_qty'])
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', payload.productId)
      .executeTakeFirst();

    if (prod) {
      const currentQty = Number(prod.stock_qty || 0);
      const deductQty = Number(payload.qty);
      const afterQty = Math.max(0, currentQty - deductQty);
      await this.db
        .updateTable('products')
        .set({ stock_qty: afterQty })
        .where('tenant_id', '=', scope.tenantId)
        .where('id', '=', payload.productId)
        .execute();

      try {
        await this.db
          .insertInto('stock_movements')
          .values({
            product_id: payload.productId,
            movement_type: 'maintenance_consumption',
            qty: -deductQty,
            before_qty: currentQty,
            after_qty: afterQty,
            reason: 'صرف قطعة غيار لتذكرة صيانة',
            note: `تذكرة صيانة #${ticketId} - قطعة: ${payload.productName.trim()}`,
            reference_type: 'maintenance_ticket',
            reference_id: ticketId,
            location_id: payload.locationId ?? null,
            created_by: auth.userId ? Number(auth.userId) : null,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          })
          .execute();
      } catch (err) {
        console.warn('Failed to record stock movement for maintenance part:', err);
      }
    }

    // If ticket has 0 cost set initially, initialize it to the part price.
    // If ticket already has an agreed price, preserve it (all-inclusive pricing).
    let newFinalCost = Number(ticket.final_cost || 0);
    if (newFinalCost === 0 && Number(ticket.expected_cost || 0) === 0) {
      const addedAmount = Number(payload.qty) * Number(payload.unitPrice);
      newFinalCost = addedAmount;
      await this.db
        .updateTable('maintenance_tickets')
        .set({ final_cost: newFinalCost, updated_at: new Date() })
        .where('tenant_id', '=', scope.tenantId)
        .where('id', '=', ticketId)
        .execute();
    }

    return { ok: true, partId: String(partRes?.id), newFinalCost };
  }

  async removePart(ticketId: number, partId: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const part = await this.db
      .selectFrom('maintenance_ticket_parts')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('ticket_id', '=', ticketId)
      .where('id', '=', partId)
      .executeTakeFirst();

    if (!part) {
      throw new AppError('قطعة الغيار غير موجودة بالتذكرة', 'PART_NOT_FOUND', 404);
    }

    await this.db
      .deleteFrom('maintenance_ticket_parts')
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', partId)
      .execute();

    // Return stock back to products table & record stock movement
    const prod = await this.db
      .selectFrom('products')
      .select(['stock_qty'])
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', part.product_id)
      .executeTakeFirst();

    if (prod) {
      const currentQty = Number(prod.stock_qty || 0);
      const returnQty = Number(part.qty);
      const afterQty = currentQty + returnQty;
      await this.db
        .updateTable('products')
        .set({ stock_qty: afterQty })
        .where('tenant_id', '=', scope.tenantId)
        .where('id', '=', part.product_id)
        .execute();

      try {
        await this.db
          .insertInto('stock_movements')
          .values({
            product_id: Number(part.product_id),
            movement_type: 'maintenance_return',
            qty: returnQty,
            before_qty: currentQty,
            after_qty: afterQty,
            reason: 'إلغاء صرف قطعة غيار من تذكرة صيانة',
            note: `إلغاء من تذكرة صيانة #${ticketId}`,
            reference_type: 'maintenance_ticket',
            reference_id: ticketId,
            created_by: auth.userId ? Number(auth.userId) : null,
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
          })
          .execute();
      } catch (err) {
        console.warn('Failed to record stock movement for maintenance part return:', err);
      }
    }

    return { ok: true };
  }

  async deleteTicket(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);

    // Return all consumed parts back to inventory before deletion
    const parts = await this.db
      .selectFrom('maintenance_ticket_parts')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('ticket_id', '=', id)
      .execute();

    for (const part of parts) {
      const prod = await this.db
        .selectFrom('products')
        .select(['stock_qty'])
        .where('tenant_id', '=', scope.tenantId)
        .where('id', '=', part.product_id)
        .executeTakeFirst();

      if (prod) {
        const currentQty = Number(prod.stock_qty || 0);
        const returnQty = Number(part.qty);
        const afterQty = currentQty + returnQty;

        await this.db
          .updateTable('products')
          .set({ stock_qty: afterQty })
          .where('tenant_id', '=', scope.tenantId)
          .where('id', '=', part.product_id)
          .execute();

        try {
          await this.db
            .insertInto('stock_movements')
            .values({
              product_id: Number(part.product_id),
              movement_type: 'maintenance_return',
              qty: returnQty,
              before_qty: currentQty,
              after_qty: afterQty,
              reason: 'إلغاء تذكرة صيانة - إرجاع قطع الغيار للمخزون',
              note: `حذف تذكرة صيانة #${id} - قطعة: ${part.product_name}`,
              reference_type: 'maintenance_ticket',
              reference_id: id,
              created_by: auth.userId ? Number(auth.userId) : null,
              tenant_id: scope.tenantId,
              account_id: scope.accountId,
            })
            .execute();
        } catch (err) {
          console.warn('Failed to record stock movement on ticket delete:', err);
        }
      }
    }

    await this.db
      .deleteFrom('maintenance_ticket_parts')
      .where('tenant_id', '=', scope.tenantId)
      .where('ticket_id', '=', id)
      .execute();

    await this.db
      .deleteFrom('maintenance_tickets')
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', id)
      .execute();

    await this.audit.log('حذف تذكرة صيانة', `تم حذف تذكرة الصيانة #${id} واسترجاع ${parts.length} قطعة غيار إلى المخزون`, auth);
    return { ok: true };
  }
}
