import { Link } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { StatsGrid } from '@/shared/components/stats-grid';
import { Card } from '@/shared/ui/card';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';
import { formatHrMoney } from '@/features/hr/pages/hr.shared';

export function HrDashboardPage() {
  const workspace = useHrWorkspace({ page: 1, pageSize: 10 });
  const summary = workspace.summary.data || { employeeCount: 0, activeCount: 0, openLoans: 0, outstandingAmount: 0 };
  return (
    <div className="page-stack page-shell">
      <PageHeader title="الموارد البشرية" description="لوحة متابعة سريعة للموظفين، الرواتب، السلف، والمستندات." />
      <StatsGrid items={[
        { key: 'employees', label: 'إجمالي الموظفين', value: summary.employeeCount },
        { key: 'active', label: 'الموظفون النشطون', value: summary.activeCount },
        { key: 'loans', label: 'السلف المفتوحة', value: summary.openLoans },
        { key: 'outstanding', label: 'الرصيد المتبقي', value: formatHrMoney(summary.outstandingAmount) },
      ]} />
      <Card title="الوصول السريع">
        <div className="actions compact-actions">
          <Link to="/hr/employees">الموظفون</Link>
          <Link to="/hr/employees/new">إضافة موظف</Link>
          <Link to="/hr/payroll">الرواتب</Link>
          <Link to="/hr/loans">السلف</Link>
          <Link to="/hr/documents">المستندات</Link>
          <Link to="/hr/settings">الإعدادات</Link>
        </div>
      </Card>
    </div>
  );
}
