import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAdminWorkspaceQueries, invalidateImportedReferenceData, invalidatePurchasesDomain, invalidateSalesDomain, invalidateSettingsReferenceDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { useSettingsRouteState } from '@/features/settings/hooks/useSettingsRouteState';
import { type BackupSnapshotRecord, settingsApi } from '@/features/settings/api/settings.api';
import { downloadJsonFile, triggerDownload } from '@/lib/browser';

type AdminWorkspaceSection = 'overview' | 'core' | 'reference' | 'backup' | 'users' | 'diagnostics' | 'readiness';

async function readTextFile(file: File) {
  return await file.text();
}

async function fetchBackupBlob() {
  const response = await fetch(settingsApi.backupDownloadUrl(), { credentials: 'include' });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || 'تعذر تنزيل النسخة الاحتياطية');
  }
  return await response.blob();
}

export function useSettingsAdminWorkspace(currentSection: AdminWorkspaceSection = 'overview') {
  const route = useSettingsRouteState();
  const queryClient = useQueryClient();
  const needsDiagnostics = currentSection === 'diagnostics';
  const needsReadiness = currentSection === 'readiness';
  const needsBackup = currentSection === 'backup';

  const diagnosticsQuery = useQuery({ queryKey: queryKeys.adminDiagnostics, queryFn: settingsApi.diagnostics, enabled: needsDiagnostics });
  const maintenanceQuery = useQuery({ queryKey: queryKeys.adminMaintenance, queryFn: settingsApi.maintenanceReport, enabled: needsDiagnostics });
  const launchQuery = useQuery({ queryKey: queryKeys.adminLaunch, queryFn: settingsApi.launchReadiness, enabled: needsDiagnostics });
  const uatQuery = useQuery({ queryKey: queryKeys.adminUat, queryFn: settingsApi.uatReadiness, enabled: needsReadiness });
  const operationalQuery = useQuery({ queryKey: queryKeys.adminOperational, queryFn: settingsApi.operationalReadiness, enabled: needsDiagnostics });
  const supportQuery = useQuery({ queryKey: queryKeys.adminSupport, queryFn: settingsApi.supportSnapshot, enabled: needsReadiness });
  const backupSnapshotsQuery = useQuery({ queryKey: queryKeys.backupSnapshots, queryFn: settingsApi.backupSnapshots, enabled: needsBackup });

  const [backupResult, setBackupResult] = useState<Record<string, unknown> | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [supportCopyStatus, setSupportCopyStatus] = useState('');
  const [restoreSnapshotId, setRestoreSnapshotId] = useState('');

  const refreshAdminQueries = async () => {
    await Promise.all([
      invalidateAdminWorkspaceQueries(queryClient),
      invalidateSalesDomain(queryClient),
      invalidatePurchasesDomain(queryClient),
      invalidateSettingsReferenceDomain(queryClient),
    ]);
  };

  const refreshImportedDataQueries = async () => {
    await Promise.all([
      invalidateAdminWorkspaceQueries(queryClient),
      invalidateImportedReferenceData(queryClient),
    ]);
  };

  const cleanupMutation = useMutation({ mutationFn: settingsApi.cleanupExpiredSessions, onSuccess: refreshAdminQueries });
  const reconcileAllMutation = useMutation({ mutationFn: settingsApi.reconcileBalances, onSuccess: refreshAdminQueries });
  const reconcileCustomersMutation = useMutation({ mutationFn: settingsApi.reconcileCustomers, onSuccess: refreshAdminQueries });
  const reconcileSuppliersMutation = useMutation({ mutationFn: settingsApi.reconcileSuppliers, onSuccess: refreshAdminQueries });
  const importProductsMutation = useMutation({ mutationFn: settingsApi.importProducts, onSuccess: refreshImportedDataQueries });
  const importCustomersMutation = useMutation({ mutationFn: settingsApi.importCustomers, onSuccess: refreshImportedDataQueries });
  const importSuppliersMutation = useMutation({ mutationFn: settingsApi.importSuppliers, onSuccess: refreshImportedDataQueries });
  const importOpeningStockMutation = useMutation({ mutationFn: settingsApi.importOpeningStock, onSuccess: refreshImportedDataQueries });

  const handleBackupDownload = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const blob = await fetchBackupBlob();
      triggerDownload(blob, `z-systems-backup-${new Date().toISOString().slice(0, 10)}.json`);
      setBackupMessage('تم تنزيل النسخة الاحتياطية بنجاح.');
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر تنزيل النسخة الاحتياطية');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleBackupFile = async (file: File, mode: 'verify' | 'restore') => {
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const payload = JSON.parse(await readTextFile(file));
      const verified = await settingsApi.verifyBackup(payload);
      setBackupResult(verified);
      if (mode === 'restore') {
        await settingsApi.restoreBackup(payload, true);
        const restored = await settingsApi.restoreBackup(payload, false);
        setBackupResult(restored);
        await refreshAdminQueries();
        setBackupMessage('تمت استعادة النسخة الاحتياطية بعد اجتياز التحقق.');
      } else {
        setBackupMessage('تم التحقق من النسخة الاحتياطية بنجاح.');
      }
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر فحص ملف النسخة الاحتياطية');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleSnapshotDownload = (snapshot: BackupSnapshotRecord) => {
    if (!snapshot.payload) return;
    downloadJsonFile(snapshot.payload, `auto-backup-${String(snapshot.createdAt || '').slice(0, 10) || 'snapshot'}.json`);
  };

  const handleSnapshotRestore = async (snapshot: BackupSnapshotRecord) => {
    if (!snapshot.payload) return;
    setRestoreSnapshotId(snapshot.id);
    setBackupMessage('');
    try {
      await settingsApi.restoreBackup(snapshot.payload, true);
      const restored = await settingsApi.restoreBackup(snapshot.payload, false);
      setBackupResult(restored);
      setBackupMessage('تمت استعادة النسخة التلقائية بنجاح.');
      await refreshAdminQueries();
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر استعادة النسخة التلقائية');
    } finally {
      setRestoreSnapshotId('');
    }
  };

  const handleCopySupportSnapshot = async () => {
    try {
      await navigator.clipboard?.writeText(JSON.stringify(supportQuery.data || {}, null, 2));
      setSupportCopyStatus('تم نسخ ملخص الدعم.');
      window.setTimeout(() => setSupportCopyStatus(''), 2500);
    } catch {
      setSupportCopyStatus('تعذر نسخ المحتوى.');
      window.setTimeout(() => setSupportCopyStatus(''), 2500);
    }
  };

  return {
    ...route,
    diagnosticsQuery,
    maintenanceQuery,
    launchQuery,
    uatQuery,
    operationalQuery,
    supportQuery,
    backupSnapshotsQuery,
    cleanupMutation,
    reconcileAllMutation,
    reconcileCustomersMutation,
    reconcileSuppliersMutation,
    importProductsMutation,
    importCustomersMutation,
    importSuppliersMutation,
    importOpeningStockMutation,
    backupResult,
    backupMessage,
    backupBusy,
    supportCopyStatus,
    restoreSnapshotId,
    handleBackupDownload,
    handleBackupFile,
    handleSnapshotDownload,
    handleSnapshotRestore,
    handleCopySupportSnapshot
  };
}
