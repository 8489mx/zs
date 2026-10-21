import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';

export interface OpenInvoiceItem {
  id: number;
  docNo: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  date: string;
  status: string;
}

export interface UnallocatedPaymentItem {
  id: number;
  docNo?: string | null;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  date: string;
  note: string;
}

export interface AllocateItemInput {
  invoiceId: number;
  amount: number;
}

export interface AllocatePaymentDto {
  partnerType: 'customer' | 'supplier';
  partnerId: number;
  paymentType: 'customer_payment' | 'supplier_payment' | 'direct';
  paymentId?: number | null;
  allocations: AllocateItemInput[];
  notes?: string;
}

/** The API must not create an apparent invoice settlement without a funded voucher. */
export function validatePaymentAllocationRequest(dto: AllocatePaymentDto): { totalAllocating: number; allocations: AllocateItemInput[] } {
  if (!dto || !['customer', 'supplier'].includes(dto.partnerType) || !Number.isSafeInteger(dto.partnerId) || dto.partnerId <= 0) {
    throw new BadRequestException('Invalid payment partner');
  }
  const expectedType = dto.partnerType === 'customer' ? 'customer_payment' : 'supplier_payment';
  if (dto.paymentType !== expectedType || typeof dto.paymentId !== 'number' || !Number.isSafeInteger(dto.paymentId) || dto.paymentId <= 0) {
    throw new BadRequestException('Allocation requires a real customer/supplier payment voucher; unfunded direct allocation is forbidden');
  }
  if (!Array.isArray(dto.allocations) || dto.allocations.length === 0) {
    throw new BadRequestException('At least one invoice allocation is required');
  }
  const seen = new Set<number>();
  let cents = 0;
  for (const row of dto.allocations) {
    if (!row || !Number.isSafeInteger(row.invoiceId) || row.invoiceId <= 0 || seen.has(row.invoiceId)) {
      throw new BadRequestException('Invalid or repeated invoice ID');
    }
    seen.add(row.invoiceId);
    if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0 ||
        Math.abs(row.amount * 100 - Math.round(row.amount * 100)) > 1e-7) {
      throw new BadRequestException('Every allocated amount must be positive, finite and accurate to cents');
    }
    cents += Math.round(row.amount * 100);
    if (!Number.isSafeInteger(cents)) throw new BadRequestException('Allocation total is too large');
  }
  return { totalAllocating: cents / 100, allocations: [...dto.allocations].sort((a, b) => a.invoiceId - b.invoiceId) };
}

@Injectable()
export class PaymentAllocationService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private assertAccountingAccess(auth: AuthContext): void {
    if (auth.role === 'super_admin' || auth.role === 'admin' || auth.permissions.includes('accounting') || auth.permissions.includes('treasury')) {
      return;
    }
    throw new ForbiddenException('Missing required permissions for payment allocation');
  }

  async getOpenInvoices(partnerType: 'customer' | 'supplier', partnerId: number, auth: AuthContext): Promise<OpenInvoiceItem[]> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);

    if (partnerType === 'customer') {
      const sales = await this.db
        .selectFrom('sales')
        .select(['id', 'doc_no', 'total', 'paid_amount', 'status', 'created_at'])
        .where('tenant_id', '=', scope.tenantId)
        .where('customer_id', '=', partnerId)
        .where('status', '!=', 'cancelled')
        .orderBy('id', 'asc')
        .execute();

      return sales
        .map((s) => {
          const total = Number(s.total || 0);
          const paid = Number(s.paid_amount || 0);
          const remaining = Number((total - paid).toFixed(2));
          return {
            id: Number(s.id),
            docNo: s.doc_no || `INV-${s.id}`,
            total,
            paidAmount: paid,
            remainingAmount: remaining,
            date: s.created_at ? new Date(s.created_at).toISOString().slice(0, 10) : '',
            status: s.status,
          };
        })
        .filter((inv) => inv.remainingAmount > 0.009);
    } else {
      const purchases = await this.db
        .selectFrom('purchases')
        .select(['id', 'doc_no', 'total', 'paid_amount', 'status', 'created_at'])
        .where('tenant_id', '=', scope.tenantId)
        .where('supplier_id', '=', partnerId)
        .where('status', '!=', 'cancelled')
        .orderBy('id', 'asc')
        .execute();

      return purchases
        .map((p) => {
          const total = Number(p.total || 0);
          const paid = Number(p.paid_amount || 0);
          const remaining = Number((total - paid).toFixed(2));
          return {
            id: Number(p.id),
            docNo: p.doc_no || `BILL-${p.id}`,
            total,
            paidAmount: paid,
            remainingAmount: remaining,
            date: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
            status: p.status,
          };
        })
        .filter((bill) => bill.remainingAmount > 0.009);
    }
  }

  async getUnallocatedPayments(partnerType: 'customer' | 'supplier', partnerId: number, auth: AuthContext): Promise<UnallocatedPaymentItem[]> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);

    if (partnerType === 'customer') {
      const payments = await this.db
        .selectFrom('customer_payments as cp')
        .leftJoin('payment_allocations as pa', (join) =>
          join
            .onRef('pa.payment_id', '=', 'cp.id')
            .on('pa.payment_type', '=', 'customer_payment')
            .on('pa.tenant_id', '=', scope.tenantId)
        )
        .select([
          'cp.id',
          'cp.amount',
          'cp.note',
          'cp.created_at',
          sql<string>`COALESCE(SUM(pa.allocated_amount), 0)`.as('total_allocated'),
        ])
        .where('cp.tenant_id', '=', scope.tenantId)
        .where('cp.customer_id', '=', partnerId)
        .groupBy(['cp.id', 'cp.amount', 'cp.note', 'cp.created_at'])
        .orderBy('cp.id', 'desc')
        .execute();

      return payments
        .map((p) => {
          const amount = Number(p.amount || 0);
          const allocated = Number(p.total_allocated || 0);
          const unallocated = Number((amount - allocated).toFixed(2));
          return {
            id: Number(p.id),
            docNo: `CP-${p.id}`,
            amount,
            allocatedAmount: allocated,
            unallocatedAmount: unallocated,
            date: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
            note: p.note || '',
          };
        })
        .filter((p) => p.unallocatedAmount > 0.009);
    } else {
      const payments = await this.db
        .selectFrom('supplier_payments as sp')
        .leftJoin('payment_allocations as pa', (join) =>
          join
            .onRef('pa.payment_id', '=', 'sp.id')
            .on('pa.payment_type', '=', 'supplier_payment')
            .on('pa.tenant_id', '=', scope.tenantId)
        )
        .select([
          'sp.id',
          'sp.doc_no',
          'sp.amount',
          'sp.note',
          'sp.created_at',
          sql<string>`COALESCE(SUM(pa.allocated_amount), 0)`.as('total_allocated'),
        ])
        .where('sp.tenant_id', '=', scope.tenantId)
        .where('sp.supplier_id', '=', partnerId)
        .groupBy(['sp.id', 'sp.doc_no', 'sp.amount', 'sp.note', 'sp.created_at'])
        .orderBy('sp.id', 'desc')
        .execute();

      return payments
        .map((p) => {
          const amount = Number(p.amount || 0);
          const allocated = Number(p.total_allocated || 0);
          const unallocated = Number((amount - allocated).toFixed(2));
          return {
            id: Number(p.id),
            docNo: p.doc_no || `SP-${p.id}`,
            amount,
            allocatedAmount: allocated,
            unallocatedAmount: unallocated,
            date: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '',
            note: p.note || '',
          };
        })
        .filter((p) => p.unallocatedAmount > 0.009);
    }
  }

  async allocatePayment(dto: AllocatePaymentDto, auth: AuthContext): Promise<{ success: boolean; totalAllocated: number; count: number }> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);
    const userId = Number(auth.userId || 0) || null;

    const { totalAllocating, allocations } = validatePaymentAllocationRequest(dto);

    return await this.db.transaction().execute(async (trx) => {
      // 1. If paymentId is specified, verify available unallocated amount
      if (dto.paymentId) {
        if (dto.paymentType === 'customer_payment') {
          const payment = await trx
            .selectFrom('customer_payments')
            .select(['id', 'amount', 'customer_id'])
            .where('id', '=', dto.paymentId)
            .where('tenant_id', '=', scope.tenantId)
            .forUpdate()
            .executeTakeFirst();

          if (!payment) throw new NotFoundException('سند التحصيل غير موجود');
          if (Number(payment.customer_id) !== dto.partnerId) throw new BadRequestException('Payment voucher customer mismatch');

          const existingAlloc = await trx
            .selectFrom('payment_allocations')
            .select(sql<string>`COALESCE(SUM(allocated_amount), 0)`.as('allocated'))
            .where('payment_id', '=', dto.paymentId)
            .where('payment_type', '=', 'customer_payment')
            .where('tenant_id', '=', scope.tenantId)
            .executeTakeFirst();

          const unallocated = Number(payment.amount) - Number(existingAlloc?.allocated || 0);
          if (totalAllocating > Number(unallocated.toFixed(2))) {
            throw new BadRequestException(
              `المبلغ المطلوب تخصيصه (${totalAllocating}) يتجاوز الرصيد المتبقي غير المخصص من السند (${unallocated.toFixed(2)})`
            );
          }
        } else if (dto.paymentType === 'supplier_payment') {
          const payment = await trx
            .selectFrom('supplier_payments')
            .select(['id', 'amount', 'supplier_id'])
            .where('id', '=', dto.paymentId)
            .where('tenant_id', '=', scope.tenantId)
            .forUpdate()
            .executeTakeFirst();

          if (!payment) throw new NotFoundException('سند السداد غير موجود');
          if (Number(payment.supplier_id) !== dto.partnerId) throw new BadRequestException('Payment voucher supplier mismatch');

          const existingAlloc = await trx
            .selectFrom('payment_allocations')
            .select(sql<string>`COALESCE(SUM(allocated_amount), 0)`.as('allocated'))
            .where('payment_id', '=', dto.paymentId)
            .where('payment_type', '=', 'supplier_payment')
            .where('tenant_id', '=', scope.tenantId)
            .executeTakeFirst();

          const unallocated = Number(payment.amount) - Number(existingAlloc?.allocated || 0);
          if (totalAllocating > Number(unallocated.toFixed(2))) {
            throw new BadRequestException(
              `المبلغ المطلوب تخصيصه (${totalAllocating}) يتجاوز الرصيد المتبقي غير المخصص من السند (${unallocated.toFixed(2)})`
            );
          }
        }
      }

      // 2. Validate and apply allocations to each invoice
      const invoiceType = dto.partnerType === 'customer' ? 'sale' : 'purchase';

      for (const item of allocations) {
        const allocAmount = item.amount;

        if (invoiceType === 'sale') {
          const sale = await trx
            .selectFrom('sales')
            .select(['id', 'total', 'paid_amount', 'customer_id', 'status'])
            .where('id', '=', item.invoiceId)
            .where('tenant_id', '=', scope.tenantId)
            .forUpdate()
            .executeTakeFirst();

          if (!sale) throw new NotFoundException(`فاتورة المبيعات ${item.invoiceId} غير موجودة`);
          if (Number(sale.customer_id) !== dto.partnerId || sale.status === 'cancelled') throw new BadRequestException('Invoice does not belong to customer or is cancelled');

          const currentPaid = Number(sale.paid_amount || 0);
          const total = Number(sale.total || 0);
          const remaining = total - currentPaid;

          if (allocAmount > Number(remaining.toFixed(2))) {
            throw new BadRequestException(
              `المبلغ المخصص (${allocAmount}) أكبر من الرصيد المتبقي على الفاتورة (${remaining.toFixed(2)})`
            );
          }

          const newPaid = Number((currentPaid + allocAmount).toFixed(2));
          await trx
            .updateTable('sales')
            .set({ paid_amount: newPaid, updated_at: sql`NOW()` } as any)
            .where('id', '=', item.invoiceId)
            .where('tenant_id', '=', scope.tenantId)
            .execute();
        } else {
          const purchase = await trx
            .selectFrom('purchases')
            .select(['id', 'total', 'paid_amount', 'supplier_id', 'status'])
            .where('id', '=', item.invoiceId)
            .where('tenant_id', '=', scope.tenantId)
            .forUpdate()
            .executeTakeFirst();

          if (!purchase) throw new NotFoundException(`فاتورة المشتريات ${item.invoiceId} غير موجودة`);
          if (Number(purchase.supplier_id) !== dto.partnerId || purchase.status === 'cancelled') throw new BadRequestException('Invoice does not belong to supplier or is cancelled');

          const currentPaid = Number(purchase.paid_amount || 0);
          const total = Number(purchase.total || 0);
          const remaining = total - currentPaid;

          if (allocAmount > Number(remaining.toFixed(2))) {
            throw new BadRequestException(
              `المبلغ المخصص (${allocAmount}) أكبر من الرصيد المتبقي على فاتورة الشراء (${remaining.toFixed(2)})`
            );
          }

          const newPaid = Number((currentPaid + allocAmount).toFixed(2));
          await trx
            .updateTable('purchases')
            .set({ paid_amount: newPaid, updated_at: sql`NOW()` } as any)
            .where('id', '=', item.invoiceId)
            .where('tenant_id', '=', scope.tenantId)
            .execute();
        }

        // Insert allocation record
        await trx
          .insertInto('payment_allocations')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            partner_type: dto.partnerType,
            partner_id: dto.partnerId,
            payment_type: dto.paymentType,
            payment_id: dto.paymentId || null,
            invoice_type: invoiceType,
            invoice_id: item.invoiceId,
            allocated_amount: allocAmount,
            allocation_date: sql`CURRENT_DATE`,
            notes: dto.notes || '',
            created_by: userId,
          } as any)
          .execute();
      }

      return {
        success: true,
        totalAllocated: totalAllocating,
        count: allocations.length,
      };
    });
  }

  async getInvoiceAllocations(invoiceType: 'sale' | 'purchase', invoiceId: number, auth: AuthContext): Promise<any[]> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);

    const rows = await this.db
      .selectFrom('payment_allocations')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('invoice_type', '=', invoiceType)
      .where('invoice_id', '=', invoiceId)
      .orderBy('id', 'desc')
      .execute();

    return rows.map((r) => ({
      id: Number(r.id),
      paymentType: r.payment_type,
      paymentId: r.payment_id ? Number(r.payment_id) : null,
      allocatedAmount: Number(r.allocated_amount),
      allocationDate: r.allocation_date,
      notes: r.notes || '',
      createdAt: r.created_at,
    }));
  }

  async autoAllocateFIFO(
    partnerType: 'customer' | 'supplier',
    partnerId: number,
    paymentId: number,
    auth: AuthContext
  ): Promise<{ success: boolean; totalAllocated: number; count: number }> {
    this.assertAccountingAccess(auth);

    // Get unallocated amount for this payment
    const unallocatedPayments = await this.getUnallocatedPayments(partnerType, partnerId, auth);
    const targetPayment = unallocatedPayments.find((p) => p.id === paymentId);

    if (!targetPayment || targetPayment.unallocatedAmount <= 0) {
      throw new BadRequestException('لا يوجد رصيد غير مخصص متاح في هذا السند');
    }

    let remainingPayment = targetPayment.unallocatedAmount;
    const openInvoices = await this.getOpenInvoices(partnerType, partnerId, auth);

    if (!openInvoices.length) {
      throw new BadRequestException('لا توجد فواتير مفتوحة أو غير مدفوعة لهذا الشريك');
    }

    const allocations: AllocateItemInput[] = [];

    for (const inv of openInvoices) {
      if (remainingPayment <= 0.009) break;

      const toAlloc = Math.min(remainingPayment, inv.remainingAmount);
      allocations.push({
        invoiceId: inv.id,
        amount: Number(toAlloc.toFixed(2)),
      });
      remainingPayment = Number((remainingPayment - toAlloc).toFixed(2));
    }

    return await this.allocatePayment(
      {
        partnerType,
        partnerId,
        paymentType: partnerType === 'customer' ? 'customer_payment' : 'supplier_payment',
        paymentId,
        allocations,
        notes: 'تسوية آلية وفق أسبقية الاستحقاق (FIFO)',
      },
      auth
    );
  }
}
