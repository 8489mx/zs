import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { Field } from '@/shared/ui/field';
import { PageHeader } from '@/shared/components/page-header';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { FilterChipGroup } from '@/shared/components/filter-chip-group';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { StatsGrid } from '@/shared/components/stats-grid';
import { formatDate } from '@/lib/format';
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs';
import { useAuditPageActions } from '@/features/audit/hooks/useAuditPageActions';
import { formatAuditDetails } from '@/features/audit/lib/audit-details-format';
import {
  getAuditActionLabel,
  getAuditActivityMeta,
  normalizeAuditDetailText,
  normalizeAuditUserDisplay,
  type AuditActivityType,
} from '@/features/audit/lib/audit-activity-presenter';
import { userDirectoryApi } from '@/shared/api/user-directory';
import type { AuditLog } from '@/types/domain';

const auditFilterOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'today', label: 'اليوم' },
  { value: 'withDetails', label: 'بسجل تفاصيل' },
] as const;

const auditTypeFilterOptions: Array<{ value: 'all' | Exclude<AuditActivityType, 'general'>; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'auth', label: 'دخول وخروج' },
  { value: 'import', label: 'استيراد' },
  { value: 'inventory', label: 'مخزون' },
  { value: 'sales', label: 'مبيعات' },
  { value: 'purchases', label: 'مشتريات' },
  { value: 'hr', label: 'موظفين' },
  { value: 'settings', label: 'إعدادات' },
  { value: 'backup', label: 'نسخ احتياطي' },
  { value: 'sensitive', label: 'عمليات حساسة' },
];

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'withDetails'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | Exclude<AuditActivityType, 'general'>>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const usersQuery = useQuery({ queryKey: ['audit-users-filter'], queryFn: userDirectoryApi.users });
  const query = useAuditLogs({ page, pageSize, search, mode: filterMode, userId: selectedUserId });
  const rows = query.data?.rows || [];
  const visibleRows = useMemo(() => {
    if (activityTypeFilter === 'all') return rows;
    return rows.filter((row) => getAuditActivityMeta(row).type === activityTypeFilter);
  }, [activityTypeFilter, rows]);

  const pagination = query.data?.pagination;
  const summary = query.data?.summary || { distinctUsers: 0, todayCount: 0 };

  useEffect(() => {
    setPage(1);
  }, [search, filterMode, selectedUserId, activityTypeFilter]);

  const totalRows = pagination?.totalItems || 0;
  const visibleCount = visibleRows.length;
  const rangeStart = pagination?.rangeStart || 0;
  const rangeEnd = pagination?.rangeEnd || 0;

  const userOptions = useMemo(() => (usersQuery.data || []).map((user) => ({
    id: String(user.id || ''),
    label: String(user.name || user.username || 'مستخدم'),
    role: String(user.role || ''),
  })), [usersQuery.data]);

  const selectedUserLabel = userOptions.find((entry) => entry.id === selectedUserId)?.label || '';

  const stats = [
    { key: 'total', label: 'إجمالي السجلات المطابقة', value: totalRows },
    { key: 'visible', label: 'السجلات المعروضة', value: visibleCount },
    { key: 'users', label: 'عدد المنفذين', value: summary.distinctUsers },
    { key: 'today', label: 'سجلات اليوم', value: summary.todayCount },
    { key: 'range', label: 'المعروض الآن', value: `${rangeStart}-${rangeEnd}` },
  ] as const;

  const { copyFeedback, isExporting, copyAuditSummary, exportAuditRows, printAuditRows } = useAuditPageActions({
    search,
    mode: filterMode,
    userId: selectedUserId,
    totalRows,
    summary,
    rangeStart,
    rangeEnd,
  });

  const resetAuditView = () => {
    setSearch('');
    setSelectedUserId('');
    setFilterMode('all');
    setActivityTypeFilter('all');
    setPage(1);
  };

  return (
    <div className="page-stack page-shell audit-page">
      <PageHeader title="سجل النشاط" description="ابدأ بالبحث والفلاتر ثم راجع السجل الحالي أو صدّر النتائج عند الحاجة." badge={<span className="nav-pill">سجل العمليات</span>} />
      {copyFeedback ? <div className={copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{copyFeedback.text}</div> : null}
      <Card
        title="آخر الأنشطة"
        actions={
          <div className="actions compact-actions">
            <button className="button button-secondary" onClick={resetAuditView}>إعادة الضبط</button>
            <button className="button button-secondary" onClick={copyAuditSummary} disabled={!totalRows}>نسخ الملخص</button>
            <button className="button button-secondary" onClick={() => void exportAuditRows()} disabled={!totalRows || isExporting}>{isExporting ? 'جارٍ التصدير...' : 'تصدير النتائج'}</button>
            <button className="button button-secondary" onClick={() => void printAuditRows()} disabled={!totalRows || isExporting}>{isExporting ? 'جارٍ التجهيز...' : 'طباعة النتائج'}</button>
          </div>
        }
      >
        <FilterChipGroup value={filterMode} options={auditFilterOptions} onChange={setFilterMode} />
        <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث بالإجراء أو التفاصيل أو المنفذ">
          <Field label="نوع النشاط">
            <select value={activityTypeFilter} onChange={(event) => setActivityTypeFilter(event.target.value as typeof activityTypeFilter)}>
              {auditTypeFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="الموظف">
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">كل الموظفين</option>
              {userOptions.map((user) => <option key={user.id} value={user.id}>{user.label}{user.role ? ` — ${user.role}` : ''}</option>)}
            </select>
          </Field>
        </SearchToolbar>
        <StatsGrid items={stats} />
        <QueryFeedback
          isLoading={query.isLoading || usersQuery.isLoading}
          isError={query.isError || usersQuery.isError}
          error={query.error || usersQuery.error}
          isEmpty={!totalRows || !visibleRows.length}
          loadingText="جاري تحميل السجل..."
          errorTitle="تعذر تحميل سجل النشاط"
          emptyTitle={!totalRows ? 'لا توجد سجلات نشاط حاليًا' : 'لا توجد أنشطة مطابقة لهذا الفلتر.'}
          emptyHint="ستظهر العمليات هنا بمجرد وجود أنشطة أو بعد توسيع الفلاتر."
        >
          {selectedUserLabel ? <div className="muted small">عرض نشاط الموظف: <strong>{selectedUserLabel}</strong></div> : null}
          <DataTable rows={visibleRows} columns={[
            {
              key: 'action',
              header: 'النشاط',
              className: 'audit-col-activity',
              cell: (row: AuditLog) => {
                const activityMeta = getAuditActivityMeta(row);
                const actionLabel = getAuditActionLabel(row.action || '');
                const rawDetail = formatAuditDetails(row);
                const detailText = normalizeAuditDetailText(rawDetail);
                return (
                  <div className="audit-action-cell">
                    <div className="audit-action-head">
                      <span className={`audit-activity-badge ${activityMeta.badgeClass}`}>{activityMeta.label}</span>
                      <strong className="audit-action-label">{actionLabel}</strong>
                    </div>
                    <span className="audit-detail-text" title={detailText}>{detailText}</span>
                  </div>
                );
              }
            },
            { key: 'user', header: 'المنفذ', className: 'audit-col-user', cell: (row: AuditLog) => normalizeAuditUserDisplay(row) },
            { key: 'date', header: 'التاريخ والوقت', className: 'audit-col-date', cell: (row) => formatDate(row.createdAt || row.created_at || '') }
          ]} />
          <PaginationControls
            page={pagination?.page || 1}
            totalPages={pagination?.totalPages || 1}
            pageSize={pagination?.pageSize || pageSize}
            pageSizeOptions={[25, 50, 100, 200]}
            totalItems={totalRows}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPageChange={setPage}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
            itemLabel="سجل"
          />
        </QueryFeedback>
      </Card>
    </div>
  );
}
