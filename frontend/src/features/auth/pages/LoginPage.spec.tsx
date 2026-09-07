import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { useAuthStore } from '@/stores/auth-store';

const { loginMock, meMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  meMock: vi.fn(),
}));

vi.mock('@/features/auth/api/auth.api', () => ({
  authApi: {
    login: loginMock,
    me: meMock,
  },
}));

function LocationEcho() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}`}</div>;
}

function createWrapper(initialEntry = '/login') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

function renderLogin(initialEntry = '/login') {
  const { Wrapper, queryClient } = createWrapper(initialEntry);
  const view = render(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/settings/core" element={<LocationEcho />} />
      <Route path="/" element={<LocationEcho />} />
    </Routes>,
    { wrapper: Wrapper },
  );

  return { ...view, queryClient };
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('routes the bootstrap super admin into the guided setup flow after login', async () => {
    loginMock.mockResolvedValueOnce({ ok: true });
    meMock.mockResolvedValueOnce({
      user: {
        id: 'u-root',
        username: 'root',
        role: 'super_admin',
        permissions: [],
        displayName: 'Bootstrap Root',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
      },
      settings: {
        storeName: 'Z Systems',
        theme: 'dark',
      },
      security: {
        mustChangePassword: true,
        usingDefaultAdminPassword: true,
      },
    });

    const user = userEvent.setup();
    const { queryClient } = renderLogin();
    queryClient.setQueryData(['stale-session'], { leaked: true });

    await user.type(screen.getByLabelText('رقم الهاتف المحمول أو اسم المستخدم'), 'root');
    await user.type(screen.getByLabelText('كلمة المرور'), 'owner123456789');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByText('/settings/core?setup=1')).toBeInTheDocument();
    await waitFor(() => {
      expect(useAuthStore.getState().user).toMatchObject({
        username: 'root',
        mustChangePassword: true,
        usingDefaultAdminPassword: true,
      });
      expect(useAuthStore.getState().theme).toBe('dark');
      expect(queryClient.getQueryData(['stale-session'])).toBeUndefined();
    });
  });

  it('trims the username before submitting the login request', async () => {
    loginMock.mockResolvedValueOnce({ ok: true });
    meMock.mockResolvedValueOnce({
      user: {
        id: 'u-admin',
        username: 'manager',
        role: 'admin',
        permissions: ['dashboard'],
        displayName: 'Manager',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
      },
      settings: {
        storeName: 'My Store',
        theme: 'light',
      },
      security: {
        mustChangePassword: false,
        usingDefaultAdminPassword: false,
      },
    });

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('رقم الهاتف المحمول أو اسم المستخدم'), '   manager   ');
    await user.type(screen.getByLabelText('كلمة المرور'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await screen.findByText('/');
    expect(loginMock).toHaveBeenCalledWith({ username: 'manager', password: 'correct-password' });
  });

  it('clears the previous submit error as soon as the user edits the form again', async () => {
    loginMock.mockRejectedValueOnce(new Error('بيانات الدخول غير صحيحة'));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('رقم الهاتف المحمول أو اسم المستخدم'), 'manager');
    await user.type(screen.getByLabelText('كلمة المرور'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByText('بيانات الدخول غير صحيحة')).toBeInTheDocument();

    await user.type(screen.getByLabelText('رقم الهاتف المحمول أو اسم المستخدم'), 'x');

    await waitFor(() => {
      expect(screen.queryByText('بيانات الدخول غير صحيحة')).not.toBeInTheDocument();
    });
  });

  it('shows the tenant switcher modal when account belongs to multiple tenants and allows selecting one', async () => {
    const { ApiError } = await import('@/lib/http');
    loginMock.mockRejectedValueOnce(
      new ApiError('بيانات الدخول مسجلة لدى أكثر من منشأة', 401, {
        code: 'MULTIPLE_TENANTS',
        details: {
          code: 'MULTIPLE_TENANTS',
          tenants: [
            { id: 't-branch-1', name: 'فرع الرياض الرئيسي', slug: 'riyadh-main' },
            { id: 't-branch-2', name: 'فرع جدة كورنيش', slug: 'jeddah-corniche' },
          ],
        },
      }),
    );

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('رقم الهاتف المحمول أو اسم المستخدم'), '01012345678');
    await user.type(screen.getByLabelText('كلمة المرور'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    // Tenant Switcher Modal should appear
    expect(await screen.findByText('اختر المنشأة للمتابعة')).toBeInTheDocument();
    expect(screen.getByText('فرع الرياض الرئيسي')).toBeInTheDocument();
    expect(screen.getByText('فرع جدة كورنيش')).toBeInTheDocument();

    // Setup successful login response on selection
    loginMock.mockResolvedValueOnce({ ok: true });
    meMock.mockResolvedValueOnce({
      user: {
        id: 'u-user1',
        username: '01012345678',
        role: 'admin',
        permissions: ['dashboard'],
        tenantId: 't-branch-2',
      },
      settings: { storeName: 'فرع جدة كورنيش', theme: 'light' },
      security: {},
    });

    // Click on Jeddah branch
    await user.click(screen.getByText('فرع جدة كورنيش'));

    await waitFor(() => {
      expect(loginMock).toHaveBeenLastCalledWith({
        username: '01012345678',
        password: 'secret123',
        companyCode: 't-branch-2',
      });
    });
  });

  it('allows manually entering a company code before submitting login', async () => {
    loginMock.mockResolvedValueOnce({ ok: true });
    meMock.mockResolvedValueOnce({
      user: {
        id: 'u-emp',
        username: 'employee1',
        role: 'user',
        permissions: ['pos'],
        tenantId: 'custom-tenant-99',
      },
      settings: { storeName: 'Store 99', theme: 'light' },
      security: {},
    });

    const user = userEvent.setup();
    renderLogin();

    // Click to open company code input
    await user.click(screen.getByRole('button', { name: '+ تحديد كود منشأة معين' }));

    await user.type(screen.getByLabelText('كود أو معرف المنشأة (اختياري)'), 'custom-tenant-99');
    await user.type(screen.getByLabelText('رقم الهاتف المحمول أو اسم المستخدم'), 'employee1');
    await user.type(screen.getByLabelText('كلمة المرور'), 'emp-pass');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        username: 'employee1',
        password: 'emp-pass',
        companyCode: 'custom-tenant-99',
      });
    });
  });
});
