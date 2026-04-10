import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/shared/layout/app-shell';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthUser } from '@/types/auth';

const {
  logoutMock,
  settingsMock,
  branchesMock,
  locationsMock,
  categoriesMock,
  productsListMock,
  customersListMock,
  suppliersListMock,
  dashboardOverviewMock,
} = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  settingsMock: vi.fn(),
  branchesMock: vi.fn(),
  locationsMock: vi.fn(),
  categoriesMock: vi.fn(),
  productsListMock: vi.fn(),
  customersListMock: vi.fn(),
  suppliersListMock: vi.fn(),
  dashboardOverviewMock: vi.fn(),
}));

vi.mock('@/shared/api/auth', () => ({
  authApi: {
    logout: logoutMock,
  },
}));

vi.mock('@/services/reference-data.api', () => ({
  referenceDataApi: {
    settings: settingsMock,
    branches: branchesMock,
    locations: locationsMock,
  },
}));

vi.mock('@/features/products/api/products.api', () => ({
  productsApi: {
    categories: categoriesMock,
    list: productsListMock,
  },
}));

vi.mock('@/features/customers/api/customers.api', () => ({
  customersApi: {
    list: customersListMock,
  },
}));

vi.mock('@/features/suppliers/api/suppliers.api', () => ({
  suppliersApi: {
    list: suppliersListMock,
  },
}));

vi.mock('@/features/dashboard/api/dashboard.api', () => ({
  dashboardApi: {
    overview: dashboardOverviewMock,
  },
}));

function LocationEcho() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

function seedUser(overrides: Partial<AuthUser> = {}) {
  const user: AuthUser = { ...buildUser(), ...overrides };
  useAuthStore.setState({
    user,
    storeName: 'My Store',
    theme: 'light',
    initialized: true,
  });
  return user;
}

function buildUser() {
  return {
    id: 'u-admin',
    username: 'manager',
    role: 'admin' as const,
    permissions: ['dashboard', 'products', 'sales', 'treasury'],
    displayName: 'Store Manager',
    branchIds: ['b-1'],
    defaultBranchId: 'b-1',
    mustChangePassword: false,
    usingDefaultAdminPassword: false,
  };
}

function renderShell(initialEntry = '/products') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  settingsMock.mockResolvedValue({});
  branchesMock.mockResolvedValue([]);
  locationsMock.mockResolvedValue([]);
  categoriesMock.mockResolvedValue([]);
  productsListMock.mockResolvedValue([]);
  customersListMock.mockResolvedValue([]);
  suppliersListMock.mockResolvedValue([]);
  dashboardOverviewMock.mockResolvedValue({});

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={<AppShell><LocationEcho /></AppShell>} />
          <Route path="/login" element={<LocationEcho />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

describe('AppShell', () => {
  it('renders only the navigation items the current user can access', async () => {
    seedUser();
    renderShell('/products');

    expect(document.querySelector('[data-key="dashboard"]')).toBeInTheDocument();
    expect(document.querySelector('[data-key="products"]')).toBeInTheDocument();
    expect(document.querySelector('[data-key="pos"]')).toBeInTheDocument();
    expect(document.querySelector('[data-key="cash-drawer"]')).toBeInTheDocument();
    expect(document.querySelector('[data-key="reports"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-key="settings"]')).not.toBeInTheDocument();
  });

  it('shows the bootstrap-admin warning globally when the root account is still using the default password', async () => {
    seedUser({
      role: 'super_admin',
      username: 'root',
      displayName: 'Bootstrap Admin',
      usingDefaultAdminPassword: true,
      permissions: [],
    });

    renderShell('/products');

    const warnings = await screen.findAllByText(/حساب التثبيت/);
    expect(warnings.length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('حساب التثبيت');
  });

  it('clears the query cache and redirects to login after logout', async () => {
    logoutMock.mockResolvedValueOnce({ ok: true });
    seedUser();
    const user = userEvent.setup();
    const { queryClient } = renderShell('/sales');
    queryClient.setQueryData(['stale-session'], { leaked: true });

    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج' }));

    await waitFor(() => {
      expect(screen.getByText('/login?reason=signed-out')).toBeInTheDocument();
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(queryClient.getQueryCache().findAll()).toHaveLength(0);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
