import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSettingsPageController } from '@/features/settings/pages/useSettingsPageController';
import { useAuthStore } from '@/stores/auth-store';

const {
  navigateMock,
  flowMock,
  statusMock,
  getPostLoginRouteMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  flowMock: vi.fn(),
  statusMock: vi.fn(),
  getPostLoginRouteMock: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams('setup=1')],
}));

vi.mock('@/shared/hooks/use-permission', () => ({
  useHasAnyPermission: () => true,
}));

vi.mock('@/features/settings/hooks/useSettingsAdminWorkspace', () => ({
  useSettingsAdminWorkspace: () => ({
    settings: { storeName: 'My Store' },
    branches: [],
    locations: [],
    settingsQuery: { isLoading: false, isError: false },
    branchesQuery: { isLoading: false, isError: false },
    locationsQuery: { isLoading: false, isError: false },
    diagnosticsQuery: { data: undefined, isLoading: false, isError: false },
    maintenanceQuery: { data: undefined, isLoading: false, isError: false },
    launchQuery: { data: undefined, isLoading: false, isError: false },
    uatQuery: { data: undefined, isLoading: false, isError: false },
    operationalQuery: { data: undefined, isLoading: false, isError: false },
    supportQuery: { data: undefined, isLoading: false, isError: false },
    backupSnapshotsQuery: { data: [], isLoading: false, isError: false },
    cleanupMutation: { isPending: false },
    reconcileCustomersMutation: { isPending: false },
    reconcileSuppliersMutation: { isPending: false },
    reconcileAllMutation: { isPending: false },
    importProductsMutation: { isPending: false },
    importCustomersMutation: { isPending: false },
    importSuppliersMutation: { isPending: false },
    importOpeningStockMutation: { isPending: false },
    backupBusy: false,
    backupSelectedFileName: '',
    backupMessage: '',
    backupMessageKind: 'success',
    backupResult: null,
    supportCopyStatus: '',
    restoreSnapshotId: '',
    handleBackupDownload: vi.fn(),
    handleBackupFile: vi.fn(),
    handleSnapshotDownload: vi.fn(),
    handleSnapshotRestore: vi.fn(),
    handleCopySupportSnapshot: vi.fn(),
  }),
}));

vi.mock('@/features/settings/hooks/useSettingsMutations', () => ({
  useDeleteBranchMutation: () => ({ isPending: false, error: null }),
  useDeleteLocationMutation: () => ({ isPending: false, error: null }),
  useUpdateBranchMutation: () => ({ isPending: false, error: null }),
  useUpdateLocationMutation: () => ({ isPending: false, error: null }),
}));

vi.mock('@/features/settings/hooks/useFirstRunSetupFlow', () => ({
  useFirstRunSetupFlow: flowMock,
}));

vi.mock('@/features/settings/hooks/useSettingsReferenceFilters', () => ({
  useSettingsReferenceFilters: () => ({
    filteredBranches: [],
    filteredLocations: [],
    branchSearch: '',
    locationSearch: '',
    branchFilter: 'all',
    locationFilter: 'all',
    setBranchSearch: vi.fn(),
    setLocationSearch: vi.fn(),
    setBranchFilter: vi.fn(),
    setLocationFilter: vi.fn(),
    resetBranchFilters: vi.fn(),
    resetLocationFilters: vi.fn(),
  }),
}));

vi.mock('@/shared/api/activation', () => ({
  activationApi: {
    status: statusMock,
  },
}));

vi.mock('@/app/router/post-login-route', () => ({
  getPostLoginRoute: getPostLoginRouteMock,
}));

vi.mock('@/features/settings/pages/settings-page.helpers', () => ({
  buildSettingsGuidanceCards: () => [],
  getSettingsConfirmDialogMeta: () => null,
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

describe('useSettingsPageController setup flow', () => {
  it('advances to the next required setup step after refreshing the flow state', async () => {
    navigateMock.mockReset();
    flowMock.mockReset();
    statusMock.mockReset();
    getPostLoginRouteMock.mockReset();
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
      appGate: 'setup',
      activationStatus: null,
    });
    flowMock.mockReturnValue({
      enabled: true,
      steps: [],
      currentStep: { key: 'store', title: 'بيانات المنشأة', section: 'core', to: '/settings/core?setup=1', done: false, ctaLabel: '', nextLabel: '' },
      nextStep: { key: 'branch-location', title: 'الفرع والمخزن الأساسي', section: 'reference', to: '/settings/reference?setup=1', done: false, ctaLabel: '', nextLabel: '' },
      previousStep: null,
      currentStepIndex: 0,
      completedCount: 0,
      totalCount: 4,
      isComplete: false,
      isLoading: false,
      isError: false,
      resolvedStoreName: 'Z Systems',
      refresh: vi.fn().mockResolvedValue({
        currentStep: { to: '/settings/reference?setup=1' },
        resolvedStoreName: 'My Store',
      }),
    });
    statusMock.mockResolvedValue({
      deploymentMode: 'server',
      activationRequired: false,
      activated: true,
      setupRequired: true,
      machineId: null,
      customerName: null,
      activatedAt: null,
      expiresAt: null,
    });

    const { result } = renderHook(() => useSettingsPageController('core'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleSetupAdvance();
    });

    expect(navigateMock).toHaveBeenCalledWith('/settings/reference?setup=1', { replace: true });
    expect(useAuthStore.getState().appGate).toBe('setup');
  });

  it('exits the setup flow to the resolved landing route after the final successful step', async () => {
    navigateMock.mockReset();
    flowMock.mockReset();
    statusMock.mockReset();
    getPostLoginRouteMock.mockReset();
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
      storeName: 'My Store',
      theme: 'light',
      initialized: true,
      appGate: 'setup',
      activationStatus: null,
    });
    getPostLoginRouteMock.mockReturnValue('/');
    flowMock.mockReturnValue({
      enabled: true,
      steps: [],
      currentStep: { key: 'secure-account', title: 'تأمين حساب التثبيت', section: 'users', to: '/settings/users?setup=1', done: false, ctaLabel: '', nextLabel: '' },
      nextStep: null,
      previousStep: { key: 'admin-user', title: 'مستخدم الإدارة اليومي', section: 'users', to: '/settings/users?setup=1', done: true, ctaLabel: '', nextLabel: '' },
      currentStepIndex: 3,
      completedCount: 3,
      totalCount: 4,
      isComplete: false,
      isLoading: false,
      isError: false,
      resolvedStoreName: 'My Store',
      refresh: vi.fn().mockResolvedValue({
        currentStep: null,
        resolvedStoreName: 'My Store',
      }),
    });
    statusMock.mockResolvedValue({
      deploymentMode: 'server',
      activationRequired: false,
      activated: true,
      setupRequired: false,
      machineId: null,
      customerName: null,
      activatedAt: null,
      expiresAt: null,
    });

    const { result } = renderHook(() => useSettingsPageController('users'), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.handleSetupAdvance();
    });

    expect(getPostLoginRouteMock).toHaveBeenCalledWith(useAuthStore.getState().user, 'My Store');
    expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    expect(useAuthStore.getState().appGate).toBe('ready');
  });
});
