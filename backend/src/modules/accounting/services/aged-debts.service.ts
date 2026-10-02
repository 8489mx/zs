import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';

export interface AgedPartnerRow {
  partnerId: number;
  partnerName: string;
  phone?: string;
  creditLimit?: number;
  totalBalance: number;
  currentAmount: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days91Plus: number;
  oldestInvoiceDate?: string;
  oldestInvoiceDays?: number;
  riskLevel: 'current' | 'low' | 'medium' | 'high' | 'critical';
  whatsAppUrl?: string;
}

export interface AgedDebtsSummary {
  asOfDate: string;
  page: number;
  pageSize: number;
  totalPartnersCount: number;
  filteredPartnersCount: number;
  overduePartnersCount: number;
  totalBalance: number;
  totalCurrent: number;
  total1To30: number;
  total31To60: number;
  total61To90: number;
  total91Plus: number;
  partners: AgedPartnerRow[];
}

interface AgingSqlRow {
  total_partners_count: number | string;
  filtered_partners_count: number | string;
  overdue_partners_count: number | string;
  total_balance: number | string;
  total_current: number | string;
  total_1_to_30: number | string;
  total_31_to_60: number | string;
  total_61_to_90: number | string;
  total_91_plus: number | string;
  partners: Array<{
    partner_id: number;
    partner_name: string;
    phone: string | null;
    credit_limit: number | string | null;
    total_balance: number | string;
    current_amount: number | string;
    days_1_to_30: number | string;
    days_31_to_60: number | string;
    days_61_to_90: number | string;
    days_91_plus: number | string;
    oldest_invoice_date: string | null;
    oldest_invoice_days: number | null;
    risk_weight: number;
  }>;
}

@Injectable()
export class AgedDebtsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private money(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  }

  getAgedReceivables(auth: AuthContext, params: { asOfDate?: string; branchId?: number; page?: number; pageSize?: number; search?: string; risk?: string }) {
    return this.report(auth, params, 'receivables');
  }

  getAgedPayables(auth: AuthContext, params: { asOfDate?: string; branchId?: number; page?: number; pageSize?: number; search?: string; risk?: string }) {
    return this.report(auth, params, 'payables');
  }

  private async report(
    auth: AuthContext,
    params: { asOfDate?: string; branchId?: number; page?: number; pageSize?: number; search?: string; risk?: string },
    kind: 'receivables' | 'payables',
  ): Promise<AgedDebtsSummary> {
    const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
    if (!Number.isFinite(asOfDate.getTime())) throw new BadRequestException('Invalid asOfDate');
    asOfDate.setHours(23, 59, 59, 999);
    const page = Math.min(10_000, Math.max(1, Math.trunc(Number(params.page) || 1)));
    const pageSize = Math.min(200, Math.max(1, Math.trunc(Number(params.pageSize) || 50)));
    const offset = (page - 1) * pageSize;
    const threeYearsAgo = new Date(asOfDate);
    threeYearsAgo.setUTCFullYear(threeYearsAgo.getUTCFullYear() - 3);

    // Identifiers are selected only from fixed, internal literals. All values remain bound.
    const partnerTable = sql.ref(kind === 'receivables' ? 'customers' : 'suppliers');
    const invoiceTable = sql.ref(kind === 'receivables' ? 'sales' : 'purchases');
    const partnerFk = sql.ref(kind === 'receivables' ? 'i.customer_id' : 'i.supplier_id');
    const invoiceDate = kind === 'receivables'
      ? sql`i.created_at`
      : sql`coalesce(i.date::timestamptz, i.created_at)`;
    const creditLimit = kind === 'receivables' ? sql`p.credit_limit` : sql`null::numeric`;
    const branchFilter = params.branchId ? sql`and i.branch_id = ${params.branchId}` : sql``;
    const order = kind === 'receivables'
      ? sql`risk_weight desc, total_balance desc, partner_id asc`
      : sql`total_balance desc, partner_id asc`;
    const search = String(params.search || '').trim().slice(0, 100);
    const riskWeights: Record<string, number> = { current: 0, low: 1, medium: 2, high: 3, critical: 4 };
    const riskWeight = params.risk && Object.prototype.hasOwnProperty.call(riskWeights, params.risk)
      ? riskWeights[params.risk] : null;
    const searchFilter = search ? sql`and (partner_name ilike ${`%${search}%`} or phone ilike ${`%${search}%`})` : sql``;
    const riskFilter = riskWeight === null ? sql`` : sql`and risk_weight = ${riskWeight}`;

    // Window allocation preserves the existing newest-invoice-first reconciliation against
    // the partner balance. The older, unmatched opening balance goes to the 91+ bucket.
    const result = await sql<AgingSqlRow>`
      with partners as (
        select p.id, p.name, p.phone, p.balance::numeric as balance,
               ${creditLimit} as credit_limit
        from ${partnerTable} p
        where p.tenant_id = ${auth.tenantId} and p.is_active = true and p.balance > 0.01
      ), invoices as (
        select ${partnerFk} as partner_id, ${invoiceDate} as invoice_date,
               greatest(0, i.total - coalesce(i.paid_amount, 0))::numeric as unpaid,
               coalesce(sum(greatest(0, i.total - coalesce(i.paid_amount, 0)))
                 over (partition by ${partnerFk} order by i.created_at desc, i.id desc
                       rows between unbounded preceding and 1 preceding), 0) as prior_unpaid
        from ${invoiceTable} i
        join partners p on p.id = ${partnerFk}
        where i.tenant_id = ${auth.tenantId} and i.status <> 'cancelled'
          and i.total - coalesce(i.paid_amount, 0) > 0.01
          and i.created_at between ${threeYearsAgo} and ${asOfDate}
          ${branchFilter}
      ), allocated as (
        select i.partner_id, i.invoice_date,
               greatest(0, least(i.unpaid, p.balance - i.prior_unpaid)) as amount,
               floor(extract(epoch from (${asOfDate}::timestamptz - i.invoice_date)) / 86400)::int as days_old
        from invoices i join partners p on p.id = i.partner_id
      ), buckets as (
        select partner_id,
          coalesce(sum(amount), 0) as allocated_amount,
          coalesce(sum(amount) filter (where days_old <= 0), 0) as current_amount,
          coalesce(sum(amount) filter (where days_old between 1 and 30), 0) as days_1_to_30,
          coalesce(sum(amount) filter (where days_old between 31 and 60), 0) as days_31_to_60,
          coalesce(sum(amount) filter (where days_old between 61 and 90), 0) as days_61_to_90,
          coalesce(sum(amount) filter (where days_old > 90), 0) as days_91_plus,
          min(invoice_date) filter (where amount > 0) as oldest_invoice_date
        from allocated group by partner_id
      ), partner_rows as materialized (
        select p.id as partner_id, p.name as partner_name, p.phone, p.credit_limit,
               round(p.balance, 2) as total_balance,
               round(coalesce(b.current_amount, 0), 2) as current_amount,
               round(coalesce(b.days_1_to_30, 0), 2) as days_1_to_30,
               round(coalesce(b.days_31_to_60, 0), 2) as days_31_to_60,
               round(coalesce(b.days_61_to_90, 0), 2) as days_61_to_90,
               round(coalesce(b.days_91_plus, 0) + greatest(0, p.balance - coalesce(b.allocated_amount, 0)), 2) as days_91_plus,
               b.oldest_invoice_date,
               case when b.oldest_invoice_date is null then 0
                    else floor(extract(epoch from (${asOfDate}::timestamptz - b.oldest_invoice_date)) / 86400)::int end as oldest_invoice_days,
               case when coalesce(b.days_91_plus, 0) + greatest(0, p.balance - coalesce(b.allocated_amount, 0)) > 0 then 4
                    when coalesce(b.days_61_to_90, 0) > 0 then 3
                    when coalesce(b.days_31_to_60, 0) > 0 then 2
                    when coalesce(b.days_1_to_30, 0) > 0 then 1 else 0 end as risk_weight
        from partners p left join buckets b on b.partner_id = p.id
      ), filtered_rows as materialized (
        select * from partner_rows where true ${searchFilter} ${riskFilter}
      ), stats as (
        select count(*)::int as total_partners_count,
               (select count(*)::int from filtered_rows) as filtered_partners_count,
               count(*) filter (where risk_weight > 0)::int as overdue_partners_count,
               coalesce(sum(total_balance), 0) as total_balance,
               coalesce(sum(current_amount), 0) as total_current,
               coalesce(sum(days_1_to_30), 0) as total_1_to_30,
               coalesce(sum(days_31_to_60), 0) as total_31_to_60,
               coalesce(sum(days_61_to_90), 0) as total_61_to_90,
               coalesce(sum(days_91_plus), 0) as total_91_plus
        from partner_rows
      ), page_rows as (
        select * from filtered_rows order by ${order} limit ${pageSize} offset ${offset}
      )
      select stats.*,
             coalesce((select jsonb_agg(to_jsonb(page_rows) order by ${order}) from page_rows), '[]'::jsonb) as partners
      from stats
    `.execute(this.db);
    const row = result.rows[0];
    const partners: AgedPartnerRow[] = (row?.partners || []).map((p) => {
      const days1To30 = this.money(p.days_1_to_30);
      const days31To60 = this.money(p.days_31_to_60);
      const days61To90 = this.money(p.days_61_to_90);
      const days91Plus = this.money(p.days_91_plus);
      const balance = this.money(p.total_balance);
      const riskLevel: AgedPartnerRow['riskLevel'] = p.risk_weight === 4 ? 'critical'
        : p.risk_weight === 3 ? 'high' : p.risk_weight === 2 ? 'medium'
          : p.risk_weight === 1 ? 'low' : 'current';
      const cleanPhone = String(p.phone || '').replace(/[^\d+]/g, '');
      const overdue = this.money(days1To30 + days31To60 + days61To90 + days91Plus);
      const message = encodeURIComponent(`مرحباً ${p.partner_name}، نود تذكيركم بوجود رصيد مستحق بقيمة ${balance.toLocaleString('ar-EG')} ج.م (منها ${overdue.toLocaleString('ar-EG')} ج.م متأخرة). يرجى التكرم بالسداد في أقرب وقت. شاكرين حسن تعاونكم.`);
      return {
        partnerId: Number(p.partner_id), partnerName: p.partner_name,
        phone: p.phone || undefined,
        creditLimit: p.credit_limit == null ? undefined : this.money(p.credit_limit),
        totalBalance: balance, currentAmount: this.money(p.current_amount),
        days1To30, days31To60, days61To90, days91Plus,
        oldestInvoiceDate: p.oldest_invoice_date ? new Date(p.oldest_invoice_date).toISOString().slice(0, 10) : undefined,
        oldestInvoiceDays: Number(p.oldest_invoice_days || 0),
        riskLevel,
        whatsAppUrl: kind === 'receivables' && cleanPhone.length >= 8
          ? `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}?text=${message}` : undefined,
      };
    });
    return {
      asOfDate: asOfDate.toISOString().slice(0, 10), page, pageSize,
      totalPartnersCount: Number(row?.total_partners_count || 0),
      filteredPartnersCount: Number(row?.filtered_partners_count || 0),
      overduePartnersCount: Number(row?.overdue_partners_count || 0),
      totalBalance: this.money(row?.total_balance), totalCurrent: this.money(row?.total_current),
      total1To30: this.money(row?.total_1_to_30), total31To60: this.money(row?.total_31_to_60),
      total61To90: this.money(row?.total_61_to_90), total91Plus: this.money(row?.total_91_plus),
      partners,
    };
  }
}
