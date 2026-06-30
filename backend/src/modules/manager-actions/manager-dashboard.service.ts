import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { Kysely, sql } from '../../database/kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';

type Row = Record<string, any>;
function n(value: unknown): number { const x = Number(value ?? 0); return Number.isFinite(x) ? x : 0; }
function m(value: number): number { return Math.round(value * 100) / 100; }
function pct(current: number, previous: number): number | null { return previous ? m(((current - previous) / previous) * 100) : null; }
function ageDays(value: unknown, now: Date): number | null { if (!value) return null; const d = value instanceof Date ? value : new Date(String(value)); return Number.isNaN(d.getTime()) ? null : Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000)); }

@Injectable()
export class ManagerDashboardService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async overview(auth?: AuthContext) {
    const scope = auth ? requireTenantScope(auth) : { tenantId: '', accountId: '' };
    const tenantId = scope.tenantId;
    const now = new Date();
    const last30Start = new Date(now); last30Start.setUTCDate(last30Start.getUTCDate() - 30);
    const previous30Start = new Date(now); previous30Start.setUTCDate(previous30Start.getUTCDate() - 60);
    const [salesLast30, salesPrevious30, returnsLast30, expensesLast30, profitRows, products, customers] = await Promise.all([
      this.safeFirst(() => this.salesTotals(last30Start, now, tenantId)),
      this.safeFirst(() => this.salesTotals(previous30Start, last30Start, tenantId)),
      this.safeRows(() => this.returnRows(last30Start, now, tenantId)),
      this.safeFirst(() => this.expenseTotals(last30Start, now, tenantId)),
      this.safeRows(() => this.profitRows(last30Start, now, tenantId)),
      this.safeRows(() => this.productStockRows(last30Start, tenantId)),
      this.safeRows(() => this.customerDebtRows(tenantId)),
    ]);
    const salesTotal = m(n(salesLast30?.total));
    const salesCount = n(salesLast30?.count);
    const previousTotal = m(n(salesPrevious30?.total));
    const salesReturnsTotal = m(returnsLast30.filter((r) => r.return_type === 'sale').reduce((s, r) => s + n(r.total), 0));
    const netSales = Math.max(0, m(salesTotal - salesReturnsTotal));
    const cogs = m(profitRows.reduce((s, r) => s + n(r.cost), 0));
    const grossProfit = m(netSales - cogs);
    const expenses = m(n(expensesLast30?.total));
    const productProfit = this.buildProductProfit(profitRows);
    const categoryProfit = this.buildCategoryProfit(profitRows);
    return { scope, salesLast30: { total: salesTotal, count: salesCount, averageInvoice: salesCount > 0 ? m(salesTotal / salesCount) : 0, previousTotal, comparisonPercent: pct(salesTotal, previousTotal) }, profitSummary: { netSales, cogs, grossProfit, expenses, netProfit: m(grossProfit - expenses) }, profitSources: { topProducts: productProfit.filter((r) => r.grossProfit > 0).slice(0, 6), topCategories: categoryProfit.filter((r) => r.grossProfit > 0).slice(0, 6), weakMarginHighSales: productProfit.filter((r) => r.revenue > 0 && r.marginPercent < 15).sort((a, b) => b.revenue - a.revenue).slice(0, 5) }, stagnant: this.buildStagnant(products, now), buying: this.buildBuying(products, productProfit), collection: this.buildCollection(customers) };
  }

  private async safeRows<T>(loader: () => Promise<T[]>): Promise<T[]> { try { return await loader(); } catch { return []; } }
  private async safeFirst<T>(loader: () => Promise<T | undefined>): Promise<T | undefined> { try { return await loader(); } catch { return undefined; } }
  private tenantClause(tenantId: string, alias = '') { return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}` : sql<boolean>`tenant_id = ${tenantId}`; }

  private salesTotals(from: Date, to: Date, tenantId: string): Promise<Row | undefined> { return this.db.selectFrom('sales').select([sql<number>`count(*)`.as('count'), sql<number>`coalesce(sum(total), 0)`.as('total')]).where('status', '=', 'posted').where('created_at', '>=', from).where('created_at', '<', to).where(this.tenantClause(tenantId)).executeTakeFirst(); }
  private returnRows(from: Date, to: Date, tenantId: string): Promise<Row[]> { return this.db.selectFrom('return_documents').select(['return_type', 'total']).where('created_at', '>=', from).where('created_at', '<', to).where(this.tenantClause(tenantId)).execute(); }
  private expenseTotals(from: Date, to: Date, tenantId: string): Promise<Row | undefined> { return this.db.selectFrom('expenses').select(sql<number>`coalesce(sum(amount), 0)`.as('total')).where('expense_date', '>=', from).where('expense_date', '<', to).where(this.tenantClause(tenantId)).executeTakeFirst(); }
  private profitRows(from: Date, to: Date, tenantId: string): Promise<Row[]> { return this.db.selectFrom('sale_items as si').innerJoin('sales as s', 's.id', 'si.sale_id').leftJoin('products as p', 'p.id', 'si.product_id').leftJoin('product_categories as c', 'c.id', 'p.category_id').select(['si.product_id', 'si.product_name', 'p.category_id', 'c.name as category_name', sql<number>`coalesce(sum(si.qty * si.unit_multiplier), 0)`.as('qty'), sql<number>`coalesce(sum(si.line_total), 0)`.as('revenue'), sql<number>`coalesce(sum(si.cost_price * si.qty * si.unit_multiplier), 0)`.as('cost')]).where('s.status', '=', 'posted').where('s.created_at', '>=', from).where('s.created_at', '<', to).where(this.tenantClause(tenantId, 's')).where(this.tenantClause(tenantId, 'si')).groupBy(['si.product_id', 'si.product_name', 'p.category_id', 'c.name']).execute(); }
  private productStockRows(last30Start: Date, tenantId: string): Promise<Row[]> { return this.db.selectFrom('products as p').leftJoin('product_categories as c', 'c.id', 'p.category_id').leftJoin((eb) => eb.selectFrom('sale_items as si').innerJoin('sales as s', 's.id', 'si.sale_id').select(['si.product_id', sql<Date>`max(s.created_at)`.as('last_sold_at'), sql<number>`coalesce(sum(case when s.created_at >= ${last30Start} then si.qty * si.unit_multiplier else 0 end), 0)`.as('sold_qty_30')]).where('s.status', '=', 'posted').where('si.product_id', 'is not', null).where(this.tenantClause(tenantId, 's')).where(this.tenantClause(tenantId, 'si')).groupBy('si.product_id').as('sales_activity'), (join) => join.onRef('sales_activity.product_id', '=', 'p.id')).select(['p.id', 'p.name', 'c.name as category_name', 'p.stock_qty', 'p.min_stock_qty', 'p.cost_price', 'p.retail_price', 'sales_activity.last_sold_at', 'sales_activity.sold_qty_30']).where('p.is_active', '=', true).where(this.tenantClause(tenantId, 'p')).execute(); }
  private customerDebtRows(tenantId: string): Promise<Row[]> { return this.db.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit']).where('is_active', '=', true).where(this.tenantClause(tenantId)).execute(); }

  private buildProductProfit(rows: Row[]) { return rows.map((r) => { const revenue = m(n(r.revenue)); const cost = m(n(r.cost)); const grossProfit = m(revenue - cost); return { productId: String(r.product_id || ''), name: r.product_name || 'صنف غير محدد', categoryName: r.category_name || '', qty: m(n(r.qty)), revenue, cost, grossProfit, marginPercent: revenue > 0 ? m((grossProfit / revenue) * 100) : 0 }; }).sort((a, b) => b.grossProfit - a.grossProfit); }
  private buildCategoryProfit(rows: Row[]) { const map = new Map<string, any>(); for (const r of rows) { const key = String(r.category_id || 'uncategorized'); const item = map.get(key) || { categoryId: key, name: r.category_name || 'بدون قسم', revenue: 0, cost: 0 }; item.revenue += n(r.revenue); item.cost += n(r.cost); map.set(key, item); } return [...map.values()].map((r) => ({ ...r, revenue: m(r.revenue), cost: m(r.cost), grossProfit: m(r.revenue - r.cost), marginPercent: r.revenue > 0 ? m(((r.revenue - r.cost) / r.revenue) * 100) : 0 })).sort((a, b) => b.grossProfit - a.grossProfit); }
  private buildStagnant(products: Row[], now: Date) { const items = products.map((p) => { const days = ageDays(p.last_sold_at, now); return { productId: String(p.id), name: p.name || '', categoryName: p.category_name || '', stockQty: n(p.stock_qty), costPrice: n(p.cost_price), inventoryValue: m(n(p.stock_qty) * n(p.cost_price)), daysWithoutSales: days }; }).filter((p) => p.stockQty > 0 && p.daysWithoutSales != null && p.daysWithoutSales >= 30).sort((a, b) => (b.daysWithoutSales || 0) - (a.daysWithoutSales || 0)); return { days30: items.filter((i) => Number(i.daysWithoutSales) >= 30).length, days60: items.filter((i) => Number(i.daysWithoutSales) >= 60).length, days90: items.filter((i) => Number(i.daysWithoutSales) >= 90).length, inventoryValue: m(items.reduce((s, i) => s + i.inventoryValue, 0)), items: items.slice(0, 6), itemsTotal: items.length }; }
  private buildBuying(products: Row[], productProfit: ReturnType<ManagerDashboardService['buildProductProfit']>) { const profits = new Map(productProfit.map((r) => [r.productId, r])); const rows = products.map((p) => { const productId = String(p.id); const soldQty30 = n(p.sold_qty_30); const stockQty = n(p.stock_qty); const minStockQty = n(p.min_stock_qty); const dailyVelocity = soldQty30 / 30; const daysToRunOut = dailyVelocity > 0 ? m(stockQty / dailyVelocity) : null; const profit = profits.get(productId); const priorityScore = (stockQty <= 0 ? 100 : 0) + (stockQty > 0 && minStockQty > 0 && stockQty <= minStockQty ? 45 : 0) + (daysToRunOut != null && daysToRunOut <= 14 ? 30 : 0) + Math.max(0, profit?.grossProfit || 0) / 100; return { productId, name: p.name || '', categoryName: p.category_name || '', stockQty, minStockQty, soldQty30, daysToRunOut, grossProfit: profit?.grossProfit || 0, marginPercent: profit?.marginPercent || 0, priorityScore }; }); const outOfStockAll = rows.filter((r) => r.stockQty <= 0); const lowStockAll = rows.filter((r) => r.stockQty > 0 && r.minStockQty > 0 && r.stockQty <= r.minStockQty); const priorityAll = rows.filter((r) => r.priorityScore > 0); return { outOfStock: outOfStockAll.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6), outOfStockTotal: outOfStockAll.length, lowStock: lowStockAll.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6), lowStockTotal: lowStockAll.length, priority: priorityAll.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 6), priorityTotal: priorityAll.length }; }
  private buildCollection(customers: Row[]) { const rows = customers.map((c) => { const balance = m(n(c.balance)); const creditLimit = m(n(c.credit_limit)); return { customerId: String(c.id), name: c.name || '', balance, creditLimit, creditUsagePercent: creditLimit > 0 ? m((balance / creditLimit) * 100) : null }; }).filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance); const aboveAll = rows.filter((r) => r.creditLimit > 0 && r.balance > r.creditLimit); const nearAll = rows.filter((r) => r.creditLimit > 0 && r.balance >= r.creditLimit * 0.8 && r.balance <= r.creditLimit); return { topDebts: rows.slice(0, 6), topDebtsTotal: rows.length, aboveCreditLimit: aboveAll.slice(0, 6), aboveCreditLimitTotal: aboveAll.length, nearCreditLimit: nearAll.slice(0, 6), nearCreditLimitTotal: nearAll.length }; }
}
