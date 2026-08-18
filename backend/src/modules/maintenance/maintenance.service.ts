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
    let query = this.db
      .selectFrom('maintenance_tickets')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId);

    if (filters?.status && filters.status !== 'all') {
      query = query.where('status', '=', filters.status as any);
    }

    if (filters?.q && filters.q.trim()) {
      const term = `%${filters.q.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('ticket_no', 'ilike', term),
          eb('customer_name', 'ilike', term),
          eb('customer_phone', 'ilike', term),
          eb('serial_number', 'ilike', term),
          eb('device_model', 'ilike', term),
        ]),
      );
    }

    const totalRes = await query
      .select((eb) => eb.fn.count('id').as('count'))
      .executeTakeFirst();
    const total = Number(totalRes?.count || 0);

    const page = Math.max(1, Number(filters?.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(filters?.pageSize || 25)));
    const offset = (page - 1) * pageSize;

    const tickets = await query
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
    const year = new Date().getFullYear();
    const ticketNo = `REP-${year}-${String(nextNum).padStart(4, '0')}`;

    const result = await this.db
      .insertInto('maintenance_tickets')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        ticket_no: ticketNo,
        customer_id: payload.customerId ?? null,
        customer_name: payload.customerName.trim(),
        customer_phone: payload.customerPhone.trim(),
        device_brand: payload.deviceBrand?.trim() ?? null,
        device_model: payload.deviceModel.trim(),
        serial_number: payload.serialNumber?.trim() ?? null,
        passcode: payload.passcode?.trim() ?? null,
        problem_description: payload.problemDescription.trim(),
        device_condition: payload.deviceCondition?.trim() ?? null,
        expected_cost: payload.expectedCost ?? 0,
        final_cost: payload.finalCost ?? payload.expectedCost ?? 0,
        advance_payment: payload.advancePayment ?? 0,
        status: payload.status ?? 'received',
        technician_id: payload.technicianId ?? null,
        technician_name: payload.technicianName?.trim() ?? null,
        technician_notes: payload.technicianNotes?.trim() ?? null,
        branchId: payload.branchId ?? null,
        locationId: payload.locationId ?? null,
        warranty_days: payload.warrantyDays ?? 30,
        received_at: new Date(),
      } as any)
      .returning('id')
      .executeTakeFirst();

    if (!result?.id) {
      throw new AppError('تعذر إنشاء تذكرة الصيانة', 'CREATE_TICKET_FAILED', 400);
    }

    await this.audit.log('Create Maintenance Ticket', `Created ticket ${ticketNo} for ${payload.customerName}`, auth);
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
        customer_name: payload.customerName.trim(),
        customer_phone: payload.customerPhone.trim(),
        device_brand: payload.deviceBrand?.trim() ?? null,
        device_model: payload.deviceModel.trim(),
        serial_number: payload.serialNumber?.trim() ?? null,
        passcode: payload.passcode?.trim() ?? null,
        problem_description: payload.problemDescription.trim(),
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

    await this.audit.log('Update Maintenance Ticket', `Updated ticket ${existing.ticket_no}`, auth);
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

    await this.audit.log('Update Ticket Status', `Updated ticket ${existing.ticket_no} status to ${payload.status}`, auth);
    return { ok: true };
  }

  async addPart(ticketId: number, payload: AddTicketPartDto, auth: AuthContext) {
    const scope = requireTenantScope(auth);
    const ticket = await this.db
      .selectFrom('maintenance_tickets')
      .select(['id', 'final_cost'])
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

    // Automatically update final cost of the ticket by adding the part price
    const addedAmount = Number(payload.qty) * Number(payload.unitPrice);
    const newFinalCost = Number(ticket.final_cost) + addedAmount;
    await this.db
      .updateTable('maintenance_tickets')
      .set({ final_cost: newFinalCost, updated_at: new Date() })
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', ticketId)
      .execute();

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

    const ticket = await this.db
      .selectFrom('maintenance_tickets')
      .select(['final_cost'])
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', ticketId)
      .executeTakeFirst();

    if (ticket) {
      const partTotal = Number(part.qty) * Number(part.unit_price);
      const newFinalCost = Math.max(0, Number(ticket.final_cost) - partTotal);
      await this.db
        .updateTable('maintenance_tickets')
        .set({ final_cost: newFinalCost, updated_at: new Date() })
        .where('tenant_id', '=', scope.tenantId)
        .where('id', '=', ticketId)
        .execute();
    }

    return { ok: true };
  }

  async deleteTicket(id: number, auth: AuthContext) {
    const scope = requireTenantScope(auth);
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

    await this.audit.log('Delete Maintenance Ticket', `Deleted ticket ID ${id}`, auth);
    return { ok: true };
  }
}
