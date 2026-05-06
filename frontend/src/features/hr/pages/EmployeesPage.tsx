import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee } from '@/types/domain';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';

export function EmployeesPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const workspace = useHrWorkspace({ search, page: 1, pageSize: 50 });
  const rows = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);

  return (
    <div className="page-stack page-shell">
      <PageHeader title="الموظفون" description="إدارة ملفات الموظفين والانتقال السريع للملف الشخصي." actions={<Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>} />
      <Card title="سجل الموظفين">
        <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="بحث بالاسم أو رقم الموظف أو القسم" />
        <QueryFeedback isLoading={workspace.employees.isLoading} isError={workspace.employees.isError} error={workspace.employees.error} isEmpty={!rows.length}>
          <DataTable<HrEmployee>
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/hr/employees/${row.id}`)}
            columns={[
              { key: 'employeeNo', header: 'رقم', cell: (row) => row.employeeNo || '—' },
              { key: 'name', header: 'الاسم', cell: (row) => row.displayName || `${row.firstName} ${row.lastName || ''}`.trim() },
              { key: 'status', header: 'الحالة', cell: (row) => row.status || '—' },
              { key: 'department', header: 'القسم', cell: (row) => row.departmentName || '—' },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
