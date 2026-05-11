import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee } from '@/types/domain';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';

function statusLabel(status: string) {
  if (status === 'active') return '???';
  if (status === 'inactive') return '??? ???';
  if (status === 'deactivated') return '??? ???';
  if (status === 'terminated') return '??? ???';
  return '??? ??? ?????';
}

function fallbackText(value?: string) {
  return String(value || '').trim() || '—';
}

function pickMobile(row: HrEmployee) {
  const source = row as HrEmployee & { phone?: string; mobile?: string };
  return fallbackText(source.mobile || source.phone);
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const workspace = useHrWorkspace({ search, page, pageSize });
  const rows = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const summary = workspace.employees.data?.summary;
  const totalItems = Number(summary?.totalItems || rows.length || 0);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="????????"
        description="????? ?????? ???????? ???????? ????????? ?????? ???? ??????."
        actions={<Button onClick={() => navigate('/hr/employees/new')}>????? ????</Button>}
      />

      <Card>
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="??? ?????? ?? ??? ?????? ?? ????????"
          inputAriaLabel="??? ????????"
        />

        <QueryFeedback
          isLoading={workspace.employees.isLoading}
          isError={workspace.employees.isError}
          error={workspace.employees.error}
          isEmpty={!rows.length}
          loadingText="???? ????? ?????? ????????..."
          errorTitle="???? ????? ?????? ????????"
          emptyTitle="?? ???? ?????? ??? ????. ???? ?????? ??? ????."
        >
          <DataTable
            rows={rows}
            rowKey={(row) => String(row.id)}
            density="compact"
            pagination={{
              page,
              pageSize,
              totalItems,
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPageSize(next);
                setPage(1);
              },
              itemLabel: '????',
            }}
            columns={[
              { key: 'employeeNo', header: '??? ??????', cell: (row) => fallbackText(row.employeeNo) },
              { key: 'name', header: '?????', cell: (row) => fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) },
              { key: 'mobile', header: '????????', cell: (row) => pickMobile(row) },
              { key: 'department', header: '?????', cell: (row) => fallbackText(row.departmentName) },
              { key: 'jobTitle', header: '?????? ???????', cell: (row) => fallbackText(row.jobTitleName) },
              { key: 'hireDate', header: '????? ???????', cell: (row) => fallbackText(row.hireDate) },
              { key: 'status', header: '??????', cell: (row) => statusLabel(String(row.status || '')) },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
