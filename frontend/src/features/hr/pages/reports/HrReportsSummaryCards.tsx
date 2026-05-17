import { Card } from '@/shared/ui/card';
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
      <Card title="إجمالي الموظفين"><strong>{countText(summary?.employeeCount)}</strong></Card>
      <Card title="الموظفون النشطون"><strong>{countText(summary?.activeEmployeeCount)}</strong></Card>
      <Card title="سجلات الحضور"><strong>{attendanceTotal}</strong></Card>
      <Card title="طلبات الإجازات"><strong>{leavesTotal}</strong></Card>
      <Card title="صافي المرتبات"><strong>{money(summary?.payroll?.totalNetPay)}</strong></Card>
      <Card title="عناصر تحتاج مراجعة"><strong>{countText(alertsCount)}</strong></Card>
    </div>
  );
}
