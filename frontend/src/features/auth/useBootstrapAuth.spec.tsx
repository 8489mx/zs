import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http';
import { useBootstrapAuth } from '@/features/auth/useBootstrapAuth';
import { DEFAULT_STORE_NAME, DEFAULT_THEME, useAuthStore } from '@/stores/auth-store';
import { createTestQueryClient } from '@/test/test-query-client';

const { meMock } = vi.hoisted(() => ({
  meMock: vi.fn(),
}));

vi.mock('@/shared/api/auth', () => ({
  authApi: {
    me: meMock,
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
