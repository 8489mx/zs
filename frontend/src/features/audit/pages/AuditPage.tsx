import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/components/data-table';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
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
  { value: 'all', label: 'كافة السجلات' },
  { value: 'today', label: 'نشاط اليوم' },
  { value: 'withDetails', label: 'سجلات بتفاصيل' },
] as const;

const auditTypeFilterOptions: Array<{ value: 'all' | Exclude<AuditActivityType, 'general'>; label: string }> = [
  { value: 'all', label: 'جميع الأنواع' },
  { value: 'auth', label: 'أمان ودخول' },
  { value: 'settings', label: 'منظومة وإعدادات' },
  { value: 'sales', label: 'مبيعات ومدفوعات' },
  { value: 'purchases', label: 'مشتريات وموردين' },
  { value: 'inventory', label: 'مخزون وأصناف' },
  { value: 'maintenance', label: 'تذاكر صيانة' },
  { value: 'hr', label: 'موارد بشرية' },
  { value: 'import', label: 'عمليات استيراد' },
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
  const rangeStart = pagination?.rangeStart || 0;
  const rangeEnd = pagination?.rangeEnd || 0;

  const userOptions = useMemo(() => (usersQuery.data || []).map((user) => ({
    id: String(user.id || ''),
    label: String(user.name || user.username || 'مستخدم'),
    role: String(user.role || ''),
  })), [usersQuery.data]);

  const selectedUserLabel = userOptions.find((entry) => entry.id === selectedUserId)?.label || '';

  const stats = [
    { key: 'total', label: 'إجمالي السجلات', value: totalRows },
    { key: 'today', label: 'سجلات اليوم', value: summary.todayCount },
    { key: 'users', label: 'عدد المنفذين', value: summary.distinctUsers },
    { key: 'range', label: 'المعروض حالياً', value: totalRows ? `${rangeStart}-${rangeEnd}` : '0' },
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
    <div className="page-stack page-shell audit-page" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px' }}>
        <PageHeader
          title="سجل التدقيق والمراجعة"
          description="متابعة وتدقيق كافة العمليات الإدارية والمالية والأمنية وحركات المستخدمين في المنظومة."
          badge={<span className="nav-pill" style={{ background: '#f1f5f9', color: '#334155', borderColor: '#cbd5e1' }}>Audit Trail</span>}
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button variant="secondary" onClick={resetAuditView} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                إعادة ضبط
              </Button>
              <Button variant="secondary" onClick={copyAuditSummary} disabled={!totalRows} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                نسخ
              </Button>
              <Button variant="secondary" onClick={() => void exportAuditRows()} disabled={!totalRows || isExporting} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                {isExporting ? '...' : 'تصدير'}
              </Button>
              <Button variant="secondary" onClick={() => void printAuditRows()} disabled={!totalRows || isExporting} style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                {isExporting ? '...' : 'طباعة'}
              </Button>
            </div>
          }
        />

        {copyFeedback ? <div className={copyFeedback.kind === 'error' ? 'warning-box' : 'success-box'}>{copyFeedback.text}</div> : null}

        <section className="document-prototype-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              سجل العمليات والأنشطة
            </h3>
            <FilterChipGroup value={filterMode} options={auditFilterOptions} onChange={setFilterMode} />
          </div>

          <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث بالإجراء أو تفاصيل العملية أو اسم المنفذ...">
            <Field label="نوع النشاط">
              <CustomSelect
                value={activityTypeFilter}
                onChange={(val) => setActivityTypeFilter(val as typeof activityTypeFilter)}
                options={auditTypeFilterOptions}
              />
            </Field>
            <Field label="الموظف / المنفذ">
              <CustomSelect
                value={selectedUserId}
                onChange={(val) => setSelectedUserId(val)}
                options={[
                  { value: '', label: 'كافة الموظفين' },
                  ...userOptions.map((user) => ({ value: user.id, label: user.label + (user.role ? ` — ${user.role}` : '') })),
                ]}
              />
            </Field>
          </SearchToolbar>

          <StatsGrid items={stats} className="stats-grid compact-grid audit-stats-grid" />

          <QueryFeedback
            isLoading={query.isLoading || usersQuery.isLoading}
            isError={query.isError || usersQuery.isError}
            error={query.error || usersQuery.error}
            isEmpty={!totalRows || !visibleRows.length}
            loadingText="جاري تحميل سجل النشاط..."
            errorTitle="تعذر تحميل سجل النشاط"
            emptyTitle={!totalRows ? 'لا توجد سجلات نشاط حاليًا' : 'لا توجد أنشطة مطابقة لهذا الفلتر.'}
            emptyHint="ستظهر العمليات هنا بمجرد تسجيل أنشطة أو بعد توسيع معايير الفلترة."
          >
            {selectedUserLabel ? (
              <div className="muted small" style={{ marginBottom: '8px' }}>
                عرض نشاط الموظف: <strong>{selectedUserLabel}</strong>
              </div>
            ) : null}

            <DataTable<AuditLog>
              data={visibleRows}
              getRowKey={(row, rowIndex) => String(row.id || row.createdAt || row.created_at || rowIndex)}
              defaultSort={{ columnId: 'date', direction: 'desc' }}
              columns={[
                {
                  id: 'action',
                  header: 'النشاط والتفاصيل',
                  className: 'audit-col-activity',
                  sortable: true,
                  sortValue: (row) => getAuditActionLabel(row.action || ''),
                  render: (row) => {
                    const activityMeta = getAuditActivityMeta(row);
                    const actionLabel = getAuditActionLabel(row.action || '');
                    const rawDetail = formatAuditDetails(row);
                    const detailText = normalizeAuditDetailText(rawDetail);
                    return (
                      <div className="audit-action-cell" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="audit-action-head" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`audit-activity-badge ${activityMeta.badgeClass}`}>
                            {activityMeta.label}
                          </span>
                          <strong className="audit-action-label" style={{ fontSize: '13px', color: '#0f172a' }}>
                            {actionLabel}
                          </strong>
                        </div>
                        {detailText && detailText !== '—' && (
                          <span 
                            className="audit-detail-text" 
                            style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}
                            title={detailText}
                          >
                            {detailText}
                          </span>
                        )}
                      </div>
                    );
                  },
                },
                {
                  id: 'user',
                  header: 'المنفذ',
                  className: 'audit-col-user',
                  sortable: true,
                  sortValue: (row) => normalizeAuditUserDisplay(row),
                  render: (row) => {
                    const userName = normalizeAuditUserDisplay(row);
                    return (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                          {userName}
                        </span>
                      </div>
                    );
                  },
                },
                {
                  id: 'date',
                  header: 'التاريخ والوقت',
                  className: 'audit-col-date',
                  sortable: true,
                  sortValue: (row) => row.createdAt || row.created_at || '',
                  render: (row) => (
                    <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(row.createdAt || row.created_at || '')}
                    </span>
                  ),
                }
              ]}
            />

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
        </section>
      </main>
    </div>
  );
}
