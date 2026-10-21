import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { formatDailyDocumentNumber } from '../../../common/utils/document-number.util';
import { AccountingPostingService } from '../accounting-posting.service';

/** A string DTO body is not runtime validation; PostgreSQL numeric accepts 'NaN'. */
export function validateForexClosingRate(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    throw new BadRequestException('A finite, positive closing FX rate is required');
  }
  return raw;
}

export interface ExecuteForexRevaluationDto {
  periodDate: string;
  currencyCode: string;
  closingRate: number;
  notes?: string;
  items?: Array<{ accountId: number; foreignBalance?: number }>;
}

@Injectable()
export class ForexRevaluationService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  async listRuns(auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const runs = await this.db
      .selectFrom('forex_revaluation_runs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .orderBy('period_date', 'desc')
      .orderBy('created_at', 'desc')
      .execute();

    return runs;
  }

  async getRunDetails(id: string, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const run = await this.db
      .selectFrom('forex_revaluation_runs')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id as any)
      .executeTakeFirst();

    if (!run) throw new NotFoundException('سجل إعادة التقييم غير موجود.');

    const lines = await this.db
      .selectFrom('forex_revaluation_lines')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('run_id', '=', id)
      .execute();

    return { run, lines };
  }

  async previewRevaluation(dto: ExecuteForexRevaluationDto, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const currencyCode = String(dto.currencyCode || '').trim().toUpperCase();
    const closingRate = validateForexClosingRate(dto.closingRate);

    if (!currencyCode) throw new BadRequestException('رمز العملة مطلوب.');
    // The validated rate is shared by preview and actual execution.

    // Fetch current book rate
    const currentRateRow = await this.db
      .selectFrom('currency_exchange_rates')
      .select(['exchange_rate'])
      .where('tenant_id', '=', tenantId)
      .where('currency_code', '=', currencyCode)
      .executeTakeFirst();

    const bookRate = Number(currentRateRow?.exchange_rate || closingRate);
    if (!Number.isFinite(bookRate) || bookRate <= 0) throw new BadRequestException('Stored FX book rate is invalid; correct it before revaluation');

    // IAS 21 §23: retranslate MONETARY items only, and only those denominated in this currency.
    // The previous selection matched on a `name` column and a `type` column that do not exist on
    // accounting_accounts (the real columns are name_ar/name_en and account_type), and joined a
    // `treasuries` table that does not exist in the schema at all — so every call threw at runtime.
    // `(this.db as any)` hid all three errors from the compiler.
    // Fuzzy name matching also cannot distinguish monetary from non-monetary items: an account
    // named "مخزون بضاعة USD" would have been revalued, which is a material misstatement.
    const accounts = await this.db
      .selectFrom('accounting_accounts')
      .select(['id', 'code', 'name_ar', 'name_en', 'account_type', 'normal_balance'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where('is_monetary', '=', true)
      .where('revaluation_currency', '=', currencyCode)
      .execute();

    const accountIds = accounts.map((account) => Number(account.id));
    const balances = accountIds.length ? await this.db
      .selectFrom('journal_entry_lines as l')
      .innerJoin('journal_entries as h', (join) => join
        .onRef('h.id', '=', 'l.journal_entry_id')
        .onRef('h.tenant_id', '=', 'l.tenant_id'))
      .select(['l.account_id', sql<number>`COALESCE(SUM(l.debit - l.credit), 0)`.as('balance')])
      .where('l.tenant_id', '=', tenantId)
      .where('l.account_id', 'in', accountIds)
      .where('h.status', '=', 'posted')
      .where('h.entry_date', '<=', dto.periodDate as any)
      .groupBy('l.account_id')
      .execute() : [];
    const balanceByAccount = new Map(balances.map((row) => [Number(row.account_id), Number(row.balance || 0)]));

    const lines: any[] = [];
    let totalForeign = 0;
    let totalUnrealizedGainLoss = 0;
    const userItemMap = new Map((dto.items || []).map((it: { accountId: number; foreignBalance?: number }) => [Number(it.accountId), Number(it.foreignBalance || 0)]));

    for (const acc of accounts) {
      const localBalance = balanceByAccount.get(Number(acc.id)) || 0;
      if (Math.abs(localBalance) > 0.01) {
        // Use explicitly supplied foreign currency balance if present, otherwise derive from bookRate (ZS-039)
        const userForeign = userItemMap.get(Number(acc.id));
        const foreignBalance = userForeign !== undefined && Number.isFinite(userForeign) && userForeign !== 0
          ? Math.round(Number(userForeign) * 100) / 100
          : Math.round((localBalance / bookRate) * 100) / 100;
        const revaluedLocal = Math.round(foreignBalance * closingRate * 100) / 100;
        const diff = Math.round((revaluedLocal - localBalance) * 100) / 100;

        lines.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name_ar || acc.name_en,
          foreignBalance,
          bookLocalValue: localBalance,
          revaluedLocalValue: revaluedLocal,
          unrealizedDifference: diff,
        });

        totalForeign += foreignBalance;
        totalUnrealizedGainLoss += diff;
      }
    }

    return {
      periodDate: dto.periodDate,
      currencyCode,
      bookRate,
      closingRate,
      totalForeignBalance: Math.round(totalForeign * 100) / 100,
      netUnrealizedGainLoss: Math.round(totalUnrealizedGainLoss * 100) / 100,
      lines,
    };
  }

  async executeRevaluation(dto: ExecuteForexRevaluationDto, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const preview = await this.previewRevaluation(dto, auth);

    if (preview.lines.length === 0) {
      throw new BadRequestException('لا توجد أرصدة أو حسابات أجنبية تتطلب إعادة تقييم في هذا التاريخ.');
    }

    // Find or locate Forex Gain/Loss account in chart of accounts
    // Standard COA: 4400 / 4800 for Gain, 5400 / 5800 for Loss
    let gainLossAccount = await this.db
      .selectFrom('accounting_accounts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('name_ar', 'ilike', '%فروق عملة%'),
          eb('name_ar', 'ilike', '%فروق تقييم%'),
          eb('name_ar', 'ilike', '%أرباح وخسائر فروق العملة%'),
          eb('code', 'in', ['4400', '4800', '5400', '5800']),
        ])
      )
      .executeTakeFirst();

    if (!gainLossAccount) {
      // Fallback: pick other income / expense account
      gainLossAccount = await this.db
        .selectFrom('accounting_accounts')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        // Column is account_type, not type; the previous `type` reference threw at runtime.
        .where('account_type', 'in', ['revenue', 'expense'])
        .where('is_active', '=', true)
        .executeTakeFirst();
    }

    if (gainLossAccount && !gainLossAccount.is_active) {
      throw new BadRequestException('حساب فروق العملة غير نشط.');
    }
    const isGain = preview.netUnrealizedGainLoss >= 0;
    const absDiff = Math.abs(preview.netUnrealizedGainLoss);
    const hasRevaluation = preview.lines.some((line) => Math.abs(line.unrealizedDifference) >= 0.01);

    // Build journal entry lines if difference != 0
    let createdEntryId: number | null = null;
    let entryNo: string | null = null;

    if (absDiff >= 0.01 && !gainLossAccount) {
      throw new BadRequestException('حساب فروق العملة غير موجود؛ لا يمكن ترحيل إعادة التقييم.');
    }

    return this.db.transaction().execute(async (trx) => {
      // Transactional advisory lock to prevent concurrent revaluations for same tenant/period/currency (ZS-038)
      await sql`SELECT pg_advisory_xact_lock(hashtext(${tenantId} || ':forex:' || ${dto.periodDate} || ':' || ${dto.currencyCode}))`.execute(trx);

      const existingRun = await trx
        .selectFrom('forex_revaluation_runs')
        .select(['id', 'status', 'journal_entry_no'])
        .where('tenant_id', '=', tenantId)
        .where('period_date', '=', dto.periodDate)
        .where('currency_code', '=', dto.currencyCode)
        .where('status', '=', 'posted')
        .executeTakeFirst();

      if (existingRun) {
        throw new BadRequestException(
          `تم إجراء إعادة تقييم عملة (${dto.currencyCode}) لهذه الفترة (${dto.periodDate}) مسبقاً برقم قيد [${existingRun.journal_entry_no || existingRun.id}].`
        );
      }

    if (hasRevaluation) {
      const entryLines: any[] = [];

      for (const line of preview.lines) {
        if (Math.abs(line.unrealizedDifference) >= 0.01) {
          if (line.unrealizedDifference > 0) {
            // Asset increased in local currency value -> Debit Asset
            entryLines.push({
              account_id: line.accountId,
              debit: line.unrealizedDifference,
              credit: 0,
              description: `أرباح تقييم فروق عملة ${dto.currencyCode} لحساب ${line.accountName}`,
            });
          } else {
            // Asset decreased in local currency value -> Credit Asset
            entryLines.push({
              account_id: line.accountId,
              debit: 0,
              credit: Math.abs(line.unrealizedDifference),
              description: `خسائر تقييم فروق عملة ${dto.currencyCode} لحساب ${line.accountName}`,
            });
          }
        }
      }

      // Offsetting Gain/Loss Line
      if (absDiff >= 0.01 && isGain) {
        entryLines.push({
          account_id: gainLossAccount!.id,
          debit: 0,
          credit: absDiff,
          description: `إثبات أرباح فروق عملة غير محققة (${dto.currencyCode}) بنهاية فترة ${dto.periodDate}`,
        });
      } else if (absDiff >= 0.01) {
        entryLines.push({
          account_id: gainLossAccount!.id,
          debit: absDiff,
          credit: 0,
          description: `إثبات خسائر فروق عملة غير محققة (${dto.currencyCode}) بنهاية فترة ${dto.periodDate}`,
        });
      }

      const description = `قيد تسوية فروق تقييم العملة الأجنبية (${dto.currencyCode}) بسعر ${dto.closingRate} ج.م وفق معيار IAS 21`;
      const entryId = await this.accountingPosting.postDomainJournal(trx, {
        sourceType: 'forex_revaluation', sourceId: 0, tenantId,
        accountId: auth.accountId || tenantId, entryDate: new Date(dto.periodDate),
        description, createdBy: auth.userId || null,
        lines: entryLines.map((line) => ({
          accountId: Number(line.account_id), description: line.description,
          debit: Number(line.debit), credit: Number(line.credit),
          partnerType: 'none' as const, partnerId: null, branchId: null, locationId: null,
        })),
      });
      createdEntryId = entryId;
      entryNo = formatDailyDocumentNumber(`FX-${dto.currencyCode}`, entryId, new Date(dto.periodDate));

      await trx
        .updateTable('journal_entries')
        .set({
          entry_no: entryNo,
          updated_at: sql`NOW()` as any,
        } as any)
        .where('id', '=', entryId)
        .where('tenant_id', '=', tenantId)
        .execute();

    }

    // Save run record
    const runRow = await trx
      .insertInto('forex_revaluation_runs')
      .values({
        tenant_id: tenantId,
        period_date: dto.periodDate,
        currency_code: dto.currencyCode,
        book_exchange_rate: preview.bookRate,
        closing_exchange_rate: dto.closingRate,
        foreign_balance_total: preview.totalForeignBalance,
        unrealized_gain_loss: preview.netUnrealizedGainLoss,
        journal_entry_id: createdEntryId,
        journal_entry_no: entryNo,
        status: 'posted',
        notes: dto.notes || `إعادة تقييم فروق عملة ${dto.currencyCode} بنهاية فترة ${dto.periodDate}`,
        created_by: auth.userId || 0,
      } as any)
      .returningAll()
      .executeTakeFirstOrThrow();

    // Insert detail lines
    const lineRows = preview.lines.map((l) => ({
      tenant_id: tenantId,
      run_id: String(runRow.id),
      account_id: String(l.accountId),
      account_code: l.accountCode,
      account_name: l.accountName,
      foreign_balance: l.foreignBalance,
      book_local_value: l.bookLocalValue,
      revalued_local_value: l.revaluedLocalValue,
      unrealized_difference: l.unrealizedDifference,
    }));

    if (lineRows.length > 0) {
      await trx
        .insertInto('forex_revaluation_lines')
        .values(lineRows as any)
        .execute();
    }

    // Update the currency rate in currency_exchange_rates to the new closing rate
    await trx
      .updateTable('currency_exchange_rates')
      .set({
        exchange_rate: dto.closingRate,
        updated_at: sql`NOW()`,
      } as any)
      .where('tenant_id', '=', tenantId)
      .where('currency_code', '=', dto.currencyCode)
      .execute();

    return {
      ok: true,
      runId: runRow.id,
      journalEntryNo: entryNo,
      netUnrealizedGainLoss: preview.netUnrealizedGainLoss,
      totalForeignBalance: preview.totalForeignBalance,
      linesCount: preview.lines.length,
    };
    });
  }
}
