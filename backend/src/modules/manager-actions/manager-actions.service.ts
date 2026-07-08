import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { Kysely, sql } from '../../database/kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../core/auth/utils/tenant-boundary';
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

  async list(limit = 8, auth: AuthContext): Promise<{ insights: ManagerActionInsight[]; scope: ReturnType<typeof requireTenantScope> }> {
    const scope = requireTenantScope(auth);
    const safeLimit = Math.max(1, Math.min(25, Math.floor(Number(limit) || 8)));
    const [
      products,
      productLastSales,
      sales,
      saleMargins,
      customers,
      customerBalances,
    ] = await Promise.all([
      this.safeQuery(() => this.loadProducts(scope.tenantId)),
      this.safeQuery(() => this.loadProductLastSales(scope.tenantId)),
      this.safeQuery(() => this.loadRecentSales(scope.tenantId)),
      this.safeQuery(() => this.loadSaleMargins(scope.tenantId)),
      this.safeQuery(() => this.loadCustomers(scope.tenantId)),
      this.safeQuery(() => this.loadCustomerBalances(scope.tenantId)),
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
      scope,
    };
  }

  private async safeQuery<T>(loader: () => Promise<T[]>): Promise<T[]> {
    try {
      return await loader();
    } catch {
      return [];
    }
  }

  private loadProducts(tenantId: string): Promise<ManagerActionProductRow[]> {
    return this.db
      .selectFrom('products')
      .select(['id', 'name', 'retail_price', 'cost_price', 'stock_qty', 'min_stock_qty', 'created_at'])
      .where('is_active', '=', true)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();
  }

  private loadProductLastSales(tenantId: string): Promise<ManagerActionLastSaleRow[]> {
    return this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        sql<Date>`max(s.created_at)`.as('last_sold_at'),
      ])
      .where('s.status', '=', 'posted')
      .where('si.product_id', 'is not', null)
      .where(sql<boolean>`s.tenant_id = ${tenantId}`)
      .where(sql<boolean>`si.tenant_id = ${tenantId}`)
      .groupBy('si.product_id')
      .execute();
  }

  private loadRecentSales(tenantId: string): Promise<ManagerActionSaleRow[]> {
    return this.db
      .selectFrom('sales')
      .select(['id', 'doc_no', 'subtotal', 'discount', 'total', 'created_at'])
      .where('status', '=', 'posted')
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .orderBy('created_at', 'desc')
      .limit(100)
      .execute();
  }

  private loadSaleMargins(tenantId: string): Promise<ManagerActionSaleMarginRow[]> {
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
      .where(sql<boolean>`s.tenant_id = ${tenantId}`)
      .where(sql<boolean>`si.tenant_id = ${tenantId}`)
      .groupBy(['si.sale_id', 's.doc_no', 's.created_at'])
      .orderBy('s.created_at', 'desc')
      .limit(100)
      .execute();
  }

  private loadCustomers(tenantId: string): Promise<ManagerActionCustomerRow[]> {
    return this.db
      .selectFrom('customers')
      .select(['id', 'name', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .execute();
  }

  private loadCustomerBalances(tenantId: string): Promise<ManagerActionCustomerBalanceRow[]> {
    return this.db
      .selectFrom('customer_ledger')
      .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .where(sql<boolean>`tenant_id = ${tenantId}`)
      .groupBy('customer_id')
      .execute();
  }
}
