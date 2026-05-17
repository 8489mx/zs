import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { CreateSupplierPaymentScheduleDto, PaySupplierScheduleInstallmentDto } from '../dto/supplier-payment-schedule.dto';
import { normalizeOptionalNote, normalizePurchaseScope } from '../helpers/purchases-write.helper';
import { PurchasesFinanceService } from './purchases-finance.service';

type ScheduleRow = {
  id: number;
  purchase_id: number;
  supplier_id: number;
  installment_no: number;
  due_date: string | Date;
  amount: number;
  paid_amount: number;
  status: string;
  note: string;
  paid_at: Date | null;
};

@Injectable()
export class SupplierPaymentSchedulesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly financeService: PurchasesFinanceService,
  ) {}

  private scheduleDb(db: Kysely<Database>): Kysely<any> {
    return db as unknown as Kysely<any>;
  }

  private roundCurrency(value: number): number {
    return Number(Number(value || 0).toFixed(2));
  }

  private roundDownToStep(value: number, step: number): number {
    const safeStep = Number(step || 1) > 0 ? Number(step || 1) : 1;
    return this.roundCurrency(Math.floor(Number(value || 0) / safeStep) * safeStep);
  }

  private addDays(date: Date, days: number): string {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next.toISOString().slice(0, 10);
  }

  private parseDate(value: string): Date {
    const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new AppError('Invalid due date', 'INVALID_DUE_DATE', 400);
    return date;
  }

  private buildAmounts(total: number, payload: CreateSupplierPaymentScheduleDto): number[] {
    const safeTotal = this.roundCurrency(total);
    const step = Number(payload.roundingStep || 1);
    if (!(safeTotal > 0)) throw new AppError('Purchase total must be greater than zero', 'INVALID_PURCHASE_TOTAL', 400);
    if (payload.mode === 'count') {
      const count = Number(payload.installmentCount || 0);
      if (!(count > 0)) throw new AppError('Installment count is required', 'INSTALLMENT_COUNT_REQUIRED', 400);
      if (count === 1) return [safeTotal];
      const base = this.roundDownToStep(safeTotal / count, step);
      const safeBase = base > 0 ? base : this.roundCurrency(safeTotal / count);
      const amounts = Array.from({ length: count }, (_, index) => (index < count - 1 ? safeBase : 0));
      amounts[count - 1] = this.roundCurrency(safeTotal - amounts.slice(0, -1).reduce((sum, value) => sum + value, 0));
      return amounts;
    }
    const amount = this.roundDownToStep(Number(payload.installmentAmount || 0), step);
    if (!(amount > 0)) throw new AppError('Installment amount is required', 'INSTALLMENT_AMOUNT_REQUIRED', 400);
    const fullCount = Math.floor(safeTotal / amount);
    const amounts = Array.from({ length: fullCount }, () => amount);
    const remaining = this.roundCurrency(safeTotal - amounts.reduce((sum, value) => sum + value, 0));
    if (remaining > 0.0001) amounts.push(remaining);
    return amounts.length ? amounts : [safeTotal];
  }

  private map(row: ScheduleRow): Record<string, unknown> {
    const amount = Number(row.amount || 0);
    const paidAmount = Number(row.paid_amount || 0);
    const dueDate = String(row.due_date || '').slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const baseStatus = String(row.status || 'pending');
    const status = baseStatus === 'pending' && dueDate < today ? 'overdue' : baseStatus;
    return {
      id: String(row.id),
      purchaseId: String(row.purchase_id),
      supplierId: String(row.supplier_id),
      installmentNo: Number(row.installment_no || 0),
      dueDate,
      amount,
      paidAmount,
      remainingAmount: this.roundCurrency(amount - paidAmount),
      status,
      note: row.note || '',
      paidAt: row.paid_at,
    };
  }

  async listForPurchase(purchaseId: number): Promise<Record<string, unknown>> {
    const rows = await this.scheduleDb(this.db).selectFrom('supplier_payment_schedules').selectAll().where('purchase_id', '=', purchaseId).orderBy('installment_no asc').execute();
    return { schedules: rows.map((row) => this.map(row as ScheduleRow)) };
  }

  async createForPurchase(purchaseId: number, payload: CreateSupplierPaymentScheduleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Cancelled purchase cannot be scheduled', 'PURCHASE_CANCELLED', 400);
      if (!purchase.supplier_id) throw new AppError('Supplier is required', 'SUPPLIER_REQUIRED', 400);
      const amounts = this.buildAmounts(Number(purchase.total || 0), payload);
      const firstDueDate = this.parseDate(payload.firstDueDate);
      const intervalDays = Number(payload.intervalDays || 1);
      const db = this.scheduleDb(trx);
      await db.deleteFrom('supplier_payment_schedules').where('purchase_id', '=', purchaseId).execute();
      for (let index = 0; index < amounts.length; index += 1) {
        await db.insertInto('supplier_payment_schedules').values({
          purchase_id: purchaseId,
          supplier_id: Number(purchase.supplier_id),
          installment_no: index + 1,
          due_date: this.addDays(firstDueDate, index * intervalDays),
          amount: amounts[index],
          paid_amount: 0,
          status: 'pending',
          note: normalizeOptionalNote(payload.note),
          created_by: auth.userId,
          updated_by: auth.userId,
        }).execute();
      }
    });
    return this.listForPurchase(purchaseId);
  }

  async payInstallment(installmentId: number, payload: PaySupplierScheduleInstallmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    let purchaseId = 0;
    await this.tx.runInTransaction(this.db, async (trx) => {
      const db = this.scheduleDb(trx);
      const installment = await db.selectFrom('supplier_payment_schedules').selectAll().where('id', '=', installmentId).executeTakeFirst();
      if (!installment) throw new AppError('Installment not found', 'INSTALLMENT_NOT_FOUND', 404);
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', Number(installment.purchase_id)).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', Number(installment.supplier_id)).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      const remaining = this.roundCurrency(Number(installment.amount || 0) - Number(installment.paid_amount || 0));
      const amount = this.roundCurrency(Number(payload.amount || remaining));
      if (!(amount > 0)) throw new AppError('Payment amount must be greater than zero', 'INVALID_AMOUNT', 400);
      if (amount > remaining + 0.0001) throw new AppError('Payment exceeds installment remaining amount', 'INSTALLMENT_OVERPAYMENT', 400);
      const paidAmount = this.roundCurrency(Number(installment.paid_amount || 0) + amount);
      const status = paidAmount >= Number(installment.amount || 0) - 0.0001 ? 'paid' : 'partial';
      const { branchId, locationId } = normalizePurchaseScope({ branchId: payload.branchId ?? purchase.branch_id ?? undefined, locationId: payload.locationId ?? purchase.location_id ?? undefined });
      const note = normalizeOptionalNote(payload.note) || `دفعة ${installment.installment_no} لفاتورة ${purchase.doc_no || purchase.id}`;
      await db.updateTable('supplier_payment_schedules').set({ paid_amount: paidAmount, status, paid_at: status === 'paid' ? sql`NOW()` : installment.paid_at, updated_by: auth.userId, updated_at: sql`NOW()` }).where('id', '=', installmentId).execute();
      await this.financeService.addSupplierLedgerEntry(trx, Number(supplier.id), -amount, `دفع مجدول إلى ${supplier.name} - ${note}`, 'supplier_payment_schedule', installmentId, auth, branchId, locationId);
      await this.financeService.addTreasuryTransaction(trx, 'supplier_payment_schedule', -amount, `دفع مجدول إلى ${supplier.name} - ${note}`, 'supplier_payment_schedule', installmentId, auth, branchId, locationId);
      purchaseId = Number(installment.purchase_id);
    });
    return this.listForPurchase(purchaseId);
  }
}
