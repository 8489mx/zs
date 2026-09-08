import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee } from '@/types/domain';
import { money, normalize, text, type ReportType } from './hr-reports.helpers';
import { employeeName, isActiveEmployee } from './hr-reports.page-helpers';

interface HrReportsDetailSectionsProps {
  reportType: ReportType;
  setReportType: (t: ReportType) => void;
  filteredEmployees: HrEmployee[];
  employeesReport: {
    total: number;
    active: number;
    inactive: number;
    missingNationalId: number;
    missingDepartmentOrTitle: number;
    missingWorkSchedule: number;
  };
  attendanceReport: {
    total: string;
    present: string;
    absent: string;
    late: string;
    needsReview: string;
  };
  leavesReport: {
    total: string;
    pending: string;
    approved: string;
    rejected: string;
    unpaid: string;
  };
  loansReport: {
    total: number;
    open: number;
    dueCount: number;
    dueAmount: number;
    remainingAmount: number;
  };
  payrollReport: {
    runs: number;
    selectedRunStatus: string;
    employeesInRun: string;
    totalBase: string;
    totalDeduction: string;
    totalLoan: string;
    totalNet: string;
    needsReview: string;
  };
  assetsReport: {
    total: number;
    assigned: number;
    returned: number;
    damaged: number;
    lost: number;
    open: number;
    needsReview: number;
  };
  alerts: Array<{ id: string; type: string; target: string; note: string; action: string; to: string }>;
}

export const HrReportsDetailSections: React.FC<HrReportsDetailSectionsProps> = ({
  reportType,
  setReportType,
  filteredEmployees,
  employeesReport,
  attendanceReport,
  leavesReport,
  loansReport,
  payrollReport,
  assetsReport,
  alerts,
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={() => setReportType('all')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>&rarr; رجوع لجميع التقارير</Button>
      </div>

      {reportType === 'employees' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير الموظفين التفصيلي</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح صفحة الموظفين</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px', marginBottom: 12 }}>
            {[
              { label: 'إجمالي النتائج', value: employeesReport.total },
              { label: 'نشط', value: employeesReport.active },
              { label: 'غير نشط', value: employeesReport.inactive },
              { label: 'بدون رقم قومي', value: employeesReport.missingNationalId, isAlert: employeesReport.missingNationalId > 0 },
              { label: 'بدون قسم/مسمى', value: employeesReport.missingDepartmentOrTitle, isAlert: employeesReport.missingDepartmentOrTitle > 0 },
              { label: 'دوام ناقص', value: employeesReport.missingWorkSchedule, isAlert: employeesReport.missingWorkSchedule > 0 },
            ].map((stat, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
          <DataTable
            density="compact"
            rowKey={(row) => String(row.id)}
            rows={filteredEmployees.slice(0, 40)}
            onRowClick={(row) => navigate(`/hr/employees/${row.id}`)}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
              { key: 'name', header: 'اسم الموظف', cell: employeeName },
              { key: 'department', header: 'القسم', cell: (row) => text(row.departmentName) },
              { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => text(row.jobTitleName) },
              { key: 'nationalId', header: 'الرقم القومي', cell: (row) => normalize(row.nationalId) ? 'موجود' : 'غير مسجل' },
              { key: 'status', header: 'الحالة', cell: (row) => isActiveEmployee(row) ? 'نشط' : 'غير نشط' }
            ]}
          />
        </div>
      )}

      {reportType === 'attendance' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير الحضور التفصيلي</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح الحضور</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: 'إجمالي سجلات الفترة', value: attendanceReport.total },
              { label: 'حاضر', value: attendanceReport.present },
              { label: 'غائب', value: attendanceReport.absent, isAlert: attendanceReport.absent !== '0' },
              { label: 'متأخر', value: attendanceReport.late },
              { label: 'غير مسجل / يحتاج مراجعة', value: attendanceReport.needsReview, isAlert: attendanceReport.needsReview !== '0' },
            ].map((stat, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'leaves' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير الإجازات التفصيلي</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح الإجازات</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: 'إجمالي الطلبات', value: leavesReport.total },
              { label: 'قيد المراجعة', value: leavesReport.pending, isAlert: leavesReport.pending !== '0' },
              { label: 'معتمدة', value: leavesReport.approved },
              { label: 'مرفوضة', value: leavesReport.rejected },
              { label: 'غير مدفوعة / أيام', value: leavesReport.unpaid },
            ].map((stat, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'loans' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير السلف والخصومات</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح السلف</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: 'إجمالي السلف', value: loansReport.total },
              { label: 'سلف مفتوحة', value: loansReport.open },
              { label: 'أقساط مستحقة', value: loansReport.dueCount, isAlert: loansReport.dueCount > 0 },
              { label: 'مستحق هذا الشهر', value: money(loansReport.dueAmount) },
              { label: 'إجمالي المتبقي', value: money(loansReport.remainingAmount) },
            ].map((stat, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'payroll' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير المرتبات</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح المرتبات</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: 'عدد المسيرات', value: payrollReport.runs },
              { label: 'حالة المسير', value: payrollReport.selectedRunStatus },
              { label: 'الموظفون', value: payrollReport.employeesInRun },
              { label: 'إجمالي الأساسي', value: payrollReport.totalBase },
              { label: 'إجمالي الخصومات', value: payrollReport.totalDeduction },
              { label: 'السلف / الأقساط', value: payrollReport.totalLoan },
              { label: 'صافي المرتبات', value: payrollReport.totalNet },
              { label: 'يحتاج مراجعة', value: payrollReport.needsReview, isAlert: payrollReport.needsReview !== '0' },
            ].map((stat, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'assets' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>تقرير العُهد</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>فتح العُهد</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: 'إجمالي العُهد', value: assetsReport.total },
              { label: 'مسلّمة', value: assetsReport.assigned },
              { label: 'مرتجعة', value: assetsReport.returned },
              { label: 'تالفة', value: assetsReport.damaged, isAlert: assetsReport.damaged > 0 },
              { label: 'مفقودة', value: assetsReport.lost, isAlert: assetsReport.lost > 0 },
              { label: 'مفتوحة', value: assetsReport.open },
              { label: 'تحتاج مراجعة', value: assetsReport.needsReview, isAlert: assetsReport.needsReview > 0 },
            ].map((stat, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</span>
                <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a' }}>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {reportType === 'alerts' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', marginBottom: '8px' }}>تنبيهات تحتاج مراجعة</strong>
          {alerts.length ? (
            <DataTable
              density="compact"
              rows={alerts}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(row.to)}
              columns={[
                { key: 'type', header: 'النوع', cell: (row) => row.type },
                { key: 'target', header: 'الموظف/الفترة', cell: (row) => row.target },
                { key: 'note', header: 'التنبيه', cell: (row) => row.note },
                { key: 'action', header: 'الإجراء', cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{row.action}</Button> },
              ]}
            />
          ) : (
            <p className="muted" style={{ margin: 0 }}>لا توجد تنبيهات ظاهرة حسب الفلاتر الحالية.</p>
          )}
        </div>
      )}
    </div>
  );
};
