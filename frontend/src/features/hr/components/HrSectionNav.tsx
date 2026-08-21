import { Link, useLocation } from 'react-router-dom';

const HR_SECTIONS = [
  { label: 'نظرة عامة', to: '/hr', match: (pathname: string) => pathname === '/hr' },
  { label: 'الموظفون', to: '/hr/employees', match: (pathname: string) => pathname.startsWith('/hr/employees') },
  { label: 'الحضور والانصراف', to: '/hr/attendance', match: (pathname: string) => pathname.startsWith('/hr/attendance') },
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
    <nav
      className="hr-section-nav"
      aria-label="تنقل الموارد البشرية"
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
        width: '100%',
      }}
    >
      {HR_SECTIONS.map((section) => {
        const isActive = section.match(location.pathname);
        return (
          <Link
            key={section.to}
            to={section.to}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 12px',
              borderRadius: '7px',
              fontSize: '0.815rem',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#ffffff' : 'var(--text-secondary, #475569)',
              background: isActive ? 'var(--primary, var(--primary-color, #170c5c))' : 'rgba(0, 0, 0, 0.04)',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
              }
            }}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
