import { sumMoney, toMoney } from './reports-math.helper';

type SummaryCounts = {
  salesCount: number;
  servicesCount: number;
  purchasesCount: number;
  expensesCount: number;
  returnsCount: number;
  salesReturnCount: number;
  purchaseReturnCount: number;
};

type SummaryTotals = {
  salesTotal: number;
  servicesTotal: number;
  purchasesTotal: number;
  expensesTotal: number;
  salesReturnsTotal: number;
  purchaseReturnsTotal: number;
  cashIn: number;
  cashOut: number;
  cogs: number;
  deliveryTotal?: number;
  deliveryCount?: number;
  deliveryFeeMode?: string;
  deliveryStoreProfit?: number;
  freelanceCount?: number;
  freelanceTotal?: number;
  storeFleetCount?: number;
  storeFleetTotal?: number;
  storeFleetCourierShare?: number;
  storeFleetCommissionRate?: number;
};

type TopProductAccumulatorRow = {
  product_id?: string | number | null;
  product_name?: string | null;
  qty?: string | number | null;
  line_total?: string | number | null;
};

type SummaryReturnRow = {
  return_type?: string | null;
  total?: string | number | null;
};

type SummaryMoneyRow = {
  total?: string | number | null;
};

type SummaryExpenseRow = {
  amount?: string | number | null;
};

type SummaryTreasuryRow = {
  amount?: string | number | null;
};

type SummarySaleItemRow = {
  qty?: string | number | null;
  cost_price?: string | number | null;
  product_id?: string | number | null;
  product_name?: string | null;
  line_total?: string | number | null;
};

export function buildTopProducts(rows: TopProductAccumulatorRow[], limit = 10): Array<{ name: string; qty: number; revenue: number; total: number }> {
  const topProductsMap = new Map<string, { name: string; qty: number; revenue: number; total: number }>();

  for (const row of rows) {
    const key = String(row.product_name || row.product_id || '');
    const item = topProductsMap.get(key) || { name: String(row.product_name || ''), qty: 0, revenue: 0, total: 0 };
    item.qty += Number(row.qty || 0);
    item.revenue += Number(row.line_total || 0);
    item.total += Number(row.line_total || 0);
    topProductsMap.set(key, item);
  }

  return [...topProductsMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function buildCommercialSummary(counts: SummaryCounts, totals: SummaryTotals) {
  const returnsTotal = toMoney(totals.salesReturnsTotal + totals.purchaseReturnsTotal);
  const merchandiseSalesTotal = toMoney(totals.salesTotal);
  const servicesTotal = toMoney(totals.servicesTotal);
  const revenueTotal = toMoney(merchandiseSalesTotal + servicesTotal);
  const netSales = toMoney(revenueTotal - totals.salesReturnsTotal);
  const netPurchases = toMoney(totals.purchasesTotal - totals.purchaseReturnsTotal);
  const grossProfit = toMoney(netSales - totals.cogs);
  const grossMarginPercent = netSales > 0 ? toMoney((grossProfit / netSales) * 100) : 0;
  const netOperatingProfit = toMoney(grossProfit - totals.expensesTotal);

  return {
    sales: {
      count: counts.salesCount + counts.servicesCount,
      invoiceCount: counts.salesCount,
      servicesCount: counts.servicesCount,
      total: revenueTotal,
      merchandiseTotal: merchandiseSalesTotal,
      servicesTotal,
      netSales,
    },
    services: {
      count: counts.servicesCount,
      total: servicesTotal,
    },
    purchases: {
      count: counts.purchasesCount,
      total: totals.purchasesTotal,
      netPurchases,
    },
    expenses: {
      count: counts.expensesCount,
      total: totals.expensesTotal,
    },
    returns: {
      count: counts.returnsCount,
      total: returnsTotal,
      salesCount: counts.salesReturnCount,
      purchasesCount: counts.purchaseReturnCount,
      salesTotal: totals.salesReturnsTotal,
      purchasesTotal: totals.purchaseReturnsTotal,
    },
    treasury: {
      cashIn: totals.cashIn,
      cashOut: totals.cashOut,
      net: toMoney(totals.cashIn - totals.cashOut),
    },
    commercial: {
      cogs: totals.cogs,
      grossProfit,
      grossMarginPercent,
      netOperatingProfit,
      informationalOnlyPurchasesInPeriod: netPurchases,
    },
    delivery: {
      count: totals.deliveryCount ?? 0,
      total: totals.deliveryTotal ?? 0,
      mode: totals.deliveryFeeMode ?? 'freelance_courier',
      storeProfit: totals.deliveryStoreProfit ?? 0,
      freelanceCount: totals.freelanceCount ?? 0,
      freelanceTotal: totals.freelanceTotal ?? 0,
      storeFleetCount: totals.storeFleetCount ?? 0,
      storeFleetTotal: totals.storeFleetTotal ?? 0,
      storeFleetCourierShare: totals.storeFleetCourierShare ?? 0,
      commissionRate: totals.storeFleetCommissionRate ?? 0,
    },
  };
}

export function splitReturnRowsByType(rows: SummaryReturnRow[]) {
  const sales = rows.filter((row) => row.return_type === 'sale');
  const purchases = rows.filter((row) => row.return_type === 'purchase');

  return {
    sales,
    purchases,
  };
}

export function buildReportSummaryPayload(args: {
  salesRows: SummaryMoneyRow[];
  servicesRows?: SummaryMoneyRow[];
  purchasesRows: SummaryMoneyRow[];
  expensesRows: SummaryExpenseRow[];
  returnsRows: SummaryReturnRow[];
  treasuryRows: SummaryTreasuryRow[];
  saleItemsRows?: SummarySaleItemRow[];
  returnedSaleItemsRows?: SummarySaleItemRow[];
  cogsOverride?: number;
  topProductsOverride?: Array<{ name: string; qty: number; revenue: number; total: number }>;
  topProductsLimit?: number;
  deliveryFeeMode?: string;
  storeFleetCommissionRate?: number;
}) {
  const {
    salesRows,
    servicesRows = [],
    purchasesRows,
    expensesRows,
    returnsRows,
    treasuryRows,
    saleItemsRows = [],
    returnedSaleItemsRows = [],
    cogsOverride,
    topProductsOverride,
    topProductsLimit = 10,
    deliveryFeeMode = 'freelance_courier',
    storeFleetCommissionRate = 0,
  } = args;
  const splitReturns = splitReturnRowsByType(returnsRows);

  const salesTotal = sumMoney(salesRows, (row) => row.total);
  const servicesTotal = sumMoney(servicesRows, (row) => row.total);
  const purchasesTotal = sumMoney(purchasesRows, (row) => row.total);
  const expensesTotal = sumMoney(expensesRows, (row) => row.amount);
  const salesReturnsTotal = sumMoney(splitReturns.sales, (row) => row.total);
  const purchaseReturnsTotal = sumMoney(splitReturns.purchases, (row) => row.total);
  
  const rawCogs = saleItemsRows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0);
  const returnedCogs = returnedSaleItemsRows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0);
  const cogs = cogsOverride != null ? toMoney(cogsOverride) : toMoney(rawCogs - returnedCogs);
  
  const cashIn = sumMoney(treasuryRows.filter((row) => Number(row.amount || 0) > 0), (row) => row.amount);
  const cashOut = Math.abs(sumMoney(treasuryRows.filter((row) => Number(row.amount || 0) < 0), (row) => row.amount));

  const deliveryRows = (salesRows as any[]) || [];
  const freelanceRows = deliveryRows.filter((row) => Number(row.delivery_fee || 0) > 0 && (row.delivery_fee_mode === 'freelance_courier' || (!row.delivery_fee_mode && deliveryFeeMode === 'freelance_courier')));
  const storeFleetRows = deliveryRows.filter((row) => Number(row.delivery_fee || 0) > 0 && (row.delivery_fee_mode === 'store_fleet' || (!row.delivery_fee_mode && deliveryFeeMode === 'store_fleet')));

  const freelanceTotal = toMoney(freelanceRows.reduce((sum, row) => sum + Number(row.delivery_fee || 0), 0));
  const freelanceCount = freelanceRows.length;

  const storeFleetTotal = toMoney(storeFleetRows.reduce((sum, row) => sum + Number(row.delivery_fee || 0), 0));
  const storeFleetCount = storeFleetRows.length;

  const commissionRate = Math.max(0, Math.min(100, Number(storeFleetCommissionRate || 0)));
  const storeFleetCourierShare = toMoney(storeFleetTotal * (commissionRate / 100));
  const deliveryStoreProfit = toMoney(Math.max(0, storeFleetTotal - storeFleetCourierShare));

  const deliveryTotal = toMoney(freelanceTotal + storeFleetTotal);
  const deliveryCount = freelanceCount + storeFleetCount;

  return {
    ...buildCommercialSummary({
      salesCount: salesRows.length,
      servicesCount: servicesRows.length,
      purchasesCount: purchasesRows.length,
      expensesCount: expensesRows.length,
      returnsCount: returnsRows.length,
      salesReturnCount: splitReturns.sales.length,
      purchaseReturnCount: splitReturns.purchases.length,
    }, {
      salesTotal,
      servicesTotal,
      purchasesTotal,
      expensesTotal,
      salesReturnsTotal,
      purchaseReturnsTotal,
      cashIn,
      cashOut,
      cogs,
      deliveryTotal,
      deliveryCount,
      deliveryFeeMode,
      deliveryStoreProfit,
      freelanceCount,
      freelanceTotal,
      storeFleetCount,
      storeFleetTotal,
      storeFleetCourierShare,
      storeFleetCommissionRate: commissionRate,
    }),
    topProducts: topProductsOverride != null ? topProductsOverride : buildTopProducts(saleItemsRows, topProductsLimit),
  };
}

export interface CustomerRfmRow {
  customerId: number | string;
  customerName: string;
  customerPhone?: string | null;
  currentBalance?: number | string | null;
  loyaltyPoints?: number | string | null;
  frequency?: number | string | null;
  monetary?: number | string | null;
  lastSaleDate?: string | null;
}

export function buildCustomerRfmPayload(rows: CustomerRfmRow[], targetSegment?: string) {
  const now = Date.now();

  const mapped = rows.map((r) => {
    const frequency = Number(r.frequency || 0);
    const monetary = Number(Number(r.monetary || 0).toFixed(2));
    const lastDate = r.lastSaleDate ? new Date(r.lastSaleDate).getTime() : 0;
    const recencyDays = lastDate ? Math.max(0, Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))) : 999;
    const aov = frequency > 0 ? Number((monetary / frequency).toFixed(2)) : 0;

    let segment: 'champions' | 'loyal' | 'promising' | 'at_risk' | 'lost' = 'promising';
    if (recencyDays <= 30 && frequency >= 4) {
      segment = 'champions';
    } else if (recencyDays <= 60 && frequency >= 3) {
      segment = 'loyal';
    } else if (recencyDays <= 30) {
      segment = 'promising';
    } else if (recencyDays > 120) {
      segment = 'lost';
    } else if (recencyDays > 60 && frequency >= 2) {
      segment = 'at_risk';
    } else {
      segment = 'at_risk';
    }

    return {
      id: String(r.customerId),
      name: r.customerName,
      phone: r.customerPhone || '',
      balance: Number(r.currentBalance || 0),
      loyaltyPoints: Number(r.loyaltyPoints || 0),
      frequency,
      monetary,
      recencyDays,
      lastSaleDate: r.lastSaleDate,
      aov,
      segment,
    };
  });

  const totalCustomers = mapped.length;
  const championsCount = mapped.filter((c) => c.segment === 'champions').length;
  const loyalCount = mapped.filter((c) => c.segment === 'loyal').length;
  const promisingCount = mapped.filter((c) => c.segment === 'promising').length;
  const atRiskCount = mapped.filter((c) => c.segment === 'at_risk').length;
  const lostCount = mapped.filter((c) => c.segment === 'lost').length;
  const totalRevenue = Number(mapped.reduce((sum, c) => sum + c.monetary, 0).toFixed(2));
  const totalOrders = mapped.reduce((sum, c) => sum + c.frequency, 0);
  const averageAov = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
  const repeatCount = mapped.filter((c) => c.frequency > 1).length;
  const repeatRate = totalCustomers > 0 ? Number(((repeatCount / totalCustomers) * 100).toFixed(1)) : 0;

  const items = targetSegment && targetSegment !== 'all'
    ? mapped.filter((c) => c.segment === targetSegment)
    : mapped;

  items.sort((a, b) => b.monetary - a.monetary);

  return {
    summary: {
      totalCustomers,
      championsCount,
      loyalCount,
      promisingCount,
      atRiskCount,
      lostCount,
      totalRevenue,
      averageAov,
      repeatRate,
    },
    items,
  };
}

