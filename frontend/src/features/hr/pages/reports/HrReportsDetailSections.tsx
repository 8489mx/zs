import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="secondary" onClick={() => setReportType('all')} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>{t('hr.reports.hr_reports_detail_sections.s0', "→ رجوع لجميع التقارير")}</Button>
      </div>

      {reportType === 'employees' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.reports.hr_reports_detail_sections.s1', "تقرير الموظفين التفصيلي")}</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/employees')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_detail_sections.s2', "فتح صفحة الموظفين")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px', marginBottom: 12 }}>
            {[
              { label: t('hr.reports.hr_reports_detail_sections.s3', "إجمالي النتائج"), value: employeesReport.total },
              { label: t('hr.reports.hr_reports_detail_sections.s4', "نشط"), value: employeesReport.active },
              { label: t('hr.reports.hr_reports_detail_sections.s5', "غير نشط"), value: employeesReport.inactive },
              { label: t('hr.reports.hr_reports_detail_sections.s6', "بدون رقم قومي"), value: employeesReport.missingNationalId, isAlert: employeesReport.missingNationalId > 0 },
              { label: t('hr.reports.hr_reports_detail_sections.s7', "بدون قسم/مسمى"), value: employeesReport.missingDepartmentOrTitle, isAlert: employeesReport.missingDepartmentOrTitle > 0 },
              { label: t('hr.reports.hr_reports_detail_sections.s8', "دوام ناقص"), value: employeesReport.missingWorkSchedule, isAlert: employeesReport.missingWorkSchedule > 0 },
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
              { key: 'employeeNo', header: t('hr.reports.hr_reports_detail_sections.s9', "كود الموظف"), cell: (row) => text(row.employeeNo) },
              { key: 'name', header: t('hr.reports.hr_reports_detail_sections.s10', "اسم الموظف"), cell: employeeName },
              { key: 'department', header: t('hr.reports.hr_reports_detail_sections.s11', "القسم"), cell: (row) => text(row.departmentName) },
              { key: 'jobTitle', header: t('hr.reports.hr_reports_detail_sections.s12', "المسمى الوظيفي"), cell: (row) => text(row.jobTitleName) },
              { key: 'nationalId', header: t('hr.reports.hr_reports_detail_sections.s13', "الرقم القومي"), cell: (row) => normalize(row.nationalId) ? t('hr.reports.hr_reports_detail_sections.s14', "موجود") : t('hr.reports.hr_reports_detail_sections.s15', "غير مسجل") },
              { key: 'status', header: t('hr.reports.hr_reports_detail_sections.s16', "الحالة"), cell: (row) => isActiveEmployee(row) ? t('hr.reports.hr_reports_detail_sections.s17', "نشط") : t('hr.reports.hr_reports_detail_sections.s18', "غير نشط") }
            ]}
          />
        </div>
      )}

      {reportType === 'attendance' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.reports.hr_reports_detail_sections.s19', "تقرير الحضور التفصيلي")}</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/attendance')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_detail_sections.s20', "فتح الحضور")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: t('hr.reports.hr_reports_detail_sections.s21', "إجمالي سجلات الفترة"), value: attendanceReport.total },
              { label: t('hr.reports.hr_reports_detail_sections.s22', "حاضر"), value: attendanceReport.present },
              { label: t('hr.reports.hr_reports_detail_sections.s23', "غائب"), value: attendanceReport.absent, isAlert: attendanceReport.absent !== '0' },
              { label: t('hr.reports.hr_reports_detail_sections.s24', "متأخر"), value: attendanceReport.late },
              { label: t('hr.reports.hr_reports_detail_sections.s25', "غير مسجل / يحتاج مراجعة"), value: attendanceReport.needsReview, isAlert: attendanceReport.needsReview !== '0' },
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
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.reports.hr_reports_detail_sections.s26', "تقرير الإجازات التفصيلي")}</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_detail_sections.s27', "فتح الإجازات")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: t('hr.reports.hr_reports_detail_sections.s28', "إجمالي الطلبات"), value: leavesReport.total },
              { label: t('hr.reports.hr_reports_detail_sections.s29', "قيد المراجعة"), value: leavesReport.pending, isAlert: leavesReport.pending !== '0' },
              { label: t('hr.reports.hr_reports_detail_sections.s30', "معتمدة"), value: leavesReport.approved },
              { label: t('hr.reports.hr_reports_detail_sections.s31', "مرفوضة"), value: leavesReport.rejected },
              { label: t('hr.reports.hr_reports_detail_sections.s32', "غير مدفوعة / أيام"), value: leavesReport.unpaid },
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
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.reports.hr_reports_detail_sections.s33', "تقرير السلف والخصومات")}</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_detail_sections.s34', "فتح السلف")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: t('hr.reports.hr_reports_detail_sections.s35', "إجمالي السلف"), value: loansReport.total },
              { label: t('hr.reports.hr_reports_detail_sections.s36', "سلف مفتوحة"), value: loansReport.open },
              { label: t('hr.reports.hr_reports_detail_sections.s37', "أقساط مستحقة"), value: loansReport.dueCount, isAlert: loansReport.dueCount > 0 },
              { label: t('hr.reports.hr_reports_detail_sections.s38', "مستحق هذا الشهر"), value: money(loansReport.dueAmount) },
              { label: t('hr.reports.hr_reports_detail_sections.s39', "إجمالي المتبقي"), value: money(loansReport.remainingAmount) },
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
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.reports.hr_reports_detail_sections.s40', "تقرير المرتبات")}</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_detail_sections.s41', "فتح المرتبات")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: t('hr.reports.hr_reports_detail_sections.s42', "عدد المسيرات"), value: payrollReport.runs },
              { label: t('hr.reports.hr_reports_detail_sections.s43', "حالة المسير"), value: payrollReport.selectedRunStatus },
              { label: t('hr.reports.hr_reports_detail_sections.s44', "الموظفون"), value: payrollReport.employeesInRun },
              { label: t('hr.reports.hr_reports_detail_sections.s45', "إجمالي الأساسي"), value: payrollReport.totalBase },
              { label: t('hr.reports.hr_reports_detail_sections.s46', "إجمالي الخصومات"), value: payrollReport.totalDeduction },
              { label: t('hr.reports.hr_reports_detail_sections.s47', "السلف / الأقساط"), value: payrollReport.totalLoan },
              { label: t('hr.reports.hr_reports_detail_sections.s48', "صافي المرتبات"), value: payrollReport.totalNet },
              { label: t('hr.reports.hr_reports_detail_sections.s49', "يحتاج مراجعة"), value: payrollReport.needsReview, isAlert: payrollReport.needsReview !== '0' },
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
            <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{t('hr.reports.hr_reports_detail_sections.s50', "تقرير العُهد")}</strong>
            <Button variant="secondary" onClick={() => navigate('/hr/assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_detail_sections.s51', "فتح العُهد")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
            {[
              { label: t('hr.reports.hr_reports_detail_sections.s52', "إجمالي العُهد"), value: assetsReport.total },
              { label: t('hr.reports.hr_reports_detail_sections.s53', "مسلّمة"), value: assetsReport.assigned },
              { label: t('hr.reports.hr_reports_detail_sections.s54', "مرتجعة"), value: assetsReport.returned },
              { label: t('hr.reports.hr_reports_detail_sections.s55', "تالفة"), value: assetsReport.damaged, isAlert: assetsReport.damaged > 0 },
              { label: t('hr.reports.hr_reports_detail_sections.s56', "مفقودة"), value: assetsReport.lost, isAlert: assetsReport.lost > 0 },
              { label: t('hr.reports.hr_reports_detail_sections.s57', "مفتوحة"), value: assetsReport.open },
              { label: t('hr.reports.hr_reports_detail_sections.s58', "تحتاج مراجعة"), value: assetsReport.needsReview, isAlert: assetsReport.needsReview > 0 },
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
          <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a', marginBottom: '8px' }}>{t('hr.reports.hr_reports_detail_sections.s59', "تنبيهات تحتاج مراجعة")}</strong>
          {alerts.length ? (
            <DataTable
              density="compact"
              rows={alerts}
              rowKey={(row) => row.id}
              onRowClick={(row) => navigate(row.to)}
              columns={[
                { key: 'type', header: t('hr.reports.hr_reports_detail_sections.s60', "النوع"), cell: (row) => row.type },
                { key: 'target', header: t('hr.reports.hr_reports_detail_sections.s61', "الموظف/الفترة"), cell: (row) => row.target },
                { key: 'note', header: t('hr.reports.hr_reports_detail_sections.s62', "التنبيه"), cell: (row) => row.note },
                { key: 'action', header: t('hr.reports.hr_reports_detail_sections.s63', "الإجراء"), cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{row.action}</Button> },
              ]}
            />
          ) : (
            <p className="muted" style={{ margin: 0 }}>{t('hr.reports.hr_reports_detail_sections.s64', "لا توجد تنبيهات ظاهرة حسب الفلاتر الحالية.")}</p>
          )}
        </div>
      )}
    </div>
  );
};
