import { Inject, Injectable } from '@nestjs/common';
import { type Kysely } from '../../../database/kysely';
import { KYSELY_DB } from '../../../database/database.constants';
import { Database } from '../../../database/database.types';
import { sql } from '../../../database/kysely';
import { toMoney } from '../helpers/reports-math.helper';
import { AuthContext } from '../../../core/auth/interfaces/auth-context.interface';
import { requireTenantScope } from '../../../core/auth/utils/tenant-boundary';
import { ReportRangeQueryDto } from '../dto/report-query.dto';
import { buildPagination } from '../helpers/reports-range.helper';
import { buildCustomerRfmPayload } from '../helpers/reports-summary.helper';
import { buildReportListState } from '../helpers/reports-query.helper';
import { applyPartnerLedgerSearch, applySignedAmountFilter } from '../helpers/reports-query-pipeline.helper';
import {
  buildCustomerBalancesPayload,
  buildCustomerLedgerPayload,
  buildSupplierBalancesPayload,
  buildSupplierLedgerPayload,
  LedgerSummaryRow,
  PartnerLedgerEntryRow,
} from '../helpers/reports-ledger.helper';
import { buildCustomerLedgerTotals, buildSupplierLedgerTotals } from '../helpers/reports-partner-ledger.helper';
import { AppError } from '../../../common/errors/app-error';

@Injectable()
export class ReportsSummaryService {
  constructor(@Inject(KYSELY_DB) private readonly db: Kysely<Database>) {}

  private scope(auth: AuthContext) {
    return requireTenantScope(auth);
  }

  private tenantId(auth: AuthContext): string {
    return this.scope(auth).tenantId;
  }

  private tenantPredicate(auth: AuthContext, alias?: string) {
    const { tenantId } = this.scope(auth);
    return alias
      ? sql<boolean>`${sql.ref(`${alias}.tenant_id`)} = ${tenantId}`
      : sql<boolean>`tenant_id = ${tenantId}`;
  }

  private withScope(payload: Record<string, unknown>, auth: AuthContext): Record<string, unknown> {
    return {
      ...payload,
      scope: this.scope(auth),
    };
  }

  async debtAgingReport(auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const now = new Date();

    const customerRows = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'balance', 'credit_limit'])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .execute();

    const customerIds = customerRows.map((c) => Number(c.id));
    let customerSales: { customer_id: number; total: number; created_at: Date }[] = [];
    if (customerIds.length > 0) {
      customerSales = (await this.db
        .selectFrom('sales')
        .select(['customer_id', 'total', 'created_at'])
        .where('tenant_id', '=', tenantId)
        .where('customer_id', 'in', customerIds)
        .where('payment_type', '=', 'credit')
        .where('status', '=', 'posted')
        .orderBy('created_at', 'desc')
        .execute()) as any[];
    }

    const receivables = customerRows.map((cust) => {
      const balance = Number(cust.balance || 0);
      const sales = customerSales.filter((s) => Number(s.customer_id) === Number(cust.id));

      let current = 0;
      let days31To60 = 0;
      let days61To90 = 0;
      let over90 = 0;

      let remainingBalance = balance;
      for (const sale of sales) {
        if (remainingBalance <= 0) break;
        const saleTotal = Number(sale.total || 0);
        const allocated = Math.min(remainingBalance, saleTotal);
        const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24)));

        if (ageDays <= 30) current += allocated;
        else if (ageDays <= 60) days31To60 += allocated;
        else if (ageDays <= 90) days61To90 += allocated;
        else over90 += allocated;

        remainingBalance -= allocated;
      }

      if (remainingBalance > 0) {
        over90 += remainingBalance;
      }

      return {
        id: String(cust.id),
        name: cust.name || 'عميل',
        phone: cust.phone || '',
        totalBalance: toMoney(balance),
        current: toMoney(current),
        days31To60: toMoney(days31To60),
        days61To90: toMoney(days61To90),
        over90: toMoney(over90),
      };
    });

    const supplierRows = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name', 'phone', 'balance'])
      .where('tenant_id', '=', tenantId)
      .where('balance', '>', 0)
      .orderBy('balance', 'desc')
      .execute();

    const supplierIds = supplierRows.map((s) => Number(s.id));
    let supplierPurchases: { supplier_id: number; total: number; created_at: Date }[] = [];
    if (supplierIds.length > 0) {
      supplierPurchases = (await this.db
        .selectFrom('purchases')
        .select(['supplier_id', 'total', 'created_at'])
        .where('tenant_id', '=', tenantId)
        .where('supplier_id', 'in', supplierIds)
        .where('payment_type', '=', 'credit')
        .where('status', '=', 'posted')
        .orderBy('created_at', 'desc')
        .execute()) as any[];
    }

    const payables = supplierRows.map((sup) => {
      const balance = Number(sup.balance || 0);
      const purchases = supplierPurchases.filter((p) => Number(p.supplier_id) === Number(sup.id));

      let current = 0;
      let days31To60 = 0;
      let days61To90 = 0;
      let over90 = 0;

      let remainingBalance = balance;
      for (const pur of purchases) {
        if (remainingBalance <= 0) break;
        const purTotal = Number(pur.total || 0);
        const allocated = Math.min(remainingBalance, purTotal);
        const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(pur.created_at).getTime()) / (1000 * 60 * 60 * 24)));

        if (ageDays <= 30) current += allocated;
        else if (ageDays <= 60) days31To60 += allocated;
        else if (ageDays <= 90) days61To90 += allocated;
        else over90 += allocated;

        remainingBalance -= allocated;
      }

      if (remainingBalance > 0) {
        over90 += remainingBalance;
      }

      return {
        id: String(sup.id),
        name: sup.name || 'مورد',
        phone: sup.phone || '',
        totalBalance: toMoney(balance),
        current: toMoney(current),
        days31To60: toMoney(days31To60),
        days61To90: toMoney(days61To90),
        over90: toMoney(over90),
      };
    });

    const totalReceivables = toMoney(receivables.reduce((sum, r) => sum + r.totalBalance, 0));
    const totalPayables = toMoney(payables.reduce((sum, p) => sum + p.totalBalance, 0));

    const receivablesSummary = {
      total: totalReceivables,
      current: toMoney(receivables.reduce((sum, r) => sum + r.current, 0)),
      days31To60: toMoney(receivables.reduce((sum, r) => sum + r.days31To60, 0)),
      days61To90: toMoney(receivables.reduce((sum, r) => sum + r.days61To90, 0)),
      over90: toMoney(receivables.reduce((sum, r) => sum + r.over90, 0)),
    };

    const payablesSummary = {
      total: totalPayables,
      current: toMoney(payables.reduce((sum, p) => sum + p.current, 0)),
      days31To60: toMoney(payables.reduce((sum, p) => sum + p.days31To60, 0)),
      days61To90: toMoney(payables.reduce((sum, p) => sum + p.days61To90, 0)),
      over90: toMoney(payables.reduce((sum, p) => sum + p.over90, 0)),
    };

    return {
      receivablesSummary,
      payablesSummary,
      receivables,
      payables,
    };
  }

  async demandForecastingReport(auth: AuthContext): Promise<Record<string, unknown>> {
    const tenantId = this.tenantId(auth);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const products = await this.db
      .selectFrom('products')
      .select(['id', 'name', 'barcode', 'stock_qty', 'min_stock_qty', 'cost_price', 'retail_price'])
      .where('tenant_id', '=', tenantId)
      .where('is_active', '=', true)
      .execute();

    const recentSales = await this.db
      .selectFrom('sale_items as si')
      .innerJoin('sales as s', 's.id', 'si.sale_id')
      .select([
        'si.product_id',
        sql<number>`SUM(si.qty)`.as('qty_sold_30d'),
        sql<number>`COUNT(DISTINCT s.id)`.as('orders_count_30d'),
      ])
      .where('s.tenant_id', '=', tenantId)
      .where('si.tenant_id', '=', tenantId)
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', thirtyDaysAgo)
      .groupBy('si.product_id')
      .execute();

    const salesMap = new Map<number, { qtySold: number; ordersCount: number }>();
    for (const s of recentSales) {
      salesMap.set(Number(s.product_id), {
        qtySold: Number(s.qty_sold_30d || 0),
        ordersCount: Number(s.orders_count_30d || 0),
      });
    }

    const items = products.map((p) => {
      const stock = Number(p.stock_qty || 0);
      const minStock = Number(p.min_stock_qty || 0);
      const saleInfo = salesMap.get(Number(p.id)) || { qtySold: 0, ordersCount: 0 };
      const dailyBurnRate = Number((saleInfo.qtySold / 30).toFixed(2));

      let runwayDays = 999;
      if (dailyBurnRate > 0) {
        runwayDays = Math.max(0, Math.round(stock / dailyBurnRate));
      } else if (stock <= 0) {
        runwayDays = 0;
      }

      let urgency: 'out_of_stock' | 'critical' | 'warning' | 'healthy' | 'overstocked' = 'healthy';
      if (stock <= 0) {
        urgency = 'out_of_stock';
      } else if (runwayDays <= 7 || stock <= minStock) {
        urgency = 'critical';
      } else if (runwayDays <= 15) {
        urgency = 'warning';
      } else if (runwayDays > 60 && stock > 50) {
        urgency = 'overstocked';
      }

      const targetBuffer = (dailyBurnRate * 30) + minStock;
      const suggestedReorderQty = Math.max(0, Math.ceil(targetBuffer - stock));

      return {
        productId: String(p.id),
        name: p.name || '',
        barcode: p.barcode || '',
        sku: '',
        stock,
        minStock,
        costPrice: Number(p.cost_price || 0),
        soldLast30Days: saleInfo.qtySold,
        dailyBurnRate,
        runwayDays: runwayDays > 365 ? 365 : runwayDays,
        urgency,
        suggestedReorderQty,
      };
    });

    items.sort((a, b) => {
      const order = { out_of_stock: 0, critical: 1, warning: 2, healthy: 3, overstocked: 4 };
      if (order[a.urgency] !== order[b.urgency]) {
        return order[a.urgency] - order[b.urgency];
      }
      return a.runwayDays - b.runwayDays;
    });

    const summary = {
      totalMonitoredProducts: items.length,
      outOfStockCount: items.filter((i) => i.urgency === 'out_of_stock').length,
      criticalCount: items.filter((i) => i.urgency === 'critical').length,
      warningCount: items.filter((i) => i.urgency === 'warning').length,
      healthyCount: items.filter((i) => i.urgency === 'healthy').length,
      overstockedCount: items.filter((i) => i.urgency === 'overstocked').length,
    };

    return {
      summary,
      items,
    };
  }

  async deadStockReport(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const scope = this.scope(auth);
    const days = Math.max(7, Math.min(365, Number(query.days || 60)));
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const { search, searchPattern, page, pageSize, offset } = buildReportListState(query, 20, { includeRange: false });

    let baseQuery: any = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .where('p.is_active', '=', true)
      .where(this.tenantPredicate(auth, 'p'));

    if (query.locationId) {
      baseQuery = baseQuery
        .innerJoin('product_location_stock as pls', 'pls.product_id', 'p.id')
        .where('pls.location_id', '=', query.locationId)
        .where('pls.qty', '>', 0);
    } else {
      baseQuery = baseQuery.where('p.stock_qty', '>', 0);
    }

    baseQuery = baseQuery.where(sql<boolean>`NOT EXISTS (
      SELECT 1 FROM sale_items si
      INNER JOIN sales sa ON sa.id = si.sale_id
      WHERE si.product_id = p.id
        AND sa.status = 'posted'
        AND sa.created_at >= ${cutoffDate}
        AND sa.tenant_id = ${scope.tenantId}
    )`);

    if (search) {
      baseQuery = baseQuery.where((eb: any) => eb.or([
        eb(sql`lower(p.name)`, 'like', searchPattern!),
        eb(sql`lower(coalesce(c.name, ''))`, 'like', searchPattern!),
        eb(sql`lower(coalesce(s.name, ''))`, 'like', searchPattern!),
      ]));
    }

    const countRow = await baseQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((countRow as any)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);

    const stockCol = query.locationId ? sql<number>`coalesce(pls.qty, 0)`.as('stock_qty') : 'p.stock_qty';
    const rows = await baseQuery
      .select([
        'p.id',
        'p.name',
        'p.barcode',
        stockCol,
        'p.cost_price',
        'p.retail_price',
        'c.name as category_name',
        's.name as supplier_name',
        sql<string | null>`(
          SELECT max(sa.created_at) FROM sale_items si
          INNER JOIN sales sa ON sa.id = si.sale_id
          WHERE si.product_id = p.id
            AND sa.status = 'posted'
            AND sa.tenant_id = ${scope.tenantId}
        )`.as('last_sale_date')
      ])
      .orderBy(query.locationId ? 'pls.qty' : 'p.stock_qty', 'desc')
      .orderBy('p.id', 'asc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    const nowMs = Date.now();
    const items = rows.map((r: any) => {
      const stock = Number(r.stock_qty || 0);
      const cost = Number(r.cost_price || 0);
      const tiedCapital = Number((stock * cost).toFixed(2));
      const lastSale = r.last_sale_date ? new Date(r.last_sale_date) : null;
      const daysWithoutSale = lastSale
        ? Math.max(0, Math.floor((nowMs - lastSale.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      return {
        id: Number(r.id),
        name: r.name,
        barcode: r.barcode || '',
        categoryName: r.category_name || 'بدون قسم',
        supplierName: r.supplier_name || 'بدون مورد',
        stock,
        costPrice: cost,
        retailPrice: Number(r.retail_price || 0),
        tiedCapital,
        lastSaleDate: lastSale ? lastSale.toISOString() : null,
        daysWithoutSale,
      };
    });

    const summaryAgg = await baseQuery
      .select([
        sql<number>`coalesce(sum(${query.locationId ? sql`pls.qty` : sql`p.stock_qty`}), 0)`.as('total_qty'),
        sql<number>`coalesce(sum((${query.locationId ? sql`pls.qty` : sql`p.stock_qty`}) * coalesce(p.cost_price, 0)), 0)`.as('total_tied_capital'),
        sql<number>`coalesce(sum((${query.locationId ? sql`pls.qty` : sql`p.stock_qty`}) * coalesce(p.retail_price, 0)), 0)`.as('total_retail_value'),
      ])
      .executeTakeFirst();

    return this.withScope({
      items,
      pagination,
      summary: {
        totalDeadItems: totalItems,
        totalDeadStockQty: Number(Number((summaryAgg as any)?.total_qty || 0).toFixed(2)),
        totalTiedCapital: Number(Number((summaryAgg as any)?.total_tied_capital || 0).toFixed(2)),
        totalRetailValue: Number(Number((summaryAgg as any)?.total_retail_value || 0).toFixed(2)),
        daysThreshold: days,
      }
    }, auth);
  }

  async customerRfmReport(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const { search, searchPattern } = buildReportListState(query, 50, { includeRange: false });

    const twoYearsAgo = new Date();
    twoYearsAgo.setUTCFullYear(twoYearsAgo.getUTCFullYear() - 2);

    let baseQuery = (this.db as any)
      .selectFrom('sales as s')
      .innerJoin('customers as c', 'c.id', 's.customer_id')
      .select([
        'c.id as customerId',
        'c.name as customerName',
        'c.phone as customerPhone',
        'c.balance as currentBalance',
        'c.loyalty_points as loyaltyPoints',
        sql<number>`count(s.id)`.as('frequency'),
        sql<number>`coalesce(sum(s.total), 0)`.as('monetary'),
        sql<string>`max(s.created_at)`.as('lastSaleDate'),
      ])
      .where('s.status', '=', 'posted')
      .where('s.created_at', '>=', twoYearsAgo)
      .where(this.tenantPredicate(auth, 's'))
      .where(this.tenantPredicate(auth, 'c'))
      .groupBy(['c.id', 'c.name', 'c.phone', 'c.balance', 'c.loyalty_points']);

    if (search && searchPattern) {
      baseQuery = baseQuery.where((eb: any) => eb.or([
        eb(sql`lower(c.name)`, 'like', searchPattern),
        eb(sql`lower(coalesce(c.phone, ''))`, 'like', searchPattern),
      ]));
    }

    const rows = await baseQuery.limit(500).execute();
    return this.withScope(buildCustomerRfmPayload(rows as any, (query as any).segment), auth);
  }

  private async partnerBalances(type: 'customer' | 'supplier', query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const isCust = type === 'customer';
    const table = isCust ? 'customers' : 'suppliers';
    const ledgerTable = isCust ? 'customer_ledger' : 'supplier_ledger';
    const partnerIdCol = isCust ? 'customer_id' : 'supplier_id';

    const partners = await (this.db as any)
      .selectFrom(table)
      .select(isCust ? ['id', 'name', 'phone', 'balance', 'credit_limit'] : ['id', 'name', 'phone', 'balance'])
      .where('is_active', '=', true)
      .where(this.tenantPredicate(auth))
      .orderBy('name', 'asc')
      .execute();

    const ledgerRows = await (this.db as any)
      .selectFrom(ledgerTable)
      .select([partnerIdCol, sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .where(this.tenantPredicate(auth))
      .groupBy(partnerIdCol)
      .execute();

    const totals = isCust
      ? buildCustomerLedgerTotals(ledgerRows as Array<{ customer_id?: number | string | null; balance_total?: number | string | null }>)
      : buildSupplierLedgerTotals(ledgerRows as Array<{ supplier_id?: number | string | null; balance_total?: number | string | null }>);

    const payload = isCust
      ? buildCustomerBalancesPayload(partners, totals, query as Record<string, unknown>)
      : buildSupplierBalancesPayload(partners, totals, query as Record<string, unknown>);

    return this.withScope(payload, auth);
  }

  private async partnerLedger(type: 'customer' | 'supplier', partnerId: number, query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    const isCust = type === 'customer';
    const table = isCust ? 'customers' : 'suppliers';
    const ledgerTable = isCust ? 'customer_ledger' : 'supplier_ledger';
    const partnerIdCol = isCust ? 'customer_id' : 'supplier_id';

    const partner = await (this.db as any)
      .selectFrom(table)
      .select(isCust ? ['id', 'name', 'phone', 'balance', 'credit_limit'] : ['id', 'name', 'phone', 'balance'])
      .where('id', '=', partnerId)
      .where('is_active', '=', true)
      .where(this.tenantPredicate(auth))
      .executeTakeFirst();
    if (!partner) throw new AppError(isCust ? 'Customer not found' : 'Supplier not found', isCust ? 'CUSTOMER_NOT_FOUND' : 'SUPPLIER_NOT_FOUND', 404);

    const { fromDate, toDate, searchPattern, filter, page, pageSize, offset } = buildReportListState(query, 25);

    let countQuery = (this.db as any)
      .selectFrom(ledgerTable)
      .where(partnerIdCol, '=', partnerId)
      .where('created_at', '>=', fromDate!)
      .where('created_at', '<=', toDate!)
      .where(this.tenantPredicate(auth));

    let entriesQuery = (this.db as any)
      .selectFrom(ledgerTable)
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where(partnerIdCol, '=', partnerId)
      .where('created_at', '>=', fromDate!)
      .where('created_at', '<=', toDate!)
      .where(this.tenantPredicate(auth));

    countQuery = applySignedAmountFilter(applyPartnerLedgerSearch(countQuery, searchPattern), 'amount', filter);
    entriesQuery = applySignedAmountFilter(applyPartnerLedgerSearch(entriesQuery, searchPattern), 'amount', filter);

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const rows = await entriesQuery.orderBy('created_at', 'asc').orderBy('id', 'asc').limit(pageSize).offset(offset).execute();

    const [totalsRow, openingRow] = await Promise.all([
      entriesQuery
        .clearSelect()
        .select([
          sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
          sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
        ])
        .executeTakeFirst(),
      fromDate
        ? (this.db as any)
            .selectFrom(ledgerTable)
            .select(sql<number>`coalesce(sum(amount), 0)`.as('opening_balance'))
            .where(partnerIdCol, '=', partnerId)
            .where('created_at', '<', fromDate)
            .where(this.tenantPredicate(auth))
            .executeTakeFirst()
        : Promise.resolve(null),
    ]);

    const openingBalance = Number(openingRow?.opening_balance || 0);

    const payload = isCust
      ? buildCustomerLedgerPayload({ customer: partner, rows: rows as PartnerLedgerEntryRow[], page, pageSize, totalItems, totalsRow: totalsRow as LedgerSummaryRow | undefined, openingBalance })
      : buildSupplierLedgerPayload({ supplier: partner, rows: rows as PartnerLedgerEntryRow[], page, pageSize, totalItems, totalsRow: totalsRow as LedgerSummaryRow | undefined, openingBalance });

    return this.withScope(payload, auth);
  }

  async customerBalances(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.partnerBalances('customer', query, auth);
  }

  async customerLedger(customerId: number, query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.partnerLedger('customer', customerId, query, auth);
  }

  async supplierBalances(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.partnerBalances('supplier', query, auth);
  }

  async supplierLedger(supplierId: number, query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.partnerLedger('supplier', supplierId, query, auth);
  }
}
