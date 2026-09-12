
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { settingsSections, type SettingsSectionKey } from '@/features/settings/pages/settings.page-config';
import { demoDataApi } from '@/features/settings/api/demo-data.api';
import { settingsApi } from '@/features/settings/api/settings.api';
import { queryKeys } from '@/app/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { canAccessPath, isPlatformAdmin, isDesktopOfflineApp } from '@/app/router/access';
import { prefetchRouteData } from '@/app/router/route-prefetch';

export function SettingsSectionTabs({ currentSection, currentUserRole }: { currentSection: SettingsSectionKey; currentUserRole: string }) {
  const isPrivilegedUser = currentUserRole === 'super_admin' || currentUserRole === 'admin';
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const isPlatform = isPlatformAdmin(user);

  const { data: settings } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.settings(),
    staleTime: 60_000,
  });

  const demoStatusQuery = useQuery({
    queryKey: ['demo-data', 'status'],
    queryFn: () => demoDataApi.getStatus(),
    staleTime: 30_000,
  });

  const hasFeature = (feat: string) => isPlatform || Boolean(tenant?.features?.includes(feat));

  const visibleSections = settingsSections.filter((section) => {
    if ((section as any).hiddenInTabs) return false;
    if (section.superAdminOnly && !isPlatform) return false;
    if (section.adminOnly && !isPrivilegedUser) return false;
    if (section.offlineOnly && !isDesktopOfflineApp()) return false;
    if (section.requiredFeature && !hasFeature(section.requiredFeature)) return false;
    if (section.requiredModule && !isPlatform && settings && !section.requiredModule(settings)) return false;
    if (section.key === 'demo-data' && !isPlatform && demoStatusQuery.data && !demoStatusQuery.data.isEmpty) {
      return false;
    }
    if (!canAccessPath(user, `/settings/${section.key}`)) return false;
    return true;
  });

  const activeSectionKey =
    currentSection === 'marketplaces' ? 'storefront' :
    currentSection === 'daily-digest' ? 'whatsapp' :
    currentSection;

  return (
    <div className="filter-chip-row toolbar-chip-row settings-section-tabs">
      {visibleSections.map((section) => (
        <NavLink
          key={section.key}
          to={`/settings/${section.key}`}
          onMouseEnter={() => prefetchRouteData(`/settings/${section.key}`)}
          onTouchStart={() => prefetchRouteData(`/settings/${section.key}`)}
          className={({ isActive }) => `btn ${isActive || activeSectionKey === section.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {section.label}
        </NavLink>
      ))}
    </div>
  );
}
