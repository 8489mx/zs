import { http } from '@/lib/http';

export type FinancialSummaryBreakdownRow = {
  accountCode: string;
  accountNameAr: string;
  amount: number;
};

export type FinancialSummaryResponse = {
  period: {
    from: string | null;
    to: string | null;
  };
  cards: {
    grossSales: number;
    salesReturns: number;
    salesDiscounts: number;
    netSales: number;
    cogs: number;
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    customerCollections: number;
    supplierPayments: number;
    treasuryExpenses: number;
    netCashMovement: number;
  };
  breakdowns: {
    revenueAccounts: FinancialSummaryBreakdownRow[];
    expenseAccounts: FinancialSummaryBreakdownRow[];
    cashMovements: FinancialSummaryBreakdownRow[];
  };
};

export type ReceivableRow = {
  customerId: string;
  customerName: string;
  phone: string;
  balance: number;
  lastMovementDate: string;
};

export type PayableRow = {
  supplierId: string;
  supplierName: string;
  phone: string;
  balance: number;
  lastMovementDate: string;
};

export type ReceivablesPayablesResponse = {
  totals: {
    customerReceivables: number;
    supplierPayables: number;
    netPosition: number;
  };
  customers: ReceivableRow[];
  suppliers: PayableRow[];
};

export type CashMovementResponse = {
  period: { from: string | null; to: string | null };
  totals: {
    totalIn: number;
    totalOut: number;
    netMovement: number;
  };
  accounts: Array<{
    accountCode: string;
    accountNameAr: string;
    debit: number;
    credit: number;
    net: number;
  }>;
  sources: Array<{
    sourceType: string;
    debit: number;
    credit: number;
    net: number;
  }>;
};

export type InventoryValueItem = {
  productId: string;
  productName: string;
  barcode: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  quantityOnHand: number;
  minStockQty: number;
  unitCost: number;
  unitRetailPrice: number;
  inventoryValue: number;
  retailPotentialValue: number;
  potentialGrossMargin: number;
  status: 'available' | 'low_stock' | 'out_of_stock' | 'negative_stock';
};

export type InventoryValueResponse = {
  totals: {
    totalInventoryValue: number;
    totalRetailPotentialValue: number;
    totalPotentialGrossMargin: number;
    itemCount: number;
    lowStockCount: number;
    zeroStockCount: number;
    negativeStockCount: number;
  };
  items: InventoryValueItem[];
};

function buildQueryString(query: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || String(value).trim() === '') continue;
    search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `?${suffix}` : '';
}

export const accountingReportsApi = {
  financialSummary: (query: Record<string, string | number | undefined>) => (
    http<FinancialSummaryResponse>(`/api/accounting/reports/financial-summary${buildQueryString(query)}`)
  ),
  receivablesPayables: (query: Record<string, string | number | undefined>) => (
    http<ReceivablesPayablesResponse>(`/api/accounting/reports/receivables-payables${buildQueryString(query)}`)
  ),
  cashMovement: (query: Record<string, string | number | undefined>) => (
    http<CashMovementResponse>(`/api/accounting/reports/cash-movement${buildQueryString(query)}`)
  ),
  inventoryValue: (query: Record<string, string | number | undefined>) => (
    http<InventoryValueResponse>(`/api/accounting/reports/inventory-value${buildQueryString(query)}`)
  ),
};
