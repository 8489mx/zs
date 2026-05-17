import type { FormEvent } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
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

type Draft = { periodMonth: string; notes: string };

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
    draft,
    formError,
    canManagePayroll,
    hasCreatePayrollRun,
    isCreatePending,
    onMonthFilterChange,
    onSearchChange,
    onDepartmentFilterChange,
    onReviewStatusFilterChange,
    onRunStatusFilterChange,
    onDraftChange,
    onCreateRun,
  } = props;

  return (
    <>
      <Card title="فترة التشغيل والفلاتر">
        <div className="form-grid">
          <label className="field"><span>الشهر</span><input type="month" value={monthFilter} onChange={(event) => onMonthFilterChange(event.target.value)} /></label>
          <label className="field"><span>السنة</span><input value={monthFilter.split('-')[0] || ''} readOnly /></label>
          <label className="field field-wide"><span>بحث الموظف (اسم/كود)</span><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="اكتب اسم الموظف أو كوده" /></label>
          <label className="field"><span>القسم</span><select value={departmentFilter} onChange={(event) => onDepartmentFilterChange(event.target.value)}><option value="all">الكل</option>{departmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>حالة المراجعة</span><select value={reviewStatusFilter} onChange={(event) => onReviewStatusFilterChange(event.target.value as PayrollReviewStatus)}>{reviewStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="field"><span>حالة المسير</span><select value={runStatusFilter} onChange={(event) => onRunStatusFilterChange(event.target.value)}><option value="all">الكل</option>{runStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </Card>

      <div className="stats-grid">
        <Card title="إجمالي الموظفين"><strong>{summary.totalEmployees || 0}</strong></Card>
        <Card title="إجمالي الرواتب الأساسية"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalBaseSalary) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
        <Card title="إجمالي الخصومات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalDeductions) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
        <Card title="إجمالي السلف / الأقساط"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalLoanDeduction) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
        <Card title="صافي المرتبات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalNet) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
        <Card title="يحتاج مراجعة"><strong>{summary.needsReview}</strong></Card>
      </div>

      <Card title="تنبيه مراجعة"><p className="muted" style={{ margin: 0 }}>حساب الضرائب والتأمينات يحتاج إعدادات ومراجعة محاسب قبل الاعتماد النهائي.</p></Card>

      <Card title={`أقساط سلف مستحقة هذا الشهر (${monthFilter})`}>
        {!canViewSalaryAmounts ? (
          <p className="muted" style={{ margin: 0 }}>لا تملك صلاحية عرض هذه البيانات.</p>
        ) : dueLoanInstallmentRows.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>كود الموظف</th><th>اسم الموظف</th><th>قيمة الأقساط المستحقة</th><th>حالة المراجعة</th></tr></thead><tbody>{dueLoanInstallmentRows.map((row) => (<tr key={String(row.id)}><td>{text(row.employeeNo)}</td><td>{text(row.employeeName)}</td><td>{money(row.loanDeductionAmount)}</td><td>يحتاج مراجعة</td></tr>))}</tbody></table></div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>لا توجد أقساط مستحقة لهذه الفترة.</p>
        )}
      </Card>

      <Card title="تجهيز مسير المرتبات">
        {hasCreatePayrollRun && canManagePayroll ? (
          <form className="form-grid" onSubmit={onCreateRun}>
            <label className="field"><span>شهر مسير المرتبات *</span><input type="month" value={draft.periodMonth} onChange={(event) => onDraftChange((current) => ({ ...current, periodMonth: event.target.value }))} /></label>
            <label className="field field-wide"><span>ملاحظات</span><input value={draft.notes} onChange={(event) => onDraftChange((current) => ({ ...current, notes: event.target.value }))} /></label>
            {formError ? <div className="field-wide error-box">{formError}</div> : null}
            <div className="actions compact-actions field-wide"><Button type="submit" disabled={isCreatePending}>{isCreatePending ? 'جارٍ التجهيز...' : 'تجهيز مسير المرتبات'}</Button></div>
          </form>
        ) : (
          <p className="muted">لا تملك صلاحية تنفيذ هذا الإجراء.</p>
        )}
      </Card>
    </>
  );
}
