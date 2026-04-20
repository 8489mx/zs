import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
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

  private async fetchSaleBaseRows(): Promise<Array<Record<string, unknown>>> {
    return this.db
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
      .execute() as unknown as Array<Record<string, unknown>>;
  }

  private mapSaleShells(sales: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
    return sales.map((sale) => ({
      id: String(sale.id),
      docNo: sale.doc_no || `S-${sale.id}`,
      customerId: sale.customer_id ? String(sale.customer_id) : '',
      customerName: sale.customer_name_ref || sale.customer_name || 'عميل نقدي',
      paymentType: sale.payment_type || 'cash',
      paymentChannel: sale.payment_channel || 'cash',
      subTotal: Number(sale.subtotal || 0),
      discount: Number(sale.discount || 0),
      taxRate: Number(sale.tax_rate || 0),
      taxAmount: Number(sale.tax_amount || 0),
      pricesIncludeTax: Boolean(sale.prices_include_tax),
      total: Number(sale.total || 0),
      paidAmount: Number(sale.paid_amount || 0),
      storeCreditUsed: Number(sale.store_credit_used || 0),
      status: sale.status || 'posted',
      note: sale.note || '',
      createdBy: sale.created_by_name || '',
      date: sale.created_at,
      branchId: sale.branch_id ? String(sale.branch_id) : '',
      locationId: sale.location_id ? String(sale.location_id) : '',
      branchName: sale.branch_name || '',
      locationName: sale.location_name || '',
      items: [],
      payments: [],
    }));
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

    const baseSales = await this.fetchSaleBaseRows();
    const shells = this.mapSaleShells(baseSales);
    const filtered = filterSales(shells, query);
    const paged = paginateRows(filtered, query);
    const baseById = new Map(baseSales.map((sale) => [String(sale.id), sale]));
    const pagedBaseSales = paged.rows
      .map((row) => baseById.get(String(row.id)))
      .filter((row): row is Record<string, unknown> => Boolean(row));
    const hydratedSales = await this.hydrateSales(pagedBaseSales);

    return {
      sales: hydratedSales,
      pagination: paged.pagination,
      summary: summarizeSales(filtered),
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
