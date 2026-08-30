import { NavLink } from 'react-router-dom';
import { reportsSections, type ReportsSectionKey } from '@/features/reports/pages/reports.page-config';
import { canAccessPath } from '@/app/router/access';
import { useAuthStore } from '@/stores/auth-store';
import { prefetchRouteData } from '@/app/router/route-prefetch';

export function ReportsSectionTabs({ currentSection }: { currentSection: ReportsSectionKey }) {
  const user = useAuthStore((state) => state.user);
  const visibleSections = reportsSections.filter((section) => canAccessPath(user, `/reports/${section.key}`));

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
          {section.label}
        </NavLink>
      ))}
    </div>
  );
}
