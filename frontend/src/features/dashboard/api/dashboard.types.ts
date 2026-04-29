import type { Product, ReportSummary } from '@/types/domain';

export type DashboardSummarySnapshot = ReportSummary & {
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeOffers: number;
};

export type DashboardTrendPoint = {
  key: string;
  value: number;
};

export type DashboardTopItem = {
  productId: string;
  name: string;
  qty: number;
  total: number;
};

export type DashboardPartnerItem = {
  key: string;
  name: string;
  total: number;
  count: number;
};

export type ManagerActionInsight = {
  id: string;
  domain: 'products' | 'sales' | 'customers' | 'inventory' | 'purchases' | 'accounts';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  metrics?: Record<string, unknown>;
};

export type ManagerActionsPayload = {
  insights: ManagerActionInsight[];
};

export type DashboardMoneyInsight = {
  total: number;
  count: number;
  averageInvoice: number;
  previousTotal?: number;
  comparisonPercent?: number | null;
};

export type DashboardProfitSummary = {
  netSales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
};

export type DashboardProfitItem = {
  productId?: string;
  categoryId?: string;
  name: string;
  categoryName?: string;
  qty?: number;
  revenue: number;
  cost: number;
  grossProfit: number;
  marginPercent: number;
};

export type DashboardStagnantItem = {
  productId: string;
  name: string;
  categoryName?: string;
  stockQty: number;
  costPrice: number;
  inventoryValue: number;
  daysWithoutSales: number | null;
};

export type DashboardBuyingItem = {
  productId: string;
  name: string;
  categoryName?: string;
  stockQty: number;
  minStockQty: number;
  soldQty30: number;
  daysToRunOut: number | null;
  grossProfit: number;
  marginPercent: number;
};

export type DashboardCollectionItem = {
  customerId: string;
  name: string;
  balance: number;
  creditLimit: number;
  creditUsagePercent: number | null;
};

export type DashboardManagerOverviewPayload = {
  salesLast30: DashboardMoneyInsight;
  profitSummary: DashboardProfitSummary;
  profitSources: {
    topProducts: DashboardProfitItem[];
    topCategories: DashboardProfitItem[];
    weakMarginHighSales: DashboardProfitItem[];
  };
  stagnant: {
    days30: number;
    days60: number;
    days90: number;
    inventoryValue: number;
    items: DashboardStagnantItem[];
  };
  buying: {
    outOfStock: DashboardBuyingItem[];
    lowStock: DashboardBuyingItem[];
    priority: DashboardBuyingItem[];
  };
  collection: {
    topDebts: DashboardCollectionItem[];
    aboveCreditLimit: DashboardCollectionItem[];
    nearCreditLimit: DashboardCollectionItem[];
  };
};

export type DashboardOverviewPayload = {
  range: { from: string; to: string; branchId?: string; locationId?: string };
  summary: DashboardSummarySnapshot;
  stats: {
    productsCount: number;
    customersCount: number;
    suppliersCount: number;
    todaySalesCount: number;
    todaySalesAmount: number;
    todayPurchasesCount: number;
    todayPurchasesAmount: number;
    inventoryCost: number;
    inventorySaleValue: number;
    customerDebt: number;
    supplierDebt: number;
    nearCreditLimit: number;
    aboveCreditLimit: number;
    highSupplierBalances: number;
    activeOffers: number;
  };
  lowStock: Product[];
  topToday: DashboardTopItem[];
  topCustomers: DashboardPartnerItem[];
  topSuppliers: DashboardPartnerItem[];
  trends: {
    sales: DashboardTrendPoint[];
    purchases: DashboardTrendPoint[];
  };
};
