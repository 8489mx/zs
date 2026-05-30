import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from '../../database/kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { JournalEntriesQueryDto } from './dto/accounting.dto';

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
