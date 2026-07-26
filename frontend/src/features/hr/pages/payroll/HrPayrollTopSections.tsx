import type { FormEvent } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { money, reviewStatusOptions, text, type PayrollReviewStatus } from '@/features/hr/pages/payroll/hr-payroll.helpers';

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
    dueLoanInstallmentRows,
    onMonthFilterChange,
    onSearchChange,
    onDepartmentFilterChange,
    onReviewStatusFilterChange,
    onRunStatusFilterChange,
  } = props;

  return (
    <>
      <FormSection title="فترة التشغيل والفلاتر">
        <div className="form-grid">
          <label className="field"><span>الشهر</span><input type="month" value={monthFilter} onChange={(event) => onMonthFilterChange(event.target.value)} /></label>
          <label className="field"><span>السنة</span><input value={monthFilter.split('-')[0] || ''} readOnly /></label>
          <label className="field field-wide"><span>بحث الموظف (اسم/كود)</span><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="اكتب اسم الموظف أو كوده" /></label>
          <label className="field"><span>القسم</span><select value={departmentFilter} onChange={(event) => onDepartmentFilterChange(event.target.value)}><option value="all">الكل</option>{departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>حالة المراجعة</span><select value={reviewStatusFilter} onChange={(event) => onReviewStatusFilterChange(event.target.value as PayrollReviewStatus)}>{reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>حالة المسير</span><select value={runStatusFilter} onChange={(event) => onRunStatusFilterChange(event.target.value)}><option value="all">الكل</option>{runStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </FormSection>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        <FormSection title="إجمالي الموظفين"><strong>{summary.totalEmployees || 0}</strong></FormSection>
        <FormSection title="إجمالي الرواتب الأساسية"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalBaseSalary) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
        <FormSection title="إجمالي الخصومات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalDeductions) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
        <FormSection title="إجمالي السلف / الأقساط"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalLoanDeduction) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
        <FormSection title="صافي المرتبات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalNet) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
        <FormSection title="يحتاج مراجعة"><strong>{summary.needsReview}</strong></FormSection>
      </div>


      <FormSection title={`أقساط سلف مستحقة هذا الشهر (${monthFilter})`}>
        {!canViewSalaryAmounts ? (
          <p className="muted" style={{ margin: 0 }}>لا تملك صلاحية عرض هذه البيانات.</p>
        ) : dueLoanInstallmentRows.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>كود الموظف</th><th>اسم الموظف</th><th>قيمة الأقساط المستحقة</th><th>حالة المراجعة</th></tr></thead><tbody>{dueLoanInstallmentRows.map((row) => (<tr key={String(row.id)}><td>{text(row.employeeNo)}</td><td>{text(row.employeeName)}</td><td>{money(row.loanDeductionAmount)}</td><td>يحتاج مراجعة</td></tr>))}</tbody></table></div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>لا توجد أقساط مستحقة لهذه الفترة.</p>
        )}
      </FormSection>


    </>
  );
}
