import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuthContext } from '../auth/interfaces/auth-context.interface';
import { AppError } from '../common/errors/app-error';
import { KYSELY_DB } from '../database/database.constants';
import { Database } from '../database/database.types';
import { ReportRangeQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private parseRange(query: ReportRangeQueryDto): { from: string; to: string } {
    const now = new Date();
    const defaultTo = now.toISOString();
    const defaultFromDate = new Date(now);
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const defaultFrom = defaultFromDate.toISOString();
    return {
      from: query.from || defaultFrom,
      to: query.to || defaultTo,
    };
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

  async reportSummary(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = this.parseRange(query);

    const salesRows = await this.db
      .selectFrom('sales')
      .select(['id', 'total', 'discount', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', new Date(range.from))
      .where('created_at', '<=', new Date(range.to))
      .execute();

    const purchasesRows = await this.db
      .selectFrom('purchases')
      .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
      .where('status', '=', 'posted')
      .where('created_at', '>=', new Date(range.from))
      .where('created_at', '<=', new Date(range.to))
      .execute();

    const treasuryRows = await this.db
      .selectFrom('treasury_transactions')
      .select(['amount', 'branch_id', 'location_id', 'created_at'])
      .where('created_at', '>=', new Date(range.from))
      .where('created_at', '<=', new Date(range.to))
      .execute();

    const saleItemsRows = await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select(['si.product_name', 'si.qty', 'si.line_total', 'si.cost_price', 's.branch_id', 's.location_id', 's.created_at'])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', new Date(range.from))
      .where('s.created_at', '<=', new Date(range.to))
      .execute();

    const sales = this.filterScope(salesRows, query);
    const purchases = this.filterScope(purchasesRows, query);
    const treasury = this.filterScope(treasuryRows, query);
    const saleItems = this.filterScope(saleItemsRows, query);

    const salesTotal = Number(sales.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2));
    const purchasesTotal = Number(purchases.reduce((sum, row) => sum + Number(row.total || 0), 0).toFixed(2));
    const cogs = Number(saleItems.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0).toFixed(2));
    const grossProfit = Number((salesTotal - cogs).toFixed(2));
    const grossMarginPercent = salesTotal > 0 ? Number(((grossProfit / salesTotal) * 100).toFixed(2)) : 0;

    const cashIn = Number(treasury.filter((row) => Number(row.amount || 0) > 0).reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
    const cashOut = Number(Math.abs(treasury.filter((row) => Number(row.amount || 0) < 0).reduce((sum, row) => sum + Number(row.amount || 0), 0)).toFixed(2));

    const topProductsMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const row of saleItems) {
      const key = String(row.product_name || '');
      const item = topProductsMap.get(key) || { name: key, qty: 0, revenue: 0 };
      item.qty += Number(row.qty || 0);
      item.revenue += Number(row.line_total || 0);
      topProductsMap.set(key, item);
    }

    return {
      range,
      summary: {
        salesCount: sales.length,
        salesTotal,
        purchasesCount: purchases.length,
        purchasesTotal,
        cogs,
        grossProfit,
        grossMarginPercent,
        cashIn,
        cashOut,
        netCashFlow: Number((cashIn - cashOut).toFixed(2)),
      },
      topProducts: [...topProductsMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    };
  }

  async dashboardOverview(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const summary = await this.reportSummary(query);

    const products = await this.db.selectFrom('products').select(['id', 'name', 'stock_qty', 'min_stock_qty', 'cost_price', 'retail_price']).where('is_active', '=', true).execute();
    const customers = await this.db.selectFrom('customers').select(['id', 'name', 'balance', 'credit_limit']).where('is_active', '=', true).execute();
    const suppliers = await this.db.selectFrom('suppliers').select(['id', 'name', 'balance']).where('is_active', '=', true).execute();

    const lowStock = products.filter((p) => Number(p.stock_qty || 0) <= Number(p.min_stock_qty || 0));
    const inventoryCost = Number(products.reduce((sum, p) => sum + Number(p.stock_qty || 0) * Number(p.cost_price || 0), 0).toFixed(2));
    const inventorySaleValue = Number(products.reduce((sum, p) => sum + Number(p.stock_qty || 0) * Number(p.retail_price || 0), 0).toFixed(2));
    const customerDebt = Number(customers.reduce((sum, c) => sum + Number(c.balance || 0), 0).toFixed(2));
    const supplierDebt = Number(suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0).toFixed(2));

    return {
      range: summary.range,
      summary: summary.summary,
      stats: {
        productsCount: products.length,
        customersCount: customers.length,
        suppliersCount: suppliers.length,
        lowStockCount: lowStock.length,
        outOfStockCount: lowStock.filter((entry) => Number(entry.stock_qty || 0) <= 0).length,
        inventoryCost,
        inventorySaleValue,
        customerDebt,
        supplierDebt,
      },
      lowStock: lowStock.slice(0, 8).map((p) => ({ id: String(p.id), name: p.name, stock: Number(p.stock_qty || 0), minStock: Number(p.min_stock_qty || 0) })),
      topProducts: summary.topProducts,
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
