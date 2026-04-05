import { useCallback, useMemo, useState } from 'react';
import { settingsApi, type ManagedUserRecord } from '@/features/settings/api/settings.api';
import { blankUserDraft, normalizeUserRecord } from '@/features/settings/components/user-management.shared';
import {
  applyRolePermissions,
  buildTemplateDraft,
  toggleDraftBranch,
  toggleDraftPermission,
  validateUserDraft,
} from '@/features/settings/hooks/useUserManagement.helpers';
import { useSettingsUsersPageQuery } from '@/features/settings/hooks/useSettingsUsersPageQuery';
import { runUserBulkAction } from '@/features/settings/hooks/user-management/user-management.bulk-actions';
import { useUserManagementEffects } from '@/features/settings/hooks/user-management/useUserManagementEffects';
import { useUserManagementMutation } from '@/features/settings/hooks/user-management/useUserManagementMutation';
import type { UserBulkAction } from '@/features/settings/hooks/user-management/user-management.types';
import { useAuthStore } from '@/stores/auth-store';

export type { UserBulkAction } from '@/features/settings/hooks/user-management/user-management.types';

export function useUserManagementController({
  setupMode = false,
  setupStepKey = null,
  onSetupAdvance,
}: {
  setupMode?: boolean;
  setupStepKey?: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null;
  onSetupAdvance?: () => void;
}) {
  const currentUserId = useAuthStore((state) => state.user?.id || '');
  const currentUserRole = useAuthStore((state) => state.user?.role || 'cashier');
  const [selectedUserKey, setSelectedUserKey] = useState('');
  const [draft, setDraft] = useState<ManagedUserRecord>(() => blankUserDraft('cashier'));
  const [statusMessage, setStatusMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bulkAction, setBulkAction] = useState<UserBulkAction | null>(null);
  const usersQuery = useSettingsUsersPageQuery({ page, pageSize, search: userSearch, filter: userFilter });

  const usersRows = useMemo(() => {
    const data = usersQuery.data as Record<string, unknown> | undefined;
    const rows = (data?.rows || data?.users || []) as ManagedUserRecord[];
    return Array.isArray(rows) ? rows : [];
  }, [usersQuery.data]);

  const managedUsers = useMemo(() => usersRows.map(normalizeUserRecord), [usersRows]);
  const selectedSourceUser = useMemo(() => managedUsers.find((user) => String(user.id) === selectedUserKey) || null, [managedUsers, selectedUserKey]);

  const userSummary = useMemo(() => {
    const summary = (usersQuery.data as Record<string, any> | undefined)?.summary || {};
    return {
      totalItems: Number(summary.totalItems ?? summary.total ?? managedUsers.length ?? 0),
      superAdmins: Number(summary.superAdmins ?? 0),
      admins: Number(summary.admins ?? 0),
      cashiers: Number(summary.cashiers ?? 0),
      inactive: Number(summary.inactive ?? 0),
      locked: Number(summary.locked ?? 0),
      activePrivilegedUsers: Number(summary.activePrivilegedUsers ?? 0),
    };
  }, [usersQuery.data, managedUsers.length]);

  const selectedUsers = useMemo(() => managedUsers.filter((user) => selectedIds.includes(String(user.id || user.username))), [managedUsers, selectedIds]);
  const operationalAdmins = useMemo(() => managedUsers.filter((user) => user.isActive !== false && user.role === 'admin'), [managedUsers]);

  const loadUser = useCallback((user?: ManagedUserRecord | null) => {
    if (!user) return;
    setSelectedUserKey(user.id ? String(user.id) : '__new__');
    setDraft(normalizeUserRecord(user));
    setStatusMessage('');
  }, []);

  const startNewUser = useCallback((role: 'super_admin' | 'admin' | 'cashier' = 'cashier') => {
    setSelectedUserKey('__new__');
    setDraft(blankUserDraft(role));
    setStatusMessage('');
  }, []);

  function applyTemplate(templateKey: 'cashier' | 'owner' | 'inventory' | 'accountant') {
    const template = buildTemplateDraft(draft, templateKey);
    setDraft(template.nextDraft);
    setStatusMessage(`تم تطبيق ${template.label}.`);
  }

  useUserManagementEffects({
    managedUsers,
    selectedUserKey,
    setSelectedUserKey,
    loadUser,
    setDraft,
    setPage,
    setSelectedIds,
    userSearch,
    userFilter,
    setupMode,
    setupStepKey,
    currentUserId,
    operationalAdminsCount: operationalAdmins.length,
    startNewUser,
  });

  const actionMutation = useUserManagementMutation({
    draft,
    setupMode,
    setupStepKey,
    currentUserId,
    loadUser,
    startNewUser,
    onSetupAdvance,
    setDeleteDialogOpen,
    setSelectedIds: (value) => setSelectedIds(value),
    setStatusMessage,
    setUserSearch,
    setUserFilter,
    setPage,
  });

  const canDeleteSelected = Boolean(draft.id && managedUsers.length > 1 && String(draft.id) !== currentUserId);
  const canUnlockSelected = Boolean(draft.id && draft.lockedUntil);
  const isCurrentUserSelected = Boolean(draft.id && String(draft.id) === currentUserId);

  function applyDefaultPermissions(role: 'super_admin' | 'admin' | 'cashier') {
    setDraft((current) => ({ ...current, role, permissions: applyRolePermissions(role) }));
  }

  function togglePermission(permission: string) {
    setDraft((current) => toggleDraftPermission(current, permission));
  }

  function toggleBranch(branchId: string) {
    setDraft((current) => toggleDraftBranch(current, branchId));
  }

  function resetSelectedDraft() {
    if (selectedUserKey === '__new__') {
      startNewUser(draft.role);
      return;
    }
    if (selectedSourceUser) loadUser(selectedSourceUser);
  }

  async function saveCurrentDraft() {
    try {
      setStatusMessage('');
      const normalizedDraft = validateUserDraft({ draft, managedUsers });
      await actionMutation.mutateAsync(normalizedDraft.id ? { type: 'update', id: String(normalizedDraft.id), payload: normalizedDraft } : { type: 'create', payload: normalizedDraft });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر حفظ المستخدم');
    }
  }

  async function unlockSelectedUser() {
    if (!draft.id) return;
    try {
      setStatusMessage('');
      await actionMutation.mutateAsync({ type: 'unlock', id: String(draft.id) });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر فتح قفل المستخدم');
    }
  }

  async function deleteSelectedUser() {
    if (!draft.id) return;
    try {
      setStatusMessage('');
      await actionMutation.mutateAsync({ type: 'delete', id: String(draft.id) });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر حذف المستخدم');
    }
  }

  async function copyPermissions() {
    try {
      await navigator.clipboard?.writeText((draft.permissions || []).join(', '));
      setStatusMessage('تم نسخ الصلاحيات الحالية.');
    } catch {
      setStatusMessage('تعذر نسخ الصلاحيات من المتصفح الحالي.');
    }
  }

  async function runBulkAction() {
    try {
      setStatusMessage('');
      const hasRun = await runUserBulkAction({
        bulkAction,
        selectedUsers,
        currentUserId,
        userSummary,
        setStatusMessage,
        settingsApi,
      });
      if (!hasRun) return;
      await usersQuery.refetch();
      setBulkAction(null);
      setSelectedIds([]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'تعذر تنفيذ العملية الجماعية على المستخدمين');
    }
  }

  return {
    currentUserRole,
    usersQuery,
    managedUsers,
    userSummary,
    selectedUsers,
    selectedUserKey,
    setSelectedUserKey,
    draft,
    setDraft,
    statusMessage,
    userSearch,
    setUserSearch,
    userFilter,
    setUserFilter,
    selectedIds,
    setSelectedIds,
    page,
    setPage,
    pageSize,
    setPageSize,
    bulkAction,
    setBulkAction,
    deleteDialogOpen,
    setDeleteDialogOpen,
    canDeleteSelected,
    canUnlockSelected,
    isCurrentUserSelected,
    actionMutation,
    loadUser,
    startNewUser,
    applyTemplate,
    applyDefaultPermissions,
    togglePermission,
    toggleBranch,
    resetSelectedDraft,
    saveCurrentDraft,
    unlockSelectedUser,
    deleteSelectedUser,
    copyPermissions,
    runBulkAction,
  };
}
