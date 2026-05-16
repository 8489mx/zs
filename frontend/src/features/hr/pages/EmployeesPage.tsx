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

const STATUS_FILTERS = [
  { value: '', label: 'كل الموظفين' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'deactivated', label: 'موقوف' },
  { value: 'terminated', label: 'منتهي الخدمة' },
];

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

function isMissing(value?: string) {
  return !String(value || '').trim();
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const workspace = useHrWorkspace({ search, status, page, pageSize });
  const apiRows = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const rows = useMemo(() => {
    if (!status) return apiRows;
    return apiRows.filter((row) => String(row.status || '') === status);
  }, [apiRows, status]);
  const summary = workspace.employees.data?.summary;
  const totalItems = status ? rows.length : Number(summary?.totalItems || rows.length || 0);

  const visibleStats = useMemo(() => {
    const active = rows.filter((row) => String(row.status || '') === 'active').length;
    const missingMobile = rows.filter((row) => pickMobile(row) === '—').length;
    const missingNationalId = rows.filter((row) => isMissing(row.nationalId)).length;
    const missingOrgData = rows.filter((row) => isMissing(row.departmentName) || isMissing(row.jobTitleName)).length;
    return { active, missingMobile, missingNationalId, missingOrgData };
  }, [rows]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="الموظفون"
        description="مساحة تشغيل الموظفين: بحث سريع، متابعة اكتمال البيانات، وفتح ملف الموظف من مكان واضح."
        actions={<Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>}
      />

      <Card title="نظرة سريعة" description="مؤشرات تساعدك تراجع بيانات الموظفين الظاهرة في القائمة الحالية.">
        <div className="form-grid">
          <div className="field">
            <span>إجمالي النتائج</span>
            <strong>{totalItems}</strong>
          </div>
          <div className="field">
            <span>نشط في الصفحة الحالية</span>
            <strong>{visibleStats.active}</strong>
          </div>
          <div className="field">
            <span>ناقص موبايل</span>
            <strong>{visibleStats.missingMobile}</strong>
          </div>
          <div className="field">
            <span>ناقص رقم قومي</span>
            <strong>{visibleStats.missingNationalId}</strong>
          </div>
          <div className="field">
            <span>ناقص بيانات وظيفية</span>
            <strong>{visibleStats.missingOrgData}</strong>
          </div>
        </div>
      </Card>

      <Card title="قائمة الموظفين" description="اضغط على الصف أو زر فتح الملف لمراجعة بيانات الموظف واستكمال ملفه.">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="بحث بالاسم أو كود الموظف أو الموبايل"
          inputAriaLabel="بحث الموظفين"
        />

        <div className="compact-actions" style={{ marginBottom: 12 }}>
          {STATUS_FILTERS.map((entry) => (
            <Button
              key={entry.value || 'all'}
              type="button"
              variant={status === entry.value ? 'primary' : 'secondary'}
              onClick={() => {
                setStatus(entry.value);
                setPage(1);
              }}
            >
              {entry.label}
            </Button>
          ))}
        </div>

        <QueryFeedback
          isLoading={workspace.employees.isLoading}
          isError={workspace.employees.isError}
          error={workspace.employees.error}
          isEmpty={!rows.length}
          loadingText="جاري تحميل بيانات الموظفين..."
          errorTitle="تعذر تحميل بيانات الموظفين"
          emptyTitle={search || status ? 'لا توجد نتائج مطابقة للفلاتر الحالية.' : 'لا توجد بيانات حتى الآن.'}
        >
          <DataTable
            rows={rows}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => {
              if (row?.id) navigate(`/hr/employees/${row.id}`);
            }}
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
              {
                key: 'profile',
                header: 'الإجراء',
                cell: (row) => (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/hr/employees/${row.id}`);
                    }}
                  >
                    فتح الملف
                  </Button>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}

