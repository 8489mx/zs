import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AppError } from '../../../common/errors/app-error';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { buildPagination, getPagination, paginate, parseRange } from '../helpers/reports-range.helper';
import { toMoney } from '../helpers/reports-math.helper';

@Injectable()
export class ReportsLedgerService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async inventoryReport(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(5, Number(query.pageSize || 20)));
    const q = String(query.search || '').trim().toLowerCase();
    const view = String((query as Record<string, unknown>).view || 'all');

    const products = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'barcode', 'stock_qty', 'min_stock_qty', 'cost_price', 'retail_price', 'category_id', 'supplier_id'])
      .where('is_active', '=', true)
      .orderBy('id desc')
      .execute();

    let rows = products.map((row) => ({
      id: String(row.id),
      name: row.name || '',
      barcode: row.barcode || '',
      stockQty: Number(row.stock_qty || 0),
      minStockQty: Number(row.min_stock_qty || 0),
      costPrice: Number(row.cost_price || 0),
      retailPrice: Number(row.retail_price || 0),
      categoryId: row.category_id ? String(row.category_id) : '',
      supplierId: row.supplier_id ? String(row.supplier_id) : '',
    }));

    if (view === 'low') rows = rows.filter((row) => row.stockQty <= row.minStockQty);
    if (view === 'out') rows = rows.filter((row) => row.stockQty <= 0);
    if (q) rows = rows.filter((row) => `${row.name} ${row.barcode}`.toLowerCase().includes(q));

    const totalItems = rows.length;
    const pagination = buildPagination(page, pageSize, totalItems);
    const start = (pagination.page - 1) * pageSize;

    return {
      items: rows.slice(start, start + pageSize),
      pagination,
      summary: {
        totalProducts: rows.length,
        lowStockCount: rows.filter((row) => row.stockQty <= row.minStockQty).length,
        outOfStockCount: rows.filter((row) => row.stockQty <= 0).length,
        inventoryCost: toMoney(rows.reduce((sum, row) => sum + row.stockQty * row.costPrice, 0)),
        inventorySaleValue: toMoney(rows.reduce((sum, row) => sum + row.stockQty * row.retailPrice, 0)),
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
    if (search) rows = rows.filter((row) => [row.name, row.phone].some((x) => String(x || '').toLowerCase().includes(search)));
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

    let countQuery = this.db.selectFrom('customer_ledger').where('customer_id', '=', customerId).where('created_at', '>=', fromDate).where('created_at', '<=', toDate);
    let entriesQuery = this.db.selectFrom('customer_ledger').select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at']).where('customer_id', '=', customerId).where('created_at', '>=', fromDate).where('created_at', '<=', toDate);

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
    if (filter === 'debit') { countQuery = countQuery.where('amount', '>', 0); entriesQuery = entriesQuery.where('amount', '>', 0); }
    if (filter === 'credit') { countQuery = countQuery.where('amount', '<', 0); entriesQuery = entriesQuery.where('amount', '<', 0); }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await entriesQuery.orderBy('created_at asc').orderBy('id asc').limit(pageSize).offset((pagination.page - 1) * pageSize).execute();
    const totalsRow = await entriesQuery.clearSelect().select([
      sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
      sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
    ]).executeTakeFirst();

    return {
      customer: { id: String(customer.id), name: customer.name || '', phone: customer.phone || '', balance: Number(customer.balance || 0), creditLimit: Number(customer.credit_limit || 0) },
      entries: rows.map((row) => ({ id: String(row.id), type: row.entry_type || '', amount: Number(row.amount || 0), balanceAfter: Number(row.balance_after || 0), note: row.note || '', referenceType: row.reference_type || '', referenceId: row.reference_id ? String(row.reference_id) : '', createdAt: row.created_at || '' })),
      pagination,
      summary: {
        totalEntries: totalItems,
        totalDebits: toMoney((totalsRow as { debits_total?: number | string | null } | undefined)?.debits_total ?? 0),
        totalCredits: Math.abs(toMoney((totalsRow as { credits_total?: number | string | null } | undefined)?.credits_total ?? 0)),
      },
    };
  }

  async supplierBalances(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const suppliers = await this.db.selectFrom('suppliers').select(['id', 'name', 'phone', 'balance']).where('is_active', '=', true).orderBy('name asc').execute();
    const ledgerRows = await this.db.selectFrom('supplier_ledger').select(['supplier_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')]).groupBy('supplier_id').execute();
    const ledgerTotals = new Map<string, number>();
    for (const row of ledgerRows) ledgerTotals.set(String(row.supplier_id || ''), toMoney((row as { balance_total?: number | string | null }).balance_total ?? 0));
    const search = String(query.search || '').toLowerCase();
    const filter = String(query.filter || 'all').toLowerCase();
    let rows = suppliers.map((row) => ({ id: String(row.id), name: row.name || '', phone: row.phone || '', balance: ledgerTotals.has(String(row.id)) ? Number(ledgerTotals.get(String(row.id)) || 0) : Number(row.balance || 0) })).filter((row) => row.balance > 0);
    if (search) rows = rows.filter((row) => [row.name, row.phone].some((x) => String(x || '').toLowerCase().includes(search)));
    if (filter === 'high-balance') rows = rows.filter((row) => row.balance >= 1000);
    const paged = paginate(rows, query, 20);
    return { suppliers: paged.rows, pagination: paged.pagination, summary: { totalItems: rows.length, totalBalance: toMoney(rows.reduce((sum, row) => sum + row.balance, 0)) } };
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

    let countQuery = this.db.selectFrom('supplier_ledger').where('supplier_id', '=', supplierId).where('created_at', '>=', fromDate).where('created_at', '<=', toDate);
    let entriesQuery = this.db.selectFrom('supplier_ledger').select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at']).where('supplier_id', '=', supplierId).where('created_at', '>=', fromDate).where('created_at', '<=', toDate);

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
    if (filter === 'debit') { countQuery = countQuery.where('amount', '>', 0); entriesQuery = entriesQuery.where('amount', '>', 0); }
    if (filter === 'credit') { countQuery = countQuery.where('amount', '<', 0); entriesQuery = entriesQuery.where('amount', '<', 0); }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await entriesQuery.orderBy('created_at asc').orderBy('id asc').limit(pageSize).offset((pagination.page - 1) * pageSize).execute();
    const totalsRow = await entriesQuery.clearSelect().select([
      sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
      sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
    ]).executeTakeFirst();

    return {
      supplier: { id: String(supplier.id), name: supplier.name || '', phone: supplier.phone || '', balance: Number(supplier.balance || 0) },
      entries: rows.map((row) => ({ id: String(row.id), type: row.entry_type || '', amount: Number(row.amount || 0), balanceAfter: Number(row.balance_after || 0), note: row.note || '', referenceType: row.reference_type || '', referenceId: row.reference_id ? String(row.reference_id) : '', createdAt: row.created_at || '' })),
      pagination,
      summary: {
        totalEntries: totalItems,
        totalDebits: toMoney((totalsRow as { debits_total?: number | string | null } | undefined)?.debits_total ?? 0),
        totalCredits: Math.abs(toMoney((totalsRow as { credits_total?: number | string | null } | undefined)?.credits_total ?? 0)),
      },
    };
  }
}
