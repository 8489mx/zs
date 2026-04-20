import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { mapHeldSalesRows, mapSaleRows } from '../helpers/sales-query.helper';
import { SalesAuthorizationService } from './sales-authorization.service';

@Injectable()
export class SalesQueryService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly authz: SalesAuthorizationService,
  ) {}

  private parseListOptions(query: Record<string, unknown>) {
    const filter = String(query.filter || query.view || 'all').trim().toLowerCase();
    const search = String(query.search || query.q || '').trim().toLowerCase();
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 30)));
    return { filter, search, page, pageSize };
  }

  private buildSalesFilteredQuery(query: Record<string, unknown>) {
    const { filter, search } = this.parseListOptions(query);
    let statement = this.db
      .selectFrom('sales as s')
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .leftJoin('branches as b', 'b.id', 's.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 's.location_id')
      .leftJoin('users as u', 'u.id', 's.created_by');

    if (filter === 'cash') statement = statement.where('s.payment_type', '=', 'cash');
    if (filter === 'credit') statement = statement.where('s.payment_type', '=', 'credit');
    if (filter === 'cancelled') statement = statement.where('s.status', '=', 'cancelled');

    if (search) {
      const like = `%${search}%`;
      statement = statement.where((eb) => eb.or([
        eb(sql<string>`lower(coalesce(s.doc_no, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(c.name, s.customer_name, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(s.note, ''))`, 'like', like),
        eb(sql<string>`lower(coalesce(s.status, ''))`, 'like', like),
      ]));
    }

    return statement;
  }

  private async hydrateSales(sales: Array<Record<string, unknown>>): Promise<Array<Record<string, unknown>>> {
    const saleIds = sales.map((sale) => Number(sale.id)).filter((id) => Number.isFinite(id) && id > 0);
    if (!saleIds.length) return [];

    const [items, payments] = await Promise.all([
      this.db
        .selectFrom('sale_items')
        .select(['id', 'sale_id', 'product_id', 'product_name', 'qty', 'unit_price', 'line_total', 'unit_name', 'unit_multiplier', 'cost_price', 'price_type'])
        .where('sale_id', 'in', saleIds)
        .orderBy('sale_id asc')
        .orderBy('id asc')
        .execute(),
      this.db
        .selectFrom('sale_payments')
        .select(['id', 'sale_id', 'payment_channel', 'amount'])
        .where('sale_id', 'in', saleIds)
        .orderBy('sale_id asc')
        .orderBy('id asc')
        .execute(),
    ]);

    return mapSaleRows(
      sales,
      items as unknown as Array<Record<string, unknown>>,
      payments as unknown as Array<Record<string, unknown>>,
    );
  }

  async listSales(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    this.authz.assertCanViewSales(auth);
    const { page, pageSize } = this.parseListOptions(query);
    const filteredQuery = this.buildSalesFilteredQuery(query);
    const totalItems = Number((await filteredQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst())?.count || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;

    const pagedBaseSales = await filteredQuery
      .select([
        's.id', 's.doc_no', 's.customer_id', 'c.name as customer_name_ref', 's.customer_name', 's.payment_type', 's.payment_channel',
        's.subtotal', 's.discount', 's.tax_rate', 's.tax_amount', 's.prices_include_tax', 's.total', 's.paid_amount', 's.store_credit_used',
        's.status', 's.note', 's.branch_id', 's.location_id', 's.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('s.id desc')
      .limit(pageSize)
      .offset(offset)
      .execute() as unknown as Array<Record<string, unknown>>;
    const hydratedSales = await this.hydrateSales(pagedBaseSales);

    const summaryRow = await filteredQuery
      .select([
        sql<number>`coalesce(sum(s.total), 0)`.as('total_sales'),
        sql<number>`coalesce(sum(case when s.payment_type = 'cash' then s.total else 0 end), 0)`.as('cash_total'),
        sql<number>`coalesce(sum(case when s.payment_type = 'credit' then s.total else 0 end), 0)`.as('credit_total'),
        sql<number>`coalesce(sum(case when s.created_at::date = current_date then s.total else 0 end), 0)`.as('today_sales_total'),
        sql<number>`coalesce(sum(case when s.created_at::date = current_date then 1 else 0 end), 0)`.as('today_sales_count'),
        sql<number>`coalesce(sum(case when s.status = 'cancelled' then 1 else 0 end), 0)`.as('cancelled_count'),
      ])
      .executeTakeFirst();

    const topCustomers = await filteredQuery
      .select([
        sql<string>`coalesce(c.name, s.customer_name, 'عميل نقدي')`.as('name'),
        sql<number>`coalesce(sum(s.total), 0)`.as('total'),
        sql<number>`count(*)`.as('count'),
      ])
      .groupBy(['c.name', 's.customer_name'])
      .orderBy('total', 'desc')
      .limit(5)
      .execute();

    return {
      sales: hydratedSales,
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
      summary: {
        totalItems,
        totalSales: Number(summaryRow?.total_sales || 0),
        todaySalesCount: Number(summaryRow?.today_sales_count || 0),
        todaySalesTotal: Number(summaryRow?.today_sales_total || 0),
        cashTotal: Number(summaryRow?.cash_total || 0),
        creditTotal: Number(summaryRow?.credit_total || 0),
        cancelledCount: Number(summaryRow?.cancelled_count || 0),
        topCustomers: topCustomers.map((entry) => ({
          name: String(entry.name || 'عميل نقدي'),
          total: Number(entry.total || 0),
          count: Number(entry.count || 0),
        })),
      },
      scope,
    };
  }

  async getSaleById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    this.authz.assertCanViewSales(auth);

    const sale = await this.db
      .selectFrom('sales as s')
      .leftJoin('customers as c', 'c.id', 's.customer_id')
      .leftJoin('branches as b', 'b.id', 's.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 's.location_id')
      .leftJoin('users as u', 'u.id', 's.created_by')
      .select([
        's.id', 's.doc_no', 's.customer_id', 'c.name as customer_name_ref', 's.customer_name', 's.payment_type', 's.payment_channel',
        's.subtotal', 's.discount', 's.tax_rate', 's.tax_amount', 's.prices_include_tax', 's.total', 's.paid_amount', 's.store_credit_used',
        's.status', 's.note', 's.branch_id', 's.location_id', 's.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .where('s.id', '=', id)
      .executeTakeFirst();

    if (!sale) throw new AppError('Sale not found', 'SALE_NOT_FOUND', 404);

    const [mappedSale] = await this.hydrateSales([sale as unknown as Record<string, unknown>]);
    return { sale: mappedSale, scope };
  }

  async listHeldSales(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const rows = await this.db
      .selectFrom('held_sales as hs')
      .leftJoin('customers as c', 'c.id', 'hs.customer_id')
      .select([
        'hs.id', 'hs.customer_id', 'hs.payment_type', 'hs.payment_channel', 'hs.paid_amount', 'hs.cash_amount', 'hs.card_amount',
        'hs.discount', 'hs.note', 'hs.search', 'hs.price_type', 'hs.branch_id', 'hs.location_id', 'hs.created_at', 'c.name as customer_name',
      ])
      .orderBy('hs.id desc')
      .execute();

    const items = await this.db
      .selectFrom('held_sale_items')
      .select(['id', 'held_sale_id', 'product_id', 'product_name', 'qty', 'unit_price', 'unit_name', 'unit_multiplier', 'price_type'])
      .orderBy('held_sale_id asc')
      .orderBy('id asc')
      .execute();

    return {
      heldSales: mapHeldSalesRows(
        rows as unknown as Array<Record<string, unknown>>,
        items as unknown as Array<Record<string, unknown>>,
      ),
      scope,
    };
  }
}
