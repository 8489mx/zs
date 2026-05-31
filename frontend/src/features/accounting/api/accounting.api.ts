import { http } from '@/lib/http';

export type AccountingAccount = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  accountType: string;
  accountGroup: string;
  parentId: string;
  depth: number;
  normalBalance: string;
  isActive: boolean;
  isSystem: boolean;
  allowManualEntries: boolean;
  isControlAccount: boolean;
  flags: {
    isCashBank: boolean;
    isReceivable: boolean;
    isPayable: boolean;
    isInventory: boolean;
    isTax: boolean;
  };
  sortOrder: number;
};

export type JournalEntryListItem = {
  id: string;
  entryNo: string;
  entryDate: string;
  description: string;
  sourceType: string;
  sourceId: string;
  status: 'draft' | 'posted' | 'cancelled' | string;
};

export type JournalEntryLine = {
  id: string;
  accountId: string;
  accountCode?: string;
  accountNameAr?: string;
  accountNameEn?: string;
  description: string;
  debit: number;
  credit: number;
};

export type JournalEntryDetail = {
  id: string;
  entryNo: string;
  entryDate: string;
  description: string;
  sourceType: string;
  sourceId: string;
  status: 'draft' | 'posted' | 'cancelled' | string;
  lines: JournalEntryLine[];
  totals?: {
    debit: number;
    credit: number;
    balanced?: boolean;
  };
};

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

export type OpeningBalancePreviewLine = {
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  description: string;
  debit: number;
  credit: number;
};

export type OpeningBalancesPreviewResponse = {
  alreadyPosted: boolean;
  existingOpeningEntryId: number | null;
  systemStartDate: string;
  totals: {
    cashOpening: number;
    bankOpening: number;
    customerReceivables: number;
    supplierPayables: number;
    inventoryValue: number;
    balancingCapital: number;
  };
  linesPreview: OpeningBalancePreviewLine[];
  warnings: string[];
};

export type OpeningBalancesPostResponse = {
  posted: boolean;
  alreadyPosted: boolean;
  journalEntryId: string;
  message: string;
  preview: OpeningBalancesPreviewResponse;
};

export const accountingApi = {
  accounts: () => http<{ accounts: AccountingAccount[] }>('/api/accounting/accounts'),
  settings: () => http<{ settings: Record<string, unknown> | null }>('/api/accounting/settings'),
  journalEntries: (query: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return http<{ entries: JournalEntryListItem[]; pagination: Record<string, unknown> }>(`/api/accounting/journal-entries${suffix ? `?${suffix}` : ''}`);
  },
  journalEntry: (id: string) => http<{ entry: JournalEntryDetail }>(`/api/accounting/journal-entries/${encodeURIComponent(id)}`),
  financialSummary: (query: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return http<FinancialSummaryResponse>(`/api/accounting/reports/financial-summary${suffix ? `?${suffix}` : ''}`);
  },
  receivablesPayables: (query: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return http<ReceivablesPayablesResponse>(`/api/accounting/reports/receivables-payables${suffix ? `?${suffix}` : ''}`);
  },
  cashMovement: (query: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return http<CashMovementResponse>(`/api/accounting/reports/cash-movement${suffix ? `?${suffix}` : ''}`);
  },
  inventoryValue: (query: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || String(value).trim() === '') continue;
      search.set(key, String(value));
    }
    const suffix = search.toString();
    return http<InventoryValueResponse>(`/api/accounting/reports/inventory-value${suffix ? `?${suffix}` : ''}`);
  },
  openingBalancesPreview: (query: { system_start_date?: string; cash_opening?: number; bank_opening?: number }) => {
    const search = new URLSearchParams();
    if (query.system_start_date) search.set('system_start_date', String(query.system_start_date));
    if (typeof query.cash_opening === 'number' && Number.isFinite(query.cash_opening)) search.set('cash_opening', String(query.cash_opening));
    if (typeof query.bank_opening === 'number' && Number.isFinite(query.bank_opening)) search.set('bank_opening', String(query.bank_opening));
    const suffix = search.toString();
    return http<OpeningBalancesPreviewResponse>(`/api/accounting/opening-balances/preview${suffix ? `?${suffix}` : ''}`);
  },
  postOpeningBalances: (body: { system_start_date: string; cash_opening?: number; bank_opening?: number; note?: string }) =>
    http<OpeningBalancesPostResponse>('/api/accounting/opening-balances/post', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

