import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import { CashMovementQueryDto, FinancialSummaryQueryDto, InventoryValueQueryDto, JournalEntriesQueryDto, ReceivablesPayablesQueryDto } from './dto/accounting.dto';

type PartnerType = 'none' | 'customer' | 'supplier';

type DraftJournalLineInput = {
  accountId: number;
  description?: string;
  debit?: number;
  credit?: number;
  partnerType?: PartnerType;
  partnerId?: number | null;
  branchId?: number | null;
  locationId?: number | null;
};

type DraftJournalEntryInput = {
  entryDate?: Date;
  description?: string;
  sourceType?: string;
  sourceId?: number | null;
  branchId?: number | null;
  locationId?: number | null;
  lines: DraftJournalLineInput[];
};

@Injectable()
export class AccountingService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private assertAccountingAccess(auth: AuthContext): void {
    if (auth.role === 'super_admin' || auth.role === 'admin' || auth.permissions.includes('accounting')) {
      return;
    }
    throw new ForbiddenException('Missing required permissions');
  }

  private toMoney(value: unknown): number {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 0;
    return Number(amount.toFixed(2));
  }

  private normalizePartnerType(value: unknown): PartnerType | null {
    if (value === undefined || value === null || String(value).trim() === '') return 'none';
    if (value === 'none' || value === 'customer' || value === 'supplier') return value;
    return null;
  }

  async listAccounts(auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const rows = await this.db
      .selectFrom('accounting_accounts')
      .select([
        'id',
        'code',
        'name_ar',
        'name_en',
        'account_type',
        'account_group',
        'parent_id',
        'normal_balance',
        'is_active',
        'is_system',
        'allow_manual_entries',
        'is_control_account',
        'is_cash_bank',
        'is_receivable',
        'is_payable',
        'is_inventory',
        'is_tax',
        'sort_order',
      ])
      .orderBy('code asc')
      .execute();

    const rowsById = new Map(rows.map((row) => [String(row.id), row]));
    const depthById = new Map<string, number>();
    const computeDepth = (id: string): number => {
      const cached = depthById.get(id);
      if (typeof cached === 'number') return cached;
      const row = rowsById.get(id);
      if (!row || !row.parent_id) {
        depthById.set(id, 0);
        return 0;
      }
      const parentDepth = computeDepth(String(row.parent_id));
      const depth = parentDepth + 1;
      depthById.set(id, depth);
      return depth;
    };
    for (const row of rows) {
      computeDepth(String(row.id));
    }

    return {
      accounts: rows.map((row) => ({
        id: String(row.id),
        code: row.code,
        nameAr: row.name_ar,
        nameEn: row.name_en || '',
        accountType: row.account_type,
        accountGroup: row.account_group || '',
        parentId: row.parent_id ? String(row.parent_id) : '',
        depth: depthById.get(String(row.id)) || 0,
        normalBalance: row.normal_balance,
        isActive: Boolean(row.is_active),
        isSystem: Boolean(row.is_system),
        allowManualEntries: Boolean(row.allow_manual_entries),
        isControlAccount: Boolean(row.is_control_account),
        flags: {
          isCashBank: Boolean(row.is_cash_bank),
          isReceivable: Boolean(row.is_receivable),
          isPayable: Boolean(row.is_payable),
          isInventory: Boolean(row.is_inventory),
          isTax: Boolean(row.is_tax),
        },
        sortOrder: Number(row.sort_order || 0),
      })),
    };
  }

  private inCodes(code: string, codes: string[]): boolean {
    return codes.includes(String(code || '').trim());
  }

  private mapPeriod(dateFrom?: string, dateTo?: string): { from: string | null; to: string | null } {
    return {
      from: dateFrom ? String(dateFrom).slice(0, 10) : null,
      to: dateTo ? String(dateTo).slice(0, 10) : null,
    };
  }

  private tenantPredicate(auth: AuthContext, alias?: string) {
    const scope = requireTenantScope(auth);
    return alias
      ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${scope.tenantId}`
      : sql<boolean>`tenant_id = ${scope.tenantId}`;
  }

  async getAccountingSettings(auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const settings = await this.db.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) {
      return { settings: null };
    }

    const accountIds = [
      settings.cash_account_id,
      settings.bank_account_id,
      settings.customer_receivable_account_id,
      settings.supplier_payable_account_id,
      settings.inventory_account_id,
      settings.sales_revenue_account_id,
      settings.sales_discount_account_id,
      settings.cogs_account_id,
      settings.purchase_account_id,
      settings.expenses_account_id,
      settings.sales_tax_account_id,
      settings.purchase_tax_account_id,
    ].filter((value): value is number => Number(value || 0) > 0);

    const accounts = accountIds.length
      ? await this.db.selectFrom('accounting_accounts').select(['id', 'code', 'name_ar', 'name_en']).where('id', 'in', accountIds).execute()
      : [];

    const accountById = new Map(accounts.map((row) => [Number(row.id), row]));
    const mapRef = (id: number | null) => {
      if (!id) return null;
      const account = accountById.get(Number(id));
      if (!account) return { id: String(id) };
      return {
        id: String(account.id),
        code: account.code,
        nameAr: account.name_ar,
        nameEn: account.name_en || '',
      };
    };

    return {
      settings: {
        id: settings.id,
        cashAccount: mapRef(settings.cash_account_id),
        bankAccount: mapRef(settings.bank_account_id),
        customerReceivableAccount: mapRef(settings.customer_receivable_account_id),
        supplierPayableAccount: mapRef(settings.supplier_payable_account_id),
        inventoryAccount: mapRef(settings.inventory_account_id),
        salesRevenueAccount: mapRef(settings.sales_revenue_account_id),
        salesDiscountAccount: mapRef(settings.sales_discount_account_id),
        cogsAccount: mapRef(settings.cogs_account_id),
        purchaseAccount: mapRef(settings.purchase_account_id),
        expensesAccount: mapRef(settings.expenses_account_id),
        salesTaxAccount: mapRef(settings.sales_tax_account_id),
        purchaseTaxAccount: mapRef(settings.purchase_tax_account_id),
        updatedAt: settings.updated_at,
      },
    };
  }

  async listJournalEntries(filters: JournalEntriesQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(filters.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

    let countQuery = this.db.selectFrom('journal_entries');
    let rowsQuery = this.db
      .selectFrom('journal_entries as je')
      .leftJoin('users as creator', 'creator.id', 'je.created_by')
      .leftJoin('users as poster', 'poster.id', 'je.posted_by')
      .select([
        'je.id',
        'je.entry_no',
        'je.entry_date',
        'je.description',
        'je.source_type',
        'je.source_id',
        'je.status',
        'je.branch_id',
        'je.location_id',
        'je.created_by',
        'je.posted_by',
        'je.posted_at',
        'je.cancelled_at',
        'je.created_at',
        'creator.username as created_by_name',
        'poster.username as posted_by_name',
      ]);

    if (dateFrom) {
      countQuery = countQuery.where('entry_date', '>=', dateFrom);
      rowsQuery = rowsQuery.where('je.entry_date', '>=', dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.where('entry_date', '<=', dateTo);
      rowsQuery = rowsQuery.where('je.entry_date', '<=', dateTo);
    }
    if (filters.status) {
      countQuery = countQuery.where('status', '=', filters.status);
      rowsQuery = rowsQuery.where('je.status', '=', filters.status);
    }
    if (filters.sourceType) {
      countQuery = countQuery.where('source_type', '=', filters.sourceType.trim());
      rowsQuery = rowsQuery.where('je.source_type', '=', filters.sourceType.trim());
    }

    const totalRow = await countQuery.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirst();
    const totalItems = Number(totalRow?.count || 0);
    const rows = await rowsQuery
      .orderBy('je.created_at', 'desc')
      .orderBy('je.id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    return {
      entries: rows.map((row) => ({
        id: String(row.id),
        entryNo: row.entry_no,
        entryDate: row.entry_date,
        description: row.description || '',
        sourceType: row.source_type || 'manual',
        sourceId: row.source_id ? String(row.source_id) : '',
        status: row.status,
        branchId: row.branch_id ? String(row.branch_id) : '',
        locationId: row.location_id ? String(row.location_id) : '',
        createdBy: row.created_by ? String(row.created_by) : '',
        createdByName: row.created_by_name || '',
        postedBy: row.posted_by ? String(row.posted_by) : '',
        postedByName: row.posted_by_name || '',
        postedAt: row.posted_at,
        cancelledAt: row.cancelled_at,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }

  async getJournalEntry(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const entry = await this.db.selectFrom('journal_entries').selectAll().where('id', '=', id).executeTakeFirst();
    if (!entry) throw new NotFoundException('Journal entry not found');

    const lines = await this.db
      .selectFrom('journal_entry_lines as l')
      .innerJoin('accounting_accounts as a', 'a.id', 'l.account_id')
      .select([
        'l.id',
        'l.journal_entry_id',
        'l.account_id',
        'l.description',
        'l.debit',
        'l.credit',
        'l.partner_type',
        'l.partner_id',
        'l.branch_id',
        'l.location_id',
        'a.code as account_code',
        'a.name_ar as account_name_ar',
        'a.name_en as account_name_en',
      ])
      .where('l.journal_entry_id', '=', id)
      .orderBy('l.id asc')
      .execute();

    const totalDebit = this.toMoney(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
    const totalCredit = this.toMoney(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));

    return {
      entry: {
        id: String(entry.id),
        entryNo: entry.entry_no,
        entryDate: entry.entry_date,
        description: entry.description || '',
        sourceType: entry.source_type || 'manual',
        sourceId: entry.source_id ? String(entry.source_id) : '',
        status: entry.status,
        branchId: entry.branch_id ? String(entry.branch_id) : '',
        locationId: entry.location_id ? String(entry.location_id) : '',
        createdBy: entry.created_by ? String(entry.created_by) : '',
        postedBy: entry.posted_by ? String(entry.posted_by) : '',
        postedAt: entry.posted_at,
        cancelledBy: entry.cancelled_by ? String(entry.cancelled_by) : '',
        cancelledAt: entry.cancelled_at,
        cancelReason: entry.cancel_reason || '',
        lines: lines.map((line) => ({
          id: String(line.id),
          accountId: String(line.account_id),
          accountCode: line.account_code,
          accountNameAr: line.account_name_ar,
          accountNameEn: line.account_name_en || '',
          description: line.description || '',
          debit: this.toMoney(line.debit),
          credit: this.toMoney(line.credit),
          partnerType: line.partner_type,
          partnerId: line.partner_id ? String(line.partner_id) : '',
          branchId: line.branch_id ? String(line.branch_id) : '',
          locationId: line.location_id ? String(line.location_id) : '',
        })),
        totals: {
          debit: totalDebit,
          credit: totalCredit,
          balanced: Math.abs(totalDebit - totalCredit) <= 0.0001,
        },
      },
    };
  }

  async getFinancialSummary(filters: FinancialSummaryQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);

    const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    const branchId = Number(filters.branch_id || 0) > 0 ? Number(filters.branch_id) : null;
    const locationId = Number(filters.location_id || 0) > 0 ? Number(filters.location_id) : null;

    let query = this.db
      .selectFrom('journal_entry_lines as l')
      .innerJoin('journal_entries as je', 'je.id', 'l.journal_entry_id')
      .innerJoin('accounting_accounts as a', 'a.id', 'l.account_id')
      .select([
        'a.code as account_code',
        'a.name_ar as account_name_ar',
        'a.account_type as account_type',
        'a.account_group as account_group',
        'l.debit as debit',
        'l.credit as credit',
        'je.source_type as source_type',
      ])
      .where('je.status', '=', 'posted');

    if (dateFrom) {
      query = query.where('je.entry_date', '>=', dateFrom);
    }
    if (dateTo) {
      query = query.where('je.entry_date', '<=', dateTo);
    }
    if (branchId) {
      query = query.where('je.branch_id', '=', branchId);
    }
    if (locationId) {
      query = query.where('je.location_id', '=', locationId);
    }

    const rows = await query.execute();

    const REVENUE_CODES = ['4100', '4200'];
    const CONTRA_REVENUE_CODES = ['4300', '4400'];
    const COGS_CODES = ['5100', '5200', '5300'];
    const CASH_BANK_CODES = ['1110', '1120'];

    let grossSales = 0;
    let salesReturns = 0;
    let salesDiscounts = 0;
    let cogs = 0;
    let operatingExpenses = 0;
    let customerCollections = 0;
    let supplierPayments = 0;
    let treasuryExpenses = 0;
    let cashDebits = 0;
    let cashCredits = 0;

    const revenueBreakdown = new Map<string, { accountCode: string; accountNameAr: string; amount: number }>();
    const expenseBreakdown = new Map<string, { accountCode: string; accountNameAr: string; amount: number }>();
    const cashBreakdown = new Map<string, { accountCode: string; accountNameAr: string; amount: number }>();

    for (const row of rows) {
      const code = String(row.account_code || '');
      const accountNameAr = String(row.account_name_ar || '');
      const accountType = String(row.account_type || '');
      const accountGroup = String(row.account_group || '');
      const debit = this.toMoney(row.debit);
      const credit = this.toMoney(row.credit);
      const sourceType = String(row.source_type || '');
      const revenueMovement = this.toMoney(credit - debit);
      const expenseMovement = this.toMoney(debit - credit);

      if (this.inCodes(code, REVENUE_CODES) || accountType === 'revenue') {
        if (!this.inCodes(code, CONTRA_REVENUE_CODES) && accountType !== 'contra_revenue') {
          grossSales = this.toMoney(grossSales + Math.max(0, revenueMovement));
          const current = revenueBreakdown.get(code) || { accountCode: code, accountNameAr, amount: 0 };
          current.amount = this.toMoney(current.amount + Math.max(0, revenueMovement));
          revenueBreakdown.set(code, current);
        }
      }

      if (code === '4400') {
        salesReturns = this.toMoney(salesReturns + Math.max(0, expenseMovement));
      }
      if (code === '4300') {
        salesDiscounts = this.toMoney(salesDiscounts + Math.max(0, expenseMovement));
      }
      if (accountType === 'contra_revenue' && !this.inCodes(code, ['4300', '4400'])) {
        salesReturns = this.toMoney(salesReturns + Math.max(0, expenseMovement));
      }

      if (this.inCodes(code, COGS_CODES) || accountGroup === 'cogs') {
        cogs = this.toMoney(cogs + Math.max(0, expenseMovement));
      }

      const isOperatingExpense = (accountType === 'expense' || accountGroup === 'operating_expenses')
        && !this.inCodes(code, COGS_CODES);
      if (isOperatingExpense) {
        operatingExpenses = this.toMoney(operatingExpenses + Math.max(0, expenseMovement));
        const current = expenseBreakdown.get(code) || { accountCode: code, accountNameAr, amount: 0 };
        current.amount = this.toMoney(current.amount + Math.max(0, expenseMovement));
        expenseBreakdown.set(code, current);
      }

      if (this.inCodes(code, CASH_BANK_CODES) || accountGroup === 'cash_bank') {
        cashDebits = this.toMoney(cashDebits + Math.max(0, debit));
        cashCredits = this.toMoney(cashCredits + Math.max(0, credit));
        const movement = this.toMoney(debit - credit);
        const current = cashBreakdown.get(code) || { accountCode: code, accountNameAr, amount: 0 };
        current.amount = this.toMoney(current.amount + movement);
        cashBreakdown.set(code, current);

        if (sourceType === 'customer_payment' && debit > 0) {
          customerCollections = this.toMoney(customerCollections + debit);
        }
        if ((sourceType === 'supplier_payment' || sourceType === 'supplier_payment_schedule_settlement') && credit > 0) {
          supplierPayments = this.toMoney(supplierPayments + credit);
        }
        if ((sourceType === 'expense' || sourceType === 'treasury_expense') && credit > 0) {
          treasuryExpenses = this.toMoney(treasuryExpenses + credit);
        }
      }
    }

    const netSales = this.toMoney(grossSales - salesReturns - salesDiscounts);
    const grossProfit = this.toMoney(netSales - cogs);
    const netProfit = this.toMoney(grossProfit - operatingExpenses);
    // This is period movement only (not an opening/closing balance).
    const netCashMovement = this.toMoney(cashDebits - cashCredits);

    const asArray = (map: Map<string, { accountCode: string; accountNameAr: string; amount: number }>) =>
      Array.from(map.values()).sort((a, b) => Number(a.accountCode || 0) - Number(b.accountCode || 0));

    return {
      period: this.mapPeriod(filters.date_from, filters.date_to),
      cards: {
        grossSales,
        salesReturns,
        salesDiscounts,
        netSales,
        cogs,
        grossProfit,
        operatingExpenses,
        netProfit,
        customerCollections,
        supplierPayments,
        treasuryExpenses,
        netCashMovement,
      },
      breakdowns: {
        revenueAccounts: asArray(revenueBreakdown),
        expenseAccounts: asArray(expenseBreakdown),
        cashMovements: asArray(cashBreakdown),
      },
    };
  }

  async getReceivablesPayables(filters: ReceivablesPayablesQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    const branchId = Number(filters.branch_id || 0) > 0 ? Number(filters.branch_id) : null;
    const locationId = Number(filters.location_id || 0) > 0 ? Number(filters.location_id) : null;
    const showZero = String(filters.show_zero || '').trim().toLowerCase() === 'true';

    if (!dateTo && !branchId && !locationId) {
      const [customers, suppliers, customerLastRows, supplierLastRows] = await Promise.all([
        this.db
          .selectFrom('customers')
          .select(['id', 'name', 'phone', 'balance'])
          .where('is_active', '=', true)
          .where(this.tenantPredicate(auth))
          .orderBy('name asc')
          .execute(),
        this.db
          .selectFrom('suppliers')
          .select(['id', 'name', 'phone', 'balance'])
          .where('is_active', '=', true)
          .where(this.tenantPredicate(auth))
          .orderBy('name asc')
          .execute(),
        this.db
          .selectFrom('customer_ledger')
          .select(['customer_id', (eb) => eb.fn.max('created_at').as('last_movement_at')])
          .where(this.tenantPredicate(auth))
          .groupBy('customer_id')
          .execute(),
        this.db
          .selectFrom('supplier_ledger')
          .select(['supplier_id', (eb) => eb.fn.max('created_at').as('last_movement_at')])
          .where(this.tenantPredicate(auth))
          .groupBy('supplier_id')
          .execute(),
      ]);

      const customerLastMap = new Map(customerLastRows.map((row) => [String(row.customer_id || ''), row.last_movement_at ? String(row.last_movement_at) : '']));
      const supplierLastMap = new Map(supplierLastRows.map((row) => [String(row.supplier_id || ''), row.last_movement_at ? String(row.last_movement_at) : '']));

      const customerRows = customers
        .map((row) => ({
          customerId: String(row.id),
          customerName: row.name || '',
          phone: row.phone || '',
          balance: this.toMoney(row.balance),
          lastMovementDate: customerLastMap.get(String(row.id)) || '',
        }))
        .filter((row) => showZero || Math.abs(row.balance) > 0.0001);

      const supplierRows = suppliers
        .map((row) => ({
          supplierId: String(row.id),
          supplierName: row.name || '',
          phone: row.phone || '',
          balance: this.toMoney(row.balance),
          lastMovementDate: supplierLastMap.get(String(row.id)) || '',
        }))
        .filter((row) => showZero || Math.abs(row.balance) > 0.0001);

      const customerReceivables = this.toMoney(
        customerRows.reduce((sum, row) => sum + (row.balance > 0 ? row.balance : 0), 0),
      );
      const supplierPayables = this.toMoney(
        supplierRows.reduce((sum, row) => sum + (row.balance > 0 ? row.balance : 0), 0),
      );

      return {
        totals: {
          customerReceivables,
          supplierPayables,
          netPosition: this.toMoney(customerReceivables - supplierPayables),
        },
        customers: customerRows.sort((a, b) => b.balance - a.balance),
        suppliers: supplierRows.sort((a, b) => b.balance - a.balance),
      };
    }

    let customerLedgerQuery = this.db
      .selectFrom('customer_ledger')
      .select([
        'customer_id',
        (eb) => eb.fn.sum<number>('amount').as('balance_total'),
        (eb) => eb.fn.max('created_at').as('last_movement_at'),
      ])
      .where(this.tenantPredicate(auth));

    let supplierLedgerQuery = this.db
      .selectFrom('supplier_ledger')
      .select([
        'supplier_id',
        (eb) => eb.fn.sum<number>('amount').as('balance_total'),
        (eb) => eb.fn.max('created_at').as('last_movement_at'),
      ])
      .where(this.tenantPredicate(auth));

    if (dateTo) {
      customerLedgerQuery = customerLedgerQuery.where('created_at', '<=', dateTo);
      supplierLedgerQuery = supplierLedgerQuery.where('created_at', '<=', dateTo);
    }
    if (branchId) {
      customerLedgerQuery = customerLedgerQuery.where('branch_id', '=', branchId);
      supplierLedgerQuery = supplierLedgerQuery.where('branch_id', '=', branchId);
    }
    if (locationId) {
      customerLedgerQuery = customerLedgerQuery.where('location_id', '=', locationId);
      supplierLedgerQuery = supplierLedgerQuery.where('location_id', '=', locationId);
    }

    const [customerLedgers, supplierLedgers, customers, suppliers] = await Promise.all([
      customerLedgerQuery.groupBy('customer_id').execute(),
      supplierLedgerQuery.groupBy('supplier_id').execute(),
      this.db.selectFrom('customers').select(['id', 'name', 'phone']).where('is_active', '=', true).where(this.tenantPredicate(auth)).execute(),
      this.db.selectFrom('suppliers').select(['id', 'name', 'phone']).where('is_active', '=', true).where(this.tenantPredicate(auth)).execute(),
    ]);

    const customerInfo = new Map(customers.map((row) => [String(row.id), row]));
    const supplierInfo = new Map(suppliers.map((row) => [String(row.id), row]));

    const customerRows = customerLedgers
      .map((row) => {
        const customer = customerInfo.get(String(row.customer_id || ''));
        return {
          customerId: String(row.customer_id || ''),
          customerName: customer?.name || '',
          phone: customer?.phone || '',
          balance: this.toMoney(row.balance_total || 0),
          lastMovementDate: row.last_movement_at ? String(row.last_movement_at) : '',
        };
      })
      .filter((row) => row.customerId)
      .filter((row) => showZero || Math.abs(row.balance) > 0.0001)
      .sort((a, b) => b.balance - a.balance);

    const supplierRows = supplierLedgers
      .map((row) => {
        const supplier = supplierInfo.get(String(row.supplier_id || ''));
        return {
          supplierId: String(row.supplier_id || ''),
          supplierName: supplier?.name || '',
          phone: supplier?.phone || '',
          balance: this.toMoney(row.balance_total || 0),
          lastMovementDate: row.last_movement_at ? String(row.last_movement_at) : '',
        };
      })
      .filter((row) => row.supplierId)
      .filter((row) => showZero || Math.abs(row.balance) > 0.0001)
      .sort((a, b) => b.balance - a.balance);

    const customerReceivables = this.toMoney(
      customerRows.reduce((sum, row) => sum + (row.balance > 0 ? row.balance : 0), 0),
    );
    const supplierPayables = this.toMoney(
      supplierRows.reduce((sum, row) => sum + (row.balance > 0 ? row.balance : 0), 0),
    );

    return {
      totals: {
        customerReceivables,
        supplierPayables,
        netPosition: this.toMoney(customerReceivables - supplierPayables),
      },
      customers: customerRows,
      suppliers: supplierRows,
    };
  }

  async getCashMovement(filters: CashMovementQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const dateFrom = filters.date_from ? new Date(filters.date_from) : null;
    const dateTo = filters.date_to ? new Date(filters.date_to) : null;
    const branchId = Number(filters.branch_id || 0) > 0 ? Number(filters.branch_id) : null;
    const locationId = Number(filters.location_id || 0) > 0 ? Number(filters.location_id) : null;

    let query = this.db
      .selectFrom('journal_entry_lines as l')
      .innerJoin('journal_entries as je', 'je.id', 'l.journal_entry_id')
      .innerJoin('accounting_accounts as a', 'a.id', 'l.account_id')
      .select([
        'a.code as account_code',
        'a.name_ar as account_name_ar',
        'je.source_type as source_type',
        'je.entry_date as entry_date',
        'l.debit as debit',
        'l.credit as credit',
      ])
      .where('je.status', '=', 'posted')
      .where('a.code', 'in', ['1110', '1120']);

    if (dateFrom) query = query.where('je.entry_date', '>=', dateFrom);
    if (dateTo) query = query.where('je.entry_date', '<=', dateTo);
    if (branchId) query = query.where('je.branch_id', '=', branchId);
    if (locationId) query = query.where('je.location_id', '=', locationId);

    const rows = await query.orderBy('je.entry_date desc').execute();

    let totalDebit = 0;
    let totalCredit = 0;
    const byAccount = new Map<string, { accountCode: string; accountNameAr: string; debit: number; credit: number; net: number }>();
    const bySource = new Map<string, { sourceType: string; debit: number; credit: number; net: number }>();

    for (const row of rows) {
      const debit = this.toMoney(row.debit);
      const credit = this.toMoney(row.credit);
      const sourceType = String(row.source_type || 'other');
      const accountCode = String(row.account_code || '');
      const accountNameAr = String(row.account_name_ar || '');

      totalDebit = this.toMoney(totalDebit + debit);
      totalCredit = this.toMoney(totalCredit + credit);

      const accountItem = byAccount.get(accountCode) || { accountCode, accountNameAr, debit: 0, credit: 0, net: 0 };
      accountItem.debit = this.toMoney(accountItem.debit + debit);
      accountItem.credit = this.toMoney(accountItem.credit + credit);
      accountItem.net = this.toMoney(accountItem.debit - accountItem.credit);
      byAccount.set(accountCode, accountItem);

      const sourceItem = bySource.get(sourceType) || { sourceType, debit: 0, credit: 0, net: 0 };
      sourceItem.debit = this.toMoney(sourceItem.debit + debit);
      sourceItem.credit = this.toMoney(sourceItem.credit + credit);
      sourceItem.net = this.toMoney(sourceItem.debit - sourceItem.credit);
      bySource.set(sourceType, sourceItem);
    }

    return {
      period: this.mapPeriod(filters.date_from, filters.date_to),
      totals: {
        totalIn: totalDebit,
        totalOut: totalCredit,
        netMovement: this.toMoney(totalDebit - totalCredit),
      },
      accounts: Array.from(byAccount.values()).sort((a, b) => Number(a.accountCode || 0) - Number(b.accountCode || 0)),
      sources: Array.from(bySource.values()).sort((a, b) => b.net - a.net),
    };
  }

  async getInventoryValue(filters: InventoryValueQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);

    const categoryId = Number(filters.category_id || 0) > 0 ? Number(filters.category_id) : null;
    const supplierId = Number(filters.supplier_id || 0) > 0 ? Number(filters.supplier_id) : null;
    const search = String(filters.search || '').trim();
    const lowStockOnly = String(filters.low_stock_only || '').trim().toLowerCase() === 'true';
    const zeroStockOnly = String(filters.zero_stock_only || '').trim().toLowerCase() === 'true';

    let query = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        'p.stock_qty',
        'p.min_stock_qty',
        'p.cost_price',
        'p.retail_price',
        'p.category_id',
        'p.supplier_id',
        'c.name as category_name',
        's.name as supplier_name',
      ])
      .where('p.is_active', '=', true)
      .where(this.tenantPredicate(auth, 'p'));

    if (categoryId) {
      query = query.where('p.category_id', '=', categoryId);
    }
    if (supplierId) {
      query = query.where('p.supplier_id', '=', supplierId);
    }
    if (search) {
      query = query.where((eb) =>
        eb.or([
          eb('p.name', 'ilike', `%${search}%`),
          eb('p.barcode', 'ilike', `%${search}%`),
        ]),
      );
    }

    const rows = await query.orderBy('p.name asc').execute();
    const items = rows
      .map((row) => {
        const quantityOnHand = this.toMoney(row.stock_qty);
        const minStockQty = this.toMoney(row.min_stock_qty);
        const unitCost = this.toMoney(row.cost_price);
        const unitRetailPrice = this.toMoney(row.retail_price);
        const inventoryValue = this.toMoney(quantityOnHand * unitCost);
        const retailPotentialValue = this.toMoney(quantityOnHand * unitRetailPrice);
        const potentialGrossMargin = this.toMoney(retailPotentialValue - inventoryValue);

        let status: 'available' | 'low_stock' | 'out_of_stock' | 'negative_stock' = 'available';
        if (quantityOnHand < 0) status = 'negative_stock';
        else if (quantityOnHand === 0) status = 'out_of_stock';
        else if (quantityOnHand <= minStockQty) status = 'low_stock';

        return {
          productId: String(row.id),
          productName: String(row.name || ''),
          barcode: String(row.barcode || ''),
          categoryId: row.category_id ? String(row.category_id) : '',
          categoryName: String(row.category_name || ''),
          supplierId: row.supplier_id ? String(row.supplier_id) : '',
          supplierName: String(row.supplier_name || ''),
          quantityOnHand,
          minStockQty,
          unitCost,
          unitRetailPrice,
          inventoryValue,
          retailPotentialValue,
          potentialGrossMargin,
          status,
        };
      })
      .filter((item) => (zeroStockOnly ? item.quantityOnHand === 0 : true))
      .filter((item) => (lowStockOnly ? item.status === 'low_stock' : true));

    const totals = {
      totalInventoryValue: this.toMoney(items.reduce((sum, item) => sum + item.inventoryValue, 0)),
      totalRetailPotentialValue: this.toMoney(items.reduce((sum, item) => sum + item.retailPotentialValue, 0)),
      totalPotentialGrossMargin: this.toMoney(items.reduce((sum, item) => sum + item.potentialGrossMargin, 0)),
      itemCount: items.length,
      lowStockCount: items.filter((item) => item.status === 'low_stock').length,
      zeroStockCount: items.filter((item) => item.status === 'out_of_stock').length,
      negativeStockCount: items.filter((item) => item.status === 'negative_stock').length,
    };

    return { totals, items };
  }

  async createDraftJournalEntry(input: DraftJournalEntryInput, auth: AuthContext): Promise<number> {
    this.assertAccountingAccess(auth);
    const validation = await this.validateBalancedLines(input.lines);
    if (!validation.ok) throw new ForbiddenException(validation.message);

    const sequenceRow = await this.db.selectFrom('journal_entries').select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirst();
    const sequence = Number(sequenceRow?.count || 0) + 1;
    const entryNo = `JE-${String(sequence).padStart(6, '0')}`;

    const inserted = await this.db.transaction().execute(async (trx) => {
      const entry = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: entryNo,
          entry_date: input.entryDate ?? new Date(),
          description: String(input.description || '').trim(),
          source_type: String(input.sourceType || 'manual').trim() || 'manual',
          source_id: input.sourceId ?? null,
          status: 'draft',
          branch_id: input.branchId ?? null,
          location_id: input.locationId ?? null,
          created_by: auth.userId,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      for (const line of validation.lines) {
        await trx.insertInto('journal_entry_lines').values({
          journal_entry_id: Number(entry.id),
          account_id: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          partner_type: line.partnerType,
          partner_id: line.partnerId,
          branch_id: line.branchId,
          location_id: line.locationId,
        } as any).execute();
      }

      return Number(entry.id);
    });

    return inserted;
  }

  async validateBalancedLines(lines: DraftJournalLineInput[]): Promise<{ ok: true; lines: Array<Required<DraftJournalLineInput>> } | { ok: false; message: string }> {
    if (!Array.isArray(lines) || lines.length < 2) {
      return { ok: false, message: 'Journal entry must include at least two lines.' };
    }

    const normalized: Array<Required<DraftJournalLineInput>> = lines.map((line) => {
      const debit = this.toMoney(line.debit);
      const credit = this.toMoney(line.credit);
      const partnerType = this.normalizePartnerType(line.partnerType);
      if (!partnerType) {
        throw new ForbiddenException('Partner type must be one of: none, customer, supplier.');
      }
      return {
        accountId: Number(line.accountId || 0),
        description: String(line.description || '').trim(),
        debit,
        credit,
        partnerType,
        partnerId: line.partnerId ?? null,
        branchId: line.branchId ?? null,
        locationId: line.locationId ?? null,
      };
    });

    for (const line of normalized) {
      if (!(line.accountId > 0)) return { ok: false, message: 'Every line must reference an account.' };
      if (line.debit < 0 || line.credit < 0) return { ok: false, message: 'Debit and credit must be non-negative.' };
      if (line.debit > 0 && line.credit > 0) return { ok: false, message: 'A line cannot have both debit and credit.' };
      if (!(line.debit > 0 || line.credit > 0)) return { ok: false, message: 'Each line must have debit or credit amount.' };
    }

    const accounts = await this.db
      .selectFrom('accounting_accounts')
      .select(['id', 'is_active'])
      .where('id', 'in', normalized.map((line) => line.accountId))
      .execute();

    const activeMap = new Map(accounts.map((row) => [Number(row.id), Boolean(row.is_active)]));
    for (const line of normalized) {
      if (!activeMap.has(line.accountId)) return { ok: false, message: 'One or more accounts do not exist.' };
      if (!activeMap.get(line.accountId)) return { ok: false, message: 'Inactive accounts are not allowed in journal lines.' };
    }

    const totalDebit = this.toMoney(normalized.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalized.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      return { ok: false, message: 'Total debit must equal total credit.' };
    }

    return { ok: true, lines: normalized };
  }
}
