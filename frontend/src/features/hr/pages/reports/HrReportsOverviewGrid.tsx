import { useTranslation } from 'react-i18next';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import {
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  WalletIcon,
  BriefcaseIcon,
  BanknotesIcon,
  AlertTriangleIcon,
} from '@/features/hr/components/HrIcons';
import { money, type ReportType } from './hr-reports.helpers';

interface HrReportsOverviewGridProps {
  setReportType: (t: ReportType) => void;
  employeesReport: { total: number; active: number; missingBasics: number };
  attendanceReport: { total: string; present: string; absent: string };
  leavesReport: { total: string; pending: string; approved: string };
  loansReport: { open: number; dueAmount: number; remainingAmount: number };
  payrollReport: { runs: number; totalNet: string; needsReview: string };
  assetsReport: { total: number; assigned: number; needsReview: number };
  alerts: Array<{ id: string; type: string; target: string; note: string; action: string; to: string }>;
}

export const HrReportsOverviewGrid: React.FC<HrReportsOverviewGridProps> = ({
  setReportType,
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
      {/* 2-Column High-Density Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
        {/* Employees Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <UsersIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
              <span>{t('hr.reports.hr_reports_overview_grid.s0', "تقرير الموظفين")}</span>
            </strong>
            <Button variant="secondary" onClick={() => setReportType('employees')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_overview_grid.s1', "عرض التفاصيل")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s2', "الإجمالي")}</span><strong style={{ fontSize: '0.95rem' }}>{employeesReport.total}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s3', "نشط")}</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{employeesReport.active}</strong></div>
            <div style={{ background: '#fff', border: `1px solid ${employeesReport.missingBasics > 0 ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s4', "ملفات ناقصة")}</span><strong style={{ fontSize: '0.95rem', color: employeesReport.missingBasics > 0 ? '#dc2626' : '#0f172a' }}>{employeesReport.missingBasics}</strong></div>
          </div>
        </div>

        {/* Attendance Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ClockIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
              <span>{t('hr.reports.hr_reports_overview_grid.s5', "تقرير الحضور")}</span>
            </strong>
            <Button variant="secondary" onClick={() => setReportType('attendance')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_overview_grid.s6', "عرض التفاصيل")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s7', "سجلات الفترة")}</span><strong style={{ fontSize: '0.95rem' }}>{attendanceReport.total}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s8', "حاضر")}</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{attendanceReport.present}</strong></div>
            <div style={{ background: '#fff', border: `1px solid ${attendanceReport.absent !== '0' ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s9', "غياب / استثناء")}</span><strong style={{ fontSize: '0.95rem', color: attendanceReport.absent !== '0' ? '#dc2626' : '#0f172a' }}>{attendanceReport.absent}</strong></div>
          </div>
        </div>

        {/* Leaves Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CalendarIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
              <span>{t('hr.reports.hr_reports_overview_grid.s10', "تقرير الإجازات")}</span>
            </strong>
            <Button variant="secondary" onClick={() => setReportType('leaves')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_overview_grid.s11', "عرض التفاصيل")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s12', "الطلبات")}</span><strong style={{ fontSize: '0.95rem' }}>{leavesReport.total}</strong></div>
            <div style={{ background: '#fff', border: `1px solid ${leavesReport.pending !== '0' ? '#fde047' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s13', "قيد المراجعة")}</span><strong style={{ fontSize: '0.95rem', color: leavesReport.pending !== '0' ? '#ca8a04' : '#0f172a' }}>{leavesReport.pending}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s14', "معتمدة")}</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{leavesReport.approved}</strong></div>
          </div>
        </div>

        {/* Loans Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <WalletIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
              <span>{t('hr.reports.hr_reports_overview_grid.s15', "تقرير السلف والخصومات")}</span>
            </strong>
            <Button variant="secondary" onClick={() => setReportType('loans')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_overview_grid.s16', "عرض التفاصيل")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s17', "سلف مفتوحة")}</span><strong style={{ fontSize: '0.95rem' }}>{loansReport.open}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s18', "مستحق الشهر")}</span><strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{money(loansReport.dueAmount)}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s19', "المتبقي")}</span><strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>{money(loansReport.remainingAmount)}</strong></div>
          </div>
        </div>

        {/* Payroll Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BanknotesIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
              <span>{t('hr.reports.hr_reports_overview_grid.s20', "تقرير المرتبات")}</span>
            </strong>
            <Button variant="secondary" onClick={() => setReportType('payroll')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_overview_grid.s21', "عرض التفاصيل")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s22', "المسيرات")}</span><strong style={{ fontSize: '0.95rem' }}>{payrollReport.runs}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s23', "صافي المرتبات")}</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{payrollReport.totalNet}</strong></div>
            <div style={{ background: '#fff', border: `1px solid ${payrollReport.needsReview !== '0' ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s24', "يحتاج مراجعة")}</span><strong style={{ fontSize: '0.95rem', color: payrollReport.needsReview !== '0' ? '#dc2626' : '#0f172a' }}>{payrollReport.needsReview}</strong></div>
          </div>
        </div>

        {/* Assets Summary Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BriefcaseIcon size={16} style={{ color: 'var(--primary, #170c5c)' }} />
              <span>{t('hr.reports.hr_reports_overview_grid.s25', "تقرير العُهد")}</span>
            </strong>
            <Button variant="secondary" onClick={() => setReportType('assets')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.reports.hr_reports_overview_grid.s26', "عرض التفاصيل")}</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '6px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s27', "الإجمالي")}</span><strong style={{ fontSize: '0.95rem' }}>{assetsReport.total}</strong></div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s28', "مسلّمة")}</span><strong style={{ fontSize: '0.95rem', color: '#166534' }}>{assetsReport.assigned}</strong></div>
            <div style={{ background: '#fff', border: `1px solid ${assetsReport.needsReview > 0 ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '6px', padding: '6px 8px' }}><span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>{t('hr.reports.hr_reports_overview_grid.s29', "تالف / مفقود")}</span><strong style={{ fontSize: '0.95rem', color: assetsReport.needsReview > 0 ? '#dc2626' : '#0f172a' }}>{assetsReport.needsReview}</strong></div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangleIcon size={16} style={{ color: '#ea580c' }} />
            <span>{t('hr.reports.hr_reports_overview_grid.s30', "تنبيهات تحتاج مراجعة")}</span>
          </strong>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{alerts.length} {t('hr.reports.hr_reports_overview_grid.s31', "تنبيه")}</span>
        </div>
        {alerts.length ? (
          <DataTable
            density="compact"
            rows={alerts}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(row.to)}
            columns={[
              { key: 'type', header: t('hr.reports.hr_reports_overview_grid.s32', "النوع"), cell: (row) => row.type },
              { key: 'target', header: t('hr.reports.hr_reports_overview_grid.s33', "الموظف/الفترة"), cell: (row) => row.target },
              { key: 'note', header: t('hr.reports.hr_reports_overview_grid.s34', "التنبيه"), cell: (row) => row.note },
              { key: 'action', header: t('hr.reports.hr_reports_overview_grid.s35', "الإجراء"), cell: (row) => <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(row.to); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{row.action}</Button> },
            ]}
          />
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: '0.825rem' }}>{t('hr.reports.hr_reports_overview_grid.s36', "لا توجد تنبيهات عاجلة، كافة العمليات تسير بشكل سليم.")}</p>
        )}
      </div>
    </div>
  );
};
