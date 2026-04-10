import { QueryCard } from '@/shared/components/query-card';
import { BranchForm, LocationForm, SettingsMainForm } from '@/features/settings/components/SettingsForms';
import type { Branch, Location, AppSettings } from '@/types/domain';
import { SINGLE_STORE_MODE, SINGLE_STORE_LABEL } from '@/config/product-scope';

interface SettingsCoreSectionProps {
  settings?: AppSettings;
  branches: Branch[];
  locations: Location[];
  settingsQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  branchesQuery: { isLoading: boolean; isError: boolean; error?: unknown };
  canManageSettings: boolean;
  setupMode?: boolean;
  onSetupAdvance?: () => void;
}

export function SettingsCoreSection({ settings, branches, locations, settingsQuery, branchesQuery, canManageSettings, setupMode = false, onSetupAdvance }: SettingsCoreSectionProps) {
  return (
    <div className="two-column-grid settings-main-grid">
      <QueryCard
        title="إعدادات المحل الأساسية"
        actions={<span className="nav-pill">الإعدادات العامة</span>}
        className="settings-primary-card"
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        error={settingsQuery.error}
        isEmpty={!settings}
        loadingText="جاري تحميل الإعدادات..."
        emptyTitle="لا توجد إعدادات حالية"
        emptyHint="يمكنك حفظ الإعدادات الأساسية من هذه الشاشة."
      >
        <SettingsMainForm settings={settings} branches={branches} locations={locations} canManageSettings={canManageSettings} setupMode={setupMode} onSetupAdvance={onSetupAdvance} />
      </QueryCard>

      <QueryCard
        title={SINGLE_STORE_MODE ? 'بيانات المتجر والمخزن الأساسي' : 'الفرع الرئيسي والمخزن الأساسي'}
        actions={<span className="nav-pill">{SINGLE_STORE_LABEL}</span>}
        className="settings-primary-card"
        isLoading={branchesQuery.isLoading}
        isError={branchesQuery.isError}
        error={branchesQuery.error}
        loadingText={SINGLE_STORE_MODE ? 'جاري تحميل بيانات المتجر...' : 'جاري تحميل الفروع...'}
      >
        {!canManageSettings ? <div className="muted small" style={{ marginBottom: 12 }}>صلاحية التعديل الإدارية غير متاحة لهذا الحساب. يمكنك مراجعة البيانات فقط.</div> : null}
        <BranchForm
          canManageSettings={canManageSettings}
          setupMode={setupMode}
          onSetupAdvance={onSetupAdvance}
          hasExistingLocations={locations.length > 0}
        />
        <hr className="divider" />
        <LocationForm
          branches={branches}
          canManageSettings={canManageSettings}
          setupMode={setupMode}
          onSetupAdvance={onSetupAdvance}
        />
      </QueryCard>
    </div>
  );
}
