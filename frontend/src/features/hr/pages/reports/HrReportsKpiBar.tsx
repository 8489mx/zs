import { useTranslation } from 'react-i18next';
import React from 'react';
import type { ReportType } from './hr-reports.helpers';

interface HrReportsKpiBarProps {
  reportType: ReportType;
  setReportType: (type: ReportType) => void;
  employeesReport: { total: number; missingBasics: number };
  attendanceReport: { total: string };
  leavesReport: { total: string };
  loansReport: { open: number };
  payrollReport: { totalNet: string };
  assetsReport: { needsReview: number };
  alertsCount: number;
}

export const HrReportsKpiBar: React.FC<HrReportsKpiBarProps> = ({
  reportType,
  setReportType,
  employeesReport,
  attendanceReport,
  leavesReport,
  loansReport,
  payrollReport,
  assetsReport,
  alertsCount,
}) => {
  const { t } = useTranslation();
  const stats = [
    { label: 'إجمالي الموظفين', value: employeesReport.total, onClick: () => setReportType('employees'), isAlert: false, active: reportType === 'employees' },
    { label: 'ملفات ناقصة', value: employeesReport.missingBasics, onClick: () => setReportType('employees'), isAlert: employeesReport.missingBasics > 0, active: reportType === 'employees' },
    { label: 'سجلات الحضور', value: attendanceReport.total, onClick: () => setReportType('attendance'), isAlert: false, active: reportType === 'attendance' },
    { label: 'طلبات الإجازة', value: leavesReport.total, onClick: () => setReportType('leaves'), isAlert: false, active: reportType === 'leaves' },
    { label: 'سلف مفتوحة', value: loansReport.open, onClick: () => setReportType('loans'), isAlert: false, active: reportType === 'loans' },
    { label: 'صافي المرتبات', value: payrollReport.totalNet, onClick: () => setReportType('payroll'), isAlert: false, active: reportType === 'payroll' },
    { label: 'عُهد للمراجعة', value: assetsReport.needsReview, onClick: () => setReportType('assets'), isAlert: assetsReport.needsReview > 0, active: reportType === 'assets' },
    { label: 'تنبيهات', value: alertsCount, onClick: () => setReportType('alerts'), isAlert: alertsCount > 0, active: reportType === 'alerts' },
  ];

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{t('hr.reports.hr_reports_kpi_bar.s0', "لوحة المؤشرات المختصرة للموارد البشرية")}</span>
        </div>
        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{t('hr.reports.hr_reports_kpi_bar.s1', "اضغط على أي مؤشر لتصفية نوع التقرير فوراً")}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            style={{
              background: stat.active ? '#170e5e' : '#f8fafc',
              border: `1px solid ${stat.active ? '#170e5e' : '#e2e8f0'}`,
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'none',
              boxShadow: stat.active ? '0 2px 4px rgba(23,14,94,0.15)' : 'none',
              minWidth: 0,
            }}
            onMouseEnter={(e) => {
              if (!stat.active) e.currentTarget.style.borderColor = '#170e5e';
            }}
            onMouseLeave={(e) => {
              if (!stat.active) e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: stat.active ? 'rgba(255,255,255,0.85)' : '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={stat.label}
            >
              {stat.label}
            </span>
            <strong
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: stat.active ? '#ffffff' : stat.isAlert ? '#dc2626' : '#0f172a',
                lineHeight: 1.2,
              }}
            >
              {stat.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};
