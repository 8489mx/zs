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
