import { Injectable, Logger } from '@nestjs/common';
import { Kysely, Transaction, sql } from '../../database/kysely';
import { Database } from '../../database/database.types';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

type DbOrTx = Kysely<Database> | Transaction<Database>;

type JournalLineDraft = {
  accountId: number;
  description: string;
  debit: number;
  credit: number;
  partnerType: 'none' | 'customer' | 'supplier';
  partnerId: number | null;
  branchId: number | null;
  locationId: number | null;
};

@Injectable()
export class AccountingPostingService {
  private readonly logger = new Logger(AccountingPostingService.name);

  private toMoney(value: unknown): number {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount)) return 0;
    return Number(amount.toFixed(2));
  }

  private async getExistingSaleJournal(queryable: DbOrTx, saleId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', '=', 'sale')
      .where('source_id', '=', saleId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingPurchaseJournal(queryable: DbOrTx, purchaseId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', '=', 'purchase')
      .where('source_id', '=', purchaseId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingSupplierPaymentJournal(queryable: DbOrTx, paymentId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', '=', 'supplier_payment')
      .where('source_id', '=', paymentId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingSupplierPaymentScheduleSettlementJournal(queryable: DbOrTx, settlementId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', '=', 'supplier_payment_schedule_settlement')
      .where('source_id', '=', settlementId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingCustomerPaymentJournal(queryable: DbOrTx, paymentId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', '=', 'customer_payment')
      .where('source_id', '=', paymentId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingExpenseJournal(queryable: DbOrTx, expenseId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', 'in', ['expense', 'treasury_expense'])
      .where('source_id', '=', expenseId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingSaleReversalJournal(queryable: DbOrTx, saleId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', 'in', ['sale_reversal', 'sale_cancel'])
      .where('source_id', '=', saleId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingPurchaseReversalJournal(queryable: DbOrTx, purchaseId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', 'in', ['purchase_reversal', 'purchase_cancel'])
      .where('source_id', '=', purchaseId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getExistingSalesReturnJournal(queryable: DbOrTx, returnId: number) {
    return queryable
      .selectFrom('journal_entries')
      .select(['id', 'status'])
      .where('source_type', 'in', ['sales_return', 'return'])
      .where('source_id', '=', returnId)
      .where('status', 'in', ['draft', 'posted'])
      .orderBy('id desc')
      .executeTakeFirst();
  }

  private async getActiveAccountMap(queryable: DbOrTx, accountIds: number[]): Promise<Map<number, boolean>> {
    const uniqueIds = Array.from(new Set(accountIds.filter((id) => id > 0)));
    if (!uniqueIds.length) return new Map();
    const rows = await queryable
      .selectFrom('accounting_accounts')
      .select(['id', 'is_active'])
      .where('id', 'in', uniqueIds)
      .execute();
    return new Map(rows.map((row) => [Number(row.id), Boolean(row.is_active)]));
  }

  private addLine(lines: JournalLineDraft[], next: JournalLineDraft): void {
    const debit = this.toMoney(next.debit);
    const credit = this.toMoney(next.credit);
    if (debit <= 0 && credit <= 0) return;
    if (debit > 0 && credit > 0) return;

    const existing = lines.find(
      (line) => line.accountId === next.accountId
        && line.partnerType === next.partnerType
        && line.partnerId === next.partnerId
        && line.branchId === next.branchId
        && line.locationId === next.locationId
        && line.description === next.description,
    );
    if (existing) {
      existing.debit = this.toMoney(existing.debit + debit);
      existing.credit = this.toMoney(existing.credit + credit);
      return;
    }

    lines.push({ ...next, debit, credit });
  }

  private async insertPostedJournal(
    queryable: DbOrTx,
    params: {
      sourceType: string;
      sourceId: number;
      entryDate: Date;
      description: string;
      branchId: number | null;
      locationId: number | null;
      createdBy: number | null;
      postedBy: number | null;
      lines: JournalLineDraft[];
    },
  ): Promise<number> {
    const tempEntryNo = `JE-TMP-${params.sourceType}-${params.sourceId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const inserted = await queryable
      .insertInto('journal_entries')
      .values({
        entry_no: tempEntryNo,
        entry_date: params.entryDate,
        description: params.description,
        source_type: params.sourceType,
        source_id: params.sourceId,
        status: 'posted',
        branch_id: params.branchId,
        location_id: params.locationId,
        created_by: params.createdBy,
        posted_by: params.postedBy,
        posted_at: sql`NOW()`,
      } as any)
      .returning('id')
      .executeTakeFirstOrThrow();

    const entryId = Number(inserted.id);
    await queryable
      .updateTable('journal_entries')
      .set({ entry_no: `JE-${String(entryId).padStart(8, '0')}`, updated_at: sql`NOW()` } as any)
      .where('id', '=', entryId)
      .execute();

    for (const line of params.lines) {
      await queryable
        .insertInto('journal_entry_lines')
        .values({
          journal_entry_id: entryId,
          account_id: line.accountId,
          description: line.description,
          debit: this.toMoney(line.debit),
          credit: this.toMoney(line.credit),
          partner_type: line.partnerType,
          partner_id: line.partnerId,
          branch_id: line.branchId,
          location_id: line.locationId,
        } as any)
        .execute();
    }

    return entryId;
  }

  async postSale(queryable: DbOrTx, saleId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingSaleJournal(queryable, saleId);
    if (existing) return { posted: false, journalEntryId: Number(existing.id) };

    const sale = await queryable
      .selectFrom('sales')
      .select([
        'id', 'doc_no', 'customer_id', 'subtotal', 'discount', 'tax_amount',
        'total', 'paid_amount', 'store_credit_used', 'branch_id', 'location_id', 'created_by', 'created_at',
      ])
      .where('id', '=', saleId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirstOrThrow();

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting sale ${saleId}`);

    const payments = await queryable
      .selectFrom('sale_payments')
      .select(['payment_channel', 'amount'])
      .where('sale_id', '=', saleId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .execute();

    const cashAmount = this.toMoney(payments.filter((row) => String(row.payment_channel || '') === 'cash').reduce((sum, row) => sum + Number(row.amount || 0), 0));
    const nonCashAmount = this.toMoney(payments.filter((row) => String(row.payment_channel || '') !== 'cash').reduce((sum, row) => sum + Number(row.amount || 0), 0));

    const subtotal = this.toMoney(sale.subtotal);
    const discount = this.toMoney(sale.discount);
    const taxAmount = this.toMoney(sale.tax_amount);
    const paidAmount = this.toMoney(sale.paid_amount);
    const storeCreditUsed = this.toMoney(sale.store_credit_used);
    const collectibleTotal = this.toMoney(Math.max(0, Number(sale.total || 0) - storeCreditUsed));
    const receivableAmount = this.toMoney(Math.max(0, collectibleTotal - paidAmount));
    const revenueCredit = this.toMoney(subtotal - discount);

    const lines: JournalLineDraft[] = [];
    const customerPartnerId = sale.customer_id ? Number(sale.customer_id) : null;

    if (cashAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.cash_account_id || 0),
        description: 'تحصيل نقدي من فاتورة بيع',
        debit: cashAmount,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    if (nonCashAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.bank_account_id || 0),
        description: 'تحصيل غير نقدي من فاتورة بيع',
        debit: nonCashAmount,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    if (receivableAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.customer_receivable_account_id || 0),
        description: 'مديونية عميل من فاتورة بيع',
        debit: receivableAmount,
        credit: 0,
        partnerType: customerPartnerId ? 'customer' : 'none',
        partnerId: customerPartnerId,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    if (discount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.sales_discount_account_id || 0),
        description: 'خصم مبيعات على الفاتورة',
        debit: discount,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    if (revenueCredit > 0) {
      this.addLine(lines, {
        accountId: Number(settings.sales_revenue_account_id || 0),
        description: 'إيراد مبيعات الفاتورة',
        debit: 0,
        credit: revenueCredit,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    if (taxAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.sales_tax_account_id || 0),
        description: 'ضريبة مبيعات مستحقة',
        debit: 0,
        credit: taxAmount,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    // Reliable COGS source: sale_items.cost_price captured at sale time.
    // In this codebase, sale_items.cost_price is stored per sold unit (already adjusted by unit_multiplier),
    // so do not multiply by unit_multiplier again here.
    const saleItems = await queryable
      .selectFrom('sale_items')
      .select(['qty', 'cost_price'])
      .where('sale_id', '=', saleId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .execute();
    const cogsAmount = this.toMoney(saleItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.cost_price || 0)), 0));

    if (cogsAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.cogs_account_id || 0),
        description: 'تكلفة البضاعة المباعة',
        debit: cogsAmount,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
      this.addLine(lines, {
        accountId: Number(settings.inventory_account_id || 0),
        description: 'إخراج مخزون مقابل المبيعات',
        debit: 0,
        credit: cogsAmount,
        partnerType: 'none',
        partnerId: null,
        branchId: sale.branch_id ? Number(sale.branch_id) : null,
        locationId: sale.location_id ? Number(sale.location_id) : null,
      });
    }

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting sale ${saleId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting sale ${saleId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting sale ${saleId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced sale journal for sale ${saleId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'sale',
      sourceId: saleId,
      entryDate: sale.created_at ? new Date(sale.created_at) : new Date(),
      description: `قيد بيع تلقائي للفاتورة رقم ${sale.doc_no || `S-${saleId}`}`,
      branchId: sale.branch_id ? Number(sale.branch_id) : null,
      locationId: sale.location_id ? Number(sale.location_id) : null,
      createdBy: sale.created_by ? Number(sale.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }

  async reverseSaleJournal(queryable: DbOrTx, saleId: number, reason: string, auth: AuthContext): Promise<{ reversed: boolean; journalEntryId: number | null }> {
    const existingReversal = await this.getExistingSaleReversalJournal(queryable, saleId);
    if (existingReversal) {
      this.logger.warn(`Skipping duplicate sale reversal journal for sale ${saleId}; existing entry ${existingReversal.id}`);
      return { reversed: false, journalEntryId: Number(existingReversal.id) };
    }

    const sourceJournal = await queryable
      .selectFrom('journal_entries')
      .select(['id', 'branch_id', 'location_id', 'created_by'])
      .where('source_type', '=', 'sale')
      .where('source_id', '=', saleId)
      .where('status', '=', 'posted')
      .orderBy('id desc')
      .executeTakeFirst();
    if (!sourceJournal) {
      this.logger.warn(`No posted sale journal found for sale ${saleId}; skipping accounting reversal`);
      return { reversed: false, journalEntryId: null };
    }

    const scope = requireTenantScope(auth);
    const sale = await queryable
      .selectFrom('sales')
      .select(['doc_no'])
      .where('id', '=', saleId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
    const docNo = sale?.doc_no || `S-${saleId}`;

    const sourceLines = await queryable
      .selectFrom('journal_entry_lines')
      .select(['account_id', 'description', 'debit', 'credit', 'partner_type', 'partner_id', 'branch_id', 'location_id'])
      .where('journal_entry_id', '=', Number(sourceJournal.id))
      .orderBy('id asc')
      .execute();

    const reversalLines: JournalLineDraft[] = sourceLines.map((line) => ({
      accountId: Number(line.account_id),
      description: `عكس: ${line.description || 'قيد بيع'}`,
      debit: this.toMoney(line.credit),
      credit: this.toMoney(line.debit),
      partnerType: (line.partner_type as 'none' | 'customer' | 'supplier') || 'none',
      partnerId: line.partner_id ? Number(line.partner_id) : null,
      branchId: line.branch_id ? Number(line.branch_id) : null,
      locationId: line.location_id ? Number(line.location_id) : null,
    })).filter((line) => line.debit > 0 || line.credit > 0);

    const totalDebit = this.toMoney(reversalLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(reversalLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced sale reversal journal for sale ${saleId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'sale_reversal',
      sourceId: saleId,
      entryDate: new Date(),
      description: `قيد عكسي لإلغاء فاتورة بيع رقم ${docNo}${reason ? ` - ${reason}` : ''}`,
      branchId: sourceJournal.branch_id ? Number(sourceJournal.branch_id) : null,
      locationId: sourceJournal.location_id ? Number(sourceJournal.location_id) : null,
      createdBy: sourceJournal.created_by ? Number(sourceJournal.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: reversalLines,
    });

    this.logger.warn(`Posted sale reversal journal for sale ${saleId} as entry ${entryId}`);
    return { reversed: true, journalEntryId: entryId };
  }

  async postSalesReturn(queryable: DbOrTx, returnId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number | null }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingSalesReturnJournal(queryable, returnId);
    if (existing) {
      this.logger.warn(`Skipping duplicate sales return journal for return ${returnId}; existing entry ${existing.id}`);
      return { posted: false, journalEntryId: Number(existing.id) };
    }

    const returnDocument = await queryable
      .selectFrom('return_documents')
      .select([
        'id',
        'doc_no',
        'return_type',
        'invoice_id',
        'settlement_mode',
        'refund_method',
        'total',
        'branch_id',
        'location_id',
        'created_by',
        'created_at',
      ])
      .where('id', '=', returnId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();

    if (!returnDocument || returnDocument.return_type !== 'sale') {
      this.logger.warn(`Sales return document ${returnId} not found or not a sale return; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const sale = returnDocument.invoice_id
      ? await queryable
        .selectFrom('sales')
        .select(['id', 'doc_no', 'payment_type', 'customer_id'])
        .where('id', '=', Number(returnDocument.invoice_id))
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst()
      : null;

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting sales return ${returnId}`);

    const salesReturnsAccount = await queryable
      .selectFrom('accounting_accounts')
      .select(['id', 'is_active'])
      .where('code', '=', '4400')
      .executeTakeFirst();
    const fallbackRevenueAccountId = Number(settings.sales_revenue_account_id || 0);
    const salesReturnsAccountId = Number(salesReturnsAccount?.id || 0) > 0 ? Number(salesReturnsAccount?.id || 0) : fallbackRevenueAccountId;
    if (!(Number(salesReturnsAccount?.id || 0) > 0) && fallbackRevenueAccountId > 0) {
      this.logger.warn(`Sales returns account code 4400 not found for return ${returnId}; falling back to sales revenue account ${fallbackRevenueAccountId}`);
    }

    const total = this.toMoney(returnDocument.total);
    const customerPartnerId = sale?.customer_id ? Number(sale.customer_id) : null;
    const lines: JournalLineDraft[] = [];
    const branchId = returnDocument.branch_id ? Number(returnDocument.branch_id) : null;
    const locationId = returnDocument.location_id ? Number(returnDocument.location_id) : null;
    const invoiceNo = sale?.doc_no || returnDocument.doc_no || `S-${returnDocument.invoice_id || ''}`;

    if (total > 0) {
      this.addLine(lines, {
        accountId: salesReturnsAccountId,
        description: `مردودات مبيعات للفاتورة رقم ${invoiceNo}`,
        debit: total,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId,
        locationId,
      });
    }

    const settlementMode = String(returnDocument.settlement_mode || '').trim().toLowerCase();
    const refundMethod = String(returnDocument.refund_method || '').trim().toLowerCase();
    const originalSalePaymentType = String(sale?.payment_type || '').trim().toLowerCase();

    if (total > 0) {
      if (settlementMode === 'store_credit' || originalSalePaymentType === 'credit') {
        this.addLine(lines, {
          accountId: Number(settings.customer_receivable_account_id || 0),
          description: `تسوية رصيد عميل من مرتجع فاتورة رقم ${invoiceNo}`,
          debit: 0,
          credit: total,
          partnerType: customerPartnerId ? 'customer' : 'none',
          partnerId: customerPartnerId,
          branchId,
          locationId,
        });
      } else if (refundMethod === 'cash') {
        this.addLine(lines, {
          accountId: Number(settings.cash_account_id || 0),
          description: `رد نقدي للعميل من مرتجع فاتورة رقم ${invoiceNo}`,
          debit: 0,
          credit: total,
          partnerType: 'none',
          partnerId: null,
          branchId,
          locationId,
        });
      } else {
        // Fallback for non-cash refund methods (card/wallet/instapay) follows existing return settlement behavior.
        this.addLine(lines, {
          accountId: Number(settings.bank_account_id || 0),
          description: `رد غير نقدي للعميل من مرتجع فاتورة رقم ${invoiceNo}`,
          debit: 0,
          credit: total,
          partnerType: 'none',
          partnerId: null,
          branchId,
          locationId,
        });
      }
    }

    // Reliable cost source for return COGS reversal: original sale_items.cost_price at sale time.
    const returnItems = await queryable
      .selectFrom('return_items')
      .select(['product_id', 'qty'])
      .where('return_document_id', '=', returnId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .execute();

    const saleItems = sale?.id
      ? await queryable
        .selectFrom('sale_items')
        .select(['product_id', 'qty', 'cost_price'])
        .where('sale_id', '=', Number(sale.id))
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .execute()
      : [];

    const saleItemByProductId = new Map<number, { qty: number; cost_price: number }>();
    for (const item of saleItems) {
      const productId = Number(item.product_id || 0);
      if (!(productId > 0)) continue;
      if (!saleItemByProductId.has(productId)) {
        saleItemByProductId.set(productId, { qty: Number(item.qty || 0), cost_price: Number(item.cost_price || 0) });
      }
    }

    let inventoryReversalAmount = 0;
    for (const returnItem of returnItems) {
      const productId = Number(returnItem.product_id || 0);
      const returnedQty = Number(returnItem.qty || 0);
      if (!(productId > 0) || !(returnedQty > 0)) continue;
      const sourceSaleItem = saleItemByProductId.get(productId);
      if (!sourceSaleItem) {
        this.logger.warn(`Missing original sale item for return ${returnId}, product ${productId}; skipping cost reversal for this line`);
        continue;
      }
      const itemCost = Number(sourceSaleItem.cost_price || 0);
      if (!(itemCost >= 0)) {
        this.logger.warn(`Invalid sale item cost for return ${returnId}, product ${productId}; skipping cost reversal for this line`);
        continue;
      }
      inventoryReversalAmount += (returnedQty * itemCost);
    }
    inventoryReversalAmount = this.toMoney(inventoryReversalAmount);

    if (inventoryReversalAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.inventory_account_id || 0),
        description: `إرجاع المخزون من مرتجع فاتورة رقم ${invoiceNo}`,
        debit: inventoryReversalAmount,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId,
        locationId,
      });
      this.addLine(lines, {
        accountId: Number(settings.cogs_account_id || 0),
        description: `عكس تكلفة البضاعة المباعة لمرتجع فاتورة رقم ${invoiceNo}`,
        debit: 0,
        credit: inventoryReversalAmount,
        partnerType: 'none',
        partnerId: null,
        branchId,
        locationId,
      });
    } else {
      // TODO(accounting): if reliable per-line return cost is unavailable in some edge cases, keep posting refund side only.
      this.logger.warn(`Sales return ${returnId} has no reliable cost lines; posting revenue/refund side only`);
    }

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting sales return ${returnId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting sales return ${returnId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting sales return ${returnId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced sales return journal for return ${returnId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'sales_return',
      sourceId: returnId,
      entryDate: returnDocument.created_at ? new Date(returnDocument.created_at) : new Date(),
      description: `قيد مرتجع بيع للفاتورة رقم ${invoiceNo}`,
      branchId,
      locationId,
      createdBy: returnDocument.created_by ? Number(returnDocument.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }

  async postPurchase(queryable: DbOrTx, purchaseId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingPurchaseJournal(queryable, purchaseId);
    if (existing) return { posted: false, journalEntryId: Number(existing.id) };

    const purchase = await queryable
      .selectFrom('purchases')
      .select([
        'id', 'doc_no', 'payment_type', 'subtotal', 'discount', 'tax_amount', 'total',
        'branch_id', 'location_id', 'created_by', 'created_at', 'supplier_id',
      ])
      .where('id', '=', purchaseId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirstOrThrow();

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting purchase ${purchaseId}`);

    const lines: JournalLineDraft[] = [];
    const branchId = purchase.branch_id ? Number(purchase.branch_id) : null;
    const locationId = purchase.location_id ? Number(purchase.location_id) : null;

    // Reliable inventory value source: purchase_items qty * unit_cost from the purchase document.
    const purchaseItems = await queryable
      .selectFrom('purchase_items')
      .select(['qty', 'unit_cost'])
      .where('purchase_id', '=', purchaseId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .execute();

    const lineCostTotal = this.toMoney(
      purchaseItems.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.unit_cost || 0)), 0),
    );

    const taxAmount = this.toMoney(purchase.tax_amount);
    const total = this.toMoney(purchase.total);
    // Prefer header-consistent net purchase amount (total - tax) to keep discounts/tax aligned.
    // Fallback to summed item cost when header fields are not reliable.
    const inventoryDebit = this.toMoney(Math.max(0, total - taxAmount)) > 0
      ? this.toMoney(Math.max(0, total - taxAmount))
      : lineCostTotal;
    const payableCredit = purchase.payment_type === 'credit' ? total : 0;
    const cashOrBankCredit = purchase.payment_type === 'credit' ? 0 : total;

    if (inventoryDebit > 0) {
      this.addLine(lines, {
        accountId: Number(settings.inventory_account_id || 0),
        description: 'إثبات تكلفة شراء للمخزون',
        debit: inventoryDebit,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId,
        locationId,
      });
    }

    if (taxAmount > 0) {
      this.addLine(lines, {
        accountId: Number(settings.purchase_tax_account_id || 0),
        description: 'ضريبة مشتريات قابلة للخصم',
        debit: taxAmount,
        credit: 0,
        partnerType: 'none',
        partnerId: null,
        branchId,
        locationId,
      });
    }

    if (payableCredit > 0) {
      this.addLine(lines, {
        accountId: Number(settings.supplier_payable_account_id || 0),
        description: 'استحقاق مورد من فاتورة شراء',
        debit: 0,
        credit: payableCredit,
        partnerType: purchase.supplier_id ? 'supplier' : 'none',
        partnerId: purchase.supplier_id ? Number(purchase.supplier_id) : null,
        branchId,
        locationId,
      });
    }

    if (cashOrBankCredit > 0) {
      this.addLine(lines, {
        accountId: Number(settings.cash_account_id || 0),
        description: 'سداد نقدي لفاتورة شراء',
        debit: 0,
        credit: cashOrBankCredit,
        partnerType: 'none',
        partnerId: null,
        branchId,
        locationId,
      });
    }

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting purchase ${purchaseId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting purchase ${purchaseId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting purchase ${purchaseId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced purchase journal for purchase ${purchaseId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'purchase',
      sourceId: purchaseId,
      entryDate: purchase.created_at ? new Date(purchase.created_at) : new Date(),
      description: `قيد شراء تلقائي للفاتورة رقم ${purchase.doc_no || `PUR-${purchaseId}`}`,
      branchId,
      locationId,
      createdBy: purchase.created_by ? Number(purchase.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }

  async reversePurchaseJournal(queryable: DbOrTx, purchaseId: number, reason: string, auth: AuthContext): Promise<{ reversed: boolean; journalEntryId: number | null }> {
    const existingReversal = await this.getExistingPurchaseReversalJournal(queryable, purchaseId);
    if (existingReversal) {
      this.logger.warn(`Skipping duplicate purchase reversal journal for purchase ${purchaseId}; existing entry ${existingReversal.id}`);
      return { reversed: false, journalEntryId: Number(existingReversal.id) };
    }

    const sourceJournal = await queryable
      .selectFrom('journal_entries')
      .select(['id', 'branch_id', 'location_id', 'created_by'])
      .where('source_type', '=', 'purchase')
      .where('source_id', '=', purchaseId)
      .where('status', '=', 'posted')
      .orderBy('id desc')
      .executeTakeFirst();
    if (!sourceJournal) {
      this.logger.warn(`No posted purchase journal found for purchase ${purchaseId}; skipping accounting reversal`);
      return { reversed: false, journalEntryId: null };
    }

    const scope = requireTenantScope(auth);
    const purchase = await queryable
      .selectFrom('purchases')
      .select(['doc_no'])
      .where('id', '=', purchaseId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
    const docNo = purchase?.doc_no || `PUR-${purchaseId}`;

    const sourceLines = await queryable
      .selectFrom('journal_entry_lines')
      .select(['account_id', 'description', 'debit', 'credit', 'partner_type', 'partner_id', 'branch_id', 'location_id'])
      .where('journal_entry_id', '=', Number(sourceJournal.id))
      .orderBy('id asc')
      .execute();

    const reversalLines: JournalLineDraft[] = sourceLines.map((line) => ({
      accountId: Number(line.account_id),
      description: `عكس: ${line.description || 'قيد شراء'}`,
      debit: this.toMoney(line.credit),
      credit: this.toMoney(line.debit),
      partnerType: (line.partner_type as 'none' | 'customer' | 'supplier') || 'none',
      partnerId: line.partner_id ? Number(line.partner_id) : null,
      branchId: line.branch_id ? Number(line.branch_id) : null,
      locationId: line.location_id ? Number(line.location_id) : null,
    })).filter((line) => line.debit > 0 || line.credit > 0);

    const totalDebit = this.toMoney(reversalLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(reversalLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced purchase reversal journal for purchase ${purchaseId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'purchase_reversal',
      sourceId: purchaseId,
      entryDate: new Date(),
      description: `قيد عكسي لإلغاء فاتورة شراء رقم ${docNo}${reason ? ` - ${reason}` : ''}`,
      branchId: sourceJournal.branch_id ? Number(sourceJournal.branch_id) : null,
      locationId: sourceJournal.location_id ? Number(sourceJournal.location_id) : null,
      createdBy: sourceJournal.created_by ? Number(sourceJournal.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: reversalLines,
    });

    this.logger.warn(`Posted purchase reversal journal for purchase ${purchaseId} as entry ${entryId}`);
    return { reversed: true, journalEntryId: entryId };
  }

  async postSupplierPayment(queryable: DbOrTx, paymentId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number | null }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingSupplierPaymentJournal(queryable, paymentId);
    if (existing) return { posted: false, journalEntryId: Number(existing.id) };

    const payment = await queryable
      .selectFrom('supplier_payments as sp')
      .leftJoin('suppliers as s', 's.id', 'sp.supplier_id')
      .select([
        'sp.id',
        'sp.doc_no',
        'sp.supplier_id',
        'sp.amount',
        'sp.note',
        'sp.payment_date',
        'sp.branch_id',
        'sp.location_id',
        'sp.created_by',
        'sp.created_at',
        's.name as supplier_name',
      ])
      .where('sp.id', '=', paymentId)
      .where(sql<boolean>`sp.tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
    if (!payment) {
      this.logger.warn(`Supplier payment ${paymentId} not found; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting supplier payment ${paymentId}`);

    const amount = this.toMoney(payment.amount);
    if (!(amount > 0)) {
      this.logger.warn(`Supplier payment ${paymentId} has non-positive amount; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const branchId = payment.branch_id ? Number(payment.branch_id) : null;
    const locationId = payment.location_id ? Number(payment.location_id) : null;
    const supplierName = String(payment.supplier_name || '').trim();
    const docNo = String(payment.doc_no || `PO-${paymentId}`).trim();

    // No explicit payment method is stored for supplier_payments in current schema.
    // Fallback to cash account to match existing treasury flow behavior for this endpoint.
    const lines: JournalLineDraft[] = [];
    this.addLine(lines, {
      accountId: Number(settings.supplier_payable_account_id || 0),
      description: 'سداد مستحقات مورد',
      debit: amount,
      credit: 0,
      partnerType: payment.supplier_id ? 'supplier' : 'none',
      partnerId: payment.supplier_id ? Number(payment.supplier_id) : null,
      branchId,
      locationId,
    });
    this.addLine(lines, {
      accountId: Number(settings.cash_account_id || 0),
      description: 'خروج نقدية لسداد مورد',
      debit: 0,
      credit: amount,
      partnerType: 'none',
      partnerId: null,
      branchId,
      locationId,
    });

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting supplier payment ${paymentId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting supplier payment ${paymentId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting supplier payment ${paymentId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced supplier payment journal for payment ${paymentId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'supplier_payment',
      sourceId: paymentId,
      entryDate: payment.payment_date ? new Date(payment.payment_date) : (payment.created_at ? new Date(payment.created_at) : new Date()),
      description: `قيد سداد مورد رقم ${docNo}${supplierName ? ` - ${supplierName}` : ''}`,
      branchId,
      locationId,
      createdBy: payment.created_by ? Number(payment.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }

  async postSupplierPaymentScheduleSettlement(queryable: DbOrTx, settlementId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number | null }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingSupplierPaymentScheduleSettlementJournal(queryable, settlementId);
    if (existing) return { posted: false, journalEntryId: Number(existing.id) };

    const settlement = await queryable
      .selectFrom('supplier_payment_schedule_logs as l')
      .leftJoin('supplier_payment_schedules as sch', 'sch.id', 'l.schedule_id')
      .leftJoin('suppliers as s', 's.id', 'l.supplier_id')
      .select([
        'l.id',
        'l.schedule_id',
        'l.supplier_id',
        'l.amount',
        'l.note',
        'l.created_by',
        'l.created_at',
        'sch.purchase_id',
        's.name as supplier_name',
      ])
      .where('l.id', '=', settlementId)
      .where(sql<boolean>`l.tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
    if (!settlement) {
      this.logger.warn(`Supplier payment schedule settlement ${settlementId} not found; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting supplier payment schedule settlement ${settlementId}`);

    const amount = this.toMoney(settlement.amount);
    if (!(amount > 0)) {
      this.logger.warn(`Supplier payment schedule settlement ${settlementId} has non-positive amount; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const purchase = settlement.purchase_id
      ? await queryable
        .selectFrom('purchases')
        .select(['branch_id', 'location_id'])
        .where('id', '=', Number(settlement.purchase_id))
        .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
        .executeTakeFirst()
      : null;

    const branchId = purchase?.branch_id ? Number(purchase.branch_id) : null;
    const locationId = purchase?.location_id ? Number(purchase.location_id) : null;
    const supplierName = String(settlement.supplier_name || '').trim();

    // No explicit payment method is stored for schedule settlement logs.
    // Fallback to cash account to match current treasury write behavior.
    const lines: JournalLineDraft[] = [];
    this.addLine(lines, {
      accountId: Number(settings.supplier_payable_account_id || 0),
      description: 'سداد مستحقات مورد',
      debit: amount,
      credit: 0,
      partnerType: settlement.supplier_id ? 'supplier' : 'none',
      partnerId: settlement.supplier_id ? Number(settlement.supplier_id) : null,
      branchId,
      locationId,
    });
    this.addLine(lines, {
      accountId: Number(settings.cash_account_id || 0),
      description: 'خروج نقدية لسداد مورد',
      debit: 0,
      credit: amount,
      partnerType: 'none',
      partnerId: null,
      branchId,
      locationId,
    });

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting supplier payment schedule settlement ${settlementId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting supplier payment schedule settlement ${settlementId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting supplier payment schedule settlement ${settlementId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced supplier payment schedule settlement journal for settlement ${settlementId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'supplier_payment_schedule_settlement',
      sourceId: settlementId,
      entryDate: settlement.created_at ? new Date(settlement.created_at) : new Date(),
      description: `قيد سداد مورد${supplierName ? ` - ${supplierName}` : ''}`,
      branchId,
      locationId,
      createdBy: settlement.created_by ? Number(settlement.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }

  async postCustomerPayment(queryable: DbOrTx, paymentId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number | null }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingCustomerPaymentJournal(queryable, paymentId);
    if (existing) return { posted: false, journalEntryId: Number(existing.id) };

    const payment = await queryable
      .selectFrom('customer_payments as cp')
      .leftJoin('customers as c', 'c.id', 'cp.customer_id')
      .select([
        'cp.id',
        'cp.customer_id',
        'cp.amount',
        'cp.note',
        'cp.branch_id',
        'cp.location_id',
        'cp.created_by',
        'cp.created_at',
        'c.name as customer_name',
      ])
      .where('cp.id', '=', paymentId)
      .where(sql<boolean>`cp.tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();

    if (!payment) {
      this.logger.warn(`Customer payment ${paymentId} not found; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting customer payment ${paymentId}`);

    const amount = this.toMoney(payment.amount);
    if (!(amount > 0)) {
      this.logger.warn(`Customer payment ${paymentId} has non-positive amount; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const branchId = payment.branch_id ? Number(payment.branch_id) : null;
    const locationId = payment.location_id ? Number(payment.location_id) : null;
    const customerName = String(payment.customer_name || '').trim();

    // No explicit payment method is stored for customer_payments in current schema.
    // Fallback to cash account to match existing treasury write behavior for this endpoint.
    const lines: JournalLineDraft[] = [];
    this.addLine(lines, {
      accountId: Number(settings.cash_account_id || 0),
      description: 'دخول نقدية من تحصيل عميل',
      debit: amount,
      credit: 0,
      partnerType: 'none',
      partnerId: null,
      branchId,
      locationId,
    });
    this.addLine(lines, {
      accountId: Number(settings.customer_receivable_account_id || 0),
      description: 'تحصيل مستحقات عميل',
      debit: 0,
      credit: amount,
      partnerType: payment.customer_id ? 'customer' : 'none',
      partnerId: payment.customer_id ? Number(payment.customer_id) : null,
      branchId,
      locationId,
    });

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting customer payment ${paymentId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting customer payment ${paymentId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting customer payment ${paymentId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced customer payment journal for payment ${paymentId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'customer_payment',
      sourceId: paymentId,
      entryDate: payment.created_at ? new Date(payment.created_at) : new Date(),
      description: `قيد تحصيل عميل${customerName ? ` - ${customerName}` : ''}`,
      branchId,
      locationId,
      createdBy: payment.created_by ? Number(payment.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }

  async postExpense(queryable: DbOrTx, expenseId: number, auth: AuthContext): Promise<{ posted: boolean; journalEntryId: number | null }> {
    const scope = requireTenantScope(auth);
    const existing = await this.getExistingExpenseJournal(queryable, expenseId);
    if (existing) {
      this.logger.warn(`Skipping duplicate expense journal for expense ${expenseId}; existing entry ${existing.id}`);
      return { posted: false, journalEntryId: Number(existing.id) };
    }

    const expense = await queryable
      .selectFrom('expenses')
      .select([
        'id',
        'title',
        'amount',
        'note',
        'expense_date',
        'branch_id',
        'location_id',
        'created_by',
        'created_at',
      ])
      .where('id', '=', expenseId)
      .where(sql<boolean>`tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();

    if (!expense) {
      this.logger.warn(`Expense ${expenseId} not found; skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const settings = await queryable.selectFrom('accounting_settings').selectAll().where('id', '=', 1).executeTakeFirst();
    if (!settings) throw new Error(`Accounting settings missing while posting expense ${expenseId}`);

    const amount = this.toMoney(expense.amount);
    if (!(amount > 0)) {
      this.logger.warn(`Expense ${expenseId} has invalid amount (${amount}); skipping accounting post`);
      return { posted: false, journalEntryId: null };
    }

    const branchId = expense.branch_id ? Number(expense.branch_id) : null;
    const locationId = expense.location_id ? Number(expense.location_id) : null;
    const expenseTitle = String(expense.title || '').trim();

    // Current expense flow is cash-based and does not persist payment method.
    // Use cash account credit to match existing treasury transaction behavior (txn_type: expense, negative amount).
    const lines: JournalLineDraft[] = [];
    this.addLine(lines, {
      accountId: Number(settings.expenses_account_id || 0),
      description: 'إثبات مصروف',
      debit: amount,
      credit: 0,
      partnerType: 'none',
      partnerId: null,
      branchId,
      locationId,
    });
    this.addLine(lines, {
      accountId: Number(settings.cash_account_id || 0),
      description: 'خروج نقدية لمصروف',
      debit: 0,
      credit: amount,
      partnerType: 'none',
      partnerId: null,
      branchId,
      locationId,
    });

    const accountMap = await this.getActiveAccountMap(queryable, lines.map((line) => line.accountId));
    for (const line of lines) {
      if (!(line.accountId > 0)) throw new Error(`Invalid accounting setting account id while posting expense ${expenseId}`);
      if (!accountMap.has(line.accountId)) throw new Error(`Configured account ${line.accountId} was not found while posting expense ${expenseId}`);
      if (!accountMap.get(line.accountId)) throw new Error(`Configured account ${line.accountId} is inactive while posting expense ${expenseId}`);
    }

    const normalizedLines = lines.map((line) => ({ ...line, debit: this.toMoney(line.debit), credit: this.toMoney(line.credit) })).filter((line) => line.debit > 0 || line.credit > 0);
    const totalDebit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.debit, 0));
    const totalCredit = this.toMoney(normalizedLines.reduce((sum, line) => sum + line.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new Error(`Unbalanced expense journal for expense ${expenseId}: debit=${totalDebit} credit=${totalCredit}`);
    }

    const entryId = await this.insertPostedJournal(queryable, {
      sourceType: 'expense',
      sourceId: expenseId,
      entryDate: expense.expense_date ? new Date(expense.expense_date) : (expense.created_at ? new Date(expense.created_at) : new Date()),
      description: `قيد مصروف: ${expenseTitle || `EXP-${expenseId}`}`,
      branchId,
      locationId,
      createdBy: expense.created_by ? Number(expense.created_by) : auth.userId,
      postedBy: auth.userId,
      lines: normalizedLines,
    });

    return { posted: true, journalEntryId: entryId };
  }
}
