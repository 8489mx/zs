import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { APP_NETWORK_STATE_EVENT, APP_UNAUTHORIZED_EVENT } from '@/lib/http';
import { SystemStatusBanner } from '@/shared/system/system-status-banner';
import { createTestQueryClient } from '@/test/test-query-client';
import { DEFAULT_STORE_NAME, DEFAULT_THEME, useAuthStore } from '@/stores/auth-store';

function renderBanner(initialEntry = '/reports') {
  const queryClient = createTestQueryClient();
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="*" element={<SystemStatusBanner />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}

describe('SystemStatusBanner', () => {
  it('redirects to the login screen, clears the session, and flushes cached data when the app emits an unauthorized event', async () => {
    useAuthStore.setState({
      user: {
        id: 'u-admin',
        username: 'manager',
        role: 'admin',
        permissions: ['dashboard'],
        displayName: 'Manager',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
      },
      storeName: 'My Store',
      theme: 'dark',
      initialized: true,
    });

    const { queryClient } = renderBanner('/reports');
    queryClient.setQueryData(['private', 'summary'], { value: 19 });

    await act(async () => {
      window.dispatchEvent(new CustomEvent(APP_UNAUTHORIZED_EVENT, { detail: { path: '/reports', status: 401 } }));
    });

    expect(await screen.findByText('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.')).toBeInTheDocument();
    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().storeName).toBe(DEFAULT_STORE_NAME);
      expect(useAuthStore.getState().theme).toBe(DEFAULT_THEME);
      expect(queryClient.getQueryData(['private', 'summary'])).toBeUndefined();
    });
  });

  it('reflects offline network-state events in the UI', async () => {
    renderBanner('/dashboard');
    await act(async () => {
      window.dispatchEvent(new CustomEvent(APP_NETWORK_STATE_EVENT, { detail: { online: false, path: '/health' } }));
    });

    expect(await screen.findByText('لا يوجد اتصال بالشبكة حاليًا. بعض العمليات قد لا تعمل حتى يعود الاتصال.')).toBeInTheDocument();
  });

  it('shows the signed-out reason on the login route', async () => {
    renderBanner('/login?reason=signed-out');
    expect(await screen.findByText('تم تسجيل الخروج من النظام.')).toBeInTheDocument();
  });
});
