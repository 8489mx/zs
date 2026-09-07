import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TenantQuickStartChecklist } from '@/shared/system/TenantQuickStartChecklist';

const useAuthStoreMock = vi.fn();
const useSettingsQueryMock = vi.fn();
const useDashboardOverviewMock = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: any) => useAuthStoreMock(selector),
}));

vi.mock('@/shared/hooks/use-catalog-queries', () => ({
  useSettingsQuery: () => useSettingsQueryMock(),
}));

vi.mock('@/features/dashboard/hooks/useDashboardOverview', () => ({
  useDashboardOverview: () => useDashboardOverviewMock(),
}));

describe('TenantQuickStartChecklist', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStoreMock.mockImplementation((selector: any) => {
      const state = {
        user: { role: 'admin', username: 'tenant_admin' },
        tenant: { id: 't-123', name: 'Al-Baraka Store' },
      };
      return selector(state);
    });

    useSettingsQueryMock.mockReturnValue({
      data: {
        storeName: 'Z Systems',
        phone: '',
        taxNumber: '',
      },
    });

    useDashboardOverviewMock.mockReturnValue({
      data: {
        summary: { totalProducts: 0, sales: { count: 0 } },
        stats: { todaySalesCount: 0 },
      },
    });
  });

  it('renders the 3 operational steps for a new tenant', () => {
    render(
      <MemoryRouter>
        <TenantQuickStartChecklist />
      </MemoryRouter>
    );

    expect(screen.getByText('دليل البداية السريعة لتشغيل المنشأة')).toBeInTheDocument();
    expect(screen.getByText('بيانات المنشأة وترويسة الفواتير')).toBeInTheDocument();
    expect(screen.getByText('إضافة أول منتج في المخزون')).toBeInTheDocument();
    expect(screen.getByText('فتح نقطة البيع (POS) وبدء الفوترة')).toBeInTheDocument();
    expect(screen.getByText('إنجاز 0 من 3 خطوات')).toBeInTheDocument();
  });

  it('reflects completed progress when store info and products are set', () => {
    useSettingsQueryMock.mockReturnValue({
      data: {
        storeName: 'محل البركة',
        phone: '01012345678',
        taxNumber: '123-456',
      },
    });

    useDashboardOverviewMock.mockReturnValue({
      data: {
        summary: { totalProducts: 25, sales: { count: 0 } },
        stats: { todaySalesCount: 0 },
      },
    });

    render(
      <MemoryRouter>
        <TenantQuickStartChecklist />
      </MemoryRouter>
    );

    expect(screen.getByText('إنجاز 2 من 3 خطوات')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('can be dismissed and persists dismissal in localStorage', () => {
    render(
      <MemoryRouter>
        <TenantQuickStartChecklist />
      </MemoryRouter>
    );

    const dismissBtn = screen.getByTitle('إخفاء الدليل');
    fireEvent.click(dismissBtn);

    expect(window.localStorage.getItem('zs_quickstart_dismissed_t-123')).toBe('true');
    expect(screen.queryByText('دليل البداية السريعة لتشغيل المنشأة')).not.toBeInTheDocument();
  });

  it('automatically hides and saves dismissal when all 3 steps are completed', () => {
    useSettingsQueryMock.mockReturnValue({
      data: {
        storeName: 'محل البركة',
        phone: '01012345678',
        taxNumber: '123-456',
      },
    });

    useDashboardOverviewMock.mockReturnValue({
      data: {
        summary: { totalProducts: 25, sales: { count: 5 } },
        stats: { todaySalesCount: 2 },
      },
    });

    const { container } = render(
      <MemoryRouter>
        <TenantQuickStartChecklist />
      </MemoryRouter>
    );

    expect(window.localStorage.getItem('zs_quickstart_dismissed_t-123')).toBe('true');
    expect(container.firstChild).toBeNull();
  });
});
