import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportsSections, type ReportsSectionKey } from '@/features/reports/pages/reports.page-config';
import { canAccessPath } from '@/app/router/access';
import { useAuthStore } from '@/stores/auth-store';
import { prefetchRouteData } from '@/app/router/route-prefetch';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

export function ReportsSectionTabs({ currentSection }: { currentSection: ReportsSectionKey }) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { data: settings } = useSettingsQuery();
  const isRestaurantActive = settings?.restaurantModuleEnabled === true || ['restaurant', 'cafe', 'food_beverage'].includes(settings?.businessIndustry || '');

  const visibleSections = reportsSections.filter((section) => {
    if (section.restaurantOnly && !isRestaurantActive) {
      return false;
    }
    return canAccessPath(user, `/reports/${section.key}`);
  });

  return (
    <div className="filter-chip-row toolbar-chip-row reports-section-tabs">
      {visibleSections.map((section) => (
        <NavLink
          key={section.key}
          to={`/reports/${section.key}`}
          onMouseEnter={() => prefetchRouteData(`/reports/${section.key}`)}
          onTouchStart={() => prefetchRouteData(`/reports/${section.key}`)}
          className={({ isActive }) => `btn ${isActive || currentSection === section.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {t(section.label, section.label)}
        </NavLink>
      ))}
    </div>
  );
}
