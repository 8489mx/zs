import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ActionConfirmDialog } from '@/components/shared/ActionConfirmDialog';
import { SettingsSectionContent } from '@/features/settings/pages/SettingsSectionContent';
import { isSettingsSection, type SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import { downloadJsonFile } from '@/lib/browser';
import { SettingsPageShell } from '@/features/settings/components/SettingsPageShell';
import { downloadSettingsTemplate, getSettingsSectionDescription } from '@/features/settings/pages/settings-page.helpers';
import { useSettingsPageController } from '@/features/settings/pages/useSettingsPageController';
import type { BackupSnapshotRecord } from '@/features/settings/components/SettingsWorkspacePrimitives';

// const canManageBackups = useHasAnyPermission
// const canManageMaintenance = useHasAnyPermission
export function SettingsPage() {
  const { section } = useParams<{ section?: string }>();
  const resolvedSection: SettingsSectionKey = isSettingsSection(section) ? section : 'overview';
  const page = useSettingsPageController(resolvedSection);
  const { activeSetupSection, navigate, setupFlow, setupMode } = page;

  React.useEffect(() => {
    if (!setupMode || !activeSetupSection) return;
    if (section === activeSetupSection) return;
    if (section === 'overview') navigate(setupFlow.currentStep?.to || '/settings/core?setup=1', { replace: true });
  }, [activeSetupSection, navigate, section, setupFlow.currentStep, setupMode]);

  if (!isSettingsSection(section)) return <Navigate to="/settings/overview" replace />;

  return (
    <SettingsPageShell
      title={page.setupMode ? 'تهيئة البرنامج' : 'إعدادات المتجر'}
      description={page.setupMode ? 'اتبع الخطوات بالترتيب حتى يصبح التشغيل الأول واضحًا وآمنًا.' : getSettingsSectionDescription(resolvedSection)}
      badgeLabel={page.setupMode ? 'تجهيز البداية' : page.sectionMeta.label}
      setupMode={page.setupMode}
      currentSection={resolvedSection}
      currentUserRole={page.currentUserRole}
      cards={page.settingsGuidanceCards}
    >
      <SettingsSectionContent
        section={resolvedSection}
        currentUserRole={page.currentUserRole}
        settings={page.settings}
        branches={page.branches}
        locations={page.locations}
        filteredBranches={page.referenceFilters.filteredBranches}
        filteredLocations={page.referenceFilters.filteredLocations}
        branchSearch={page.referenceFilters.branchSearch}
        locationSearch={page.referenceFilters.locationSearch}
        branchFilter={page.referenceFilters.branchFilter}
        locationFilter={page.referenceFilters.locationFilter}
        setBranchSearch={page.referenceFilters.setBranchSearch}
        setLocationSearch={page.referenceFilters.setLocationSearch}
        setBranchFilter={page.referenceFilters.setBranchFilter}
        setLocationFilter={page.referenceFilters.setLocationFilter}
        resetBranchFilters={page.referenceFilters.resetBranchFilters}
        resetLocationFilters={page.referenceFilters.resetLocationFilters}
        copyVisibleBranches={page.copyVisibleBranches}
        copyVisibleLocations={page.copyVisibleLocations}
        settingsQuery={page.settingsQuery}
        branchesQuery={page.branchesQuery}
        locationsQuery={page.locationsQuery}
        diagnosticsQuery={page.diagnosticsQuery}
        maintenanceQuery={page.maintenanceQuery}
        launchQuery={page.launchQuery}
        uatQuery={page.uatQuery}
        operationalQuery={page.operationalQuery}
        supportQuery={page.supportQuery}
        snapshots={page.snapshots}
        canManageSettings={page.canManageSettings}
        canManageBackups={page.canManageBackups}
        canManageMaintenance={page.canManageMaintenance}
        backupBusy={page.backupBusy}
        backupMessage={page.backupMessage}
        backupResult={page.backupResult}
        restoreSnapshotId={page.restoreSnapshotId}
        supportCopyStatus={page.supportCopyStatus}
        diagnosticsCounts={page.diagnosticsCounts}
        diagnosticsFinance={page.diagnosticsFinance}
        maintenanceSummary={page.maintenanceSummary}
        launchSummary={page.launchSummary}
        uatSummary={page.uatSummary}
        operationalSummary={page.operationalSummary}
        supportData={page.supportData}
        systemDiagnosticsPayload={page.diagnosticsQuery.data || {}}
        cleanupPending={page.cleanupMutation.isPending}
        reconcileCustomersPending={page.reconcileCustomersMutation.isPending}
        reconcileSuppliersPending={page.reconcileSuppliersMutation.isPending}
        reconcileAllPending={page.reconcileAllMutation.isPending}
        importProductsPending={page.importProductsMutation.isPending}
        importCustomersPending={page.importCustomersMutation.isPending}
        importSuppliersPending={page.importSuppliersMutation.isPending}
        importOpeningStockPending={page.importOpeningStockMutation.isPending}
        handleBackupDownload={page.handleBackupDownload}
        handleSnapshotDownload={(snapshot: BackupSnapshotRecord) => Promise.resolve(page.handleSnapshotDownload(snapshot))}
        handleCopySupportSnapshot={page.handleCopySupportSnapshot}
        onRequestRestoreFile={(file: File) => page.setConfirmAction({ kind: 'restore-file', file })}
        onRequestRestoreSnapshot={(snapshot: BackupSnapshotRecord) => page.setConfirmAction({ kind: 'restore-snapshot', snapshot })}
        onCleanupExpiredSessions={() => page.setConfirmAction({ kind: 'cleanup-expired-sessions' })}
        onReconcileCustomers={() => page.setConfirmAction({ kind: 'reconcile-customers' })}
        onReconcileSuppliers={() => page.setConfirmAction({ kind: 'reconcile-suppliers' })}
        onReconcileAll={() => page.setConfirmAction({ kind: 'reconcile-all' })}
        onUpdateBranch={async (branchId: string, values: { name: string; code: string }) => { await page.updateBranchMutation.mutateAsync({ branchId, values }); }}
        onDeleteBranch={async (branch) => { await page.deleteBranchMutation.mutateAsync(branch.id); }}
        onUpdateLocation={async (locationId: string, values: { name: string; code: string; branchId: string }) => { await page.updateLocationMutation.mutateAsync({ locationId, values }); }}
        onDeleteLocation={async (location) => { await page.deleteLocationMutation.mutateAsync(location.id); }}
        branchActionBusy={page.updateBranchMutation.isPending || page.deleteBranchMutation.isPending}
        locationActionBusy={page.updateLocationMutation.isPending || page.deleteLocationMutation.isPending}
        branchActionError={page.updateBranchMutation.error || page.deleteBranchMutation.error}
        locationActionError={page.updateLocationMutation.error || page.deleteLocationMutation.error}
        importProducts={(rows) => page.importProductsMutation.mutateAsync(rows)}
        importCustomers={(rows) => page.importCustomersMutation.mutateAsync(rows)}
        importSuppliers={(rows) => page.importSuppliersMutation.mutateAsync(rows)}
        importOpeningStock={(rows) => page.importOpeningStockMutation.mutateAsync(rows)}
        downloadTemplate={downloadSettingsTemplate}
        onDownloadJson={(data, filename) => downloadJsonFile(data, filename)}
        setupMode={page.setupMode}
        setupStepKey={page.setupFlow.currentStep?.key || null}
        onSetupAdvance={page.handleSetupAdvance}
      />

      {page.confirmDialogMeta ? (
        <ActionConfirmDialog
          open={Boolean(page.confirmAction)}
          title={page.confirmDialogMeta.title}
          description={page.confirmDialogMeta.description}
          isBusy={page.confirmDialogMeta.isBusy}
          onCancel={() => page.setConfirmAction(null)}
          onConfirm={() => void page.performConfirmedAction()}
        />
      ) : null}
    </SettingsPageShell>
  );
}
