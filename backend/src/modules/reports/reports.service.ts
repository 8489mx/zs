import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { ReportRangeQueryDto } from './dto/report-query.dto';
import { TrendPoint, buildLastNDays, buildPagination, dateKey, filterScope, getBusinessDayBounds, getBusinessTimezone, getPagination, normalizeProduct, paginate, parseRange } from './helpers/reports-range.helper';
import { buildAggregatedBalances, buildTrendMap, sumMoney, toMoney } from './helpers/reports-math.helper';

@Injectable()
export class ReportsService {
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
      .selectFrom('returns')
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
      sales: {
        count: salesRows.length,
        total: salesTotal,
        netSales,
      },
      purchases: {
        count: purchasesRows.length,
        total: purchasesTotal,
        netPurchases,
      },
      expenses: {
        count: expensesRows.length,
        total: expensesTotal,
      },
      returns: {
        count: returnsRows.length,
        total: returnsTotal,
        salesCount: salesReturnRows.length,
        purchasesCount: purchaseReturnRows.length,
        salesTotal: salesReturnsTotal,
        purchasesTotal: purchaseReturnsTotal,
      },
      treasury: {
        cashIn,
        cashOut,
        net: toMoney(cashIn - cashOut),
      },
      commercial: {
        cogs,
        grossProfit,
        grossMarginPercent,
        netOperatingProfit,
        informationalOnlyPurchasesInPeriod: netPurchases,
      },
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

    const businessTimezone = getBusinessTimezone();
    const today = getBusinessDayBounds(new Date(), businessTimezone);
    const todayStart = today.start;
    const todayEnd = today.end;
    const trendStart = new Date(todayStart);
    trendStart.setUTCDate(trendStart.getUTCDate() - 6);

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

    const todaySalesRows = recentSalesRows.filter((row) => dateKey(row.created_at, businessTimezone) === today.key);
    const todayPurchasesRows = recentPurchasesRows.filter((row) => dateKey(row.created_at, businessTimezone) === today.key);

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

    const todayIso = today.key;
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

    const dayKeys = buildLastNDays(7, businessTimezone, new Date());
    const salesTrend: TrendPoint[] = buildTrendMap(recentSalesRows, dayKeys, (row) => dateKey(row.created_at, businessTimezone), (row) => row.total);
    const purchasesTrend: TrendPoint[] = buildTrendMap(recentPurchasesRows, dayKeys, (row) => dateKey(row.created_at, businessTimezone), (row) => row.total);

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

  async inventoryReport(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    const { page, pageSize } = getPagination(query, 20);

    let countQuery = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .where('p.is_active', '=', true);

    let rowsQuery = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .select(['p.id', 'p.name', 'p.stock_qty', 'p.min_stock_qty', 'p.retail_price', 'p.cost_price', 'c.name as category_name', 's.name as supplier_name'])
      .where('p.is_active', '=', true);

    if (search) {
      const pattern = `%${search}%`;
      countQuery = countQuery.where((eb) => eb.or([
        eb(sql`lower(p.name)`, 'like', pattern),
        eb(sql`lower(coalesce(c.name, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(s.name, ''))`, 'like', pattern),
      ]));
      rowsQuery = rowsQuery.where((eb) => eb.or([
        eb(sql`lower(p.name)`, 'like', pattern),
        eb(sql`lower(coalesce(c.name, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(s.name, ''))`, 'like', pattern),
      ]));
    }

    if (filter === 'out') {
      countQuery = countQuery.where('p.stock_qty', '<=', 0);
      rowsQuery = rowsQuery.where('p.stock_qty', '<=', 0);
    }
    if (filter === 'low') {
      countQuery = countQuery.where('p.stock_qty', '>', 0).whereRef('p.stock_qty', '<=', 'p.min_stock_qty');
      rowsQuery = rowsQuery.where('p.stock_qty', '>', 0).whereRef('p.stock_qty', '<=', 'p.min_stock_qty');
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await rowsQuery
      .orderBy('p.stock_qty asc')
      .orderBy('p.id asc')
      .limit(pageSize)
      .offset((pagination.page - 1) * pageSize)
      .execute();

    const items = rows.map((row) => ({
      id: String(row.id),
      name: row.name || '',
      stockQty: Number(row.stock_qty || 0),
      minStock: Number(row.min_stock_qty || 0),
      retailPrice: Number(row.retail_price || 0),
      costPrice: Number(row.cost_price || 0),
      category: row.category_name || '',
      supplier: row.supplier_name || '',
      status: Number(row.stock_qty || 0) <= 0 ? 'out' : (Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0) ? 'low' : 'ok'),
    }));

    const outOfStockRow = await this.db
      .selectFrom('products as p')
      .select(sql<number>`count(*)`.as('count'))
      .where('p.is_active', '=', true)
      .where('p.stock_qty', '<=', 0)
      .executeTakeFirst();

    const lowStockRow = await this.db
      .selectFrom('products as p')
      .select(sql<number>`count(*)`.as('count'))
      .where('p.is_active', '=', true)
      .where('p.stock_qty', '>', 0)
      .whereRef('p.stock_qty', '<=', 'p.min_stock_qty')
      .executeTakeFirst();

    return {
      items,
      pagination,
      summary: {
        totalItems,
        outOfStock: Number((outOfStockRow as { count?: number | string | null } | undefined)?.count || 0),
        lowStock: Number((lowStockRow as { count?: number | string | null } | undefined)?.count || 0),
      },
    };
  }

  async customerBalances(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const customers = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .orderBy('name asc')
      .execute();

    const ledgerRows = await this.db
      .selectFrom('customer_ledger')
      .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('customer_id')
      .execute();

    const ledgerTotals = new Map<string, number>();
    for (const row of ledgerRows) {
      const key = String(row.customer_id || '');
      ledgerTotals.set(key, toMoney((row as { balance_total?: number | string | null }).balance_total ?? 0));
    }

    const search = String(query.search || '').toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();

    let rows = customers.map((row) => {
      const derivedBalance = ledgerTotals.has(String(row.id))
        ? Number(ledgerTotals.get(String(row.id)) || 0)
        : Number(row.balance || 0);

      return {
        id: String(row.id),
        name: row.name || '',
        phone: row.phone || '',
        balance: derivedBalance,
        creditLimit: Number(row.credit_limit || 0),
        availableCredit: toMoney(Number(row.credit_limit || 0) - derivedBalance),
      };
    });

    rows = rows.filter((row) => Number(row.balance || 0) > 0);

    if (search) {
      rows = rows.filter((row) =>
        [row.name, row.phone].some((x) => String(x || '').toLowerCase().includes(search)),
      );
    }

    if (filter === 'over-limit') rows = rows.filter((row) => row.creditLimit > 0 && row.balance > row.creditLimit);
    if (filter === 'high-balance') rows = rows.filter((row) => row.balance >= 1000);

    const paged = paginate(rows, query, 20);
    return {
      customers: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalBalance: toMoney(rows.reduce((sum, row) => sum + row.balance, 0)),
        overLimit: rows.filter((row) => row.creditLimit > 0 && row.balance > row.creditLimit).length,
      },
    };
  }


  async customerLedger(customerId: number, query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const customer = await this.db.selectFrom('customers').select(['id', 'name', 'phone', 'balance', 'credit_limit']).where('id', '=', customerId).where('is_active', '=', true).executeTakeFirst();
    if (!customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);

    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    const { page, pageSize } = getPagination(query, 25);

    let countQuery = this.db
      .selectFrom('customer_ledger')
      .where('customer_id', '=', customerId)
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);

    let entriesQuery = this.db
      .selectFrom('customer_ledger')
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where('customer_id', '=', customerId)
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);

    if (search) {
      const pattern = `%${search}%`;
      countQuery = countQuery.where((eb) => eb.or([
        eb(sql`lower(coalesce(note, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(entry_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(reference_type, ''))`, 'like', pattern),
      ]));
      entriesQuery = entriesQuery.where((eb) => eb.or([
        eb(sql`lower(coalesce(note, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(entry_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(reference_type, ''))`, 'like', pattern),
      ]));
    }
    if (filter === 'debit') {
      countQuery = countQuery.where('amount', '>', 0);
      entriesQuery = entriesQuery.where('amount', '>', 0);
    }
    if (filter === 'credit') {
      countQuery = countQuery.where('amount', '<', 0);
      entriesQuery = entriesQuery.where('amount', '<', 0);
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await entriesQuery
      .orderBy('created_at asc')
      .orderBy('id asc')
      .limit(pageSize)
      .offset((pagination.page - 1) * pageSize)
      .execute();

    const totalsRow = await entriesQuery
      .clearSelect()
      .select([
        sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
        sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
      ])
      .executeTakeFirst();

    return {
      customer: {
        id: String(customer.id),
        name: customer.name || '',
        phone: customer.phone || '',
        balance: Number(customer.balance || 0),
        creditLimit: Number(customer.credit_limit || 0),
      },
      entries: rows.map((row) => ({
        id: String(row.id),
        type: row.entry_type || '',
        amount: Number(row.amount || 0),
        balanceAfter: Number(row.balance_after || 0),
        note: row.note || '',
        referenceType: row.reference_type || '',
        referenceId: row.reference_id ? String(row.reference_id) : '',
        createdAt: row.created_at || '',
      })),
      pagination,
      summary: {
        totalEntries: totalItems,
        totalDebits: toMoney((totalsRow as { debits_total?: number | string | null } | undefined)?.debits_total ?? 0),
        totalCredits: Math.abs(toMoney((totalsRow as { credits_total?: number | string | null } | undefined)?.credits_total ?? 0)),
      },
    };
  }

  async supplierBalances(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const suppliers = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name', 'phone', 'balance'])
      .where('is_active', '=', true)
      .orderBy('name asc')
      .execute();

    const ledgerRows = await this.db
      .selectFrom('supplier_ledger')
      .select(['supplier_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('supplier_id')
      .execute();

    const ledgerTotals = new Map<string, number>();
    for (const row of ledgerRows) {
      const key = String(row.supplier_id || '');
      ledgerTotals.set(key, toMoney((row as { balance_total?: number | string | null }).balance_total ?? 0));
    }

    const search = String(query.search || '').toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();

    let rows = suppliers.map((row) => ({
      id: String(row.id),
      name: row.name || '',
      phone: row.phone || '',
      balance: ledgerTotals.has(String(row.id)) ? Number(ledgerTotals.get(String(row.id)) || 0) : Number(row.balance || 0),
    })).filter((row) => row.balance > 0);

    if (search) rows = rows.filter((row) => [row.name, row.phone].some((x) => String(x || '').toLowerCase().includes(search)));
    if (filter === 'high-balance') rows = rows.filter((row) => row.balance >= 1000);

    const paged = paginate(rows, query, 20);
    return {
      suppliers: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalBalance: toMoney(rows.reduce((sum, row) => sum + row.balance, 0)),
      },
    };
  }

  async supplierLedger(supplierId: number, query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const supplier = await this.db.selectFrom('suppliers').select(['id', 'name', 'phone', 'balance']).where('id', '=', supplierId).where('is_active', '=', true).executeTakeFirst();
    if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    const { page, pageSize } = getPagination(query, 25);

    let countQuery = this.db
      .selectFrom('supplier_ledger')
      .where('supplier_id', '=', supplierId)
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);

    let entriesQuery = this.db
      .selectFrom('supplier_ledger')
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where('supplier_id', '=', supplierId)
      .where('created_at', '>=', fromDate)
      .where('created_at', '<=', toDate);

    if (search) {
      const pattern = `%${search}%`;
      countQuery = countQuery.where((eb) => eb.or([
        eb(sql`lower(coalesce(note, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(entry_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(reference_type, ''))`, 'like', pattern),
      ]));
      entriesQuery = entriesQuery.where((eb) => eb.or([
        eb(sql`lower(coalesce(note, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(entry_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(reference_type, ''))`, 'like', pattern),
      ]));
    }
    if (filter === 'debit') {
      countQuery = countQuery.where('amount', '>', 0);
      entriesQuery = entriesQuery.where('amount', '>', 0);
    }
    if (filter === 'credit') {
      countQuery = countQuery.where('amount', '<', 0);
      entriesQuery = entriesQuery.where('amount', '<', 0);
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await entriesQuery
      .orderBy('created_at asc')
      .orderBy('id asc')
      .limit(pageSize)
      .offset((pagination.page - 1) * pageSize)
      .execute();

    const totalsRow = await entriesQuery
      .clearSelect()
      .select([
        sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
        sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
      ])
      .executeTakeFirst();

    return {
      supplier: {
        id: String(supplier.id),
        name: supplier.name || '',
        phone: supplier.phone || '',
        balance: Number(supplier.balance || 0),
      },
      entries: rows.map((row) => ({
        id: String(row.id),
        type: row.entry_type || '',
        amount: Number(row.amount || 0),
        balanceAfter: Number(row.balance_after || 0),
        note: row.note || '',
        referenceType: row.reference_type || '',
        referenceId: row.reference_id ? String(row.reference_id) : '',
        createdAt: row.created_at || '',
      })),
      pagination,
      summary: {
        totalEntries: totalItems,
        totalDebits: toMoney((totalsRow as { debits_total?: number | string | null } | undefined)?.debits_total ?? 0),
        totalCredits: Math.abs(toMoney((totalsRow as { credits_total?: number | string | null } | undefined)?.credits_total ?? 0)),
      },
    };
  }

  async treasuryTransactions(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const search = String(query.search || '').trim().toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    const { page, pageSize } = getPagination(query, 25);

    let countQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);

    let rowsQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .select(['t.id', 't.txn_type', 't.amount', 't.note', 't.reference_type', 't.reference_id', 't.branch_id', 't.location_id', 't.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);

    let summaryQuery = this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .where('t.created_at', '>=', fromDate)
      .where('t.created_at', '<=', toDate);

    if (query.branchId) {
      countQuery = countQuery.where('t.branch_id', '=', Number(query.branchId));
      rowsQuery = rowsQuery.where('t.branch_id', '=', Number(query.branchId));
      summaryQuery = summaryQuery.where('t.branch_id', '=', Number(query.branchId));
    }
    if (query.locationId) {
      countQuery = countQuery.where('t.location_id', '=', Number(query.locationId));
      rowsQuery = rowsQuery.where('t.location_id', '=', Number(query.locationId));
      summaryQuery = summaryQuery.where('t.location_id', '=', Number(query.locationId));
    }
    if (filter === 'in') {
      countQuery = countQuery.where('t.amount', '>', 0);
      rowsQuery = rowsQuery.where('t.amount', '>', 0);
      summaryQuery = summaryQuery.where('t.amount', '>', 0);
    }
    if (filter === 'out') {
      countQuery = countQuery.where('t.amount', '<', 0);
      rowsQuery = rowsQuery.where('t.amount', '<', 0);
      summaryQuery = summaryQuery.where('t.amount', '<', 0);
    }
    if (search) {
      const pattern = `%${search}%`;
      const applySearch = (qb: any) => qb.where((eb: any) => eb.or([
        eb(sql`lower(coalesce(t.txn_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(t.note, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(t.reference_type, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(u.username, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(b.name, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(l.name, ''))`, 'like', pattern),
      ]));
      countQuery = applySearch(countQuery);
      rowsQuery = applySearch(rowsQuery);
      summaryQuery = applySearch(summaryQuery);
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await rowsQuery
      .orderBy('t.id desc')
      .limit(pageSize)
      .offset((pagination.page - 1) * pageSize)
      .execute();

    const summaryRow = await summaryQuery
      .select([
        sql<number>`coalesce(sum(case when t.amount > 0 then t.amount else 0 end), 0)`.as('cash_in'),
        sql<number>`coalesce(sum(case when t.amount < 0 then t.amount else 0 end), 0)`.as('cash_out'),
        sql<number>`coalesce(sum(t.amount), 0)`.as('net_total'),
      ])
      .executeTakeFirst();

    return {
      treasury: rows.map((row) => ({
        id: String(row.id),
        type: row.txn_type || '',
        amount: Number(row.amount || 0),
        note: row.note || '',
        referenceType: row.reference_type || '',
        referenceId: row.reference_id ? String(row.reference_id) : '',
        branchId: row.branch_id ? String(row.branch_id) : '',
        locationId: row.location_id ? String(row.location_id) : '',
        branchName: row.branch_name || '',
        locationName: row.location_name || '',
        createdBy: row.created_by_name || '',
        date: row.created_at,
      })),
      pagination,
      summary: {
        cashIn: toMoney((summaryRow as { cash_in?: number | string | null } | undefined)?.cash_in ?? 0),
        cashOut: Math.abs(toMoney((summaryRow as { cash_out?: number | string | null } | undefined)?.cash_out ?? 0)),
        net: toMoney((summaryRow as { net_total?: number | string | null } | undefined)?.net_total ?? 0),
      },
    };
  }

  async auditLogs(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    if (!auth.permissions.includes('audit') && auth.role !== 'super_admin') {
      throw new AppError('Missing required permissions', 'FORBIDDEN', 403);
    }

    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);
    const search = String(query.search || '').trim().toLowerCase();
    const { page, pageSize } = getPagination(query, 50);

    let countQuery = this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .where('a.created_at', '>=', fromDate)
      .where('a.created_at', '<=', toDate);

    let rowsQuery = this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select(['a.id', 'a.action', 'a.details', 'a.created_at', 'u.username'])
      .where('a.created_at', '>=', fromDate)
      .where('a.created_at', '<=', toDate);

    let distinctUsersQuery = this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .where('a.created_at', '>=', fromDate)
      .where('a.created_at', '<=', toDate);

    if (search) {
      const pattern = `%${search}%`;
      const applySearch = (qb: any) => qb.where((eb: any) => eb.or([
        eb(sql`lower(coalesce(a.action, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(a.details, ''))`, 'like', pattern),
        eb(sql`lower(coalesce(u.username, ''))`, 'like', pattern),
      ]));
      countQuery = applySearch(countQuery);
      rowsQuery = applySearch(rowsQuery);
      distinctUsersQuery = applySearch(distinctUsersQuery);
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await rowsQuery
      .orderBy('a.id desc')
      .limit(pageSize)
      .offset((pagination.page - 1) * pageSize)
      .execute();

    const distinctUsersRow = await distinctUsersQuery
      .select(sql<number>`count(distinct coalesce(u.username, 'guest'))`.as('count'))
      .executeTakeFirst();

    return {
      auditLogs: rows.map((row) => ({
        id: String(row.id),
        action: row.action || '',
        details: row.details || '',
        user: row.username || '',
        date: row.created_at,
        createdByName: row.username || '',
      })),
      pagination,
      summary: {
        totalItems,
        distinctUsers: Number((distinctUsersRow as { count?: number | string | null } | undefined)?.count || 0),
      },
    };
  }
}
