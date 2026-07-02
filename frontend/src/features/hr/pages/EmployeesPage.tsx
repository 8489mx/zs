import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee } from '@/types/domain';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';
import { ImportWorkbench } from '@/shared/components/ImportWorkbench';
import { downloadExcelFile } from '@/lib/browser';
import { hrApi } from '@/features/hr/api/hr.api';
import { EmployeeAdjustmentModal } from '@/features/hr/components/EmployeeAdjustmentModal';

const STATUS_FILTERS = [
  { value: '', label: 'كل الموظفين' },
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'غير نشط' },
  { value: 'deactivated', label: 'موقوف' },
  { value: 'terminated', label: 'منتهي الخدمة' },
];

const COMPLETION_FILTERS = [
  { value: '', label: 'كل الملفات' },
  { value: 'missingMobile', label: 'ناقص موبايل' },
  { value: 'missingNationalId', label: 'ناقص رقم قومي' },
  { value: 'missingOrgData', label: 'ناقص بيانات وظيفية' },
] as const;

type CompletionFilter = (typeof COMPLETION_FILTERS)[number]['value'];

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

function matchesCompletionFilter(row: HrEmployee, filter: CompletionFilter) {
  if (!filter) return true;
  if (filter === 'missingMobile') return pickMobile(row) === '—';
  if (filter === 'missingNationalId') return isMissing(row.nationalId);
  if (filter === 'missingOrgData') return isMissing(row.departmentName) || isMissing(row.jobTitleName);
  return true;
}

function downloadEmployeesTemplate() {
  downloadExcelFile(
    'employees-template.csv',
    [
      'كود الموظف',
      'اسم الموظف',
      'رقم الهاتف',
      'البريد الإلكتروني',
      'القسم',
      'المسمى الوظيفي',
      'المنصب',
      'تاريخ التعيين',
      'نوع الأجر',
      'أجر الساعة',
      'ساعات العمل اليومية',
      'موعد الحضور',
      'موعد الانصراف',
      'فترة السماح',
      'سياسة الإضافي',
      'الحالة',
      'الرقم القومي',
      'ملاحظات',
    ],
    [[
      '001',
      'أحمد علي',
      '01000000000',
      'ahmed@example.com',
      'المبيعات',
      'كاشير',
      '',
      '2026-01-10',
      'monthly',
      '',
      '',
      '10:00',
      '18:00',
      '15',
      'review_only',
      'active',
      '29901011234567',
      'تم الاستيراد من ملف التهيئة',
    ]],
  );
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [importOpen, setImportOpen] = useState(false);
  const [adjustmentTarget, setAdjustmentTarget] = useState<{ id: number; name: string } | null>(null);

  const importEmployeesMutation = useMutation({
    mutationFn: (rows: Record<string, string>[]) => hrApi.importEmployees(rows),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hr'] });
    },
  });

  const workspace = useHrWorkspace({ search, status, page, pageSize });
  const apiRows = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const statusRows = useMemo(() => {
    if (!status) return apiRows;
    return apiRows.filter((row) => String(row.status || '') === status);
  }, [apiRows, status]);
  const rows = useMemo(() => statusRows.filter((row) => matchesCompletionFilter(row, completionFilter)), [completionFilter, statusRows]);
  const summary = workspace.employees.data?.summary;
  const totalItems = status || completionFilter ? rows.length : Number(summary?.totalItems || rows.length || 0);

  const visibleStats = useMemo(() => {
    const active = statusRows.filter((row) => String(row.status || '') === 'active').length;
    const missingMobile = statusRows.filter((row) => pickMobile(row) === '—').length;
    const missingNationalId = statusRows.filter((row) => isMissing(row.nationalId)).length;
    const missingOrgData = statusRows.filter((row) => isMissing(row.departmentName) || isMissing(row.jobTitleName)).length;
    return { active, missingMobile, missingNationalId, missingOrgData };
  }, [statusRows]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="الموظفون"
        description="مساحة تشغيل الموظفين: بحث سريع، متابعة اكتمال البيانات، وفتح ملف الموظف من مكان واضح."
        actions={(
          <div className="actions compact-actions">
            <Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>
            <Button type="button" variant={importOpen ? 'primary' : 'secondary'} onClick={() => setImportOpen((current) => !current)}>استيراد</Button>
          </div>
        )}
      />

      {importOpen ? (
        <FormSection title="استيراد الموظفين" description="استخدم نفس نمط الاستيراد الحالي في النظام: حمّل القالب ثم ارفع CSV وراجع المعاينة قبل التنفيذ.">
          <ImportWorkbench
            title="استيراد الموظفين"
            description="يدعم الأعمدة العربية أو الإنجليزية المكافئة. يتم تحديث الموظف عند التطابق، أو إضافته إذا لم يوجد."
            requiredColumns={['اسم الموظف']}
            requiredFieldKeys={['name']}
            fieldMappings={[
              { key: 'name', label: 'اسم الموظف', aliases: ['name', 'employeeName', 'fullName', 'displayName', 'employee_name', 'employee name', 'اسم الموظف', 'اسم العامل', 'الموظف'] },
              { key: 'phone', label: 'رقم الهاتف', aliases: ['phone', 'mobile', 'phoneNumber', 'رقم الهاتف', 'الموبايل'] },
              { key: 'email', label: 'البريد الإلكتروني', aliases: ['email', 'البريد الإلكتروني'] },
              { key: 'department', label: 'القسم', aliases: ['department', 'القسم', 'الإدارة'] },
              { key: 'jobTitle', label: 'الوظيفة', aliases: ['jobTitle', 'job_title', 'job title', 'الوظيفة', 'المسمى الوظيفي'] },
              { key: 'hireDate', label: 'تاريخ التعيين', aliases: ['hireDate', 'hire_date', 'hire date', 'تاريخ التعيين'] },
              { key: 'baseSalary', label: 'الراتب الأساسي', aliases: ['baseSalary', 'base_salary', 'salary', 'الراتب', 'الراتب الأساسي'] },
              { key: 'contractType', label: 'نوع العقد', aliases: ['contractType', 'contract_type', 'نوع العقد'] },
              { key: 'status', label: 'الحالة', aliases: ['status', 'الحالة'] },
              { key: 'nationalId', label: 'الرقم القومي', aliases: ['nationalId', 'national_id', 'national id', 'الرقم القومي', 'رقم قومي'] },
              { key: 'address', label: 'العنوان', aliases: ['address', 'العنوان'] },
              { key: 'notes', label: 'ملاحظات', aliases: ['notes', 'ملاحظات'] },
            ]}
            onDownloadTemplate={downloadEmployeesTemplate}
            onImportRows={(rows) => importEmployeesMutation.mutateAsync(rows)}
            isPending={importEmployeesMutation.isPending}
          />
        </FormSection>
      ) : null}

      <FormSection title="تشغيل سريع" description="اختصارات مرتبطة بالموظفين دون الرجوع للسايد بار.">
        <div className="compact-actions" style={{ flexWrap: 'wrap' }}>
          <Button type="button" onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/hr/attendance')}>فتح الحضور</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/hr/leaves')}>فتح الإجازات</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/hr/loans')}>فتح السلف</Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/hr/payroll')}>فتح المرتبات</Button>
        </div>
      </FormSection>

      <FormSection title="نظرة سريعة" description="مؤشرات تساعدك تراجع بيانات الموظفين الظاهرة في القائمة الحالية.">
        <div className="form-grid">
          <div className="field">
            <span>إجمالي النتائج</span>
            <strong>{totalItems}</strong>
          </div>
          <button className="field" type="button" onClick={() => setCompletionFilter('')} style={{ textAlign: 'right' }}>
            <span>نشط في الفلتر الحالي</span>
            <strong>{visibleStats.active}</strong>
          </button>
          <button className="field" type="button" onClick={() => { setCompletionFilter('missingMobile'); setPage(1); }} style={{ textAlign: 'right' }}>
            <span>ناقص موبايل</span>
            <strong>{visibleStats.missingMobile}</strong>
          </button>
          <button className="field" type="button" onClick={() => { setCompletionFilter('missingNationalId'); setPage(1); }} style={{ textAlign: 'right' }}>
            <span>ناقص رقم قومي</span>
            <strong>{visibleStats.missingNationalId}</strong>
          </button>
          <button className="field" type="button" onClick={() => { setCompletionFilter('missingOrgData'); setPage(1); }} style={{ textAlign: 'right' }}>
            <span>ناقص بيانات وظيفية</span>
            <strong>{visibleStats.missingOrgData}</strong>
          </button>
        </div>
      </FormSection>

      <FormSection title="قائمة الموظفين" description="اضغط على الصف أو زر فتح الملف لمراجعة بيانات الموظف واستكمال ملفه.">
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

        <div className="compact-actions" style={{ marginBottom: 12 }}>
          {COMPLETION_FILTERS.map((entry) => (
            <Button
              key={entry.value || 'all-completion'}
              type="button"
              variant={completionFilter === entry.value ? 'primary' : 'secondary'}
              onClick={() => {
                setCompletionFilter(entry.value);
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
          emptyTitle={search || status || completionFilter ? 'لا توجد نتائج مطابقة للفلاتر الحالية.' : 'لا توجد بيانات حتى الآن.'}
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
                header: 'إجراءات',
                cell: (row) => (
                  <div className="compact-actions" style={{ flexWrap: 'nowrap' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAdjustmentTarget({
                          id: Number(row.id),
                          name: fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim())
                        });
                      }}
                    >
                      مكافأة / خصم
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/hr/employees/${row.id}`);
                      }}
                    >
                      عرض الملف
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>
      </main>

      {adjustmentTarget && (
        <EmployeeAdjustmentModal
          isOpen={true}
          onClose={() => setAdjustmentTarget(null)}
          employeeId={adjustmentTarget.id}
          employeeName={adjustmentTarget.name}
        />
      )}
    </div>
  );
}
