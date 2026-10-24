import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http';
import { useBootstrapAuth } from '@/features/auth/useBootstrapAuth';
import { DEFAULT_STORE_NAME, DEFAULT_THEME, getStoredOfflineSession, useAuthStore } from '@/stores/auth-store';
import { createTestQueryClient } from '@/test/test-query-client';

const { meMock, activationStatusMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
  activationStatusMock: vi.fn(),
}));

vi.mock('@/shared/api/auth', () => ({
  authApi: {
    me: meMock,
  },
}));

vi.mock('@/shared/api/activation', () => ({
  activationApi: {
    status: activationStatusMock,
  },
}));

function BootstrapHarness() {
  useBootstrapAuth();
  return null;
}

function createWrapper() {
  const queryClient = createTestQueryClient();

  return {
    queryClient,
    Wrapper({ children }: PropsWithChildren) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

describe('useBootstrapAuth', () => {
  beforeEach(() => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    localStorage.clear();
    useAuthStore.getState().clearSession();
    useAuthStore.setState({ initialized: false, appGate: 'loading', activationStatus: null });
    activationStatusMock.mockReset();
    meMock.mockReset();
    activationStatusMock.mockResolvedValue({
      activationRequired: false,
      activated: true,
      setupRequired: false,
      machineId: null,
      customerName: null,
      activatedAt: null,
      licenseMode: 'desktop',
    });
  });

  afterEach(() => {
    useAuthStore.getState().clearSession();
    vi.restoreAllMocks();
  });

  function seedOfflineSession() {
    useAuthStore.getState().setSession({
      user: { id: 'u-admin', username: 'manager', role: 'admin', permissions: ['dashboard'],
        displayName: 'Manager', branchIds: ['b-1'], defaultBranchId: 'b-1' },
      storeName: 'My Store', theme: 'dark',
    });
    useAuthStore.setState({ user: null, initialized: false, appGate: 'loading' });
  }

  it.each([401, 403])('rejects stored identity on me()=%s even if activation status fails', async (status) => {
    seedOfflineSession();
    activationStatusMock.mockRejectedValueOnce(new Error('status unavailable'));
    meMock.mockRejectedValueOnce(new ApiError('rejected', status));
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['private', 'dashboard'], { cached: true });
    render(<BootstrapHarness />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(useAuthStore.getState().appGate).toBe('login');
      expect(useAuthStore.getState().user).toBeNull();
      expect(getStoredOfflineSession()).toBeNull();
      expect(queryClient.getQueryData(['private', 'dashboard'])).toBeUndefined();
    });
  });

  it('preserves offline operation when both requests fail without an auth rejection', async () => {
    seedOfflineSession();
    activationStatusMock.mockRejectedValueOnce(new TypeError('network unavailable'));
    meMock.mockRejectedValueOnce(new TypeError('network unavailable'));
    const { Wrapper } = createWrapper();
    render(<BootstrapHarness />, { wrapper: Wrapper });
    await waitFor(() => expect(meMock).toHaveBeenCalled());
    expect(useAuthStore.getState().appGate).toBe('ready');
    expect(useAuthStore.getState().user?.username).toBe('manager');
  });

  it.each(['activation', 'setup'] as const)('keeps the desktop %s gate when no session exists yet', async (gate) => {
    const status = {
      activationRequired: gate === 'activation', activated: gate !== 'activation',
      setupRequired: gate === 'setup', deploymentMode: 'desktop',
    };
    activationStatusMock.mockResolvedValueOnce(status);
    meMock.mockRejectedValueOnce(new ApiError('no session yet', 401));
    const { Wrapper } = createWrapper();
    render(<BootstrapHarness />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(useAuthStore.getState().appGate).toBe(gate);
      expect(useAuthStore.getState().activationStatus).toEqual(status);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  it('clears cached data and resets the auth store when the bootstrap me() call returns 401', async () => {
    meMock.mockRejectedValueOnce(new ApiError('expired', 401));

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
      initialized: false,
    });

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(['private', 'dashboard'], { leaked: true });

    render(<BootstrapHarness />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(useAuthStore.getState().initialized).toBe(true);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().storeName).toBe(DEFAULT_STORE_NAME);
      expect(useAuthStore.getState().theme).toBe(DEFAULT_THEME);
      expect(queryClient.getQueryData(['private', 'dashboard'])).toBeUndefined();
    });
  });
});
