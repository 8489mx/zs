// regression marker: startNewUser('admin')
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import type { SetupStepKey } from '@/features/settings/hooks/useFirstRunSetupFlow';
import { useAuthStore } from '@/stores/auth-store';

export function UserManagementSection({ branches, setupMode = false, setupStepKey = null, onSetupAdvance }: { branches: Branch[]; setupMode?: boolean; setupStepKey?: SetupStepKey | null; onSetupAdvance?: () => void }) {
  const controller = useUserManagementController({ setupMode, setupStepKey, onSetupAdvance });
  const [detailsUserId, setDetailsUserId] = useState('');
  const [userInteracted, setUserInteracted] = useState(false);
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
    disableBulkSummary,
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
    openBulkAction,
    deleteDialogOpen,
    activeTemplate,
    setDeleteDialogOpen,
    canDeleteSelected,
    canUnlockSelected,
    isCurrentUserSelected,
    selectedDraftDisableProtection,
    canDirectlyDisableSelected,
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

  useScrollIntoViewOnChange(selectedUserKey, userEditorSectionRef, { enabled: Boolean(selectedUserKey) && userInteracted });

  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const authUser = useAuthStore((s) => s.user);
  const authTenant = useAuthStore((s) => s.tenant);
  const isSuperAdmin = authUser?.role === 'super_admin';
  const planId = authTenant?.planId || 'plan_basic';
  const maxAllowedUsers = isSuperAdmin ? Infinity : planId === 'plan_ultimate' ? Infinity : planId === 'plan_pro' ? 10 : 3;
  const isUserLimitReached = !isSuperAdmin && (userSummary.totalItems || 0) >= maxAllowedUsers;

  return (
    <>
      <section className="document-prototype-section settings-users-card">
        <div className="section-header-compact-row">
          <h3 className="document-prototype-section-title">المستخدمون والصلاحيات</h3>
          <div className="section-header-actions-group">
            {!setupMode ? (
              isUserLimitReached ? (
                <span
                  style={{
                    fontSize: '0.70rem',
                    padding: '3px 6px',
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    whiteSpace: 'nowrap',
                  }}
                  title={`وصلت للحد الأقصى في باقتك (${maxAllowedUsers} مستخدمين).`}
                >
                  حد الباقة ({maxAllowedUsers})
                </span>
              ) : (
                <Button type="button" variant="primary" className="section-header-action-btn" onClick={() => { startNewUser('cashier'); setIsEditorOpen(true); }}>
                  + مستخدم جديد
                </Button>
              )
            ) : null}
            {!setupMode ? (
              <Button
                type="button"
                variant="secondary"
                className="section-header-action-btn"
                onClick={async () => {
                  const payload = await settingsApi.listAllUsers({ search: userSearch, filter: userFilter });
                  exportUsersCsv('users-results.csv', payload.rows.map(normalizeUserRecord));
                }}
              >
                تصدير
              </Button>
            ) : null}
            {!setupMode ? (
              <Button
                type="button"
                variant="secondary"
                className="section-header-action-btn"
                onClick={async () => {
                  const payload = await settingsApi.listAllUsers({ search: userSearch, filter: userFilter });
                  printUsersList('قائمة المستخدمين', payload.rows.map(normalizeUserRecord));
                }}
              >
                طباعة
              </Button>
            ) : null}
          </div>
        </div>
        <QueryFeedback
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          error={usersQuery.error}
          isEmpty={!userSummary.totalItems}
          loadingText="جاري تحميل المستخدمين..."
          emptyTitle="لا توجد بيانات مستخدمين"
          emptyHint="سيظهر هنا المستخدمون بمجرد تحميلهم من الخادم، ويمكنك إنشاء مستخدم جديد من نفس الشاشة."
        >
          <div className="page-stack">
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
              onNewUser={() => { setUserInteracted(true); startNewUser(setupMode && setupStepKey === 'admin-user' ? 'admin' : 'cashier'); if (!setupMode) setIsEditorOpen(true); }}
              onApplyRolePermissions={() => applyDefaultPermissions(draft.role)}
              onApplyTemplate={applyTemplate}
              activeTemplate={activeTemplate}
              onCopyPermissions={() => void copyPermissions()}
              onUserSearchChange={setUserSearch}
              onUserFilterChange={setUserFilter}
              onLoadUser={(user) => { setUserInteracted(true); loadUser(user); if (!setupMode) setIsEditorOpen(true); }}
              onSelectedIdsChange={setSelectedIds}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }}
              onBulkAction={openBulkAction}
              disableBulkSummary={disableBulkSummary}
              onOpenDetails={(user) => setDetailsUserId(String(user.id || ''))}
              setupMode={setupMode}
            />
            {setupMode && (
              <div ref={userEditorSectionRef}>
                <UserManagementEditorPanel
                  branches={branches}
                  draft={draft}
                  currentUserRole={currentUserRole}
                  isCurrentUserSelected={isCurrentUserSelected}
                  selectedDraftDisableProtection={selectedDraftDisableProtection}
                  canDirectlyDisableSelected={canDirectlyDisableSelected}
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
            )}
          </div>
        </QueryFeedback>
      </section>

      {/* Modal for Editing/Creating User in Non-Setup Mode */}
      {!setupMode && (
        <DialogShell
          open={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          width="min(940px, 95vw)"
          ariaLabel="تعديل المستخدم والصلاحيات"
          showCloseButton={true}
        >
          <div className="dialog-card" style={{ padding: '24px 28px' }}>
            <div className="border-b pb-3 mb-4" style={{ paddingInlineEnd: '36px' }}>
              <h3 className="document-prototype-section-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {draft.id ? `تعديل المستخدم: ${draft.name || draft.username}` : 'إضافة مستخدم جديد'}
              </h3>
              <p className="text-muted-foreground" style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', margin: 0 }}>
                تحديد الدور، الفروع المتاحة، ومجموعات الصلاحيات التفصيلية.
              </p>
            </div>
            <UserManagementEditorPanel
              branches={branches}
              draft={draft}
              currentUserRole={currentUserRole}
              isCurrentUserSelected={isCurrentUserSelected}
              selectedDraftDisableProtection={selectedDraftDisableProtection}
              canDirectlyDisableSelected={canDirectlyDisableSelected}
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
              onDelete={() => { setDeleteDialogOpen(true); setIsEditorOpen(false); }}
              onSave={async () => {
                await saveCurrentDraft();
                if (actionMutation.isSuccess) {
                  setIsEditorOpen(false);
                }
              }}
              setupMode={setupMode}
              setupStepKey={setupStepKey}
            />
          </div>
        </DialogShell>
      )}

      <UserDeleteDialog
        open={deleteDialogOpen}
        draft={draft}
        isBusy={actionMutation.isPending}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={(payload) => void deleteSelectedUser(payload)}
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
        disableBulkSummary={disableBulkSummary}
        isBusy={actionMutation.isPending}
        onCancel={() => setBulkAction(null)}
        onConfirm={() => runBulkAction()}
      />
    </>
  );
}
