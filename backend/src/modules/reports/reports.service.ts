import { Inject, Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { AuthContext } from '../../core/auth/interfaces/auth-context.interface';
import { AppError } from '../../common/errors/app-error';
import { KYSELY_DB } from '../../database/database.constants';
import { Database } from '../../database/database.types';
import { ReportRangeQueryDto } from './dto/report-query.dto';
import { buildPagination, filterScope, getBusinessTimezone, parseRange } from './helpers/reports-range.helper';
import { buildReportSummaryPayload } from './helpers/reports-summary.helper';
import { buildDashboardComputedState, buildDashboardOverviewPayload, buildDashboardScope } from './helpers/reports-dashboard.helper';
import { buildCustomerBalancesPayload, buildCustomerLedgerPayload, buildSupplierBalancesPayload, buildSupplierLedgerPayload, LedgerSummaryRow, PartnerLedgerEntryRow } from './helpers/reports-ledger.helper';
import { buildCustomerLedgerTotals, buildSupplierLedgerTotals } from './helpers/reports-partner-ledger.helper';
import { buildAuditPayload, buildTreasuryPayload, TreasurySummaryRow, TreasuryTransactionRow, AuditLogRow } from './helpers/reports-ops.helper';
import { buildInventoryLocationHighlights, buildInventoryReportItems, buildInventorySummary, InventoryLocationBreakdownRow, InventoryLocationHighlightRow, InventoryReportProductRow } from './helpers/reports-inventory.helper';
import { buildReportListState } from './helpers/reports-query.helper';
import { applyAuditSearch, applyPartnerLedgerSearch, applySignedAmountFilter, applyTreasurySearch } from './helpers/reports-query-pipeline.helper';
import { ReportsAdminService } from './services/reports-admin.service';

@Injectable()
export class ReportsService {
  private readonly reportsAdminService: ReportsAdminService;

  constructor(
    @Inject(KYSELY_DB) private readonly db: Kysely<Database>,
    reportsAdminService?: ReportsAdminService,
  ) {
    this.reportsAdminService = reportsAdminService ?? new ReportsAdminService(this.db as never);
  }

  async reportSummary(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const fromDate = new Date(range.from);
    const toDate = new Date(range.to);

    const [
      rawSalesRows,
      rawPurchasesRows,
      rawExpensesRows,
      rawReturnsRows,
      rawTreasuryRows,
      rawSaleItemsRows,
    ] = await Promise.all([
      this.db
        .selectFrom('sales')
        .select(['id', 'total', 'discount', 'branch_id', 'location_id', 'created_at'])
        .where('status', '=', 'posted')
        .where('created_at', '>=', fromDate!)
        .where('created_at', '<=', toDate!)
        .execute(),
      this.db
        .selectFrom('purchases')
        .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
        .where('status', '=', 'posted')
        .where('created_at', '>=', fromDate!)
        .where('created_at', '<=', toDate!)
        .execute(),
      this.db
        .selectFrom('expenses')
        .select(['id', 'amount', 'branch_id', 'location_id', 'expense_date'])
        .where('expense_date', '>=', fromDate)
        .where('expense_date', '<=', toDate)
        .execute(),
      this.db
        .selectFrom('return_documents')
        .select(['id', 'return_type', 'total', 'branch_id', 'location_id', 'created_at'])
        .where('created_at', '>=', fromDate!)
        .where('created_at', '<=', toDate!)
        .execute(),
      this.db
        .selectFrom('treasury_transactions')
        .select(['amount', 'branch_id', 'location_id', 'created_at'])
        .where('created_at', '>=', fromDate!)
        .where('created_at', '<=', toDate!)
        .execute(),
      this.db
        .selectFrom('sale_items as si')
        .innerJoin('sales as s', 's.id', 'si.sale_id')
        .select([
          'si.product_id',
          'si.product_name',
          'si.qty',
          'si.line_total',
          'si.cost_price',
          's.branch_id',
          's.location_id',
          's.created_at',
        ])
        .where('s.status', '=', 'posted')
        .where('s.created_at', '>=', fromDate)
        .where('s.created_at', '<=', toDate)
        .execute(),
    ]);

    const salesRows = filterScope(rawSalesRows, query);
    const purchasesRows = filterScope(rawPurchasesRows, query);
    const expensesRows = filterScope(rawExpensesRows, query);
    const returnsRows = filterScope(rawReturnsRows, query);
    const treasuryRows = filterScope(rawTreasuryRows, query);
    const saleItemsRows = filterScope(rawSaleItemsRows, query);

    return {
      range,
      ...buildReportSummaryPayload({
        salesRows,
        purchasesRows,
        expensesRows,
        returnsRows,
        treasuryRows,
        saleItemsRows,
        topProductsLimit: 10,
      }),
    };
  }

  async dashboardOverview(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const range = parseRange(query);
    const businessTimezone = getBusinessTimezone();
    const scope = buildDashboardScope(new Date(), businessTimezone);
    const today = scope.today;
    const todayStart = today.start;
    const todayEnd = today.end;
    const trendStart = scope.trendStart;
    const todayIso = scope.activeOfferDate;

    const [
      summary,
      productsRows,
      customersRows,
      suppliersRows,
      rawRecentSalesRows,
      rawRecentPurchasesRows,
      customerLedgerRows,
      supplierLedgerRows,
      activeOffersRows,
      rawTopTodayRows,
    ] = await Promise.all([
      this.reportSummary(query),
      this.db
        .selectFrom('products')
        .select(['id', 'name', 'category_id', 'supplier_id', 'retail_price', 'stock_qty', 'min_stock_qty', 'cost_price'])
        .where('is_active', '=', true)
        .execute(),
      this.db
        .selectFrom('customers')
        .select(['id', 'name', 'balance', 'credit_limit'])
        .where('is_active', '=', true)
        .execute(),
      this.db
        .selectFrom('suppliers')
        .select(['id', 'name', 'balance'])
        .where('is_active', '=', true)
        .execute(),
      this.db
        .selectFrom('sales')
        .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
        .where('status', '=', 'posted')
        .where('created_at', '>=', trendStart)
        .where('created_at', '<=', todayEnd)
        .execute(),
      this.db
        .selectFrom('purchases')
        .select(['id', 'total', 'branch_id', 'location_id', 'created_at'])
        .where('status', '=', 'posted')
        .where('created_at', '>=', trendStart)
        .where('created_at', '<=', todayEnd)
        .execute(),
      this.db
        .selectFrom('customer_ledger')
        .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
        .groupBy('customer_id')
        .execute(),
      this.db
        .selectFrom('supplier_ledger')
        .select(['supplier_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
        .groupBy('supplier_id')
        .execute(),
      this.db
        .selectFrom('product_offers')
        .select(['id'])
        .where('is_active', '=', true)
        .where(sql<boolean>`(start_date is null or start_date <= ${todayIso}) and (end_date is null or end_date >= ${todayIso})`)
        .execute(),
      this.db
        .selectFrom('sale_items as si')
        .innerJoin('sales as s', 's.id', 'si.sale_id')
        .select([
          'si.product_id',
          'si.product_name',
          's.branch_id',
          's.location_id',
          sql<number>`coalesce(sum(si.qty), 0)`.as('qty_total'),
          sql<number>`coalesce(sum(si.line_total), 0)`.as('sales_total'),
        ])
        .where('s.status', '=', 'posted')
        .where('s.created_at', '>=', todayStart)
        .where('s.created_at', '<=', todayEnd)
        .groupBy(['si.product_id', 'si.product_name', 's.branch_id', 's.location_id'])
        .orderBy('sales_total', 'desc')
        .limit(5)
        .execute(),
    ]);

    const recentSalesRows = filterScope(rawRecentSalesRows, query);
    const recentPurchasesRows = filterScope(rawRecentPurchasesRows, query);
    const topTodayRows = filterScope(rawTopTodayRows, query);
    const activeOffers = activeOffersRows.length;

    const dashboardState = buildDashboardComputedState({
      productsRows,
      customersRows,
      suppliersRows,
      recentSalesRows,
      recentPurchasesRows,
      topTodayRows,
      customerLedgerRows: customerLedgerRows as Array<{ customer_id?: number | string | null; balance_total?: number | string | null }>,
      supplierLedgerRows: supplierLedgerRows as Array<{ supplier_id?: number | string | null; balance_total?: number | string | null }>,
      businessTimezone,
      todayKey: today.key,
    });

    return buildDashboardOverviewPayload({
      range,
      summary: summary as Record<string, unknown>,
      productsCount: productsRows.length,
      customersCount: customersRows.length,
      suppliersCount: suppliersRows.length,
      inventorySnapshot: dashboardState.inventorySnapshot,
      partnerExposure: dashboardState.partnerExposure,
      todayOperations: dashboardState.todayOperations,
      trends: dashboardState.trends,
      activeOffers,
    });
  }

  async inventoryReport(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const { search, searchPattern, filter, page, pageSize, offset } = buildReportListState(query, 20, { includeRange: false });

    let countQuery = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .where('p.is_active', '=', true);

    let rowsQuery = this.db
      .selectFrom('products as p')
      .leftJoin('product_categories as c', 'c.id', 'p.category_id')
      .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
      .select(['p.id', 'p.name', 'p.stock_qty', 'p.min_stock_qty', 'p.retail_price', 'p.cost_price', 'c.name as category_name', 's.name as supplier_name'])
      .where('p.is_active', '=', true);

    if (search) {
      countQuery = countQuery.where((eb) => eb.or([
        eb(sql`lower(p.name)`, 'like', searchPattern!),
        eb(sql`lower(coalesce(c.name, ''))`, 'like', searchPattern!),
        eb(sql`lower(coalesce(s.name, ''))`, 'like', searchPattern!),
      ]));
      rowsQuery = rowsQuery.where((eb) => eb.or([
        eb(sql`lower(p.name)`, 'like', searchPattern!),
        eb(sql`lower(coalesce(c.name, ''))`, 'like', searchPattern!),
        eb(sql`lower(coalesce(s.name, ''))`, 'like', searchPattern!),
      ]));
    }

    if (filter === 'attention') {
      countQuery = countQuery.whereRef('p.stock_qty', '<=', 'p.min_stock_qty');
      rowsQuery = rowsQuery.whereRef('p.stock_qty', '<=', 'p.min_stock_qty');
    }
    if (filter === 'out') {
      countQuery = countQuery.where('p.stock_qty', '<=', 0);
      rowsQuery = rowsQuery.where('p.stock_qty', '<=', 0);
    }
    if (filter === 'low') {
      countQuery = countQuery.where('p.stock_qty', '>', 0).whereRef('p.stock_qty', '<=', 'p.min_stock_qty');
      rowsQuery = rowsQuery.where('p.stock_qty', '>', 0).whereRef('p.stock_qty', '<=', 'p.min_stock_qty');
    }

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const pagination = buildPagination(page, pageSize, totalItems);
    const rows = await rowsQuery
      .orderBy('p.stock_qty asc')
      .orderBy('p.id asc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    const productIds = rows.map((row) => Number(row.id || 0)).filter((value) => value > 0);

    const locationBreakdownRows = productIds.length
      ? await this.db
          .selectFrom('product_location_stock as pls')
          .leftJoin('stock_locations as l', 'l.id', 'pls.location_id')
          .leftJoin('branches', 'branches.id', 'pls.branch_id')
          .select([
            'pls.product_id',
            'pls.location_id',
            'pls.branch_id',
            'pls.qty',
            'l.name as location_name',
            'branches.name as branch_name',
          ])
          .where('pls.product_id', 'in', productIds)
          .orderBy('pls.product_id asc')
          .orderBy('pls.qty desc')
          .execute()
      : [];

    const locationHighlightsRows = await this.db
      .selectFrom('product_location_stock as pls')
      .innerJoin('products as p', 'p.id', 'pls.product_id')
      .leftJoin('stock_locations as l', 'l.id', 'pls.location_id')
      .leftJoin('branches', 'branches.id', 'pls.branch_id')
      .select([
        'pls.product_id',
        'pls.location_id',
        'pls.branch_id',
        'pls.qty',
        'p.min_stock_qty',
        'l.name as location_name',
        'branches.name as branch_name',
      ])
      .where('p.is_active', '=', true)
      .where('pls.location_id', 'is not', null)
      .execute();

    const items = buildInventoryReportItems(
      rows as InventoryReportProductRow[],
      locationBreakdownRows as InventoryLocationBreakdownRow[],
    );

    const outOfStockRow = await this.db
      .selectFrom('products as p')
      .select(sql<number>`count(*)`.as('count'))
      .where('p.is_active', '=', true)
      .where('p.stock_qty', '<=', 0)
      .executeTakeFirst();

    const lowStockRow = await this.db
      .selectFrom('products as p')
      .select(sql<number>`count(*)`.as('count'))
      .where('p.is_active', '=', true)
      .where('p.stock_qty', '>', 0)
      .whereRef('p.stock_qty', '<=', 'p.min_stock_qty')
      .executeTakeFirst();

    const totalActiveRow = await this.db
      .selectFrom('products as p')
      .select(sql<number>`count(*)`.as('count'))
      .where('p.is_active', '=', true)
      .executeTakeFirst();

    const { trackedLocations, highlights: locationHighlights } = buildInventoryLocationHighlights(
      locationHighlightsRows as InventoryLocationHighlightRow[],
    );

    const outOfStock = Number((outOfStockRow as { count?: number | string | null } | undefined)?.count || 0);
    const lowStock = Number((lowStockRow as { count?: number | string | null } | undefined)?.count || 0);
    const totalActive = Number((totalActiveRow as { count?: number | string | null } | undefined)?.count || 0);

    return {
      items,
      pagination,
      summary: buildInventorySummary(totalItems, outOfStock, lowStock, totalActive, trackedLocations),
      locationHighlights,
    };
  }

  async customerBalances(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const customers = await this.db
      .selectFrom('customers')
      .select(['id', 'name', 'phone', 'balance', 'credit_limit'])
      .where('is_active', '=', true)
      .orderBy('name asc')
      .execute();

    const ledgerRows = await this.db
      .selectFrom('customer_ledger')
      .select(['customer_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('customer_id')
      .execute();

    const ledgerTotals = buildCustomerLedgerTotals(ledgerRows as Array<{ customer_id?: number | string | null; balance_total?: number | string | null }>);
    return buildCustomerBalancesPayload(customers, ledgerTotals, query as Record<string, unknown>);
  }


  async customerLedger(customerId: number, query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const customer = await this.db.selectFrom('customers').select(['id', 'name', 'phone', 'balance', 'credit_limit']).where('id', '=', customerId).where('is_active', '=', true).executeTakeFirst();
    if (!customer) throw new AppError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);

    const { fromDate, toDate, search, searchPattern, filter, page, pageSize, offset } = buildReportListState(query, 25);

    let countQuery = this.db
      .selectFrom('customer_ledger')
      .where('customer_id', '=', customerId)
      .where('created_at', '>=', fromDate!)
      .where('created_at', '<=', toDate!);

    let entriesQuery = this.db
      .selectFrom('customer_ledger')
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where('customer_id', '=', customerId)
      .where('created_at', '>=', fromDate!)
      .where('created_at', '<=', toDate!);

    countQuery = applySignedAmountFilter(applyPartnerLedgerSearch(countQuery, searchPattern), 'amount', filter);
    entriesQuery = applySignedAmountFilter(applyPartnerLedgerSearch(entriesQuery, searchPattern), 'amount', filter);

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const rows = await entriesQuery
      .orderBy('created_at asc')
      .orderBy('id asc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    const totalsRow = await entriesQuery
      .clearSelect()
      .select([
        sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
        sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
      ])
      .executeTakeFirst();

    return buildCustomerLedgerPayload({
      customer,
      rows: rows as PartnerLedgerEntryRow[],
      page,
      pageSize,
      totalItems,
      totalsRow: totalsRow as LedgerSummaryRow | undefined,
    });
  }

  async supplierBalances(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const suppliers = await this.db
      .selectFrom('suppliers')
      .select(['id', 'name', 'phone', 'balance'])
      .where('is_active', '=', true)
      .orderBy('name asc')
      .execute();

    const ledgerRows = await this.db
      .selectFrom('supplier_ledger')
      .select(['supplier_id', sql<number>`coalesce(sum(amount), 0)`.as('balance_total')])
      .groupBy('supplier_id')
      .execute();

    const ledgerTotals = buildSupplierLedgerTotals(ledgerRows as Array<{ supplier_id?: number | string | null; balance_total?: number | string | null }>);
    return buildSupplierBalancesPayload(suppliers, ledgerTotals, query as Record<string, unknown>);
  }

  async supplierLedger(supplierId: number, query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    const supplier = await this.db.selectFrom('suppliers').select(['id', 'name', 'phone', 'balance']).where('id', '=', supplierId).where('is_active', '=', true).executeTakeFirst();
    if (!supplier) throw new AppError('Supplier not found', 'SUPPLIER_NOT_FOUND', 404);

    const { fromDate, toDate, search, searchPattern, filter, page, pageSize, offset } = buildReportListState(query, 25);

    let countQuery = this.db
      .selectFrom('supplier_ledger')
      .where('supplier_id', '=', supplierId)
      .where('created_at', '>=', fromDate!)
      .where('created_at', '<=', toDate!);

    let entriesQuery = this.db
      .selectFrom('supplier_ledger')
      .select(['id', 'entry_type', 'amount', 'balance_after', 'note', 'reference_type', 'reference_id', 'created_at'])
      .where('supplier_id', '=', supplierId)
      .where('created_at', '>=', fromDate!)
      .where('created_at', '<=', toDate!);

    countQuery = applySignedAmountFilter(applyPartnerLedgerSearch(countQuery, searchPattern), 'amount', filter);
    entriesQuery = applySignedAmountFilter(applyPartnerLedgerSearch(entriesQuery, searchPattern), 'amount', filter);

    const totalRow = await countQuery.select(sql<number>`count(*)`.as('count')).executeTakeFirst();
    const totalItems = Number((totalRow as { count?: number | string | null } | undefined)?.count || 0);
    const rows = await entriesQuery
      .orderBy('created_at asc')
      .orderBy('id asc')
      .limit(pageSize)
      .offset(offset)
      .execute();

    const totalsRow = await entriesQuery
      .clearSelect()
      .select([
        sql<number>`coalesce(sum(case when amount > 0 then amount else 0 end), 0)`.as('debits_total'),
        sql<number>`coalesce(sum(case when amount < 0 then amount else 0 end), 0)`.as('credits_total'),
      ])
      .executeTakeFirst();

    return buildSupplierLedgerPayload({
      supplier,
      rows: rows as PartnerLedgerEntryRow[],
      page,
      pageSize,
      totalItems,
      totalsRow: totalsRow as LedgerSummaryRow | undefined,
    });
  }

  async treasuryTransactions(query: ReportRangeQueryDto): Promise<Record<string, unknown>> {
    return this.reportsAdminService.treasuryTransactions(query);
  }

  async auditLogs(query: ReportRangeQueryDto, auth: AuthContext): Promise<Record<string, unknown>> {
    return this.reportsAdminService.auditLogs(query, auth);
  }
}
