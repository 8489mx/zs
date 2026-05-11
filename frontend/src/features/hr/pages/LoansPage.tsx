import { useMemo } from 'react';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import type { HrLoan } from '@/types/domain';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';
import { formatHrMoney } from '@/features/hr/pages/hr.shared';

export function LoansPage() {
  const workspace = useHrWorkspace({ page: 1, pageSize: 50 });
  const rows = useMemo(() => workspace.loans.data?.loans || [], [workspace.loans.data?.loans]);
  return (
    <div className="page-stack page-shell">
      <PageHeader title="السلف" description="متابعة السلف والقروض وحالات السداد." />
      <Card title="سجل السلف">
        <QueryFeedback isLoading={workspace.loans.isLoading} isError={workspace.loans.isError} error={workspace.loans.error} isEmpty={!rows.length}>
          <DataTable<HrLoan> rows={rows} rowKey={(row) => row.id} columns={[
            { key: 'loanNo', header: 'رقم', cell: (row) => row.loanNo || '—' },
            { key: 'employee', header: 'الموظف', cell: (row) => row.employeeName || '—' },
            { key: 'amount', header: 'المبلغ', cell: (row) => formatHrMoney(row.principalAmount) },
            { key: 'remaining', header: 'المتبقي', cell: (row) => formatHrMoney(row.remainingAmount) },
            { key: 'status', header: 'الحالة', cell: (row) => row.status || '—' },
          ]} />
        </QueryFeedback>
      </Card>
    </div>
  );
}
