import { Inject, Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';

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

    const inserted = await this.db
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

      // Automatically update accounting period lock date (lock_date_all) in accounting_settings
      const currentSettings = await trx
        .selectFrom('accounting_settings')
        .select(['id', 'lock_date_all'])
        .where('tenant_id', '=', tenantId)
        .where('id', '=', 1)
        .executeTakeFirst();

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
}
