// legacy marker: النطاق المعروض الآن
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
import { userDirectoryApi } from '@/shared/api/user-directory';
import type { AuditLog } from '@/types/domain';

const auditFilterOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'today', label: 'اليوم' },
  { value: 'withDetails', label: 'بسجل تفاصيل' },
] as const;

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'withDetails'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const usersQuery = useQuery({ queryKey: ['audit-users-filter'], queryFn: userDirectoryApi.users });
  const query = useAuditLogs({ page, pageSize, search, mode: filterMode, userId: selectedUserId });
  const rows = query.data?.rows || [];
  const pagination = query.data?.pagination;
  const summary = query.data?.summary || { distinctUsers: 0, todayCount: 0 };

  useEffect(() => {
    setPage(1);
  }, [search, filterMode, selectedUserId]);

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
    { key: 'total', label: 'إجمالي السجلات المطابقة', value: totalRows },
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
          isEmpty={!totalRows}
          loadingText="جاري تحميل السجل..."
          errorTitle="تعذر تحميل سجل النشاط"
          emptyTitle="لا توجد سجلات نشاط حاليًا"
          emptyHint="ستظهر العمليات هنا بمجرد وجود أنشطة أو بعد توسيع الفلاتر."
        >
          {selectedUserLabel ? <div className="muted small">عرض نشاط الموظف: <strong>{selectedUserLabel}</strong></div> : null}
          <DataTable rows={rows} columns={[
            { key: 'action', header: 'الإجراء', cell: (row) => row.action },
            { key: 'details', header: 'التفاصيل', cell: (row: AuditLog) => row.detailsSummary || row.details || '—' },
            { key: 'user', header: 'المنفذ', cell: (row) => row.createdByName || '—' },
            { key: 'date', header: 'التاريخ والوقت', cell: (row) => formatDate(row.createdAt || row.created_at || '') }
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
