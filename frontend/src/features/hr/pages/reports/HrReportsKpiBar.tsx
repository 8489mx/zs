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
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>لوحة المؤشرات المختصرة للموارد البشرية</span>
        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر لتصفية نوع التقرير فوراً</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            style={{
              background: stat.active ? '#eff6ff' : '#ffffff',
              border: `1px solid ${stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
              borderRadius: '6px',
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              minWidth: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0')}
          >
            <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
              {stat.label}
            </span>
            <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.active ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
              {stat.value}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};
