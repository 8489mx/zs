import type { ReactNode } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { SettingsSectionTabs } from '@/features/settings/pages/SettingsSectionTabs';
import { SettingsSetupFlowCard } from '@/shared/system/settings-setup-flow-card';
import type { SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import type { SetupSectionKey } from '@/features/settings/hooks/useFirstRunSetupFlow';

interface SettingsPageShellProps {
  title: string;
  description: string;
  badgeLabel: string;
  setupMode: boolean;
  currentSection: SettingsSectionKey;
  currentUserRole: string;
  cards: Array<{ key: string; label: string; value: string }>;
  children: ReactNode;
}

export function SettingsPageShell({
  title,
  description,
  badgeLabel,
  setupMode,
  currentSection,
  currentUserRole,
  children,
}: SettingsPageShellProps) {
  const setupSection = currentSection as SetupSectionKey | 'overview' | 'backup';

  return (
    <div className="page-stack page-shell settings-page-shell">
      <PageHeader title={title} description={description} badge={<span className="nav-pill">{badgeLabel}</span>} />

      {setupMode ? <SettingsSetupFlowCard currentSection={setupSection} /> : null}

      {!setupMode ? (
        <div className="settings-tabs-shell">
          <SettingsSectionTabs currentSection={currentSection} currentUserRole={currentUserRole} />
        </div>
      ) : null}

      {children}
    </div>
  );
}
