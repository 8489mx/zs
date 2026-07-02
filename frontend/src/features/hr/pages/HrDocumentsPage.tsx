import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import type { HrDocument, HrEmployee } from '@/types/domain';
import { useHrProfile, useHrWorkspace } from '@/features/hr/hooks/useHr';

type DocumentStatusFilter = 'all' | 'valid' | 'near_expiry' | 'expired' | 'no_expiry' | 'needs_review';

const documentStatusOptions: Array<{ value: DocumentStatusFilter; label: string }> = [
  { value: 'needs_review', label: 'تحتاج مراجعة' },
  { value: 'near_expiry', label: 'قريب الانتهاء' },
  { value: 'expired', label: 'منتهي' },
  { value: 'valid', label: 'ساري' },
  { value: 'no_expiry', label: 'بدون تاريخ انتهاء' },
  { value: 'all', label: 'الكل' },
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

function matchesStatusFilter(row: HrDocument, filter: DocumentStatusFilter) {
  const status = evaluateDocumentStatus(row.expiryDate);
  if (filter === 'all') return true;
  if (filter === 'needs_review') return status.needsReview;
  return status.key === filter;
}

export function HrDocumentsPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>('needs_review');
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
      const typeKey = normalize(row.documentType);
      if (!matchesStatusFilter(row, statusFilter)) return false;
      if (documentTypeFilter !== 'all' && typeKey !== documentTypeFilter) return false;
      return true;
    });
  }, [rawDocuments, statusFilter, documentTypeFilter]);

  const summary = useMemo(() => {
    const result = { total: rawDocuments.length, valid: 0, nearExpiry: 0, expired: 0, noExpiry: 0, needsReview: 0, visible: filteredDocuments.length };
    for (const row of rawDocuments) {
      const status = evaluateDocumentStatus(row.expiryDate);
      if (status.key === 'valid') result.valid += 1;
      if (status.key === 'near_expiry') result.nearExpiry += 1;
      if (status.key === 'expired') result.expired += 1;
      if (status.key === 'no_expiry') result.noExpiry += 1;
      if (status.needsReview) result.needsReview += 1;
    }
    return result;
  }, [filteredDocuments.length, rawDocuments]);

  function resetDocumentFilters() {
    setDocumentTypeFilter('all');
    setStatusFilter('all');
  }

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
      <PageHeader
        title="مستندات الموظفين"
        description="ابدأ باختيار الموظف، ثم راجع المستندات المنتهية أو القريبة من الانتهاء وأضف المستندات من ملف الموظف."
        actions={(
          <div className="compact-actions">
            {selectedEmployeeId ? (
              <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>فتح ملف الموظف</Button>
            ) : null}
            {selectedEmployeeId ? (
              <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>إضافة مستند</Button>
            ) : null}
            <Button variant="secondary" onClick={() => navigate('/hr/employees')}>رجوع للموظفين</Button>
          </div>
        )}
      />



      <FormSection title="اختيار الموظف" description="اختيار الموظف أول خطوة لأن المستندات مرتبطة بملف الموظف مباشرة.">
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
              {
                key: 'actions',
                header: 'إجراء',
                cell: (row) => (
                  <div className="compact-actions">
                    <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); setSelectedEmployeeId(String(row.id)); }}>عرض المستندات</Button>
                    <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(`/hr/employees/${row.id}`); }}>فتح الملف</Button>
                  </div>
                ),
              },
            ]}
          />
        </QueryFeedback>
      </FormSection>

      <FormSection title="ملخص المستندات" description={selectedEmployeeId ? `ملف الموظف: ${employeeName(selectedEmployee as HrEmployee)}` : 'اختر موظفًا أولًا لعرض الملخص.'}>
        <div className="stats-grid">
          <button className="stat-card" type="button" onClick={() => setStatusFilter('all')} style={{ textAlign: 'right' }}><span>إجمالي المستندات</span><strong>{summary.total}</strong></button>
          <button className="stat-card" type="button" onClick={() => setStatusFilter('valid')} style={{ textAlign: 'right' }}><span>سارية</span><strong>{summary.valid}</strong></button>
          <button className="stat-card" type="button" onClick={() => setStatusFilter('near_expiry')} style={{ textAlign: 'right' }}><span>قريبة الانتهاء</span><strong>{summary.nearExpiry}</strong></button>
          <button className="stat-card" type="button" onClick={() => setStatusFilter('expired')} style={{ textAlign: 'right' }}><span>منتهية</span><strong>{summary.expired}</strong></button>
          <button className="stat-card" type="button" onClick={() => setStatusFilter('no_expiry')} style={{ textAlign: 'right' }}><span>بدون تاريخ انتهاء</span><strong>{summary.noExpiry}</strong></button>
          <button className="stat-card" type="button" onClick={() => setStatusFilter('needs_review')} style={{ textAlign: 'right' }}><span>تحتاج مراجعة</span><strong>{summary.needsReview}</strong></button>
          <div className="stat-card"><span>ظاهر حاليًا</span><strong>{summary.visible}</strong></div>
        </div>
      </FormSection>

      <FormSection title="قائمة المستندات" description="تعرض المستندات التي تطابق فلاتر الحالة والنوع للموظف المختار.">
        {!selectedEmployeeId ? (
          <p className="muted">اختر موظفًا من الجدول بالأعلى لعرض مستنداته.</p>
        ) : (
          <QueryFeedback
            isLoading={profile.isLoading}
            isError={profile.isError}
            error={profile.error}
            isEmpty={false}
            loadingText="جاري تحميل مستندات الموظف..."
            errorTitle="تعذر تحميل مستندات الموظف"
          >
            <div className="compact-actions" style={{ marginBottom: 12 }}>
              {documentStatusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={statusFilter === option.value ? 'primary' : 'secondary'}
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Button type="button" variant="secondary" onClick={resetDocumentFilters}>مسح الفلاتر</Button>
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <label className="field">
                <span>نوع المستند</span>
                <select value={documentTypeFilter} onChange={(event) => setDocumentTypeFilter(event.target.value)}>
                  <option value="all">الكل</option>
                  {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div className="field">
                <span>الموظف المختار</span>
                <strong>{employeeName(selectedEmployee as HrEmployee)}</strong>
              </div>
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
                    { key: 'expiryDate', header: 'تاريخ الانتهاء', cell: (row) => fallbackText(row.expiryDate) },
                    { key: 'status', header: 'الحالة', cell: (row) => evaluateDocumentStatus(row.expiryDate).label },
                    { key: 'notes', header: 'ملاحظات', cell: (row) => fallbackText(row.notes) },
                    {
                      key: 'actions',
                      header: 'إجراء',
                      cell: () => <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>فتح ملف الموظف</Button>,
                    },
                  ]}
                />
              ) : <p className="muted">لا توجد نتائج مطابقة للفلاتر الحالية.</p>
            ) : (
              <div>
                <p className="muted">لا توجد مستندات مسجلة لهذا الموظف.</p>
                <Button type="button" variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>إضافة أول مستند من ملف الموظف</Button>
              </div>
            )}
          </QueryFeedback>
        )}
      </FormSection>
      <FormSection title="تسلسل مراجعة المستندات" description="هذه الصفحة للمتابعة والمراجعة، أما إضافة المستند فتتم من ملف الموظف حتى يبقى كل شيء مربوطًا بالموظف الصحيح.">
        <div className="compact-actions" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <span><strong>1. اختر الموظف:</strong> <span className="muted">ابحث بالاسم أو الكود ثم اضغط على الصف.</span></span>
          <span><strong>2. راجع الحالة:</strong> <span className="muted">ابدأ بالمستندات المنتهية أو القريبة من الانتهاء.</span></span>
          <span><strong>3. أضف أو حدّث:</strong> <span className="muted">افتح ملف الموظف لإضافة مستند أو مراجعة التفاصيل.</span></span>
          <span><strong>4. راقب النواقص:</strong> <span className="muted">المستند بدون تاريخ انتهاء يظهر كمراجعة حتى تؤكد أنه مقصود.</span></span>
        </div>
      </FormSection>
      </main>
    </div>
  );
}
