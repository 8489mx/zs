import type { FormEvent } from 'react';
import { money, reviewStatusOptions, type PayrollReviewStatus } from '@/features/hr/pages/payroll/hr-payroll.helpers';

type Summary = {
  totalEmployees: number;
  totalBaseSalary: number;
  totalDeductions: number;
  totalLoanDeduction: number;
  totalNet: number;
  needsReview: number;
};

type Row = { id: string | number; employeeNo?: string; employeeName?: string; loanDeductionAmount?: number };

type Draft = { periodMonth: string; payFrequency: 'monthly' | 'weekly' | 'biweekly' | 'daily'; startDate: string; endDate: string; notes: string };

export type HrPayrollTopSectionProps = {
  monthFilter: string;
  search: string;
  departmentFilter: string;
  reviewStatusFilter: PayrollReviewStatus;
  runStatusFilter: string;
  departmentOptions: Array<{ value: string; label: string }>;
  runStatusOptions: Array<{ value: string; label: string }>;
  summary: Summary;
  canViewSalaryAmounts: boolean;
  dueLoanInstallmentRows: Row[];
  draft: Draft;
  formError: string;
  canManagePayroll: boolean;
  hasCreatePayrollRun: boolean;
  isCreatePending: boolean;
  onMonthFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDepartmentFilterChange: (value: string) => void;
  onReviewStatusFilterChange: (value: PayrollReviewStatus) => void;
  onRunStatusFilterChange: (value: string) => void;
  onDraftChange: (updater: (current: Draft) => Draft) => void;
  onCreateRun: (event: FormEvent<HTMLFormElement>) => void;
};

export function HrPayrollTopSections(props: HrPayrollTopSectionProps) {
  const {
    monthFilter,
    search,
    departmentFilter,
    reviewStatusFilter,
    runStatusFilter,
    departmentOptions,
    runStatusOptions,
    summary,
    canViewSalaryAmounts,
    onMonthFilterChange,
    onSearchChange,
    onDepartmentFilterChange,
    onReviewStatusFilterChange,
    onRunStatusFilterChange,
  } = props;

  return (
    <>
      {/* Compact Single-Row KPI Summary Bar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>ملخص مسير المرتبات ({monthFilter})</span>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>مؤشرات الحسابات الإجمالية للشهر المحدد</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' }}>
          {[
            { label: 'إجمالي الموظفين', value: summary.totalEmployees || 0, isAlert: false },
            { label: 'الرواتب الأساسية', value: canViewSalaryAmounts ? `${money(summary.totalBaseSalary)}` : '—', isAlert: false },
            { label: 'إجمالي الخصومات', value: canViewSalaryAmounts ? `${money(summary.totalDeductions)}` : '—', isAlert: summary.totalDeductions > 0 },
            { label: 'السلف والأقساط', value: canViewSalaryAmounts ? `${money(summary.totalLoanDeduction)}` : '—', isAlert: false },
            { label: 'صافي المرتبات', value: canViewSalaryAmounts ? `${money(summary.totalNet)}` : '—', isAlert: false, isPrimary: true },
            { label: 'يحتاج مراجعة', value: summary.needsReview, isAlert: summary.needsReview > 0 },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: '#ffffff',
                border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                minWidth: 0,
              }}
            >
              <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                {stat.label}
              </span>
              <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.isPrimary ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      {/* Integrated Filters Toolbar - Single Row */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="بحث باسم أو كود الموظف..."
          style={{ width: '200px', minWidth: '160px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>الشهر:</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(event) => onMonthFilterChange(event.target.value)}
            style={{ width: '130px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(event) => onDepartmentFilterChange(event.target.value)}
          style={{ width: 'auto', minWidth: '120px', maxWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
        >
          <option value="all">كل الأقسام</option>
          {departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select
          value={reviewStatusFilter}
          onChange={(event) => onReviewStatusFilterChange(event.target.value as PayrollReviewStatus)}
          style={{ width: 'auto', minWidth: '120px', maxWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
        >
          {reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>

        <select
          value={runStatusFilter}
          onChange={(event) => onRunStatusFilterChange(event.target.value)}
          style={{ width: 'auto', minWidth: '120px', maxWidth: '150px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
        >
          <option value="all">كل حالات المسير</option>
          {runStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    </>
  );
}

