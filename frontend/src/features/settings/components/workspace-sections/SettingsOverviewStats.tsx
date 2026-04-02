import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface SettingsOverviewStatsProps {
  branchesCount: number;
  locationsCount: number;
  snapshotsCount: number;
  autoBackupEnabled: boolean;
  isUatReady: boolean;
  isSupportReady: boolean;
}

export function SettingsOverviewStats({
  branchesCount,
  locationsCount,
  snapshotsCount,
  autoBackupEnabled,
  isUatReady,
  isSupportReady
}: SettingsOverviewStatsProps) {
  return (
    <div className="stats-grid compact-grid workspace-stats-grid settings-overview-grid">
      <div className="stat-card"><span>{SINGLE_STORE_MODE ? 'المتجر الرئيسي' : 'الفرع الرئيسي'}</span><strong>{branchesCount ? 'جاهز' : 'غير مضاف'}</strong></div>
      <div className="stat-card"><span>المخزن الأساسي</span><strong>{locationsCount ? 'جاهز' : 'غير مضاف'}</strong></div>
      <div className="stat-card"><span>النقاط المحفوظة</span><strong>{snapshotsCount}</strong></div>
      <div className="stat-card"><span>الحفظ الوقائي</span><strong>{autoBackupEnabled ? 'مفعّل' : 'متوقف'}</strong></div>
      <div className="stat-card"><span>فحص التشغيل</span><strong>{isUatReady ? 'جاهز' : 'قيد التحميل'}</strong></div>
      <div className="stat-card"><span>بيانات الدعم</span><strong>{isSupportReady ? 'جاهزة' : 'قيد التحميل'}</strong></div>
    </div>
  );
}
