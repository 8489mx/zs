
import { NavLink } from 'react-router-dom';
import { settingsSections, type SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import { useAuthStore } from '@/stores/auth-store';

export function SettingsSectionTabs({ currentSection, currentUserRole }: { currentSection: SettingsSectionKey; currentUserRole: string }) {
  const isPrivilegedUser = currentUserRole === 'super_admin' || currentUserRole === 'admin';
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode);

  const visibleSections = settingsSections.filter((section) => {
    if (section.superAdminOnly && currentUserRole !== 'super_admin') return false;
    if (section.adminOnly && !isPrivilegedUser) return false;
    if (section.offlineOnly && deploymentMode !== 'desktop') return false;
    return true;
  });

  return (
    <div className="filter-chip-row toolbar-chip-row settings-section-tabs">
      {visibleSections.map((section) => (
        <NavLink
          key={section.key}
          to={`/settings/${section.key}`}
          className={({ isActive }) => `btn ${isActive || currentSection === section.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {section.label}
        </NavLink>
      ))}
    </div>
  );
}
