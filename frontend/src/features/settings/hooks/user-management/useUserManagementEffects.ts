import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';

function joined(values?: string[]) {
  return Array.isArray(values) ? values.join('|') : '';
}

function isSameUserDraft(current: ManagedUserRecord, next: ManagedUserRecord) {
  return (
    String(current.id || '') === String(next.id || '') &&
    String(current.username || '') === String(next.username || '') &&
    String(current.name || '') === String(next.name || '') &&
    current.role === next.role &&
    joined(current.permissions) === joined(next.permissions) &&
    joined(current.branchIds) === joined(next.branchIds) &&
    String(current.defaultBranchId || '') === String(next.defaultBranchId || '') &&
    Boolean(current.isActive !== false) === Boolean(next.isActive !== false) &&
    Boolean(current.mustChangePassword === true) === Boolean(next.mustChangePassword === true) &&
    Number(current.failedLoginCount || 0) === Number(next.failedLoginCount || 0) &&
    String(current.lockedUntil || '') === String(next.lockedUntil || '') &&
    String(current.lastLoginAt || '') === String(next.lastLoginAt || '')
  );
}

export function useUserManagementEffects({
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
  operationalAdminsCount,
  startNewUser,
}: {
  managedUsers: ManagedUserRecord[];
  selectedUserKey: string;
  setSelectedUserKey: (value: string) => void;
  loadUser: (user?: ManagedUserRecord | null) => void;
  setDraft: Dispatch<SetStateAction<ManagedUserRecord>>;
  setPage: (value: number) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  userSearch: string;
  userFilter: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked';
  setupMode: boolean;
  setupStepKey: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null;
  currentUserId: string;
  operationalAdminsCount: number;
  startNewUser: (role?: 'super_admin' | 'admin' | 'cashier') => void;
}) {
  useEffect(() => {
    if (!managedUsers.length) {
      if (selectedUserKey && selectedUserKey !== '__new__') setSelectedUserKey('');
      return;
    }

    if (!selectedUserKey) {
      loadUser(managedUsers[0]);
      return;
    }

    if (selectedUserKey === '__new__') return;

    const match = managedUsers.find((user) => String(user.id) === selectedUserKey);
    if (!match) {
      loadUser(managedUsers[0]);
      return;
    }

    setDraft((current) => {
      if (isSameUserDraft(current, match)) return current;
      return { ...match, password: current.password || '' };
    });
  }, [loadUser, managedUsers, selectedUserKey, setDraft, setSelectedUserKey]);

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [setPage, setSelectedIds, userSearch, userFilter]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => managedUsers.some((user) => String(user.id || user.username) === id)));
  }, [managedUsers, setSelectedIds]);

  useEffect(() => {
    if (!setupMode) return;

    if (setupStepKey === 'admin-user') {
      if (!operationalAdminsCount && selectedUserKey !== '__new__') startNewUser('admin');
      return;
    }

    if (setupStepKey === 'secure-account' && currentUserId) {
      const currentUser = managedUsers.find((user) => String(user.id || '') === currentUserId);
      if (currentUser && selectedUserKey !== String(currentUser.id || '')) loadUser(currentUser);
    }
  }, [currentUserId, loadUser, managedUsers, operationalAdminsCount, selectedUserKey, setupMode, setupStepKey, startNewUser]);
}
