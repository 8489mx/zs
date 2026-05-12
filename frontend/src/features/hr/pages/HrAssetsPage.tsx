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

function text(value: unknown) {
  return String(value || '').trim() || '—';
}

function employeeName(row: HrEmployee) {
  return text(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

function statusLabel(value: unknown) {
  const status = String(value || '').trim();
  if (status === 'active') return 'نشط';
  if (status === 'inactive') return 'غير نشط';
  if (status === 'deactivated') return 'موقوف';
  if (status === 'terminated') return 'منتهي الخدمة';
  return 'غير محدد';
}

export function HrAssetsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const workspace = useHrWorkspace({ search, page, pageSize });
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const totalItems = Number(workspace.employees.data?.summary?.totalItems || employees.length || 0);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="العُهد"
        description="متابعة العُهد المسلّمة للموظفين مثل الأجهزة والمفاتيح والأدوات، وتجهيز سجل واضح للاستلام والتسليم."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="العُهد">
        <p className="muted" style={{ margin: 0 }}>
          تسجيل وتسليم واسترداد العُهد يحتاج ربط API العُهد قبل الاستخدام الفعلي.
        </p>
      </Card>

      <Card title="قائمة الموظفين">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="بحث باسم الموظف أو كود الموظف"
          inputAriaLabel="بحث الموظفين"
        />

        <QueryFeedback
          isLoading={workspace.employees.isLoading}
          isError={workspace.employees.isError}
          error={workspace.employees.error}
          isEmpty={!employees.length}
          loadingText="جارٍ تحميل الموظفين..."
          errorTitle="تعذر تحميل الموظفين"
          emptyTitle="لا يوجد موظفون لعرضهم."
        >
          <DataTable
            rows={employees}
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
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => text(row.employeeNo) },
              { key: 'name', header: 'الاسم', cell: (row) => employeeName(row) },
              { key: 'department', header: 'القسم', cell: (row) => text(row.departmentName) },
              { key: 'jobTitle', header: 'المسمى الوظيفي', cell: (row) => text(row.jobTitleName) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ما سيتم ربطه لاحقًا">
        <ul className="muted" style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.9 }}>
          <li>تسجيل عهدة جديدة</li>
          <li>تسليم عهدة لموظف</li>
          <li>استرداد عهدة</li>
          <li>تسجيل تلف أو فقد</li>
          <li>سجل عهدة الموظف</li>
          <li>تصدير تقرير العُهد</li>
        </ul>
      </Card>
    </div>
  );
}
