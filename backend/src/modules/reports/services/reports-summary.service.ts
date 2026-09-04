import { Inject, Injectable } from '@nestjs/common';
import { type Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { filterScope, parseRange, normalizeProduct, dateKey, buildLastNDays, TrendPoint } from '../helpers/reports-range.helper';
import { sumMoney, toMoney, buildTrendMap, buildAggregatedBalances } from '../helpers/reports-math.helper';
import { sql } from '../../../database/kysely';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';

@Injectable()
export class ReportsSummaryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private tenantId(auth: AuthContext): string {
    return requireTenantScope(auth).tenantId;
  }

  private tenantPredicate(auth: AuthContext, alias?: string) {
    const tenantId = this.tenantId(auth);
    return alias
      ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}`
      : sql<boolean>`tenant_id = ${tenantId}`;
  }

  async reportSummary(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);

    let salesQuery = this.db
      .selectFrom('sales')
      .select(['id', 'total', 'discount', 'branch_id', 'location_id', 'created_at'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);
    if (query.branchId) salesQuery = salesQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) salesQuery = salesQuery.where('location_id', '=', query.locationId);

    let purchasesQuery = this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);
    if (query.branchId) purchasesQuery = purchasesQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) purchasesQuery = purchasesQuery.where('location_id', '=', query.locationId);

    let expensesQuery = this.db
      .selectFrom('expenses')
      .select(['id', 'amount', 'branch_id', 'location_id', 'expense_date'])
      .where('tenant_id', '=', tenantId)
      .where('expense_date', '>=', fromDate)
      .where('expense_date', '<=', toDate);
    if (query.branchId) expensesQuery = expensesQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) expensesQuery = expensesQuery.where('location_id', '=', query.locationId);

    let returnsQuery = this.db
      .selectFrom('return_documents')
      .select(['id', 'return_type', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('tenant_id', '=', tenantId)
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);
    if (query.branchId) returnsQuery = returnsQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) returnsQuery = returnsQuery.where('location_id', '=', query.locationId);

    let treasuryQuery = this.db
      .selectFrom('treasury_transactions')
      .select(['amount', 'branch_id', 'location_id', 'created_at'])
      .where('tenant_id', '=', tenantId)
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);
    if (query.branchId) treasuryQuery = treasuryQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) treasuryQuery = treasuryQuery.where('location_id', '=', query.locationId);

    let saleItemsQuery = this.db
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
      .where('s.tenant_id', '=', tenantId)
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', fromDate)
      .where('s.created_at', '<=', toDate);
    if (query.branchId) saleItemsQuery = saleItemsQuery.where('s.branch_id', '=', query.branchId);
    if (query.locationId) saleItemsQuery = saleItemsQuery.where('s.location_id', '=', query.locationId);

    const [salesRows, purchasesRows, expensesRows, returnsRows, treasuryRows, saleItemsRows] = await Promise.all([
      salesQuery.execute(),
      purchasesQuery.execute(),
      expensesQuery.execute(),
      returnsQuery.execute(),
      treasuryQuery.execute(),
      saleItemsQuery.execute(),
    ]);

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

  async dashboardOverview(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const range = parseRange(query);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 6);
    const todayIso = todayStart.toISOString().slice(0, 10);

    let recentSalesQuery = this.db
      .selectFrom('sales')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', trendStart)
      .where('created_at', '<=', todayEnd);
    if (query.branchId) recentSalesQuery = recentSalesQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) recentSalesQuery = recentSalesQuery.where('location_id', '=', query.locationId);

    let recentPurchasesQuery = this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('tenant_id', '=', tenantId)
      .where('status', '=', 'posted')
      .where('created_at', '>=', trendStart)
      .where('created_at', '<=', todayEnd);
    if (query.branchId) recentPurchasesQuery = recentPurchasesQuery.where('branch_id', '=', query.branchId);
    if (query.locationId) recentPurchasesQuery = recentPurchasesQuery.where('location_id', '=', query.locationId);

    let topTodayQuery = this.db
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
      .where('s.tenant_id', '=', tenantId)
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', todayStart)
      .where('s.created_at', '<=', todayEnd)
      .groupBy(['si.product_id', 'si.product_name', 's.branch_id', 's.location_id'])
      .orderBy('sales_total', 'desc')
      .limit(5);
    if (query.branchId) topTodayQuery = topTodayQuery.where('s.branch_id', '=', query.branchId);
    if (query.locationId) topTodayQuery = topTodayQuery.where('s.location_id', '=', query.locationId);

    const [
      summary,
      productsRows,
      customersRows,
      suppliersRows,
      recentSalesRows,
      recentPurchasesRows,
      customerLedgerRows,
      supplierLedgerRows,
      activeOffersRows,
      topTodayRows,
    ] = await Promise.all([
      this.reportSummary(query, auth),
      this.db
        .selectFrom('products')
        .select(['id', 'name', 'category_id', 'supplier_id', 'retail_price', 'stock_qty', 'min_stock_qty', 'cost_price'])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .execute(),
      this.db
        .selectFrom('customers')
        .select(['id', 'name', 'balance', 'credit_limit'])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .execute(),
      this.db
        .selectFrom('suppliers')
        .select(['id', 'name', 'balance'])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .execute(),
      recentSalesQuery.execute(),
      recentPurchasesQuery.execute(),
      this.db
        .selectFrom('customer_ledger')
        .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
        .where('tenant_id', '=', tenantId)
        .groupBy('customer_id')
        .execute(),
      this.db
        .selectFrom('supplier_ledger')
        .select(['supplier_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
        .where('tenant_id', '=', tenantId)
        .groupBy('supplier_id')
        .execute(),
      this.db
        .selectFrom('product_offers')
        .select(['id'])
        .where('tenant_id', '=', tenantId)
        .where('is_active', '=', true)
        .where(sql<boolean>`(start_date is null or start_date <= ${todayIso}) and (end_date is null or end_date >= ${todayIso})`)
        .execute(),
      topTodayQuery.execute(),
    ]);

    const todaySalesRows = recentSalesRows.filter((row) => dateKey(row.created_at) === dateKey(todayStart));
    const todayPurchasesRows = recentPurchasesRows.filter((row) => dateKey(row.created_at) === dateKey(todayStart));

    const lowStock = productsRows
      .filter((row) => Number(row.stock_qty || 0) > 0 && Number(row.min_stock_qty || 0) > 0 && Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0))
      .slice(0, 8)
      .map((row) => normalizeProduct(row));

    const activeOffers = activeOffersRows.length;

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
    const lowStockCount = productsRows.filter((row) => Number(row.stock_qty || 0) > 0 && Number(row.min_stock_qty || 0) > 0 && Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0)).length;
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

    const dayKeys = buildLastNDays(30);
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
