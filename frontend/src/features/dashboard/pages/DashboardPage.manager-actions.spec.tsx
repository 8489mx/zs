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

const { useDashboardOverviewMock, useManagerActionsMock } = vi.hoisted(() => ({
  useDashboardOverviewMock: vi.fn(),
  useManagerActionsMock: vi.fn(),
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
  it('renders a focused daily dashboard without long report sections', () => {
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

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'تنبيهات المدير' })).toBeInTheDocument();
    expect(screen.getByText('موجز المدير اليومي')).toBeInTheDocument();
    expect(screen.getByText('البيع والخزينة')).toBeInTheDocument();
    expect(screen.getByText('ملخص اليوم')).toBeInTheDocument();
    expect(screen.getByText('تنبيهات سريعة')).toBeInTheDocument();
    expect(screen.getByText('أعلى أصناف اليوم')).toBeInTheDocument();
    expect(screen.getByText('المخزون والذمم')).toBeInTheDocument();

    expect(screen.queryByText('مبيعات آخر 30 يوم')).not.toBeInTheDocument();
    expect(screen.queryByText('صافي الربح')).not.toBeInTheDocument();
    expect(screen.queryByText('بيكسب منين؟')).not.toBeInTheDocument();
    expect(screen.queryByText('إيه الراكد؟')).not.toBeInTheDocument();
    expect(screen.queryByText('إيه أشتريه؟')).not.toBeInTheDocument();
    expect(screen.queryByText('إيه أُحصّله؟')).not.toBeInTheDocument();
    expect(screen.getAllByText('لا توجد تنبيهات حرجة حاليًا').length).toBeGreaterThan(0);
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

    render(<MemoryRouter><DashboardPage /></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: 'تنبيهات المدير' }));

    const dialog = screen.getByRole('dialog', { name: 'تنبيهات المدير' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('أصناف نافدة')).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole('dialog', { name: 'تنبيهات المدير' })).not.toBeInTheDocument();
  });
});
