import { useTranslation } from 'react-i18next';
import { QueryFeedback } from '@/shared/components/query-feedback';
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
  onUpdateBranch?: (branchId: string, values: { name: string; code: string; defaultStockLocationId?: string; salesStockMode?: 'single_location' | 'all_operational_locations'; allowExternalSalesStock?: boolean }) => Promise<void>;
}

export function SettingsCoreSection({ settings, branches, locations, settingsQuery, canManageSettings, setupMode = false, onSetupAdvance, onUpdateBranch }: SettingsCoreSectionProps) {
  const { t } = useTranslation();
  return (
    <div className="settings-main-grid">
      <QueryFeedback
        isLoading={settingsQuery.isLoading}
        isError={settingsQuery.isError}
        error={settingsQuery.error}
        isEmpty={!settings}
        loadingText={t('settings.workspace_sections.settings_core_section.s0', "جاري تحميل الإعدادات...")}
        emptyTitle={t('settings.workspace_sections.settings_core_section.s1', "لا توجد إعدادات حالية")}
        emptyHint={t('settings.workspace_sections.settings_core_section.s2', "يمكنك حفظ الإعدادات الأساسية من هذه الشاشة.")}
      >
        <SettingsMainForm settings={settings} branches={branches} locations={locations} canManageSettings={canManageSettings} setupMode={setupMode} onSetupAdvance={onSetupAdvance} onUpdateBranch={onUpdateBranch} />
      </QueryFeedback>
    </div>
  );
}
