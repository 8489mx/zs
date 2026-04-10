import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { useAuthStore } from '@/stores/auth-store';

const { updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(),
}));

vi.mock('@/features/settings/api/settings.api', () => ({
  settingsApi: {
    update: updateMock,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSettingsUpdateMutation', () => {
  it('syncs updated store branding into the active auth session', async () => {
    useAuthStore.setState({
      user: {
        id: 'u-root',
        username: 'root',
        role: 'super_admin',
        permissions: [],
        displayName: 'Root',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
      },
      storeName: 'Legacy Store',
      theme: 'light',
      initialized: true,
    });

    updateMock.mockResolvedValueOnce({
      storeName: 'New Global Store',
      theme: 'dark',
    });

    const { result } = renderHook(() => useSettingsUpdateMutation(undefined), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        storeName: 'New Global Store',
        brandName: 'New Global Store',
        phone: '',
        address: '',
        lowStockThreshold: 0,
        invoiceFooter: '',
        invoiceQR: '',
        taxNumber: '',
        taxRate: 0,
        taxMode: 'exclusive',
        paperSize: 'a4',
        managerPin: '',
        autoBackup: 'on',
        accentColor: '#2563eb',
        logoData: '',
        currentBranchId: '',
        currentLocationId: '',
      } as never);
    });

    await waitFor(() => {
      expect(useAuthStore.getState().storeName).toBe('New Global Store');
      expect(useAuthStore.getState().theme).toBe('dark');
    });
  });
});
