import { useParams } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { DataTable } from '@/shared/ui/data-table';
import { useHrPayrollRun } from '@/features/hr/hooks/useHr';
import { formatHrMoney } from '@/features/hr/pages/hr.shared';

export function PayrollRunPage() {
  const { id = '' } = useParams<{ id: string }>();
  const payrollRun = useHrPayrollRun(id);
  const run = payrollRun.data?.run;
  return (
    <div className="page-stack page-shell">
      <PageHeader title={run ? `مسير رواتب ${run.periodMonth}` : 'تفاصيل المسير'} description="تفاصيل البنود وقيم الصافي لكل موظف." />
      <QueryFeedback isLoading={payrollRun.isLoading} isError={payrollRun.isError} error={payrollRun.error} isEmpty={!run}>
        <Card title="ملخص المسير">
          <div className="stats-grid">
            <div><span className="muted">الحالة</span><strong>{run?.status || '—'}</strong></div>
            <div><span className="muted">صافي الرواتب</span><strong>{formatHrMoney(run?.totalNetPay || 0)}</strong></div>
          </div>
        </Card>
        <Card title="بنود المسير">
          <DataTable rows={run?.items || []} rowKey={(row) => row.id} columns={[
            { key: 'employee', header: 'الموظف', cell: (row) => row.employeeName || row.employeeNo || row.employeeId },
            { key: 'base', header: 'الأساسي', cell: (row) => formatHrMoney(row.baseSalary) },
            { key: 'net', header: 'الصافي', cell: (row) => formatHrMoney(row.netPay) },
          ]} />
        </Card>
      </QueryFeedback>
    </div>
  );
}
