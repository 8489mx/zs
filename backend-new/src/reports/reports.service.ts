import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { ReportRangeQueryDto } from './dto/report-query.dto';

type Range = {
  from: string;
  to: string;
  branchId?: string;
  locationId?: string;
};

type TrendPoint = {
  key: string;
  value: number;
};

@Injectable()
export class ReportsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private parseRange(query: ReportRangeQueryDto): Range {
    const now = new Date();
    const defaultTo = now.toISOString();
    const defaultFromDate = new Date(now);
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const defaultFrom = defaultFromDate.toISOString();

    return {
      from: query.from || defaultFrom,
      to: query.to || defaultTo,
      branchId: query.branchId ? String(query.branchId) : undefined,
      locationId: query.locationId ? String(query.locationId) : undefined,
    };
  }

  private dateKey(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private paginate<T>(rows: T[], query: ReportRangeQueryDto, defaultSize = 25): { rows: T[]; pagination: Record<string, number> } {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize || defaultSize)));
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      rows: rows.slice(start, start + pageSize),
      pagination: { page: safePage, pageSize, totalItems, totalPages },
    };
  }

  private filterScope<T extends { branch_id?: number | null; location_id?: number | null }>(rows: T[], query: ReportRangeQueryDto): T[] {
    return rows.filter((row) => {
      if (query.branchId && Number(row.branch_id || 0) !== Number(query.branchId)) return false;
      if (query.locationId && Number(row.location_id || 0) !== Number(query.locationId)) return false;
      return true;
    });
  }

  private buildLastNDays(days: number): string[] {
    return Array.from({ length: days }).map((_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - index - 1));
      return this.dateKey(date);
    });
  }

  private normalizeProduct(row: {
    id: number;
    name: string | null;
    category_id: number | null;
    supplier_id: number | null;
    retail_price: number | string | null;
    stock_qty: number | string | null;
    min_stock_qty: number | string | null;
  }): Record<string, unknown> {
    return {
      id: String(row.id),
      name: row.name || '',
      barcode: '',
      categoryId: row.category_id ? String(row.category_id) : '',
      supplierId: row.supplier_id ? String(row.supplier_id) : '',
      retailPrice: Number(row.retail_price || 0),
      wholesalePrice: 0,
      stock: Number(row.stock_qty || 0),
      minStock: Number(row.min_stock_qty || 0),
      notes: '',
      units: [],
      offers: [],
      customerPrices: [],
    };
  }

  async reportSummary(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = this.parseRange(query);

    const salesRows = this.filterScope(await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'discount', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', new Date(range.from))
      .where('created_at', '<=', new Date(range.to))
      .execute(), query);

    const purchasesRows = this.filterScope(await this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', new Date(range.from))
      .where('created_at', '<=', new Date(range.to))
      .execute(), query);

    const treasuryRows = this.filterScope(await this.db
      .selectFrom('treasury_transactions')
      .select(['amount', 'branch_id', 'location_id', 'created_at'])
      .where('created_at', '>=', new Date(range.from))
      .where('created_at', '<=', new Date(range.to))
      .execute(), query);

    const saleItemsRows = this.filterScope(await this.db
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
      .where('s.created_at', '>=', new Date(range.from))
      .where('s.created_at', '<=', new Date(range.to))
      .execute(), query);

    const salesTotal = Number(salesRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2));
    const purchasesTotal = Number(purchasesRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2));
    const cogs = Number(saleItemsRows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0).toFixed(2));
    const grossProfit = Number((salesTotal - cogs).toFixed(2));
    const grossMarginPercent = salesTotal > 0 ? Number(((grossProfit / salesTotal) * 100).toFixed(2)) : 0;

    const expensesTotal = 0;
    const salesReturnsTotal = 0;
    const purchaseReturnsTotal = 0;
    const returnsTotal = 0;

    const cashIn = Number(treasuryRows.filter((row) => Number(row.amount || 0) > 0).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
    const cashOut = Number(Math.abs(treasuryRows.filter((row) => Number(row.amount || 0) < 0).reduce((sum, row) => sum + Number(row.amount || 0), 0)).toFixed(2));

    const topProductsMap = new Map<string, { name: string; qty: number; revenue: number; total: number }>();
    for (const row of saleItemsRows) {
      const key = String(row.product_name || row.product_id || '');
      const item = topProductsMap.get(key) || { name: String(row.product_name || ''), qty: 0, revenue: 0, total: 0 };
      item.qty += Number(row.qty || 0);
      item.revenue += Number(row.line_total || 0);
      item.total += Number(row.line_total || 0);
      topProductsMap.set(key, item);
    }

    const netSales = Math.max(0, Number((salesTotal - salesReturnsTotal).toFixed(2)));
    const netPurchases = Math.max(0, Number((purchasesTotal - purchaseReturnsTotal).toFixed(2)));
    const netOperatingProfit = Number((grossProfit - expensesTotal).toFixed(2));

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
        count: 0,
        total: expensesTotal,
      },
      returns: {
        count: 0,
        total: returnsTotal,
        salesTotal: salesReturnsTotal,
        purchasesTotal: purchaseReturnsTotal,
      },
      treasury: {
        cashIn,
        cashOut,
        net: Number((cashIn - cashOut).toFixed(2)),
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
    const range = this.parseRange(query);
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

    const todayKey = this.dateKey(new Date());

    const todaySalesRows = this.filterScope(await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .execute(), query).filter((row) => this.dateKey(row.created_at) === todayKey);

    const todayPurchasesRows = this.filterScope(await this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .execute(), query).filter((row) => this.dateKey(row.created_at) === todayKey);

    const todaySaleItemsRows = this.filterScope(await this.db
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
      .execute(), query).filter((row) => this.dateKey(row.created_at) === todayKey);

    const lowStock = productsRows
      .filter((row) => Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0))
      .slice(0, 8)
      .map((row) => this.normalizeProduct(row));

    const inventoryCost = Number(productsRows.reduce((sum, row) => sum + (Number(row.stock_qty || 0) * Number(row.cost_price || 0)), 0).toFixed(2));
    const inventorySaleValue = Number(productsRows.reduce((sum, row) => sum + (Number(row.stock_qty || 0) * Number(row.retail_price || 0)), 0).toFixed(2));
    const customerDebt = Number(customersRows.reduce((sum, row) => sum + Number(row.balance || 0), 0).toFixed(2));
    const supplierDebt = Number(suppliersRows.reduce((sum, row) => sum + Number(row.balance || 0), 0).toFixed(2));
    const nearCreditLimit = customersRows.filter((row) => Number(row.credit_limit || 0) > 0 && Number(row.balance || 0) >= Number(row.credit_limit || 0) * 0.8 && Number(row.balance || 0) <= Number(row.credit_limit || 0)).length;
    const aboveCreditLimit = customersRows.filter((row) => Number(row.credit_limit || 0) > 0 && Number(row.balance || 0) > Number(row.credit_limit || 0)).length;
    const highSupplierBalances = suppliersRows.filter((row) => Number(row.balance || 0) >= 1000).length;
    const activeOffers = 0;

    const topTodayMap = new Map<string, { productId: string; name: string; qty: number; total: number }>();
    for (const row of todaySaleItemsRows) {
      const key = String(row.product_id || row.product_name || '');
      const entry = topTodayMap.get(key) || {
        productId: String(row.product_id || ''),
        name: String(row.product_name || ''),
        qty: 0,
        total: 0,
      };
      entry.qty += Number(row.qty || 0);
      entry.total += Number(row.line_total || 0);
      topTodayMap.set(key, entry);
    }

    const topCustomers = customersRows
      .map((row) => ({
        key: String(row.id),
        name: row.name || '',
        total: Number(row.balance || 0),
        count: Number(row.balance || 0) > 0 ? 1 : 0,
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topSuppliers = suppliersRows
      .map((row) => ({
        key: String(row.id),
        name: row.name || '',
        total: Number(row.balance || 0),
        count: Number(row.balance || 0) > 0 ? 1 : 0,
      }))
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const dayKeys = this.buildLastNDays(7);
    const salesTrend: TrendPoint[] = dayKeys.map((key) => ({
      key,
      value: Number(todaySalesRows.filter((row) => this.dateKey(row.created_at) === key).reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    }));
    const purchasesTrend: TrendPoint[] = dayKeys.map((key) => ({
      key,
      value: Number(todayPurchasesRows.filter((row) => this.dateKey(row.created_at) === key).reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
    }));

    return {
      range,
      summary: {
        ...(summary as Record<string, unknown>),
        totalProducts: productsRows.length,
        totalCustomers: customersRows.length,
        totalSuppliers: suppliersRows.length,
        lowStockCount: lowStock.length,
        outOfStockCount: productsRows.filter((row) => Number(row.stock_qty || 0) <= 0).length,
        activeOffers,
      },
      stats: {
        productsCount: productsRows.length,
        customersCount: customersRows.length,
        suppliersCount: suppliersRows.length,
        todaySalesCount: todaySalesRows.length,
        todaySalesAmount: Number(todaySalesRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
        todayPurchasesCount: todayPurchasesRows.length,
        todayPurchasesAmount: Number(todayPurchasesRows.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2)),
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
      topToday: [...topTodayMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      topCustomers,
      topSuppliers,
      trends: {
        sales: salesTrend,
        purchases: purchasesTrend,
      },
    };
  }

  async inventoryReport(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .select(['p.id', 'p.name', 'p.stock_qty', 'p.min_stock_qty', 'p.retail_price', 'p.cost_price', 'c.name as category_name', 's.name as supplier_name'])
      .where('p.is_active', '=', true)
      .orderBy('p.stock_qty asc')
      .execute();

    let items = rows.map((row) => ({
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

    const search = String(query.search || '').toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    if (search) items = items.filter((row) => [row.name, row.category, row.supplier, row.status].some((x) => String(x).toLowerCase().includes(search)));
    if (filter === 'out') items = items.filter((row) => row.status === 'out');
    if (filter === 'low') items = items.filter((row) => row.status === 'low');

    const paged = this.paginate(items, query, 20);
    return {
      items: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: items.length,
        outOfStock: items.filter((row) => row.status === 'out').length,
        lowStock: items.filter((row) => row.status === 'low').length,
      },
    };
  }

  async customerBalances(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    let customers = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .where('balance', '>', 0)
      .orderBy('balance desc')
      .execute();

    const search = String(query.search || '').toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    if (search) {
      customers = customers.filter((row) => [row.name, row.phone].some((x) => String(x || '').toLowerCase().includes(search)));
    }

    let rows = customers.map((row) => ({
      id: String(row.id),
      name: row.name || '',
      phone: row.phone || '',
      balance: Number(row.balance || 0),
      creditLimit: Number(row.credit_limit || 0),
      availableCredit: Number((Number(row.credit_limit || 0) - Number(row.balance || 0)).toFixed(2)),
    }));

    if (filter === 'over-limit') rows = rows.filter((row) => row.creditLimit > 0 && row.balance > row.creditLimit);
    if (filter === 'high-balance') rows = rows.filter((row) => row.balance >= 1000);

    const paged = this.paginate(rows, query, 20);
    return {
      customers: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        totalBalance: Number(rows.reduce((sum, row) => sum + row.balance, 0).toFixed(2)),
        overLimit: rows.filter((row) => row.creditLimit > 0 && row.balance > row.creditLimit).length,
      },
    };
  }

  async customerLedger(customerId: number, query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const customer = await this.db.selectFrom('customers').select(['id', 'name', 'phone', 'balance', 'credit_limit']).where('id', '=', customerId).where('is_active', '=', true).executeTakeFirst();
    if (!customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);

    const entries = await this.db
      .selectFrom('customer_ledger')
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where('customer_id', '=', customerId)
      .orderBy('created_at asc')
      .orderBy('id asc')
      .execute();

    const search = String(query.search || '').toLowerCase();
    let rows = entries.map((entry) => ({
      id: String(entry.id),
      entryType: entry.entry_type || '',
      amount: Number(entry.amount || 0),
      debit: Number(entry.amount || 0) > 0 ? Number(entry.amount || 0) : 0,
      credit: Number(entry.amount || 0) < 0 ? Math.abs(Number(entry.amount || 0)) : 0,
      balanceAfter: Number(entry.balance_after || 0),
      note: entry.note || '',
      referenceType: entry.reference_type || '',
      referenceId: entry.reference_id ? String(entry.reference_id) : '',
      date: entry.created_at,
    }));

    if (search) rows = rows.filter((row) => [row.entryType, row.note, row.referenceType, row.date].some((x) => String(x || '').toLowerCase().includes(search)));

    const paged = this.paginate(rows, query, 25);
    return {
      customer: { id: String(customer.id), name: customer.name || '', phone: customer.phone || '', balance: Number(customer.balance || 0), creditLimit: Number(customer.credit_limit || 0) },
      entries: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        debitTotal: Number(rows.reduce((sum, row) => sum + row.debit, 0).toFixed(2)),
        creditTotal: Number(rows.reduce((sum, row) => sum + row.credit, 0).toFixed(2)),
        lastBalance: rows.length ? rows[rows.length - 1].balanceAfter : Number(customer.balance || 0),
      },
    };
  }

  async supplierLedger(supplierId: number, query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const supplier = await this.db.selectFrom('suppliers').select(['id', 'name', 'phone', 'balance']).where('id', '=', supplierId).where('is_active', '=', true).executeTakeFirst();
    if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

    const entries = await this.db
      .selectFrom('supplier_ledger')
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where('supplier_id', '=', supplierId)
      .orderBy('created_at asc')
      .orderBy('id asc')
      .execute();

    const search = String(query.search || '').toLowerCase();
    let rows = entries.map((entry) => ({
      id: String(entry.id),
      entryType: entry.entry_type || '',
      amount: Number(entry.amount || 0),
      debit: Number(entry.amount || 0) > 0 ? Number(entry.amount || 0) : 0,
      credit: Number(entry.amount || 0) < 0 ? Math.abs(Number(entry.amount || 0)) : 0,
      balanceAfter: Number(entry.balance_after || 0),
      note: entry.note || '',
      referenceType: entry.reference_type || '',
      referenceId: entry.reference_id ? String(entry.reference_id) : '',
      date: entry.created_at,
    }));

    if (search) rows = rows.filter((row) => [row.entryType, row.note, row.referenceType, row.date].some((x) => String(x || '').toLowerCase().includes(search)));
    const paged = this.paginate(rows, query, 25);

    return {
      supplier: { id: String(supplier.id), name: supplier.name || '', phone: supplier.phone || '', balance: Number(supplier.balance || 0) },
      entries: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: rows.length,
        debitTotal: Number(rows.reduce((sum, row) => sum + row.debit, 0).toFixed(2)),
        creditTotal: Number(rows.reduce((sum, row) => sum + row.credit, 0).toFixed(2)),
        lastBalance: rows.length ? rows[rows.length - 1].balanceAfter : Number(supplier.balance || 0),
      },
    };
  }

  async treasuryTransactions(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = this.parseRange(query);
    let rows = await this.db
      .selectFrom('treasury_transactions as t')
      .leftJoin('branches as b', 'b.id', 't.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 't.location_id')
      .leftJoin('users as u', 'u.id', 't.created_by')
      .select(['t.id', 't.txn_type', 't.amount', 't.note', 't.reference_type', 't.reference_id', 't.branch_id', 't.location_id', 't.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .where('t.created_at', '>=', new Date(range.from))
      .where('t.created_at', '<=', new Date(range.to))
      .orderBy('t.id desc')
      .execute();

    rows = this.filterScope(rows, query);

    const search = String(query.search || '').toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    let mapped = rows.map((row) => ({
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
    }));

    if (filter === 'in') mapped = mapped.filter((row) => row.amount > 0);
    if (filter === 'out') mapped = mapped.filter((row) => row.amount < 0);
    if (search) mapped = mapped.filter((row) => [row.type, row.note, row.referenceType, row.createdBy, row.branchName, row.locationName].some((x) => String(x).toLowerCase().includes(search)));

    const paged = this.paginate(mapped, query, 25);
    return {
      treasury: paged.rows,
      pagination: paged.pagination,
      summary: {
        cashIn: Number(mapped.filter((row) => row.amount > 0).reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
        cashOut: Number(Math.abs(mapped.filter((row) => row.amount < 0).reduce((sum, row) => sum + row.amount, 0)).toFixed(2)),
        net: Number(mapped.reduce((sum, row) => sum + row.amount, 0).toFixed(2)),
      },
    };
  }

  async auditLogs(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const rows = await this.db
      .selectFrom('audit_logs as a')
      .leftJoin('users as u', 'u.id', 'a.created_by')
      .select(['a.id', 'a.action', 'a.details', 'a.created_at', 'u.username'])
      .orderBy('a.id desc')
      .limit(1000)
      .execute();

    const search = String(query.search || '').toLowerCase();
    let mapped = rows.map((row) => ({
      id: String(row.id),
      action: row.action || '',
      details: row.details || '',
      user: row.username || '',
      date: row.created_at,
      createdByName: row.username || '',
    }));

    if (search) mapped = mapped.filter((row) => [row.action, row.details, row.user].some((x) => String(x).toLowerCase().includes(search)));

    if (!auth.permissions.includes('audit') && auth.role !== 'super_admin') {
      throw new AppError('Missing required permissions', 'FORBIDDEN', 403);
    }

    const paged = this.paginate(mapped, query, 50);
    return {
      auditLogs: paged.rows,
      pagination: paged.pagination,
      summary: {
        totalItems: mapped.length,
        distinctUsers: new Set(mapped.map((row) => row.user || 'guest')).size,
      },
    };
  }
}
