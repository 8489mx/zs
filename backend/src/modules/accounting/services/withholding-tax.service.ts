import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';

export interface WithholdingTaxRecord {
  id: number;
  tenant_id: string;
  direction: 'payable' | 'receivable';
  source_type: string;
  source_id: number | null;
  invoice_number: string;
  invoice_date: string;
  partner_type: string;
  partner_id: number | null;
  partner_name: string;
  tax_id_number: string | null;
  file_number: string | null;
  tax_office_code: string | null;
  partner_address: string | null;
  wht_type: string;
  wht_rate: number;
  base_amount: number;
  tax_amount: number;
  quarter: string;
  tax_year: number;
  status: string;
  payment_reference: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface Form41SummaryResponse {
  tax_year: number;
  quarter: string;
  direction: 'payable' | 'receivable';
  total_count: number;
  total_base_amount: number;
  total_tax_amount: number;
  breakdown: {
    goods: { count: number; base_amount: number; tax_amount: number; rate: number };
    services: { count: number; base_amount: number; tax_amount: number; rate: number };
    professional: { count: number; base_amount: number; tax_amount: number; rate: number };
    custom: { count: number; base_amount: number; tax_amount: number };
  };
  transactions: WithholdingTaxRecord[];
}

export interface CreateWhtTransactionDto {
  direction?: 'payable' | 'receivable';
  source_type?: string;
  source_id?: number;
  invoice_number: string;
  invoice_date: string;
  partner_type?: string;
  partner_id?: number;
  partner_name: string;
  tax_id_number?: string;
  file_number?: string;
  tax_office_code?: string;
  partner_address?: string;
  wht_type: 'goods' | 'services' | 'professional' | 'custom';
  wht_rate?: number;
  base_amount: number;
  quarter?: string;
  tax_year?: number;
  notes?: string;
}

export interface ExtractFromPurchasesDto {
  fromDate: string;
  toDate: string;
  defaultWhtRate?: number;
  defaultWhtType?: 'goods' | 'services' | 'professional';
}

@Injectable()
export class WithholdingTaxService {
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

  private determineQuarterAndYear(dateStr: string): { quarter: string; year: number } {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear();
    let quarter = 'Q1';
    if (month >= 1 && month <= 3) quarter = 'Q1';
    else if (month >= 4 && month <= 6) quarter = 'Q2';
    else if (month >= 7 && month <= 9) quarter = 'Q3';
    else quarter = 'Q4';
    return { quarter, year };
  }

  /**
   * Get official Egyptian Form 41 Withholding Tax declaration summary & transactions
   */
  async getForm41Report(
    auth: AuthContext,
    params: { year?: number; quarter?: string; direction?: 'payable' | 'receivable' },
  ): Promise<Form41SummaryResponse> {
    const tenantId = String(auth.tenantId || '');
    const now = new Date();
    const currentQ = this.determineQuarterAndYear(now.toISOString().substring(0, 10));
    const taxYear = params.year ? Number(params.year) : currentQ.year;
    const quarter = params.quarter || currentQ.quarter;
    const direction = params.direction || 'payable';

    const rawRows = await (this.db as any)
      .selectFrom('withholding_tax_transactions')
      .where('tenant_id', '=', tenantId)
      .where('tax_year', '=', taxYear)
      .where('quarter', '=', quarter)
      .where('direction', '=', direction)
      .selectAll()
      .orderBy('invoice_date', 'asc')
      .orderBy('id', 'asc')
      .execute();

    const transactions: WithholdingTaxRecord[] = rawRows.map((r: any) => ({
      id: r.id,
      tenant_id: r.tenant_id,
      direction: r.direction,
      source_type: r.source_type,
      source_id: r.source_id,
      invoice_number: r.invoice_number,
      invoice_date: this.formatDate(r.invoice_date),
      partner_type: r.partner_type,
      partner_id: r.partner_id,
      partner_name: r.partner_name,
      tax_id_number: r.tax_id_number,
      file_number: r.file_number,
      tax_office_code: r.tax_office_code,
      partner_address: r.partner_address,
      wht_type: r.wht_type,
      wht_rate: Number(r.wht_rate),
      base_amount: this.toMoney(r.base_amount),
      tax_amount: this.toMoney(r.tax_amount),
      quarter: r.quarter,
      tax_year: r.tax_year,
      status: r.status,
      payment_reference: r.payment_reference,
      notes: r.notes,
      created_by: r.created_by,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
      updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : '',
    }));

    let totalBase = 0;
    let totalTax = 0;
    const breakdown = {
      goods: { count: 0, base_amount: 0, tax_amount: 0, rate: 1 },
      services: { count: 0, base_amount: 0, tax_amount: 0, rate: 3 },
      professional: { count: 0, base_amount: 0, tax_amount: 0, rate: 5 },
      custom: { count: 0, base_amount: 0, tax_amount: 0 },
    };

    for (const t of transactions) {
      totalBase = this.toMoney(totalBase + t.base_amount);
      totalTax = this.toMoney(totalTax + t.tax_amount);

      if (t.wht_type === 'goods') {
        breakdown.goods.count += 1;
        breakdown.goods.base_amount = this.toMoney(breakdown.goods.base_amount + t.base_amount);
        breakdown.goods.tax_amount = this.toMoney(breakdown.goods.tax_amount + t.tax_amount);
      } else if (t.wht_type === 'services') {
        breakdown.services.count += 1;
        breakdown.services.base_amount = this.toMoney(breakdown.services.base_amount + t.base_amount);
        breakdown.services.tax_amount = this.toMoney(breakdown.services.tax_amount + t.tax_amount);
      } else if (t.wht_type === 'professional') {
        breakdown.professional.count += 1;
        breakdown.professional.base_amount = this.toMoney(breakdown.professional.base_amount + t.base_amount);
        breakdown.professional.tax_amount = this.toMoney(breakdown.professional.tax_amount + t.tax_amount);
      } else {
        breakdown.custom.count += 1;
        breakdown.custom.base_amount = this.toMoney(breakdown.custom.base_amount + t.base_amount);
        breakdown.custom.tax_amount = this.toMoney(breakdown.custom.tax_amount + t.tax_amount);
      }
    }

    return {
      tax_year: taxYear,
      quarter,
      direction,
      total_count: transactions.length,
      total_base_amount: totalBase,
      total_tax_amount: totalTax,
      breakdown,
      transactions,
    };
  }

  /**
   * Create a single withholding tax transaction manually or from an invoice
   */
  async createTransaction(auth: AuthContext, dto: CreateWhtTransactionDto): Promise<WithholdingTaxRecord> {
    const tenantId = String(auth.tenantId || '');

    if (!dto.partner_name || !dto.partner_name.trim()) {
      throw new BadRequestException('اسم المورد أو العميل مطلوب');
    }
    if (!dto.invoice_number || !dto.invoice_number.trim()) {
      throw new BadRequestException('رقم الفاتورة مطلوب');
    }
    if (!dto.invoice_date) {
      throw new BadRequestException('تاريخ الفاتورة مطلوب');
    }
    const baseAmount = Number(dto.base_amount);
    if (!baseAmount || baseAmount <= 0) {
      throw new BadRequestException('قيمة وعاء المعاملة يجب أن تكون أكبر من الصفر');
    }

    // Determine rate based on Egyptian law standard if not provided
    let rate = Number(dto.wht_rate);
    if (rate === undefined || isNaN(rate)) {
      if (dto.wht_type === 'goods') rate = 1.00;
      else if (dto.wht_type === 'services') rate = 3.00;
      else if (dto.wht_type === 'professional') rate = 5.00;
      else rate = 1.00;
    }

    const taxAmount = this.toMoney(baseAmount * (rate / 100));
    const period = this.determineQuarterAndYear(dto.invoice_date);
    const quarter = dto.quarter || period.quarter;
    const taxYear = dto.tax_year || period.year;

    const inserted = await (this.db as any)
      .insertInto('withholding_tax_transactions')
      .values({
        tenant_id: tenantId,
        direction: dto.direction || 'payable',
        source_type: dto.source_type || 'manual',
        source_id: dto.source_id || null,
        invoice_number: dto.invoice_number.trim(),
        invoice_date: dto.invoice_date,
        partner_type: dto.partner_type || (dto.direction === 'receivable' ? 'customer' : 'supplier'),
        partner_id: dto.partner_id || null,
        partner_name: dto.partner_name.trim(),
        tax_id_number: dto.tax_id_number?.trim() || null,
        file_number: dto.file_number?.trim() || null,
        tax_office_code: dto.tax_office_code?.trim() || null,
        partner_address: dto.partner_address?.trim() || null,
        wht_type: dto.wht_type || 'goods',
        wht_rate: rate,
        base_amount: baseAmount,
        tax_amount: taxAmount,
        quarter,
        tax_year: taxYear,
        status: 'draft',
        notes: dto.notes?.trim() || null,
        created_by: auth.userId ? Number(auth.userId) : null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: inserted.id,
      tenant_id: inserted.tenant_id,
      direction: inserted.direction,
      source_type: inserted.source_type,
      source_id: inserted.source_id,
      invoice_number: inserted.invoice_number,
      invoice_date: this.formatDate(inserted.invoice_date),
      partner_type: inserted.partner_type,
      partner_id: inserted.partner_id,
      partner_name: inserted.partner_name,
      tax_id_number: inserted.tax_id_number,
      file_number: inserted.file_number,
      tax_office_code: inserted.tax_office_code,
      partner_address: inserted.partner_address,
      wht_type: inserted.wht_type,
      wht_rate: Number(inserted.wht_rate),
      base_amount: this.toMoney(inserted.base_amount),
      tax_amount: this.toMoney(inserted.tax_amount),
      quarter: inserted.quarter,
      tax_year: inserted.tax_year,
      status: inserted.status,
      payment_reference: inserted.payment_reference,
      notes: inserted.notes,
      created_by: inserted.created_by,
      created_at: inserted.created_at ? new Date(inserted.created_at).toISOString() : '',
      updated_at: inserted.updated_at ? new Date(inserted.updated_at).toISOString() : '',
    };
  }

  /**
   * Smart automatic extraction from purchases bills into Form 41
   */
  async extractFromPurchases(
    auth: AuthContext,
    dto: ExtractFromPurchasesDto,
  ): Promise<{ extracted_count: number; total_tax_added: number; message: string }> {
    const tenantId = String(auth.tenantId || '');
    const fromDate = dto.fromDate;
    const toDate = dto.toDate;
    const whtType = dto.defaultWhtType || 'goods';
    const rate = dto.defaultWhtRate !== undefined ? Number(dto.defaultWhtRate) : 1.00;

    // Fetch purchases that exceed 300 EGP and are not cancelled
    const purchases = await (this.db as any)
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .where('p.tenant_id', '=', tenantId)
      .where('p.status', '!=', 'cancelled')
      .where(sql<boolean>`p.created_at >= ${fromDate}::date AND p.created_at <= (${toDate}::date + interval '1 day')`)
      .where('p.subtotal', '>=', 300) // Egyptian legal minimum threshold for Form 41
      .select([
        'p.id as purchase_id',
        'p.doc_no',
        'p.subtotal',
        'p.discount',
        'p.created_at',
        'p.supplier_id',
        's.name as supplier_name',
        's.company_name',
        's.tax_number',
      ])
      .execute();

    if (purchases.length === 0) {
      return { extracted_count: 0, total_tax_added: 0, message: 'لا توجد فواتير شراء خاضعة للخصم والإضافة في هذه الفترة' };
    }

    // Check existing extracted purchases to avoid duplication
    const purchaseIds = purchases.map((p: any) => p.purchase_id);
    const existing = await (this.db as any)
      .selectFrom('withholding_tax_transactions')
      .where('tenant_id', '=', tenantId)
      .where('source_type', '=', 'purchase')
      .where('source_id', 'in', purchaseIds)
      .select(['source_id'])
      .execute();

    const existingSet = new Set(existing.map((e: any) => e.source_id));
    let addedCount = 0;
    let addedTax = 0;

    for (const p of purchases) {
      if (existingSet.has(p.purchase_id)) continue;

      const dateStr = this.formatDate(p.created_at);
      const period = this.determineQuarterAndYear(dateStr);
      const baseAmount = this.toMoney(Number(p.subtotal || 0) - Number(p.discount || 0));
      if (baseAmount < 300) continue;

      const taxAmount = this.toMoney(baseAmount * (rate / 100));
      const partnerName = p.company_name || p.supplier_name || `مورد رقم ${p.supplier_id || ''}`;

      await (this.db as any)
        .insertInto('withholding_tax_transactions')
        .values({
          tenant_id: tenantId,
          direction: 'payable',
          source_type: 'purchase',
          source_id: p.purchase_id,
          invoice_number: p.doc_no || `PUR-${p.purchase_id}`,
          invoice_date: dateStr,
          partner_type: 'supplier',
          partner_id: p.supplier_id,
          partner_name: partnerName,
          tax_id_number: p.tax_number || null,
          wht_type: whtType,
          wht_rate: rate,
          base_amount: baseAmount,
          tax_amount: taxAmount,
          quarter: period.quarter,
          tax_year: period.year,
          status: 'draft',
          notes: `استيراد آلي من فاتورة الشراء رقم ${p.doc_no || p.purchase_id}`,
          created_by: auth.userId ? Number(auth.userId) : null,
        })
        .execute();

      addedCount++;
      addedTax = this.toMoney(addedTax + taxAmount);
    }

    return {
      extracted_count: addedCount,
      total_tax_added: addedTax,
      message: `تم استيراد ${addedCount} معاملة بنجاح بإجمالي ضريبة خصم ${addedTax} ج.م`,
    };
  }

  /**
   * Update transaction status (draft -> declared / paid)
   */
  async updateStatus(
    auth: AuthContext,
    id: number,
    dto: { status: 'draft' | 'declared' | 'paid'; payment_reference?: string },
  ): Promise<WithholdingTaxRecord> {
    const tenantId = String(auth.tenantId || '');

    const existing = await (this.db as any)
      .selectFrom('withholding_tax_transactions')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('معاملة الخصم والإضافة غير موجودة');
    }

    const updated = await (this.db as any)
      .updateTable('withholding_tax_transactions')
      .set({
        status: dto.status,
        payment_reference: dto.payment_reference || existing.payment_reference,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      direction: updated.direction,
      source_type: updated.source_type,
      source_id: updated.source_id,
      invoice_number: updated.invoice_number,
      invoice_date: this.formatDate(updated.invoice_date),
      partner_type: updated.partner_type,
      partner_id: updated.partner_id,
      partner_name: updated.partner_name,
      tax_id_number: updated.tax_id_number,
      file_number: updated.file_number,
      tax_office_code: updated.tax_office_code,
      partner_address: updated.partner_address,
      wht_type: updated.wht_type,
      wht_rate: Number(updated.wht_rate),
      base_amount: this.toMoney(updated.base_amount),
      tax_amount: this.toMoney(updated.tax_amount),
      quarter: updated.quarter,
      tax_year: updated.tax_year,
      status: updated.status,
      payment_reference: updated.payment_reference,
      notes: updated.notes,
      created_by: updated.created_by,
      created_at: updated.created_at ? new Date(updated.created_at).toISOString() : '',
      updated_at: updated.updated_at ? new Date(updated.updated_at).toISOString() : '',
    };
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(auth: AuthContext, id: number): Promise<{ success: boolean }> {
    const tenantId = String(auth.tenantId || '');

    const existing = await (this.db as any)
      .selectFrom('withholding_tax_transactions')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .selectAll()
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('المعاملة غير موجودة');
    }

    if (existing.status === 'paid') {
      throw new BadRequestException('لا يمكن حذف معاملة تم سدادها وتوريدها للضرائب بالفعل');
    }

    await (this.db as any)
      .deleteFrom('withholding_tax_transactions')
      .where('tenant_id', '=', tenantId)
      .where('id', '=', id)
      .execute();

    return { success: true };
  }
}
