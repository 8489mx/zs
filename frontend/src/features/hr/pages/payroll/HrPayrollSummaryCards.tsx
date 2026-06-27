import { FormSection } from '@/shared/components/form-section';
import { money } from '@/features/hr/pages/payroll/hr-payroll.helpers';

type Props = {
  summary: {
    totalEmployees: number;
    totalBaseSalary: number;
    totalDeductions: number;
    totalLoanDeduction: number;
    totalNet: number;
    needsReview: number;
  };
  canViewSalaryAmounts: boolean;
};

export function HrPayrollSummaryCards({ summary, canViewSalaryAmounts }: Props) {
  return (
    <div className="stats-grid">
      <FormSection title="إجمالي الموظفين"><strong>{summary.totalEmployees || 0}</strong></FormSection>
      <FormSection title="إجمالي الرواتب الأساسية"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalBaseSalary) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
      <FormSection title="إجمالي الخصومات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalDeductions) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
      <FormSection title="إجمالي السلف / الأقساط"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalLoanDeduction) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
      <FormSection title="صافي المرتبات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalNet) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></FormSection>
      <FormSection title="يحتاج مراجعة"><strong>{summary.needsReview}</strong></FormSection>
    </div>
  );
}
