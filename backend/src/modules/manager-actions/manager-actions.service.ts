import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { Kysely, sql } from '../../database/kysely';
import {
  ManagerActionCustomerBalanceRow,
  ManagerActionCustomerRow,
  ManagerActionInsight,
  ManagerActionLastSaleRow,
  ManagerActionProductRow,
  ManagerActionSaleMarginRow,
  ManagerActionSaleRow,
  buildManagerActionInsights,
} from './helpers/manager-actions.helper';

@Injectable()
export class ManagerActionsService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async list(limit = 8): Promise<{ insights: ManagerActionInsight[] }> {
    const safeLimit = Math.max(1, Math.min(25, Math.floor(Number(limit) || 8)));
    const [
      products,
      productLastSales,
      sales,
      saleMargins,
      customers,
      customerBalances,
    ] = await Promise.all([
      this.safeQuery(() => this.loadProducts()),
      this.safeQuery(() => this.loadProductLastSales()),
      this.safeQuery(() => this.loadRecentSales()),
      this.safeQuery(() => this.loadSaleMargins()),
      this.safeQuery(() => this.loadCustomers()),
      this.safeQuery(() => this.loadCustomerBalances()),
    ]);

    return {
      insights: buildManagerActionInsights({
        products,
        productLastSales,
        sales,
        saleMargins,
        customers,
        customerBalances,
        limit: safeLimit,
      }),
    };
  }

  private async safeQuery<T>(loader: () => Promise<T[]>): Promise<T[]> {
    try {
      return await loader();
    } catch {
      return [];
    }
  }

  private loadProducts(): Promise<ManagerActionProductRow[]> {
    return this.db
      .selectFrom('products')
      .select(['id', 'name', 'retail_price', 'cost_price', 'stock_qty', 'min_stock_qty', 'created_at'])
      .where('is_active', '=', true)
      .execute();
  }

  private loadProductLastSales(): Promise<ManagerActionLastSaleRow[]> {
    return this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        sql<Date>`max(s.created_at)`.as('last_sold_at'),
      ])
      .where('s.status', '=', 'posted')
      .where('si.product_id', 'is not', null)
      .groupBy('si.product_id')
      .execute();
  }

  private loadRecentSales(): Promise<ManagerActionSaleRow[]> {
    return this.db
      .selectFrom('sales')
      .select(['id', 'doc_no', 'subtotal', 'discount', 'total', 'created_at'])
      .where('status', '=', 'posted')
      .orderBy('created_at desc')
      .limit(100)
      .execute();
  }

  private loadSaleMargins(): Promise<ManagerActionSaleMarginRow[]> {
    return this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.sale_id',
        's.doc_no',
        sql<number>`coalesce(sum(si.line_total), 0)`.as('revenue'),
        sql<number>`coalesce(sum(si.cost_price * si.qty * si.unit_multiplier), 0)`.as('cost'),
        sql<number>`coalesce(sum(case when si.line_total < (si.cost_price * si.qty * si.unit_multiplier) then 1 else 0 end), 0)`.as('below_cost_lines'),
      ])
      .where('s.status', '=', 'posted')
      .groupBy(['si.sale_id', 's.doc_no', 's.created_at'])
      .orderBy('s.created_at desc')
      .limit(100)
      .execute();
  }

  private loadCustomers(): Promise<ManagerActionCustomerRow[]> {
    return this.db
      .selectFrom('customers')
      .select(['id', 'name', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .execute();
  }

  private loadCustomerBalances(): Promise<ManagerActionCustomerBalanceRow[]> {
    return this.db
      .selectFrom('customer_ledger')
      .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('customer_id')
      .execute();
  }
}
