import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import type { Branch } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { ManagedUserRecord } from '@/features/settings/api/settings.api';
import { USER_ROLE_TEMPLATES, formatDateTime } from '@/features/settings/components/user-management.shared';
import type { UserBulkAction } from '@/features/settings/hooks/useUserManagementController';
import {
  UserManagementBulkToolbar,
  UserManagementQuickActions,
  UserManagementStatsFilters,
} from '@/features/settings/components/user-management/UserManagementListControls';
import {
  UserManagementBranchAccess,
  UserManagementPermissionGroups,
} from '@/features/settings/components/user-management/UserManagementPermissionGroups';
import { UserManagementEditorCard } from '@/features/settings/components/user-management-panels/UserManagementEditorCard';
import { UserBulkActionDialog, UserDeleteDialog } from '@/features/settings/components/user-management-panels/UserManagementDialogs';
import { UserManagementSetupHeader } from '@/features/settings/components/user-management-panels/UserManagementSetupHeader';

const roleLabel: Record<ManagedUserRecord['role'], string> = {
  super_admin: 'سوبر أدمن',
  admin: 'مدير نظام',
  cashier: 'كاشير'
};

export function UserManagementListPanel({
  managedUsers,
  summary,
  selectedUserKey,
  selectedIds,
  userSearch,
  userFilter,
  page,
  pageSize,
  totalItems,
  onNewUser,
  onApplyRolePermissions,
  onApplyTemplate,
  onCopyPermissions,
  onUserSearchChange,
  onUserFilterChange,
  onLoadUser,
  onSelectedIdsChange,
  onPageChange,
  onPageSizeChange,
  onBulkAction,
  setupMode = false
}: {
  managedUsers: ManagedUserRecord[];
  summary: { totalItems: number; superAdmins: number; admins: number; cashiers: number; inactive: number; locked: number; };
  selectedUserKey: string;
  selectedIds: string[];
  userSearch: string;
  userFilter: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked';
  page: number;
  pageSize: number;
  onNewUser: () => void;
  onApplyRolePermissions: () => void;
  onApplyTemplate: (templateKey: keyof typeof USER_ROLE_TEMPLATES) => void;
  onCopyPermissions: () => void;
  onUserSearchChange: (value: string) => void;
  onUserFilterChange: (value: 'all' | 'super-admins' | 'admins' | 'cashiers' | 'inactive' | 'locked') => void;
  onLoadUser: (user: ManagedUserRecord) => void;
  onSelectedIdsChange: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  totalItems: number;
  onBulkAction: (action: UserBulkAction) => void;
  setupMode?: boolean;
}) {
  return (
    <div className="list-stack">
      <UserManagementQuickActions
        setupMode={setupMode}
        onNewUser={onNewUser}
        onApplyRolePermissions={onApplyRolePermissions}
        onApplyTemplate={onApplyTemplate}
        onCopyPermissions={onCopyPermissions}
      />
      {!setupMode ? (
        <UserManagementStatsFilters
          summary={summary}
          userSearch={userSearch}
          userFilter={userFilter}
          onUserSearchChange={onUserSearchChange}
          onUserFilterChange={onUserFilterChange}
        />
      ) : null}
      {!setupMode ? <UserManagementBulkToolbar selectedIds={selectedIds} onSelectedIdsChange={onSelectedIdsChange} onBulkAction={onBulkAction} /> : null}
      <DataTable
        rows={managedUsers}
        rowKey={(user) => String(user.id || user.username)}
        onRowClick={onLoadUser}
        rowClassName={(user) => selectedUserKey === String(user.id || user.username) ? 'table-row-selected' : undefined}
        rowTitle={(user) => `فتح المستخدم ${user.username}`}
        selection={{
          selectedKeys: selectedIds,
          onChange: onSelectedIdsChange,
          checkboxLabel: (user) => `تحديد المستخدم ${user.username}`
        }}
        pagination={{
          page,
          pageSize,
          totalItems,
          onPageChange,
          onPageSizeChange,
          itemLabel: 'مستخدم'
        }}
        columns={[
          {
            key: 'identity',
            header: 'المستخدم',
            cell: (user) => (
              <div>
                <strong>{user.name || user.username}</strong>
                <div className="muted small">{user.username} · {roleLabel[user.role]} · {user.isActive === false ? 'موقوف' : 'نشط'}</div>
              </div>
            )
          },
          {
            key: 'access',
            header: 'الوصول',
            cell: (user) => (
              <div>
                <div className="muted small">آخر دخول: {formatDateTime(user.lastLoginAt)}</div>
                <div className="muted small">محاولات فاشلة: {user.failedLoginCount || 0}{user.lockedUntil ? ` · مقفول حتى ${formatDateTime(user.lockedUntil)}` : ''}</div>
              </div>
            )
          },
          {
            key: 'branches',
            header: SINGLE_STORE_MODE ? 'الدور / الصلاحيات' : 'الفروع / الصلاحيات',
            cell: (user) => (
              <div>
                {!SINGLE_STORE_MODE ? <div className="muted small">الفروع: {(user.branchIds || []).length || 0} · افتراضي: {user.defaultBranchId || '—'}</div> : null}
                <div className="muted small">الصلاحيات: {(user.permissions || []).length}</div>
              </div>
            )
          },
          {
            key: 'actions',
            header: 'إجراءات',
            cell: (user) => (
              <div className="actions compact-actions">
                <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); onLoadUser(user); }}>فتح</Button>
                <span className="nav-pill">{user.mustChangePassword ? 'تغيير مطلوب' : 'مستقر'}</span>
              </div>
            )
          }
        ]}
      />
    </div>
  );
}

export function UserManagementEditorPanel({
  branches,
  draft,
  currentUserRole,
  isCurrentUserSelected,
  canUnlockSelected,
  canDeleteSelected,
  isPending,
  isError,
  isSuccess,
  error,
  statusMessage,
  onDraftChange,
  onApplyRolePermissions,
  onToggleBranch,
  onTogglePermission,
  onReset,
  onUnlock,
  onDelete,
  onSave,
  setupMode = false,
  setupStepKey = null
}: {
  branches: Branch[];
  draft: ManagedUserRecord;
  currentUserRole: string;
  isCurrentUserSelected: boolean;
  canUnlockSelected: boolean;
  canDeleteSelected: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  statusMessage: string;
  onDraftChange: (updater: (current: ManagedUserRecord) => ManagedUserRecord) => void;
  onApplyRolePermissions: (role: 'super_admin' | 'admin' | 'cashier') => void;
  onToggleBranch: (branchId: string) => void;
  onTogglePermission: (permission: string) => void;
  onReset: () => void;
  onUnlock: () => void;
  onDelete: () => void;
  onSave: () => void;
  setupMode?: boolean;
  setupStepKey?: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null;
}) {
  return (
    <div className="page-stack">
      {setupMode
        ? <UserManagementSetupHeader draft={draft} setupMode={setupMode} setupStepKey={setupStepKey} isCurrentUserSelected={isCurrentUserSelected} />
        : <UserManagementEditorCard branches={branches} draft={draft} currentUserRole={currentUserRole} isCurrentUserSelected={isCurrentUserSelected} onDraftChange={onDraftChange} onApplyRolePermissions={onApplyRolePermissions} />}

      {setupMode ? (
        <UserManagementEditorCard branches={branches} draft={draft} currentUserRole={currentUserRole} isCurrentUserSelected={isCurrentUserSelected} onDraftChange={onDraftChange} onApplyRolePermissions={onApplyRolePermissions} />
      ) : null}

      {!SINGLE_STORE_MODE ? <UserManagementBranchAccess branches={branches} selectedBranchIds={draft.branchIds} onToggleBranch={onToggleBranch} /> : null}
      <UserManagementPermissionGroups permissions={draft.permissions} role={draft.role} onTogglePermission={onTogglePermission} />

      <MutationFeedback isError={isError} isSuccess={isSuccess} error={error} errorFallback={statusMessage || 'تعذرت العملية على المستخدم'} successText={statusMessage || 'تم تحديث بيانات المستخدم.'} />

      <div className="actions" style={{ flexWrap: 'wrap' }}>
        <Button type="button" variant="secondary" onClick={onReset} disabled={isPending}>إعادة القيم</Button>
        {canUnlockSelected ? <Button type="button" variant="secondary" onClick={onUnlock} disabled={isPending}>فتح القفل</Button> : null}
        {canDeleteSelected ? <Button type="button" variant="danger" onClick={onDelete} disabled={isPending}>حذف المستخدم</Button> : null}
        <Button type="button" onClick={onSave} disabled={isPending}>{isPending ? 'جاري الحفظ...' : 'حفظ المستخدم'}</Button>
      </div>
    </div>
  );
}

export { UserDeleteDialog, UserBulkActionDialog };
