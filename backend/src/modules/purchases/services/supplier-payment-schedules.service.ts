import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import { CreateSupplierPaymentScheduleDto, PaySupplierScheduleInstallmentDto } from '../dto/supplier-payment-schedule.dto';
import { normalizeOptionalNote, normalizePurchaseScope } from '../helpers/purchases-write.helper';
import { PurchasesFinanceService } from './purchases-finance.service';
import { AccountingPostingService } from '../../accounting/accounting-posting.service';

type ScheduleRow = {
  id: number;
  purchase_id: number | null;
  supplier_id: number;
  installment_no: number;
  due_date: string | Date;
  amount: number;
  paid_amount: number;
  status: string;
  note: string;
  paid_at: Date | null;
};

type SchedulePaymentLogRow = {
  id: number;
  schedule_id: number;
  supplier_id: number;
  amount: number;
  note: string;
  created_by: number | null;
  created_by_name: string;
  created_at: string | Date;
};

type OpenCashierShiftRow = {
  id: number;
  branch_id: number | null;
  location_id: number | null;
};

@Injectable()
export class SupplierPaymentSchedulesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
    private readonly financeService: PurchasesFinanceService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  private scheduleDb(db: Kysely<Database>): Kysely<any> {
    return db as unknown as Kysely<any>;
  }

  private tenantScope(auth: AuthContext) {
    return requireTenantScope(auth);
  }

  private tenantPredicate(auth: AuthContext, alias?: string) {
    const scope = this.tenantScope(auth);
    return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${scope.tenantId}` : sql<boolean>`tenant_id = ${scope.tenantId}`;
  }

  private tenantFields(auth: AuthContext) {
    const scope = this.tenantScope(auth);
    return { tenant_id: scope.tenantId, account_id: scope.accountId };
  }

  private ensureCredit(paymentType: unknown): void {
    if (String(paymentType || '') !== 'credit') throw new AppError('Schedule is only available for credit purchases', 'PURCHASE_SCHEDULE_CREDIT_ONLY', 400);
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
    if (!(safeTotal > 0)) throw new AppError('Schedule total must be greater than zero', 'INVALID_SCHEDULE_TOTAL', 400);
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

  private mapPaymentLog(row: SchedulePaymentLogRow): Record<string, unknown> {
    return {
      id: String(row.id),
      scheduleId: String(row.schedule_id),
      supplierId: String(row.supplier_id),
      amount: Number(row.amount || 0),
      note: row.note || '',
      createdBy: row.created_by == null ? '' : String(row.created_by),
      createdByName: row.created_by_name || '',
      createdAt: row.created_at,
    };
  }

  private map(row: ScheduleRow, paymentLogs: SchedulePaymentLogRow[] = []): Record<string, unknown> {
    const amount = Number(row.amount || 0);
    const paidAmount = Number(row.paid_amount || 0);
    const dueDate = String(row.due_date || '').slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const baseStatus = String(row.status || 'pending');
    const status = baseStatus === 'pending' && dueDate < today ? 'overdue' : baseStatus;
    return {
      id: String(row.id),
      purchaseId: row.purchase_id == null ? '' : String(row.purchase_id),
      supplierId: String(row.supplier_id),
      installmentNo: Number(row.installment_no || 0),
      dueDate,
      amount,
      paidAmount,
      remainingAmount: this.roundCurrency(amount - paidAmount),
      status,
      note: row.note || '',
      paidAt: row.paid_at,
      payments: paymentLogs.map((log) => this.mapPaymentLog(log)),
    };
  }

  private async listWithPayments(where: { purchaseId?: number; supplierId?: number }, auth: AuthContext): Promise<Record<string, unknown>> {
    const db = this.scheduleDb(this.db);
    let query = db.selectFrom('supplier_payment_schedules').selectAll().where(this.tenantPredicate(auth));
    if (where.purchaseId != null) query = query.where('purchase_id', '=', where.purchaseId);
    if (where.supplierId != null) query = query.where('supplier_id', '=', where.supplierId).where('purchase_id', 'is', null);
    const rows = await query.orderBy('installment_no', 'asc').execute() as ScheduleRow[];
    const ids = rows.map((row) => Number(row.id)).filter(Boolean);
    const logs = ids.length
      ? await db.selectFrom('supplier_payment_schedule_logs').selectAll().where('schedule_id', 'in', ids).where(this.tenantPredicate(auth)).orderBy('created_at', 'asc').execute() as SchedulePaymentLogRow[]
      : [] as SchedulePaymentLogRow[];
    const logsBySchedule = new Map<number, SchedulePaymentLogRow[]>();
    logs.forEach((log) => {
      const scheduleId = Number(log.schedule_id);
      logsBySchedule.set(scheduleId, [...(logsBySchedule.get(scheduleId) || []), log]);
    });
    return { schedules: rows.map((row) => this.map(row, logsBySchedule.get(Number(row.id)) || [])) };
  }

  async listForPurchase(purchaseId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.listWithPayments({ purchaseId }, auth);
  }

  async listForSupplier(supplierId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.listWithPayments({ supplierId }, auth);
  }

  async createForPurchase(purchaseId: number, payload: CreateSupplierPaymentScheduleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', purchaseId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
      if (purchase.status === 'cancelled') throw new AppError('Cancelled purchase cannot be scheduled', 'PURCHASE_CANCELLED', 400);
      this.ensureCredit(purchase.payment_type);
      if (!purchase.supplier_id) throw new AppError('Supplier is required', 'SUPPLIER_REQUIRED', 400);
      const db = this.scheduleDb(trx);
      const paidRow = await db.selectFrom('supplier_payment_schedules').select('id').where('purchase_id', '=', purchaseId).where('paid_amount', '>', 0).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (paidRow) throw new AppError('Cannot reschedule after payments were recorded', 'PURCHASE_SCHEDULE_HAS_PAYMENTS', 400);
      const amounts = this.buildAmounts(Number(purchase.total || 0), payload);
      const firstDueDate = this.parseDate(payload.firstDueDate);
      const intervalDays = Number(payload.intervalDays || 1);
      await db.deleteFrom('supplier_payment_schedules').where('purchase_id', '=', purchaseId).where(this.tenantPredicate(auth)).execute();
      for (let index = 0; index < amounts.length; index += 1) {
        await db.insertInto('supplier_payment_schedules').values({ purchase_id: purchaseId, supplier_id: Number(purchase.supplier_id), installment_no: index + 1, due_date: this.addDays(firstDueDate, index * intervalDays), amount: amounts[index], paid_amount: 0, status: 'pending', note: normalizeOptionalNote(payload.note), created_by: auth.userId, updated_by: auth.userId, ...this.tenantFields(auth) }).execute();
      }
    });
    return this.listForPurchase(purchaseId, auth);
  }

  async createForSupplier(supplierId: number, payload: CreateSupplierPaymentScheduleDto, auth: AuthContext): Promise<Record<string, unknown>> {
    await this.tx.runInTransaction(this.db, async (trx) => {
      const supplier = await trx.selectFrom('suppliers').select(['id', 'balance']).where('id', '=', supplierId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      const db = this.scheduleDb(trx);
      
      const existingRows = await db.selectFrom('supplier_payment_schedules').select(['amount', 'paid_amount']).where('supplier_id', '=', supplierId).where('purchase_id', 'is', null).where('status', '!=', 'cancelled').where(this.tenantPredicate(auth)).execute();
      const existingUnpaid = existingRows.reduce((sum, r) => sum + (Number(r.amount) - Number(r.paid_amount)), 0);
      
      const balance = this.roundCurrency(Number(supplier.balance || 0));
      const availableToSchedule = this.roundCurrency(balance - existingUnpaid);
      
      const total = this.roundCurrency(Number(payload.scheduleAmount || availableToSchedule));
      if (!(balance > 0)) throw new AppError('Supplier has no payable balance', 'SUPPLIER_NO_PAYABLE_BALANCE', 400);
      if (!(availableToSchedule > 0)) throw new AppError('No unscheduled balance available to schedule', 'SUPPLIER_NO_UNSCHEDULED_BALANCE', 400);
      if (!(total > 0) || total > availableToSchedule + 0.0001) throw new AppError('Schedule amount must be within unscheduled supplier balance', 'INVALID_SUPPLIER_SCHEDULE_AMOUNT', 400);
      
      const lastRow = await db.selectFrom('supplier_payment_schedules').select('installment_no').where('supplier_id', '=', supplierId).where('purchase_id', 'is', null).where(this.tenantPredicate(auth)).orderBy('installment_no', 'desc').executeTakeFirst();
      const startInstallmentNo = lastRow ? Number(lastRow.installment_no) : 0;
      
      const amounts = this.buildAmounts(total, payload);
      const firstDueDate = this.parseDate(payload.firstDueDate);
      const intervalDays = Number(payload.intervalDays || 1);
      
      for (let index = 0; index < amounts.length; index += 1) {
        await db.insertInto('supplier_payment_schedules').values({ purchase_id: null, supplier_id: supplierId, installment_no: startInstallmentNo + index + 1, due_date: this.addDays(firstDueDate, index * intervalDays), amount: amounts[index], paid_amount: 0, status: 'pending', note: normalizeOptionalNote(payload.note), created_by: auth.userId, updated_by: auth.userId, ...this.tenantFields(auth) }).execute();
      }
    });
    return this.listForSupplier(supplierId, auth);
  }

  async payInstallment(installmentId: number, payload: PaySupplierScheduleInstallmentDto, auth: AuthContext): Promise<Record<string, unknown>> {
    let purchaseId = 0;
    let supplierId = 0;
    await this.tx.runInTransaction(this.db, async (trx) => {
      const db = this.scheduleDb(trx);
      const installment = await db.selectFrom('supplier_payment_schedules').selectAll().where('id', '=', installmentId).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!installment) throw new AppError('Installment not found', 'INSTALLMENT_NOT_FOUND', 404);
      if (installment.purchase_id) {
        const purchase = await trx.selectFrom('purchases').selectAll().where('id', '=', Number(installment.purchase_id)).where(this.tenantPredicate(auth)).executeTakeFirst();
        if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
        this.ensureCredit(purchase.payment_type);
        purchaseId = Number(installment.purchase_id);
      }
      const supplier = await trx.selectFrom('suppliers').select(['id', 'name']).where('id', '=', Number(installment.supplier_id)).where(this.tenantPredicate(auth)).executeTakeFirst();
      if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);
      supplierId = Number(supplier.id);
      const remaining = this.roundCurrency(Number(installment.amount || 0) - Number(installment.paid_amount || 0));
      const amount = this.roundCurrency(Number(payload.amount || remaining));
      if (!(amount > 0)) throw new AppError('Payment amount must be greater than zero', 'INVALID_AMOUNT', 400);
      if (amount > remaining + 0.0001) throw new AppError('Payment exceeds installment remaining amount', 'INSTALLMENT_OVERPAYMENT', 400);
      const paidAmount = this.roundCurrency(Number(installment.paid_amount || 0) + amount);
      const status = paidAmount >= Number(installment.amount || 0) - 0.0001 ? 'paid' : 'partial';
      const openShift = await db.selectFrom('cashier_shifts')
        .select(['id', 'branch_id', 'location_id'])
        .where('opened_by', '=', auth.userId)
        .where('status', '=', 'open')
        .where(this.tenantPredicate(auth))
        .orderBy('id', 'desc')
        .executeTakeFirst() as OpenCashierShiftRow | undefined;
      const scope = normalizePurchaseScope({ branchId: payload.branchId ?? openShift?.branch_id ?? undefined, locationId: payload.locationId ?? openShift?.location_id ?? undefined });
      const branchId = scope.branchId;
      const locationId = scope.locationId;
      const note = normalizeOptionalNote(payload.note) || `دفعة مجدولة للمورد ${supplier.name || supplierId} - دفعة ${installment.installment_no}`;
      const treasuryReferenceType = openShift?.id ? 'cashier_shift' : 'supplier_payment_schedule';
      const treasuryReferenceId = openShift?.id ? Number(openShift.id) : installmentId;
      await db.updateTable('supplier_payment_schedules').set({ paid_amount: paidAmount, status, paid_at: status === 'paid' ? sql`NOW()` : installment.paid_at, updated_by: auth.userId, updated_at: sql`NOW()` }).where('id', '=', installmentId).where(this.tenantPredicate(auth)).execute();
      const insertedLog = await db.insertInto('supplier_payment_schedule_logs').values({ schedule_id: installmentId, supplier_id: supplierId, amount, note, created_by: auth.userId, created_by_name: auth.username || '', ...this.tenantFields(auth) }).returning('id').executeTakeFirstOrThrow();
      await this.financeService.addSupplierLedgerEntry(trx, supplierId, -amount, 'supplier_payment_schedule', `دفعة مورد مجدولة - ${note}`, 'supplier_payment_schedule', installmentId, auth, branchId, locationId);
      await this.financeService.addTreasuryTransaction(trx, 'supplier_payment_schedule', -amount, `دفعة مورد مجدولة - ${note}${openShift?.id ? ` - مرتبطة بالوردية SHIFT-${openShift.id}` : ''}`, treasuryReferenceType, treasuryReferenceId, auth, branchId, locationId);
      await this.accountingPosting.postSupplierPaymentScheduleSettlement(trx, Number(insertedLog.id), auth);
    });
    return purchaseId ? this.listForPurchase(purchaseId, auth) : this.listForSupplier(supplierId, auth);
  }
}
