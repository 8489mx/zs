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

type DocumentStatusFilter = 'all' | 'valid' | 'near_expiry' | 'expired' | 'no_expiry';

const documentStatusOptions: Array<{ value: DocumentStatusFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'valid', label: 'ساري' },
  { value: 'near_expiry', label: 'قريب الانتهاء' },
  { value: 'expired', label: 'منتهي' },
  { value: 'no_expiry', label: 'بدون تاريخ انتهاء' },
];

function fallbackText(value: unknown) {
  return String(value || '').trim() || '—';
}

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function employeeName(row?: HrEmployee) {
  if (!row) return '—';
  return fallbackText(row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim());
}

function employeeStatusLabel(status: unknown) {
  const value = normalize(status);
  if (value === 'active') return 'نشط';
  if (value === 'inactive') return 'غير نشط';
  if (value === 'deactivated') return 'موقوف';
  if (value === 'terminated') return 'منتهي الخدمة';
  return 'غير محدد';
}

function evaluateDocumentStatus(expiryDate?: string) {
  const dateText = String(expiryDate || '').trim();
  if (!dateText) {
    return { key: 'no_expiry' as const, label: 'بدون تاريخ انتهاء', needsReview: true };
  }

  const expiry = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) {
    return { key: 'no_expiry' as const, label: 'بدون تاريخ انتهاء', needsReview: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return { key: 'expired' as const, label: 'منتهي', needsReview: true };
  if (diffDays <= 30) return { key: 'near_expiry' as const, label: 'قريب الانتهاء', needsReview: true };
  return { key: 'valid' as const, label: 'ساري', needsReview: false };
}

export function HrDocumentsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const workspace = useHrWorkspace({ search, page, pageSize });
  const profile = useHrProfile(selectedEmployeeId);

  const employees = useMemo(() => workspace.employees.data?.employees || [], [workspace.employees.data?.employees]);
  const rawDocuments = useMemo(() => (profile.data?.documents || []) as HrDocument[], [profile.data?.documents]);
  const selectedEmployee = useMemo(
    () => employees.find((row) => String(row.id) === String(selectedEmployeeId)) || profile.data?.employee,
    [employees, profile.data?.employee, selectedEmployeeId],
  );

  const documentTypes = useMemo(() => {
    const set = new Map<string, string>();
    for (const row of rawDocuments) {
      const key = normalize(row.documentType);
      if (!key) continue;
      set.set(key, String(row.documentType || '').trim());
    }
    return Array.from(set.entries()).map(([value, label]) => ({ value, label }));
  }, [rawDocuments]);

  const filteredDocuments = useMemo(() => {
    return rawDocuments.filter((row) => {
      const status = evaluateDocumentStatus(row.expiryDate);
      const typeKey = normalize(row.documentType);
      if (statusFilter !== 'all' && status.key !== statusFilter) return false;
      if (documentTypeFilter !== 'all' && typeKey !== documentTypeFilter) return false;
      return true;
    });
  }, [rawDocuments, statusFilter, documentTypeFilter]);

  const summary = useMemo(() => {
    const result = {
      total: filteredDocuments.length,
      valid: 0,
      nearExpiry: 0,
      expired: 0,
      noExpiry: 0,
      needsReview: 0,
    };

    for (const row of filteredDocuments) {
      const status = evaluateDocumentStatus(row.expiryDate);
      if (status.key === 'valid') result.valid += 1;
      if (status.key === 'near_expiry') result.nearExpiry += 1;
      if (status.key === 'expired') result.expired += 1;
      if (status.key === 'no_expiry') result.noExpiry += 1;
      if (status.needsReview) result.needsReview += 1;
    }

    return result;
  }, [filteredDocuments]);

  return (
    <div className="page-stack page-shell" dir="rtl">
      <PageHeader
        title="مستندات الموظفين"
        description="متابعة مستندات الموظفين وتواريخ الانتهاء والعناصر التي تحتاج مراجعة."
        actions={(
          <div className="compact-actions">
            {selectedEmployeeId ? (
              <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>
                إضافة مستند
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />

      <Card title="اختيار الموظف">
        <SearchToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          searchPlaceholder="بحث باسم الموظف أو الكود"
          inputAriaLabel="بحث الموظفين"
        />
        <QueryFeedback
          isLoading={workspace.employees.isLoading}
          isError={workspace.employees.isError}
          error={workspace.employees.error}
          isEmpty={!employees.length}
          loadingText="جاري تحميل الموظفين..."
          errorTitle="تعذر تحميل الموظفين"
          emptyTitle="لا توجد نتائج مطابقة للفلاتر الحالية."
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
              { key: 'name', header: 'اسم الموظف', cell: (row) => employeeName(row) },
              { key: 'department', header: 'القسم', cell: (row) => fallbackText(row.departmentName) },
              { key: 'status', header: 'الحالة', cell: (row) => employeeStatusLabel(row.status) },
            ]}
          />
        </QueryFeedback>
      </Card>

      <Card title="ملخص المستندات">
        <div className="stats-grid">
          <div><strong>إجمالي المستندات:</strong> {summary.total}</div>
          <div><strong>سارية:</strong> {summary.valid}</div>
          <div><strong>قريبة الانتهاء:</strong> {summary.nearExpiry}</div>
          <div><strong>منتهية:</strong> {summary.expired}</div>
          <div><strong>بدون تاريخ انتهاء:</strong> {summary.noExpiry}</div>
          <div><strong>تحتاج مراجعة:</strong> {summary.needsReview}</div>
        </div>
      </Card>

      <Card title="قائمة المستندات">
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
            <p className="muted" style={{ marginTop: 0 }}>
              ملف الموظف: {employeeName(selectedEmployee as HrEmployee)}
            </p>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <label className="field">
                <span>نوع المستند</span>
                <select value={documentTypeFilter} onChange={(event) => setDocumentTypeFilter(event.target.value)}>
                  <option value="all">الكل</option>
                  {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>الحالة</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DocumentStatusFilter)}>
                  {documentStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {rawDocuments.length ? (
              filteredDocuments.length ? (
                <DataTable
                  rows={filteredDocuments}
                  rowKey={(row) => String(row.id)}
                  density="compact"
                  columns={[
                    { key: 'employeeNo', header: 'كود الموظف', cell: () => fallbackText((selectedEmployee as HrEmployee | undefined)?.employeeNo) },
                    { key: 'employeeName', header: 'اسم الموظف', cell: () => employeeName(selectedEmployee as HrEmployee | undefined) },
                    { key: 'documentType', header: 'نوع المستند', cell: (row) => fallbackText(row.documentType) },
                    { key: 'title', header: 'اسم المستند', cell: (row) => fallbackText(row.title) },
                    { key: 'issueDate', header: 'تاريخ الإصدار', cell: () => 'غير متاح' },
                    { key: 'expiryDate', header: 'تاريخ الانتهاء', cell: (row) => fallbackText(row.expiryDate) },
                    { key: 'status', header: 'الحالة', cell: (row) => evaluateDocumentStatus(row.expiryDate).label },
                    { key: 'notes', header: 'ملاحظات', cell: (row) => fallbackText(row.notes) },
                    {
                      key: 'actions',
                      header: 'إجراء',
                      cell: () => <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>عرض التفاصيل</Button>,
                    },
                  ]}
                />
              ) : (
                <p className="muted">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
              )
            ) : (
              <>
                <p className="muted">لا توجد مستندات موظفين حتى الآن.</p>
                <p className="muted">أضف مستندات الموظفين لمتابعة تواريخ الانتهاء والتنبيهات.</p>
              </>
            )}
          </QueryFeedback>
        )}
      </Card>
    </div>
  );
}
