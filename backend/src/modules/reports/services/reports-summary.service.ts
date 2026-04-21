import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { filterScope, parseRange, normalizeProduct, dateKey, buildLastNDays, TrendPoint } from '../helpers/reports-range.helper';
import { sumMoney, toMoney, buildTrendMap, buildAggregatedBalances } from '../helpers/reports-math.helper';
import { sql } from '../../../database/kysely';

@Injectable()
export class ReportsSummaryService {
  private readonly logger = new Logger(ReportsSummaryService.name);

  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async reportSummary(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);

    let salesAggQuery = this.db
      .selectFrom('sales as s')
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`coalesce(sum(s.total), 0)`.as('total'),
      ])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', fromDate)
      .where('s.created_at', '<=', toDate);
    let purchasesAggQuery = this.db
      .selectFrom('purchases as p')
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`coalesce(sum(p.total), 0)`.as('total'),
      ])
      .where('p.status', '=', 'posted')
      .where('p.created_at', '>=', fromDate)
      .where('p.created_at', '<=', toDate);
    let expensesAggQuery = this.db
      .selectFrom('expenses as e')
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`coalesce(sum(e.amount), 0)`.as('total'),
      ])
      .where('e.expense_date', '>=', fromDate)
      .where('e.expense_date', '<=', toDate);
    let returnsAggQuery = this.db
      .selectFrom('return_documents as r')
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`coalesce(sum(case when r.return_type = 'sale' then r.total else 0 end), 0)`.as('sales_total'),
        sql<number>`coalesce(sum(case when r.return_type = 'purchase' then r.total else 0 end), 0)`.as('purchase_total'),
        sql<number>`coalesce(sum(case when r.return_type = 'sale' then 1 else 0 end), 0)`.as('sales_count'),
        sql<number>`coalesce(sum(case when r.return_type = 'purchase' then 1 else 0 end), 0)`.as('purchase_count'),
      ])
      .where('r.created_at', '>=', fromDate)
      .where('r.created_at', '<=', toDate);
    let treasuryAggQuery = this.db
      .selectFrom('treasury_transactions as t')
      .select([
        sql<number>`coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0)`.as('cash_in'),
        sql<number>`abs(coalesce(sum(case when t.amount < 0 then t.amount else 0 end), 0))`.as('cash_out'),
      ])
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);
    let filteredPostedSalesIdsQuery = this.db
      .selectFrom('sales as s')
      .select(['s.id'])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', fromDate)
      .where('s.created_at', '<=', toDate);
    let cogsAggQuery = this.db
      .selectFrom('sale_items as si')
      .innerJoin(filteredPostedSalesIdsQuery.as('fs'), 'fs.id', 'si.sale_id')
      .select(sql<number>`coalesce(sum(si.qty * si.cost_price), 0)`.as('cogs'))
      .$castTo<{ cogs: number }>();
    let topProductsQuery = this.db
      .selectFrom('sale_items as si')
      .innerJoin(filteredPostedSalesIdsQuery.as('fs'), 'fs.id', 'si.sale_id')
      .select([
        sql<string>`max(si.product_name)`.as('product_name'),
        sql<number>`coalesce(sum(si.qty), 0)`.as('qty_total'),
        sql<number>`coalesce(sum(si.line_total), 0)`.as('revenue_total'),
      ])
      .groupBy('si.product_id')
      .orderBy('revenue_total', 'desc')
      .limit(10);

    if (query.branchId) {
      const branchId = Number(query.branchId);
      salesAggQuery = salesAggQuery.where('s.branch_id', '=', branchId);
      purchasesAggQuery = purchasesAggQuery.where('p.branch_id', '=', branchId);
      expensesAggQuery = expensesAggQuery.where('e.branch_id', '=', branchId);
      returnsAggQuery = returnsAggQuery.where('r.branch_id', '=', branchId);
      treasuryAggQuery = treasuryAggQuery.where('t.branch_id', '=', branchId);
      filteredPostedSalesIdsQuery = filteredPostedSalesIdsQuery.where('s.branch_id', '=', branchId);
    }

    if (query.locationId) {
      const locationId = Number(query.locationId);
      salesAggQuery = salesAggQuery.where('s.location_id', '=', locationId);
      purchasesAggQuery = purchasesAggQuery.where('p.location_id', '=', locationId);
      expensesAggQuery = expensesAggQuery.where('e.location_id', '=', locationId);
      returnsAggQuery = returnsAggQuery.where('r.location_id', '=', locationId);
      treasuryAggQuery = treasuryAggQuery.where('t.location_id', '=', locationId);
      filteredPostedSalesIdsQuery = filteredPostedSalesIdsQuery.where('s.location_id', '=', locationId);
    }
    cogsAggQuery = this.db
      .selectFrom('sale_items as si')
      .innerJoin(filteredPostedSalesIdsQuery.as('fs'), 'fs.id', 'si.sale_id')
      .select(sql<number>`coalesce(sum(si.qty * si.cost_price), 0)`.as('cogs'))
      .$castTo<{ cogs: number }>();
    topProductsQuery = this.db
      .selectFrom('sale_items as si')
      .innerJoin(filteredPostedSalesIdsQuery.as('fs'), 'fs.id', 'si.sale_id')
      .select([
        sql<string>`max(si.product_name)`.as('product_name'),
        sql<number>`coalesce(sum(si.qty), 0)`.as('qty_total'),
        sql<number>`coalesce(sum(si.line_total), 0)`.as('revenue_total'),
      ])
      .groupBy('si.product_id')
      .orderBy('revenue_total', 'desc')
      .limit(10);

    const timings: Array<{ name: string; durationMs: number }> = [];
    const timed = async <T>(name: string, action: () => Promise<T>): Promise<T> => {
      const startedAt = process.hrtime.bigint();
      const result = await action();
      timings.push({
        name,
        durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
      });
      return result;
    };

    const [salesAgg, purchasesAgg, expensesAgg, returnsAgg, treasuryAgg, cogsAgg, topProductsRows] = await Promise.all([
      timed('salesAgg', () => salesAggQuery.executeTakeFirst()),
      timed('purchasesAgg', () => purchasesAggQuery.executeTakeFirst()),
      timed('expensesAgg', () => expensesAggQuery.executeTakeFirst()),
      timed('returnsAgg', () => returnsAggQuery.executeTakeFirst()),
      timed('treasuryAgg', () => treasuryAggQuery.executeTakeFirst()),
      timed('cogsAgg', () => cogsAggQuery.executeTakeFirst()),
      timed('topProducts', () => topProductsQuery.execute()),
    ]);

    const slowest = timings.slice().sort((a, b) => b.durationMs - a.durationMs)[0];
    if (slowest && slowest.durationMs >= 5) {
      this.logger.debug(
        JSON.stringify({
          event: 'financial_summary_subquery_timing',
          slowestSubQuery: slowest.name,
          slowestDurationMs: slowest.durationMs,
          timings,
        }),
      );
    }

    const salesTotal = Number(salesAgg?.total || 0);
    const purchasesTotal = Number(purchasesAgg?.total || 0);
    const expensesTotal = Number(expensesAgg?.total || 0);
    const salesReturnsTotal = Number(returnsAgg?.sales_total || 0);
    const purchaseReturnsTotal = Number(returnsAgg?.purchase_total || 0);
    const returnsTotal = toMoney(salesReturnsTotal + purchaseReturnsTotal);
    const cogs = toMoney(Number(cogsAgg?.cogs || 0));
    const netSales = Math.max(0, toMoney(salesTotal - salesReturnsTotal));
    const netPurchases = Math.max(0, toMoney(purchasesTotal - purchaseReturnsTotal));
    const grossProfit = toMoney(netSales - cogs);
    const grossMarginPercent = netSales > 0 ? toMoney((grossProfit / netSales) * 100) : 0;
    const netOperatingProfit = toMoney(grossProfit - expensesTotal);

    const cashIn = Number(treasuryAgg?.cash_in || 0);
    const cashOut = Number(treasuryAgg?.cash_out || 0);

    return {
      range,
      sales: { count: Number(salesAgg?.count || 0), total: salesTotal, netSales },
      purchases: { count: Number(purchasesAgg?.count || 0), total: purchasesTotal, netPurchases },
      expenses: { count: Number(expensesAgg?.count || 0), total: expensesTotal },
      returns: {
        count: Number(returnsAgg?.count || 0),
        total: returnsTotal,
        salesCount: Number(returnsAgg?.sales_count || 0),
        purchasesCount: Number(returnsAgg?.purchase_count || 0),
        salesTotal: salesReturnsTotal,
        purchasesTotal: purchaseReturnsTotal,
      },
      treasury: { cashIn, cashOut, net: toMoney(cashIn - cashOut) },
      commercial: { cogs, grossProfit, grossMarginPercent, netOperatingProfit, informationalOnlyPurchasesInPeriod: netPurchases },
      topProducts: topProductsRows.map((row) => ({
        name: String(row.product_name || ''),
        qty: Number(row.qty_total || 0),
        revenue: Number(row.revenue_total || 0),
        total: Number(row.revenue_total || 0),
      })),
    };
  }

  async dashboardOverview(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const summary = await this.reportSummary(query);

    const productsRows = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'category_id', 'supplier_id', 'retail_price', 'stock_qty', 'min_stock_qty', 'cost_price'])
      .where('is_active', '=', true)
      .execute();

    const customersRows = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .execute();

    const suppliersRows = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name', 'balance'])
      .where('is_active', '=', true)
      .execute();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 6);

    const recentSalesRows = filterScope(await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', trendStart)
      .where('created_at', '<=', todayEnd)
      .execute(), query);

    const recentPurchasesRows = filterScope(await this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', trendStart)
      .where('created_at', '<=', todayEnd)
      .execute(), query);

    const todaySalesRows = recentSalesRows.filter((row) => dateKey(row.created_at) === dateKey(todayStart));
    const todayPurchasesRows = recentPurchasesRows.filter((row) => dateKey(row.created_at) === dateKey(todayStart));

    const todaySaleItemsRows = filterScope(await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        'si.product_name',
        'si.qty',
        'si.line_total',
        's.branch_id',
        's.location_id',
        's.created_at',
      ])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', todayStart)
      .where('s.created_at', '<=', todayEnd)
      .execute(), query);

    const lowStock = productsRows
      .filter((row) => Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0))
      .slice(0, 8)
      .map((row) => normalizeProduct(row));

    const customerLedgerRows = await this.db
      .selectFrom('customer_ledger')
      .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('customer_id')
      .execute();

    const supplierLedgerRows = await this.db
      .selectFrom('supplier_ledger')
      .select(['supplier_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('supplier_id')
      .execute();

    const customerLedgerTotals = new Map<string, number>();
    for (const row of customerLedgerRows) {
      customerLedgerTotals.set(String(row.customer_id || ''), toMoney((row as { balance_total?: number | string | null }).balance_total ?? 0));
    }

    const supplierLedgerTotals = new Map<string, number>();
    for (const row of supplierLedgerRows) {
      supplierLedgerTotals.set(String(row.supplier_id || ''), toMoney((row as { balance_total?: number | string | null }).balance_total ?? 0));
    }

    const customerBalances = buildAggregatedBalances(customersRows, customerLedgerTotals);
    const supplierBalances = buildAggregatedBalances(suppliersRows, supplierLedgerTotals);
    const lowStockCount = productsRows.filter((row) => Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0)).length;
    const outOfStockCount = productsRows.filter((row) => Number(row.stock_qty || 0) <= 0).length;

    const inventoryCost = toMoney(productsRows.reduce((sum, row) => sum + (Number(row.stock_qty || 0) * Number(row.cost_price || 0)), 0));
    const inventorySaleValue = toMoney(productsRows.reduce((sum, row) => sum + (Number(row.stock_qty || 0) * Number(row.retail_price || 0)), 0));
    const customerDebt = toMoney([...customerBalances.values()].reduce((sum, value) => sum + Number(value || 0), 0));
    const supplierDebt = toMoney([...supplierBalances.values()].reduce((sum, value) => sum + Number(value || 0), 0));
    const nearCreditLimit = customersRows.filter((row) => {
      const balance = Number(customerBalances.get(String(row.id)) || 0);
      return Number(row.credit_limit || 0) > 0 && balance >= Number(row.credit_limit || 0) * 0.8 && balance <= Number(row.credit_limit || 0);
    }).length;
    const aboveCreditLimit = customersRows.filter((row) => {
      const balance = Number(customerBalances.get(String(row.id)) || 0);
      return Number(row.credit_limit || 0) > 0 && balance > Number(row.credit_limit || 0);
    }).length;
    const highSupplierBalances = suppliersRows.filter((row) => Number(supplierBalances.get(String(row.id)) || 0) >= 1000).length;

    const todayIso = todayStart.toISOString().slice(0, 10);
    const activeOffersRows = await this.db
      .selectFrom('product_offers')
      .select(['id'])
      .where('is_active', '=', true)
      .where(sql<boolean>`(start_date is null or start_date <= ${todayIso}) and (end_date is null or end_date >= ${todayIso})`)
      .execute();
    const activeOffers = activeOffersRows.length;

    const topTodayRows = filterScope(await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        'si.product_name',
        's.branch_id',
        's.location_id',
        sql<number>`coalesce(sum(si.qty), 0)`.as('qty_total'),
        sql<number>`coalesce(sum(si.line_total), 0)`.as('sales_total'),
      ])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', todayStart)
      .where('s.created_at', '<=', todayEnd)
      .groupBy(['si.product_id', 'si.product_name', 's.branch_id', 's.location_id'])
      .orderBy('sales_total', 'desc')
      .limit(5)
      .execute(), query);

    const topCustomers = customersRows
      .map((row) => {
        const balance = Number(customerBalances.get(String(row.id)) || 0);
        return {
          key: String(row.id),
          name: row.name || '',
          total: balance,
          count: balance > 0 ? 1 : 0,
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topSuppliers = suppliersRows
      .map((row) => {
        const balance = Number(supplierBalances.get(String(row.id)) || 0);
        return {
          key: String(row.id),
          name: row.name || '',
          total: balance,
          count: balance > 0 ? 1 : 0,
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const dayKeys = buildLastNDays(7);
    const salesTrend: TrendPoint[] = buildTrendMap(recentSalesRows, dayKeys, (row) => dateKey(row.created_at), (row) => row.total);
    const purchasesTrend: TrendPoint[] = buildTrendMap(recentPurchasesRows, dayKeys, (row) => dateKey(row.created_at), (row) => row.total);

    return {
      range,
      summary: {
        ...(summary as Record<string, unknown>),
        totalProducts: productsRows.length,
        totalCustomers: customersRows.length,
        totalSuppliers: suppliersRows.length,
        lowStockCount,
        outOfStockCount,
        activeOffers,
      },
      stats: {
        productsCount: productsRows.length,
        customersCount: customersRows.length,
        suppliersCount: suppliersRows.length,
        todaySalesCount: todaySalesRows.length,
        todaySalesAmount: sumMoney(todaySalesRows, (row) => row.total),
        todayPurchasesCount: todayPurchasesRows.length,
        todayPurchasesAmount: sumMoney(todayPurchasesRows, (row) => row.total),
        inventoryCost,
        inventorySaleValue,
        customerDebt,
        supplierDebt,
        nearCreditLimit,
        aboveCreditLimit,
        highSupplierBalances,
        activeOffers,
      },
      lowStock,
      topToday: topTodayRows
        .map((row) => ({
          productId: String(row.product_id || ''),
          name: String(row.product_name || ''),
          qty: Number((row as { qty_total?: number | string | null }).qty_total || 0),
          total: Number((row as { sales_total?: number | string | null }).sales_total || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5),
      topCustomers,
      topSuppliers,
      trends: {
        sales: salesTrend,
        purchases: purchasesTrend,
      },
    };
  }

}
