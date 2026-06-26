import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAdminWorkspaceQueries, invalidateImportedReferenceData, invalidatePurchasesDomain, invalidateSalesDomain, invalidateSettingsReferenceDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { useSettingsRouteState } from '@/features/settings/hooks/useSettingsRouteState';
import { type BackupSnapshotRecord, settingsApi } from '@/features/settings/api/settings.api';
import { downloadJsonFile, triggerDownload } from '@/lib/browser';
import { useAuthStore } from '@/stores/auth-store';

const arabicMap: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'g', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'a', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ئ': 'e', 'ؤ': 'o', 'ء': 'a'
};

function slugifyArabic(str: string) {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += arabicMap[char] || char;
  }
  return result
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'store';
}

type AdminWorkspaceSection = 'overview' | 'core' | 'reference' | 'backup' | 'users' | 'diagnostics' | 'readiness';
type BackupMessageKind = 'success' | 'error';

const RESTORE_BACKUP_CONFIRMATION = 'RESTORE BACKUP';

function withRestoreConfirmation(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...(payload as Record<string, unknown>), confirmation: RESTORE_BACKUP_CONFIRMATION };
  }

  return { confirmation: RESTORE_BACKUP_CONFIRMATION, payload };
}

async function readTextFile(file: File) {
  return await file.text();
}

async function fetchBackupBlob() {
  const response = await fetch(settingsApi.backupDownloadUrl(), { credentials: 'include' });
  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || 'تعذر تنزيل النسخة الاحتياطية.');
  }
  return await response.blob();
}

export function useSettingsAdminWorkspace(currentSection: AdminWorkspaceSection = 'overview') {
  const route = useSettingsRouteState();
  const queryClient = useQueryClient();
  const needsDiagnostics = currentSection === 'diagnostics';
  const needsReadiness = currentSection === 'readiness';
  const needsBackup = currentSection === 'backup';
  
  const authUser = useAuthStore(state => state.user);
  const storeName = useAuthStore(state => state.storeName);

  const diagnosticsQuery = useQuery({ queryKey: queryKeys.adminDiagnostics, queryFn: settingsApi.diagnostics, enabled: needsDiagnostics });
  const maintenanceQuery = useQuery({ queryKey: queryKeys.adminMaintenance, queryFn: settingsApi.maintenanceReport, enabled: needsDiagnostics });
  const launchQuery = useQuery({ queryKey: queryKeys.adminLaunch, queryFn: settingsApi.launchReadiness, enabled: needsDiagnostics });
  const uatQuery = useQuery({ queryKey: queryKeys.adminUat, queryFn: settingsApi.uatReadiness, enabled: needsReadiness });
  const operationalQuery = useQuery({ queryKey: queryKeys.adminOperational, queryFn: settingsApi.operationalReadiness, enabled: needsDiagnostics });
  const supportQuery = useQuery({ queryKey: queryKeys.adminSupport, queryFn: settingsApi.supportSnapshot, enabled: needsReadiness });
  const backupSnapshotsQuery = useQuery({ queryKey: queryKeys.backupSnapshots, queryFn: settingsApi.backupSnapshots, enabled: needsBackup });
  const backupConfigQuery = useQuery({ queryKey: ['backup-config'], queryFn: settingsApi.backupConfig, enabled: needsBackup });

  const [backupResult, setBackupResult] = useState<Record<string, unknown> | null>(null);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupMessageKind, setBackupMessageKind] = useState<BackupMessageKind>('success');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupSelectedFileName, setBackupSelectedFileName] = useState('');
  const [backupFolderPathDraft, setBackupFolderPathDraft] = useState('');
  const [backupAutoEnabledDraft, setBackupAutoEnabledDraft] = useState(true);
  const [backupFrequencyDraft, setBackupFrequencyDraft] = useState<'daily' | 'weekly'>('daily');
  const [backupTimeDraft, setBackupTimeDraft] = useState('03:00');
  const [backupWeeklyDayDraft, setBackupWeeklyDayDraft] = useState(0);
  const [supportCopyStatus, setSupportCopyStatus] = useState('');
  const [restoreSnapshotId, setRestoreSnapshotId] = useState('');
  const backupConfigData = backupConfigQuery.data;

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

  useEffect(() => {
    if (!backupConfigData) return;
    setBackupFolderPathDraft(String(backupConfigData.folderPath || backupConfigData.defaultFolderPath || 'D:\\ZS Backups'));
    setBackupAutoEnabledDraft(Boolean(backupConfigData.automation?.enabled));
    setBackupFrequencyDraft(backupConfigData.automation?.frequency === 'weekly' ? 'weekly' : 'daily');
    setBackupTimeDraft(String(backupConfigData.automation?.time || '03:00'));
    setBackupWeeklyDayDraft(Number(backupConfigData.automation?.weeklyDay ?? 0));
  }, [backupConfigData]);

  const handleBackupDownload = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    setBackupMessageKind('success');
    try {
      const blob = await fetchBackupBlob();
      
      const now = new Date();
      // Format as YYYY-MM-DD-HH-mm
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      
      const datePart = `${yyyy}-${mm}-${dd}-${hh}-${min}`;
      const storeSlug = slugifyArabic(storeName || 'store');
      const userSlug = slugifyArabic(authUser?.username || 'user');
      
      const fileName = `ZERP-${storeSlug}-${userSlug}-${datePart}.json`;
      
      triggerDownload(blob, fileName);
      setBackupMessage('تم تنزيل النسخة الاحتياطية بنجاح.');
      setBackupMessageKind('success');
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر تنزيل النسخة الاحتياطية.');
      setBackupMessageKind('error');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleBackupFile = async (file: File, mode: 'verify' | 'restore') => {
    setBackupBusy(true);
    setBackupSelectedFileName(file.name || 'backup.json');
    setBackupMessage(mode === 'restore' ? 'جارٍ فحص الملف ثم تنفيذ الاسترداد...' : 'جارٍ فحص الملف...');
    setBackupMessageKind('success');
    try {
      const payload = JSON.parse(await readTextFile(file));
      const verified = await settingsApi.verifyBackup(payload);
      setBackupResult(verified);
      if (mode === 'restore') {
        const restorePayload = withRestoreConfirmation(payload);
        await settingsApi.restoreBackup(restorePayload, true);
        const restored = await settingsApi.restoreBackup(restorePayload, false);
        setBackupResult(restored);
        try {
          await refreshAdminQueries();
        } catch {
          // لا نجعل فشل تحديث الواجهة اللاحق يظهر كأنه فشل في الاسترداد نفسه.
        }
        setBackupMessage('تمت استعادة النسخة الاحتياطية بعد التحقق بنجاح.');
      } else {
        setBackupMessage(`تم التحقق من الملف: ${file.name}`);
      }
      setBackupMessageKind('success');
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر فحص ملف النسخة الاحتياطية.');
      setBackupMessageKind('error');
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
    setBackupMessageKind('success');
    try {
      const restorePayload = withRestoreConfirmation(snapshot.payload);
      await settingsApi.restoreBackup(restorePayload, true);
      const restored = await settingsApi.restoreBackup(restorePayload, false);
      setBackupResult(restored);
      setBackupMessage('تمت استعادة النسخة التلقائية بنجاح.');
      setBackupMessageKind('success');
      try {
        await refreshAdminQueries();
      } catch {
        // لا نجعل فشل تحديث الواجهة اللاحق يظهر كأنه فشل في الاسترداد نفسه.
      }
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر استعادة النسخة التلقائية.');
      setBackupMessageKind('error');
    } finally {
      setRestoreSnapshotId('');
    }
  };

  const refreshBackupConfig = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['backup-config'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.backupSnapshots }),
    ]);
  };

  const saveBackupConfig = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    setBackupMessageKind('success');
    try {
      const response = await settingsApi.saveBackupConfig({
        folderPath: backupFolderPathDraft,
        automation: {
          enabled: backupAutoEnabledDraft,
          frequency: backupFrequencyDraft,
          time: backupTimeDraft,
          weeklyDay: backupWeeklyDayDraft,
        },
      });
      setBackupFolderPathDraft(String(response.folderPath || response.defaultFolderPath || backupFolderPathDraft || 'D:\\ZS Backups'));
      setBackupMessage('تم حفظ إعدادات النسخ الاحتياطي بنجاح.');
      setBackupMessageKind('success');
      await refreshBackupConfig();
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر حفظ إعدادات النسخ الاحتياطي.');
      setBackupMessageKind('error');
    } finally {
      setBackupBusy(false);
    }
  };

  const testBackupFolder = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    setBackupMessageKind('success');
    try {
      const result = await settingsApi.testBackupFolder({ folderPath: backupFolderPathDraft });
      if (result.ok === false) {
        setBackupMessage('تعذر الوصول إلى المجلد أو لا توجد صلاحية كتابة.');
        setBackupMessageKind('error');
      } else {
        setBackupMessage('تم اختبار المسار بنجاح.');
        setBackupMessageKind('success');
      }
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر الوصول إلى المجلد أو لا توجد صلاحية كتابة.');
      setBackupMessageKind('error');
    } finally {
      setBackupBusy(false);
    }
  };

  const saveBackupFileToFolderNow = async () => {
    setBackupBusy(true);
    setBackupMessage('');
    setBackupMessageKind('success');
    try {
      const result = await settingsApi.saveBackupFileToFolder();
      const savedPath = String(result.filePath || result.path || '').trim();
      setBackupMessage(savedPath ? `تم حفظ النسخة في: ${savedPath}` : 'تم حفظ النسخة بنجاح.');
      setBackupMessageKind('success');
      await refreshBackupConfig();
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'تعذر حفظ نسخة في المجلد المحدد.');
      setBackupMessageKind('error');
    } finally {
      setBackupBusy(false);
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
    backupConfigQuery,
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
    backupMessageKind,
    backupBusy,
    backupSelectedFileName,
    backupFolderPathDraft,
    setBackupFolderPathDraft,
    backupAutoEnabledDraft,
    setBackupAutoEnabledDraft,
    backupFrequencyDraft,
    setBackupFrequencyDraft,
    backupTimeDraft,
    setBackupTimeDraft,
    backupWeeklyDayDraft,
    setBackupWeeklyDayDraft,
    supportCopyStatus,
    restoreSnapshotId,
    handleBackupDownload,
    handleBackupFile,
    handleSnapshotDownload,
    handleSnapshotRestore,
    handleCopySupportSnapshot,
    saveBackupConfig,
    testBackupFolder,
    saveBackupFileToFolderNow,
  };
}
