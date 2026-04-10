import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';
import { useAuthStore } from '@/stores/auth-store';
import { createTestQueryClient } from '@/test/test-query-client';

const { branchesMock, locationsMock, usersMock, settingsMock } = vi.hoisted(() => ({
  branchesMock: vi.fn(),
  locationsMock: vi.fn(),
  usersMock: vi.fn(),
  settingsMock: vi.fn(),
}));

vi.mock('@/services/reference-data.api', () => ({
  referenceDataApi: {
    branches: branchesMock,
    locations: locationsMock,
  },
}));

vi.mock('@/features/settings/api/settings.api', () => ({
  settingsApi: {
    users: usersMock,
    settings: settingsMock,
  },
}));

function createWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFirstRunSetupFlow', () => {
  it('enables the setup flow for the bootstrap super admin', async () => {
    branchesMock.mockResolvedValueOnce([]);
    locationsMock.mockResolvedValueOnce([]);
    usersMock.mockResolvedValueOnce([]);
    settingsMock.mockResolvedValueOnce({ storeName: 'Z Systems' });

    useAuthStore.setState({
      user: {
        id: 'u-root',
        username: 'root',
        role: 'super_admin',
        permissions: [],
        displayName: 'Bootstrap Admin',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
      },
      storeName: 'Z Systems',
      theme: 'light',
      initialized: true,
    });

    const { result } = renderHook(() => useFirstRunSetupFlow(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.enabled).toBe(true);
      expect(result.current.currentStep?.key).toBe('store');
    });

    expect(branchesMock).toHaveBeenCalledTimes(1);
    expect(usersMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the setup flow open for the secure-account step until the default bootstrap password is changed', async () => {
    branchesMock.mockResolvedValueOnce([{ id: 'b-1', name: 'Main Branch' }]);
    locationsMock.mockResolvedValueOnce([{ id: 'l-1', name: 'Main Stock', branchId: 'b-1' }]);
    usersMock.mockResolvedValueOnce([{ id: 'u-admin', username: 'manager', role: 'admin', permissions: ['dashboard'], name: 'Manager', branchIds: ['b-1'], defaultBranchId: 'b-1', isActive: true }]);
    settingsMock.mockResolvedValueOnce({ storeName: 'My Store' });

    useAuthStore.setState({
      user: {
        id: 'u-root',
        username: 'root',
        role: 'super_admin',
        permissions: [],
        displayName: 'Bootstrap Admin',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
        mustChangePassword: true,
        usingDefaultAdminPassword: true,
      },
      storeName: 'My Store',
      theme: 'light',
      initialized: true,
    });

    const { result } = renderHook(() => useFirstRunSetupFlow(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.currentStep?.key).toBe('secure-account');
      expect(result.current.completedCount).toBe(3);
      expect(result.current.totalCount).toBe(4);
    });

    expect(result.current.steps.map((step) => step.key)).toEqual(['store', 'branch-location', 'admin-user', 'secure-account']);
    expect(result.current.currentStep?.to).toBe('/settings/users?setup=1');
  });

  it('keeps the setup flow disabled for operational admins', async () => {
    useAuthStore.setState({
      user: {
        id: 'u-admin',
        username: 'manager',
        role: 'admin',
        permissions: ['settings'],
        displayName: 'Operational Admin',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
      },
      storeName: 'My Store',
      theme: 'light',
      initialized: true,
    });

    const { result } = renderHook(() => useFirstRunSetupFlow(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.enabled).toBe(false);
    });

    expect(branchesMock).not.toHaveBeenCalled();
    expect(usersMock).not.toHaveBeenCalled();
  });
});
