import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrDocument, HrEmployee } from '@/types/domain';
import { useHrProfile, useHrWorkspace } from '@/features/hr/hooks/useHr';

function fallbackText(value: unknown) {
  return String(value || '').trim() || '—';
}

function statusLabel(status: unknown) {
  const value = String(status || '').trim();
  if (value === 'active') return 'نشط';
  if (value === 'inactive') return 'غير نشط';
  if (value === 'deactivated') return 'موقوف';
  if (value === 'terminated') return 'منتهي الخدمة';
  return 'غير محدد';
}

function documentStatus(expiryDate?: string) {
  const date = String(expiryDate || '').trim();
  if (!date) return 'غير محدد';
  const today = new Date().toISOString().slice(0, 10);
  return date < today ? 'منتهي' : 'ساري';
}

function employeeName(row: HrEmployee) {
  return fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

export function HrDocumentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const workspace = useHrWorkspace({ search, page, pageSize });
  const profile = useHrProfile(selectedEmployeeId);

  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const documents = useMemo(() => (profile.data?.documents || []) as HrDocument[], [profile.data?.documents]);
  const selectedEmployee = useMemo(
    () => employees.find((row) => String(row.id) === String(selectedEmployeeId)) || profile.data?.employee,
    [employees, profile.data?.employee, selectedEmployeeId],
  );

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="مستندات الموظفين"
        description="متابعة مستندات الموظفين وتواريخ الانتهاء من مكان واحد."
        actions={<Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>}
      />

      <Card title="اختيار الموظف">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="بحث باسم الموظف أو الكود أو الموبايل"
          inputAriaLabel="بحث الموظفين"
        />
        <QueryFeedback
          isLoading={workspace.employees.isLoading}
          isError={workspace.employees.isError}
          error={workspace.employees.error}
          isEmpty={!employees.length}
          loadingText="جاري تحميل الموظفين..."
          errorTitle="تعذر تحميل الموظفين"
          emptyTitle="لا يوجد موظفين مطابقين للبحث."
        >
          <DataTable
            rows={employees}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => {
              if (row?.id) setSelectedEmployeeId(String(row.id));
            }}
            density="compact"
            pagination={{
              page,
              pageSize,
              totalItems: Number(workspace.employees.data?.summary?.totalItems || employees.length || 0),
              onPageChange: setPage,
              onPageSizeChange: (next) => {
                setPageSize(next);
                setPage(1);
              },
              itemLabel: 'موظف',
            }}
            columns={[
              { key: 'employeeNo', header: 'كود الموظف', cell: (row) => fallbackText(row.employeeNo) },
              { key: 'name', header: 'الاسم', cell: (row) => employeeName(row) },
              { key: 'department', header: 'القسم', cell: (row) => fallbackText(row.departmentName) },
              { key: 'status', header: 'الحالة', cell: (row) => statusLabel(row.status) },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="مستندات الموظف">
        {!selectedEmployeeId ? (
          <p className="muted">اختر موظفًا لعرض مستنداته.</p>
        ) : (
          <QueryFeedback
            isLoading={profile.isLoading}
            isError={profile.isError}
            error={profile.error}
            isEmpty={false}
            loadingText="جاري تحميل مستندات الموظف..."
            errorTitle="تعذر تحميل مستندات الموظف"
          >
            <p className="muted" style={{ marginTop: 0 }}>ملف الموظف: {employeeName(selectedEmployee as HrEmployee)}</p>
            {documents.length ? (
              <DataTable
                rows={documents}
                rowKey={(row) => String(row.id)}
                density="compact"
                columns={[
                  { key: 'title', header: 'اسم المستند', cell: (row) => fallbackText(row.title) },
                  { key: 'documentType', header: 'نوع المستند', cell: (row) => fallbackText(row.documentType) },
                  { key: 'expiryDate', header: 'تاريخ الانتهاء', cell: (row) => fallbackText(row.expiryDate) },
                  { key: 'status', header: 'الحالة', cell: (row) => documentStatus(row.expiryDate) },
                  { key: 'notes', header: 'ملاحظات', cell: (row) => fallbackText(row.notes) },
                ]}
              />
            ) : <p className="muted">لا توجد مستندات مسجلة لهذا الموظف.</p>}
          </QueryFeedback>
        )}
      </Card>
    </div>
  );
}
