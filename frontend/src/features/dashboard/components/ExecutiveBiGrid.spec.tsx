import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExecutiveBiGrid } from '@/features/dashboard/components/ExecutiveBiGrid';
import type { DashboardOverviewPayload, DashboardManagerOverviewPayload } from '@/features/dashboard/api/dashboard.types';

const mockOverview: DashboardOverviewPayload = {
  range: { from: '2026-09-06T00:00:00.000Z', to: '2026-09-06T23:59:59.999Z' },
  summary: {
    sales: { count: 10, total: 5000, netSales: 5000 },
    purchases: { count: 0, total: 0, netPurchases: 0 },
    expenses: { count: 0, total: 0 },
    returns: { count: 0, total: 0, salesTotal: 0, purchasesTotal: 0 },
    treasury: { cashIn: 3000, cashOut: 0, net: 3000 },
    commercial: { grossProfit: 1500, grossMarginPercent: 30, netOperatingProfit: 1500, cogs: 3500, informationalOnlyPurchasesInPeriod: 0 },
    totalProducts: 50,
    totalCustomers: 20,
    totalSuppliers: 5,
    lowStockCount: 0,
    outOfStockCount: 0,
    activeOffers: 0,
  },
  stats: {
    productsCount: 50,
    customersCount: 20,
    suppliersCount: 5,
    todaySalesCount: 10,
    todaySalesAmount: 5000,
    todayPurchasesCount: 0,
    todayPurchasesAmount: 0,
    inventoryCost: 10000,
    inventorySaleValue: 15000,
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
    sales: [],
    purchases: [],
  },
};

describe('ExecutiveBiGrid Component', () => {
  it('renders payment distribution and top categories side by side when data exists', () => {
    const managerData: DashboardManagerOverviewPayload = {
      salesLast30: {
        total: 5000,
        count: 10,
        averageInvoice: 500,
      },
      profitSummary: {
        netSales: 5000,
        cogs: 3500,
        grossProfit: 1500,
        expenses: 200,
        netProfit: 1300,
      },
      profitSources: {
        topCategories: [
          { name: 'ملابس رجالي', categoryName: 'ملابس رجالي', revenue: 3000, cost: 2000, grossProfit: 1000, marginPercent: 33 },
          { name: 'أحذية', categoryName: 'أحذية', revenue: 2000, cost: 1500, grossProfit: 500, marginPercent: 25 },
        ],
        topProducts: [],
        weakMarginHighSales: [],
      },
      stagnant: {
        days30: 0,
        days60: 0,
        days90: 0,
        inventoryValue: 0,
        items: [],
        itemsTotal: 0,
      },
      buying: {
        outOfStock: [],
        outOfStockTotal: 0,
        lowStock: [],
        lowStockTotal: 0,
        priority: [],
        priorityTotal: 0,
      },
      collection: {
        topDebts: [],
        topDebtsTotal: 0,
        aboveCreditLimit: [],
        aboveCreditLimitTotal: 0,
        nearCreditLimit: [],
        nearCreditLimitTotal: 0,
      },
    };

    render(<ExecutiveBiGrid overviewData={mockOverview} managerData={managerData} />);

    expect(screen.getByText('توزيع قنوات وطرق التحصيل')).toBeInTheDocument();
    expect(screen.getByText('أعلى القطاعات مساهمة في الإيرادات والربحية')).toBeInTheDocument();
    expect(screen.getByText('ملابس رجالي')).toBeInTheDocument();
    expect(screen.getByText('أحذية')).toBeInTheDocument();
  });

  it('renders both cards symmetrically with an enterprise empty state when database is clean/empty', () => {
    const emptyOverview: DashboardOverviewPayload = {
      ...mockOverview,
      summary: {
        ...mockOverview.summary,
        sales: { count: 0, total: 0, netSales: 0 },
        treasury: { cashIn: 0, cashOut: 0, net: 0 },
      },
    };

    render(<ExecutiveBiGrid overviewData={emptyOverview} managerData={null} />);

    // Both cards must exist to preserve the 2-column grid symmetry
    expect(screen.getByText('توزيع قنوات وطرق التحصيل')).toBeInTheDocument();
    expect(screen.getByText('أعلى القطاعات مساهمة في الإيرادات والربحية')).toBeInTheDocument();

    // Empty state should be visible without emojis
    expect(screen.getByText('لا توجد مبيعات مسجلة للقطاعات بعد')).toBeInTheDocument();
    expect(screen.getByText(/ستظهر القطاعات والمنتجات الأكثر ربحية هنا تلقائياً/)).toBeInTheDocument();
  });
});
