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
    topProducts: [
      { productId: 'p1', name: 'قميص رجالي', categoryName: 'ملابس', qty: 20, revenue: 4000, cost: 2200, grossProfit: 1800, marginPercent: 45 },
    ],
    topCategories: [
      { categoryId: 'c1', name: 'ملابس', revenue: 8000, cost: 5000, grossProfit: 3000, marginPercent: 37.5 },
    ],
    weakMarginHighSales: [
      { productId: 'p2', name: 'حذاء رياضي', categoryName: 'أحذية', qty: 12, revenue: 3600, cost: 3300, grossProfit: 300, marginPercent: 8.3 },
    ],
  },
  stagnant: {
    days30: 2,
    days60: 1,
    days90: 1,
    inventoryValue: 2400,
    items: [{ productId: 'p3', name: 'جاكيت قديم', categoryName: 'ملابس', stockQty: 6, costPrice: 400, inventoryValue: 2400, daysWithoutSales: 95 }],
  },
  buying: {
    outOfStock: [],
    lowStock: [],
    priority: [{ productId: 'p1', name: 'قميص رجالي', categoryName: 'ملابس', stockQty: 1, minStockQty: 5, soldQty30: 20, daysToRunOut: 1.5, grossProfit: 1800, marginPercent: 45 }],
  },
  collection: {
    topDebts: [{ customerId: 'cust-1', name: 'عميل الآجل', balance: 3000, creditLimit: 2500, creditUsagePercent: 120 }],
    aboveCreditLimit: [{ customerId: 'cust-1', name: 'عميل الآجل', balance: 3000, creditLimit: 2500, creditUsagePercent: 120 }],
    nearCreditLimit: [],
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

describe('Dashboard manager actions', () => {
  it('renders the Manager Action Center and daily brief empty state', () => {
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

    expect(screen.getByRole('button', { name: 'تنبيهات المدير' })).toBeInTheDocument();
    expect(screen.getByText('مركز قرارات المدير')).toBeInTheDocument();
    expect(screen.getByText('موجز المدير اليومي')).toBeInTheDocument();
    expect(screen.getAllByText('مبيعات آخر 30 يوم').length).toBeGreaterThan(0);
    expect(screen.getByText('صافي الربح')).toBeInTheDocument();
    expect(screen.getByText('بيكسب منين؟')).toBeInTheDocument();
    expect(screen.getByText('إيه الراكد؟')).toBeInTheDocument();
    expect(screen.getByText('إيه أشتريه؟')).toBeInTheDocument();
    expect(screen.getByText('إيه أُحصّله؟')).toBeInTheDocument();
    expect(screen.getAllByText('قميص رجالي').length).toBeGreaterThan(0);
    expect(screen.getAllByText('لا توجد تنبيهات حرجة حاليًا').length).toBeGreaterThan(0);
  });

  it('does not crash when manager overview is empty', () => {
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
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByText('لا توجد بيانات كافية لملخص المدير')).toBeInTheDocument();
  });

  it('opens and closes the Dashboard manager notifications dropdown', async () => {
    const user = userEvent.setup();
    useDashboardOverviewMock.mockReturnValue({
      data: dashboardOverview,
      isLoading: false,
      isError: false,
      error: null,
    });
    useManagerActionsMock.mockReturnValue({
      data: {
        insights: [{
          id: 'stock-alert',
          domain: 'inventory',
          severity: 'danger',
          title: 'أصناف نافدة',
          message: 'راجع 3 أصناف نافدة من المخزون',
          actionLabel: 'راجع الآن',
          actionHref: '/inventory',
        }],
      },
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

    await user.click(screen.getByRole('button', { name: 'تنبيهات المدير' }));

    const dialog = screen.getByRole('dialog', { name: 'تنبيهات المدير' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('أصناف نافدة')).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('dialog', { name: 'تنبيهات المدير' })).not.toBeInTheDocument();
  });
});
