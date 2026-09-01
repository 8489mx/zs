import { Link, useLocation } from 'react-router-dom';

const HR_SECTIONS = [
  { label: 'نظرة عامة', shortLabel: 'نظرة عامة', to: '/hr', match: (pathname: string) => pathname === '/hr' },
  { label: 'الموظفون', shortLabel: 'الموظفون', to: '/hr/employees', match: (pathname: string) => pathname.startsWith('/hr/employees') },
  { label: 'الحضور والانصراف', shortLabel: 'الحضور', to: '/hr/attendance', match: (pathname: string) => pathname.startsWith('/hr/attendance') },
  { label: 'الإجازات', shortLabel: 'الإجازات', to: '/hr/leaves', match: (pathname: string) => pathname.startsWith('/hr/leaves') },
  { label: 'السلف', shortLabel: 'السلف', to: '/hr/loans', match: (pathname: string) => pathname.startsWith('/hr/loans') },
  { label: 'المرتبات', shortLabel: 'المرتبات', to: '/hr/payroll', match: (pathname: string) => pathname.startsWith('/hr/payroll') },
  { label: 'المستندات', shortLabel: 'المستندات', to: '/hr/documents', match: (pathname: string) => pathname.startsWith('/hr/documents') },
  { label: 'العُهد', shortLabel: 'العُهد', to: '/hr/assets', match: (pathname: string) => pathname.startsWith('/hr/assets') },
  { label: 'التقارير', shortLabel: 'التقارير', to: '/hr/reports', match: (pathname: string) => pathname.startsWith('/hr/reports') },
  { label: 'الإعدادات', shortLabel: 'الإعدادات', to: '/hr/settings', match: (pathname: string) => pathname.startsWith('/hr/settings') },
];

export function HrSectionNav() {
  const location = useLocation();

  return (
    <nav
      className="hr-section-nav"
      aria-label="تنقل الموارد البشرية"
      dir="rtl"
    >
      {HR_SECTIONS.map((section) => {
        const isActive = section.match(location.pathname);
        return (
          <Link
            key={section.to}
            to={section.to}
            className={`hr-section-nav-link ${isActive ? 'is-active' : ''}`}
            title={section.label}
          >
            <span className="hr-nav-text-full">{section.label}</span>
            <span className="hr-nav-text-short">{section.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
