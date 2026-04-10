import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useUserManagementMutation } from '@/features/settings/hooks/user-management/useUserManagementMutation';
import { useAuthStore } from '@/stores/auth-store';

const { createUserMock, updateUserMock, deleteUserMock, unlockUserMock } = vi.hoisted(() => ({
  createUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  deleteUserMock: vi.fn(),
  unlockUserMock: vi.fn(),
}));

vi.mock('@/features/settings/api/settings.api', () => ({
  settingsApi: {
    createUser: createUserMock,
    updateUser: updateUserMock,
    deleteUser: deleteUserMock,
    unlockUser: unlockUserMock,
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

describe('useUserManagementMutation', () => {
  it('syncs the current session user after securing the bootstrap account', async () => {
    useAuthStore.setState({
      user: {
        id: 'u-root',
        username: 'root',
        role: 'super_admin',
        permissions: ['dashboard'],
        displayName: 'Bootstrap Root',
        branchIds: ['b-1'],
        defaultBranchId: 'b-1',
        mustChangePassword: true,
        usingDefaultAdminPassword: true,
      },
      storeName: 'Z Systems',
      theme: 'light',
      initialized: true,
    });

    updateUserMock.mockResolvedValueOnce({
      ok: true,
      user: {
        id: 'u-root',
        username: 'root-secure',
        role: 'super_admin',
        permissions: ['dashboard', 'settings'],
        name: 'Root Secured',
        branchIds: ['b-2'],
        defaultBranchId: 'b-2',
        isActive: true,
        mustChangePassword: false,
      },
      users: [
        {
          id: 'u-root',
          username: 'root-secure',
          role: 'super_admin',
          permissions: ['dashboard', 'settings'],
          name: 'Root Secured',
          branchIds: ['b-2'],
          defaultBranchId: 'b-2',
          isActive: true,
          mustChangePassword: false,
        },
      ],
    });

    const loadUser = vi.fn();
    const onSetupAdvance = vi.fn();

    const { result } = renderHook(() => useUserManagementMutation({
      draft: {
        id: 'u-root',
        username: 'root-secure',
        password: 'new-super-secret-123',
        role: 'super_admin',
        permissions: ['dashboard', 'settings'],
        name: 'Root Secured',
        branchIds: ['b-2'],
        defaultBranchId: 'b-2',
        isActive: true,
        mustChangePassword: false,
      },
      setupMode: true,
      setupStepKey: 'secure-account',
      currentUserId: 'u-root',
      loadUser,
      startNewUser: vi.fn(),
      onSetupAdvance,
      setDeleteDialogOpen: vi.fn(),
      setSelectedIds: vi.fn(),
      setStatusMessage: vi.fn(),
      setUserSearch: vi.fn(),
      setUserFilter: vi.fn(),
      setPage: vi.fn(),
    }), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        type: 'update',
        id: 'u-root',
        payload: {
          id: 'u-root',
          username: 'root-secure',
          password: 'new-super-secret-123',
          role: 'super_admin',
          permissions: ['dashboard', 'settings'],
          name: 'Root Secured',
          branchIds: ['b-2'],
          defaultBranchId: 'b-2',
          isActive: true,
          mustChangePassword: false,
        },
      });
    });

    await waitFor(() => {
      expect(useAuthStore.getState().user).toMatchObject({
        username: 'root-secure',
        displayName: 'Root Secured',
        permissions: ['dashboard', 'settings'],
        branchIds: ['b-2'],
        defaultBranchId: 'b-2',
        mustChangePassword: false,
        usingDefaultAdminPassword: false,
      });
    });

    expect(loadUser).toHaveBeenCalled();
    expect(onSetupAdvance).toHaveBeenCalledTimes(1);
  });
});
