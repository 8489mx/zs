import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { mapPurchaseRows } from '../helpers/purchases-query.helper';

@Injectable()
export class PurchasesQueryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private parseListOptions(query: Record<string, unknown>) {
    const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
    const search = String(query.search || query.q || '').trim().toLowerCase();
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
    return { filter, search, page, pageSize };
  }

  private buildPurchasesFilteredQuery(query: Record<string, unknown>) {
    const { filter, search } = this.parseListOptions(query);
    let statement = this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by');

    if (filter === 'cash') statement = statement.where('p.payment_type', '=', 'cash');
    if (filter === 'credit') statement = statement.where('p.payment_type', '=', 'credit');
    if (filter === 'cancelled') statement = statement.where('p.status', '=', 'cancelled');

    if (search) {
      const like = `%${search}%`;
      statement = statement.where((eb) => eb.or([
        eb(sql<string>`lower(coalesce(p.doc_no, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(s.name, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(p.status, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(p.payment_type, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(b.name, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(l.name, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(p.note, ''))`, 'like', like),
      ]));
    }

    return statement;
  }

  private async hydratePurchases(
    purchases: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const purchaseIds = purchases
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!purchaseIds.length) return [];

    const items = await this.db
      .selectFrom('purchase_items')
      .select(['id', 'purchase_id', 'product_id', 'product_name', 'qty', 'unit_cost', 'line_total', 'unit_name', 'unit_multiplier'])
      .where('purchase_id', 'in', purchaseIds)
      .orderBy('purchase_id asc')
      .orderBy('id asc')
      .execute();

    return mapPurchaseRows(
      purchases as unknown as Array<Record<string, unknown>>,
      items as unknown as Array<Record<string, unknown>>,
    );
  }

  async fetchMappedPurchases(): Promise<Array<Record<string, unknown>>> {
    const rows = await this.buildPurchasesFilteredQuery({})
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('p.id desc')
      .execute() as unknown as Array<Record<string, unknown>>;
    return this.hydratePurchases(rows);
  }

  async listPurchases(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const { page, pageSize } = this.parseListOptions(query);
    const filteredQuery = this.buildPurchasesFilteredQuery(query);
    const totalItems = Number((await filteredQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst())?.count || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    const pagedRows = await filteredQuery
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('p.id desc')
      .limit(pageSize)
      .offset(offset)
      .execute() as unknown as Array<Record<string, unknown>>;
    const mappedRows = await this.hydratePurchases(pagedRows);

    const summaryRow = await filteredQuery
      .select([
        sql<number>`coalesce(sum(p.total), 0)`.as('total_amount'),
        sql<number>`coalesce(sum(case when p.payment_type = 'credit' then p.total else 0 end), 0)`.as('credit_total'),
        sql<number>`coalesce(sum(case when p.status = 'cancelled' then 1 else 0 end), 0)`.as('cancelled_count'),
        sql<number>`coalesce(sum(case when p.status = 'posted' then 1 else 0 end), 0)`.as('posted_count'),
      ])
      .executeTakeFirst();

    const topSuppliers = await filteredQuery
      .select([
        sql<string>`coalesce(s.name, 'بدون مورد')`.as('name'),
        sql<number>`coalesce(sum(p.total), 0)`.as('total'),
        sql<number>`count(*)`.as('count'),
      ])
      .groupBy('s.name')
      .orderBy('total', 'desc')
      .limit(5)
      .execute();

    return {
      purchases: mappedRows,
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        totalItems,
        totalAmount: Number(summaryRow?.total_amount || 0),
        creditTotal: Number(summaryRow?.credit_total || 0),
        cancelledCount: Number(summaryRow?.cancelled_count || 0),
        posted: Number(summaryRow?.posted_count || 0),
        draft: Math.max(0, totalItems - Number(summaryRow?.posted_count || 0)),
        topSuppliers: topSuppliers.map((row) => ({
          name: String(row.name || 'بدون مورد'),
          total: Number(row.total || 0),
          count: Number(row.count || 0),
        })),
      },
      scope,
    };
  }

  async getPurchaseById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const row = await this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .where('p.id', '=', id)
      .executeTakeFirst();
    const [purchase] = row ? await this.hydratePurchases([row as unknown as Record<string, unknown>]) : [];

    if (!purchase) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);
    return { purchase, scope };
  }

  async listSupplierPayments(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const rows = await this.db
      .selectFrom('supplier_payments as sp')
      .leftJoin('branches as b', 'b.id', 'sp.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'sp.location_id')
      .leftJoin('users as u', 'u.id', 'sp.created_by')
      .select(['sp.id', 'sp.doc_no', 'sp.supplier_id', 'sp.amount', 'sp.note', 'sp.payment_date', 'sp.branch_id', 'sp.location_id', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .orderBy('sp.id desc')
      .execute();

    return {
      supplierPayments: rows.map((row) => ({
        id: String(row.id),
        docNo: row.doc_no || `PO-${row.id}`,
        supplierId: String(row.supplier_id),
        amount: Number(row.amount || 0),
        note: row.note || '',
        date: row.payment_date,
        createdBy: row.created_by_name || '',
        branchId: row.branch_id ? String(row.branch_id) : '',
        locationId: row.location_id ? String(row.location_id) : '',
        branchName: row.branch_name || '',
        locationName: row.location_name || '',
      })),
      scope,
    };
  }
}
