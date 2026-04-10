import type { Customer, Supplier } from './catalog';

export interface ReportSummary {
  sales: {
    count: number;
    total: number;
    netSales: number;
  };
  purchases: {
    count: number;
    total: number;
    netPurchases: number;
  };
  expenses: {
    count: number;
    total: number;
  };
  returns: {
    count: number;
    total: number;
    salesTotal?: number;
    purchasesTotal?: number;
  };
  treasury: {
    cashIn: number;
    cashOut: number;
    net: number;
  };
  commercial: {
    grossProfit: number;
    grossMarginPercent: number;
    netOperatingProfit: number;
    cogs?: number;
    informationalOnlyPurchasesInPeriod?: number;
  };
  topProducts?: Array<{
    name: string;
    qty: number;
    revenue: number;
    total?: number;
  }>;
}

export interface CustomerLedgerEntry {
  created_at?: string;
  date?: string;
  doc_no?: string;
  entry_type?: string;
  note?: string;
  debit?: number;
  credit?: number;
  balance_after?: number;
}

export interface SupplierLedgerEntry {
  created_at?: string;
  date?: string;
  doc_no?: string;
  entry_type?: string;
  note?: string;
  debit?: number;
  credit?: number;
  balance_after?: number;
}

export interface LedgerSummary {
  totalItems: number;
  debitTotal: number;
  creditTotal: number;
  net: number;
  lastBalance: number;
}

export interface LedgerPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CustomerLedger {
  customer?: Customer;
  entries: CustomerLedgerEntry[];
  summary?: LedgerSummary;
  pagination?: LedgerPagination;
}

export interface SupplierLedger {
  supplier?: Supplier;
  entries: SupplierLedgerEntry[];
  summary?: LedgerSummary;
  pagination?: LedgerPagination;
}
