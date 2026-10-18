import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
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
  const { t } = useTranslation();
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
      <main className="document-prototype-column" style={{ paddingBottom: '20px' }}>
        <PageHeader
          title={t('hr.hr_documents_page.s0', "مستندات الموظفين")}
          description={t('hr.hr_documents_page.s1', "متابعة صلاحية المستندات، تواريخ الانتهاء، والمستندات الثبوتية لكل موظف.")}
          actions={
            <div className="actions compact-actions">
              {selectedEmployeeId ? (
                <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>{t('hr.hr_documents_page.s2', "فتح ملف الموظف")}</Button>
              ) : null}
              {selectedEmployeeId ? (
                <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)}>{t('hr.hr_documents_page.s3', "إضافة مستند")}</Button>
              ) : null}
              <Button variant="secondary" onClick={() => navigate('/hr/employees')}>{t('hr.hr_documents_page.s4', "رجوع للموظفين")}</Button>
            </div>
          }
        />
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {/* Compact Employee Selection Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '280px', flex: 1 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>{t('hr.hr_documents_page.s5', "اختيار الموظف:")}</span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
              >
                <option value="">{t('hr.hr_documents_page.s6', "-- اختر موظفاً لعرض مستنداته --")}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {fallbackText(emp.employeeNo)} - {employeeName(emp)} ({fallbackText(emp.departmentName || t('hr.hr_documents_page.s7', "بدون قسم"))})
                  </option>
                ))}
              </select>
            </div>

            {selectedEmployee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                  {t('hr.hr_documents_page.s8', "تم اختيار:")} {employeeName(selectedEmployee as HrEmployee)}
                </span>
                <Button type="button" variant="secondary" onClick={() => setSelectedEmployeeId('')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.hr_documents_page.s9', "تغيير")}</Button>
              </div>
            ) : null}
          </div>

          {/* Compact Single-Row KPI Summary Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>
                {t('hr.hr_documents_page.s10', "ملخص المستندات")} {selectedEmployeeId ? `(${employeeName(selectedEmployee as HrEmployee)})` : ''}
              </span>
              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{t('hr.hr_documents_page.s11', "اضغط على أي مؤشر للتصفية المباشرة")}</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
              {[
                { label: t('hr.hr_documents_page.s12', "إجمالي المستندات"), value: summary.total, onClick: () => setStatusFilter('all'), isAlert: false, active: statusFilter === 'all' },
                { label: t('hr.hr_documents_page.s13', "سارية"), value: summary.valid, onClick: () => setStatusFilter('valid'), isAlert: false, active: statusFilter === 'valid' },
                { label: t('hr.hr_documents_page.s14', "قريبة الانتهاء"), value: summary.nearExpiry, onClick: () => setStatusFilter('near_expiry'), isAlert: summary.nearExpiry > 0, active: statusFilter === 'near_expiry' },
                { label: t('hr.hr_documents_page.s15', "منتهية"), value: summary.expired, onClick: () => setStatusFilter('expired'), isAlert: summary.expired > 0, active: statusFilter === 'expired' },
                { label: t('hr.hr_documents_page.s16', "بدون تاريخ انتهاء"), value: summary.noExpiry, onClick: () => setStatusFilter('no_expiry'), isAlert: false, active: statusFilter === 'no_expiry' },
                { label: t('hr.hr_documents_page.s17', "تحتاج مراجعة"), value: summary.needsReview, onClick: () => setStatusFilter('needs_review'), isAlert: summary.needsReview > 0, active: statusFilter === 'needs_review' },
                { label: t('hr.hr_documents_page.s18', "ظاهر حالياً"), value: summary.visible, onClick: () => {}, isAlert: false, active: false },
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
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = stat.active ? '#3b82f6' : stat.isAlert ? '#fca5a5' : '#e2e8f0'; }}
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

          {!selectedEmployeeId ? (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <SearchToolbar
                  search={search}
                  onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  searchPlaceholder={t('hr.hr_documents_page.s19', "بحث باسم الموظف أو الكود لاختياره...")}
                  inputAriaLabel={t('hr.hr_documents_page.s20', "بحث الموظفين")}
                />
              </div>
              <QueryFeedback
                isLoading={workspace.employees.isLoading}
                isError={workspace.employees.isError}
                error={workspace.employees.error}
                isEmpty={!employees.length}
                loadingText={t('hr.hr_documents_page.s21', "جاري تحميل الموظفين...")}
                errorTitle={t('hr.hr_documents_page.s22', "تعذر تحميل الموظفين")}
                emptyTitle={t('hr.hr_documents_page.s23', "لا توجد نتائج مطابقة للفلاتر الحالية.")}
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
                    itemLabel: t('hr.hr_documents_page.s24', "موظف"),
                  }}
                  columns={[
                    { key: 'employeeNo', header: t('hr.hr_documents_page.s25', "كود الموظف"), cell: (row) => fallbackText(row.employeeNo) },
                    { key: 'name', header: t('hr.hr_documents_page.s26', "اسم الموظف"), cell: (row) => employeeName(row) },
                    { key: 'department', header: t('hr.hr_documents_page.s27', "القسم"), cell: (row) => fallbackText(row.departmentName) },
                    { key: 'status', header: t('hr.hr_documents_page.s28', "الحالة"), cell: (row) => employeeStatusLabel(row.status) },
                    {
                      key: 'actions',
                      header: t('hr.hr_documents_page.s29', "إجراء"),
                      cell: (row) => (
                        <div className="compact-actions">
                          <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); setSelectedEmployeeId(String(row.id)); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.hr_documents_page.s30', "عرض المستندات")}</Button>
                          <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); navigate(`/hr/employees/${row.id}`); }} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.hr_documents_page.s31', "فتح الملف")}</Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </QueryFeedback>
            </div>
          ) : (
            <QueryFeedback
              isLoading={profile.isLoading}
              isError={profile.isError}
              error={profile.error}
              isEmpty={false}
              loadingText={t('hr.hr_documents_page.s32', "جاري تحميل مستندات الموظف...")}
              errorTitle={t('hr.hr_documents_page.s33', "تعذر تحميل مستندات الموظف")}
            >
              {/* Integrated Toolbar - Single Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <select
                  style={{ width: 'auto', minWidth: '130px', maxWidth: '160px', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff', boxSizing: 'border-box' }}
                  value={documentTypeFilter}
                  onChange={(event) => setDocumentTypeFilter(event.target.value)}
                >
                  <option value="all">{t('hr.hr_documents_page.s34', "كل أنواع المستندات")}</option>
                  {documentTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>

                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {documentStatusOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={statusFilter === option.value ? 'primary' : 'secondary'}
                      onClick={() => setStatusFilter(option.value)}
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      {option.label}
                    </Button>
                  ))}
                  <Button type="button" variant="secondary" onClick={resetDocumentFilters} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>{t('hr.hr_documents_page.s35', "مسح الفلاتر")}</Button>
                </div>
              </div>

              {rawDocuments.length ? (
                filteredDocuments.length ? (
                  <DataTable
                    rows={filteredDocuments}
                    rowKey={(row) => String(row.id)}
                    density="compact"
                    columns={[
                      { key: 'employeeNo', header: t('hr.hr_documents_page.s36', "كود الموظف"), cell: () => fallbackText((selectedEmployee as HrEmployee | undefined)?.employeeNo) },
                      { key: 'employeeName', header: t('hr.hr_documents_page.s37', "اسم الموظف"), cell: () => employeeName(selectedEmployee as HrEmployee | undefined) },
                      { key: 'documentType', header: t('hr.hr_documents_page.s38', "نوع المستند"), cell: (row) => fallbackText(row.documentType) },
                      { key: 'title', header: t('hr.hr_documents_page.s39', "اسم المستند"), cell: (row) => fallbackText(row.title) },
                      { key: 'expiryDate', header: t('hr.hr_documents_page.s40', "تاريخ الانتهاء"), cell: (row) => fallbackText(row.expiryDate) },
                      { key: 'status', header: t('hr.hr_documents_page.s41', "الحالة"), cell: (row) => evaluateDocumentStatus(row.expiryDate).label },
                      { key: 'notes', header: t('hr.hr_documents_page.s42', "ملاحظات"), cell: (row) => fallbackText(row.notes) },
                      {
                        key: 'actions',
                        header: t('hr.hr_documents_page.s43', "إجراء"),
                        cell: () => <Button variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>{t('hr.hr_documents_page.s44', "فتح ملف الموظف")}</Button>,
                      },
                    ]}
                  />
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    <p style={{ margin: 0 }}>{t('hr.hr_documents_page.s45', "لا توجد نتائج مطابقة للفلاتر الحالية لهذا الموظف.")}</p>
                  </div>
                )
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ color: '#64748b', margin: '0 0 12px' }}>{t('hr.hr_documents_page.s46', "لا توجد مستندات مسجلة لهذا الموظف حتى الآن.")}</p>
                  <Button type="button" variant="secondary" onClick={() => navigate(`/hr/employees/${selectedEmployeeId}`)} style={{ padding: '4px 14px', fontSize: '0.85rem' }}>
                    {t('hr.hr_documents_page.s47', "إضافة أول مستند من ملف الموظف")}
                  </Button>
                </div>
              )}
            </QueryFeedback>
          )}
        </div>
      </main>
    </div>
  );
}
