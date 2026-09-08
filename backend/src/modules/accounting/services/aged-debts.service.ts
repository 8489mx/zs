import { Inject, Injectable } from '@nestjs/common';
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
  currentAmount: number;     // Not due / 0 days
  days1To30: number;         // 1 - 30 days
  days31To60: number;        // 31 - 60 days
  days61To90: number;        // 61 - 90 days
  days91Plus: number;        // +91 days
  oldestInvoiceDate?: string;
  oldestInvoiceDays?: number;
  riskLevel: 'current' | 'low' | 'medium' | 'high' | 'critical';
  whatsAppUrl?: string;
}

export interface AgedDebtsSummary {
  asOfDate: string;
  totalPartnersCount: number;
  overduePartnersCount: number;
  totalBalance: number;
  totalCurrent: number;
  total1To30: number;
  total31To60: number;
  total61To90: number;
  total91Plus: number;
  partners: AgedPartnerRow[];
}

@Injectable()
export class AgedDebtsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private toMoney(value: unknown): number {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
  }

  /**
   * Aged Receivables (أعمار ديون العملاء)
   */
  async getAgedReceivables(
    auth: AuthContext,
    params: { asOfDate?: string; branchId?: number },
  ): Promise<AgedDebtsSummary> {
    const tenantId = auth.tenantId;
    const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    // 1. Fetch active customers with positive balance
    const customers = await (this.db as any)
      .selectFrom('customers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();

    // 2. Fetch unpaid credit sales up to asOfDate
    let salesQuery = (this.db as any)
      .selectFrom('sales')
      .select([
        'id',
        'customer_id',
        'created_at',
        'total',
        'paid_amount',
        'due_date',
        'status',
      ])
      .where('tenant_id', '=', tenantId)
      .where('customer_id', 'is not', null)
      .where('status', '!=', 'cancelled')
      .where('created_at', '<=', asOfDate);

    if (params.branchId) {
      salesQuery = salesQuery.where('branch_id', '=', params.branchId);
    }

    const sales = await salesQuery.execute();

    // Group sales by customer
    const salesByCustomer = new Map<number, any[]>();
    for (const s of sales) {
      const cId = Number(s.customer_id);
      if (!salesByCustomer.has(cId)) salesByCustomer.set(cId, []);
      salesByCustomer.get(cId)!.push(s);
    }

    const rows: AgedPartnerRow[] = [];
    let totalCurrent = 0;
    let total1To30 = 0;
    let total31To60 = 0;
    let total61To90 = 0;
    let total91Plus = 0;

    for (const c of customers) {
      const cId = Number(c.id);
      const balance = this.toMoney(c.balance);
      if (balance <= 0.01) continue; // Only process customers with outstanding balances

      const cSales = (salesByCustomer.get(cId) || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      let currentAmount = 0;
      let days1To30 = 0;
      let days31To60 = 0;
      let days61To90 = 0;
      let days91Plus = 0;
      let oldestDate: Date | null = null;
      let oldestDays = 0;

      // Distribute balance across invoices starting from newest to oldest, or apply FIFO
      let remainingToAllocate = balance;

      for (const s of cSales) {
        if (remainingToAllocate <= 0) break;

        const unpaidOnSale = Math.max(0, Number(s.total || 0) - Number(s.paid_amount || 0));
        const allocated = Math.min(remainingToAllocate, unpaidOnSale > 0 ? unpaidOnSale : remainingToAllocate);
        if (allocated <= 0) continue;

        const invoiceDate = new Date(s.created_at);
        const daysOld = Math.floor((asOfDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

        if (!oldestDate || invoiceDate < oldestDate) {
          oldestDate = invoiceDate;
          oldestDays = daysOld;
        }

        if (daysOld <= 0) {
          currentAmount += allocated;
        } else if (daysOld <= 30) {
          days1To30 += allocated;
        } else if (daysOld <= 60) {
          days31To60 += allocated;
        } else if (daysOld <= 90) {
          days61To90 += allocated;
        } else {
          days91Plus += allocated;
        }

        remainingToAllocate -= allocated;
      }

      // If there's still unallocated balance (e.g. from opening balance), put in oldest bucket
      if (remainingToAllocate > 0) {
        days91Plus += remainingToAllocate;
      }

      currentAmount = this.toMoney(currentAmount);
      days1To30 = this.toMoney(days1To30);
      days31To60 = this.toMoney(days31To60);
      days61To90 = this.toMoney(days61To90);
      days91Plus = this.toMoney(days91Plus);

      let riskLevel: AgedPartnerRow['riskLevel'] = 'current';
      if (days91Plus > 0) riskLevel = 'critical';
      else if (days61To90 > 0) riskLevel = 'high';
      else if (days31To60 > 0) riskLevel = 'medium';
      else if (days1To30 > 0) riskLevel = 'low';

      // WhatsApp URL for quick collection reminder
      let whatsAppUrl: string | undefined;
      const cleanPhone = String(c.phone || '').replace(/[^\d+]/g, '');
      if (cleanPhone.length >= 8) {
        const overdueTotal = this.toMoney(days1To30 + days31To60 + days61To90 + days91Plus);
        const msg = encodeURIComponent(
          `مرحباً ${c.name}، نود تذكيركم بوجود رصيد مستحق بقيمة ${balance.toLocaleString('ar-EG')} ج.م (منها ${overdueTotal.toLocaleString('ar-EG')} ج.م متأخرة). يرجى التكرم بالسداد في أقرب وقت. شاكرين حسن تعاونكم.`,
        );
        whatsAppUrl = `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone}?text=${msg}`;
      }

      rows.push({
        partnerId: cId,
        partnerName: c.name,
        phone: c.phone || undefined,
        creditLimit: c.credit_limit ? this.toMoney(c.credit_limit) : undefined,
        totalBalance: balance,
        currentAmount,
        days1To30,
        days31To60,
        days61To90,
        days91Plus,
        oldestInvoiceDate: oldestDate ? oldestDate.toISOString().slice(0, 10) : undefined,
        oldestInvoiceDays: oldestDays,
        riskLevel,
        whatsAppUrl,
      });

      totalCurrent += currentAmount;
      total1To30 += days1To30;
      total31To60 += days31To60;
      total61To90 += days61To90;
      total91Plus += days91Plus;
    }

    // Sort by risk (critical first) then highest balance
    rows.sort((a, b) => {
      const riskWeight = { critical: 4, high: 3, medium: 2, low: 1, current: 0 };
      if (riskWeight[b.riskLevel] !== riskWeight[a.riskLevel]) {
        return riskWeight[b.riskLevel] - riskWeight[a.riskLevel];
      }
      return b.totalBalance - a.totalBalance;
    });

    const totalBalance = this.toMoney(rows.reduce((s, r) => s + r.totalBalance, 0));

    return {
      asOfDate: asOfDate.toISOString().slice(0, 10),
      totalPartnersCount: rows.length,
      overduePartnersCount: rows.filter((r) => r.riskLevel !== 'current').length,
      totalBalance,
      totalCurrent: this.toMoney(totalCurrent),
      total1To30: this.toMoney(total1To30),
      total31To60: this.toMoney(total31To60),
      total61To90: this.toMoney(total61To90),
      total91Plus: this.toMoney(total91Plus),
      partners: rows,
    };
  }

  /**
   * Aged Payables (أعمار ديون الموردين)
   */
  async getAgedPayables(
    auth: AuthContext,
    params: { asOfDate?: string; branchId?: number },
  ): Promise<AgedDebtsSummary> {
    const tenantId = auth.tenantId;
    const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
    asOfDate.setHours(23, 59, 59, 999);

    // 1. Fetch active suppliers with positive balance
    const suppliers = await (this.db as any)
      .selectFrom('suppliers')
      .selectAll()
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .orderBy('name', 'asc')
      .execute();

    // 2. Fetch purchases up to asOfDate
    let purchasesQuery = (this.db as any)
      .selectFrom('purchases')
      .select([
        'id',
        'supplier_id',
        'created_at',
        'date',
        'total',
        'paid_amount',
        'status',
      ])
      .where('tenant_id', '=', tenantId)
      .where('supplier_id', 'is not', null)
      .where('status', '!=', 'cancelled')
      .where('created_at', '<=', asOfDate);

    if (params.branchId) {
      purchasesQuery = purchasesQuery.where('branch_id', '=', params.branchId);
    }

    const purchases = await purchasesQuery.execute();

    // Group purchases by supplier
    const purchasesBySupplier = new Map<number, any[]>();
    for (const p of purchases) {
      const sId = Number(p.supplier_id);
      if (!purchasesBySupplier.has(sId)) purchasesBySupplier.set(sId, []);
      purchasesBySupplier.get(sId)!.push(p);
    }

    const rows: AgedPartnerRow[] = [];
    let totalCurrent = 0;
    let total1To30 = 0;
    let total31To60 = 0;
    let total61To90 = 0;
    let total91Plus = 0;

    for (const s of suppliers) {
      const sId = Number(s.id);
      const balance = this.toMoney(s.balance);
      if (balance <= 0.01) continue;

      const sPurchases = (purchasesBySupplier.get(sId) || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      let currentAmount = 0;
      let days1To30 = 0;
      let days31To60 = 0;
      let days61To90 = 0;
      let days91Plus = 0;
      let oldestDate: Date | null = null;
      let oldestDays = 0;

      let remainingToAllocate = balance;

      for (const p of sPurchases) {
        if (remainingToAllocate <= 0) break;

        const unpaid = Math.max(0, Number(p.total || 0) - Number(p.paid_amount || 0));
        const allocated = Math.min(remainingToAllocate, unpaid > 0 ? unpaid : remainingToAllocate);
        if (allocated <= 0) continue;

        const billDate = new Date(p.date || p.created_at);
        const daysOld = Math.floor((asOfDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));

        if (!oldestDate || billDate < oldestDate) {
          oldestDate = billDate;
          oldestDays = daysOld;
        }

        if (daysOld <= 0) {
          currentAmount += allocated;
        } else if (daysOld <= 30) {
          days1To30 += allocated;
        } else if (daysOld <= 60) {
          days31To60 += allocated;
        } else if (daysOld <= 90) {
          days61To90 += allocated;
        } else {
          days91Plus += allocated;
        }

        remainingToAllocate -= allocated;
      }

      if (remainingToAllocate > 0) {
        days91Plus += remainingToAllocate;
      }

      currentAmount = this.toMoney(currentAmount);
      days1To30 = this.toMoney(days1To30);
      days31To60 = this.toMoney(days31To60);
      days61To90 = this.toMoney(days61To90);
      days91Plus = this.toMoney(days91Plus);

      let riskLevel: AgedPartnerRow['riskLevel'] = 'current';
      if (days91Plus > 0) riskLevel = 'critical';
      else if (days61To90 > 0) riskLevel = 'high';
      else if (days31To60 > 0) riskLevel = 'medium';
      else if (days1To30 > 0) riskLevel = 'low';

      rows.push({
        partnerId: sId,
        partnerName: s.name,
        phone: s.phone || undefined,
        totalBalance: balance,
        currentAmount,
        days1To30,
        days31To60,
        days61To90,
        days91Plus,
        oldestInvoiceDate: oldestDate ? oldestDate.toISOString().slice(0, 10) : undefined,
        oldestInvoiceDays: oldestDays,
        riskLevel,
      });

      totalCurrent += currentAmount;
      total1To30 += days1To30;
      total31To60 += days31To60;
      total61To90 += days61To90;
      total91Plus += days91Plus;
    }

    rows.sort((a, b) => b.totalBalance - a.totalBalance);
    const totalBalance = this.toMoney(rows.reduce((s, r) => s + r.totalBalance, 0));

    return {
      asOfDate: asOfDate.toISOString().slice(0, 10),
      totalPartnersCount: rows.length,
      overduePartnersCount: rows.filter((r) => r.riskLevel !== 'current').length,
      totalBalance,
      totalCurrent: this.toMoney(totalCurrent),
      total1To30: this.toMoney(total1To30),
      total31To60: this.toMoney(total31To60),
      total61To90: this.toMoney(total61To90),
      total91Plus: this.toMoney(total91Plus),
      partners: rows,
    };
  }
}
