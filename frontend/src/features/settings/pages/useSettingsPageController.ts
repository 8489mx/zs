import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useHasAnyPermission } from '@/hooks/usePermission';
import { useSettingsAdminWorkspace } from '@/features/settings/hooks/useSettingsAdminWorkspace';
import { useDeleteBranchMutation, useDeleteLocationMutation, useUpdateBranchMutation, useUpdateLocationMutation } from '@/features/settings/hooks/useSettingsMutations';
import { useFirstRunSetupFlow } from '@/features/settings/hooks/useFirstRunSetupFlow';
import { settingsSections, type SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import { useSettingsReferenceFilters } from '@/features/settings/hooks/useSettingsReferenceFilters';
import {
  type SettingsConfirmAction,
  buildSettingsGuidanceCards,
  getSettingsConfirmDialogMeta,
} from '@/features/settings/pages/settings-page.helpers';

export function useSettingsPageController(section: SettingsSectionKey) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workspace = useSettingsAdminWorkspace(section as never);
  const currentUserRole = useAuthStore((state) => state.user?.role || 'cashier');
  const canManageSettings = useHasAnyPermission(['settings', 'canManageSettings']);
  const canManageBackups = useHasAnyPermission('canManageBackups');
  const canManageMaintenance = useHasAnyPermission(['settings', 'canManageSettings']);
  const [confirmAction, setConfirmAction] = useState<SettingsConfirmAction | null>(null);
  const updateBranchMutation = useUpdateBranchMutation();
  const deleteBranchMutation = useDeleteBranchMutation();
  const updateLocationMutation = useUpdateLocationMutation();
  const deleteLocationMutation = useDeleteLocationMutation();

  const diagnosticsCounts = workspace.diagnosticsQuery.data?.counts as Record<string, unknown> | undefined;
  const diagnosticsFinance = workspace.diagnosticsQuery.data?.finance as Record<string, unknown> | undefined;
  const maintenanceSummary = workspace.maintenanceQuery.data?.summary as Record<string, unknown> | undefined;
  const launchSummary = workspace.launchQuery.data?.summary as Record<string, unknown> | undefined;
  const uatSummary = (workspace.uatQuery.data?.summary || workspace.uatQuery.data) as Record<string, unknown> | undefined;
  const operationalSummary = workspace.operationalQuery.data?.summary as Record<string, unknown> | undefined;
  const supportData = (workspace.supportQuery.data || {}) as Record<string, unknown>;
  const snapshots = workspace.backupSnapshotsQuery.data || [];
  const sectionMeta = settingsSections.find((entry) => entry.key === section) || settingsSections[0];
  const setupMode = searchParams.get('setup') === '1';
  const setupFlow = useFirstRunSetupFlow();
  const activeSetupSection = setupFlow.currentStep?.section;
  const referenceFilters = useSettingsReferenceFilters(workspace.branches, workspace.locations);

  const handleSetupAdvance = () => {
    const nextTarget = setupFlow.nextStep?.to || '/';
    navigate(nextTarget, { replace: true });
  };

  const settingsGuidanceCards = useMemo(() => buildSettingsGuidanceCards({
    section,
    sectionLabel: sectionMeta.label,
    setupMode,
    setupStepTitle: setupFlow.currentStep?.title,
    branchesCount: workspace.branches.length,
    locationsCount: workspace.locations.length,
    filteredBranchesCount: referenceFilters.filteredBranches.length,
    filteredLocationsCount: referenceFilters.filteredLocations.length,
    storeName: workspace.settings?.storeName,
    currentUserRole,
    snapshotsCount: snapshots.length,
  }), [
    currentUserRole,
    referenceFilters.filteredBranches.length,
    referenceFilters.filteredLocations.length,
    section,
    sectionMeta.label,
    setupFlow.currentStep?.title,
    setupMode,
    snapshots.length,
    workspace.branches.length,
    workspace.locations.length,
    workspace.settings?.storeName,
  ]);

  const confirmDialogMeta = getSettingsConfirmDialogMeta(confirmAction, {
    backupBusy: workspace.backupBusy,
    restoreSnapshotBusy: workspace.restoreSnapshotId.length > 0,
    cleanupBusy: workspace.cleanupMutation.isPending,
    reconcileCustomersBusy: workspace.reconcileCustomersMutation.isPending,
    reconcileSuppliersBusy: workspace.reconcileSuppliersMutation.isPending,
    reconcileAllBusy: workspace.reconcileAllMutation.isPending,
  });

  const copyVisibleBranches = async () => {
    const content = referenceFilters.filteredBranches.map((branch) => `${branch.name}${branch.code ? ` - ${branch.code}` : ''}`).join('\n');
    if (!content || !navigator.clipboard) return;
    await navigator.clipboard.writeText(content);
  };

  const copyVisibleLocations = async () => {
    const content = referenceFilters.filteredLocations.map((location) => `${location.name}${location.code ? ` - ${location.code}` : ''}${location.branchName ? ` (${location.branchName})` : ''}`).join('\n');
    if (!content || !navigator.clipboard) return;
    await navigator.clipboard.writeText(content);
  };

  async function performConfirmedAction() {
    if (!confirmAction) return;
    try {
      if (confirmAction.kind === 'restore-file') {
        await workspace.handleBackupFile(confirmAction.file, 'restore');
      } else if (confirmAction.kind === 'restore-snapshot') {
        await workspace.handleSnapshotRestore(confirmAction.snapshot);
      } else if (confirmAction.kind === 'cleanup-expired-sessions') {
        await workspace.cleanupMutation.mutateAsync();
      } else if (confirmAction.kind === 'reconcile-customers') {
        await workspace.reconcileCustomersMutation.mutateAsync();
      } else if (confirmAction.kind === 'reconcile-suppliers') {
        await workspace.reconcileSuppliersMutation.mutateAsync();
      } else if (confirmAction.kind === 'reconcile-all') {
        await workspace.reconcileAllMutation.mutateAsync();
      }
      setConfirmAction(null);
    } catch {
    }
  }

  return {
    ...workspace,
    currentUserRole,
    canManageSettings,
    canManageBackups,
    canManageMaintenance,
    confirmAction,
    setConfirmAction,
    updateBranchMutation,
    deleteBranchMutation,
    updateLocationMutation,
    deleteLocationMutation,
    diagnosticsCounts,
    diagnosticsFinance,
    maintenanceSummary,
    launchSummary,
    uatSummary,
    operationalSummary,
    supportData,
    snapshots,
    sectionMeta,
    setupMode,
    setupFlow,
    activeSetupSection,
    referenceFilters,
    handleSetupAdvance,
    settingsGuidanceCards,
    confirmDialogMeta,
    copyVisibleBranches,
    copyVisibleLocations,
    performConfirmedAction,
    navigate,
  };
}
