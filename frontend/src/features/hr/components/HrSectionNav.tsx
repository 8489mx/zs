import { Link, useLocation } from 'react-router-dom';

const HR_SECTIONS = [
  { label: 'نظرة عامة', to: '/hr', match: (pathname: string) => pathname === '/hr' },
  { label: 'الموظفون', to: '/hr/employees', match: (pathname: string) => pathname.startsWith('/hr/employees') },
  { label: 'الحضور', to: '/hr/attendance', match: (pathname: string) => pathname.startsWith('/hr/attendance') },
  { label: 'الإجازات', to: '/hr/leaves', match: (pathname: string) => pathname.startsWith('/hr/leaves') },
  { label: 'السلف', to: '/hr/loans', match: (pathname: string) => pathname.startsWith('/hr/loans') },
  { label: 'المرتبات', to: '/hr/payroll', match: (pathname: string) => pathname.startsWith('/hr/payroll') },
  { label: 'المستندات', to: '/hr/documents', match: (pathname: string) => pathname.startsWith('/hr/documents') },
  { label: 'العُهد', to: '/hr/assets', match: (pathname: string) => pathname.startsWith('/hr/assets') },
  { label: 'التقارير', to: '/hr/reports', match: (pathname: string) => pathname.startsWith('/hr/reports') },
  { label: 'الإعدادات', to: '/hr/settings', match: (pathname: string) => pathname.startsWith('/hr/settings') },
];

export function HrSectionNav() {
  const location = useLocation();

  return (
    <nav className="hr-section-nav" aria-label="تنقل الموارد البشرية" dir="rtl">
      <div className="muted small">الموارد البشرية</div>
      <div className="compact-actions" style={{ flexWrap: 'wrap', marginTop: 8 }}>
        {HR_SECTIONS.map((section) => {
          const isActive = section.match(location.pathname);
          return (
            <Link
              key={section.to}
              to={section.to}
              className={`hr-section-nav-link ${isActive ? 'active' : ''}`.trim()}
              aria-current={isActive ? 'page' : undefined}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
