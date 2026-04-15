// regression marker: startNewUser('admin')
import { useRef } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { QueryFeedback } from '@/shared/components/query-feedback';
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
import { useScrollIntoViewOnChange } from '@/shared/hooks/use-scroll-into-view-on-change';

export function UserManagementSection({ branches, setupMode = false, setupStepKey = null, onSetupAdvance }: { branches: Branch[]; setupMode?: boolean; setupStepKey?: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null; onSetupAdvance?: () => void }) {
  const controller = useUserManagementController({ setupMode, setupStepKey, onSetupAdvance });
  const userEditorSectionRef = useRef<HTMLDivElement | null>(null);
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

  useScrollIntoViewOnChange(selectedUserKey, userEditorSectionRef, { enabled: Boolean(selectedUserKey) });

  return (
    <>
      <Card
        className="settings-users-card"
        title="المستخدمون والصلاحيات"
        actions={(
          <div className="actions compact-actions">
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
            <div ref={userEditorSectionRef}><UserManagementEditorPanel
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
            /></div>
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
