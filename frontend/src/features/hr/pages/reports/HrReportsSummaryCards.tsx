import { FormSection } from '@/shared/components/form-section';
import { countText, money } from '@/features/hr/pages/reports/hr-reports.helpers';

type Props = {
  summary: {
    employeeCount?: number;
    activeEmployeeCount?: number;
    payroll?: { totalNetPay?: number };
  } | undefined;
  attendanceTotal: string;
  leavesTotal: string;
  alertsCount: number;
};

export function HrReportsSummaryCards({ summary, attendanceTotal, leavesTotal, alertsCount }: Props) {
  return (
    <div className="stats-grid">
      <FormSection title="إجمالي الموظفين"><strong>{countText(summary?.employeeCount)}</strong></FormSection>
      <FormSection title="الموظفون النشطون"><strong>{countText(summary?.activeEmployeeCount)}</strong></FormSection>
      <FormSection title="سجلات الحضور"><strong>{attendanceTotal}</strong></FormSection>
      <FormSection title="طلبات الإجازات"><strong>{leavesTotal}</strong></FormSection>
      <FormSection title="صافي المرتبات"><strong>{money(summary?.payroll?.totalNetPay)}</strong></FormSection>
      <FormSection title="عناصر تحتاج مراجعة"><strong>{countText(alertsCount)}</strong></FormSection>
    </div>
  );
}
