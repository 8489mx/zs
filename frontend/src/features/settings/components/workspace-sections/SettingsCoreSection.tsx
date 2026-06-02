import { QueryCard } from '@/shared/components/query-card';
import { SettingsMainForm } from '@/features/settings/components/SettingsForms';
import type { Branch, Location, AppSettings } from '@/types/domain';

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

export function SettingsCoreSection({ settings, branches, locations, settingsQuery, canManageSettings, setupMode = false, onSetupAdvance }: SettingsCoreSectionProps) {
  return (
    <div className="settings-main-grid">
      <QueryCard
        title="بيانات النشاط"
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
    </div>
  );
}
