import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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

    await user.type(screen.getByLabelText('اسم المستخدم'), 'root');
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

    await user.type(screen.getByLabelText('اسم المستخدم'), '   manager   ');
    await user.type(screen.getByLabelText('كلمة المرور'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    await screen.findByText('/');
    expect(loginMock).toHaveBeenCalledWith({ username: 'manager', password: 'correct-password' });
  });

  it('clears the previous submit error as soon as the user edits the form again', async () => {
    loginMock.mockRejectedValueOnce(new Error('بيانات الدخول غير صحيحة'));

    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('اسم المستخدم'), 'manager');
    await user.type(screen.getByLabelText('كلمة المرور'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    expect(await screen.findByText('بيانات الدخول غير صحيحة')).toBeInTheDocument();

    await user.type(screen.getByLabelText('اسم المستخدم'), 'x');

    await waitFor(() => {
      expect(screen.queryByText('بيانات الدخول غير صحيحة')).not.toBeInTheDocument();
    });
  });
});
