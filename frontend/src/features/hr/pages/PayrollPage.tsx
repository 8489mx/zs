import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import type { HrPayrollRun } from '@/types/domain';
import { useHrMutations, useHrWorkspace } from '@/features/hr/hooks/useHr';
import { formatHrMoney } from '@/features/hr/pages/hr.shared';

export function PayrollPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const workspace = useHrWorkspace({ page: 1, pageSize: 30, month });
  const mutations = useHrMutations();
  const navigate = useNavigate();
  const runs = useMemo(() => workspace.payrollRuns.data?.runs || [], [workspace.payrollRuns.data?.runs]);

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الرواتب" description="متابعة وإدارة مسيرات الرواتب الشهرية." />
      <Card title="إنشاء مسير">
        <div className="form-grid">
          <label className="field"><span>الشهر</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <div className="actions compact-actions"><Button onClick={() => mutations.createPayrollRun.mutate({ periodMonth: month })} disabled={mutations.createPayrollRun.isPending}>إنشاء مسير</Button></div>
        </div>
      </Card>
      <Card title="سجل المسيرات">
        <QueryFeedback isLoading={workspace.payrollRuns.isLoading} isError={workspace.payrollRuns.isError} error={workspace.payrollRuns.error} isEmpty={!runs.length}>
          <DataTable<HrPayrollRun>
            rows={runs}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/hr/payroll/runs/${row.id}`)}
            columns={[
              { key: 'month', header: 'الشهر', cell: (row) => row.periodMonth },
              { key: 'status', header: 'الحالة', cell: (row) => row.status },
              { key: 'net', header: 'صافي الرواتب', cell: (row) => formatHrMoney(row.totalNetPay) },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
