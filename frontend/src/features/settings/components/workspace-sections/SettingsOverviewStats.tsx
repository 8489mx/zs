import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className="stats-grid compact-grid workspace-stats-grid settings-overview-grid grid-cols-3">
      <div className="stat-card"><span>{SINGLE_STORE_MODE ? t('settings.workspace_sections.settings_overview_stats.s0', "النشاط الرئيسي") : t('settings.workspace_sections.settings_overview_stats.s1', "الفرع الرئيسي")}</span><strong>{branchesCount ? t('settings.workspace_sections.settings_overview_stats.s2', "جاهز") : t('settings.workspace_sections.settings_overview_stats.s3', "غير مضاف")}</strong></div>
      <div className="stat-card"><span>{t('settings.workspace_sections.settings_overview_stats.s4', "المخزن الأساسي")}</span><strong>{locationsCount ? t('settings.workspace_sections.settings_overview_stats.s5', "جاهز") : t('settings.workspace_sections.settings_overview_stats.s6', "غير مضاف")}</strong></div>
      <div className="stat-card"><span>{t('settings.workspace_sections.settings_overview_stats.s7', "النقاط المحفوظة")}</span><strong>{snapshotsCount}</strong></div>
      <div className="stat-card"><span>{t('settings.workspace_sections.settings_overview_stats.s8', "الحفظ الوقائي")}</span><strong>{autoBackupEnabled ? t('settings.workspace_sections.settings_overview_stats.s9', "مفعّل") : t('settings.workspace_sections.settings_overview_stats.s10', "متوقف")}</strong></div>
      <div className="stat-card"><span>{t('settings.workspace_sections.settings_overview_stats.s11', "فحص التشغيل")}</span><strong>{isUatReady ? t('settings.workspace_sections.settings_overview_stats.s12', "جاهز") : t('settings.workspace_sections.settings_overview_stats.s13', "قيد التحميل")}</strong></div>
      <div className="stat-card"><span>{t('settings.workspace_sections.settings_overview_stats.s14', "بيانات الدعم")}</span><strong>{isSupportReady ? t('settings.workspace_sections.settings_overview_stats.s15', "جاهزة") : t('settings.workspace_sections.settings_overview_stats.s16', "قيد التحميل")}</strong></div>
    </div>
  );
}
