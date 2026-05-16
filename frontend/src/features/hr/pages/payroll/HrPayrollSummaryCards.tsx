import { Card } from '@/shared/ui/card';
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
      <Card title="إجمالي الموظفين"><strong>{summary.totalEmployees || 0}</strong></Card>
      <Card title="إجمالي الرواتب الأساسية"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalBaseSalary) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
      <Card title="إجمالي الخصومات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalDeductions) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
      <Card title="إجمالي السلف / الأقساط"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalLoanDeduction) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
      <Card title="صافي المرتبات"><strong>{canViewSalaryAmounts ? (summary.totalEmployees ? money(summary.totalNet) : 'غير متاح') : 'لا تملك صلاحية عرض هذه البيانات.'}</strong></Card>
      <Card title="يحتاج مراجعة"><strong>{summary.needsReview}</strong></Card>
    </div>
  );
}
