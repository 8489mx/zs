import { Inject, Injectable } from '@nestjs/common';
import { Kysely } from '../../../database/kysely';
import { AppError } from '../../../common/errors/app-error';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { filterPurchases, mapPurchaseRows, paginatePurchases, summarizePurchases } from '../helpers/purchases-query.helper';

@Injectable()
export class PurchasesQueryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  async fetchMappedPurchases(): Promise<Array<Record<string, unknown>>> {
    const purchases = await this.db
      .selectFrom('purchases as p')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .leftJoin('branches as b', 'b.id', 'p.branch_id')
      .leftJoin('stock_locations as l', 'l.id', 'p.location_id')
      .leftJoin('users as u', 'u.id', 'p.created_by')
      .select([
        'p.id', 'p.doc_no', 'p.supplier_id', 's.name as supplier_name', 'p.payment_type', 'p.subtotal', 'p.discount', 'p.tax_rate', 'p.tax_amount',
        'p.prices_include_tax', 'p.total', 'p.note', 'p.status', 'p.branch_id', 'p.location_id', 'p.created_at', 'b.name as branch_name', 'l.name as location_name', 'u.username as created_by_name',
      ])
      .orderBy('p.id desc')
      .execute();

    const items = await this.db
      .selectFrom('purchase_items')
      .select(['id', 'purchase_id', 'product_id', 'product_name', 'qty', 'unit_cost', 'line_total', 'unit_name', 'unit_multiplier'])
      .orderBy('purchase_id asc')
      .orderBy('id asc')
      .execute();

    return mapPurchaseRows(purchases as unknown as Array<Record<string, unknown>>, items as unknown as Array<Record<string, unknown>>);
  }

  async listPurchases(query: Record<string, unknown>, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const rows = await this.fetchMappedPurchases();
    const filtered = filterPurchases(rows, query);
    const paged = paginatePurchases(filtered, query);

    return {
      purchases: paged.rows,
      pagination: paged.pagination,
      summary: summarizePurchases(filtered),
      scope,
    };
  }

  async getPurchaseById(id: number, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = requireTenantScope(auth);
    const rows = await this.fetchMappedPurchases();
    const purchase = rows.find((entry) => Number(entry.id || 0) === id) || null;

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
