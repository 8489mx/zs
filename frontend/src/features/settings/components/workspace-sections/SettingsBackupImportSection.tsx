import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { ImportWorkbench } from '@/features/settings/components/ImportWorkbench';
import { SnapshotList, type BackupSnapshotRecord } from '@/features/settings/components/SettingsWorkspacePrimitives';

interface SettingsBackupImportSectionProps {
  snapshots: BackupSnapshotRecord[];
  autoBackupEnabled: boolean;
  canManageBackups: boolean;
  backupBusy: boolean;
  backupSelectedFileName: string;
  backupMessage: string;
  backupMessageKind: 'success' | 'error';
  backupResult: unknown;
  restoreSnapshotId: string;
  handleBackupDownload: () => void;
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
    ['version', 'الإصدار'],
    ['exportedAt', 'تاريخ التصدير'],
    ['source', 'المصدر'],
    ['tablesPresent', 'الجداول الموجودة'],
    ['restoredTables', 'الجداول المستعادة'],
    ['product_location_stock', 'أرصدة المخازن'],
    ['products', 'الأصناف'],
    ['customers', 'العملاء'],
    ['suppliers', 'الموردون'],
    ['sales', 'المبيعات'],
    ['purchases', 'المشتريات'],
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
  backupSelectedFileName,
  backupMessage,
  backupMessageKind,
  backupResult,
  restoreSnapshotId,
  handleBackupDownload,
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

  return (
    <div className="two-column-grid">
      <QueryCard className="settings-admin-card settings-backup-card" title="النسخ الاحتياطية" actions={<span className="nav-pill">النسخ الاحتياطي</span>}>
        <div className="actions" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Button onClick={handleBackupDownload} disabled={backupBusy || !canManageBackups}>تنزيل نسخة احتياطية الآن</Button>
        </div>
        <div className="form-grid two-col-form">
          <Field label="تحقق من ملف نسخة احتياطية">
            <input type="file" accept="application/json,.json" disabled={!canManageBackups || backupBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBackupFile(file, 'verify'); e.currentTarget.value = ''; }} />
          </Field>
          <Field label="استعادة من ملف نسخة احتياطية">
            <input type="file" accept="application/json,.json" disabled={!canManageBackups || backupBusy} onChange={(e) => { const file = e.target.files?.[0]; if (file) onRequestRestoreFile(file); e.currentTarget.value = ''; }} />
          </Field>
        </div>
        <hr className="divider" />
        <div className="page-stack">
          <div className="list-row">
            <div>
              <strong>ملخص النسخ التلقائية</strong>
              <div className="muted small">اللقطات الداخلية: {snapshots.length} · النسخ التلقائي: {autoBackupEnabled ? 'مفعل' : 'متوقف'}</div>
            </div>
          </div>
          <SnapshotList snapshots={snapshots} onDownload={handleSnapshotDownload} onRestore={canManageBackups ? onRequestRestoreSnapshot : () => undefined} restoringId={restoreSnapshotId} />
        </div>
        <div className="muted small" style={{ marginTop: 12 }}>الاستعادة تستبدل البيانات الحالية.</div>
        {backupSelectedFileName ? <div className="muted small" style={{ marginTop: 8 }}>آخر ملف تم اختياره: {backupSelectedFileName}</div> : null}
        {backupMessage ? <div className={backupMessageKind === 'error' ? 'error-box' : 'success-box'} style={{ marginTop: 12 }}>{backupMessage}</div> : null}
        {summaryPairs.length ? (
          <div className="surface-card" style={{ marginTop: 12, padding: 12 }}>
            <strong>نتيجة آخر فحص / استعادة</strong>
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

      <QueryCard className="settings-admin-card settings-import-card" title="استيراد CSV" actions={<span className="nav-pill">ملفات CSV</span>}>
        <div className="two-column-grid">
          {!canManageBackups ? <div className="muted small" style={{ gridColumn: '1 / -1' }}>إدارة النسخ الاحتياطية والاستيراد غير متاحة لهذا الحساب.</div> : null}
          <ImportWorkbench
            title="استيراد الأصناف"
            requiredColumns={['name']}
            onDownloadTemplate={() => downloadTemplate('products')}
            onImportRows={importProducts}
            isPending={importProductsPending || !canManageBackups}
          />
          <ImportWorkbench
            title="استيراد العملاء"
            requiredColumns={['name']}
            onDownloadTemplate={() => downloadTemplate('customers')}
            onImportRows={importCustomers}
            isPending={importCustomersPending || !canManageBackups}
          />
          <ImportWorkbench
            title="استيراد الموردين"
            requiredColumns={['name']}
            onDownloadTemplate={() => downloadTemplate('suppliers')}
            onImportRows={importSuppliers}
            isPending={importSuppliersPending || !canManageBackups}
          />
          <ImportWorkbench
            title="استيراد المخزون الافتتاحي"
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
