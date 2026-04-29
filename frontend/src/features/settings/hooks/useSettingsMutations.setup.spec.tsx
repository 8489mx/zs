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

describe('useSettingsUpdateMutation setup flow', () => {
  it('advances the first-run flow only after a successful save', async () => {
    updateMock.mockReset();
    updateMock.mockResolvedValueOnce({ storeName: 'My Store', theme: 'light' });
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
      storeName: 'Z Systems',
      theme: 'light',
      initialized: true,
    });

    const onSetupAdvance = vi.fn();
    const { result } = renderHook(() => useSettingsUpdateMutation(undefined, onSetupAdvance), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        storeName: 'My Store',
        brandName: 'My Store',
        phone: '',
        address: '',
        lowStockThreshold: 5,
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
        clothingModuleEnabled: false,
        defaultProductKind: 'standard',
        defaultPosMode: 'scanner',
        allowNegativeStockSales: false,
        printShowLogo: true,
        printShowPhone: true,
        printShowAddress: true,
        printShowTaxNumber: false,
        printShowCustomer: true,
        printShowCashier: true,
        printShowBranch: true,
        printShowLocation: true,
        printShowTax: true,
        printShowPaymentMethod: true,
        printShowItemSummary: true,
        printShowPaymentBreakdown: true,
        printShowFooter: true,
        printCompactReceipt: true,
      });
    });

    await waitFor(() => {
      expect(onSetupAdvance).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().storeName).toBe('My Store');
    });
  });

  it('does not advance the first-run flow when saving fails', async () => {
    updateMock.mockReset();
    updateMock.mockRejectedValueOnce(new Error('تعذر حفظ الإعدادات'));
    const onSetupAdvance = vi.fn();
    const { result } = renderHook(() => useSettingsUpdateMutation(undefined, onSetupAdvance), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync({
      storeName: 'Broken Store',
      brandName: 'Broken Store',
      phone: '',
      address: '',
      lowStockThreshold: 5,
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
      clothingModuleEnabled: false,
      defaultProductKind: 'standard',
      defaultPosMode: 'scanner',
      allowNegativeStockSales: false,
      printShowLogo: true,
      printShowPhone: true,
      printShowAddress: true,
      printShowTaxNumber: false,
      printShowCustomer: true,
      printShowCashier: true,
      printShowBranch: true,
      printShowLocation: true,
      printShowTax: true,
      printShowPaymentMethod: true,
      printShowItemSummary: true,
      printShowPaymentBreakdown: true,
      printShowFooter: true,
      printCompactReceipt: true,
    })).rejects.toThrow('تعذر حفظ الإعدادات');

    expect(onSetupAdvance).not.toHaveBeenCalled();
  });
});
