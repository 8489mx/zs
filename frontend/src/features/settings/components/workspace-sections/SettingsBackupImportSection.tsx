import { useState } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { ImportWorkbench } from '@/features/settings/components/ImportWorkbench';
import { SnapshotList, type BackupSnapshotRecord } from '@/features/settings/components/SettingsWorkspacePrimitives';
import type { BackupConfigResponse } from '@/features/settings/api/settings.api';
import { useAuthStore } from '@/stores/auth-store';

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
  handleSupportBundleDownload?: () => Promise<void>;
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
  onExportData?: (kind: 'products' | 'customers' | 'suppliers' | 'opening-stock') => Promise<void> | void;
}

import { http } from '@/lib/http';
import { useQuery, useMutation } from '@tanstack/react-query';

function DatabaseOptimizationCard({ canManage }: { canManage: boolean }) {
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const statsQuery = useQuery({
    queryKey: ['health', 'db-stats'],
    queryFn: () => http<{ database_size_mb: number; pg_uptime_hours: number; maintenance_last_run?: any }>('/api/health/db-stats'),
    staleTime: 30_000,
  });

  const dbSize = statsQuery.data?.database_size_mb ? `${statsQuery.data.database_size_mb} MB` : '—';

  const optimizeMutation = useMutation({
    mutationFn: () => http<{ ok: boolean; message: string; database_size_mb?: number }>('/api/health/optimize-db', { method: 'POST' }),
    onSuccess: (data) => {
      setFeedback({ kind: 'success', message: data.message || 'تم تحسين قاعدة البيانات وضغط المساحة بنجاح!' });
      statsQuery.refetch();
    },
    onError: (err: any) => {
      setFeedback({ kind: 'error', message: err.message || 'فشل تشغيل عملية الصيانة.' });
    },
  });

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>صيانة وتسريع قاعدة البيانات</strong>
          <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>أداء النظام</span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
          تنظيف البيانات المؤقتة، إعادة بناء الفهارس، وضغط المساحة (VACUUM ANALYZE) لتحسين سرعة واستجابة النظام.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ textAlign: 'center', padding: '4px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>حجم البيانات</span>
          <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{dbSize}</strong>
        </div>

        <Button
          type="button"
          disabled={!canManage || optimizeMutation.isPending}
          onClick={() => {
            setFeedback(null);
            optimizeMutation.mutate();
          }}
          style={{
            fontSize: '0.82rem',
            padding: '7px 16px',
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
          }}
        >
          {optimizeMutation.isPending ? 'جاري التحسين...' : 'تحسين وتسريع الآن'}
        </Button>
      </div>

      {feedback && (
        <div style={{
          width: '100%',
          marginTop: '4px',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 600,
          background: feedback.kind === 'success' ? '#ecfdf5' : '#fef2f2',
          color: feedback.kind === 'success' ? '#047857' : '#b91c1c',
          border: feedback.kind === 'success' ? '1px solid #a7f3d0' : '1px solid #fca5a5',
        }}>
          {feedback.message}
        </div>
      )}
    </div>
  );
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
  backupSelectedFileName: _backupSelectedFileName,
  backupMessage,
  backupMessageKind,
  backupResult,
  restoreSnapshotId,
  handleBackupDownload,
  handleSupportBundleDownload,
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
  downloadTemplate,
  onExportData,
}: SettingsBackupImportSectionProps) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin';
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const summaryPairs = formatSummaryPairs(backupResult);
  const resolvedFolder = backupFolderPathDraft || backupConfigQuery.data?.folderPath || backupConfigQuery.data?.defaultFolderPath || 'D:\\ZS Backups';
  const autoState = backupConfigQuery.data?.automation;
  const weeklyDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="page-stack" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Backup & System Health Section */}
      <QueryCard
        className="settings-admin-card"
        title="النسخ الاحتياطي والأمان"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="nav-pill" style={{ background: autoBackupEnabled ? '#ecfdf5' : '#f1f5f9', color: autoBackupEnabled ? '#047857' : '#64748b', border: autoBackupEnabled ? '1px solid #a7f3d0' : '1px solid #e2e8f0', fontSize: '0.74rem', fontWeight: 700 }}>
              النسخ التلقائي: {autoBackupEnabled ? 'مفعّل' : 'متوقف'}
            </span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Quick Actions Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type="button"
                onClick={handleBackupDownload}
                disabled={backupBusy || !canManageBackups}
                style={{ background: '#0f172a', color: '#ffffff', fontSize: '0.84rem', padding: '8px 18px', fontWeight: 700 }}
              >
                تنزيل نسخة احتياطية الآن
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => void saveBackupFileToFolderNow()}
                disabled={backupBusy || !canManageBackups}
                style={{ fontSize: '0.84rem', padding: '8px 16px' }}
              >
                حفظ نسخة في المجلد الآن
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleSupportBundleDownload}
                disabled={backupBusy || !canManageBackups}
                style={{ fontSize: '0.84rem', padding: '8px 16px' }}
              >
                تنزيل حزمة الدعم
              </Button>
            </div>

            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              المسار الافتراضي: <strong style={{ color: '#0f172a' }}>{resolvedFolder}</strong>
            </span>
          </div>

          {/* 2-Column Balanced Controls */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
            {/* Column 1: Automated Backups & Folder Config */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>
                إعدادات النسخ التلقائي ومجلد الحفظ
              </strong>

              {/* Folder Path Row */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  مسار مجلد النسخ الاحتياطية على السيرفر
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    value={backupFolderPathDraft}
                    placeholder="مثال: D:\ZS Backups"
                    onChange={(event) => setBackupFolderPathDraft(event.target.value)}
                    disabled={backupBusy || !canManageBackups}
                    style={{ flex: 1, padding: '7px 12px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', outline: 'none' }}
                  />
                  <Button type="button" variant="secondary" onClick={() => void testBackupFolder()} disabled={backupBusy || !canManageBackups} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                    اختبار
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => void saveBackupConfig()} disabled={backupBusy || !canManageBackups} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                    حفظ
                  </Button>
                </div>
              </div>

              {/* Automation Schedule Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: backupFrequencyDraft === 'weekly' ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>الحالة</label>
                  <select
                    value={backupAutoEnabledDraft ? 'on' : 'off'}
                    onChange={(event) => setBackupAutoEnabledDraft(event.target.value === 'on')}
                    disabled={backupBusy || !canManageBackups}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="on">مفعّل</option>
                    <option value="off">متوقف</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>التكرار</label>
                  <select
                    value={backupFrequencyDraft}
                    onChange={(event) => setBackupFrequencyDraft(event.target.value === 'weekly' ? 'weekly' : 'daily')}
                    disabled={backupBusy || !canManageBackups}
                    style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>وقت النسخ</label>
                  <input
                    type="time"
                    value={backupTimeDraft || '03:00'}
                    onChange={(event) => setBackupTimeDraft(event.target.value || '03:00')}
                    disabled={backupBusy || !canManageBackups}
                    style={{ width: '100%', padding: '5px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>

                {backupFrequencyDraft === 'weekly' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>اليوم</label>
                    <select
                      value={backupWeeklyDayDraft}
                      onChange={(event) => setBackupWeeklyDayDraft(Number(event.target.value || 0))}
                      disabled={backupBusy || !canManageBackups}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                    >
                      {weeklyDays.map((label, index) => <option key={label} value={index}>{label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Status Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: '#64748b', background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '6px', padding: '6px 10px', marginTop: 'auto' }}>
                <span>آخر نسخة ناجحة: <strong style={{ color: '#0f172a' }}>{autoState?.lastSuccessAt ? new Date(autoState.lastSuccessAt).toLocaleString('ar-EG') : 'لا يوجد'}</strong></span>
                <span>الحالة: <strong style={{ color: autoState?.lastAttemptStatus === 'success' ? '#16a34a' : autoState?.lastAttemptStatus === 'failed' ? '#dc2626' : '#64748b' }}>{autoState?.lastAttemptStatus === 'success' ? 'ناجحة' : autoState?.lastAttemptStatus === 'failed' ? 'فشلت' : '—'}</strong></span>
              </div>
            </div>

            {/* Column 2: Restore, Verification & Optimization */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>
                  فحص واستعادة النسخ الاحتياطية
                </strong>
                <button
                  type="button"
                  onClick={() => setIsSnapshotsOpen(!isSnapshotsOpen)}
                  style={{ fontSize: '0.76rem', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', cursor: 'pointer' }}
                >
                  {isSnapshotsOpen ? 'إخفاء سجل اللقطات ▲' : `سجل اللقطات (${snapshots.length}) ▼`}
                </button>
              </div>

              {/* Custom File Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s ease' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>فحص ملف نسخة</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>للتأكد من سلامة الملف</span>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".zip,application/zip,application/json,.json"
                    disabled={!canManageBackups || backupBusy}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleBackupFile(file, 'verify'); e.currentTarget.value = ''; }}
                  />
                </label>

                {isSuperAdmin ? (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', background: '#ffffff', border: '1px dashed #fca5a5', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s ease' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c' }}>استعادة من ملف</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>تستبدل البيانات الحالية</span>
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      accept=".zip,application/zip,application/json,.json"
                      disabled={!canManageBackups || backupBusy}
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) onRequestRestoreFile(file); e.currentTarget.value = ''; }}
                    />
                  </label>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', opacity: 0.8, cursor: 'not-allowed' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>استعادة من ملف</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      خاص بالسوبر أدمن
                    </span>
                  </div>
                )}
              </div>

              {/* Backup Message feedback */}
              {backupMessage && (
                <div style={{
                  background: backupMessageKind === 'error' ? '#fef2f2' : '#ecfdf5',
                  border: backupMessageKind === 'error' ? '1px solid #fca5a5' : '1px solid #a7f3d0',
                  color: backupMessageKind === 'error' ? '#b91c1c' : '#047857',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}>
                  {backupMessage}
                </div>
              )}

              {/* Summary Pairs if verified */}
              {summaryPairs.length > 0 && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px', maxHeight: '120px', overflowY: 'auto' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.75rem' }}>
                    {summaryPairs.map((item) => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ color: '#64748b' }}>{item.label}:</span>
                        <strong style={{ color: '#0f172a' }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Snapshots Drawer if open */}
          {isSnapshotsOpen && (
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', maxHeight: '280px', overflowY: 'auto' }}>
              <SnapshotList
                snapshots={snapshots}
                onDownload={handleSnapshotDownload}
                onRestore={isSuperAdmin && canManageBackups ? onRequestRestoreSnapshot : () => undefined}
                restoringId={restoreSnapshotId}
              />
            </div>
          )}
        </div>
      </QueryCard>

      {/* Database Maintenance Strip */}
      <DatabaseOptimizationCard canManage={canManageBackups} />

      {/* Import / Export Workbench 2x2 Grid */}
      <QueryCard
        className="settings-admin-card settings-import-card"
        title="استيراد وتصدير البيانات"
        actions={<span className="nav-pill">ملفات Excel / CSV</span>}
      >
        <div className="two-column-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          {!canManageBackups ? <div className="muted small" style={{ gridColumn: '1 / -1' }}>إدارة النسخ الاحتياطي والاسترداد غير متاحة لهذا الحساب.</div> : null}
          <ImportWorkbench
            title="استيراد الأصناف"
            requiredColumns={['اسم الصنف']}
            requiredFieldKeys={['name']}
            fieldMappings={[
              { key: 'name', label: 'اسم الصنف', aliases: ['اسم الصنف (إجباري)', 'اسم الصنف', 'الاسم', 'name'] },
              { key: 'categoryName', label: 'الصنف', aliases: ['القسم', 'category'] },
              { key: 'itemType', label: 'النوع', aliases: ['النوع', 'تصنيف', 'type', 'itemType', 'item_type'] },
              { key: 'barcode', label: 'الباركود', aliases: ['barcode', 'كود'] },
              { key: 'costPrice', label: 'التكلفة', aliases: ['سعر التكلفة', 'cost', 'cost_price'] },
              { key: 'retailPrice', label: 'السعر', aliases: ['سعر البيع', 'price', 'retail_price'] },
              { key: 'stockQty', label: 'المخزون الافتتاحي', aliases: ['الكمية', 'stock', 'stockQty', 'qty'] },
              { key: 'unitName', label: 'الوحدة', aliases: ['unit', 'القياس'] },
              { key: 'warehouseName', label: 'المخزن', aliases: ['المخزن', 'warehouse', 'store'] },
            ]}
            onDownloadTemplate={() => downloadTemplate('products')}
            onExportData={onExportData ? () => onExportData('products') : undefined}
            onImportRows={importProducts}
            isPending={importProductsPending || !canManageBackups}
          />
          <ImportWorkbench
            title="استيراد/تعديل المخزون"
            requiredColumns={['الكمية']}
            requiredFieldKeys={['qty']}
            fieldMappings={[
              { key: 'barcode', label: 'الباركود', aliases: ['الباركود', 'barcode'] },
              { key: 'name', label: 'اسم الصنف', aliases: ['اسم الصنف (إجباري)', 'اسم الصنف', 'name'] },
              { key: 'qty', label: 'الكمية', aliases: ['الكمية', 'qty', 'quantity', 'stock'] },
              { key: 'warehouseName', label: 'المخزن', aliases: ['المخزن', 'warehouse', 'store'] },
            ]}
            onDownloadTemplate={() => downloadTemplate('opening-stock')}
            onExportData={onExportData ? () => onExportData('opening-stock') : undefined}
            onImportRows={importOpeningStock}
            isPending={importOpeningStockPending || !canManageBackups}
          />
          <ImportWorkbench
            title="استيراد العملاء"
            requiredColumns={['اسم العميل']}
            requiredFieldKeys={['name']}
            fieldMappings={[
              { key: 'name', label: 'اسم العميل', aliases: ['اسم العميل (إجباري)', 'اسم العميل', 'الاسم', 'name'] },
              { key: 'phone', label: 'الموبايل', aliases: ['رقم الموبايل', 'phone'] },
              { key: 'address', label: 'العنوان', aliases: ['العنوان', 'address'] },
              { key: 'type', label: 'النوع', aliases: ['نوع العميل', 'type'] },
              { key: 'creditLimit', label: 'الحد الائتماني', aliases: ['الحد الائتماني', 'creditLimit'] },
              { key: 'openingBalance', label: 'رصيد افتتاحي', aliases: ['رصيد افتتاحي', 'openingBalance'] },
              { key: 'storeCreditBalance', label: 'رصيد محفظة', aliases: ['رصيد محفظة', 'storeCreditBalance'] },
              { key: 'companyName', label: 'اسم الشركة', aliases: ['اسم الشركة', 'companyName'] },
              { key: 'taxNumber', label: 'الرقم الضريبي', aliases: ['الرقم الضريبي', 'taxNumber'] },
            ]}
            onDownloadTemplate={() => downloadTemplate('customers')}
            onExportData={onExportData ? () => onExportData('customers') : undefined}
            onImportRows={importCustomers}
            isPending={importCustomersPending || !canManageBackups}
          />
          <ImportWorkbench
            title="استيراد الموردين"
            requiredColumns={['اسم المورد']}
            requiredFieldKeys={['name']}
            fieldMappings={[
              { key: 'name', label: 'اسم المورد', aliases: ['اسم المورد (إجباري)', 'اسم المورد', 'الاسم', 'name'] },
              { key: 'phone', label: 'الموبايل', aliases: ['رقم الموبايل', 'phone'] },
              { key: 'address', label: 'العنوان', aliases: ['العنوان', 'address'] },
              { key: 'openingBalance', label: 'رصيد افتتاحي', aliases: ['رصيد افتتاحي', 'openingBalance'] },
              { key: 'notes', label: 'ملاحظات', aliases: ['ملاحظات', 'notes'] },
            ]}
            onDownloadTemplate={() => downloadTemplate('suppliers')}
            onExportData={onExportData ? () => onExportData('suppliers') : undefined}
            onImportRows={importSuppliers}
            isPending={importSuppliersPending || !canManageBackups}
          />
        </div>
      </QueryCard>
    </div>
  );
}
