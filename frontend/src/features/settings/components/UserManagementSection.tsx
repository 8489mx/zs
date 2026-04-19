// regression marker: startNewUser('admin')
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { DialogShell } from '@/shared/components/dialog-shell';
import { DataTable } from '@/shared/ui/data-table';
import { ReportMetricCard } from '@/shared/components/report-metric-card';
import { employeeReportsApi } from '@/shared/api/employee-reports';
import { formatCurrency, formatDate } from '@/lib/format';

export function UserManagementSection({ branches, setupMode = false, setupStepKey = null, onSetupAdvance }: { branches: Branch[]; setupMode?: boolean; setupStepKey?: 'store' | 'branch-location' | 'admin-user' | 'secure-account' | null; onSetupAdvance?: () => void }) {
  const controller = useUserManagementController({ setupMode, setupStepKey, onSetupAdvance });
  const [detailsUserId, setDetailsUserId] = useState('');
  const detailsQuery = useQuery({
    queryKey: ['settings-user-details', detailsUserId],
    queryFn: () => employeeReportsApi.employeeDetails(detailsUserId, { limit: 25 }),
    enabled: Boolean(detailsUserId),
  });
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
              onOpenDetails={(user) => setDetailsUserId(String(user.id || ''))}
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

      <DialogShell open={Boolean(detailsUserId)} onClose={() => setDetailsUserId('')} width="min(980px, 100%)" ariaLabel="تفاصيل المستخدم">
        <div className="page-stack">
          <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>تفاصيل المستخدم</h3>
              <div className="muted small">{detailsQuery.data?.employee ? `${detailsQuery.data.employee.name} · ${detailsQuery.data.employee.username}` : 'جاري التحميل...'}</div>
            </div>
            <Button variant="secondary" onClick={() => setDetailsUserId('')}>إغلاق</Button>
          </div>
          {detailsQuery.isLoading ? <div className="muted small">جاري تحميل التفاصيل...</div> : null}
          {detailsQuery.isError ? <div className="warning-box">تعذر تحميل تفاصيل المستخدم.</div> : null}
          {detailsQuery.data?.employee ? <>
            <div className="reports-spotlight-grid section-spotlight-grid compact-spotlight-grid">
              <ReportMetricCard label="المبيعات" value={detailsQuery.data.employee.salesTotal || 0} helper={`${detailsQuery.data.employee.salesCount || 0} فاتورة`} tone="primary" formatter={formatCurrency} progress={0} />
              <ReportMetricCard label="المشتريات" value={detailsQuery.data.employee.purchasesTotal || 0} helper={`${detailsQuery.data.employee.purchasesCount || 0} فاتورة`} tone="warning" formatter={formatCurrency} progress={0} />
              <ReportMetricCard label="المرتجعات" value={detailsQuery.data.employee.returnsTotal || 0} helper={`${detailsQuery.data.employee.returnsCount || 0} مستند`} tone="danger" formatter={formatCurrency} progress={0} />
              <ReportMetricCard label="السجل" value={detailsQuery.data.employee.auditCount || 0} helper="أحداث رقابية" tone="success" progress={0} />
            </div>
            <DataTable
              ariaLabel="نشاط المستخدم"
              rows={detailsQuery.data.activities || []}
              columns={[
                { key: 'title', header: 'العنوان', cell: (row) => row.title },
                { key: 'details', header: 'التفاصيل', cell: (row) => row.details || '—' },
                { key: 'amount', header: 'القيمة', cell: (row) => row.amount == null ? '—' : formatCurrency(row.amount || 0) },
                { key: 'date', header: 'التاريخ والوقت', cell: (row) => formatDate(row.createdAt) },
                { key: 'ref', header: 'المرجع', cell: (row) => row.referenceLabel || '—' },
              ]}
              empty={<div className="muted small">لا توجد حركات للمستخدم في النطاق الحالي.</div>}
            />
          </> : null}
        </div>
      </DialogShell>

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
