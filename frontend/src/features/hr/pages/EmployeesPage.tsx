import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { DataTable } from '@/shared/ui/data-table';
import type { HrEmployee } from '@/types/domain';
import { useHrWorkspace } from '@/features/hr/hooks/useHr';
import { ImportWorkbench } from '@/shared/components/ImportWorkbench';
import { downloadExcelFile } from '@/lib/browser';
import { hrApi } from '@/features/hr/api/hr.api';

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
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title="الموظفون"
          description="إدارة بيانات الموظفين وعقود العمل واستكمال الملفات الوظيفية."
          actions={
            <div className="actions compact-actions">
              <Button onClick={() => navigate('/hr/employees/new')}>إضافة موظف</Button>
              <Button type="button" variant={importOpen ? 'primary' : 'secondary'} onClick={() => setImportOpen((current) => !current)}>استيراد</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {importOpen ? (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
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
            </div>
          ) : null}

          {/* Compact Single-Row KPI Summary Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>مؤشرات استكمال بيانات الموظفين</span>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>اضغط على أي مؤشر لتصفية القائمة فوراً</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { label: 'إجمالي النتائج', value: totalItems, onClick: () => { setCompletionFilter(''); setPage(1); }, isAlert: false, active: !completionFilter },
                { label: 'نشط (فلتر حالي)', value: visibleStats.active, onClick: () => { setStatus('active'); setPage(1); }, isAlert: false, active: status === 'active' },
                { label: 'ناقص موبايل', value: visibleStats.missingMobile, onClick: () => { setCompletionFilter('missingMobile'); setPage(1); }, isAlert: visibleStats.missingMobile > 0, active: completionFilter === 'missingMobile' },
                { label: 'ناقص رقم قومي', value: visibleStats.missingNationalId, onClick: () => { setCompletionFilter('missingNationalId'); setPage(1); }, isAlert: visibleStats.missingNationalId > 0, active: completionFilter === 'missingNationalId' },
                { label: 'ناقص بيانات وظيفية', value: visibleStats.missingOrgData, onClick: () => { setCompletionFilter('missingOrgData'); setPage(1); }, isAlert: visibleStats.missingOrgData > 0, active: completionFilter === 'missingOrgData' },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  onClick={stat.onClick}
                  style={{
                    background: stat.active ? '#eff6ff' : '#ffffff',
                    border: `1px solid ${stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                    borderRadius: '6px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    minWidth: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0')}
                >
                  <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                    {stat.label}
                  </span>
                  <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : stat.active ? '#1d4ed8' : '#0f172a', lineHeight: 1.2 }}>
                    {stat.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Integrated Toolbar - Single Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالاسم أو كود الموظف أو الموبايل..."
              style={{ width: '220px', minWidth: '170px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
            />

            <div style={{ width: '150px' }}>
              <CustomSelect
                value={status}
                onChange={(val) => { setStatus(val); setPage(1); }}
                options={STATUS_FILTERS}
              />
            </div>

            <div style={{ width: '160px' }}>
              <CustomSelect
                value={completionFilter}
                onChange={(val) => { setCompletionFilter(val as CompletionFilter); setPage(1); }}
                options={COMPLETION_FILTERS}
              />
            </div>


            {(search || status || completionFilter) && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setSearch(''); setStatus(''); setCompletionFilter(''); setPage(1); }}
                style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: 'auto' }}
              >
                مسح الفلاتر
              </Button>
            )}
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
                  header: 'الإجراء',
                  cell: (row) => (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/hr/employees/${row.id}`);
                      }}
                      style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                    >
                      فتح الملف
                    </Button>
                  ),
                },
              ]}
            />
          </QueryFeedback>
        </div>
      </main>
    </div>
  );
}

