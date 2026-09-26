import { TrendPoint, buildLastNDays, dateKey, getBusinessDayBounds } from './reports-range.helper';
import { buildTrendMap, sumMoney, toMoney } from './reports-math.helper';

type ProductRow = {
  id: number | string;
  name?: string | null;
  retail_price?: number | string | null;
  stock_qty?: number | string | null;
  min_stock_qty?: number | string | null;
  cost_price?: number | string | null;
};

type PartnerBalanceRow = {
  id: number | string;
  name?: string | null;
  balance: number | string | null;
};

type TodaySaleItemRow = {
  product_id?: number | string | null;
  product_name?: string | null;
  qty?: number | string | null;
  line_total?: number | string | null;
};

type TodayTopRow = {
  product_id?: number | string | null;
  product_name?: string | null;
  qty_total?: number | string | null;
  sales_total?: number | string | null;
};

type TimedMoneyRow = {
  created_at: Date | string;
  total?: number | string | null;
};

export type DashboardScope = {
  businessTimezone: string;
  trendStart: Date;
  activeOfferDate: string;
  today: {
    key: string;
    start: Date;
    end: Date;
  };
};

export function buildDashboardScope(now: Date, businessTimezone: string): DashboardScope {
  const today = getBusinessDayBounds(now, businessTimezone);
  const trendStart = new Date(today.start);
  trendStart.setUTCDate(trendStart.getUTCDate() - 29);

  return {
    businessTimezone,
    trendStart,
    activeOfferDate: today.key,
    today,
  };
}

export function buildDashboardComputedState(args: {
  recentSalesRows: TimedMoneyRow[];
  recentPurchasesRows: TimedMoneyRow[];
  topTodayRows: TodayTopRow[];
  businessTimezone: string;
  todayKey: string;
}) {
  const todaySalesRows = args.recentSalesRows.filter((row) => dateKey(row.created_at, args.businessTimezone) === args.todayKey);
  const todayPurchasesRows = args.recentPurchasesRows.filter((row) => dateKey(row.created_at, args.businessTimezone) === args.todayKey);
  const todayOperations = buildTodayOperationsSnapshot(todaySalesRows, todayPurchasesRows, args.topTodayRows);
  const trends = buildSevenDayTrends(args.recentSalesRows, args.recentPurchasesRows, args.businessTimezone);

  return {
    todayOperations,
    trends,
  };
}

// PO-2 (PERFORMANCE_CONSTITUTION.md §5): this used to filter/reduce over every active product for
// the tenant in JS. `lowStockCount`, `outOfStockCount`, `inventoryCost` and `inventorySaleValue` are
// now computed in SQL (COUNT/SUM with FILTER) — this function only shapes the already-aggregated
// numbers and the already-limited (top 8) low-stock rows into the response, so it stays O(8) no
// matter how large the catalog is.
export function buildInventorySnapshot(args: {
  lowStockRows: ProductRow[];
  lowStockCount: number;
  outOfStockCount: number;
  inventoryCost: number;
  inventorySaleValue: number;
}) {
  const lowStock = args.lowStockRows.map((row) => ({
    id: String(row.id),
    name: row.name || '',
    retailPrice: Number(row.retail_price || 0),
    stockQty: Number(row.stock_qty || 0),
    minStockQty: Number(row.min_stock_qty || 0),
    costPrice: Number(row.cost_price || 0),
    status: Number(row.stock_qty || 0) <= 0 ? 'out' : 'low',
  }));

  return {
    lowStock,
    lowStockCount: args.lowStockCount,
    outOfStockCount: args.outOfStockCount,
    inventoryCost: toMoney(args.inventoryCost),
    inventorySaleValue: toMoney(args.inventorySaleValue),
  };
}

// PO-2: same shape change as buildInventorySnapshot — `customerDebt`/`supplierDebt`/`nearCreditLimit`/
// `aboveCreditLimit`/`highSupplierBalances` are now SQL aggregates (SUM/COUNT FILTER over the ledger
// tables, joined against active customers/suppliers only where the original JS did the same active
// filter), and `topCustomerRows`/`topSupplierRows` are already the top-5-by-balance SQL result — this
// function only shapes them, it does not scan every partner.
export function buildPartnerExposureSnapshot(args: {
  customerDebt: number;
  supplierDebt: number;
  nearCreditLimit: number;
  aboveCreditLimit: number;
  highSupplierBalances: number;
  topCustomerRows: PartnerBalanceRow[];
  topSupplierRows: PartnerBalanceRow[];
}) {
  const topCustomers = args.topCustomerRows.map((row) => ({
    key: String(row.id),
    name: row.name || '',
    total: Number(row.balance || 0),
    count: 1,
  }));

  const topSuppliers = args.topSupplierRows.map((row) => ({
    key: String(row.id),
    name: row.name || '',
    total: Number(row.balance || 0),
    count: 1,
  }));

  return {
    customerDebt: toMoney(args.customerDebt),
    supplierDebt: toMoney(args.supplierDebt),
    nearCreditLimit: args.nearCreditLimit,
    aboveCreditLimit: args.aboveCreditLimit,
    highSupplierBalances: args.highSupplierBalances,
    topCustomers,
    topSuppliers,
  };
}

export function buildTodayOperationsSnapshot(
  todaySalesRows: Array<{ total?: number | string | null }>,
  todayPurchasesRows: Array<{ total?: number | string | null }>,
  topTodayRows: TodayTopRow[],
) {
  return {
    todaySalesCount: todaySalesRows.length,
    todaySalesAmount: sumMoney(todaySalesRows, (row) => row.total),
    todayPurchasesCount: todayPurchasesRows.length,
    todayPurchasesAmount: sumMoney(todayPurchasesRows, (row) => row.total),
    topToday: topTodayRows
      .map((row) => ({
        productId: String(row.product_id || ''),
        name: String(row.product_name || ''),
        qty: Number(row.qty_total || 0),
        total: Number(row.sales_total || 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  };
}

export function buildSevenDayTrends(
  recentSalesRows: TimedMoneyRow[],
  recentPurchasesRows: TimedMoneyRow[],
  businessTimezone: string,
): { sales: TrendPoint[]; purchases: TrendPoint[] } {
  const dayKeys = buildLastNDays(30, businessTimezone, new Date());
  const sales: TrendPoint[] = buildTrendMap(recentSalesRows, dayKeys, (row) => dateKey(row.created_at, businessTimezone), (row) => row.total);
  const purchases: TrendPoint[] = buildTrendMap(recentPurchasesRows, dayKeys, (row) => dateKey(row.created_at, businessTimezone), (row) => row.total);
  return { sales, purchases };
}


type DashboardSummaryInput = {
  summary: Record<string, unknown>;
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  inventorySnapshot: {
    lowStockCount: number;
    outOfStockCount: number;
  };
  activeOffers: number;
};

type DashboardStatsInput = {
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  todayOperations: {
    todaySalesCount: number;
    todaySalesAmount: number;
    todayPurchasesCount: number;
    todayPurchasesAmount: number;
  };
  inventorySnapshot: {
    inventoryCost: number;
    inventorySaleValue: number;
  };
  partnerExposure: {
    customerDebt: number;
    supplierDebt: number;
    nearCreditLimit: number;
    aboveCreditLimit: number;
    highSupplierBalances: number;
  };
  activeOffers: number;
};

type DashboardOverviewPayloadInput = {
  range: { from: string; to: string };
  summary: Record<string, unknown>;
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  inventorySnapshot: ReturnType<typeof buildInventorySnapshot>;
  partnerExposure: ReturnType<typeof buildPartnerExposureSnapshot>;
  todayOperations: ReturnType<typeof buildTodayOperationsSnapshot>;
  trends: { sales: TrendPoint[]; purchases: TrendPoint[] };
  activeOffers: number;
};

export function buildDashboardSummary({
  summary,
  productsCount,
  customersCount,
  suppliersCount,
  inventorySnapshot,
  activeOffers,
}: DashboardSummaryInput) {
  return {
    ...summary,
    totalProducts: productsCount,
    totalCustomers: customersCount,
    totalSuppliers: suppliersCount,
    lowStockCount: inventorySnapshot.lowStockCount,
    outOfStockCount: inventorySnapshot.outOfStockCount,
    activeOffers,
  };
}

export function buildDashboardStats({
  productsCount,
  customersCount,
  suppliersCount,
  todayOperations,
  inventorySnapshot,
  partnerExposure,
  activeOffers,
}: DashboardStatsInput) {
  return {
    productsCount,
    customersCount,
    suppliersCount,
    todaySalesCount: todayOperations.todaySalesCount,
    todaySalesAmount: todayOperations.todaySalesAmount,
    todayPurchasesCount: todayOperations.todayPurchasesCount,
    todayPurchasesAmount: todayOperations.todayPurchasesAmount,
    inventoryCost: inventorySnapshot.inventoryCost,
    inventorySaleValue: inventorySnapshot.inventorySaleValue,
    customerDebt: partnerExposure.customerDebt,
    supplierDebt: partnerExposure.supplierDebt,
    nearCreditLimit: partnerExposure.nearCreditLimit,
    aboveCreditLimit: partnerExposure.aboveCreditLimit,
    highSupplierBalances: partnerExposure.highSupplierBalances,
    activeOffers,
  };
}

export function buildDashboardOverviewPayload({
  range,
  summary,
  productsCount,
  customersCount,
  suppliersCount,
  inventorySnapshot,
  partnerExposure,
  todayOperations,
  trends,
  activeOffers,
}: DashboardOverviewPayloadInput): Record<string, unknown> {
  return {
    range,
    summary: buildDashboardSummary({
      summary,
      productsCount,
      customersCount,
      suppliersCount,
      inventorySnapshot,
      activeOffers,
    }),
    stats: buildDashboardStats({
      productsCount,
      customersCount,
      suppliersCount,
      todayOperations,
      inventorySnapshot,
      partnerExposure,
      activeOffers,
    }),
    lowStock: inventorySnapshot.lowStock,
    topToday: todayOperations.topToday,
    topCustomers: partnerExposure.topCustomers,
    topSuppliers: partnerExposure.topSuppliers,
    trends,
  };
}
