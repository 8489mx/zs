import { useState } from 'react';
import { QueryCard } from '@/shared/components/query-card';
import { Button } from '@/shared/ui/button';
import { settingsApi } from '@/features/settings/api/settings.api';
import { SummaryList, downloadSummaryCsv, printSummaryList } from '@/features/settings/components/SettingsWorkspacePrimitives';

interface SettingsDiagnosticsSectionProps {
  diagnosticsQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  canManageMaintenance: boolean;
  maintenanceQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  launchQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  operationalQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  diagnosticsCounts?: Record<string, unknown>;
  diagnosticsFinance?: Record<string, unknown>;
  maintenanceSummary?: Record<string, unknown>;
  launchOrOperationalSummary?: Record<string, unknown>;
  cleanupPending: boolean;
  reconcileCustomersPending: boolean;
  reconcileSuppliersPending: boolean;
  reconcileAllPending: boolean;
  onCleanupExpiredSessions: () => void;
  onReconcileCustomers: () => void;
  onReconcileSuppliers: () => void;
  onReconcileAll: () => void;
}

export function SettingsDiagnosticsSection({
  diagnosticsQuery,
  canManageMaintenance,
  maintenanceQuery,
  launchQuery,
  operationalQuery,
  diagnosticsCounts,
  diagnosticsFinance,
  maintenanceSummary,
  launchOrOperationalSummary,
  cleanupPending,
  reconcileCustomersPending,
  reconcileSuppliersPending,
  reconcileAllPending,
  onCleanupExpiredSessions,
  onReconcileCustomers,
  onReconcileSuppliers,
  onReconcileAll
}: SettingsDiagnosticsSectionProps) {
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleClearCache = async () => {
    // @ts-ignore
    if (window.electronRuntime?.clearAppCache) {
      setIsClearingCache(true);
      try {
        // @ts-ignore
        const res = await window.electronRuntime.clearAppCache();
        if (res.ok) {
          alert('تم مسح كاش النظام بنجاح. سيتم الآن إعادة تشغيل البرنامج لتحسين الأداء.');
          // @ts-ignore
          if (window.electronRuntime.switchToStandalone) {
             // @ts-ignore
             window.electronRuntime.switchToStandalone(); // This reloads the app gracefully
          } else {
             window.location.reload();
          }
        } else {
          alert('حدث خطأ أثناء مسح الكاش: ' + res.error);
        }
      } catch (err) {
        alert('حدث خطأ أثناء مسح الكاش.');
      } finally {
        setIsClearingCache(false);
      }
    } else {
      alert('هذه الميزة متاحة فقط في نسخة سطح المكتب.');
    }
  };

  return (
    <>
      <div className="two-column-grid settings-diagnostics-grid">
        <QueryCard className="settings-admin-card" title="تشخيص النظام" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => downloadSummaryCsv('diagnostics-counts.csv', diagnosticsCounts)}>تصدير العدادات</Button><Button variant="secondary" onClick={() => downloadSummaryCsv('diagnostics-finance.csv', diagnosticsFinance)}>تصدير المالي</Button><Button variant="secondary" onClick={() => printSummaryList('تشخيص النظام - العدادات', diagnosticsCounts)}>طباعة العدادات</Button><Button variant="secondary" onClick={() => printSummaryList('تشخيص النظام - الملخص المالي', diagnosticsFinance)}>طباعة المالي</Button></div>} isLoading={diagnosticsQuery.isLoading} isError={diagnosticsQuery.isError} error={diagnosticsQuery.error}>
          <div className="two-column-grid">
            <div>
              <strong style={{ display: 'block', marginBottom: 12 }}>عدادات أساسية</strong>
              <SummaryList data={diagnosticsCounts} />
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: 12 }}>ملخص مالي</strong>
              <SummaryList data={diagnosticsFinance} />
            </div>
          </div>
        </QueryCard>

        <QueryCard className="settings-admin-card" title="الصيانة والجاهزية" actions={<div className="actions compact-actions"><Button variant="secondary" onClick={() => downloadSummaryCsv('maintenance-summary.csv', maintenanceSummary)}>تصدير الصيانة</Button><Button variant="secondary" onClick={() => downloadSummaryCsv('launch-operational-summary.csv', launchOrOperationalSummary)}>تصدير الجاهزية</Button><Button variant="secondary" onClick={() => printSummaryList('ملخص الصيانة', maintenanceSummary)}>طباعة الصيانة</Button><Button variant="secondary" onClick={() => printSummaryList('جاهزية الإطلاق والتشغيل', launchOrOperationalSummary)}>طباعة الجاهزية</Button></div>} isLoading={maintenanceQuery.isLoading || launchQuery.isLoading || operationalQuery.isLoading} isError={maintenanceQuery.isError || launchQuery.isError || operationalQuery.isError} error={maintenanceQuery.error || launchQuery.error || operationalQuery.error}>
          <div className="two-column-grid">
            <div>
              <strong style={{ display: 'block', marginBottom: 12 }}>ملخص الصيانة</strong>
              <SummaryList data={maintenanceSummary} />
            </div>
            <div>
              <strong style={{ display: 'block', marginBottom: 12 }}>ملخص الجاهزية</strong>
              <SummaryList data={launchOrOperationalSummary} />
            </div>
          </div>
          {!canManageMaintenance ? <div className="muted small" style={{ marginTop: 16 }}>تنفيذ أوامر الصيانة الإدارية غير متاح لهذا الحساب.</div> : null}<div className="actions" style={{ marginTop: 16, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={onCleanupExpiredSessions} disabled={cleanupPending || !canManageMaintenance}>تنظيف الجلسات المنتهية</Button>
            <Button variant="secondary" onClick={onReconcileCustomers} disabled={reconcileCustomersPending || !canManageMaintenance}>مطابقة أرصدة العملاء</Button>
            <Button variant="secondary" onClick={onReconcileSuppliers} disabled={reconcileSuppliersPending || !canManageMaintenance}>مطابقة أرصدة الموردين</Button>
            <Button onClick={onReconcileAll} disabled={reconcileAllPending || !canManageMaintenance}>مطابقة كل الأرصدة</Button>
            <Button variant="primary" onClick={() => window.open(settingsApi.supportBundleDownloadUrl(), '_blank')} disabled={!canManageMaintenance}>تنزيل حزمة الدعم</Button>
            <Button variant="secondary" onClick={handleClearCache} disabled={isClearingCache || !canManageMaintenance} style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>صيانة وتحسين أداء (مسح الكاش)</Button>
          </div>
        </QueryCard>
      </div>
    </>
  );
}
