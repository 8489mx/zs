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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

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

export function HrAttendancePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayDate());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const workspace = useHrWorkspace({ search, page, pageSize });
  const employees = useMemo(() => (workspace.employees.data?.employees || []) as HrEmployee[], [workspace.employees.data?.employees]);
  const totalItems = Number(workspace.employees.data?.summary?.totalItems || employees.length || 0);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الحضور والانصراف"
        description="متابعة حضور الموظفين اليومي وتجهيز البيانات التي ستؤثر لاحقًا على المرتبات."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="اليوم">
        <div className="form-grid">
          <label className="field">
            <span>التاريخ</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <div className="field field-wide">
            <span>ملاحظة</span>
            <p className="muted" style={{ margin: 0 }}>
              تسجيل الحضور والانصراف يحتاج ربط API الحضور قبل الاستخدام الفعلي.
            </p>
          </div>
        </div>
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
          <li>تسجيل حضور</li>
          <li>تسجيل انصراف</li>
          <li>حالة اليوم</li>
          <li>التأخير والانصراف المبكر</li>
          <li>الملاحظات</li>
          <li>الربط مع المرتبات</li>
        </ul>
      </Card>
    </div>
  );
}
