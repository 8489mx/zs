import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';

const dashboardOverview = {
  range: { from: '2026-04-27T00:00:00.000Z', to: '2026-04-27T23:59:59.999Z' },
  summary: {
    sales: { count: 0, total: 0, netSales: 0 },
    purchases: { count: 0, total: 0, netPurchases: 0 },
    expenses: { count: 0, total: 0 },
    returns: { count: 0, total: 0, salesTotal: 0, purchasesTotal: 0 },
    treasury: { cashIn: 0, cashOut: 0, net: 0 },
    commercial: { grossProfit: 0, grossMarginPercent: 0, netOperatingProfit: 0, cogs: 0, informationalOnlyPurchasesInPeriod: 0 },
    totalProducts: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    activeOffers: 0,
  },
  stats: {
    productsCount: 0,
    customersCount: 0,
    suppliersCount: 0,
    todaySalesCount: 0,
    todaySalesAmount: 0,
    todayPurchasesCount: 0,
    todayPurchasesAmount: 0,
    inventoryCost: 0,
    inventorySaleValue: 0,
    customerDebt: 0,
    supplierDebt: 0,
    nearCreditLimit: 0,
    aboveCreditLimit: 0,
    highSupplierBalances: 0,
    activeOffers: 0,
  },
  lowStock: [],
  topToday: [],
  topCustomers: [],
  topSuppliers: [],
  trends: {
    sales: [
      { key: '2026-04-26', value: 50 },
      { key: '2026-04-27', value: 100 },
    ],
    purchases: [
      { key: '2026-04-26', value: 20 },
      { key: '2026-04-27', value: 10 },
    ],
  },
};

const managerOverview = {
  salesLast30: { total: 12500, count: 25, averageInvoice: 500, previousTotal: 10000, comparisonPercent: 25 },
  profitSummary: { netSales: 12000, cogs: 7200, grossProfit: 4800, expenses: 1300, netProfit: 3500 },
  profitSources: {
    topProducts: [{ productId: 'p2', name: 'بن برازيلي', categoryName: 'مشروبات', qty: 15, revenue: 3000, cost: 1800, grossProfit: 1200, marginPercent: 40 }],
    topCategories: [],
    weakMarginHighSales: [{ productId: 'p4', name: 'سكر أبيض', categoryName: 'بقالة', qty: 30, revenue: 4500, cost: 4300, grossProfit: 200, marginPercent: 4.4 }],
  },
  stagnant: {
    days30: 2,
    days60: 1,
    days90: 1,
    inventoryValue: 2400,
    items: [{ productId: 'p3', name: 'جاكيت قديم', categoryName: 'ملابس', stockQty: 6, costPrice: 400, inventoryValue: 2400, daysWithoutSales: 95 }],
    itemsTotal: 1,
  },
  buying: {
    outOfStock: [],
    outOfStockTotal: 0,
    lowStock: [],
    lowStockTotal: 0,
    priority: [{ productId: 'p1', name: 'قميص رجالي', categoryName: 'ملابس', stockQty: 1, minStockQty: 5, soldQty30: 20, daysToRunOut: 1.5, grossProfit: 1800, marginPercent: 45 }],
    priorityTotal: 1,
  },
  collection: {
    topDebts: [{ customerId: 'cust-1', name: 'عميل الآجل', balance: 3000, creditLimit: 2500, creditUsagePercent: 120 }],
    topDebtsTotal: 1,
    aboveCreditLimit: [{ customerId: 'cust-1', name: 'عميل الآجل', balance: 3000, creditLimit: 2500, creditUsagePercent: 120 }],
    aboveCreditLimitTotal: 1,
    nearCreditLimit: [],
    nearCreditLimitTotal: 0,
  },
};

const { useDashboardManagerOverviewMock, useDashboardOverviewMock, useManagerActionsMock } = vi.hoisted(() => ({
  useDashboardManagerOverviewMock: vi.fn(),
  useDashboardOverviewMock: vi.fn(),
  useManagerActionsMock: vi.fn(),
}));

vi.mock('@/features/dashboard/hooks/useDashboardManagerOverview', () => ({
  useDashboardManagerOverview: useDashboardManagerOverviewMock,
}));

vi.mock('@/features/dashboard/hooks/useDashboardOverview', () => ({
  useDashboardOverview: useDashboardOverviewMock,
}));

vi.mock('@/features/dashboard/hooks/useManagerActions', () => ({
  useManagerActions: useManagerActionsMock,
}));

vi.mock('@/shared/system/compact-first-run-setup-prompt', () => ({
  CompactFirstRunSetupPrompt: () => null,
}));

vi.mock('@/shared/system/first-run-setup-checklist', () => ({
  FirstRunSetupChecklist: () => null,
}));

describe('Dashboard daily home layout', () => {
  it('renders the current focused daily dashboard with decision and summary cards', () => {
    useDashboardOverviewMock.mockReturnValue({
      data: dashboardOverview,
      isLoading: false,
      isError: false,
      error: null,
    });
    useManagerActionsMock.mockReturnValue({
      data: { insights: [] },
      isLoading: false,
      isError: false,
      error: null,
    });
    useDashboardManagerOverviewMock.mockReturnValue({
      data: managerOverview,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getAllByText('ملخص اليوم').length).toBeGreaterThan(0);
    expect(screen.getByText('مبيعات اليوم')).toBeInTheDocument();
    expect(screen.getByText('صافي الخزينة')).toBeInTheDocument();
    expect(screen.getByLabelText('إجراءات سريعة')).toBeInTheDocument();
    expect(screen.getByText('أهم ما يحتاج مراجعة الآن')).toBeInTheDocument();
    expect(screen.getByText('قرارات تحتاج مراجعة')).toBeInTheDocument();
    expect(screen.getByText('إيه أشتريه؟')).toBeInTheDocument();
    expect(screen.getByText('إيه الراكد؟')).toBeInTheDocument();
    expect(screen.getByText('بيكسب منين؟')).toBeInTheDocument();
    expect(screen.getByText('مبيعات عالية وهامش ضعيف')).toBeInTheDocument();
    expect(screen.getByText('إيه أُحصّله؟')).toBeInTheDocument();
    expect(screen.getByText('تنبيهات المخزون والحسابات')).toBeInTheDocument();
    expect(screen.getByText('أعلى أصناف اليوم')).toBeInTheDocument();
    expect(screen.getByText('الحسابات المستحقة والمخزون')).toBeInTheDocument();
    expect(screen.getByText('مبيعات آخر 30 يوم')).toBeInTheDocument();
    expect(screen.getAllByText('لا توجد قرارات عاجلة الآن').length).toBeGreaterThan(0);
  });
});
