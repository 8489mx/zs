import type { ReactNode } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { QueryCard } from '@/components/shared/QueryCard';
import { SpotlightCardStrip } from '@/components/shared/SpotlightCardStrip';
import { SettingsSectionTabs } from '@/features/settings/pages/SettingsSectionTabs';
import { SettingsSetupFlowCard } from '@/components/system/SettingsSetupFlowCard';
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
  cards,
  children,
}: SettingsPageShellProps) {
  const setupSection = currentSection as SetupSectionKey | 'overview' | 'backup';

  return (
    <div className="page-stack page-shell settings-page-shell">
      <PageHeader title={title} description={description} badge={<span className="nav-pill">{badgeLabel}</span>} />

      {setupMode ? <SettingsSetupFlowCard currentSection={setupSection} /> : null}

      {!setupMode ? (
        <QueryCard
          title="أقسام الإعدادات"
          description="اختر القسم المطلوب أولًا ثم نفّذ الإجراء داخل نفس الصفحة بدون تنقل زائد."
          actions={<span className="nav-pill">{badgeLabel}</span>}
        >
          <SettingsSectionTabs currentSection={currentSection} currentUserRole={currentUserRole} />
        </QueryCard>
      ) : null}

      <SpotlightCardStrip cards={cards} ariaLabel="إرشاد سريع لشاشة الإعدادات" />

      {children}
    </div>
  );
}
