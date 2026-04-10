import { TrendPoint, buildLastNDays, dateKey, getBusinessDayBounds } from './reports-range.helper';
import { buildTrendMap, sumMoney, toMoney } from './reports-math.helper';
import { buildCustomerLedgerTotals, buildSupplierLedgerTotals } from './reports-partner-ledger.helper';

type ProductRow = {
  id: number | string;
  name?: string | null;
  retail_price?: number | string | null;
  stock_qty?: number | string | null;
  min_stock_qty?: number | string | null;
  cost_price?: number | string | null;
};

type CustomerRow = {
  id: number | string;
  name?: string | null;
  credit_limit?: number | string | null;
};

type SupplierRow = {
  id: number | string;
  name?: string | null;
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


export type DashboardLedgerRow = {
  customer_id?: number | string | null;
  supplier_id?: number | string | null;
  balance_total?: number | string | null;
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
  trendStart.setUTCDate(trendStart.getUTCDate() - 6);

  return {
    businessTimezone,
    trendStart,
    activeOfferDate: today.key,
    today,
  };
}

export function buildDashboardComputedState(args: {
  productsRows: ProductRow[];
  customersRows: CustomerRow[];
  suppliersRows: SupplierRow[];
  recentSalesRows: TimedMoneyRow[];
  recentPurchasesRows: TimedMoneyRow[];
  topTodayRows: TodayTopRow[];
  customerLedgerRows: DashboardLedgerRow[];
  supplierLedgerRows: DashboardLedgerRow[];
  businessTimezone: string;
  todayKey: string;
}) {
  const customerLedgerTotals = buildCustomerLedgerTotals(args.customerLedgerRows);
  const supplierLedgerTotals = buildSupplierLedgerTotals(args.supplierLedgerRows);

  const inventorySnapshot = buildInventorySnapshot(args.productsRows);
  const partnerExposure = buildPartnerExposureSnapshot(
    args.customersRows,
    args.suppliersRows,
    customerLedgerTotals,
    supplierLedgerTotals,
  );

  const todaySalesRows = args.recentSalesRows.filter((row) => dateKey(row.created_at, args.businessTimezone) === args.todayKey);
  const todayPurchasesRows = args.recentPurchasesRows.filter((row) => dateKey(row.created_at, args.businessTimezone) === args.todayKey);
  const todayOperations = buildTodayOperationsSnapshot(todaySalesRows, todayPurchasesRows, args.topTodayRows);
  const trends = buildSevenDayTrends(args.recentSalesRows, args.recentPurchasesRows, args.businessTimezone);

  return {
    inventorySnapshot,
    partnerExposure,
    todayOperations,
    trends,
  };
}

export function buildInventorySnapshot(productsRows: ProductRow[]) {
  const lowStock = productsRows
    .filter((row) => Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0))
    .slice(0, 8)
    .map((row) => ({
      id: String(row.id),
      name: row.name || '',
      retailPrice: Number(row.retail_price || 0),
      stockQty: Number(row.stock_qty || 0),
      minStockQty: Number(row.min_stock_qty || 0),
      costPrice: Number(row.cost_price || 0),
      status: Number(row.stock_qty || 0) <= 0 ? 'out' : 'low',
    }));

  const lowStockCount = productsRows.filter((row) => Number(row.stock_qty || 0) <= Number(row.min_stock_qty || 0)).length;
  const outOfStockCount = productsRows.filter((row) => Number(row.stock_qty || 0) <= 0).length;
  const inventoryCost = toMoney(productsRows.reduce((sum, row) => sum + (Number(row.stock_qty || 0) * Number(row.cost_price || 0)), 0));
  const inventorySaleValue = toMoney(productsRows.reduce((sum, row) => sum + (Number(row.stock_qty || 0) * Number(row.retail_price || 0)), 0));

  return {
    lowStock,
    lowStockCount,
    outOfStockCount,
    inventoryCost,
    inventorySaleValue,
  };
}

export function buildPartnerExposureSnapshot(
  customersRows: CustomerRow[],
  suppliersRows: SupplierRow[],
  customerBalances: Map<string, number>,
  supplierBalances: Map<string, number>,
) {
  const customerDebt = toMoney([...customerBalances.values()].reduce((sum, value) => sum + Number(value || 0), 0));
  const supplierDebt = toMoney([...supplierBalances.values()].reduce((sum, value) => sum + Number(value || 0), 0));

  const nearCreditLimit = customersRows.filter((row) => {
    const balance = Number(customerBalances.get(String(row.id)) || 0);
    return Number(row.credit_limit || 0) > 0 && balance >= Number(row.credit_limit || 0) * 0.8 && balance <= Number(row.credit_limit || 0);
  }).length;

  const aboveCreditLimit = customersRows.filter((row) => {
    const balance = Number(customerBalances.get(String(row.id)) || 0);
    return Number(row.credit_limit || 0) > 0 && balance > Number(row.credit_limit || 0);
  }).length;

  const highSupplierBalances = suppliersRows.filter((row) => Number(supplierBalances.get(String(row.id)) || 0) >= 1000).length;

  const topCustomers = customersRows
    .map((row) => {
      const balance = Number(customerBalances.get(String(row.id)) || 0);
      return {
        key: String(row.id),
        name: row.name || '',
        total: balance,
        count: balance > 0 ? 1 : 0,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const topSuppliers = suppliersRows
    .map((row) => {
      const balance = Number(supplierBalances.get(String(row.id)) || 0);
      return {
        key: String(row.id),
        name: row.name || '',
        total: balance,
        count: balance > 0 ? 1 : 0,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    customerDebt,
    supplierDebt,
    nearCreditLimit,
    aboveCreditLimit,
    highSupplierBalances,
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
  const dayKeys = buildLastNDays(7, businessTimezone, new Date());
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
