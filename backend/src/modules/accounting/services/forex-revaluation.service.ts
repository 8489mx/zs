import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { KYSELY_DB } from '../../../database/database.constants';
import { Kysely, sql } from '../../../database/kysely';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

export interface ExecuteForexRevaluationDto {
  periodDate: string;
  currencyCode: string;
  closingRate: number;
  notes?: string;
}

@Injectable()
export class ForexRevaluationService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
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

  async previewRevaluation(dto: { periodDate: string; currencyCode: string; closingRate: number }, auth: AuthContext) {
    const { tenantId } = requireTenantScope(auth);
    const currencyCode = String(dto.currencyCode || '').trim().toUpperCase();
    const closingRate = Number(dto.closingRate || 0);

    if (!currencyCode) throw new BadRequestException('رمز العملة مطلوب.');
    if (closingRate <= 0) throw new BadRequestException('سعر الإقفال للعملة يجب أن يكون أكبر من الصفر.');

    // Fetch current book rate
    const currentRateRow = await this.db
      .selectFrom('currency_exchange_rates')
      .select(['exchange_rate'])
      .where('tenant_id', '=', tenantId)
      .where('currency_code', '=', currencyCode)
      .executeTakeFirst();

    const bookRate = Number(currentRateRow?.exchange_rate || closingRate);

    // Fetch monetary accounts related to banks, cash treasuries, or foreign partners
    // Typically cash & bank accounts (1200 series) or foreign receivables / payables
    const accounts = await (this.db as any)
      .selectFrom('accounting_accounts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where((eb: any) =>
        eb.or([
          eb('name', 'ilike', `%${currencyCode}%`),
          eb('name', 'ilike', `%دولار%`),
          eb('name', 'ilike', `%عملة أجنبية%`),
          eb('name', 'ilike', `%حساب أجنبي%`),
          eb('type', '=', 'bank_cash'),
        ])
      )
      .execute();

    // If no specific accounts tagged with foreign, also check treasuries
    const treasuries = await (this.db as any)
      .selectFrom('treasuries')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('currency', '=', currencyCode),
          eb('name', 'ilike', `%${currencyCode}%`),
          eb('name', 'ilike', `%دولار%`),
        ])
      )
      .execute();

    const lines: any[] = [];
    let totalForeign = 0;
    let totalUnrealizedGainLoss = 0;

    // Process accounts
    for (const acc of accounts) {
      // Calculate foreign balance from account entries or balance
      const balanceRes = await (this.db as any)
        .selectFrom('journal_entry_lines as l')
        .innerJoin('journal_entries as h', 'h.id', 'l.journal_entry_id')
        .select([
          sql<number>`COALESCE(SUM(l.debit - l.credit), 0)`.as('balance'),
        ])
        .where('l.tenant_id', '=', tenantId)
        .where('l.account_id', '=', acc.id)
        .where('h.status', '=', 'posted')
        .where('h.entry_date', '<=', dto.periodDate)
        .executeTakeFirst();

      const localBalance = Number(balanceRes?.balance || 0);
      if (Math.abs(localBalance) > 0.01) {
        // Approximate foreign balance based on bookRate
        const foreignBalance = Math.round((localBalance / bookRate) * 100) / 100;
        const revaluedLocal = Math.round(foreignBalance * closingRate * 100) / 100;
        const diff = Math.round((revaluedLocal - localBalance) * 100) / 100;

        lines.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          foreignBalance,
          bookLocalValue: localBalance,
          revaluedLocalValue: revaluedLocal,
          unrealizedDifference: diff,
        });

        totalForeign += foreignBalance;
        totalUnrealizedGainLoss += diff;
      }
    }

    // Process foreign treasuries if not already covered
    for (const tr of treasuries) {
      const alreadyIn = lines.some((l) => l.accountName === tr.name);
      if (!alreadyIn && Number(tr.current_balance || 0) > 0) {
        const foreignBalance = Number(tr.current_balance);
        const bookLocal = Math.round(foreignBalance * bookRate * 100) / 100;
        const revaluedLocal = Math.round(foreignBalance * closingRate * 100) / 100;
        const diff = Math.round((revaluedLocal - bookLocal) * 100) / 100;

        lines.push({
          accountId: tr.account_id || tr.id,
          accountCode: tr.code || `TR-${tr.id}`,
          accountName: tr.name,
          foreignBalance,
          bookLocalValue: bookLocal,
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
    let gainLossAccount = await (this.db as any)
      .selectFrom('accounting_accounts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where((eb: any) =>
        eb.or([
          eb('name', 'ilike', '%فروق عملة%'),
          eb('name', 'ilike', '%فروق تقييم%'),
          eb('name', 'ilike', '%أرباح وخسائر فروق العملة%'),
          eb('code', 'in', ['4400', '4800', '5400', '5800']),
        ])
      )
      .executeTakeFirst();

    if (!gainLossAccount) {
      // Fallback: pick other income / expense account
      gainLossAccount = await (this.db as any)
        .selectFrom('accounting_accounts')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('type', 'in', ['revenue', 'expense'])
        .executeTakeFirst();
    }

    const isGain = preview.netUnrealizedGainLoss >= 0;
    const absDiff = Math.abs(preview.netUnrealizedGainLoss);

    // Build journal entry lines if difference != 0
    let createdEntryId: number | null = null;
    let entryNo: string | null = null;

    if (absDiff > 0.01 && gainLossAccount) {
      const entryLines: any[] = [];

      for (const line of preview.lines) {
        if (Math.abs(line.unrealizedDifference) > 0.01) {
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
      if (isGain) {
        entryLines.push({
          account_id: gainLossAccount.id,
          debit: 0,
          credit: absDiff,
          description: `إثبات أرباح فروق عملة غير محققة (${dto.currencyCode}) بنهاية فترة ${dto.periodDate}`,
        });
      } else {
        entryLines.push({
          account_id: gainLossAccount.id,
          debit: absDiff,
          credit: 0,
          description: `إثبات خسائر فروق عملة غير محققة (${dto.currencyCode}) بنهاية فترة ${dto.periodDate}`,
        });
      }

      // Post Journal Entry directly
      const tempEntryNo = `FX-TEMP-${Date.now()}`;
      const description = `قيد تسوية فروق تقييم العملة الأجنبية (${dto.currencyCode}) بسعر ${dto.closingRate} ج.م وفق معيار IAS 21`;

      const insertedEntry = await this.db
        .insertInto('journal_entries')
        .values({
          entry_no: tempEntryNo,
          tenant_id: tenantId,
          account_id: auth.accountId || tenantId,
          entry_date: new Date(dto.periodDate) as any,
          description,
          source_type: 'forex_revaluation',
          source_id: 0,
          status: 'posted',
          created_by: auth.userId || 0,
          posted_by: auth.userId || 0,
          posted_at: sql`NOW()` as any,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const entryId = Number(insertedEntry.id);
      createdEntryId = entryId;
      entryNo = `FX-${dto.currencyCode}-${new Date(dto.periodDate).getFullYear()}-${String(entryId).padStart(6, '0')}`;

      await this.db
        .updateTable('journal_entries')
        .set({
          entry_no: entryNo,
          updated_at: sql`NOW()` as any,
        } as any)
        .where('id', '=', entryId)
        .where('tenant_id', '=', tenantId)
        .execute();

      const linesToInsert = entryLines.map((l) => ({
        journal_entry_id: entryId,
        tenant_id: tenantId,
        account_id: l.account_id,
        cost_center_id: null,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
        partner_type: 'none',
        partner_id: null,
        created_at: sql`NOW()` as any,
      }));

      await this.db
        .insertInto('journal_entry_lines')
        .values(linesToInsert as any)
        .execute();
    }

    // Save run record
    const runRow = await this.db
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
      await this.db
        .insertInto('forex_revaluation_lines')
        .values(lineRows as any)
        .execute();
    }

    // Update the currency rate in currency_exchange_rates to the new closing rate
    await this.db
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
  }
}
