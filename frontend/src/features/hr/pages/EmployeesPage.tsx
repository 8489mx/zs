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
  if (status === 'active') return 'نشط';
  if (status === 'inactive') return 'غير نشط';
  if (status === 'deactivated') return 'موقوف';
  if (status === 'terminated') return 'منتهي الخدمة';
  return 'ملف غير مكتمل';
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
        title="الموظفين"
        description="إدارة بيانات الموظفين الأساسية والانتقال السريع لملف الموظف."
        actions={<Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>}
      />

      <Card>
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="بحث بالاسم أو كود الموظف أو الموبايل"
          inputAriaLabel="بحث الموظفين"
        />

        <QueryFeedback
          isLoading={workspace.employees.isLoading}
          isError={workspace.employees.isError}
          error={workspace.employees.error}
          isEmpty={!rows.length}
          loadingText="جاري تحميل بيانات الموظفين..."
          errorTitle="تعذر تحميل بيانات الموظفين"
          emptyTitle="لا يوجد موظفين حتى الآن. ابدأ بإضافة أول موظف."
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
              itemLabel: 'موظف',
            }}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => fallbackText(row.employeeNo) },
              { key: 'name', header: 'الاسم', cell: (row) => fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim()) },
              { key: 'mobile', header: 'الموبايل', cell: (row) => pickMobile(row) },
              { key: 'department', header: 'القسم', cell: (row) => fallbackText(row.departmentName) },
              { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => fallbackText(row.jobTitleName) },
              { key: 'hireDate', header: 'تاريخ التعيين', cell: (row) => fallbackText(row.hireDate) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(String(row.status || '')) },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
