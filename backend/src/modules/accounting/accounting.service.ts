import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
import {
  CashMovementQueryDto,
  FinancialSummaryQueryDto,
  InventoryValueQueryDto,
  JournalEntriesQueryDto,
  OpeningBalancesPreviewQueryDto,
  PostOpeningBalancesDto,
  ReceivablesPayablesQueryDto,
  CreateAccountDto,
  UpdateAccountDto,
  UpdateAccountingSettingsDto,
} from './dto/accounting.dto';
import { AccountingTenantFoundationService } from './accounting-tenant-foundation.service';

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

type OpeningBalanceAccount = {
  id: number;
  code: string;
  nameAr: string;
  accountType: string;
  isActive: boolean;
  allowManualEntries: boolean;
};

type OpeningBalanceLine = {
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  description: string;
  debit: number;
  credit: number;
};

@Injectable()
export class AccountingService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly accountingTenantFoundation: AccountingTenantFoundationService,
  ) {}

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
    await this.accountingTenantFoundation.ensureForAuth(this.db, auth);
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
      .where(this.tenantPredicate(auth))
      .orderBy('code', 'asc')
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

  private normalizeDateInput(value?: string | null): string {
    const dateText = String(value || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return dateText;
    return new Date().toISOString().slice(0, 10);
  }

  private openingAmount(value: unknown): number {
    return this.toMoney(Math.max(0, Number(value || 0)));
  }

  private async getExistingOpeningBalanceEntry(auth: AuthContext): Promise<{ id: number } | null> {
    const scope = requireTenantScope(auth);
    const row = await this.db
      .selectFrom('journal_entries')
      .select('id')
      .where('source_type', '=', 'opening_balance')
      .where('status', '=', 'posted')
      .where('tenant_id', '=', scope.tenantId)
      .orderBy('id', 'desc')
      .executeTakeFirst();
    return row ? { id: Number(row.id) } : null;
  }

  private async resolveOpeningAccount(auth: AuthContext, code: string, expectedTypes: string[]): Promise<OpeningBalanceAccount> {
    const scope = requireTenantScope(auth);
    const row = await this.db
      .selectFrom('accounting_accounts')
      .select(['id', 'code', 'name_ar', 'account_type', 'is_active', 'allow_manual_entries'])
      .where('tenant_id', '=', scope.tenantId)
      .where('code', '=', code)
      .executeTakeFirst();

    if (!row) {
      throw new BadRequestException(`حساب الأرصدة الافتتاحية ${code} غير موجود في شجرة الحسابات.`);
    }
    if (!row.is_active) {
      throw new BadRequestException(`حساب الأرصدة الافتتاحية ${code} غير نشط.`);
    }
    if (!row.allow_manual_entries) {
      throw new BadRequestException(`حساب الأرصدة الافتتاحية ${code} لا يسمح بالترحيل عليه.`);
    }
    const accountType = String(row.account_type || '');
    if (!expectedTypes.includes(accountType)) {
      throw new BadRequestException(`نوع الحساب ${code} غير مناسب للأرصدة الافتتاحية.`);
    }

    return {
      id: Number(row.id),
      code: String(row.code || ''),
      nameAr: String(row.name_ar || ''),
      accountType,
      isActive: Boolean(row.is_active),
      allowManualEntries: Boolean(row.allow_manual_entries),
    };
  }

  private addOpeningLine(lines: OpeningBalanceLine[], account: OpeningBalanceAccount, description: string, debit: number, credit: number): void {
    const normalizedDebit = this.toMoney(debit);
    const normalizedCredit = this.toMoney(credit);
    if (normalizedDebit <= 0 && normalizedCredit <= 0) return;
    if (normalizedDebit > 0 && normalizedCredit > 0) {
      throw new BadRequestException('لا يمكن أن يحتوي سطر الأرصدة الافتتاحية على مدين ودائن معًا.');
    }
    lines.push({
      accountId: account.id,
      accountCode: account.code,
      accountNameAr: account.nameAr,
      description,
      debit: normalizedDebit,
      credit: normalizedCredit,
    });
  }

  private async calculateOpeningOperationalTotals(auth: AuthContext): Promise<{
    customerReceivables: number;
    supplierPayables: number;
    inventoryValue: number;
  }> {
    const scope = requireTenantScope(auth);
    const [customerResult, supplierResult, inventoryResult] = await Promise.all([
      sql<{ total: string | number | null }>`
        SELECT COALESCE(SUM(balance), 0) AS total
        FROM customers
        WHERE tenant_id = ${scope.tenantId}
          AND is_active = TRUE
          AND balance > 0
      `.execute(this.db),
      sql<{ total: string | number | null }>`
        SELECT COALESCE(SUM(balance), 0) AS total
        FROM suppliers
        WHERE tenant_id = ${scope.tenantId}
          AND is_active = TRUE
          AND balance > 0
      `.execute(this.db),
      sql<{ total: string | number | null }>`
        SELECT COALESCE(SUM(stock_qty * cost_price), 0) AS total
        FROM products
        WHERE tenant_id = ${scope.tenantId}
          AND is_active = TRUE
          AND stock_qty > 0
          AND cost_price > 0
      `.execute(this.db),
    ]);

    return {
      customerReceivables: this.toMoney(customerResult.rows[0]?.total),
      supplierPayables: this.toMoney(supplierResult.rows[0]?.total),
      inventoryValue: this.toMoney(inventoryResult.rows[0]?.total),
    };
  }

  private async buildOpeningBalancesPreview(
    input: OpeningBalancesPreviewQueryDto | PostOpeningBalancesDto,
    auth: AuthContext,
  ): Promise<{
    alreadyPosted: boolean;
    existingOpeningEntryId: number | null;
    systemStartDate: string;
    totals: {
      cashOpening: number;
      bankOpening: number;
      customerReceivables: number;
      supplierPayables: number;
      inventoryValue: number;
      balancingCapital: number;
    };
    linesPreview: OpeningBalanceLine[];
    warnings: string[];
  }> {
    const existing = await this.getExistingOpeningBalanceEntry(auth);
    const systemStartDate = this.normalizeDateInput(input.system_start_date);
    const cashOpening = this.openingAmount(input.cash_opening);
    const bankOpening = this.openingAmount(input.bank_opening);
    const operational = await this.calculateOpeningOperationalTotals(auth);

    const [cash, bank, receivable, inventory, payable, capital] = await Promise.all([
      this.resolveOpeningAccount(auth, '1110', ['asset']),
      this.resolveOpeningAccount(auth, '1120', ['asset']),
      this.resolveOpeningAccount(auth, '1130', ['asset']),
      this.resolveOpeningAccount(auth, '1140', ['asset']),
      this.resolveOpeningAccount(auth, '2110', ['liability']),
      this.resolveOpeningAccount(auth, '3100', ['equity']),
    ]);

    const lines: OpeningBalanceLine[] = [];
    this.addOpeningLine(lines, cash, 'رصيد افتتاحي - الخزينة', cashOpening, 0);
    this.addOpeningLine(lines, bank, 'رصيد افتتاحي - البنك', bankOpening, 0);
    this.addOpeningLine(lines, receivable, 'رصيد افتتاحي - العملاء', operational.customerReceivables, 0);
    this.addOpeningLine(lines, inventory, 'رصيد افتتاحي - المخزون', operational.inventoryValue, 0);
    this.addOpeningLine(lines, payable, 'رصيد افتتاحي - الموردون', 0, operational.supplierPayables);

    const debitBeforeCapital = this.toMoney(lines.reduce((sum, line) => sum + line.debit, 0));
    const creditBeforeCapital = this.toMoney(lines.reduce((sum, line) => sum + line.credit, 0));
    const balancingCapital = this.toMoney(debitBeforeCapital - creditBeforeCapital);
    if (balancingCapital > 0) {
      this.addOpeningLine(lines, capital, 'موازنة الأرصدة الافتتاحية - رأس المال', 0, balancingCapital);
    } else if (balancingCapital < 0) {
      this.addOpeningLine(lines, capital, 'موازنة الأرصدة الافتتاحية - رأس المال', Math.abs(balancingCapital), 0);
    }

    const warnings: string[] = [];
    if (!lines.length) {
      warnings.push('لا توجد أرصدة افتتاحية ذات قيمة للترحيل.');
    }
    if (operational.inventoryValue <= 0) {
      warnings.push('قيمة المخزون الافتتاحية تساوي صفرًا حسب كميات وتكلفة الأصناف الحالية.');
    }

    return {
      alreadyPosted: Boolean(existing),
      existingOpeningEntryId: existing?.id ?? null,
      systemStartDate,
      totals: {
        cashOpening,
        bankOpening,
        customerReceivables: operational.customerReceivables,
        supplierPayables: operational.supplierPayables,
        inventoryValue: operational.inventoryValue,
        balancingCapital,
      },
      linesPreview: lines.map((line) => ({
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountNameAr: line.accountNameAr,
        description: line.description,
        debit: this.toMoney(line.debit),
        credit: this.toMoney(line.credit),
      })),
      warnings,
    };
  }

  async getAccountingSettings(auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    await this.accountingTenantFoundation.ensureForAuth(this.db, auth);
    const scope = requireTenantScope(auth);
    const settings = await this.db
      .selectFrom('accounting_settings')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('id', '=', 1)
      .executeTakeFirst();
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
      ? await this.db
        .selectFrom('accounting_accounts')
        .select(['id', 'code', 'name_ar', 'name_en'])
        .where('tenant_id', '=', scope.tenantId)
        .where('id', 'in', accountIds)
        .execute()
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

  async updateAccountingSettings(dto: UpdateAccountingSettingsDto, auth: AuthContext): Promise<{ success: boolean }> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);
    await this.accountingTenantFoundation.ensureForAuth(this.db, auth);

    const updateData: Record<string, any> = {};
    if (dto.cashAccountId !== undefined) updateData.cash_account_id = dto.cashAccountId || null;
    if (dto.bankAccountId !== undefined) updateData.bank_account_id = dto.bankAccountId || null;
    if (dto.customerReceivableAccountId !== undefined) updateData.customer_receivable_account_id = dto.customerReceivableAccountId || null;
    if (dto.supplierPayableAccountId !== undefined) updateData.supplier_payable_account_id = dto.supplierPayableAccountId || null;
    if (dto.inventoryAccountId !== undefined) updateData.inventory_account_id = dto.inventoryAccountId || null;
    if (dto.salesRevenueAccountId !== undefined) updateData.sales_revenue_account_id = dto.salesRevenueAccountId || null;
    if (dto.salesDiscountAccountId !== undefined) updateData.sales_discount_account_id = dto.salesDiscountAccountId || null;
    if (dto.cogsAccountId !== undefined) updateData.cogs_account_id = dto.cogsAccountId || null;
    if (dto.purchaseAccountId !== undefined) updateData.purchase_account_id = dto.purchaseAccountId || null;
    if (dto.expensesAccountId !== undefined) updateData.expenses_account_id = dto.expensesAccountId || null;
    if (dto.salesTaxAccountId !== undefined) updateData.sales_tax_account_id = dto.salesTaxAccountId || null;
    if (dto.purchaseTaxAccountId !== undefined) updateData.purchase_tax_account_id = dto.purchaseTaxAccountId || null;
    
    updateData.updated_at = new Date();

    if (Object.keys(updateData).length > 1) { // more than just updated_at
      await this.db
        .updateTable('accounting_settings')
        .set(updateData)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    }

    return { success: true };
  }

  async listJournalEntries(filters: JournalEntriesQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(filters.pageSize || 20)));
    const offset = (page - 1) * pageSize;

    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

    let countQuery = this.db.selectFrom('journal_entries').where(this.tenantPredicate(auth));
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
      ])
      .where(this.tenantPredicate(auth, 'je'));

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
    const entry = await this.db
      .selectFrom('journal_entries')
      .selectAll()
      .where('id', '=', id)
      .where(this.tenantPredicate(auth))
      .executeTakeFirst();
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
      .orderBy('l.id', 'asc')
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
      .where('je.status', '=', 'posted')
      .where(this.tenantPredicate(auth, 'je'));

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
          grossSales = this.toMoney(grossSales + revenueMovement);
          const current = revenueBreakdown.get(code) || { accountCode: code, accountNameAr, amount: 0 };
          current.amount = this.toMoney(current.amount + revenueMovement);
          revenueBreakdown.set(code, current);
        }
      }

      if (code === '4400') {
        salesReturns = this.toMoney(salesReturns + expenseMovement);
      }
      if (code === '4300') {
        salesDiscounts = this.toMoney(salesDiscounts + expenseMovement);
      }
      if (accountType === 'contra_revenue' && !this.inCodes(code, ['4300', '4400'])) {
        salesReturns = this.toMoney(salesReturns + expenseMovement);
      }

      if (this.inCodes(code, COGS_CODES) || accountGroup === 'cogs') {
        cogs = this.toMoney(cogs + expenseMovement);
      }

      const isOperatingExpense = (accountType === 'expense' || accountGroup === 'operating_expenses')
        && !this.inCodes(code, COGS_CODES);
      if (isOperatingExpense) {
        operatingExpenses = this.toMoney(operatingExpenses + expenseMovement);
        const current = expenseBreakdown.get(code) || { accountCode: code, accountNameAr, amount: 0 };
        current.amount = this.toMoney(current.amount + expenseMovement);
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
          .orderBy('name', 'asc')
          .execute(),
        this.db
          .selectFrom('suppliers')
          .select(['id', 'name', 'phone', 'balance'])
          .where('is_active', '=', true)
          .where(this.tenantPredicate(auth))
          .orderBy('name', 'asc')
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
      .where(this.tenantPredicate(auth, 'je'))
      .where('a.code', 'in', ['1110', '1120']);

    if (dateFrom) query = query.where('je.entry_date', '>=', dateFrom);
    if (dateTo) query = query.where('je.entry_date', '<=', dateTo);
    if (branchId) query = query.where('je.branch_id', '=', branchId);
    if (locationId) query = query.where('je.location_id', '=', locationId);

    const rows = await query.orderBy('je.entry_date', 'desc').execute();

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
    const locationId = Number(filters.location_id || 0) > 0 ? Number(filters.location_id) : null;

    let query = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        locationId ? sql<number>`COALESCE(pls.qty, 0)`.as('stock_qty') : 'p.stock_qty',
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

    if (locationId) {
      query = query.leftJoin('product_location_stock as pls', (join) =>
        join.onRef('pls.product_id', '=', 'p.id').on('pls.location_id', '=', locationId)
      );
    }

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

    const rows = await query.orderBy('p.name', 'asc').execute();
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

  async previewOpeningBalances(query: OpeningBalancesPreviewQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    await this.accountingTenantFoundation.ensureForAuth(this.db, auth);
    return this.buildOpeningBalancesPreview(query, auth);
  }

  async postOpeningBalances(body: PostOpeningBalancesDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    await this.accountingTenantFoundation.ensureForAuth(this.db, auth);
    const scope = requireTenantScope(auth);
    const preview = await this.buildOpeningBalancesPreview(body, auth);

    if (preview.alreadyPosted && preview.existingOpeningEntryId) {
      return {
        posted: false,
        alreadyPosted: true,
        journalEntryId: String(preview.existingOpeningEntryId),
        message: 'تم ترحيل الأرصدة الافتتاحية مسبقًا.',
        preview,
      };
    }

    if (preview.linesPreview.length < 2) {
      throw new BadRequestException('لا توجد أرصدة افتتاحية كافية لإنشاء قيد متوازن.');
    }

    const totalDebit = this.toMoney(preview.linesPreview.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(preview.linesPreview.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException('قيد الأرصدة الافتتاحية غير متوازن.');
    }

    const note = String(body.note || '').trim();
    const entryDate = new Date(`${preview.systemStartDate}T00:00:00.000Z`);
    const postResult = await this.db.transaction().execute(async (trx) => {
      const existing = await trx
        .selectFrom('journal_entries')
        .select('id')
        .where('source_type', '=', 'opening_balance')
        .where('status', '=', 'posted')
        .where('tenant_id', '=', scope.tenantId)
        .orderBy('id', 'desc')
        .executeTakeFirst();
      if (existing) return { id: Number(existing.id), posted: false };

      const tempEntryNo = `JE-TMP-opening-${scope.tenantId}-${Date.now()}`;
      const inserted = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: tempEntryNo,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          entry_date: entryDate,
          description: note ? `قيد الأرصدة الافتتاحية - ${note}` : 'قيد الأرصدة الافتتاحية',
          source_type: 'opening_balance',
          source_id: null,
          status: 'posted',
          branch_id: null,
          location_id: null,
          created_by: auth.userId,
          posted_by: auth.userId,
          posted_at: sql`NOW()`,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const id = Number(inserted.id);
      await trx
        .updateTable('journal_entries')
        .set({ entry_no: `JE-${String(id).padStart(8, '0')}`, updated_at: sql`NOW()` } as any)
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      if (preview.linesPreview.length > 0) {
        await trx
          .insertInto('journal_entry_lines')
          .values(
            preview.linesPreview.map((line) => ({
              journal_entry_id: id,
              tenant_id: scope.tenantId,
              account_id: line.accountId,
              description: line.description,
              debit: this.toMoney(line.debit),
              credit: this.toMoney(line.credit),
              partner_type: 'none',
              partner_id: null,
              branch_id: null,
              location_id: null,
            } as any))
          )
          .execute();
      }

      return { id, posted: true };
    });

    if (!postResult.posted) {
      return {
        posted: false,
        alreadyPosted: true,
        journalEntryId: String(postResult.id),
        message: 'تم ترحيل الأرصدة الافتتاحية مسبقًا.',
        preview,
      };
    }

    return {
      posted: true,
      alreadyPosted: false,
      journalEntryId: String(postResult.id),
      message: 'تم ترحيل قيد الأرصدة الافتتاحية بنجاح.',
      preview,
    };
  }

  async createDraftJournalEntry(input: DraftJournalEntryInput, auth: AuthContext): Promise<number> {
    this.assertAccountingAccess(auth);
    const validation = await this.validateBalancedLines(input.lines, auth);
    if (!validation.ok) throw new ForbiddenException(validation.message);

    const scope = requireTenantScope(auth);
    const sequenceRow = await this.db.selectFrom('journal_entries').select((eb) => eb.fn.countAll<number>().as('count')).where('tenant_id', '=', scope.tenantId).executeTakeFirst();
    const sequence = Number(sequenceRow?.count || 0) + 1;
    const entryNo = `JE-${String(sequence).padStart(6, '0')}`;

    const inserted = await this.db.transaction().execute(async (trx) => {
      const entry = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: entryNo,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
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
          tenant_id: scope.tenantId,
          account_id: line.accountId,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          partner_type: line.partnerType,
          partner_id: line.partnerId,
          branch_id: line.branchId,
          location_id: line.locationId,
        }).execute();
      }

      return Number(entry.id);
    });

    return inserted;
  }

  async validateBalancedLines(lines: DraftJournalLineInput[], auth?: AuthContext): Promise<{ ok: true; lines: Array<Required<DraftJournalLineInput>> } | { ok: false; message: string }> {
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

    let accountsQuery = this.db.selectFrom('accounting_accounts').select(['id', 'is_active']).where('id', 'in', normalized.map((line) => line.accountId));
    if (auth) {
      const scope = requireTenantScope(auth);
      accountsQuery = accountsQuery.where('tenant_id', '=', scope.tenantId);
    }
    const accounts = await accountsQuery.execute();

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

  async generateNextAccountCode(parentId: number, auth: AuthContext): Promise<{ code: string }> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);
    
    const parent = await this.db.selectFrom('accounting_accounts')
      .select(['code'])
      .where('id', '=', parentId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
      
    if (!parent) throw new NotFoundException('Parent account not found');
    
    const children = await this.db.selectFrom('accounting_accounts')
      .select(['code'])
      .where('parent_id', '=', parentId)
      .where('tenant_id', '=', scope.tenantId)
      .execute();
      
    if (children.length === 0) {
      const num = parseInt(parent.code, 10);
      if (!isNaN(num)) {
        return { code: String(num + 1) };
      }
      return { code: parent.code + '01' };
    }
    
    let maxNum = -1;
    let maxCode = '';
    for (const child of children) {
      const num = parseInt(child.code, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        maxCode = child.code;
      }
    }
    
    if (maxNum !== -1) {
      return { code: String(maxNum + 1) };
    }
    
    return { code: parent.code + '01' };
  }

  async createAccount(dto: CreateAccountDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);
    
    const existing = await this.db.selectFrom('accounting_accounts')
      .select('id')
      .where('code', '=', dto.code)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
    if (existing) throw new BadRequestException('Account code already exists');
    
    let parentId = dto.parentId || null;
    let normalBalance = dto.normalBalance;
    
    if (parentId) {
      const parent = await this.db.selectFrom('accounting_accounts')
        .select(['id', 'normal_balance'])
        .where('id', '=', parentId)
        .where('tenant_id', '=', scope.tenantId)
        .executeTakeFirst();
      if (!parent) throw new BadRequestException('Parent account not found');
      normalBalance = parent.normal_balance;
    }
    
    const result = await this.db.insertInto('accounting_accounts')
      .values({
        tenant_id: scope.tenantId,
        code: dto.code,
        name_ar: dto.nameAr,
        name_en: dto.nameEn || '',
        account_type: dto.accountType as any,
        account_group: '', 
        parent_id: parentId,
        normal_balance: normalBalance as any,
        is_active: dto.isActive ?? true,
        is_system: false,
        allow_manual_entries: true,
        is_control_account: false,
        is_cash_bank: false,
        is_receivable: false,
        is_payable: false,
        is_inventory: false,
        is_tax: false,
        description_ar: '',
        sort_order: 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
      
    return { ok: true, accountId: String(result.id) };
  }

  async updateAccount(id: number, dto: UpdateAccountDto, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);
    
    const existing = await this.db.selectFrom('accounting_accounts')
      .selectAll()
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
      
    if (!existing) throw new NotFoundException('Account not found');
    
    if (dto.code && dto.code !== existing.code) {
      const codeCheck = await this.db.selectFrom('accounting_accounts')
        .select('id')
        .where('code', '=', dto.code)
        .where('tenant_id', '=', scope.tenantId)
        .executeTakeFirst();
      if (codeCheck) throw new BadRequestException('Account code already exists');
    }
    
    const hasTransactions = await this.db.selectFrom('journal_entry_lines')
      .select('id')
      .where('account_id', '=', id)
      .limit(1)
      .executeTakeFirst();
      
    let updateData: any = {};
    
    if (existing.is_system) {
      if (dto.nameAr) updateData.name_ar = dto.nameAr;
      if (dto.nameEn !== undefined) updateData.name_en = dto.nameEn;
    } else {
      if (dto.nameAr) updateData.name_ar = dto.nameAr;
      if (dto.nameEn !== undefined) updateData.name_en = dto.nameEn;
      if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
      
      if (hasTransactions) {
        if (dto.code) updateData.code = dto.code;
      } else {
        if (dto.code) updateData.code = dto.code;
        if (dto.accountType) updateData.account_type = dto.accountType;
        if (dto.normalBalance) updateData.normal_balance = dto.normalBalance;
        if (dto.parentId !== undefined) {
          updateData.parent_id = dto.parentId;
          if (dto.parentId) {
             const parent = await this.db.selectFrom('accounting_accounts').select('normal_balance').where('id', '=', dto.parentId).where('tenant_id', '=', scope.tenantId).executeTakeFirst();
             if (parent) updateData.normal_balance = parent.normal_balance;
          }
        }
      }
    }
    
    if (Object.keys(updateData).length > 0) {
      await this.db.updateTable('accounting_accounts')
        .set({ ...updateData, updated_at: sql`NOW()` })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    }
    
    return { ok: true };
  }

  async deleteAccount(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    this.assertAccountingAccess(auth);
    const scope = requireTenantScope(auth);
    
    const existing = await this.db.selectFrom('accounting_accounts')
      .select(['is_system'])
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();
      
    if (!existing) throw new NotFoundException('Account not found');
    
    if (existing.is_system) {
      throw new BadRequestException('لا يمكن حذف الحسابات النظامية الأساسية.');
    }
    
    const hasTransactions = await this.db.selectFrom('journal_entry_lines')
      .select('id')
      .where('account_id', '=', id)
      .limit(1)
      .executeTakeFirst();
      
    if (hasTransactions) {
      throw new BadRequestException('لا يمكن حذف حساب تمت عليه قيود محاسبية، يمكنك إيقافه بدلاً من ذلك.');
    }
    
    const hasChildren = await this.db.selectFrom('accounting_accounts')
      .select('id')
      .where('parent_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .limit(1)
      .executeTakeFirst();
      
    if (hasChildren) {
      throw new BadRequestException('لا يمكن حذف حساب يحتوي على حسابات فرعية.');
    }
    
    await this.db.deleteFrom('accounting_accounts')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();
      
    return { ok: true };
  }

  async listCostCenters(actor: AuthContext): Promise<Record<string, unknown>> {
    const records = await this.db
      .selectFrom('cost_centers')
      .selectAll()
      .where('tenant_id', '=', requireTenantScope(actor).tenantId)
      .execute();
    return { ok: true, costCenters: records };
  }

  async listProjects(actor: AuthContext): Promise<Record<string, unknown>> {
    const records = await this.db
      .selectFrom('projects')
      .selectAll()
      .where('tenant_id', '=', requireTenantScope(actor).tenantId)
      .execute();
    return { ok: true, projects: records };
  }

  async createCostCenter(body: { code: string; name: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    const code = String(body.code || '').trim();
    const name = String(body.name || '').trim();
    if (!code || !name) {
      throw new BadRequestException('كود واسم مركز التكلفة مطلوبان.');
    }
    const inserted = await this.db
      .insertInto('cost_centers')
      .values({
        code,
        name,
        is_active: true,
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ok: true, costCenter: inserted };
  }

  async updateCostCenter(id: number, body: { name?: string; isActive?: boolean }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.isActive !== undefined) updateData.is_active = Boolean(body.isActive);
    updateData.updated_at = sql`NOW()`;

    const updated = await this.db
      .updateTable('cost_centers')
      .set(updateData)
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .returningAll()
      .executeTakeFirst();
    return { ok: true, costCenter: updated };
  }

  async deleteCostCenter(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    await this.db
      .deleteFrom('cost_centers')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();
    return { ok: true };
  }

  // --- Fixed Assets & Depreciation (الأصول الثابتة والإهلاك المحاسبي) ---
  private async ensureDepreciationAccounts(trx: any, tenantId: string, accountId: string): Promise<{ deprExpenseAccountId: number; accumDeprAccountId: number }> {
    let accumRow = await trx
      .selectFrom('accounting_accounts')
      .select(['id', 'code'])
      .where('tenant_id', '=', tenantId)
      .where('code', '=', '1290')
      .executeTakeFirst();

    let accumDeprAccountId: number;
    if (accumRow) {
      accumDeprAccountId = Number(accumRow.id);
    } else {
      const parentRow = await trx
        .selectFrom('accounting_accounts')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where('code', 'in', ['1200', '1000'])
        .orderBy('code', 'desc')
        .executeTakeFirst();

      const created = await trx
        .insertInto('accounting_accounts')
        .values({
          code: '1290',
          name_ar: 'مجمع الإهلاك',
          name_en: 'Accumulated Depreciation',
          account_type: 'contra_asset',
          normal_balance: 'credit',
          sort_order: 1290,
          parent_id: parentRow ? Number(parentRow.id) : null,
          account_group: 'fixed_assets',
          allow_manual_entries: true,
          is_control_account: false,
          is_cash_bank: false,
          is_receivable: false,
          is_payable: false,
          is_inventory: false,
          is_tax: false,
          is_active: true,
          is_system: false,
          tenant_id: tenantId,
          description_ar: 'مجمع إهلاك الأصول الثابتة',
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();
      accumDeprAccountId = Number(created.id);
    }

    let expenseRow = await trx
      .selectFrom('accounting_accounts')
      .select(['id', 'code'])
      .where('tenant_id', '=', tenantId)
      .where((eb: any) => eb.or([
        eb('code', '=', '6950'),
        eb('name_ar', 'like', '%إهلاك%').and('account_type', '=', 'expense'),
      ]))
      .executeTakeFirst();

    let deprExpenseAccountId: number;
    if (expenseRow) {
      deprExpenseAccountId = Number(expenseRow.id);
    } else {
      const parentRow = await trx
        .selectFrom('accounting_accounts')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where('code', 'in', ['6000', '6900'])
        .orderBy('code', 'asc')
        .executeTakeFirst();

      const created = await trx
        .insertInto('accounting_accounts')
        .values({
          code: '6950',
          name_ar: 'مصروف إهلاك الأصول الثابتة',
          name_en: 'Depreciation Expense',
          account_type: 'expense',
          normal_balance: 'debit',
          sort_order: 6950,
          parent_id: parentRow ? Number(parentRow.id) : null,
          account_group: 'operating_expenses',
          allow_manual_entries: true,
          is_control_account: false,
          is_cash_bank: false,
          is_receivable: false,
          is_payable: false,
          is_inventory: false,
          is_tax: false,
          is_active: true,
          is_system: false,
          tenant_id: tenantId,
          description_ar: 'مصروف إهلاك الأصول الثابتة الدوري',
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();
      deprExpenseAccountId = Number(created.id);
    }

    return { deprExpenseAccountId, accumDeprAccountId };
  }

  async listFixedAssets(actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    const rows = await this.db
      .selectFrom('fixed_assets')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .orderBy('created_at', 'desc')
      .execute();

    const assets = rows.map((a) => {
      const cost = Number(a.purchase_cost || 0);
      const accum = Number(a.accumulated_depreciation || 0);
      const salvage = Number(a.salvage_value || 0);
      const bookValue = Math.max(0, cost - accum);
      return {
        ...a,
        purchase_cost: cost,
        accumulated_depreciation: accum,
        salvage_value: salvage,
        book_value: bookValue,
      };
    });

    return { ok: true, assets };
  }

  async createFixedAsset(body: {
    code: string;
    name: string;
    category?: string;
    purchaseCost: number;
    salvageValue?: number;
    usefulLifeMonths?: number;
    depreciationMethod?: 'straight_line' | 'declining_balance';
    purchaseDate?: string;
  }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    const code = String(body.code || '').trim();
    const name = String(body.name || '').trim();
    const purchaseCost = Number(body.purchaseCost || 0);
    const salvageValue = Number(body.salvageValue || 0);
    const usefulLifeMonths = Number(body.usefulLifeMonths || 60);
    const depreciationMethod = body.depreciationMethod === 'declining_balance' ? 'declining_balance' : 'straight_line';

    if (!code || !name || purchaseCost <= 0) {
      throw new BadRequestException('بيانات الأصل غير مكتملة (الكود، الاسم، وتكلفة الشراء مطلوبة).');
    }

    const inserted = await this.db
      .insertInto('fixed_assets')
      .values({
        code,
        name,
        category: body.category || 'general',
        purchase_cost: purchaseCost,
        salvage_value: salvageValue,
        useful_life_months: usefulLifeMonths,
        depreciation_method: depreciationMethod,
        accumulated_depreciation: 0,
        status: 'active',
        purchase_date: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ok: true, asset: inserted };
  }

  async depreciateFixedAsset(id: number, body: { months?: number; note?: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);

    return await this.db.transaction().execute(async (trx) => {
      const asset = await trx
        .selectFrom('fixed_assets')
        .selectAll()
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .executeTakeFirst();

      if (!asset) {
        throw new BadRequestException('الأصل الثابت غير موجود.');
      }

      if (asset.status === 'retired') {
        throw new BadRequestException('هذا الأصل متقاعد أو مستبعد ولا يمكن إهلاكه.');
      }

      const cost = Number(asset.purchase_cost || 0);
      const salvage = Number(asset.salvage_value || 0);
      const usefulLife = Math.max(1, Number(asset.useful_life_months || 60));
      const currentAccumulated = Number(asset.accumulated_depreciation || 0);
      const method = asset.depreciation_method || 'straight_line';
      const months = Math.max(1, Number(body.months || 1));

      const depreciableBase = Math.max(0, cost - salvage);
      let calculatedAmount = 0;

      if (method === 'declining_balance') {
        const currentBook = Math.max(0, cost - currentAccumulated);
        const annualRate = 2 / (usefulLife / 12);
        const monthlyRate = currentBook * (annualRate / 12);
        const maxDepreciable = Math.max(0, depreciableBase - currentAccumulated);
        calculatedAmount = Math.min(monthlyRate * months, maxDepreciable);
      } else {
        const monthlyRate = depreciableBase / usefulLife;
        calculatedAmount = Math.min(monthlyRate * months, Math.max(0, depreciableBase - currentAccumulated));
      }

      const depreciationAmount = this.toMoney(calculatedAmount);

      if (depreciationAmount <= 0) {
        throw new BadRequestException('تم إهلاك هذا الأصل بالكامل بالفعل.');
      }

      const newAccumulated = this.toMoney(currentAccumulated + depreciationAmount);
      const newBookValue = this.toMoney(Math.max(0, cost - newAccumulated));
      const isFullyDepreciated = newAccumulated >= depreciableBase;

      // 1. Resolve Accounts
      const accounts = await this.ensureDepreciationAccounts(trx, scope.tenantId, scope.accountId);

      // 2. Insert Balanced Journal Entry
      const entryDate = new Date();
      const tempEntryNo = `JE-TMP-depr-${scope.tenantId}-${Date.now()}`;
      const entryDesc = body.note
        ? `إهلاك الأصل ${asset.name} (${asset.code}): ${body.note}`
        : `إهلاك الأصل ${asset.name} (${asset.code}) - ${method === 'declining_balance' ? 'قسط متناقص' : 'قسط ثابت'}`;

      const insertedJe = await trx
        .insertInto('journal_entries')
        .values({
          entry_no: tempEntryNo,
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          entry_date: entryDate,
          description: entryDesc,
          source_type: 'depreciation',
          source_id: id,
          status: 'posted',
          branch_id: null,
          location_id: null,
          created_by: actor.userId,
          posted_by: actor.userId,
          posted_at: sql`NOW()`,
        } as any)
        .returning('id')
        .executeTakeFirstOrThrow();

      const journalEntryId = Number(insertedJe.id);
      const finalEntryNo = `JE-${String(journalEntryId).padStart(8, '0')}`;
      await trx
        .updateTable('journal_entries')
        .set({ entry_no: finalEntryNo, updated_at: sql`NOW()` } as any)
        .where('id', '=', journalEntryId)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      // 3. Insert Journal Lines (Debit Expense, Credit Accumulated)
      await trx
        .insertInto('journal_entry_lines')
        .values([
          {
            journal_entry_id: journalEntryId,
            tenant_id: scope.tenantId,
            account_id: accounts.deprExpenseAccountId,
            description: `مصروف إهلاك الأصل - ${asset.name}`,
            debit: depreciationAmount,
            credit: 0,
            partner_type: 'none',
            partner_id: null,
            branch_id: null,
            location_id: null,
          } as any,
          {
            journal_entry_id: journalEntryId,
            tenant_id: scope.tenantId,
            account_id: accounts.accumDeprAccountId,
            description: `مجمع إهلاك الأصل - ${asset.name}`,
            debit: 0,
            credit: depreciationAmount,
            partner_type: 'none',
            partner_id: null,
            branch_id: null,
            location_id: null,
          } as any,
        ])
        .execute();

      // 4. Update Fixed Asset Record
      await trx
        .updateTable('fixed_assets')
        .set({
          accumulated_depreciation: newAccumulated,
          status: isFullyDepreciated ? 'fully_depreciated' : 'active',
          updated_at: sql`NOW()`,
        })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();

      // 5. Insert Log with Journal Entry ID
      const log = await trx
        .insertInto('asset_depreciation_logs')
        .values({
          tenant_id: scope.tenantId,
          account_id: scope.accountId,
          asset_id: id,
          period_date: entryDate,
          depreciation_amount: depreciationAmount,
          accumulated_amount: newAccumulated,
          book_value: newBookValue,
          journal_entry_id: journalEntryId,
          note: body.note || (method === 'declining_balance' ? `إهلاك دوري لعدد ${months} شهر بطريقة القسط المتناقص` : `إهلاك دوري لعدد ${months} شهر بطريقة القسط الثابت`),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        ok: true,
        depreciationAmount,
        accumulatedDepreciation: newAccumulated,
        bookValue: newBookValue,
        isFullyDepreciated,
        journalEntryId,
        entryNo: finalEntryNo,
        log,
      };
    });
  }

  async depreciateAllFixedAssets(body: { months?: number; note?: string }, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    const activeAssets = await this.db
      .selectFrom('fixed_assets')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .where('status', '=', 'active')
      .execute();

    let processedCount = 0;
    let totalDepreciation = 0;
    const results: any[] = [];

    for (const asset of activeAssets) {
      const cost = Number(asset.purchase_cost || 0);
      const salvage = Number(asset.salvage_value || 0);
      const currentAccum = Number(asset.accumulated_depreciation || 0);
      if (currentAccum >= (cost - salvage)) {
        continue;
      }
      try {
        const res = await this.depreciateFixedAsset(Number(asset.id), body, actor);
        processedCount++;
        totalDepreciation = this.toMoney(totalDepreciation + Number(res.depreciationAmount || 0));
        results.push({ id: asset.id, name: asset.name, code: asset.code, amount: res.depreciationAmount, entryNo: res.entryNo });
      } catch (e: any) {
        results.push({ id: asset.id, name: asset.name, code: asset.code, error: e?.message || 'Failed' });
      }
    }

    return {
      ok: true,
      processedCount,
      totalDepreciation,
      results,
    };
  }

  async listAssetDepreciationLogs(assetId?: number, actor?: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor!);
    let query = this.db
      .selectFrom('asset_depreciation_logs as l')
      .leftJoin('journal_entries as j', 'j.id', 'l.journal_entry_id')
      .leftJoin('fixed_assets as a', 'a.id', 'l.asset_id')
      .select([
        'l.id',
        'l.asset_id',
        'l.period_date',
        'l.depreciation_amount',
        'l.accumulated_amount',
        'l.book_value',
        'l.journal_entry_id',
        'l.note',
        'l.created_at',
        'j.entry_no as journal_entry_no',
        'a.name as asset_name',
        'a.code as asset_code',
      ])
      .where('l.tenant_id', '=', scope.tenantId);

    if (assetId && assetId > 0) {
      query = query.where('l.asset_id', '=', assetId);
    }

    const logs = await query.orderBy('l.created_at', 'desc').execute();
    return { ok: true, logs };
  }

  async deleteFixedAsset(id: number, actor: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(actor);
    const logsCountRow = await this.db
      .selectFrom('asset_depreciation_logs')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('asset_id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    const count = Number(logsCountRow?.count || 0);
    if (count > 0) {
      // Mark as retired instead of deleting historical financial audit logs
      await this.db
        .updateTable('fixed_assets')
        .set({ status: 'retired', updated_at: sql`NOW()` })
        .where('id', '=', id)
        .where('tenant_id', '=', scope.tenantId)
        .execute();
      return { ok: true, retired: true, message: 'تم إحالة الأصل إلى التقاعد (الاستبعاد) للاحتفاظ بسجل القيود التاريخية.' };
    }

    await this.db
      .deleteFrom('fixed_assets')
      .where('id', '=', id)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { ok: true, deleted: true };
  }

  // --- Multi-Currency & Exchange Rates (العملات المتعددة وأسعار الصرف) ---
  async listCurrencies(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    let rows = await this.db
      .selectFrom('currency_exchange_rates')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId)
      .orderBy('is_base', 'desc')
      .orderBy('currency_code', 'asc')
      .execute();

    if (rows.length === 0) {
      const defaultCurrencies = [
        { code: 'EGP', name: 'الجنيه المصري', rate: 1.0, isBase: true, symbol: 'ج.م' },
        { code: 'USD', name: 'الدولار الأمريكي', rate: 49.5, isBase: false, symbol: '$' },
        { code: 'SAR', name: 'الريال السعودي', rate: 13.2, isBase: false, symbol: 'ر.س' },
        { code: 'EUR', name: 'اليورو الأوروبي', rate: 53.8, isBase: false, symbol: '€' },
        { code: 'AED', name: 'الدرهم الإماراتي', rate: 13.48, isBase: false, symbol: 'د.إ' },
      ];

      for (const c of defaultCurrencies) {
        await this.db
          .insertInto('currency_exchange_rates')
          .values({
            tenant_id: scope.tenantId,
            account_id: scope.accountId,
            currency_code: c.code,
            currency_name: c.name,
            exchange_rate: c.rate,
            is_base: c.isBase,
            symbol: c.symbol,
          } as any)
          .onConflict((oc) => oc.columns(['tenant_id', 'currency_code']).doNothing())
          .execute();
      }

      rows = await this.db
        .selectFrom('currency_exchange_rates')
        .selectAll()
        .where('tenant_id', '=', scope.tenantId)
        .orderBy('is_base', 'desc')
        .orderBy('currency_code', 'asc')
        .execute();
    }

    return {
      currencies: rows.map((r) => ({
        id: String(r.id),
        code: r.currency_code,
        name: r.currency_name,
        exchangeRate: Number(r.exchange_rate),
        isBase: Boolean(r.is_base),
        symbol: r.symbol,
        updatedAt: r.updated_at,
      })),
    };
  }

  async upsertCurrency(
    body: { currencyCode: string; currencyName: string; exchangeRate: number; isBase?: boolean; symbol?: string },
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const code = String(body.currencyCode || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('رمز العملة مطلوب.');

    const name = String(body.currencyName || code).trim();
    const rate = Number(body.exchangeRate || 1);
    const isBase = Boolean(body.isBase);
    const symbol = String(body.symbol || '').trim();

    if (isBase) {
      await this.db
        .updateTable('currency_exchange_rates')
        .set({ is_base: false })
        .where('tenant_id', '=', scope.tenantId)
        .execute();
    }

    const row = await this.db
      .insertInto('currency_exchange_rates')
      .values({
        tenant_id: scope.tenantId,
        account_id: scope.accountId,
        currency_code: code,
        currency_name: name,
        exchange_rate: rate,
        is_base: isBase,
        symbol,
      } as any)
      .onConflict((oc) =>
        oc.columns(['tenant_id', 'currency_code']).doUpdateSet({
          currency_name: name,
          exchange_rate: rate,
          is_base: isBase,
          symbol,
          updated_at: sql`NOW()`,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return { ok: true, currency: row };
  }

  async convertCurrency(
    body: { amount: number; fromCurrency: string; toCurrency: string },
    auth: AuthContext,
  ): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const fromCode = String(body.fromCurrency || '').trim().toUpperCase();
    const toCode = String(body.toCurrency || '').trim().toUpperCase();
    const amount = Number(body.amount || 0);

    if (fromCode === toCode) {
      return { convertedAmount: amount, rate: 1 };
    }

    const rates = await this.db
      .selectFrom('currency_exchange_rates')
      .select(['currency_code', 'exchange_rate', 'is_base'])
      .where('tenant_id', '=', scope.tenantId)
      .where('currency_code', 'in', [fromCode, toCode])
      .execute();

    const fromRow = rates.find((r) => r.currency_code === fromCode);
    const toRow = rates.find((r) => r.currency_code === toCode);

    const fromRate = fromRow ? Number(fromRow.exchange_rate) : 1;
    const toRate = toRow ? Number(toRow.exchange_rate) : 1;

    const amountInBase = fromRow?.is_base ? amount : amount * fromRate;
    const convertedAmount = toRow?.is_base ? amountInBase : amountInBase / toRate;

    return {
      amount,
      fromCurrency: fromCode,
      toCurrency: toCode,
      convertedAmount: Number(convertedAmount.toFixed(4)),
      effectiveRate: toRate > 0 ? Number((fromRate / toRate).toFixed(6)) : 1,
    };
  }
}

