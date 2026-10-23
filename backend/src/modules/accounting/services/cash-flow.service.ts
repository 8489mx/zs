import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';

export interface CashFlowLine {
  labelAr: string;
  labelEn: string;
  amount: number;
  note?: string;
  noteEn?: string;
}

export interface CashFlowSection {
  titleAr: string;
  titleEn: string;
  total: number;
  lines: CashFlowLine[];
}

export interface CashFlowReportData {
  dateFrom: string;
  dateTo: string;
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
  reconciledCashActual: number;
  isReconciled: boolean;
}

@Injectable()
export class CashFlowService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private toMoney(value: unknown): number {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  }

  async getCashFlowStatement(
    auth: AuthContext,
    params: { dateFrom?: string; dateTo?: string; branchId?: number },
  ): Promise<CashFlowReportData> {
    const tenantId = auth.tenantId;

    // ZS-036: Prevent timezone day shift by parsing calendar dates as explicit UTC boundaries
    const parseReportBoundary = (d?: string, isEnd = false): { date: Date; dateStr: string } => {
      if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) {
        const dateStr = d.slice(0, 10);
        const [y, m, day] = dateStr.split('-').map(Number);
        return {
          date: isEnd
            ? new Date(Date.UTC(y, m - 1, day, 23, 59, 59, 999))
            : new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0)),
          dateStr,
        };
      }
      const now = new Date();
      if (!isEnd) {
        const y = now.getFullYear();
        return {
          date: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
          dateStr: `${y}-01-01`,
        };
      }
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return {
        date: new Date(Date.UTC(y, now.getMonth(), now.getDate(), 23, 59, 59, 999)),
        dateStr: `${y}-${m}-${day}`,
      };
    };

    const fromBoundary = parseReportBoundary(params.dateFrom, false);
    const toBoundary = parseReportBoundary(params.dateTo, true);
    const fromDate = fromBoundary.date;
    const toDate = toBoundary.date;
    const fromDateStr = fromBoundary.dateStr;
    const toDateStr = toBoundary.dateStr;

    // 1. Fetch cash & bank accounts (Cash & Cash Equivalents)
    const cashAccounts = await (this.db as any)
      .selectFrom('accounting_accounts')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .where((eb: any) =>
        eb.or([
          eb('is_cash_bank', '=', true),
          eb('account_group', '=', 'cash_and_banks'),
          eb('code', 'like', '111%'),
          eb('code', 'like', '112%'),
        ]),
      )
      .execute();

    const cashAccountIds = cashAccounts.map((a: any) => Number(a.id));

    // 2. Beginning cash balance (posted up to before fromDate)
    let begQuery = (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .select([
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('debit_sum'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('credit_sum'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('jel.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.entry_date', '<', fromDate);

    if (cashAccountIds.length > 0) {
      begQuery = begQuery.where('jel.account_id', 'in', cashAccountIds);
    } else {
      begQuery = begQuery.where('jel.account_id', '=', -1);
    }
    if (params.branchId) {
      begQuery = begQuery.where('jel.branch_id', '=', params.branchId);
    }
    const begRow = await begQuery.executeTakeFirst();
    const beginningCash = this.toMoney(Number(begRow?.debit_sum || 0) - Number(begRow?.credit_sum || 0));

    // 3. Ending cash balance (posted up to toDate)
    let endQuery = (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .select([
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('debit_sum'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('credit_sum'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('jel.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.entry_date', '<=', toDate);

    if (cashAccountIds.length > 0) {
      endQuery = endQuery.where('jel.account_id', 'in', cashAccountIds);
    } else {
      endQuery = endQuery.where('jel.account_id', '=', -1);
    }
    if (params.branchId) {
      endQuery = endQuery.where('jel.branch_id', '=', params.branchId);
    }
    const endRow = await endQuery.executeTakeFirst();
    const endingCash = this.toMoney(Number(endRow?.debit_sum || 0) - Number(endRow?.credit_sum || 0));

    // 4. Calculate Net Operating Income during the period
    let pnlQuery = (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .innerJoin('accounting_accounts as acc', 'acc.id', 'jel.account_id')
      .select([
        'acc.account_type',
        'acc.code',
        'acc.name_ar',
        'acc.name_en',
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('total_debit'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('total_credit'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('jel.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.source_type', 'not in', ['fiscal_year_closing', 'fiscal_year_reopen'])
      .where('je.entry_date', '>=', fromDate)
      .where('je.entry_date', '<=', toDate);

    if (params.branchId) {
      pnlQuery = pnlQuery.where('jel.branch_id', '=', params.branchId);
    }
    const pnlRows = await pnlQuery.groupBy(['acc.account_type', 'acc.code', 'acc.name_ar', 'acc.name_en']).execute();

    let netProfit = 0;
    let depreciationExpense = 0;
    let contraAssetDepreciation = 0;

    for (const r of pnlRows) {
      const type = String(r.account_type || '').toLowerCase();
      const code = String(r.code || '');
      const nameAr = String(r.name_ar || '');
      const nameEn = String(r.name_en || '').toLowerCase();
      const deb = Number(r.total_debit || 0);
      const cred = Number(r.total_credit || 0);

      if (type === 'revenue' || type === 'contra_revenue') {
        netProfit += cred - deb;
      } else if (type === 'expense' || type === 'contra_expense') {
        netProfit -= deb - cred;
        if (code === '6960' || nameAr.includes('إهلاك') || nameEn.includes('depreciation')) {
          depreciationExpense += deb - cred;
        }
      } else if (type === 'contra_asset' || code.startsWith('129')) {
        contraAssetDepreciation += cred - deb;
      }
    }

    if (depreciationExpense === 0 && contraAssetDepreciation !== 0) {
      depreciationExpense = contraAssetDepreciation;
    }

    netProfit = this.toMoney(netProfit);
    depreciationExpense = this.toMoney(depreciationExpense);

    // 5. Working capital changes during the period
    // Working Capital Accounts: Receivables & Advances (113, 116, 117), Inventory (114), Payables & Accrued Liabilities (211, 2125, 2130, 2135, 2140, 2150), Taxes (1150, 1155, 2120, 2126)
    let wcQuery = (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .innerJoin('accounting_accounts as acc', 'acc.id', 'jel.account_id')
      .select([
        'acc.id',
        'acc.account_type',
        'acc.code',
        'acc.is_receivable',
        'acc.is_payable',
        'acc.is_inventory',
        'acc.is_tax',
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('period_debit'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('period_credit'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('jel.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.entry_date', '>=', fromDate)
      .where('je.entry_date', '<=', toDate);

    if (params.branchId) {
      wcQuery = wcQuery.where('jel.branch_id', '=', params.branchId);
    }
    const wcRows = await wcQuery.groupBy(['acc.id', 'acc.account_type', 'acc.code', 'acc.is_receivable', 'acc.is_payable', 'acc.is_inventory', 'acc.is_tax']).execute();

    let changeInReceivables = 0; // Increase is cash outflow (-)
    let changeInInventory = 0;   // Increase is cash outflow (-)
    let changeInPayables = 0;    // Increase is cash inflow (+)
    let changeInTaxes = 0;       // Increase is cash inflow (+)
    const cashAccountIdSet = new Set<number>(cashAccountIds);

    for (const r of wcRows) {
      const accId = Number(r.id);
      if (cashAccountIdSet.has(accId)) continue;

      const code = String(r.code || '');
      const type = String(r.account_type || '').toLowerCase();
      const isTax = Boolean(r.is_tax) || ['1150', '1155', '2120', '2126'].includes(code);
      const isInv = !isTax && (Boolean(r.is_inventory) || code.startsWith('114'));
      const isRec = !isTax && !isInv && (Boolean(r.is_receivable) || code.startsWith('113') || code.startsWith('116') || code.startsWith('117') || (type === 'asset' && code.startsWith('11')));
      const isPay = !isTax && (Boolean(r.is_payable) || code.startsWith('211') || ['2125', '2130', '2135', '2140', '2150'].includes(code) || (type === 'liability' && code.startsWith('21')));

      const netDebit = Number(r.period_debit || 0) - Number(r.period_credit || 0);
      const netCredit = Number(r.period_credit || 0) - Number(r.period_debit || 0);

      if (isRec) changeInReceivables -= netDebit; // if debit > credit, receivables increased -> cash decreased
      if (isInv) changeInInventory -= netDebit;
      if (isPay) changeInPayables += netCredit;
      if (isTax) changeInTaxes += netCredit;
    }

    changeInReceivables = this.toMoney(changeInReceivables);
    changeInInventory = this.toMoney(changeInInventory);
    changeInPayables = this.toMoney(changeInPayables);
    changeInTaxes = this.toMoney(changeInTaxes);

    const operatingLines: CashFlowLine[] = [
      { labelAr: 'صافي الربح المحاسبي للفترة', labelEn: 'Net Accounting Profit', amount: netProfit },
      { labelAr: 'تسوية: مجمع ومصروف إهلاك الأصول (غير نقدي)', labelEn: 'Depreciation & Amortization', amount: depreciationExpense },
      { labelAr: 'التغير في أرصدة العملاء والمدينين', labelEn: 'Change in Accounts Receivable', amount: changeInReceivables, note: changeInReceivables < 0 ? 'زيادة أرصدة العملاء (تدفق خارج)' : 'تحصيل من العملاء (تدفق داخل)', noteEn: changeInReceivables < 0 ? 'Increase in Receivables (Outflow)' : 'Collection from Customers (Inflow)' },
      { labelAr: 'التغير في رصيد المخزون السلعي', labelEn: 'Change in Inventory', amount: changeInInventory, note: changeInInventory < 0 ? 'مشتريات وتخزين بضاعة (تدفق خارج)' : 'انخفاض رصيد المخزون (تدفق داخل)', noteEn: changeInInventory < 0 ? 'Purchases & Inventory Storage (Outflow)' : 'Decrease in Inventory (Inflow)' },
      { labelAr: 'التغير في أرصدة الموردين والدائنين', labelEn: 'Change in Accounts Payable', amount: changeInPayables, note: changeInPayables > 0 ? 'تأجيل سداد للموردين (تدفق داخل)' : 'سداد دفعات الموردين (تدفق خارج)', noteEn: changeInPayables > 0 ? 'Deferred Supplier Payments (Inflow)' : 'Supplier Payments (Outflow)' },
      { labelAr: 'التغير في الضرائب والالتزامات المستحقة', labelEn: 'Change in Accrued Taxes & Liabilities', amount: changeInTaxes },
    ];
    const totalOperating = this.toMoney(operatingLines.reduce((s, l) => s + l.amount, 0));

    // 6. Investing activities (Fixed assets purchases / disposals)
    let fixedAssetQuery = (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .innerJoin('accounting_accounts as acc', 'acc.id', 'jel.account_id')
      .select([
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('fa_debit'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('fa_credit'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('jel.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.entry_date', '>=', fromDate)
      .where('je.entry_date', '<=', toDate)
      .where((eb: any) =>
        eb.and([
          eb('acc.account_type', '=', 'asset'),
          eb.or([
            eb('acc.account_group', '=', 'fixed_assets'),
            eb('acc.code', 'like', '121%'),
            eb('acc.code', 'like', '122%'),
            eb('acc.code', 'like', '123%'),
          ]),
        ]),
      );

    if (params.branchId) {
      fixedAssetQuery = fixedAssetQuery.where('jel.branch_id', '=', params.branchId);
    }
    const fixedAssetRows = await fixedAssetQuery.executeTakeFirst();

    const faDebit = Number(fixedAssetRows?.fa_debit || 0);
    const faCredit = Number(fixedAssetRows?.fa_credit || 0);

    const assetPurchases = this.toMoney(-faDebit);
    const assetSales = this.toMoney(faCredit);

    const investingLines: CashFlowLine[] = [
      { labelAr: 'المدفوعات الرأسمالية لشراء أصول ومعدات جديدة', labelEn: 'Capital Expenditures / Purchase of Assets', amount: assetPurchases },
      { labelAr: 'متحصلات بيع أو استبعاد أصول ثابتة', labelEn: 'Proceeds from Asset Disposals', amount: assetSales },
    ];
    const totalInvesting = this.toMoney(investingLines.reduce((s, l) => s + l.amount, 0));

    // 7. Financing activities (Capital, Retained/Opening Equity, Loans, Owner Drawings)
    let financingQuery = (this.db as any)
      .selectFrom('journal_entry_lines as jel')
      .innerJoin('journal_entries as je', 'je.id', 'jel.journal_entry_id')
      .innerJoin('accounting_accounts as acc', 'acc.id', 'jel.account_id')
      .select([
        'acc.code',
        'acc.account_group',
        sql<number>`COALESCE(SUM(jel.debit), 0)`.as('f_debit'),
        sql<number>`COALESCE(SUM(jel.credit), 0)`.as('f_credit'),
      ])
      .where('je.tenant_id', '=', tenantId)
      .where('jel.tenant_id', '=', tenantId)
      .where('je.status', '=', 'posted')
      .where('je.source_type', 'not in', ['fiscal_year_closing', 'fiscal_year_reopen'])
      .where('je.entry_date', '>=', fromDate)
      .where('je.entry_date', '<=', toDate)
      .where((eb: any) =>
        eb.or([
          eb('acc.account_type', 'in', ['equity', 'contra_equity']),
          eb('acc.code', 'like', '22%'), // Long term debt
        ]),
      );

    if (params.branchId) {
      financingQuery = financingQuery.where('jel.branch_id', '=', params.branchId);
    }
    const financingAccounts = await financingQuery.groupBy(['acc.code', 'acc.account_group']).execute();

    let capitalContributions = 0;
    let ownerDrawings = 0;
    let loansChange = 0;

    for (const r of financingAccounts) {
      const code = String(r.code);
      const deb = Number(r.f_debit || 0);
      const cred = Number(r.f_credit || 0);

      if (code.startsWith('33') || r.account_group === 'drawings') {
        // Drawings
        ownerDrawings -= (deb - cred);
      } else if (code.startsWith('22')) {
        // Long term debt
        loansChange += (cred - deb);
      } else if (code.startsWith('3')) {
        // Capital & Retained/Opening Balance Equity (excluding fiscal_year_closing/reopen)
        capitalContributions += (cred - deb);
      }
    }

    capitalContributions = this.toMoney(capitalContributions);
    ownerDrawings = this.toMoney(ownerDrawings);
    loansChange = this.toMoney(loansChange);

    const financingLines: CashFlowLine[] = [
      { labelAr: 'المساهمات في رأس المال وضخ السيولة', labelEn: 'Capital Contributions', amount: capitalContributions },
      { labelAr: 'مسحوبات وتوزيعات أرباح الشركاء والمالك', labelEn: 'Owner Drawings / Dividends', amount: ownerDrawings },
      { labelAr: 'صافي حركة القروض والتمويلات البنكية', labelEn: 'Net Loans & Bank Borrowings', amount: loansChange },
    ];
    const totalFinancing = this.toMoney(financingLines.reduce((s, l) => s + l.amount, 0));

    // 8. Net cash flow & reconciliation
    const netCashFlow = this.toMoney(totalOperating + totalInvesting + totalFinancing);
    const calculatedEndingCash = this.toMoney(beginningCash + netCashFlow);
    const diff = Math.abs(calculatedEndingCash - endingCash);
    const isReconciled = diff <= 1.0; // Allow micro rounding diff

    return {
      dateFrom: fromDateStr,
      dateTo: toDateStr,
      operatingActivities: {
        titleAr: 'التدفقات النقدية من الأنشطة التشغيلية',
        titleEn: 'Cash Flow from Operating Activities',
        total: totalOperating,
        lines: operatingLines,
      },
      investingActivities: {
        titleAr: 'التدفقات النقدية من الأنشطة الاستثمارية',
        titleEn: 'Cash Flow from Investing Activities',
        total: totalInvesting,
        lines: investingLines,
      },
      financingActivities: {
        titleAr: 'التدفقات النقدية من الأنشطة التمويلية',
        titleEn: 'Cash Flow from Financing Activities',
        total: totalFinancing,
        lines: financingLines,
      },
      netCashFlow,
      beginningCash,
      endingCash,
      reconciledCashActual: endingCash,
      isReconciled,
    };
  }
}
