import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { mapHeldSalesRows, mapSaleRows, filterSales, paginateRows, summarizeSales } from '../helpers/sales-query.helper';
import { SalesAuthorizationService } from './sales-authorization.service';

@Injectable()
export class SalesQueryService {
  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    private readonly authz: SalesAuthorizationService,
  ) {}

  private async fetchMappedSales(): Promise<Array<Record<string, unknown>>> {
    const sales = await this.db
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
      .orderBy('s.id desc')
      .execute();

    const items = await this.db
      .selectFrom('sale_items')
      .select(['id', 'sale_id', 'product_id', 'product_name', 'qty', 'unit_price', 'line_total', 'unit_name', 'unit_multiplier', 'cost_price', 'price_type'])
      .orderBy('sale_id asc')
      .orderBy('id asc')
      .execute();

    const payments = await this.db
      .selectFrom('sale_payments')
      .select(['id', 'sale_id', 'payment_channel', 'amount'])
      .orderBy('sale_id asc')
      .orderBy('id asc')
      .execute();

    return mapSaleRows(sales as unknown as Array<Record<string, unknown>>, items as unknown as Array<Record<string, unknown>>, payments as unknown as Array<Record<string, unknown>>);
  }

  async listSales(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    this.authz.assertCanViewSales(auth);
    const rows = await this.fetchMappedSales();
    const filtered = filterSales(rows, query);
    const paged = paginateRows(filtered, query);
    return { sales: paged.rows, pagination: paged.pagination, summary: summarizeSales(filtered) };
  }

  async getSaleById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    this.authz.assertCanViewSales(auth);
    const rows = await this.fetchMappedSales();
    const sale = rows.find((entry) => Number(entry.id) === Number(id));
    if (!sale) throw new AppError('Sale not found', 'SALE_NOT_FOUND', 404);
    return { sale };
  }

  async listHeldSales(_auth: AuthContext): Promise<Record<string, unknown>> {
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
    };
  }
}
