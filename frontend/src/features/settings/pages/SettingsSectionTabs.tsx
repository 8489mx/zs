
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsSections, type SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import { demoDataApi } from '@/features/settings/api/demo-data.api';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessPath, isPlatformAdmin } from '@/app/router/access';
import { prefetchRouteData } from '@/app/router/route-prefetch';

export function SettingsSectionTabs({ currentSection, currentUserRole }: { currentSection: SettingsSectionKey; currentUserRole: string }) {
  const isPrivilegedUser = currentUserRole === 'super_admin' || currentUserRole === 'admin';
  const deploymentMode = useAuthStore((state) => state.activationStatus?.deploymentMode);
  const user = useAuthStore((state) => state.user);

  const demoStatusQuery = useQuery({
    queryKey: ['demo-data', 'status'],
    queryFn: () => demoDataApi.getStatus(),
    staleTime: 30_000,
  });

  const visibleSections = settingsSections.filter((section) => {
    if (section.superAdminOnly && !isPlatformAdmin(user)) return false;
    if (section.adminOnly && !isPrivilegedUser) return false;
    if (section.offlineOnly && deploymentMode !== 'desktop' && !import.meta.env.DEV) return false;
    if (section.key === 'demo-data' && !isPlatformAdmin(user) && demoStatusQuery.data && !demoStatusQuery.data.isEmpty) {
      return false;
    }
    if (!canAccessPath(user, `/settings/${section.key}`)) return false;
    return true;
  });

  return (
    <div className="filter-chip-row toolbar-chip-row settings-section-tabs">
      {visibleSections.map((section) => (
        <NavLink
          key={section.key}
          to={`/settings/${section.key}`}
          onMouseEnter={() => prefetchRouteData(`/settings/${section.key}`)}
          onTouchStart={() => prefetchRouteData(`/settings/${section.key}`)}
          className={({ isActive }) => `btn ${isActive || currentSection === section.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {section.label}
        </NavLink>
      ))}
    </div>
  );
}
