// regression marker: startNewUser('admin')
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
import type { Branch } from '@/types/domain';
import { settingsApi } from '@/features/settings/api/settings.api';
import { exportUsersCsv, normalizeUserRecord, printUsersList } from '@/features/settings/components/user-management.shared';
import {
  UserBulkActionDialog,
  UserDeleteDialog,
  UserManagementEditorPanel,
  UserManagementListPanel,
} from '@/features/settings/components/UserManagementPanels';
import { useUserManagementController } from '@/features/settings/hooks/useUserManagementController';

export function UserManagementSection({ branches, setupMode = false, setupStepKey = null, onSetupAdvance }: { branches: Branch[]; setupMode?: boolean; setupStepKey?: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null; onSetupAdvance?: () => void }) {
  const controller = useUserManagementController({ setupMode, setupStepKey, onSetupAdvance });
  const {
    currentUserRole,
    usersQuery,
    managedUsers,
    userSummary,
    selectedUsers,
    selectedUserKey,
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
  } = controller;

  return (
    <>
      <Card
        title="إدارة المستخدمين والصلاحيات"
        actions={(
          <div className="actions compact-actions">
            <span className="nav-pill">تشغيل وصلاحيات</span>
            {!setupMode ? <Button type="button" variant="secondary" onClick={async () => { const payload = await settingsApi.listAllUsers({ search: userSearch, filter: userFilter }); exportUsersCsv('users-results.csv', payload.rows.map(normalizeUserRecord)); }}>تصدير النتائج</Button> : null}
            {!setupMode ? <Button type="button" variant="secondary" onClick={async () => { const payload = await settingsApi.listAllUsers({ search: userSearch, filter: userFilter }); printUsersList('قائمة المستخدمين', payload.rows.map(normalizeUserRecord)); }}>طباعة النتائج</Button> : null}
          </div>
        )}
      >
        <QueryFeedback
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          error={usersQuery.error}
          isEmpty={!userSummary.totalItems}
          loadingText="جاري تحميل المستخدمين..."
          emptyTitle="لا توجد بيانات مستخدمين"
          emptyHint="سيظهر هنا المستخدمون بمجرد تحميلهم من الخادم، ويمكنك إنشاء مستخدم جديد من نفس الشاشة."
        >
          <div className="two-column-grid">
            <UserManagementListPanel
              managedUsers={managedUsers}
              summary={userSummary}
              selectedUserKey={selectedUserKey}
              selectedIds={selectedIds}
              userSearch={userSearch}
              userFilter={userFilter}
              page={usersQuery.data?.pagination?.page || page}
              pageSize={usersQuery.data?.pagination?.pageSize || pageSize}
              totalItems={userSummary.totalItems}
              onNewUser={() => startNewUser(setupMode && setupStepKey === 'admin-user' ? 'admin' : 'cashier')}
              onApplyRolePermissions={() => applyDefaultPermissions(draft.role)}
              onApplyTemplate={applyTemplate}
              onCopyPermissions={() => void copyPermissions()}
              onUserSearchChange={setUserSearch}
              onUserFilterChange={setUserFilter}
              onLoadUser={loadUser}
              onSelectedIdsChange={setSelectedIds}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }}
              onBulkAction={setBulkAction}
              setupMode={setupMode}
            />
            <UserManagementEditorPanel
              branches={branches}
              draft={draft}
              currentUserRole={currentUserRole}
              isCurrentUserSelected={isCurrentUserSelected}
              canUnlockSelected={canUnlockSelected}
              canDeleteSelected={canDeleteSelected}
              isPending={actionMutation.isPending}
              isError={actionMutation.isError}
              isSuccess={actionMutation.isSuccess}
              error={actionMutation.error}
              statusMessage={statusMessage}
              onDraftChange={(updater) => setDraft((current) => updater(current))}
              onApplyRolePermissions={applyDefaultPermissions}
              onToggleBranch={toggleBranch}
              onTogglePermission={togglePermission}
              onReset={resetSelectedDraft}
              onUnlock={() => void unlockSelectedUser()}
              onDelete={() => setDeleteDialogOpen(true)}
              onSave={() => void saveCurrentDraft()}
              setupMode={setupMode}
              setupStepKey={setupStepKey}
            />
          </div>
        </QueryFeedback>
      </Card>

      <UserDeleteDialog
        open={deleteDialogOpen}
        draft={draft}
        isBusy={actionMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => void deleteSelectedUser()}
      />

      <UserBulkActionDialog
        open={Boolean(bulkAction)}
        action={bulkAction}
        selectedUsers={selectedUsers}
        isBusy={actionMutation.isPending}
        onCancel={() => setBulkAction(null)}
        onConfirm={() => void runBulkAction()}
      />
    </>
  );
}
