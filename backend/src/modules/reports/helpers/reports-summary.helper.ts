import { sumMoney, toMoney } from './reports-math.helper';

type SummaryCounts = {
  salesCount: number;
  purchasesCount: number;
  expensesCount: number;
  returnsCount: number;
  salesReturnCount: number;
  purchaseReturnCount: number;
};

type SummaryTotals = {
  salesTotal: number;
  purchasesTotal: number;
  expensesTotal: number;
  salesReturnsTotal: number;
  purchaseReturnsTotal: number;
  cashIn: number;
  cashOut: number;
  cogs: number;
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
  const netSales = Math.max(0, toMoney(totals.salesTotal - totals.salesReturnsTotal));
  const netPurchases = Math.max(0, toMoney(totals.purchasesTotal - totals.purchaseReturnsTotal));
  const grossProfit = toMoney(netSales - totals.cogs);
  const grossMarginPercent = netSales > 0 ? toMoney((grossProfit / netSales) * 100) : 0;
  const netOperatingProfit = toMoney(grossProfit - totals.expensesTotal);

  return {
    sales: {
      count: counts.salesCount,
      total: totals.salesTotal,
      netSales,
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
  purchasesRows: SummaryMoneyRow[];
  expensesRows: SummaryExpenseRow[];
  returnsRows: SummaryReturnRow[];
  treasuryRows: SummaryTreasuryRow[];
  saleItemsRows: SummarySaleItemRow[];
  topProductsLimit?: number;
}) {
  const { salesRows, purchasesRows, expensesRows, returnsRows, treasuryRows, saleItemsRows, topProductsLimit = 10 } = args;
  const splitReturns = splitReturnRowsByType(returnsRows);

  const salesTotal = sumMoney(salesRows, (row) => row.total);
  const purchasesTotal = sumMoney(purchasesRows, (row) => row.total);
  const expensesTotal = sumMoney(expensesRows, (row) => row.amount);
  const salesReturnsTotal = sumMoney(splitReturns.sales, (row) => row.total);
  const purchaseReturnsTotal = sumMoney(splitReturns.purchases, (row) => row.total);
  const cogs = toMoney(saleItemsRows.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.cost_price || 0)), 0));
  const cashIn = sumMoney(treasuryRows.filter((row) => Number(row.amount || 0) > 0), (row) => row.amount);
  const cashOut = Math.abs(sumMoney(treasuryRows.filter((row) => Number(row.amount || 0) < 0), (row) => row.amount));

  return {
    ...buildCommercialSummary({
      salesCount: salesRows.length,
      purchasesCount: purchasesRows.length,
      expensesCount: expensesRows.length,
      returnsCount: returnsRows.length,
      salesReturnCount: splitReturns.sales.length,
      purchaseReturnCount: splitReturns.purchases.length,
    }, {
      salesTotal,
      purchasesTotal,
      expensesTotal,
      salesReturnsTotal,
      purchaseReturnsTotal,
      cashIn,
      cashOut,
      cogs,
    }),
    topProducts: buildTopProducts(saleItemsRows, topProductsLimit),
  };
}
