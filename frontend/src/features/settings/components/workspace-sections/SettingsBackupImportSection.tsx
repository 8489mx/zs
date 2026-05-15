import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { ImportWorkbench } from '@/features/settings/components/ImportWorkbench';
import { SnapshotList, type BackupSnapshotRecord } from '@/features/settings/components/SettingsWorkspacePrimitives';
import type { BackupConfigResponse } from '@/features/settings/api/settings.api';

export interface BackupConfigQueryState {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  data?: BackupConfigResponse;
}

interface SettingsBackupImportSectionProps {
  snapshots: BackupSnapshotRecord[];
  autoBackupEnabled: boolean;
  canManageBackups: boolean;
  backupBusy: boolean;
  backupConfigQuery: BackupConfigQueryState;
  backupFolderPathDraft: string;
  setBackupFolderPathDraft: (value: string) => void;
  backupAutoEnabledDraft: boolean;
  setBackupAutoEnabledDraft: (value: boolean) => void;
  backupFrequencyDraft: 'daily' | 'weekly';
  setBackupFrequencyDraft: (value: 'daily' | 'weekly') => void;
  backupTimeDraft: string;
  setBackupTimeDraft: (value: string) => void;
  backupWeeklyDayDraft: number;
  setBackupWeeklyDayDraft: (value: number) => void;
  backupSelectedFileName: string;
  backupMessage: string;
  backupMessageKind: 'success' | 'error';
  backupResult: unknown;
  restoreSnapshotId: string;
  handleBackupDownload: () => void;
  saveBackupConfig: () => Promise<void>;
  testBackupFolder: () => Promise<void>;
  saveBackupFileToFolderNow: () => Promise<void>;
  handleBackupFile: (file: File, mode: 'verify' | 'restore') => void | Promise<void>;
  handleSnapshotDownload: (snapshot: BackupSnapshotRecord) => void;
  onRequestRestoreFile: (file: File) => void;
  onRequestRestoreSnapshot: (snapshot: BackupSnapshotRecord) => void;
  importProductsPending: boolean;
  importCustomersPending: boolean;
  importSuppliersPending: boolean;
  importOpeningStockPending: boolean;
  importProducts: (rows: Record<string, string>[]) => Promise<unknown>;
  importCustomers: (rows: Record<string, string>[]) => Promise<unknown>;
  importSuppliers: (rows: Record<string, string>[]) => Promise<unknown>;
  importOpeningStock: (rows: Record<string, string>[]) => Promise<unknown>;
  downloadTemplate: (kind: 'products' | 'customers' | 'suppliers' | 'opening-stock') => void;
}

function formatSummaryPairs(result: unknown): Array<{ label: string; value: string }> {
  if (!result || typeof result !== 'object') return [];
  const payload = result as Record<string, unknown>;
  const summary = payload.summary && typeof payload.summary === 'object' ? (payload.summary as Record<string, unknown>) : null;
  if (!summary) return [];

  const preferredKeys: Array<[string, string]> = [
    ['version', 'ط§ظ„ط¥طµط¯ط§ط±'],
    ['exportedAt', 'طھط§ط±ظٹط® ط§ظ„طھطµط¯ظٹط±'],
    ['source', 'ط§ظ„ظ…طµط¯ط±'],
    ['tablesPresent', 'ط§ظ„ط¬ط¯ط§ظˆظ„ ط§ظ„ظ…ظˆط¬ظˆط¯ط©'],
    ['restoredTables', 'ط§ظ„ط¬ط¯ط§ظˆظ„ ط§ظ„ظ…ط³طھط¹ط§ط¯ط©'],
    ['product_location_stock', 'ط£ط±طµط¯ط© ط§ظ„ظ…ط®ط§ط²ظ†'],
    ['products', 'ط§ظ„ط£طµظ†ط§ظپ'],
    ['customers', 'ط§ظ„ط¹ظ…ظ„ط§ط،'],
    ['suppliers', 'ط§ظ„ظ…ظˆط±ط¯ظˆظ†'],
    ['sales', 'ط§ظ„ظ…ط¨ظٹط¹ط§طھ'],
    ['purchases', 'ط§ظ„ظ…ط´طھط±ظٹط§طھ'],
  ];

  const rows: Array<{ label: string; value: string }> = [];
  for (const [key, label] of preferredKeys) {
    const directValue = key in payload ? payload[key] : summary[key];
    if (directValue === undefined || directValue === null || directValue === '') continue;
    rows.push({ label, value: String(directValue) });
  }
  return rows;
}

export function SettingsBackupImportSection({
  snapshots,
  autoBackupEnabled,
  canManageBackups,
  backupBusy,
  backupConfigQuery,
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
  backupSelectedFileName,
  backupMessage,
  backupMessageKind,
  backupResult,
  restoreSnapshotId,
  handleBackupDownload,
  saveBackupConfig,
  testBackupFolder,
  saveBackupFileToFolderNow,
  handleBackupFile,
  handleSnapshotDownload,
  onRequestRestoreFile,
  onRequestRestoreSnapshot,
  importProductsPending,
  importCustomersPending,
  importSuppliersPending,
  importOpeningStockPending,
  importProducts,
  importCustomers,
  importSuppliers,
  importOpeningStock,
  downloadTemplate
}: SettingsBackupImportSectionProps) {
  const summaryPairs = formatSummaryPairs(backupResult);
  const resolvedFolder = backupFolderPathDraft || backupConfigQuery.data?.folderPath || backupConfigQuery.data?.defaultFolderPath || 'D:\\ZS Backups';
  const autoState = backupConfigQuery.data?.automation;
  const weeklyDays = ['ط§ظ„ط£ط­ط¯', 'ط§ظ„ط¥ط«ظ†ظٹظ†', 'ط§ظ„ط«ظ„ط§ط«ط§ط،', 'ط§ظ„ط£ط±ط¨ط¹ط§ط،', 'ط§ظ„ط®ظ…ظٹط³', 'ط§ظ„ط¬ظ…ط¹ط©', 'ط§ظ„ط³ط¨طھ'];

  return (
    <div className="two-column-grid">
      <QueryCard className="settings-admin-card settings-backup-card" title="ط§ظ„ظ†ط³ط® ط§ظ„ط§ط­طھظٹط§ط·ظٹط©" actions={<span className="nav-pill">ط§ظ„ظ†ط³ط® ط§ظ„ط§ط­طھظٹط§ط·ظٹ</span>}>
        <div className="actions" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Button onClick={handleBackupDownload} disabled={backupBusy || !canManageBackups}>طھظ†ط²ظٹظ„ ظ†ط³ط®ط© ط§ط­طھظٹط§ط·ظٹط© ط§ظ„ط¢ظ†</Button>
        </div>
        <div className="surface-card" style={{ marginBottom: 16, padding: 12 }}>
          <strong>مجلد النسخ الاحتياطية</strong>
          <div className="muted small" style={{ marginTop: 6 }}>المسار الحالي: {resolvedFolder}</div>
          <div className="form-grid two-col-form" style={{ marginTop: 10 }}>
            <Field label="المسار">
              <input
                value={backupFolderPathDraft}
                placeholder="D:\\ZS Backups"
                onChange={(event) => setBackupFolderPathDraft(event.target.value)}
                disabled={backupBusy || !canManageBackups}
              />
            </Field>
            <div className="actions compact-actions" style={{ alignSelf: 'end', marginBottom: 4 }}>
              <Button type="button" variant="secondary" onClick={() => void testBackupFolder()} disabled={backupBusy || !canManageBackups}>اختبار المسار</Button>
              <Button type="button" variant="secondary" onClick={() => void saveBackupConfig()} disabled={backupBusy || !canManageBackups}>حفظ المسار</Button>
              <Button type="button" onClick={() => void saveBackupFileToFolderNow()} disabled={backupBusy || !canManageBackups}>حفظ نسخة في المجلد الآن</Button>
            </div>
          </div>
        </div>

        <div className="surface-card" style={{ marginBottom: 16, padding: 12 }}>
          <strong>إعدادات النسخ التلقائي</strong>
          <div className="form-grid three-col-form" style={{ marginTop: 10 }}>
            <Field label="تفعيل النسخ التلقائي">
              <select
                value={backupAutoEnabledDraft ? 'on' : 'off'}
                onChange={(event) => setBackupAutoEnabledDraft(event.target.value === 'on')}
                disabled={backupBusy || !canManageBackups}
              >
                <option value="on">مفعل</option>
                <option value="off">متوقف</option>
              </select>
            </Field>
            <Field label="التكرار">
              <select value={backupFrequencyDraft} onChange={(event) => setBackupFrequencyDraft(event.target.value === 'weekly' ? 'weekly' : 'daily')} disabled={backupBusy || !canManageBackups}>
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
              </select>
            </Field>
            <Field label="وقت النسخ">
              <input type="time" value={backupTimeDraft || '03:00'} onChange={(event) => setBackupTimeDraft(event.target.value || '03:00')} disabled={backupBusy || !canManageBackups} />
            </Field>
            {backupFrequencyDraft === 'weekly' ? (
              <Field label="يوم التنفيذ">
                <select value={backupWeeklyDayDraft} onChange={(event) => setBackupWeeklyDayDraft(Number(event.target.value || 0))} disabled={backupBusy || !canManageBackups}>
                  {weeklyDays.map((label, index) => <option key={label} value={index}>{label}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
          <div className="actions compact-actions" style={{ marginTop: 10 }}>
            <Button type="button" variant="secondary" onClick={() => void saveBackupConfig()} disabled={backupBusy || !canManageBackups}>حفظ إعدادات النسخ التلقائي</Button>
          </div>
          <hr className="divider" />
          <div className="form-grid two-col-form">
            <div className="list-row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">آخر نسخة تلقائية ناجحة</span>
              <strong>{autoState?.lastSuccessAt ? new Date(autoState.lastSuccessAt).toLocaleString('ar-EG') : '—'}</strong>
            </div>
            <div className="list-row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">آخر محاولة</span>
              <strong>{autoState?.lastAttemptAt ? new Date(autoState.lastAttemptAt).toLocaleString('ar-EG') : '—'}</strong>
            </div>
            <div className="list-row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">حالة آخر محاولة</span>
              <strong>{autoState?.lastAttemptStatus === 'success' ? 'ناجحة' : autoState?.lastAttemptStatus === 'failed' ? 'فشلت' : '—'}</strong>
            </div>
            <div className="list-row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">آخر خطأ</span>
              <strong>{autoState?.lastError || '—'}</strong>
            </div>
          </div>
        </div>
        <div className="form-grid two-col-form">
          <Field label="طھط­ظ‚ظ‚ ظ…ظ† ظ…ظ„ظپ ظ†ط³ط®ط© ط§ط­طھظٹط§ط·ظٹط©">
            <input type="file" accept="application/json,.json" disabled={!canManageBackups || backupBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBackupFile(file, 'verify'); e.currentTarget.value = ''; }} />
          </Field>
          <Field label="ط§ط³طھط¹ط§ط¯ط© ظ…ظ† ظ…ظ„ظپ ظ†ط³ط®ط© ط§ط­طھظٹط§ط·ظٹط©">
            <input type="file" accept="application/json,.json" disabled={!canManageBackups || backupBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) onRequestRestoreFile(file); e.currentTarget.value = ''; }} />
          </Field>
        </div>
        <hr className="divider" />
        <div className="page-stack">
          <div className="list-row">
            <div>
              <strong>ظ…ظ„ط®طµ ط§ظ„ظ†ط³ط® ط§ظ„طھظ„ظ‚ط§ط¦ظٹط©</strong>
              <div className="muted small">ط§ظ„ظ„ظ‚ط·ط§طھ ط§ظ„ط¯ط§ط®ظ„ظٹط©: {snapshots.length} آ· ط§ظ„ظ†ط³ط® ط§ظ„طھظ„ظ‚ط§ط¦ظٹ: {autoBackupEnabled ? 'ظ…ظپط¹ظ„' : 'ظ…طھظˆظ‚ظپ'}</div>
            </div>
          </div>
          <SnapshotList snapshots={snapshots} onDownload={handleSnapshotDownload} onRestore={canManageBackups ? onRequestRestoreSnapshot : () => undefined} restoringId={restoreSnapshotId} />
        </div>
        <div className="muted small" style={{ marginTop: 12 }}>ط§ظ„ط§ط³طھط¹ط§ط¯ط© طھط³طھط¨ط¯ظ„ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط§ظ„ظٹط©.</div>
        {backupSelectedFileName ? <div className="muted small" style={{ marginTop: 8 }}>ط¢ط®ط± ظ…ظ„ظپ طھظ… ط§ط®طھظٹط§ط±ظ‡: {backupSelectedFileName}</div> : null}
        {backupMessage ? <div className={backupMessageKind === 'error' ? 'error-box' : 'success-box'} style={{ marginTop: 12 }}>{backupMessage}</div> : null}
        {summaryPairs.length ? (
          <div className="surface-card" style={{ marginTop: 12, padding: 12 }}>
            <strong>ظ†طھظٹط¬ط© ط¢ط®ط± ظپط­طµ / ط§ط³طھط¹ط§ط¯ط©</strong>
            <div className="form-grid two-col-form" style={{ marginTop: 10 }}>
              {summaryPairs.map((item) => (
                <div key={item.label} className="list-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted small">{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </QueryCard>

      <QueryCard className="settings-admin-card settings-import-card" title="ط§ط³طھظٹط±ط§ط¯ CSV" actions={<span className="nav-pill">ظ…ظ„ظپط§طھ CSV</span>}>
        <div className="two-column-grid">
          {!canManageBackups ? <div className="muted small" style={{ gridColumn: '1 / -1' }}>ط¥ط¯ط§ط±ط© ط§ظ„ظ†ط³ط® ط§ظ„ط§ط­طھظٹط§ط·ظٹط© ظˆط§ظ„ط§ط³طھظٹط±ط§ط¯ ط؛ظٹط± ظ…طھط§ط­ط© ظ„ظ‡ط°ط§ ط§ظ„ط­ط³ط§ط¨.</div> : null}
          <ImportWorkbench
            title="ط§ط³طھظٹط±ط§ط¯ ط§ظ„ط£طµظ†ط§ظپ"
            requiredColumns={['name']}
            onDownloadTemplate={() => downloadTemplate('products')}
            onImportRows={importProducts}
            isPending={importProductsPending || !canManageBackups}
          />
          <ImportWorkbench
            title="ط§ط³طھظٹط±ط§ط¯ ط§ظ„ط¹ظ…ظ„ط§ط،"
            requiredColumns={['name']}
            onDownloadTemplate={() => downloadTemplate('customers')}
            onImportRows={importCustomers}
            isPending={importCustomersPending || !canManageBackups}
          />
          <ImportWorkbench
            title="ط§ط³طھظٹط±ط§ط¯ ط§ظ„ظ…ظˆط±ط¯ظٹظ†"
            requiredColumns={['name']}
            onDownloadTemplate={() => downloadTemplate('suppliers')}
            onImportRows={importSuppliers}
            isPending={importSuppliersPending || !canManageBackups}
          />
          <ImportWorkbench
            title="ط§ط³طھظٹط±ط§ط¯ ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ط§ظپطھطھط§ط­ظٹ"
            requiredColumns={['qty']}
            onDownloadTemplate={() => downloadTemplate('opening-stock')}
            onImportRows={importOpeningStock}
            isPending={importOpeningStockPending || !canManageBackups}
          />
        </div>
      </QueryCard>
    </div>
  );
}


