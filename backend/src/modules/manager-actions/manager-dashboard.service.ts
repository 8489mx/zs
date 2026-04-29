import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { Kysely, sql } from '../../database/kysely';

type MoneyRow = {
  total?: number | string | null;
  discount?: number | string | null;
};

type CountMoneyRow = {
  count?: number | string | null;
  total?: number | string | null;
};

type ProfitRow = {
  product_id?: number | string | null;
  product_name?: string | null;
  category_id?: number | string | null;
  category_name?: string | null;
  qty?: number | string | null;
  revenue?: number | string | null;
  cost?: number | string | null;
};

type ProductStockRow = {
  id: number | string;
  name?: string | null;
  category_name?: string | null;
  stock_qty?: number | string | null;
  min_stock_qty?: number | string | null;
  cost_price?: number | string | null;
  retail_price?: number | string | null;
  last_sold_at?: Date | string | null;
  sold_qty_30?: number | string | null;
};

type CustomerDebtRow = {
  id: number | string;
  name?: string | null;
  balance?: number | string | null;
  credit_limit?: number | string | null;
};

function toNumber(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentageChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return toMoney(((current - previous) / previous) * 100);
}

function daysSince(value: unknown, now: Date): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

@Injectable()
export class ManagerDashboardService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async overview() {
    const now = new Date();
    const last30Start = new Date(now);
    last30Start.setUTCDate(last30Start.getUTCDate() - 30);
    const previous30Start = new Date(now);
    previous30Start.setUTCDate(previous30Start.getUTCDate() - 60);

    const [
      salesLast30,
      salesPrevious30,
      returnsLast30,
      expensesLast30,
      profitRows,
      products,
      customers,
    ] = await Promise.all([
      this.safeFirst(() => this.salesTotals(last30Start, now)),
      this.safeFirst(() => this.salesTotals(previous30Start, last30Start)),
      this.safeRows(() => this.returnRows(last30Start, now)),
      this.safeFirst(() => this.expenseTotals(last30Start, now)),
      this.safeRows(() => this.profitRows(last30Start, now)),
      this.safeRows(() => this.productStockRows(last30Start)),
      this.safeRows(() => this.customerDebtRows()),
    ]);

    const salesTotal = toMoney(toNumber(salesLast30?.total));
    const salesCount = toNumber(salesLast30?.count);
    const previousTotal = toMoney(toNumber(salesPrevious30?.total));
    const salesReturnsTotal = toMoney(returnsLast30.filter((row) => row.return_type === 'sale').reduce((sum, row) => sum + toNumber(row.total), 0));
    const netSales = Math.max(0, toMoney(salesTotal - salesReturnsTotal));
    const cogs = toMoney(profitRows.reduce((sum, row) => sum + toNumber(row.cost), 0));
    const grossProfit = toMoney(netSales - cogs);
    const expenses = toMoney(toNumber(expensesLast30?.total));
    const netProfit = toMoney(grossProfit - expenses);
    const productProfit = this.buildProductProfit(profitRows);
    const categoryProfit = this.buildCategoryProfit(profitRows);

    return {
      salesLast30: {
        total: salesTotal,
        count: salesCount,
        averageInvoice: salesCount > 0 ? toMoney(salesTotal / salesCount) : 0,
        previousTotal,
        comparisonPercent: percentageChange(salesTotal, previousTotal),
      },
      profitSummary: {
        netSales,
        cogs,
        grossProfit,
        expenses,
        netProfit,
      },
      profitSources: {
        topProducts: productProfit.filter((row) => row.grossProfit > 0).slice(0, 6),
        topCategories: categoryProfit.filter((row) => row.grossProfit > 0).slice(0, 6),
        weakMarginHighSales: productProfit
          .filter((row) => row.revenue > 0 && row.marginPercent < 15)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
      },
      stagnant: this.buildStagnant(products, now),
      buying: this.buildBuying(products, productProfit),
      collection: this.buildCollection(customers),
    };
  }

  private async safeRows<T>(loader: () => Promise<T[]>): Promise<T[]> {
    try {
      return await loader();
    } catch {
      return [];
    }
  }

  private async safeFirst<T>(loader: () => Promise<T | undefined>): Promise<T | undefined> {
    try {
      return await loader();
    } catch {
      return undefined;
    }
  }

  private salesTotals(from: Date, to: Date): Promise<CountMoneyRow | undefined> {
    return this.db
      .selectFrom('sales')
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`coalesce(sum(total), 0)`.as('total'),
      ])
      .where('status', '=', 'posted')
      .where('created_at', '>=', from)
      .where('created_at', '<', to)
      .executeTakeFirst();
  }

  private returnRows(from: Date, to: Date): Promise<Array<{ return_type?: string | null; total?: number | string | null }>> {
    return this.db
      .selectFrom('return_documents')
      .select(['return_type', 'total'])
      .where('created_at', '>=', from)
      .where('created_at', '<', to)
      .execute();
  }

  private expenseTotals(from: Date, to: Date): Promise<MoneyRow | undefined> {
    return this.db
      .selectFrom('expenses')
      .select(sql<number>`coalesce(sum(amount), 0)`.as('total'))
      .where('expense_date', '>=', from)
      .where('expense_date', '<', to)
      .executeTakeFirst();
  }

  private profitRows(from: Date, to: Date): Promise<ProfitRow[]> {
    return this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .leftJoin('products as p', 'p.id', 'si.product_id')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .select([
        'si.product_id',
        'si.product_name',
        'p.category_id',
        'c.name as category_name',
        sql<number>`coalesce(sum(si.qty * si.unit_multiplier), 0)`.as('qty'),
        sql<number>`coalesce(sum(si.line_total), 0)`.as('revenue'),
        sql<number>`coalesce(sum(si.cost_price * si.qty * si.unit_multiplier), 0)`.as('cost'),
      ])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', from)
      .where('s.created_at', '<', to)
      .groupBy(['si.product_id', 'si.product_name', 'p.category_id', 'c.name'])
      .execute();
  }

  private productStockRows(last30Start: Date): Promise<ProductStockRow[]> {
    return this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin(
        (eb) => eb
          .selectFrom('sale_items as si')
          .innerJoin('sales as s', 's.id', 'si.sale_id')
          .select([
            'si.product_id',
            sql<Date>`max(s.created_at)`.as('last_sold_at'),
            sql<number>`coalesce(sum(case when s.created_at >= ${last30Start} then si.qty * si.unit_multiplier else 0 end), 0)`.as('sold_qty_30'),
          ])
          .where('s.status', '=', 'posted')
          .where('si.product_id', 'is not', null)
          .groupBy('si.product_id')
          .as('sales_activity'),
        (join) => join.onRef('sales_activity.product_id', '=', 'p.id'),
      )
      .select([
        'p.id',
        'p.name',
        'c.name as category_name',
        'p.stock_qty',
        'p.min_stock_qty',
        'p.cost_price',
        'p.retail_price',
        'sales_activity.last_sold_at',
        'sales_activity.sold_qty_30',
      ])
      .where('p.is_active', '=', true)
      .execute();
  }

  private customerDebtRows(): Promise<CustomerDebtRow[]> {
    return this.db
      .selectFrom('customers')
      .select(['id', 'name', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .execute();
  }

  private buildProductProfit(rows: ProfitRow[]) {
    return rows
      .map((row) => {
        const revenue = toMoney(toNumber(row.revenue));
        const cost = toMoney(toNumber(row.cost));
        const grossProfit = toMoney(revenue - cost);
        return {
          productId: String(row.product_id || ''),
          name: row.product_name || 'صنف غير محدد',
          categoryName: row.category_name || '',
          qty: toMoney(toNumber(row.qty)),
          revenue,
          cost,
          grossProfit,
          marginPercent: revenue > 0 ? toMoney((grossProfit / revenue) * 100) : 0,
        };
      })
      .sort((a, b) => b.grossProfit - a.grossProfit);
  }

  private buildCategoryProfit(rows: ProfitRow[]) {
    const categories = new Map<string, { categoryId: string; name: string; revenue: number; cost: number; grossProfit: number; marginPercent: number }>();
    for (const row of rows) {
      const key = String(row.category_id || 'uncategorized');
      const item = categories.get(key) || {
        categoryId: key,
        name: row.category_name || 'بدون قسم',
        revenue: 0,
        cost: 0,
        grossProfit: 0,
        marginPercent: 0,
      };
      item.revenue += toNumber(row.revenue);
      item.cost += toNumber(row.cost);
      categories.set(key, item);
    }

    return [...categories.values()]
      .map((row) => ({
        ...row,
        revenue: toMoney(row.revenue),
        cost: toMoney(row.cost),
        grossProfit: toMoney(row.revenue - row.cost),
        marginPercent: row.revenue > 0 ? toMoney(((row.revenue - row.cost) / row.revenue) * 100) : 0,
      }))
      .sort((a, b) => b.grossProfit - a.grossProfit);
  }

  private buildStagnant(products: ProductStockRow[], now: Date) {
    const items = products
      .map((product) => {
        const days = daysSince(product.last_sold_at, now);
        return {
          productId: String(product.id),
          name: product.name || '',
          categoryName: product.category_name || '',
          stockQty: toNumber(product.stock_qty),
          costPrice: toNumber(product.cost_price),
          inventoryValue: toMoney(toNumber(product.stock_qty) * toNumber(product.cost_price)),
          daysWithoutSales: days,
        };
      })
      .filter((product) => product.stockQty > 0 && product.daysWithoutSales != null && product.daysWithoutSales >= 30)
      .sort((a, b) => (b.daysWithoutSales || 0) - (a.daysWithoutSales || 0));

    return {
      days30: items.filter((item) => Number(item.daysWithoutSales) >= 30).length,
      days60: items.filter((item) => Number(item.daysWithoutSales) >= 60).length,
      days90: items.filter((item) => Number(item.daysWithoutSales) >= 90).length,
      inventoryValue: toMoney(items.reduce((sum, item) => sum + item.inventoryValue, 0)),
      items: items.slice(0, 6),
    };
  }

  private buildBuying(products: ProductStockRow[], productProfit: ReturnType<ManagerDashboardService['buildProductProfit']>) {
    const profitByProductId = new Map(productProfit.map((row) => [row.productId, row]));
    const rows = products.map((product) => {
      const productId = String(product.id);
      const soldQty30 = toNumber(product.sold_qty_30);
      const stockQty = toNumber(product.stock_qty);
      const minStockQty = toNumber(product.min_stock_qty);
      const dailyVelocity = soldQty30 / 30;
      const daysToRunOut = dailyVelocity > 0 ? toMoney(stockQty / dailyVelocity) : null;
      const profit = profitByProductId.get(productId);
      const priorityScore =
        (stockQty <= 0 ? 100 : 0)
        + (stockQty > 0 && minStockQty > 0 && stockQty <= minStockQty ? 45 : 0)
        + (daysToRunOut != null && daysToRunOut <= 14 ? 30 : 0)
        + Math.max(0, profit?.grossProfit || 0) / 100;

      return {
        productId,
        name: product.name || '',
        categoryName: product.category_name || '',
        stockQty,
        minStockQty,
        soldQty30,
        daysToRunOut,
        grossProfit: profit?.grossProfit || 0,
        marginPercent: profit?.marginPercent || 0,
        priorityScore,
      };
    });

    return {
      outOfStock: rows.filter((row) => row.stockQty <= 0).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6),
      lowStock: rows.filter((row) => row.stockQty > 0 && row.minStockQty > 0 && row.stockQty <= row.minStockQty).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6),
      priority: rows.filter((row) => row.priorityScore > 0).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6),
    };
  }

  private buildCollection(customers: CustomerDebtRow[]) {
    const rows = customers
      .map((customer) => {
        const balance = toMoney(toNumber(customer.balance));
        const creditLimit = toMoney(toNumber(customer.credit_limit));
        return {
          customerId: String(customer.id),
          name: customer.name || '',
          balance,
          creditLimit,
          creditUsagePercent: creditLimit > 0 ? toMoney((balance / creditLimit) * 100) : null,
        };
      })
      .filter((customer) => customer.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    return {
      topDebts: rows.slice(0, 6),
      aboveCreditLimit: rows.filter((row) => row.creditLimit > 0 && row.balance > row.creditLimit).slice(0, 6),
      nearCreditLimit: rows.filter((row) => row.creditLimit > 0 && row.balance >= row.creditLimit * 0.8 && row.balance <= row.creditLimit).slice(0, 6),
    };
  }
}
