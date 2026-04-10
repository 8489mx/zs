import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { filterScope, parseRange, normalizeProduct, dateKey, buildLastNDays, TrendPoint } from '../helpers/reports-range.helper';
import { sumMoney, toMoney, buildTrendMap, buildAggregatedBalances } from '../helpers/reports-math.helper';
import { sql } from 'kysely';

@Injectable()
export class ReportsSummaryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async reportSummary(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);

    const salesRows = filterScope(await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'discount', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .execute(), query);

    const purchasesRows = filterScope(await this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .execute(), query);

    const expensesRows = filterScope(await this.db
      .selectFrom('expenses')
      .select(['id', 'amount', 'branch_id', 'location_id', 'expense_date'])
      .where('expense_date', '>=', fromDate)
      .where('expense_date', '<=', toDate)
      .execute(), query);

    const returnsRows = filterScope(await this.db
      .selectFrom('return_documents')
      .select(['id', 'return_type', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .execute(), query);

    const treasuryRows = filterScope(await this.db
      .selectFrom('treasury_transactions')
      .select(['amount', 'branch_id', 'location_id', 'created_at'])
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate)
      .execute(), query);

    const saleItemsRows = filterScope(await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        'si.product_name',
        'si.qty',
        'si.line_total',
        'si.cost_price',
        's.branch_id',
        's.location_id',
        's.created_at',
      ])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', fromDate)
      .where('s.created_at', '<=', toDate)
      .execute(), query);

    const salesTotal = sumMoney(salesRows, (row) => row.total);
    const purchasesTotal = sumMoney(purchasesRows, (row) => row.total);
    const expensesTotal = sumMoney(expensesRows, (row) => row.amount);
    const salesReturnRows = returnsRows.filter((row) => row.return_type === 'sale');
    const purchaseReturnRows = returnsRows.filter((row) => row.return_type === 'purchase');
    const salesReturnsTotal = sumMoney(salesReturnRows, (row) => row.total);
    const purchaseReturnsTotal = sumMoney(purchaseReturnRows, (row) => row.total);
    const returnsTotal = toMoney(salesReturnsTotal + purchaseReturnsTotal);

    const cogs = toMoney(saleItemsRows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0));
    const netSales = Math.max(0, toMoney(salesTotal - salesReturnsTotal));
    const netPurchases = Math.max(0, toMoney(purchasesTotal - purchaseReturnsTotal));
    const grossProfit = toMoney(netSales - cogs);
    const grossMarginPercent = netSales > 0 ? toMoney((grossProfit / netSales) * 100) : 0;
    const netOperatingProfit = toMoney(grossProfit - expensesTotal);

    const cashIn = sumMoney(treasuryRows.filter((row) => Number(row.amount || 0) > 0), (row) => row.amount);
    const cashOut = Math.abs(sumMoney(treasuryRows.filter((row) => Number(row.amount || 0) < 0), (row) => row.amount));

    const topProductsMap = new Map<string, { name: string; qty: number; revenue: number; total: number }>();
    for (const row of saleItemsRows) {
      const key = String(row.product_name || row.product_id || '');
      const item = topProductsMap.get(key) || { name: String(row.product_name || ''), qty: 0, revenue: 0, total: 0 };
      item.qty += Number(row.qty || 0);
      item.revenue += Number(row.line_total || 0);
      item.total += Number(row.line_total || 0);
      topProductsMap.set(key, item);
    }

    return {
      range,
      sales: { count: salesRows.length, total: salesTotal, netSales },
      purchases: { count: purchasesRows.length, total: purchasesTotal, netPurchases },
      expenses: { count: expensesRows.length, total: expensesTotal },
      returns: {
        count: returnsRows.length,
        total: returnsTotal,
        salesCount: salesReturnRows.length,
        purchasesCount: purchaseReturnRows.length,
        salesTotal: salesReturnsTotal,
        purchasesTotal: purchaseReturnsTotal,
      },
      treasury: { cashIn, cashOut, net: toMoney(cashIn - cashOut) },
      commercial: { cogs, grossProfit, grossMarginPercent, netOperatingProfit, informationalOnlyPurchasesInPeriod: netPurchases },
      topProducts: [...topProductsMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
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
