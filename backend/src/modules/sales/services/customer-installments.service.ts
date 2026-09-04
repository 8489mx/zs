import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { TransactionHelper } from '../../../database/helpers/transaction.helper';
import {
  CreateInstallmentPlanDto,
  PayInstallmentDto,
  ListInstallmentsQueryDto,
} from '../dto/customer-installment.dto';

@Injectable()
export class CustomerInstallmentsService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly tx: TransactionHelper,
  ) {}

  private tenantScope(auth: AuthContext) {
    return requireTenantScope(auth);
  }

  private tenantPredicate(auth: AuthContext, tableAlias?: string) {
    const scope = this.tenantScope(auth);
    return tableAlias
      ? sql<boolean>`${sql.ref(`${tableAlias}.tenant_id`)} = ${scope.tenantId}`
      : sql<boolean>`tenant_id = ${scope.tenantId}`;
  }

  private roundCurrency(value: number): number {
    return Number((Number(value) || 0).toFixed(2));
  }

  async createPlan(dto: CreateInstallmentPlanDto, auth: AuthContext) {
    const scope = this.tenantScope(auth);

    // 1. Verify customer exists
    const customer = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'balance'])
      .where('id', '=', Number(dto.customerId))
      .where(this.tenantPredicate(auth))
      .executeTakeFirst();

    if (!customer) {
      throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    }

    const totalAmount = this.roundCurrency(dto.totalAmount);
    if (totalAmount <= 0) {
      throw new AppError('Total amount must be greater than 0', 'INVALID_AMOUNT', 400);
    }

    const downPayment = this.roundCurrency(dto.downPayment || 0);
    const financedAmount = this.roundCurrency(totalAmount - downPayment);
    if (financedAmount <= 0) {
      throw new AppError('Financed amount must be greater than 0', 'INVALID_FINANCED_AMOUNT', 400);
    }

    const interestRatePercent = Number(dto.interestRatePercent || 0);
    const interestAmount = this.roundCurrency((financedAmount * interestRatePercent) / 100);
    const totalWithInterest = this.roundCurrency(financedAmount + interestAmount);
    const installmentCount = Math.max(1, Math.floor(Number(dto.installmentCount) || 1));
    const monthlyAmount = this.roundCurrency(totalWithInterest / installmentCount);

    const planNumber = `INST-${Date.now().toString().slice(-6)}`;
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();

    return await this.tx.runInTransaction(this.db, async (trx: Kysely<Database>) => {
      // Create plan
      const plan = await trx
        .insertInto('customer_installment_plans')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          plan_number: planNumber,
          sale_id: dto.saleId ? Number(dto.saleId) : null,
          customer_id: Number(dto.customerId),
          total_amount: totalAmount,
          down_payment: downPayment,
          financed_amount: financedAmount,
          interest_rate_percent: interestRatePercent,
          interest_amount: interestAmount,
          total_with_interest: totalWithInterest,
          installment_count: installmentCount,
          monthly_amount: monthlyAmount,
          start_date: startDate,
          status: 'active',
          notes: dto.notes || '',
          branch_id: dto.branchId ? Number(dto.branchId) : null,
          created_by: auth.userId || null,
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Generate installments schedule
      const installmentsToInsert = [];
      let accumulated = 0;

      for (let i = 1; i <= installmentCount; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        // Adjust last installment for rounding
        let currentAmount = monthlyAmount;
        if (i === installmentCount) {
          currentAmount = this.roundCurrency(totalWithInterest - accumulated);
        } else {
          accumulated = this.roundCurrency(accumulated + currentAmount);
        }

        installmentsToInsert.push({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          plan_id: Number(plan.id),
          sale_id: dto.saleId ? Number(dto.saleId) : null,
          customer_id: Number(dto.customerId),
          installment_number: i,
          due_date: dueDate,
          amount: currentAmount,
          paid_amount: 0,
          status: 'pending',
          payment_method: 'cash',
          notes: '',
        });
      }

      await trx
        .insertInto('customer_installments')
        .values(installmentsToInsert as any)
        .execute();

      // If there is a down payment, record in customer payments / ledger
      if (downPayment > 0) {
        await trx
          .insertInto('customer_payments')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            customer_id: Number(dto.customerId),
            amount: downPayment,
            note: `دفعة مقدمة لخطة تقسيط #${planNumber}`,
            branch_id: dto.branchId ? Number(dto.branchId) : null,
            created_by: auth.userId || null,
          } as any)
          .execute();
      }

      // Return plan with generated installments
      const installments = await trx
        .selectFrom('customer_installments')
        .selectAll()
        .where('plan_id', '=', Number(plan.id))
        .where(this.tenantPredicate(auth))
        .orderBy('installment_number', 'asc')
        .execute();

      return {
        plan,
        installments,
        customer,
      };
    });
  }

  async listPlans(query: { customerId?: number; status?: string; search?: string }, auth: AuthContext) {
    let q = this.db
      .selectFrom('customer_installment_plans as p')
      .innerJoin('customers as c', 'c.id', 'p.customer_id')
      .leftJoin('sales as s', 's.id', 'p.sale_id')
      .select([
        'p.id',
        'p.plan_number',
        'p.sale_id',
        'p.customer_id',
        'c.name as customer_name',
        'c.phone as customer_phone',
        's.doc_no as sale_doc_no',
        'p.total_amount',
        'p.down_payment',
        'p.financed_amount',
        'p.interest_rate_percent',
        'p.interest_amount',
        'p.total_with_interest',
        'p.installment_count',
        'p.monthly_amount',
        'p.start_date',
        'p.status',
        'p.notes',
        'p.created_at',
      ])
      .where(this.tenantPredicate(auth, 'p'));

    if (query.customerId) {
      q = q.where('p.customer_id', '=', Number(query.customerId));
    }

    if (query.status && query.status !== 'all') {
      q = q.where('p.status', '=', query.status);
    }

    if (query.search) {
      const term = `%${query.search.trim()}%`;
      q = q.where((eb) =>
        eb.or([
          sql<boolean>`p.plan_number ILIKE ${term}`,
          sql<boolean>`c.name ILIKE ${term}`,
          sql<boolean>`c.phone ILIKE ${term}`,
        ]),
      );
    }

    const plans = await q.orderBy('p.id', 'desc').execute();

    // Get aggregated payments per plan
    const planIds = plans.map((p) => Number(p.id));
    let progressMap = new Map<number, { paid_amount: number; paid_count: number }>();

    if (planIds.length > 0) {
      const stats = await this.db
        .selectFrom('customer_installments')
        .select([
          'plan_id',
          sql<number>`COALESCE(SUM(paid_amount), 0)`.as('total_paid'),
          sql<number>`COALESCE(COUNT(CASE WHEN status = 'paid' THEN 1 END), 0)`.as('paid_count'),
        ])
        .where('plan_id', 'in', planIds)
        .where(this.tenantPredicate(auth))
        .groupBy('plan_id')
        .execute();

      stats.forEach((row) => {
        progressMap.set(Number(row.plan_id), {
          paid_amount: Number(row.total_paid || 0),
          paid_count: Number(row.paid_count || 0),
        });
      });
    }

    const formattedPlans = plans.map((p) => {
      const prog = progressMap.get(Number(p.id)) || { paid_amount: 0, paid_count: 0 };
      const totalWithInterest = Number(p.total_with_interest || 0);
      const remainingAmount = Math.max(0, this.roundCurrency(totalWithInterest - prog.paid_amount));
      const progressPercent = totalWithInterest > 0
        ? Math.min(100, Math.round((prog.paid_amount / totalWithInterest) * 100))
        : 0;

      return {
        ...p,
        paid_amount: prog.paid_amount,
        paid_count: prog.paid_count,
        remaining_amount: remainingAmount,
        progress_percent: progressPercent,
      };
    });

    return { plans: formattedPlans };
  }

  async getPlanDetails(planId: number, auth: AuthContext) {
    const plan = await this.db
      .selectFrom('customer_installment_plans as p')
      .innerJoin('customers as c', 'c.id', 'p.customer_id')
      .leftJoin('sales as s', 's.id', 'p.sale_id')
      .select([
        'p.id',
        'p.plan_number',
        'p.sale_id',
        'p.customer_id',
        'c.name as customer_name',
        'c.phone as customer_phone',
        'c.balance as customer_balance',
        's.doc_no as sale_doc_no',
        'p.total_amount',
        'p.down_payment',
        'p.financed_amount',
        'p.interest_rate_percent',
        'p.interest_amount',
        'p.total_with_interest',
        'p.installment_count',
        'p.monthly_amount',
        'p.start_date',
        'p.status',
        'p.notes',
        'p.created_at',
      ])
      .where('p.id', '=', Number(planId))
      .where(this.tenantPredicate(auth, 'p'))
      .executeTakeFirst();

    if (!plan) {
      throw new AppError('Installment plan not found', 'PLAN_NOT_FOUND', 404);
    }

    const installments = await this.db
      .selectFrom('customer_installments')
      .selectAll()
      .where('plan_id', '=', Number(planId))
      .where(this.tenantPredicate(auth))
      .orderBy('installment_number', 'asc')
      .execute();

    // Mark virtual overdue
    const todayStr = new Date().toISOString().split('T')[0];
    const installmentsWithStatus = installments.map((inst) => {
      const dueDateStr = new Date(inst.due_date).toISOString().split('T')[0];
      let displayStatus = inst.status;
      if (inst.status === 'pending' && dueDateStr < todayStr) {
        displayStatus = 'overdue';
      }
      return {
        ...inst,
        display_status: displayStatus,
      };
    });

    const totalPaid = installments.reduce((acc, cur) => acc + Number(cur.paid_amount || 0), 0);
    const totalWithInterest = Number(plan.total_with_interest || 0);

    return {
      plan: {
        ...plan,
        paid_amount: this.roundCurrency(totalPaid),
        remaining_amount: Math.max(0, this.roundCurrency(totalWithInterest - totalPaid)),
        progress_percent: totalWithInterest > 0
          ? Math.min(100, Math.round((totalPaid / totalWithInterest) * 100))
          : 0,
      },
      installments: installmentsWithStatus,
    };
  }

  async listInstallments(query: ListInstallmentsQueryDto, auth: AuthContext) {
    let q = this.db
      .selectFrom('customer_installments as i')
      .innerJoin('customer_installment_plans as p', 'p.id', 'i.plan_id')
      .innerJoin('customers as c', 'c.id', 'i.customer_id')
      .select([
        'i.id',
        'i.plan_id',
        'p.plan_number',
        'i.customer_id',
        'c.name as customer_name',
        'c.phone as customer_phone',
        'i.installment_number',
        'p.installment_count',
        'i.due_date',
        'i.amount',
        'i.paid_amount',
        'i.status',
        'i.paid_at',
        'i.payment_method',
        'i.receipt_no',
        'i.notes',
      ])
      .where(this.tenantPredicate(auth, 'i'));

    if (query.planId) {
      q = q.where('i.plan_id', '=', Number(query.planId));
    }

    if (query.customerId) {
      q = q.where('i.customer_id', '=', Number(query.customerId));
    }

    if (query.dueFrom) {
      q = q.where('i.due_date', '>=', new Date(query.dueFrom));
    }

    if (query.dueTo) {
      q = q.where('i.due_date', '<=', new Date(query.dueTo));
    }

    if (query.search) {
      const term = `%${query.search.trim()}%`;
      q = q.where((eb) =>
        eb.or([
          sql<boolean>`p.plan_number ILIKE ${term}`,
          sql<boolean>`c.name ILIKE ${term}`,
          sql<boolean>`c.phone ILIKE ${term}`,
        ]),
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (query.status === 'overdue') {
      q = q.where('i.status', '=', 'pending').where('i.due_date', '<', new Date(todayStr));
    } else if (query.status === 'due_now') {
      q = q.where('i.status', '=', 'pending').where('i.due_date', '<=', new Date(todayStr));
    } else if (query.status && query.status !== 'all') {
      q = q.where('i.status', '=', query.status);
    }

    const rows = await q.orderBy('i.due_date', 'asc').limit(Number(query.pageSize) || 100).execute();

    const installments = rows.map((r) => {
      const dueDateStr = new Date(r.due_date).toISOString().split('T')[0];
      let displayStatus = r.status;
      if (r.status === 'pending' && dueDateStr < todayStr) {
        displayStatus = 'overdue';
      }
      return {
        ...r,
        display_status: displayStatus,
        remaining_installment: Math.max(0, this.roundCurrency(Number(r.amount) - Number(r.paid_amount || 0))),
      };
    });

    return { installments };
  }

  async payInstallment(installmentId: number, dto: PayInstallmentDto, auth: AuthContext) {
    const scope = this.tenantScope(auth);
    const payAmount = this.roundCurrency(dto.amount);
    if (payAmount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 'INVALID_AMOUNT', 400);
    }

    return await this.tx.runInTransaction(this.db, async (trx: Kysely<Database>) => {
      const installment = await trx
        .selectFrom('customer_installments')
        .selectAll()
        .where('id', '=', Number(installmentId))
        .where(this.tenantPredicate(auth))
        .executeTakeFirst();

      if (!installment) {
        throw new AppError('Installment not found', 'INSTALLMENT_NOT_FOUND', 404);
      }

      if (installment.status === 'paid') {
        throw new AppError('Installment is already fully paid', 'ALREADY_PAID', 400);
      }

      const currentPaid = Number(installment.paid_amount || 0);
      const totalRequired = Number(installment.amount || 0);
      const remainingOnInstallment = this.roundCurrency(totalRequired - currentPaid);

      if (payAmount > remainingOnInstallment) {
        throw new AppError(
          `المبلغ المدخل (${payAmount}) يتجاوز المتبقي من هذا القسط (${remainingOnInstallment})`,
          'AMOUNT_EXCEEDS_REMAINING',
          400,
        );
      }

      const newPaidAmount = this.roundCurrency(currentPaid + payAmount);
      const newStatus = newPaidAmount >= totalRequired ? 'paid' : 'partially_paid';
      const receiptNo = dto.receiptNo || `REC-${Date.now().toString().slice(-6)}`;
      const paymentMethod = dto.paymentMethod || 'cash';

      // Update installment
      const updatedInstallment = await trx
        .updateTable('customer_installments')
        .set({
          paid_amount: newPaidAmount,
          status: newStatus,
          paid_at: new Date(),
          payment_method: paymentMethod,
          receipt_no: receiptNo,
          notes: dto.notes || installment.notes,
          updated_at: new Date(),
        } as any)
        .where('id', '=', Number(installmentId))
        .returningAll()
        .executeTakeFirstOrThrow();

      // Record in customer_payments
      await trx
        .insertInto('customer_payments')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          customer_id: Number(installment.customer_id),
          amount: payAmount,
          note: `سداد قسط رقم ${installment.installment_number} (إيصال #${receiptNo})`,
          branch_id: null,
          created_by: auth.userId || null,
        } as any)
        .execute();

      // Check if all installments for this plan are completed
      const remainingUnpaid = await trx
        .selectFrom('customer_installments')
        .select([sql<number>`COALESCE(COUNT(*), 0)`.as('count')])
        .where('plan_id', '=', Number(installment.plan_id))
        .where('status', '!=', 'paid')
        .where(this.tenantPredicate(auth))
        .executeTakeFirst();

      if (Number(remainingUnpaid?.count || 0) === 0) {
        await trx
          .updateTable('customer_installment_plans')
          .set({ status: 'completed', updated_at: new Date() })
          .where('id', '=', Number(installment.plan_id))
          .where(this.tenantPredicate(auth))
          .execute();
      }

      // Customer info
      const customer = await trx
        .selectFrom('customers')
        .select(['id', 'name', 'phone'])
        .where('id', '=', Number(installment.customer_id))
        .executeTakeFirst();

      return {
        success: true,
        installment: updatedInstallment,
        receipt: {
          receipt_no: receiptNo,
          paid_amount: payAmount,
          installment_number: installment.installment_number,
          paid_at: new Date(),
          payment_method: paymentMethod,
          customer_name: customer?.name || '',
          customer_phone: customer?.phone || '',
        },
      };
    });
  }

  async getSummaryMetrics(auth: AuthContext) {
    const todayStr = new Date().toISOString().split('T')[0];

    const [plansSummary, installmentsSummary, overdueSummary] = await Promise.all([
      this.db
        .selectFrom('customer_installment_plans')
        .select([
          sql<number>`COALESCE(COUNT(*), 0)`.as('total_plans'),
          sql<number>`COALESCE(COUNT(CASE WHEN status = 'active' THEN 1 END), 0)`.as('active_plans'),
          sql<number>`COALESCE(SUM(CASE WHEN status = 'active' THEN total_with_interest ELSE 0 END), 0)`.as('active_total_amount'),
        ])
        .where(this.tenantPredicate(auth))
        .executeTakeFirst(),

      this.db
        .selectFrom('customer_installments')
        .select([
          sql<number>`COALESCE(SUM(paid_amount), 0)`.as('total_collected'),
          sql<number>`COALESCE(COUNT(CASE WHEN status != 'paid' THEN 1 END), 0)`.as('unpaid_installments_count'),
          sql<number>`COALESCE(SUM(CASE WHEN status != 'paid' THEN (amount - paid_amount) ELSE 0 END), 0)`.as('unpaid_installments_amount'),
        ])
        .where(this.tenantPredicate(auth))
        .executeTakeFirst(),

      this.db
        .selectFrom('customer_installments')
        .select([
          sql<number>`COALESCE(COUNT(*), 0)`.as('overdue_count'),
          sql<number>`COALESCE(SUM(amount - paid_amount), 0)`.as('overdue_amount'),
        ])
        .where(this.tenantPredicate(auth))
        .where('status', '!=', 'paid')
        .where('due_date', '<', new Date(todayStr))
        .executeTakeFirst(),
    ]);

    return {
      active_plans: Number(plansSummary?.active_plans || 0),
      total_plans: Number(plansSummary?.total_plans || 0),
      active_total_amount: this.roundCurrency(Number(plansSummary?.active_total_amount || 0)),
      total_collected: this.roundCurrency(Number(installmentsSummary?.total_collected || 0)),
      unpaid_amount: this.roundCurrency(Number(installmentsSummary?.unpaid_installments_amount || 0)),
      overdue_count: Number(overdueSummary?.overdue_count || 0),
      overdue_amount: this.roundCurrency(Number(overdueSummary?.overdue_amount || 0)),
    };
  }
}
