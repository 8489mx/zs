import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateAuditLogs } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { settingsApi, type ManagedUserRecord } from '@/features/settings/api/settings.api';
import { normalizeUserRecord } from '@/features/settings/components/user-management.shared';
import type { UserMutationAction } from '@/features/settings/hooks/user-management/user-management.types';
import { useAuthStore } from '@/stores/auth-store';

export function useUserManagementMutation({
  draft,
  setupMode,
  setupStepKey,
  currentUserId,
  loadUser,
  startNewUser,
  onSetupAdvance,
  setDeleteDialogOpen,
  setSelectedIds,
  setStatusMessage,
  setUserSearch,
  setUserFilter,
  setPage,
}: {
  draft: ManagedUserRecord;
  setupMode: boolean;
  setupStepKey: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null;
  currentUserId: string;
  loadUser: (user?: ManagedUserRecord | null) => void;
  startNewUser: (role?: 'super_admin' | 'admin' | 'cashier') => void;
  onSetupAdvance?: () => void;
  setDeleteDialogOpen: (value: boolean) => void;
  setSelectedIds: (value: string[]) => void;
  setStatusMessage: (value: string) => void;
  setUserSearch: (value: string) => void;
  setUserFilter: (value: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked') => void;
  setPage: (value: number) => void;
}) {
  const queryClient = useQueryClient();
  const updateSessionUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: async (action: UserMutationAction) => {
      switch (action.type) {
        case 'create': return settingsApi.createUser(action.payload);
        case 'update': return settingsApi.updateUser(action.id, action.payload);
        case 'delete': return settingsApi.deleteUser(action.id);
        case 'unlock': return settingsApi.unlockUser(action.id);
      }
    },
    onSuccess: async (payload, action) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settingsUsers }),
        invalidateAuditLogs(queryClient),
      ]);
      const nextUsers = Array.isArray(payload.users) ? payload.users.map(normalizeUserRecord) : [];
      const isSelfUpdate = action.type === 'update' && String(action.id || '') === String(currentUserId || '');
      const rotatedOwnPassword = isSelfUpdate && Boolean(String(draft.password || '').trim());

      if (action.type === 'delete') {
        const nextSelected = nextUsers.find((user) => user.isActive !== false) || nextUsers[0] || null;
        if (nextSelected) loadUser(nextSelected); else startNewUser('cashier');
        setDeleteDialogOpen(false);
        setSelectedIds([]);
        setStatusMessage('تم حذف المستخدم المحدد.');
        return;
      }

      const payloadUser = 'user' in payload ? payload.user : null;
      const updatedUser = payloadUser ? normalizeUserRecord(payloadUser) : null;
      const selectedUser = updatedUser
        || nextUsers.find((user) => String(user.id) === String(action.type === 'create' ? payloadUser?.id || '' : action.id))
        || nextUsers.find((user) => user.username === draft.username)
        || nextUsers[0]
        || null;

      if (selectedUser) {
        if (action.type === 'create') {
          setUserSearch(selectedUser.username || '');
          setUserFilter('all');
          setPage(1);
        }
        loadUser(selectedUser);

        if (isSelfUpdate) {
          updateSessionUser({
            username: selectedUser.username || '',
            displayName: selectedUser.name || selectedUser.username || '',
            role: selectedUser.role,
            permissions: Array.isArray(selectedUser.permissions) ? [...selectedUser.permissions] : [],
            branchIds: Array.isArray(selectedUser.branchIds) ? [...selectedUser.branchIds] : [],
            defaultBranchId: selectedUser.defaultBranchId || '',
            mustChangePassword: selectedUser.mustChangePassword === true,
          });
        }
      }

      if (rotatedOwnPassword) {
        updateSessionUser({ mustChangePassword: false, usingDefaultAdminPassword: false });
      }

      setStatusMessage(action.type === 'create' ? 'تمت إضافة المستخدم بنجاح.' : action.type === 'unlock' ? 'تم فتح قفل المستخدم وإعادة ضبط محاولات الدخول.' : 'تم حفظ المستخدم بنجاح.');
      if (setupMode && action.type === 'create' && setupStepKey === 'admin-user') onSetupAdvance?.();
      if (setupMode && isSelfUpdate && setupStepKey === 'secure-account' && rotatedOwnPassword) onSetupAdvance?.();
    },
    onError: (error) => setStatusMessage(error instanceof Error ? error.message : 'تعذرت العملية على المستخدم'),
  });
}
