import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Kysely, sql } from 'kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { ExecuteDynamicPivotDto, SavePivotTemplateDto } from '../dto/dynamic-pivot.dto';
import {
  buildDynamicPivotMatrix,
  type PivotResult,
} from '../engines/pivot-aggregation.engine';

@Injectable()
export class DynamicPivotService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  /**
   * Executes dynamic multidimensional pivot aggregation across datasets
   */
  async executePivot(
    auth: AuthContext,
    dto: ExecuteDynamicPivotDto,
  ): Promise<PivotResult> {
    const scope = requireTenantScope(auth);
    const tenantId = scope.tenantId;

    let records: Array<Record<string, any>> = [];

    if (dto.dataset === 'sales') {
      const needsItemLevel =
        dto.rowDimension === 'category' ||
        dto.colDimension === 'category' ||
        dto.rowDimension === 'product' ||
        dto.colDimension === 'product';

      if (needsItemLevel) {
        // Query at sale item level
        let query = (this.db as any)
          .selectFrom('sale_items as si')
          .innerJoin('sales as s', (j: any) => j.onRef('s.id', '=', 'si.sale_id').onRef('s.tenant_id', '=', 'si.tenant_id'))
          .leftJoin('products as p', (j: any) => j.onRef('p.id', '=', 'si.product_id').onRef('p.tenant_id', '=', 'si.tenant_id'))
          .leftJoin('categories as cat', (j: any) => j.onRef('cat.id', '=', 'p.category_id').onRef('cat.tenant_id', '=', 'p.tenant_id'))
          .leftJoin('branches as b', (j: any) => j.onRef('b.id', '=', 's.branch_id').onRef('b.tenant_id', '=', 's.tenant_id'))
          .leftJoin('customers as c', (j: any) => j.onRef('c.id', '=', 's.customer_id').onRef('c.tenant_id', '=', 's.tenant_id'))
          .leftJoin('users as u', (j: any) => j.onRef('u.id', '=', 's.user_id').onRef('u.tenant_id', '=', 's.tenant_id'))
          .select([
            sql`to_char(s.created_at, 'YYYY-MM')`.as('date_month'),
            sql`to_char(s.created_at, 'YYYY-MM-DD')`.as('date_day'),
            'b.name as branch',
            'c.name as customer',
            'u.name as rep',
            's.payment_type as payment_type',
            'p.name as product',
            'cat.name as category',
            sql<number>`si.total_price`.as('total_amount'),
            sql<number>`(si.total_price - COALESCE(si.cost_price, 0) * si.quantity)`.as('net_profit'),
            sql<number>`si.quantity`.as('quantity'),
          ])
          .where('s.tenant_id', '=', tenantId)
          .where('si.tenant_id', '=', tenantId)
          .where('s.status', '!=', 'cancelled');

        if (dto.dateFrom) query = query.where('s.created_at', '>=', new Date(dto.dateFrom));
        if (dto.dateTo) {
          const to = new Date(dto.dateTo);
          to.setHours(23, 59, 59, 999);
          query = query.where('s.created_at', '<=', to);
        }
        if (dto.branchId) query = query.where('s.branch_id', '=', dto.branchId);

        records = await query.limit(5000).execute();
      } else {
        // Query at sale header level
        let query = (this.db as any)
          .selectFrom('sales as s')
          .leftJoin('branches as b', (j: any) => j.onRef('b.id', '=', 's.branch_id').onRef('b.tenant_id', '=', 's.tenant_id'))
          .leftJoin('customers as c', (j: any) => j.onRef('c.id', '=', 's.customer_id').onRef('c.tenant_id', '=', 's.tenant_id'))
          .leftJoin('users as u', (j: any) => j.onRef('u.id', '=', 's.user_id').onRef('u.tenant_id', '=', 's.tenant_id'))
          .select([
            sql`to_char(s.created_at, 'YYYY-MM')`.as('date_month'),
            sql`to_char(s.created_at, 'YYYY-MM-DD')`.as('date_day'),
            'b.name as branch',
            'c.name as customer',
            'u.name as rep',
            's.payment_type as payment_type',
            's.order_type as order_type',
            's.status as status',
            sql<number>`s.total`.as('total_amount'),
            sql<number>`COALESCE(s.paid_amount, 0)`.as('paid_amount'),
            sql<number>`(s.total - COALESCE(s.tax_amount, 0)) * 0.25`.as('net_profit'), // Header profit heuristic
            sql<number>`1`.as('quantity'),
          ])
          .where('s.tenant_id', '=', tenantId)
          .where('s.status', '!=', 'cancelled');

        if (dto.dateFrom) query = query.where('s.created_at', '>=', new Date(dto.dateFrom));
        if (dto.dateTo) {
          const to = new Date(dto.dateTo);
          to.setHours(23, 59, 59, 999);
          query = query.where('s.created_at', '<=', to);
        }
        if (dto.branchId) query = query.where('s.branch_id', '=', dto.branchId);

        records = await query.limit(5000).execute();
      }
    } else if (dto.dataset === 'purchases') {
      let query = (this.db as any)
        .selectFrom('purchases as p')
        .leftJoin('suppliers as sup', (j: any) => j.onRef('sup.id', '=', 'p.supplier_id').onRef('sup.tenant_id', '=', 'p.tenant_id'))
        .leftJoin('branches as b', (j: any) => j.onRef('b.id', '=', 'p.branch_id').onRef('b.tenant_id', '=', 'p.tenant_id'))
        .select([
          sql`to_char(p.created_at, 'YYYY-MM')`.as('date_month'),
          sql`to_char(p.created_at, 'YYYY-MM-DD')`.as('date_day'),
          'sup.name as supplier',
          'b.name as branch',
          'p.status as status',
          sql<number>`p.total`.as('total_amount'),
          sql<number>`0`.as('net_profit'),
          sql<number>`1`.as('quantity'),
        ])
        .where('p.tenant_id', '=', tenantId);

      if (dto.dateFrom) query = query.where('p.created_at', '>=', new Date(dto.dateFrom));
      if (dto.dateTo) {
        const to = new Date(dto.dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.where('p.created_at', '<=', to);
      }

      records = await query.limit(5000).execute();
    } else if (dto.dataset === 'inventory') {
      let query = (this.db as any)
        .selectFrom('product_location_stock as pls')
        .innerJoin('products as p', (j: any) => j.onRef('p.id', '=', 'pls.product_id').onRef('p.tenant_id', '=', 'pls.tenant_id'))
        .leftJoin('categories as cat', (j: any) => j.onRef('cat.id', '=', 'p.category_id').onRef('cat.tenant_id', '=', 'p.tenant_id'))
        .leftJoin('locations as loc', (j: any) => j.onRef('loc.id', '=', 'pls.location_id').onRef('loc.tenant_id', '=', 'pls.tenant_id'))
        .select([
          'loc.name as branch',
          'cat.name as category',
          'p.name as product',
          sql<number>`(pls.stock_on_hand * COALESCE(p.cost_price, 0))`.as('total_amount'),
          sql<number>`pls.stock_on_hand`.as('quantity'),
        ])
        .where('pls.tenant_id', '=', tenantId);

      records = await query.limit(5000).execute();
    } else if (dto.dataset === 'expenses') {
      let query = (this.db as any)
        .selectFrom('treasury_transactions as t')
        .select([
          sql`to_char(t.created_at, 'YYYY-MM')`.as('date_month'),
          sql`to_char(t.created_at, 'YYYY-MM-DD')`.as('date_day'),
          't.category as category',
          't.description as description',
          sql<number>`t.amount`.as('total_amount'),
        ])
        .where('t.tenant_id', '=', tenantId)
        .where('t.type', '=', 'expense');

      if (dto.dateFrom) query = query.where('t.created_at', '>=', new Date(dto.dateFrom));
      if (dto.dateTo) {
        const to = new Date(dto.dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.where('t.created_at', '<=', to);
      }

      records = await query.limit(5000).execute();
    }

    return buildDynamicPivotMatrix({
      records,
      rowDimension: dto.rowDimension,
      colDimension: dto.colDimension,
      metric: dto.metric,
    });
  }

  /**
   * Retrieves saved custom report templates
   */
  async getSavedTemplates(auth: AuthContext, dataset?: string): Promise<any[]> {
    const scope = requireTenantScope(auth);
    let query = (this.db as any)
      .selectFrom('custom_bi_pivot_reports')
      .selectAll()
      .where('tenant_id', '=', scope.tenantId);

    if (dataset) {
      query = query.where('dataset', '=', dataset);
    }

    return query.orderBy('is_favorite', 'desc').orderBy('name', 'asc').execute();
  }

  /**
   * Saves a pivot template for rapid reuse
   */
  async saveTemplate(auth: AuthContext, dto: SavePivotTemplateDto): Promise<{ success: boolean; id: string }> {
    const scope = requireTenantScope(auth);
    const id = `bi_${randomUUID()}`;

    await (this.db as any)
      .insertInto('custom_bi_pivot_reports')
      .values({
        id,
        tenant_id: scope.tenantId,
        name: dto.name,
        description: dto.description || null,
        dataset: dto.dataset,
        row_dimension: dto.rowDimension,
        col_dimension: dto.colDimension || null,
        metric: dto.metric,
        date_from: dto.dateFrom || null,
        date_to: dto.dateTo || null,
        filters: dto.filters ? JSON.stringify(dto.filters) : null,
        created_by: auth.userId || null,
        is_favorite: Boolean(dto.isFavorite),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    return { success: true, id };
  }

  /**
   * Deletes a saved pivot report template
   */
  async deleteTemplate(auth: AuthContext, templateId: string): Promise<{ success: boolean }> {
    const scope = requireTenantScope(auth);

    const existing = await (this.db as any)
      .selectFrom('custom_bi_pivot_reports')
      .select('id')
      .where('id', '=', templateId)
      .where('tenant_id', '=', scope.tenantId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundException('Template not found');
    }

    await (this.db as any)
      .deleteFrom('custom_bi_pivot_reports')
      .where('id', '=', templateId)
      .where('tenant_id', '=', scope.tenantId)
      .execute();

    return { success: true };
  }
}
