import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { CloseFiscalPeriodDto, ReopenFiscalPeriodDto, FiscalPeriodResponse } from '../dto/fiscal-period.dto';
import { buildMonthlyFiscalPeriods } from '../engines/fiscal-period-generation.engine';

export interface CreateFiscalYearDto {
  name: string;
  code?: string;
  startDate: string;
  endDate: string;
}

export interface CloseFiscalYearDto {
  retainedEarningsAccountId?: number;
  notes?: string;
}

export interface ReopenFiscalYearDto {
  reason: string;
}

export interface FiscalYearAccountBalance {
  id: number;
  code: string;
  name_ar: string;
  name_en: string | null;
  account_type: string;
  balance: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ProposedClosingLine {
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

export interface FiscalYearPreviewResult {
  fiscalYear: any;
  unpostedEntriesCount: number;
  canClose: boolean;
  blockReason: string | null;
  totalRevenue: number;
  totalExpense: number;
  netProfitLoss: number;
  isProfit: boolean;
  retainedEarningsAccount: {
    id: number;
    code: string;
    name_ar: string;
  } | null;
  revenueAccounts: FiscalYearAccountBalance[];
  expenseAccounts: FiscalYearAccountBalance[];
  proposedClosingLines: ProposedClosingLine[];
}

@Injectable()
export class FiscalYearService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private toMoney(value: unknown): number {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  }

  private formatDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') return date.substring(0, 10);
    if (date instanceof Date) return date.toISOString().substring(0, 10);
    return String(date).substring(0, 10);
  }

  private assertAdmin(auth: AuthContext): void {
    if (auth.role !== 'admin' && auth.role !== 'super_admin') {
      throw new ForbiddenException('هذه العملية تتطلب صلاحية مدير النظام أو المشرف المالي.');
    }
  }

  /**
   * List all fiscal years for the tenant with overall stats
   */
  async listFiscalYears(auth: AuthContext): Promise<{
    data: any[];
    stats: {
      totalYears: number;
      openYears: number;
      closedYears: number;
      currentYearId: number | null;
    };
  }> {
    const tenantId = String(auth.tenantId || '');
    const today = new Date().toISOString().substring(0, 10);

    const years = await this.db
      .selectFrom('accounting_fiscal_years')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('start_date', 'desc')
      .execute();

    let openYears = 0;
    let closedYears = 0;
    let currentYearId: number | null = null;

    const formatted = years.map((y) => {
      const start = this.formatDate(y.start_date);
      const end = this.formatDate(y.end_date);
      if (y.status === 'closed') {
        closedYears++;
      } else {
        openYears++;
      }
      if (today >= start && today <= end) {
        currentYearId = y.id;
      }
      return {
        ...y,
        start_date: start,
        end_date: end,
        net_profit_loss: this.toMoney(y.net_profit_loss),
        total_revenue: this.toMoney(y.total_revenue),
        total_expense: this.toMoney(y.total_expense),
      };
    });

    return {
      data: formatted,
      stats: {
        totalYears: years.length,
        openYears,
        closedYears,
        currentYearId,
      },
    };
  }

  /**
   * Get single fiscal year details
   */
  async getFiscalYear(auth: AuthContext, id: number): Promise<any> {
    const tenantId = String(auth.tenantId || '');
    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية غير موجودة.');
    }

    let closingEntry: any = null;
    if (fy.closing_entry_id) {
      closingEntry = await this.db
        .selectFrom('journal_entries')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', fy.closing_entry_id)
        .executeTakeFirst();
    }

    return {
      ...fy,
      start_date: this.formatDate(fy.start_date),
      end_date: this.formatDate(fy.end_date),
      net_profit_loss: this.toMoney(fy.net_profit_loss),
      total_revenue: this.toMoney(fy.total_revenue),
      total_expense: this.toMoney(fy.total_expense),
      closingEntry,
    };
  }

  /**
   * Create a new fiscal year period
   */
  async createFiscalYear(auth: AuthContext, dto: CreateFiscalYearDto): Promise<any> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');

    const name = String(dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('يجب إدخال اسم السنة المالية (مثال: السنة المالية 2025).');
    }

    const startDate = this.formatDate(dto.startDate);
    const endDate = this.formatDate(dto.endDate);

    if (!startDate || !endDate) {
      throw new BadRequestException('يجب تحديد تاريخ بداية وتاريخ نهاية صالحين للسنة المالية.');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('تاريخ بداية السنة المالية يجب أن يكون قبل تاريخ النهاية.');
    }

    // Check overlapping periods in same tenant
    const overlapping = await this.db
      .selectFrom('accounting_fiscal_years')
      .select(['id', 'name', 'start_date', 'end_date'])
      .where('tenant_id', '=', tenantId)
      .where('start_date', '<=', endDate as any)
      .where('end_date', '>=', startDate as any)
      .executeTakeFirst();

    if (overlapping) {
      throw new BadRequestException(
        `توجد سنة مالية أخرى [${overlapping.name}] تتداخل مع هذه الفترة (${this.formatDate(overlapping.start_date)} إلى ${this.formatDate(overlapping.end_date)}).`,
      );
    }

    // The overlap SELECT above is only for a friendly message; it races with concurrent creates.
    // accounting_fiscal_years_no_overlap (EXCLUDE ... USING gist) is the actual guarantee.
    let inserted;
    try {
      inserted = await this.db
        .insertInto('accounting_fiscal_years')
        .values({
          tenant_id: tenantId,
          name,
          code: dto.code ? String(dto.code).trim() : null,
          start_date: startDate as any,
          end_date: endDate as any,
          status: 'open',
          net_profit_loss: 0,
          total_revenue: 0,
          total_expense: 0,
          created_at: sql`NOW()` as any,
          updated_at: sql`NOW()` as any,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
    } catch (error: any) {
      if (error?.code === '23P01' || String(error?.constraint || '') === 'accounting_fiscal_years_no_overlap') {
        throw new BadRequestException('توجد سنة مالية أخرى تتداخل مع هذه الفترة. يرجى مراجعة التواريخ.');
      }
      throw error;
    }

    // Auto-generate 12 monthly fiscal periods for this fiscal year (البند O6)
    await this.ensurePeriodsForFiscalYear(
      tenantId,
      inserted.id,
      startDate,
      endDate,
    );

    return {
      ...inserted,
      start_date: this.formatDate(inserted.start_date),
      end_date: this.formatDate(inserted.end_date),
    };
  }

  /**
   * Preview closing of fiscal year with pre-closing audit and simulated zeroing entries
   */
  async previewFiscalYearClose(auth: AuthContext, id: number): Promise<FiscalYearPreviewResult> {
    const tenantId = String(auth.tenantId || '');

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية غير موجودة.');
    }

    if (fy.status === 'closed') {
      throw new BadRequestException('هذه السنة المالية مقفلة بالفعل.');
    }

    const startDate = this.formatDate(fy.start_date);
    const endDate = this.formatDate(fy.end_date);

    // 1. Audit: Check unposted / draft journal entries in the period
    const unpostedResult = await this.db
      .selectFrom('journal_entries')
      .select(sql<number>`COUNT(*)`.as('count'))
      .where('tenant_id', '=', tenantId)
      .where('entry_date', '>=', startDate as any)
      .where('entry_date', '<=', endDate as any)
      .where('status', '!=', 'posted')
      .executeTakeFirst();

    const unpostedCount = Number(unpostedResult?.count || 0);

    // 2. Fetch all accounts for tenant
    const accounts = await this.db
      .selectFrom('accounting_accounts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('code', 'asc')
      .execute();

    // 3. Query debit and credit sums per account in this fiscal year period
    const balances = await (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .select([
        'jel.account_id',
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('total_debit'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('total_credit'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.source_type', '!=', 'fiscal_year_closing')
      .where('je.entry_date', '>=', startDate as any)
      .where('je.entry_date', '<=', endDate as any)
      .groupBy('jel.account_id')
      .execute();

    const balanceMap = new Map<number, { debit: number; credit: number }>();
    for (const b of balances) {
      balanceMap.set(Number(b.account_id), {
        debit: this.toMoney(b.total_debit),
        credit: this.toMoney(b.total_credit),
      });
    }

    const revenueAccounts: FiscalYearAccountBalance[] = [];
    const expenseAccounts: FiscalYearAccountBalance[] = [];

    let totalRevenue = 0;
    let totalExpense = 0;

    for (const acc of accounts) {
      const code = String(acc.code || '');
      const type = String(acc.account_type || '').toLowerCase();
      const b = balanceMap.get(Number(acc.id)) || { debit: 0, credit: 0 };

      // Revenue classification (4xxx or 71xx or account_type = 'revenue' or 'contra_revenue')
      const isRevenue =
        type === 'revenue' ||
        type === 'contra_revenue' ||
        code.startsWith('4') ||
        code.startsWith('71');

      // Expense classification (5xxx or 6xxx or 72xx or account_type = 'expense' or 'operating_expenses' or 'cogs')
      const isExpense =
        type === 'expense' ||
        type === 'operating_expenses' ||
        type === 'cogs' ||
        code.startsWith('5') ||
        code.startsWith('6') ||
        code.startsWith('72');

      if (isRevenue) {
        // Normal balance for Revenue is Credit: net = credit - debit
        const net = this.toMoney(b.credit - b.debit);
        if (net !== 0) {
          totalRevenue += net;
          revenueAccounts.push({
            id: Number(acc.id),
            code: acc.code,
            name_ar: acc.name_ar,
            name_en: acc.name_en,
            account_type: acc.account_type,
            balance: net,
            // To zero out: if net credit > 0, we debit it. If net debit (contra), we credit it.
            closingDebit: net > 0 ? net : 0,
            closingCredit: net < 0 ? Math.abs(net) : 0,
          });
        }
      } else if (isExpense) {
        // Normal balance for Expense is Debit: net = debit - credit
        const net = this.toMoney(b.debit - b.credit);
        if (net !== 0) {
          totalExpense += net;
          expenseAccounts.push({
            id: Number(acc.id),
            code: acc.code,
            name_ar: acc.name_ar,
            name_en: acc.name_en,
            account_type: acc.account_type,
            balance: net,
            // To zero out: if net debit > 0, we credit it. If net credit, we debit it.
            closingDebit: net < 0 ? Math.abs(net) : 0,
            closingCredit: net > 0 ? net : 0,
          });
        }
      }
    }

    totalRevenue = this.toMoney(totalRevenue);
    totalExpense = this.toMoney(totalExpense);
    const netProfitLoss = this.toMoney(totalRevenue - totalExpense);
    const isProfit = netProfitLoss >= 0;

    // 4. Default Retained Earnings Account (code 3200 or equity)
    let retainedAccount = accounts.find((a) => a.code === '3200');
    if (!retainedAccount) {
      retainedAccount = accounts.find(
        (a) => a.account_type === 'equity' && (a.name_ar.includes('محتجزة') || a.name_ar.includes('مبقاة')),
      );
    }
    if (!retainedAccount) {
      retainedAccount = accounts.find((a) => a.account_type === 'equity');
    }

    // 5. Generate proposed closing journal entry lines
    const proposedClosingLines: ProposedClosingLine[] = [];

    // Revenue lines
    for (const r of revenueAccounts) {
      proposedClosingLines.push({
        accountId: r.id,
        accountCode: r.code,
        accountName: r.name_ar,
        debit: r.closingDebit,
        credit: r.closingCredit,
        description: `إقفال حساب الإيراد [${r.code} - ${r.name_ar}] للسنة المالية ${fy.name}`,
      });
    }

    // Expense lines
    for (const e of expenseAccounts) {
      proposedClosingLines.push({
        accountId: e.id,
        accountCode: e.code,
        accountName: e.name_ar,
        debit: e.closingDebit,
        credit: e.closingCredit,
        description: `إقفال حساب المصروف [${e.code} - ${e.name_ar}] للسنة المالية ${fy.name}`,
      });
    }

    // Retained Earnings Line
    if (netProfitLoss !== 0 && retainedAccount) {
      if (isProfit) {
        // Net profit: Credit Retained Earnings
        proposedClosingLines.push({
          accountId: Number(retainedAccount.id),
          accountCode: retainedAccount.code,
          accountName: retainedAccount.name_ar,
          debit: 0,
          credit: netProfitLoss,
          description: `ترحيل صافي أرباح السنة المالية ${fy.name} إلى الأرباح المحتجزة`,
        });
      } else {
        // Net loss: Debit Retained Earnings
        proposedClosingLines.push({
          accountId: Number(retainedAccount.id),
          accountCode: retainedAccount.code,
          accountName: retainedAccount.name_ar,
          debit: Math.abs(netProfitLoss),
          credit: 0,
          description: `ترحيل صافي خسائر السنة المالية ${fy.name} إلى الأرباح المحتجزة`,
        });
      }
    }

    let blockReason: string | null = null;
    if (unpostedCount > 0) {
      blockReason = `يوجد ${unpostedCount} قيد محاسبي غير مرحل (مسودة) في هذه الفترة. يجب ترحيل جميع القيود أو حذفها قبل الإقفال.`;
    } else if (!retainedAccount) {
      blockReason = 'لم يتم العثور على حساب أرباح محتجزة (كود 3200) لترحيل الأرباح/الخسائر إليه.';
    }

    return {
      fiscalYear: {
        ...fy,
        start_date: startDate,
        end_date: endDate,
      },
      unpostedEntriesCount: unpostedCount,
      canClose: !blockReason,
      blockReason,
      totalRevenue,
      totalExpense,
      netProfitLoss,
      isProfit,
      retainedEarningsAccount: retainedAccount
        ? {
            id: Number(retainedAccount.id),
            code: retainedAccount.code,
            name_ar: retainedAccount.name_ar,
          }
        : null,
      revenueAccounts,
      expenseAccounts,
      proposedClosingLines,
    };
  }

  /**
   * Execute year-end closing: generates balancing closing journal entry,
   * sets status to closed, and locks accounting period up to end_date.
   */
  async executeFiscalYearClose(auth: AuthContext, id: number, dto: CloseFiscalYearDto): Promise<any> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');
    const userId = Number(auth.userId) || null;

    // 1. Get preview and validation
    const preview = await this.previewFiscalYearClose(auth, id);
    if (!preview.canClose) {
      throw new BadRequestException(preview.blockReason || 'لا يمكن إقفال السنة المالية.');
    }

    const fy = preview.fiscalYear;
    const endDate = this.formatDate(fy.end_date);

    // Retained Earnings Account
    let retainedEarningsAccountId = dto.retainedEarningsAccountId
      ? Number(dto.retainedEarningsAccountId)
      : preview.retainedEarningsAccount?.id;

    if (!retainedEarningsAccountId) {
      throw new BadRequestException('يجب تحديد حساب الأرباح المحتجزة للترحيل.');
    }

    const retainedAccount = await this.db
      .selectFrom('accounting_accounts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', retainedEarningsAccountId)
      .executeTakeFirst();

    if (!retainedAccount || !retainedAccount.is_active) {
      throw new BadRequestException('حساب الأرباح المحتجزة غير صالح أو غير نشط.');
    }

    // 2. Execute within transaction
    const closingEntryResult = await this.db.transaction().execute(async (trx) => {
      // The preview above (balances, proposed lines, canClose) was computed OUTSIDE this transaction.
      // Two things can have changed since: another admin may have closed the year, and new entries
      // may have been posted inside the period — which would be silently left out of the closing
      // entry, leaving revenue/expense accounts un-zeroed and retained earnings wrong.
      const lockedFy = await trx
        .selectFrom('accounting_fiscal_years')
        .select(['id', 'status'])
        .where('id', '=', fy.id)
        .where('tenant_id', '=', tenantId)
        .forUpdate()
        .executeTakeFirst();

      if (!lockedFy) throw new NotFoundException('السنة المالية غير موجودة.');
      if (lockedFy.status === 'closed') throw new BadRequestException('هذه السنة المالية مقفلة بالفعل.');

      const startDateStr = this.formatDate(fy.start_date);
      const verify = await (trx as any)
        .selectFrom('journal_entry_lines as jel')
        .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
        .innerJoin('accounting_accounts as a', 'a.id', 'jel.account_id')
        .select([
          sql<number>`COALESCE(SUM(CASE WHEN a.account_type = 'revenue' THEN jel.credit - jel.debit ELSE 0 END), 0)`.as('revenue'),
          sql<number>`COALESCE(SUM(CASE WHEN a.account_type = 'expense' THEN jel.debit - jel.credit ELSE 0 END), 0)`.as('expense'),
        ])
        .where('je.tenant_id', '=', tenantId)
        .where('je.status', '=', 'posted')
        .where('je.source_type', '!=', 'fiscal_year_closing')
        .where('je.entry_date', '>=', startDateStr as any)
        .where('je.entry_date', '<=', endDate as any)
        .executeTakeFirst();

      const liveRevenue = this.toMoney(verify?.revenue || 0);
      const liveExpense = this.toMoney(verify?.expense || 0);

      if (
        Math.abs(liveRevenue - this.toMoney(preview.totalRevenue)) > 0.01 ||
        Math.abs(liveExpense - this.toMoney(preview.totalExpense)) > 0.01
      ) {
        throw new BadRequestException(
          'تم ترحيل حركات مالية داخل هذه السنة بعد إعداد المعاينة، فأصبحت أرقام الإقفال غير محدّثة. يرجى إعادة المعاينة ثم الإقفال.',
        );
      }

      let createdJournalEntryId: number | null = null;

      if (preview.proposedClosingLines.length > 0) {
        // Validate balance of proposed lines
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of preview.proposedClosingLines) {
          totalDebit += line.debit;
          totalCredit += line.credit;
        }
        totalDebit = this.toMoney(totalDebit);
        totalCredit = this.toMoney(totalCredit);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
          throw new BadRequestException(
            `قيد الإقفال غير متزن: إجمالي المدين (${totalDebit}) لا يساوي إجمالي الدائن (${totalCredit}). الفارق: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
          );
        }

        // Insert closing journal entry
        const tempEntryNo = `CLOSE-TEMP-${Date.now()}`;
        const description = `إقفال السنة المالية: ${fy.name} وترحيل صافي ${preview.isProfit ? 'الأرباح' : 'الخسائر'} (${Math.abs(preview.netProfitLoss).toFixed(2)}) إلى حساب [${retainedAccount.code} - ${retainedAccount.name_ar}]`;

        const insertedEntry = await trx
          .insertInto('journal_entries')
          .values({
            entry_no: tempEntryNo,
            tenant_id: tenantId,
            account_id: auth.accountId || tenantId,
            entry_date: endDate as any,
            description,
            source_type: 'fiscal_year_closing',
            source_id: fy.id,
            status: 'posted',
            created_by: userId,
            posted_by: userId,
            posted_at: sql`NOW()` as any,
          } as any)
          .returning('id')
          .executeTakeFirstOrThrow();

        const entryId = Number(insertedEntry.id);
        createdJournalEntryId = entryId;

        const officialEntryNo = `CLOSE-${fy.code || new Date(endDate).getFullYear()}-${String(entryId).padStart(6, '0')}`;

        await trx
          .updateTable('journal_entries')
          .set({
            entry_no: officialEntryNo,
            updated_at: sql`NOW()` as any,
          } as any)
          .where('id', '=', entryId)
          .where('tenant_id', '=', tenantId)
          .execute();

        // Insert lines
        const linesToInsert = preview.proposedClosingLines.map((l) => ({
          journal_entry_id: entryId,
          tenant_id: tenantId,
          account_id: l.accountId,
          cost_center_id: null,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
          partner_type: 'none',
          partner_id: null,
          created_at: sql`NOW()` as any,
        }));

        await trx
          .insertInto('journal_entry_lines')
          .values(linesToInsert as any)
          .execute();
      }

      // Update fiscal year
      await trx
        .updateTable('accounting_fiscal_years')
        .set({
          status: 'closed',
          closing_entry_id: createdJournalEntryId,
          net_profit_loss: preview.netProfitLoss,
          total_revenue: preview.totalRevenue,
          total_expense: preview.totalExpense,
          retained_earnings_account_id: retainedEarningsAccountId,
          closed_at: sql`NOW()` as any,
          closed_by: userId,
          closing_notes: dto.notes ? String(dto.notes).trim() : null,
          updated_at: sql`NOW()` as any,
        })
        .where('id', '=', fy.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      // إقفال كافة الفترات الشهرية التابعة لهذه السنة المالية تلقائياً
      await trx
        .updateTable('accounting_fiscal_periods')
        .set({
          status: 'closed',
          closed_at: sql`NOW()`,
          closed_by: userId,
          closing_notes: 'تم الإقفال تلقائياً ضمن إقفال السنة المالية بالكامل',
          updated_at: sql`NOW()`,
        })
        .where('fiscal_year_id', '=', fy.id)
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'open')
        .execute();

      // Automatically update accounting period lock date (lock_date_all) in accounting_settings
      const currentSettings = await trx
        .selectFrom('accounting_settings')
        .select(['id', 'lock_date_all'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', 1)
        .executeTakeFirst();

      // Locking the period is not optional: a year closed but still writable is the whole failure
      // this step exists to prevent. If the tenant has no settings row yet, create it rather than
      // silently skipping the lock.
      if (currentSettings) {
        const curLock = currentSettings.lock_date_all
          ? this.formatDate(currentSettings.lock_date_all)
          : '';
        // If current lock is empty or earlier than this fiscal year end date, advance the lock date
        if (!curLock || curLock < endDate) {
          await trx
            .updateTable('accounting_settings')
            .set({
              lock_date_all: endDate as any,
              updated_at: sql`NOW()` as any,
            })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', 1)
            .execute();
        }
      } else {
        await trx
          .insertInto('accounting_settings')
          .values({
            id: 1,
            tenant_id: tenantId,
            lock_date_all: endDate as any,
            updated_at: sql`NOW()` as any,
          } as any)
          .onConflict((oc) =>
            oc.columns(['tenant_id', 'id']).doUpdateSet({
              lock_date_all: endDate as any,
              updated_at: sql`NOW()` as any,
            } as any),
          )
          .execute();
      }

      return {
        closingEntryId: createdJournalEntryId,
      };
    });

    return {
      success: true,
      message: `تم إقفال السنة المالية [${fy.name}] بنجاح، وترحيل الأرباح وتأمين الفترة المحاسبية.`,
      closingEntryId: closingEntryResult.closingEntryId,
      netProfitLoss: preview.netProfitLoss,
      isProfit: preview.isProfit,
    };
  }

  /**
   * Reopen a closed fiscal year: reverses/removes closing entry and unlocks period
   */
  async reopenFiscalYear(auth: AuthContext, id: number, dto: ReopenFiscalYearDto): Promise<any> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');

    const reason = String(dto.reason || '').trim();
    if (!reason) {
      throw new BadRequestException('يجب ذكر سبب إعادة فتح السنة المالية للتوثيق والرقابة.');
    }

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية غير موجودة.');
    }

    if (fy.status !== 'closed') {
      throw new BadRequestException('هذه السنة المالية مفتوحة بالفعل ولا تحتاج إلى إعادة فتح.');
    }

    // Check if there is any subsequent closed fiscal year (must reopen in reverse order)
    const subsequentClosed = await this.db
      .selectFrom('accounting_fiscal_years')
      .select(['id', 'name', 'start_date'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'closed')
      .where('start_date', '>', fy.start_date)
      .executeTakeFirst();

    if (subsequentClosed) {
      throw new BadRequestException(
        `لا يمكن إعادة فتح السنة المالية [${fy.name}] لأن السنة المالية اللاحقة [${subsequentClosed.name}] مقفلة. يجب إعادة فتح السنوات بترتيب زمني عكسي.`,
      );
    }

    await this.db.transaction().execute(async (trx) => {
      // 1. Remove closing journal entry if exists
      if (fy.closing_entry_id) {
        await trx
          .deleteFrom('journal_entry_lines')
          .where('journal_entry_id', '=', fy.closing_entry_id)
          .where('tenant_id', '=', tenantId)
          .execute();

        await trx
          .deleteFrom('journal_entries')
          .where('id', '=', fy.closing_entry_id)
          .where('tenant_id', '=', tenantId)
          .execute();
      }

      // 2. Update fiscal year status back to open
      const reopenLog = `\n[أعيد فتحها بتاريخ ${new Date().toISOString().substring(0, 10)} بواسطة مستخدم #${auth.userId} - السبب: ${reason}]`;
      await trx
        .updateTable('accounting_fiscal_years')
        .set({
          status: 'open',
          closing_entry_id: null,
          closed_at: null,
          closed_by: null,
          closing_notes: sql`CONCAT(COALESCE(closing_notes, ''), ${reopenLog})` as any,
          updated_at: sql`NOW()` as any,
        })
        .where('id', '=', fy.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      // 3. Adjust lock date in accounting_settings
      // Find the latest remaining closed fiscal year (if any)
      const prevClosed = await trx
        .selectFrom('accounting_fiscal_years')
        .select(['end_date'])
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'closed')
        .where('id', '!=', fy.id)
        .orderBy('end_date', 'desc')
        .executeTakeFirst();

      const newLockDate = prevClosed ? this.formatDate(prevClosed.end_date) : null;

      await trx
        .updateTable('accounting_settings')
        .set({
          lock_date_all: newLockDate as any,
          updated_at: sql`NOW()` as any,
        })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', 1)
        .execute();
    });

    return {
      success: true,
      message: `تم إعادة فتح السنة المالية [${fy.name}] بنجاح وإلغاء قيد الإقفال وتعديل تاريخ القفل.`,
    };
  }

  /**
   * Delete an open fiscal year period
   */
  async deleteFiscalYear(auth: AuthContext, id: number): Promise<any> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية غير موجودة.');
    }

    if (fy.status === 'closed') {
      throw new BadRequestException('لا يمكن حذف سنة مالية مقفلة. يجب إعادة فتحها أولاً إذا كنت ترغب في حذفها.');
    }

    await this.db
      .deleteFrom('accounting_fiscal_years')
      .where('id', '=', id)
      .where('tenant_id', '=', tenantId)
      .execute();

    return {
      success: true,
      message: 'تم حذف السنة المالية بنجاح.',
    };
  }

  /**
   * توليد وتقسيم الفترات المحاسبية الشهرية تلقائياً للسنة المالية (البند O6).
   */
  async ensurePeriodsForFiscalYear(
    tenantId: string,
    fiscalYearId: number,
    startDateStr: string,
    endDateStr: string,
  ): Promise<void> {
    const existing = await this.db
      .selectFrom('accounting_fiscal_periods')
      .select(['id'])
      .where('tenant_id', '=', tenantId)
      .where('fiscal_year_id', '=', fiscalYearId)
      .executeTakeFirst();

    if (existing) return;

    const generated = buildMonthlyFiscalPeriods(startDateStr, endDateStr);

    const periodsToInsert = generated.map((period) => ({
      tenant_id: tenantId,
      fiscal_year_id: fiscalYearId,
      period_number: period.periodNumber,
      name: period.name,
      code: period.code,
      start_date: period.startDate as any,
      end_date: period.endDate as any,
      status: 'open' as const,
      created_at: sql`NOW()` as any,
      updated_at: sql`NOW()` as any,
    }));

    if (periodsToInsert.length > 0) {
      await this.db
        .insertInto('accounting_fiscal_periods')
        .values(periodsToInsert)
        .onConflict((oc) =>
          oc.columns(['tenant_id', 'fiscal_year_id', 'period_number']).doNothing(),
        )
        .execute();
    }
  }

  /**
   * عرض الفترات الشهرية لسنة مالية — **قراءة بحتة**.
   *
   * كانت هذه الدالة تولّد الفترات وتكتبها في القاعدة إن لم تجدها، أي أن نداء `GET` كان يكتب.
   * نفس نمط O33 (`GET subscription/me` كان يُنشئ صف اشتراك) الذي أُغلق قبل يوم واحد: مسار
   * القراءة لا يكتب، والتوليد له مسار `POST` صريح يملكه مدير النظام.
   */
  async listFiscalPeriods(auth: AuthContext, fiscalYearId: number): Promise<FiscalPeriodResponse[]> {
    const tenantId = String(auth.tenantId || '');

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .select(['id', 'start_date', 'end_date', 'status'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', fiscalYearId)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية غير موجودة.');
    }

    const rows = await this.db
      .selectFrom('accounting_fiscal_periods')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('fiscal_year_id', '=', fiscalYearId)
      .orderBy('period_number', 'asc')
      .execute();

    return rows.map((p) => ({
      ...p,
      start_date: this.formatDate(p.start_date),
      end_date: this.formatDate(p.end_date),
      closed_at: p.closed_at ? new Date(p.closed_at as any).toISOString() : null,
      created_at: p.created_at ? new Date(p.created_at as any).toISOString() : '',
      updated_at: p.updated_at ? new Date(p.updated_at as any).toISOString() : '',
    })) as FiscalPeriodResponse[];
  }

  /**
   * توليد الفترات الشهرية لسنة مالية قائمة (للسنوات التي أُنشئت قبل وجود الفترات الشهرية).
   *
   * مسار كتابة صريح ومحصور بمدير النظام، ولا يفعل شيئاً إن كانت الفترات موجودة بالفعل
   * (`ensurePeriodsForFiscalYear` تفحص أولاً، والإدراج بـ`onConflict ... doNothing`).
   */
  async generateFiscalPeriods(auth: AuthContext, fiscalYearId: number): Promise<FiscalPeriodResponse[]> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .select(['id', 'start_date', 'end_date'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', fiscalYearId)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية غير موجودة.');
    }

    await this.ensurePeriodsForFiscalYear(
      tenantId,
      fiscalYearId,
      this.formatDate(fy.start_date),
      this.formatDate(fy.end_date),
    );

    return this.listFiscalPeriods(auth, fiscalYearId);
  }

  /**
   * إقفال فترة محاسبية شهرية وتجميد قيودها (البند O6).
   */
  async closeFiscalPeriod(auth: AuthContext, periodId: number, dto: CloseFiscalPeriodDto): Promise<any> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');
    const userId = auth.userId ? Number(auth.userId) : null;

    const period = await this.db
      .selectFrom('accounting_fiscal_periods')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', periodId)
      .executeTakeFirst();

    if (!period) {
      throw new NotFoundException('الفترة المحاسبية غير موجودة.');
    }

    if (period.status === 'closed') {
      throw new BadRequestException('هذه الفترة المحاسبية مقفلة بالفعل.');
    }

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .select(['id', 'name', 'status'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', period.fiscal_year_id)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية التابعة لها الفترة غير موجودة.');
    }

    if (fy.status === 'closed') {
      throw new BadRequestException('السنة المالية التابعة لها هذه الفترة مقفلة بالكامل.');
    }

    const startDateStr = this.formatDate(period.start_date);
    const endDateStr = this.formatDate(period.end_date);

    /**
     * FP-7: FP-2 (الترتيب الزمني) و FP-3 (المسودات) يُفحصان **داخل** المعاملة وتحت قفل الصف، لا قبلها.
     *
     * كانا يُقرآن على `this.db` قبل فتح المعاملة، فبين الفحص والكتابة توجد نافذة: مسودة تُحفظ
     * في تلك اللحظة تقع داخل شهر يُقفل بعدها مباشرةً، فلا تصلح للترحيل أبداً (يمنعها FP-3)
     * ولا يظهر سببها؛ وإقفالان متزامنان لشهرين يمكن أن يتجاوزا الترتيب الزمني معاً.
     * نفس درس F6 وحجز الكوبون واستهلاك رمز الاستعادة: الفحص والكتابة في معاملة واحدة.
     */
    await this.db.transaction().execute(async (trx) => {
      const locked = await trx
        .selectFrom('accounting_fiscal_periods')
        .select(['id', 'status', 'period_number'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', period.id)
        .forUpdate()
        .executeTakeFirst();

      if (!locked) {
        throw new NotFoundException('الفترة المحاسبية غير موجودة.');
      }
      if (locked.status === 'closed') {
        throw new BadRequestException('هذه الفترة المحاسبية مقفلة بالفعل.');
      }

      // 1. الترتيب الزمني الصارم: لا يجوز إقفال شهر قبل إقفال الشهر السابق له
      const prevOpen = await trx
        .selectFrom('accounting_fiscal_periods')
        .select(['id', 'name', 'period_number'])
        .where('tenant_id', '=', tenantId)
        .where('fiscal_year_id', '=', period.fiscal_year_id)
        .where('period_number', '<', period.period_number)
        .where('status', '=', 'open')
        .orderBy('period_number', 'asc')
        .forUpdate()
        .executeTakeFirst();

      if (prevOpen) {
        throw new BadRequestException(
          `لا يمكن إقفال الفترة [${period.name}] قبل إقفال الفترة السابقة [${prevOpen.name}]. يجب إقفال الفترات المحاسبية بترتيب زمني متسلسل.`,
        );
      }

      // 2. التحقق من القيود المعلقة (Draft entries)
      const draftEntries = await trx
        .selectFrom('journal_entries')
        .select(trx.fn.count('id').as('cnt'))
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'draft')
        .where('entry_date', '>=', startDateStr as any)
        .where('entry_date', '<=', endDateStr as any)
        .executeTakeFirst();

      const draftCount = Number(draftEntries?.cnt || 0);
      if (draftCount > 0) {
        throw new BadRequestException(
          `توجد ${draftCount} مسودات قيود محاسبية غير مرحّلة في هذه الفترة (${startDateStr} إلى ${endDateStr}). يجب ترحيلها أو حذفها قبل إقفال الفترة.`,
        );
      }

      // تحديث lock_date_all في accounting_settings
      const currentSettings = await trx
        .selectFrom('accounting_settings')
        .select(['id', 'lock_date_all'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', 1)
        .executeTakeFirst();

      const previousLock = currentSettings?.lock_date_all ? this.formatDate(currentSettings.lock_date_all) : null;

      await trx
        .updateTable('accounting_fiscal_periods')
        .set({
          status: 'closed',
          closed_at: sql`NOW()` as any,
          closed_by: userId,
          closing_notes: dto?.notes ? String(dto.notes).trim() : null,
          // FP-8: اللقطة تُلتقط هنا، قبل رفع القفل — وهي ما يُستعاد عند إعادة الفتح.
          previous_lock_date_all: previousLock as any,
          updated_at: sql`NOW()` as any,
        })
        .where('id', '=', period.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      if (currentSettings) {
        if (!previousLock || previousLock < endDateStr) {
          await trx
            .updateTable('accounting_settings')
            .set({ lock_date_all: endDateStr as any, updated_at: sql`NOW()` as any })
            .where('tenant_id', '=', tenantId)
            .where('id', '=', 1)
            .execute();
        }
      } else {
        await trx
          .insertInto('accounting_settings')
          .values({ id: 1, tenant_id: tenantId, lock_date_all: endDateStr as any, updated_at: sql`NOW()` as any } as any)
          .onConflict((oc) =>
            oc.columns(['tenant_id', 'id']).doUpdateSet({ lock_date_all: endDateStr as any, updated_at: sql`NOW()` as any } as any),
          )
          .execute();
      }
    });

    return {
      success: true,
      message: `تم إقفال الفترة المحاسبية [${period.name}] بنجاح وتأمين الحسابات حتى ${endDateStr}.`,
    };
  }

  /**
   * إعادة فتح فترة محاسبية شهرية بترتيب زمني عكسي صارم (البند O6).
   */
  async reopenFiscalPeriod(auth: AuthContext, periodId: number, dto: ReopenFiscalPeriodDto): Promise<any> {
    this.assertAdmin(auth);
    const tenantId = String(auth.tenantId || '');
    const reason = String(dto?.reason || '').trim();

    if (!reason) {
      throw new BadRequestException('يجب ذكر سبب إعادة فتح الفترة المحاسبية للرقابة والتدقيق.');
    }

    const period = await this.db
      .selectFrom('accounting_fiscal_periods')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', periodId)
      .executeTakeFirst();

    if (!period) {
      throw new NotFoundException('الفترة المحاسبية غير موجودة.');
    }

    if (period.status !== 'closed') {
      throw new BadRequestException('هذه الفترة المحاسبية مفتوحة بالفعل.');
    }

    const fy = await this.db
      .selectFrom('accounting_fiscal_years')
      .select(['id', 'name', 'status'])
      .where('tenant_id', '=', tenantId)
      .where('id', '=', period.fiscal_year_id)
      .executeTakeFirst();

    if (!fy) {
      throw new NotFoundException('السنة المالية التابعة لها الفترة غير موجودة.');
    }

    if (fy.status === 'closed') {
      throw new BadRequestException(
        `لا يمكن إعادة فتح فترة في السنة المالية [${fy.name}] لأن السنة المالية نفسها مقفلة. يجب إعادة فتح السنة المالية أولاً.`,
      );
    }

    // FP-7: FP-4 يُفحص داخل المعاملة وتحت قفل الصف، لنفس سبب الإقفال.
    await this.db.transaction().execute(async (trx) => {
      const locked = await trx
        .selectFrom('accounting_fiscal_periods')
        .select(['id', 'status'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', period.id)
        .forUpdate()
        .executeTakeFirst();

      if (!locked) {
        throw new NotFoundException('الفترة المحاسبية غير موجودة.');
      }
      if (locked.status !== 'closed') {
        throw new BadRequestException('هذه الفترة المحاسبية مفتوحة بالفعل.');
      }

      // الترتيب العكسي: لا يمكن إعادة فتح شهر طالما هناك شهر بعده مقفل
      const nextClosed = await trx
        .selectFrom('accounting_fiscal_periods')
        .select(['id', 'name', 'period_number'])
        .where('tenant_id', '=', tenantId)
        .where('fiscal_year_id', '=', period.fiscal_year_id)
        .where('period_number', '>', period.period_number)
        .where('status', '=', 'closed')
        .orderBy('period_number', 'desc')
        .forUpdate()
        .executeTakeFirst();

      if (nextClosed) {
        throw new BadRequestException(
          `لا يمكن إعادة فتح الفترة [${period.name}] لأن الفترة اللاحقة [${nextClosed.name}] مقفلة. يجب إعادة فتح الفترات بترتيب زمني عكسي.`,
        );
      }

      const reopenNote = `\n[أعيد فتحها بتاريخ ${new Date().toISOString().slice(0, 10)} بواسطة مستخدم #${auth.userId} - السبب: ${reason}]`;
      await trx
        .updateTable('accounting_fiscal_periods')
        .set({
          status: 'open',
          closed_at: null,
          closed_by: null,
          closing_notes: sql`CONCAT(COALESCE(closing_notes, ''), ${reopenNote})` as any,
          // اللقطة استُهلكت؛ إقفال لاحق يلتقط قيمة القفل السارية وقتها لا قيمة قديمة.
          previous_lock_date_all: null,
          updated_at: sql`NOW()` as any,
        })
        .where('id', '=', period.id)
        .where('tenant_id', '=', tenantId)
        .execute();

      /**
       * FP-8: إعادة الفتح **تستعيد** القفل ولا تعيد حسابه من الصفر.
       *
       * كان هذا السطر يكتب `lock_date_all` بتاريخ آخر فترة شهرية مقفلة، و`NULL` إن لم توجد —
       * فمنشأة قفلت دفاترها يدوياً حتى 2025-12-31 (الطريقة الوحيدة قبل الفترات الشهرية)، ثم
       * أقفلت شهراً وأعادت فتحه، كان قفلها اليدوي **يُمحى وتُفتح دفاتر سنوات سابقة** بلا أن
       * يطلب أحد ذلك. الآن: نأخذ **الأبعد** بين اللقطة المحفوظة وقت الإقفال وبين نهاية آخر
       * فترة لا تزال مقفلة. القفل لا يتراجع أبداً عن حدٍّ لم يضعه إقفال هذه الفترة.
       */
      const latestClosedPeriod = await trx
        .selectFrom('accounting_fiscal_periods')
        .select(['end_date'])
        .where('tenant_id', '=', tenantId)
        .where('status', '=', 'closed')
        .orderBy('end_date', 'desc')
        .executeTakeFirst();

      const fromClosedPeriods = latestClosedPeriod ? this.formatDate(latestClosedPeriod.end_date) : null;
      const snapshot = period.previous_lock_date_all ? this.formatDate(period.previous_lock_date_all) : null;
      const candidates = [fromClosedPeriods, snapshot].filter((value): value is string => Boolean(value));
      const newLock = candidates.length > 0 ? candidates.sort().at(-1)! : null;

      await trx
        .updateTable('accounting_settings')
        .set({ lock_date_all: newLock as any, updated_at: sql`NOW()` as any })
        .where('tenant_id', '=', tenantId)
        .where('id', '=', 1)
        .execute();
    });

    return {
      success: true,
      message: `تم إعادة فتح الفترة المحاسبية [${period.name}] بنجاح وتحديث تاريخ قفل الفترة.`,
    };
  }
}
