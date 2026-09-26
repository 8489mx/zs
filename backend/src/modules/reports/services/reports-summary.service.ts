import { Inject, Injectable } from '@nestjs/common';
import { type Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { sql } from '../../../database/kysely';
import { toMoney } from '../helpers/reports-math.helper';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

@Injectable()
export class ReportsSummaryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private tenantId(auth: AuthContext): string {
    return requireTenantScope(auth).tenantId;
  }

  async debtAgingReport(auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const now = new Date();

    const customerRows = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'balance', 'credit_limit'])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .execute();

    const customerIds = customerRows.map((c) => Number(c.id));
    let customerSales: { customer_id: number; total: number; created_at: Date }[] = [];
    if (customerIds.length > 0) {
      customerSales = (await this.db
        .selectFrom('sales')
        .select(['customer_id', 'total', 'created_at'])
        .where('tenant_id', '=', tenantId)
        .where('customer_id', 'in', customerIds)
        .where('payment_type', '=', 'credit')
        .where('status', '=', 'posted')
        .orderBy('created_at', 'desc')
        .execute()) as any[];
    }

    const receivables = customerRows.map((cust) => {
      const balance = Number(cust.balance || 0);
      const sales = customerSales.filter((s) => Number(s.customer_id) === Number(cust.id));

      let current = 0;
      let days31To60 = 0;
      let days61To90 = 0;
      let over90 = 0;

      let remainingBalance = balance;
      for (const sale of sales) {
        if (remainingBalance <= 0) break;
        const saleTotal = Number(sale.total || 0);
        const allocated = Math.min(remainingBalance, saleTotal);
        const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24)));

        if (ageDays <= 30) current += allocated;
        else if (ageDays <= 60) days31To60 += allocated;
        else if (ageDays <= 90) days61To90 += allocated;
        else over90 += allocated;

        remainingBalance -= allocated;
      }

      if (remainingBalance > 0) {
        over90 += remainingBalance;
      }

      return {
        id: String(cust.id),
        name: cust.name || 'عميل',
        phone: cust.phone || '',
        totalBalance: toMoney(balance),
        current: toMoney(current),
        days31To60: toMoney(days31To60),
        days61To90: toMoney(days61To90),
        over90: toMoney(over90),
      };
    });

    const supplierRows = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name', 'phone', 'balance'])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .execute();

    const supplierIds = supplierRows.map((s) => Number(s.id));
    let supplierPurchases: { supplier_id: number; total: number; created_at: Date }[] = [];
    if (supplierIds.length > 0) {
      supplierPurchases = (await this.db
        .selectFrom('purchases')
        .select(['supplier_id', 'total', 'created_at'])
        .where('tenant_id', '=', tenantId)
        .where('supplier_id', 'in', supplierIds)
        .where('payment_type', '=', 'credit')
        .where('status', '=', 'posted')
        .orderBy('created_at', 'desc')
        .execute()) as any[];
    }

    const payables = supplierRows.map((sup) => {
      const balance = Number(sup.balance || 0);
      const purchases = supplierPurchases.filter((p) => Number(p.supplier_id) === Number(sup.id));

      let current = 0;
      let days31To60 = 0;
      let days61To90 = 0;
      let over90 = 0;

      let remainingBalance = balance;
      for (const pur of purchases) {
        if (remainingBalance <= 0) break;
        const purTotal = Number(pur.total || 0);
        const allocated = Math.min(remainingBalance, purTotal);
        const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(pur.created_at).getTime()) / (1000 * 60 * 60 * 24)));

        if (ageDays <= 30) current += allocated;
        else if (ageDays <= 60) days31To60 += allocated;
        else if (ageDays <= 90) days61To90 += allocated;
        else over90 += allocated;

        remainingBalance -= allocated;
      }

      if (remainingBalance > 0) {
        over90 += remainingBalance;
      }

      return {
        id: String(sup.id),
        name: sup.name || 'مورد',
        phone: sup.phone || '',
        totalBalance: toMoney(balance),
        current: toMoney(current),
        days31To60: toMoney(days31To60),
        days61To90: toMoney(days61To90),
        over90: toMoney(over90),
      };
    });

    const totalReceivables = toMoney(receivables.reduce((sum, r) => sum + r.totalBalance, 0));
    const totalPayables = toMoney(payables.reduce((sum, p) => sum + p.totalBalance, 0));

    const receivablesSummary = {
      total: totalReceivables,
      current: toMoney(receivables.reduce((sum, r) => sum + r.current, 0)),
      days31To60: toMoney(receivables.reduce((sum, r) => sum + r.days31To60, 0)),
      days61To90: toMoney(receivables.reduce((sum, r) => sum + r.days61To90, 0)),
      over90: toMoney(receivables.reduce((sum, r) => sum + r.over90, 0)),
    };

    const payablesSummary = {
      total: totalPayables,
      current: toMoney(payables.reduce((sum, p) => sum + p.current, 0)),
      days31To60: toMoney(payables.reduce((sum, p) => sum + p.days31To60, 0)),
      days61To90: toMoney(payables.reduce((sum, p) => sum + p.days61To90, 0)),
      over90: toMoney(payables.reduce((sum, p) => sum + p.over90, 0)),
    };

    return {
      receivablesSummary,
      payablesSummary,
      receivables,
      payables,
    };
  }

  async demandForecastingReport(auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const products = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'barcode', 'stock_qty', 'min_stock_qty', 'cost_price', 'retail_price'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .execute();

    const recentSales = await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        sql<number>`SUM(si.qty)`.as('qty_sold_30d'),
        sql<number>`COUNT(DISTINCT s.id)`.as('orders_count_30d'),
      ])
      .where('s.tenant_id', '=', tenantId)
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', thirtyDaysAgo)
      .groupBy('si.product_id')
      .execute();

    const salesMap = new Map<number, { qtySold: number; ordersCount: number }>();
    for (const s of recentSales) {
      salesMap.set(Number(s.product_id), {
        qtySold: Number(s.qty_sold_30d || 0),
        ordersCount: Number(s.orders_count_30d || 0),
      });
    }

    const items = products.map((p) => {
      const stock = Number(p.stock_qty || 0);
      const minStock = Number(p.min_stock_qty || 0);
      const saleInfo = salesMap.get(Number(p.id)) || { qtySold: 0, ordersCount: 0 };
      const dailyBurnRate = Number((saleInfo.qtySold / 30).toFixed(2));

      let runwayDays = 999;
      if (dailyBurnRate > 0) {
        runwayDays = Math.max(0, Math.round(stock / dailyBurnRate));
      } else if (stock <= 0) {
        runwayDays = 0;
      }

      let urgency: 'out_of_stock' | 'critical' | 'warning' | 'healthy' | 'overstocked' = 'healthy';
      if (stock <= 0) {
        urgency = 'out_of_stock';
      } else if (runwayDays <= 7 || stock <= minStock) {
        urgency = 'critical';
      } else if (runwayDays <= 15) {
        urgency = 'warning';
      } else if (runwayDays > 60 && stock > 50) {
        urgency = 'overstocked';
      }

      const targetBuffer = (dailyBurnRate * 30) + minStock;
      const suggestedReorderQty = Math.max(0, Math.ceil(targetBuffer - stock));

      return {
        productId: String(p.id),
        name: p.name || '',
        barcode: p.barcode || '',
        sku: '',
        stock,
        minStock,
        costPrice: Number(p.cost_price || 0),
        soldLast30Days: saleInfo.qtySold,
        dailyBurnRate,
        runwayDays: runwayDays > 365 ? 365 : runwayDays,
        urgency,
        suggestedReorderQty,
      };
    });

    items.sort((a, b) => {
      const order = { out_of_stock: 0, critical: 1, warning: 2, healthy: 3, overstocked: 4 };
      if (order[a.urgency] !== order[b.urgency]) {
        return order[a.urgency] - order[b.urgency];
      }
      return a.runwayDays - b.runwayDays;
    });

    const summary = {
      totalMonitoredProducts: items.length,
      outOfStockCount: items.filter((i) => i.urgency === 'out_of_stock').length,
      criticalCount: items.filter((i) => i.urgency === 'critical').length,
      warningCount: items.filter((i) => i.urgency === 'warning').length,
      healthyCount: items.filter((i) => i.urgency === 'healthy').length,
      overstockedCount: items.filter((i) => i.urgency === 'overstocked').length,
    };

    return {
      summary,
      items,
    };
  }
}
