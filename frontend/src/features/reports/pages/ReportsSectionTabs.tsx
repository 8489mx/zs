import { NavLink } from 'react-router-dom';
import { reportsSections, type ReportsSectionKey } from '@/features/reports/pages/reports.page-config';

export function ReportsSectionTabs({ currentSection }: { currentSection: ReportsSectionKey }) {
  return (
    <div className="filter-chip-row toolbar-chip-row reports-section-tabs">
      {reportsSections.map((section) => (
        <NavLink
          key={section.key}
          to={`/reports/${section.key}`}
          className={({ isActive }) => `btn ${isActive || currentSection === section.key ? 'btn-primary' : 'btn-secondary'}`}
        >
          {section.label}
        </NavLink>
      ))}
    </div>
  );
}
