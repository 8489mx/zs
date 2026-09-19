import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { AccountingPostingService } from '../accounting-posting.service';

export interface PdcChequeRecord {
  id: number;
  tenant_id: string;
  account_id: number | null;
  type: 'receivable' | 'payable';
  cheque_number: string;
  bank_name: string;
  branch_name: string | null;
  drawer_name: string | null;
  partner_type: string;
  partner_id: number | null;
  partner_name: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  status: string;
  deposit_bank_id: number | null;
  deposit_date: string | null;
  cleared_date: string | null;
  bounced_date: string | null;
  bounced_reason: string | null;
  bounced_fee: number;
  endorsed_to_supplier_id: number | null;
  endorsed_to_supplier_name: string | null;
  journal_entry_id: number | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PdcChequesFilter {
  type?: 'receivable' | 'payable';
  status?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  partnerId?: number;
  bankName?: string;
  page?: number;
  limit?: number;
}

export interface PdcChequesStats {
  receivables: {
    totalCount: number;
    totalAmount: number;
    inSafeCount: number;
    inSafeAmount: number;
    underCollectionCount: number;
    underCollectionAmount: number;
    collectedCount: number;
    collectedAmount: number;
    bouncedCount: number;
    bouncedAmount: number;
    dueSoonCount: number;
    dueSoonAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
  payables: {
    totalCount: number;
    totalAmount: number;
    issuedCount: number;
    issuedAmount: number;
    clearedCount: number;
    clearedAmount: number;
    bouncedCount: number;
    bouncedAmount: number;
    dueSoonCount: number;
    dueSoonAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
}

export interface CreatePdcChequeDto {
  type: 'receivable' | 'payable';
  chequeNumber: string;
  bankName: string;
  branchName?: string;
  drawerName?: string;
  partnerType?: string;
  partnerId?: number;
  partnerName: string;
  amount: number;
  currency?: string;
  issueDate: string;
  dueDate: string;
  depositBankId?: number;
  notes?: string;
  status?: string;
}

export interface UpdateChequeStatusDto {
  action: 'deposit' | 'collect' | 'clear' | 'bounce' | 'endorse' | 'return' | 'cancel' | 'restore_to_safe';
  actionDate?: string;
  depositBankId?: number;
  bouncedReason?: string;
  bouncedFee?: number;
  endorsedToSupplierId?: number;
  endorsedToSupplierName?: string;
  notes?: string;
}

@Injectable()
export class PdcChequesService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly accountingPostingService: AccountingPostingService,
  ) {}

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

  /**
   * List cheques with comprehensive filtering and pagination
   */
  async listCheques(
    authContext: AuthContext,
    filters: PdcChequesFilter = {},
  ): Promise<{ data: PdcChequeRecord[]; total: number; page: number; limit: number }> {
    const tenantId = String(authContext.tenantId || '');
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 25)));
    const offset = (page - 1) * limit;

    let baseQuery = (this.db as any)
      .selectFrom('accounting_cheques')
      .where('tenant_id', '=', tenantId);

    if (filters.type) {
      baseQuery = baseQuery.where('type', '=', filters.type);
    }

    if (filters.status) {
      baseQuery = baseQuery.where('status', '=', filters.status);
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      baseQuery = baseQuery.where((eb: any) =>
        eb.or([
          eb('cheque_number', 'ilike', term),
          eb('partner_name', 'ilike', term),
          eb('bank_name', 'ilike', term),
          eb('drawer_name', 'ilike', term),
        ]),
      );
    }

    if (filters.dueFrom) {
      baseQuery = baseQuery.where('due_date', '>=', filters.dueFrom);
    }

    if (filters.dueTo) {
      baseQuery = baseQuery.where('due_date', '<=', filters.dueTo);
    }

    if (filters.partnerId) {
      baseQuery = baseQuery.where('partner_id', '=', filters.partnerId);
    }

    if (filters.bankName) {
      baseQuery = baseQuery.where('bank_name', '=', filters.bankName);
    }

    // Count total
    const countResult = await baseQuery
      .select((eb: any) => eb.fn.count('id').as('count'))
      .executeTakeFirst();
    const total = Number(countResult?.count || 0);

    // Fetch records
    const rawRows = await baseQuery
      .selectAll()
      .orderBy('due_date', 'asc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    const data: PdcChequeRecord[] = rawRows.map((r: any) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      account_id: r.account_id,
      type: r.type,
      cheque_number: r.cheque_number,
      bank_name: r.bank_name,
      branch_name: r.branch_name,
      drawer_name: r.drawer_name,
      partner_type: r.partner_type,
      partner_id: r.partner_id,
      partner_name: r.partner_name,
      amount: this.toMoney(r.amount),
      currency: r.currency || 'EGP',
      issue_date: this.formatDate(r.issue_date),
      due_date: this.formatDate(r.due_date),
      status: r.status,
      deposit_bank_id: r.deposit_bank_id,
      deposit_date: r.deposit_date ? this.formatDate(r.deposit_date) : null,
      cleared_date: r.cleared_date ? this.formatDate(r.cleared_date) : null,
      bounced_date: r.bounced_date ? this.formatDate(r.bounced_date) : null,
      bounced_reason: r.bounced_reason,
      bounced_fee: this.toMoney(r.bounced_fee),
      endorsed_to_supplier_id: r.endorsed_to_supplier_id,
      endorsed_to_supplier_name: r.endorsed_to_supplier_name,
      journal_entry_id: r.journal_entry_id,
      notes: r.notes,
      created_by: r.created_by,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : '',
    }));

    return { data, total, page, limit };
  }

  /**
   * Get high-level KPI stats for Cheques Portfolio
   */
  async getStats(authContext: AuthContext): Promise<PdcChequesStats> {
    const tenantId = String(authContext.tenantId || '');
    const today = new Date().toISOString().substring(0, 10);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    const rows = await (this.db as any)
      .selectFrom('accounting_cheques')
      .where('tenant_id', '=', tenantId)
      .select([
        'type',
        'status',
        'amount',
        'due_date',
      ])
      .execute();

    const stats: PdcChequesStats = {
      receivables: {
        totalCount: 0,
        totalAmount: 0,
        inSafeCount: 0,
        inSafeAmount: 0,
        underCollectionCount: 0,
        underCollectionAmount: 0,
        collectedCount: 0,
        collectedAmount: 0,
        bouncedCount: 0,
        bouncedAmount: 0,
        dueSoonCount: 0,
        dueSoonAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
      },
      payables: {
        totalCount: 0,
        totalAmount: 0,
        issuedCount: 0,
        issuedAmount: 0,
        clearedCount: 0,
        clearedAmount: 0,
        bouncedCount: 0,
        bouncedAmount: 0,
        dueSoonCount: 0,
        dueSoonAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
      },
    };

    for (const r of rows) {
      const amount = this.toMoney(r.amount);
      const dueDate = this.formatDate(r.due_date);
      const isReceivable = r.type === 'receivable';

      if (isReceivable) {
        stats.receivables.totalCount += 1;
        stats.receivables.totalAmount = this.toMoney(stats.receivables.totalAmount + amount);

        if (r.status === 'in_safe') {
          stats.receivables.inSafeCount += 1;
          stats.receivables.inSafeAmount = this.toMoney(stats.receivables.inSafeAmount + amount);
        } else if (r.status === 'under_collection') {
          stats.receivables.underCollectionCount += 1;
          stats.receivables.underCollectionAmount = this.toMoney(stats.receivables.underCollectionAmount + amount);
        } else if (r.status === 'collected') {
          stats.receivables.collectedCount += 1;
          stats.receivables.collectedAmount = this.toMoney(stats.receivables.collectedAmount + amount);
        } else if (r.status === 'bounced') {
          stats.receivables.bouncedCount += 1;
          stats.receivables.bouncedAmount = this.toMoney(stats.receivables.bouncedAmount + amount);
        }

        const isSettled = ['collected', 'cancelled', 'returned', 'endorsed'].includes(r.status);
        if (!isSettled) {
          if (dueDate < today) {
            stats.receivables.overdueCount += 1;
            stats.receivables.overdueAmount = this.toMoney(stats.receivables.overdueAmount + amount);
          } else if (dueDate >= today && dueDate <= in7Days) {
            stats.receivables.dueSoonCount += 1;
            stats.receivables.dueSoonAmount = this.toMoney(stats.receivables.dueSoonAmount + amount);
          }
        }
      } else {
        // Payable
        stats.payables.totalCount += 1;
        stats.payables.totalAmount = this.toMoney(stats.payables.totalAmount + amount);

        if (r.status === 'issued') {
          stats.payables.issuedCount += 1;
          stats.payables.issuedAmount = this.toMoney(stats.payables.issuedAmount + amount);
        } else if (r.status === 'cleared') {
          stats.payables.clearedCount += 1;
          stats.payables.clearedAmount = this.toMoney(stats.payables.clearedAmount + amount);
        } else if (r.status === 'bounced') {
          stats.payables.bouncedCount += 1;
          stats.payables.bouncedAmount = this.toMoney(stats.payables.bouncedAmount + amount);
        }

        const isSettled = ['cleared', 'cancelled'].includes(r.status);
        if (!isSettled) {
          if (dueDate < today) {
            stats.payables.overdueCount += 1;
            stats.payables.overdueAmount = this.toMoney(stats.payables.overdueAmount + amount);
          } else if (dueDate >= today && dueDate <= in7Days) {
            stats.payables.dueSoonCount += 1;
            stats.payables.dueSoonAmount = this.toMoney(stats.payables.dueSoonAmount + amount);
          }
        }
      }
    }

    return stats;
  }

  /**
   * Register a new cheque (Receivable or Payable)
   */
  async createCheque(authContext: AuthContext, dto: CreatePdcChequeDto): Promise<PdcChequeRecord> {
    const tenantId = String(authContext.tenantId || '');

    if (!dto.chequeNumber || !dto.chequeNumber.trim()) {
      throw new BadRequestException('رقم الشيك مطلوب');
    }
    if (!dto.bankName || !dto.bankName.trim()) {
      throw new BadRequestException('اسم البنك مطلوب');
    }
    if (!dto.partnerName || !dto.partnerName.trim()) {
      throw new BadRequestException('اسم العميل / المورد مطلوب');
    }
    const amount = Number(dto.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('مبلغ الشيك يجب أن يكون أكبر من الصفر');
    }
    if (!dto.issueDate || !dto.dueDate) {
      throw new BadRequestException('تاريخ التحرير وتاريخ الاستحقاق مطلوبان');
    }

    const type = dto.type === 'payable' ? 'payable' : 'receivable';
    const defaultStatus = type === 'receivable' ? 'in_safe' : 'issued';
    const status = dto.status || defaultStatus;

    return this.db.transaction().execute(async (trx: any) => {
      const inserted = await trx
        .insertInto('accounting_cheques')
        .values({
          tenant_id: tenantId,
          type,
          cheque_number: dto.chequeNumber.trim(),
          bank_name: dto.bankName.trim(),
          branch_name: dto.branchName?.trim() || null,
          drawer_name: dto.drawerName?.trim() || null,
          partner_type: dto.partnerType || (type === 'receivable' ? 'customer' : 'supplier'),
          partner_id: dto.partnerId || null,
          partner_name: dto.partnerName.trim(),
          amount: amount,
          currency: dto.currency || 'EGP',
          issue_date: dto.issueDate,
          due_date: dto.dueDate,
          status,
          deposit_bank_id: dto.depositBankId || null,
          notes: dto.notes?.trim() || null,
          created_by: authContext.userId ? Number(authContext.userId) : null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      let journalEntryId: number | null = null;
      if (type === 'receivable' && status === 'in_safe') {
        const postRes = await this.accountingPostingService.postPdcChequeReceive(trx, inserted.id, authContext);
        if (postRes.posted && postRes.journalEntryId) {
          journalEntryId = postRes.journalEntryId;
          await trx
            .updateTable('accounting_cheques')
            .set({ journal_entry_id: journalEntryId })
            .where('id', '=', inserted.id)
            .where('tenant_id', '=', tenantId)
            .execute();
        }
      } else if (type === 'payable' && status === 'issued') {
        const postRes = await this.accountingPostingService.postPdcChequeIssue(trx, inserted.id, authContext);
        if (postRes.posted && postRes.journalEntryId) {
          journalEntryId = postRes.journalEntryId;
          await trx
            .updateTable('accounting_cheques')
            .set({ journal_entry_id: journalEntryId })
            .where('id', '=', inserted.id)
            .where('tenant_id', '=', tenantId)
            .execute();
        }
      }

      return {
        id: inserted.id,
        tenant_id: inserted.tenant_id,
        account_id: inserted.account_id,
        type: inserted.type,
        cheque_number: inserted.cheque_number,
        bank_name: inserted.bank_name,
        branch_name: inserted.branch_name,
        drawer_name: inserted.drawer_name,
        partner_type: inserted.partner_type,
        partner_id: inserted.partner_id,
        partner_name: inserted.partner_name,
        amount: this.toMoney(inserted.amount),
        currency: inserted.currency,
        issue_date: this.formatDate(inserted.issue_date),
        due_date: this.formatDate(inserted.due_date),
        status: inserted.status,
        deposit_bank_id: inserted.deposit_bank_id,
        deposit_date: inserted.deposit_date ? this.formatDate(inserted.deposit_date) : null,
        cleared_date: inserted.cleared_date ? this.formatDate(inserted.cleared_date) : null,
        bounced_date: inserted.bounced_date ? this.formatDate(inserted.bounced_date) : null,
        bounced_reason: inserted.bounced_reason,
        bounced_fee: this.toMoney(inserted.bounced_fee),
        endorsed_to_supplier_id: inserted.endorsed_to_supplier_id,
        endorsed_to_supplier_name: inserted.endorsed_to_supplier_name,
        journal_entry_id: journalEntryId,
        notes: inserted.notes,
        created_by: inserted.created_by,
        created_at: inserted.created_at ? new Date(inserted.created_at).toISOString() : '',
        updated_at: inserted.updated_at ? new Date(inserted.updated_at).toISOString() : '',
      };
    });
  }

  /**
   * Transition cheque status along the collection/payment lifecycle
   */
  async updateChequeStatus(
    authContext: AuthContext,
    id: number,
    actionDto: UpdateChequeStatusDto,
  ): Promise<PdcChequeRecord> {
    const tenantId = String(authContext.tenantId || '');

    return this.db.transaction().execute(async (trx: any) => {
      const existing = await trx
        .selectFrom('accounting_cheques')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .selectAll()
        .forUpdate()
        .executeTakeFirst();

      if (!existing) {
        throw new NotFoundException('الشيك غير موجود');
      }

      const today = new Date().toISOString().substring(0, 10);
      const actionDate = actionDto.actionDate || today;
      let updateFields: Record<string, any> = {
        updated_at: sql`CURRENT_TIMESTAMP`,
      };

      let nextJournalId = existing.journal_entry_id;

      switch (actionDto.action) {
        case 'deposit':
          if (existing.type !== 'receivable') {
            throw new BadRequestException('الإيداع برسم التحصيل متاح فقط لأوراق القبض');
          }
          if (['collected', 'cleared', 'cancelled', 'endorsed'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن إيداع شيك مسوى أو ملغى بالفعل');
          }
          updateFields.status = 'under_collection';
          updateFields.deposit_date = actionDate;
          if (actionDto.depositBankId) {
            updateFields.deposit_bank_id = actionDto.depositBankId;
          }
          break;

        case 'collect':
          if (existing.type !== 'receivable') {
            throw new BadRequestException('التحصيل متاح فقط لأوراق القبض');
          }
          if (['collected', 'cleared', 'cancelled', 'endorsed'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن تحصيل شيك مسوى أو ملغى بالفعل');
          }
          updateFields.status = 'collected';
          updateFields.cleared_date = actionDate;
          if (actionDto.depositBankId) {
            updateFields.deposit_bank_id = actionDto.depositBankId;
          }
          break;

        case 'clear':
          if (existing.type !== 'payable') {
            throw new BadRequestException('الصرف متاح فقط لأوراق الدفع');
          }
          if (['cleared', 'cancelled'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن صرف شيك مسوى أو ملغى بالفعل');
          }
          updateFields.status = 'cleared';
          updateFields.cleared_date = actionDate;
          break;

        case 'bounce':
          if (['cancelled', 'returned'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن ارتداد شيك ملغى أو مرتجع');
          }
          updateFields.status = 'bounced';
          updateFields.bounced_date = actionDate;
          updateFields.bounced_reason = actionDto.bouncedReason || 'رفض بنكي / عدم كفاية الرصيد';
          updateFields.bounced_fee = actionDto.bouncedFee ? Number(actionDto.bouncedFee) : 0;
          break;

        case 'endorse':
          if (existing.type !== 'receivable') {
            throw new BadRequestException('التظهير متاح فقط لأوراق القبض');
          }
          if (existing.status !== 'in_safe') {
            throw new BadRequestException('التظهير متاح فقط للشيكات الموجودة بالخزينة');
          }
          if (!actionDto.endorsedToSupplierName && !actionDto.endorsedToSupplierId) {
            throw new BadRequestException('يجب تحديد المورد المراد تظهير الشيك إليه');
          }
          updateFields.status = 'endorsed';
          updateFields.endorsed_to_supplier_id = actionDto.endorsedToSupplierId || null;
          updateFields.endorsed_to_supplier_name = actionDto.endorsedToSupplierName || null;
          break;

        case 'return':
          if (['collected', 'cleared', 'endorsed'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن رد شيك تم تحصيله أو صرفه أو تظهيره');
          }
          updateFields.status = 'returned';
          if (actionDto.notes) {
            updateFields.notes = existing.notes
              ? `${existing.notes} | سبب الرد: ${actionDto.notes}`
              : `سبب الرد: ${actionDto.notes}`;
          }
          break;

        case 'cancel':
          if (['collected', 'cleared', 'endorsed'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن إلغاء شيك تم تحصيله أو صرفه أو تظهيره');
          }
          updateFields.status = 'cancelled';
          break;

        case 'restore_to_safe':
          if (['collected', 'cleared', 'endorsed'].includes(existing.status)) {
            throw new BadRequestException('لا يمكن إعادة شيك مسوى للخزينة');
          }
          updateFields.status = existing.type === 'receivable' ? 'in_safe' : 'issued';
          updateFields.deposit_bank_id = null;
          updateFields.deposit_date = null;
          updateFields.cleared_date = null;
          updateFields.bounced_date = null;
          break;

        default:
          throw new BadRequestException('إجراء غير مدعوم');
      }

      if (actionDto.notes && actionDto.action !== 'return') {
        updateFields.notes = existing.notes
          ? `${existing.notes} | ${actionDto.notes}`
          : actionDto.notes;
      }

      // Execute GL posting for financial state transitions
      if (actionDto.action === 'deposit') {
        const postRes = await this.accountingPostingService.postPdcChequeDeposit(trx, id, authContext);
        if (postRes.posted && postRes.journalEntryId) {
          nextJournalId = postRes.journalEntryId;
          updateFields.journal_entry_id = nextJournalId;
        }
      } else if (actionDto.action === 'collect') {
        const postRes = await this.accountingPostingService.postPdcChequeCollect(trx, id, actionDto.depositBankId || null, authContext);
        if (postRes.posted && postRes.journalEntryId) {
          nextJournalId = postRes.journalEntryId;
          updateFields.journal_entry_id = nextJournalId;
        }
      } else if (actionDto.action === 'clear') {
        const postRes = await this.accountingPostingService.postPdcChequeClear(trx, id, actionDto.depositBankId || null, authContext);
        if (postRes.posted && postRes.journalEntryId) {
          nextJournalId = postRes.journalEntryId;
          updateFields.journal_entry_id = nextJournalId;
        }
      } else if (actionDto.action === 'bounce') {
        if (existing.type === 'receivable') {
          const postRes = await this.accountingPostingService.postPdcChequeBounce(
            trx,
            id,
            actionDto.bouncedFee ? Number(actionDto.bouncedFee) : 0,
            actionDto.depositBankId || null,
            authContext,
          );
          if (postRes.posted && postRes.journalEntryId) {
            nextJournalId = postRes.journalEntryId;
            updateFields.journal_entry_id = nextJournalId;
          }
        } else {
          const postRes = await this.accountingPostingService.postPdcChequePayableBounce(trx, id, authContext);
          if (postRes.posted && postRes.journalEntryId) {
            nextJournalId = postRes.journalEntryId;
            updateFields.journal_entry_id = nextJournalId;
          }
        }
      } else if (actionDto.action === 'endorse') {
        const postRes = await this.accountingPostingService.postPdcChequeEndorse(
          trx,
          id,
          actionDto.endorsedToSupplierId || null,
          authContext,
        );
        if (postRes.posted && postRes.journalEntryId) {
          nextJournalId = postRes.journalEntryId;
          updateFields.journal_entry_id = nextJournalId;
        }
      }

      const updated = await trx
        .updateTable('accounting_cheques')
        .set(updateFields)
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: updated.id,
        tenant_id: updated.tenant_id,
        account_id: updated.account_id,
        type: updated.type,
        cheque_number: updated.cheque_number,
        bank_name: updated.bank_name,
        branch_name: updated.branch_name,
        drawer_name: updated.drawer_name,
        partner_type: updated.partner_type,
        partner_id: updated.partner_id,
        partner_name: updated.partner_name,
        amount: this.toMoney(updated.amount),
        currency: updated.currency,
        issue_date: this.formatDate(updated.issue_date),
        due_date: this.formatDate(updated.due_date),
        status: updated.status,
        deposit_bank_id: updated.deposit_bank_id,
        deposit_date: updated.deposit_date ? this.formatDate(updated.deposit_date) : null,
        cleared_date: updated.cleared_date ? this.formatDate(updated.cleared_date) : null,
        bounced_date: updated.bounced_date ? this.formatDate(updated.bounced_date) : null,
        bounced_reason: updated.bounced_reason,
        bounced_fee: this.toMoney(updated.bounced_fee),
        endorsed_to_supplier_id: updated.endorsed_to_supplier_id,
        endorsed_to_supplier_name: updated.endorsed_to_supplier_name,
        journal_entry_id: updated.journal_entry_id,
        notes: updated.notes,
        created_by: updated.created_by,
        created_at: updated.created_at ? new Date(updated.created_at).toISOString() : '',
        updated_at: updated.updated_at ? new Date(updated.updated_at).toISOString() : '',
      };
    });
  }

  /**
   * Delete cheque record (safe guards prevent deleting settled cheques or cheques with financial postings)
   */
  async deleteCheque(authContext: AuthContext, id: number): Promise<{ success: boolean }> {
    const tenantId = String(authContext.tenantId || '');

    return this.db.transaction().execute(async (trx: any) => {
      const existing = await trx
        .selectFrom('accounting_cheques')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .selectAll()
        .forUpdate()
        .executeTakeFirst();

      if (!existing) {
        throw new NotFoundException('الشيك غير موجود');
      }

      if (['collected', 'cleared', 'endorsed'].includes(existing.status)) {
        throw new BadRequestException('لا يمكن حذف شيك تم تحصيله أو صرفه أو تظهيره، يمكنك إلغاؤه بدلاً من ذلك');
      }

      if (existing.journal_entry_id) {
        throw new BadRequestException('لا يمكن حذف شيك له قيود محاسبية مسجلة، قم بإلغاء الشيك للحفاظ على التسلسل المالي');
      }

      await trx
        .deleteFrom('accounting_cheques')
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .execute();

      return { success: true };
    });
  }
}

