export interface AuditLog {
  id: string;
  action: string;
  details: string;
  detailsSummary?: string;
  createdAt: string;
  created_at?: string;
  createdByName?: string;
  createdBy?: string;
}

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
  }>;
}
