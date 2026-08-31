import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { filterPurchases, mapPurchaseRows, paginatePurchases, summarizePurchases } from '../helpers/purchases-query.helper';

@Injectable()
export class PurchasesQueryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private tenantPredicate(auth?: AuthContext, alias?: string) {
    if (!auth) return sql<boolean>`true`;
    const tenantId = requireTenantScope(auth).tenantId;
    return alias ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}` : sql<boolean>`tenant_id = ${tenantId}`;
  }

  async fetchMappedPurchases(auth?: AuthContext): Promise<Array<Record<string, unknown>>> {
    const purchases = await this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
        'p.required_date', 'p.currency', 'p.company_name', 'p.contact_id', 'p.shipping_address_id', 'p.cost_center_id', 'p.project_id', 'p.terms_template'
      ])
      .where(this.tenantPredicate(auth, 'p'))
      .orderBy('p.id', 'desc')
      .execute();

    const purchaseIds = purchases.map((row) => Number(row.id || 0)).filter((id) => id > 0);
    const items = purchaseIds.length ? await this.db
      .selectFrom('purchase_items')
      .select(['id', 'purchase_id', 'product_id', 'product_name', 'qty', 'unit_cost', 'line_total', 'unit_name', 'unit_multiplier'])
      .where('purchase_id', 'in', purchaseIds)
      .where(this.tenantPredicate(auth))
      .orderBy('purchase_id', 'asc')
      .orderBy('id', 'asc')
      .execute() : [];

    const attachments = purchaseIds.length ? await this.db
      .selectFrom('purchase_attachments')
      .select(['id', 'purchase_id', 'file_name', 'file_url', 'file_type', 'file_size'])
      .where('purchase_id', 'in', purchaseIds)
      .orderBy('purchase_id', 'asc')
      .orderBy('id', 'asc')
      .execute() : [];

    return mapPurchaseRows(purchases as unknown as Array<Record<string, unknown>>, items as unknown as Array<Record<string, unknown>>, attachments as unknown as Array<Record<string, unknown>>);
  }

  async listPurchases(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || query.limit || 25)));
    const offset = (page - 1) * pageSize;
    const search = String(query.search || query.q || '').trim();
    const filter = String(query.filter || query.view || 'all').trim().toLowerCase();

    let qb = this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
        'p.required_date', 'p.currency', 'p.company_name', 'p.contact_id', 'p.shipping_address_id', 'p.cost_center_id', 'p.project_id', 'p.terms_template',
        sql<number>`COUNT(*) OVER()`.as('total_count'),
        sql<number>`COALESCE(SUM(p.total) OVER(), 0)`.as('agg_total_amount'),
        sql<number>`COALESCE(SUM(CASE WHEN p.payment_type = 'cash' THEN p.total ELSE 0 END) OVER(), 0)`.as('agg_cash_total'),
        sql<number>`COALESCE(SUM(CASE WHEN p.payment_type = 'credit' THEN p.total ELSE 0 END) OVER(), 0)`.as('agg_credit_total'),
        sql<number>`COALESCE(SUM(CASE WHEN p.status = 'cancelled' THEN 1 ELSE 0 END) OVER(), 0)`.as('agg_cancelled_count')
      ])
      .where(this.tenantPredicate(auth, 'p'));

    if (search) {
      qb = qb.where((eb) =>
        eb.or([
          eb('p.doc_no', 'ilike', `%${search}%`),
          eb('s.name', 'ilike', `%${search}%`),
          eb('p.note', 'ilike', `%${search}%`),
          eb('b.name', 'ilike', `%${search}%`),
          eb('l.name', 'ilike', `%${search}%`),
        ])
      );
    }

    if (filter === 'cash') {
      qb = qb.where('p.payment_type', '=', 'cash');
    } else if (filter === 'credit') {
      qb = qb.where('p.payment_type', '=', 'credit');
    } else if (filter === 'cancelled') {
      qb = qb.where('p.status', '=', 'cancelled');
    }

    const purchases = await qb
      .orderBy('p.id', 'desc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    const firstRow = (purchases[0] || {}) as Record<string, unknown>;
    const totalItems = purchases.length > 0 ? Number(firstRow.total_count || 0) : 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const pagedIds = purchases.map((r) => Number(r.id || 0)).filter((id) => id > 0);

    const [items, attachments] = pagedIds.length
      ? await Promise.all([
          this.db
            .selectFrom('purchase_items')
            .select(['id', 'purchase_id', 'product_id', 'product_name', 'qty', 'unit_cost', 'line_total', 'unit_name', 'unit_multiplier'])
            .where('purchase_id', 'in', pagedIds)
            .where(this.tenantPredicate(auth))
            .orderBy('purchase_id', 'asc')
            .orderBy('id', 'asc')
            .execute(),
          this.db
            .selectFrom('purchase_attachments')
            .select(['id', 'purchase_id', 'file_name', 'file_url', 'file_type', 'file_size'])
            .where('purchase_id', 'in', pagedIds)
            .orderBy('purchase_id', 'asc')
            .orderBy('id', 'asc')
            .execute(),
        ])
      : [[], []];

    const hydratedRows = mapPurchaseRows(
      purchases as unknown as Array<Record<string, unknown>>,
      items as unknown as Array<Record<string, unknown>>,
      attachments as unknown as Array<Record<string, unknown>>
    );

    const baseSummary = summarizePurchases(hydratedRows);
    const summary = {
      ...baseSummary,
      totalItems,
      totalAmount: purchases.length > 0 ? Number(Number(firstRow.agg_total_amount || 0).toFixed(2)) : 0,
      cashTotal: purchases.length > 0 ? Number(Number(firstRow.agg_cash_total || 0).toFixed(2)) : 0,
      creditTotal: purchases.length > 0 ? Number(Number(firstRow.agg_credit_total || 0).toFixed(2)) : 0,
      cancelledCount: purchases.length > 0 ? Number(firstRow.agg_cancelled_count || 0) : 0,
    };

    return {
      purchases: hydratedRows,
      pagination: { page, pageSize, totalItems, totalPages },
      summary,
      scope
    };
  }

  async getPurchaseById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const purchaseRow = await this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
        'p.required_date', 'p.currency', 'p.company_name', 'p.contact_id', 'p.shipping_address_id', 'p.cost_center_id', 'p.project_id', 'p.terms_template'
      ])
      .where('p.id', '=', id)
      .where(this.tenantPredicate(auth, 'p'))
      .executeTakeFirst();

    if (!purchaseRow) throw new AppError('Purchase not found', 'PURCHASE_NOT_FOUND', 404);

    const [items, attachments] = await Promise.all([
      this.db
        .selectFrom('purchase_items')
        .select(['id', 'purchase_id', 'product_id', 'product_name', 'qty', 'unit_cost', 'line_total', 'unit_name', 'unit_multiplier'])
        .where('purchase_id', '=', id)
        .where(this.tenantPredicate(auth))
        .orderBy('id', 'asc')
        .execute(),
      this.db
        .selectFrom('purchase_attachments')
        .select(['id', 'purchase_id', 'file_name', 'file_url', 'file_type', 'file_size'])
        .where('purchase_id', '=', id)
        .orderBy('id', 'asc')
        .execute(),
    ]);

    const mapped = mapPurchaseRows(
      [purchaseRow as unknown as Record<string, unknown>],
      items as unknown as Array<Record<string, unknown>>,
      attachments as unknown as Array<Record<string, unknown>>
    );

    return { purchase: mapped[0], scope };
  }

  async getPurchaseAttachment(purchaseId: number, attachmentId: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const row = await this.db
      .selectFrom('purchase_attachments as pa')
      .innerJoin('purchases as p', 'p.id', 'pa.purchase_id')
      .select(['pa.id', 'pa.purchase_id', 'pa.file_name', 'pa.file_url', 'pa.file_type', 'pa.file_size', 'pa.created_at', 'pa.updated_at'])
      .where('pa.id', '=', attachmentId)
      .where('pa.purchase_id', '=', purchaseId)
      .where(sql<boolean>`p.tenant_id = ${scope.tenantId}`)
      .executeTakeFirst();
      
    if (!row) throw new AppError('Attachment not found', 'ATTACHMENT_NOT_FOUND', 404);
    return { attachment: row };
  }

  async listSupplierPayments(auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const rows = await this.db
      .selectFrom('supplier_payments as sp')
      .leftJoin('branches as b', 'b.id', 'sp.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'sp.location_id')
      .leftJoin('users as u', 'u.id', 'sp.created_by')
      .select(['sp.id', 'sp.doc_no', 'sp.supplier_id', 'sp.amount', 'sp.note', 'sp.payment_date', 'sp.branch_id', 'sp.location_id', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name'])
      .where(this.tenantPredicate(auth, 'sp'))
      .orderBy('sp.id', 'desc')
      .execute();
    return {
      supplierPayments: rows.map((row) => ({
        id: String(row.id), docNo: row.doc_no || `ZPV-${row.id}`, supplierId: String(row.supplier_id), amount: Number(row.amount || 0), note: row.note || '', date: row.payment_date, createdBy: row.created_by_name || '', branchId: row.branch_id ? String(row.branch_id) : '', locationId: row.location_id ? String(row.location_id) : '', branchName: row.branch_name || '', locationName: row.location_name || '',
      })),
      scope,
    };
  }
}
