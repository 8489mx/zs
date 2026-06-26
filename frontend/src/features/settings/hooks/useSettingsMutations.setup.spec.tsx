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

const baseSettingsMutationValues = {
  storeName: 'My Store',
  brandName: 'My Store',
  phone: '',
  address: '',
  lowStockThreshold: 5,
  invoiceFooter: '',
  invoiceQR: '',
  taxNumber: '',
  taxRate: 0,
  taxMode: 'exclusive' as const,
  paperSize: 'a4' as const,
  managerPin: '',
  autoBackup: 'on' as const,
  accentColor: '#2563eb',
  logoData: '',
  currentBranchId: '',
  currentLocationId: '',
  clothingModuleEnabled: false,
  defaultProductKind: 'standard' as const,
  defaultPosMode: 'scanner' as const,
  allowNegativeStockSales: false,
  weightedBarcodeEnabled: false,
  weightedBarcodePrefix: '21',
  weightedBarcodeProductCodeLength: 5,
  weightedBarcodeWeightDigits: 5,
  weightedBarcodeWeightDecimals: 3,
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
  printNumberFormat: 'arabic' as const,
  uiLanguage: 'ar' as const,
  currency: 'EGP',
  timezone: 'Africa/Cairo',
  dateFormat: 'yyyy-MM-dd' as const,
  timeFormat: '24h' as const,
  whatsappLinkMode: 'wa_me' as const,
};

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
      await result.current.mutateAsync(baseSettingsMutationValues);
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
      ...baseSettingsMutationValues,
      storeName: 'Broken Store',
      brandName: 'Broken Store',
    })).rejects.toThrow('تعذر حفظ الإعدادات');

    expect(onSetupAdvance).not.toHaveBeenCalled();
  });
});
