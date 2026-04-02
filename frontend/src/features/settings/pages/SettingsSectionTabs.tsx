
import { NavLink } from 'react-router-dom';
import { settingsSections, type SettingsSectionKey } from '@/features/settings/pages/settings.page-config';

export function SettingsSectionTabs({ currentSection, currentUserRole }: { currentSection: SettingsSectionKey; currentUserRole: string }) {
  const isPrivilegedUser = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  const visibleSections = settingsSections.filter((section) => {
    if (section.adminOnly && !isPrivilegedUser) return false;
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
