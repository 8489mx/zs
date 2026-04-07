// legacy marker: النطاق المعروض الآن
import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { PageHeader } from '@/shared/components/page-header';
import { SpotlightCardStrip } from '@/shared/components/spotlight-card-strip';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatDate } from '@/lib/format';
import { useAuditLogs } from '@/features/audit/hooks/useAuditLogs';
import { useAuditPageActions } from '@/features/audit/hooks/useAuditPageActions';
import type { AuditLog } from '@/types/domain';

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'withDetails'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const query = useAuditLogs({ page, pageSize, search, mode: filterMode });
  const rows = query.data?.rows || [];
  const pagination = query.data?.pagination;
  const summary = query.data?.summary || { distinctUsers: 0, todayCount: 0 };

  useEffect(() => {
    setPage(1);
  }, [search, filterMode]);

  const totalRows = pagination?.totalItems || 0;
  const rangeStart = pagination?.rangeStart || 0;
  const rangeEnd = pagination?.rangeEnd || 0;
  const focusCards = [
    { key: 'first', label: 'ابدأ من', value: 'البحث والفلاتر' },
    { key: 'now', label: 'الإجراء الأساسي', value: totalRows ? 'راجع السجل الحالي' : 'وسّع الفلاتر أو ابدأ البحث' },
    { key: 'today', label: 'تابع اليوم', value: `${summary.todayCount} سجل اليوم` },
    { key: 'after', label: 'ثم نفذ', value: totalRows ? 'تصدير أو طباعة النتائج' : 'نسخ الملخص بعد ظهور النتائج' },
  ];

  const { copyFeedback, isExporting, copyAuditSummary, exportAuditRows, printAuditRows } = useAuditPageActions({
    search,
    mode: filterMode,
    totalRows,
    summary,
    rangeStart,
    rangeEnd,
  });

  const resetAuditView = () => {
    setSearch('');
    setFilterMode('all');
    setPage(1);
  };

  return (
    <div className="page-stack">
      <PageHeader title="سجل النشاط" description="ابدأ بالبحث والفلاتر ثم راجع السجل الحالي أو صدّر النتائج عند الحاجة." badge={<span className="nav-pill">سجل العمليات</span>} />
      <SpotlightCardStrip cards={focusCards} ariaLabel="أولوية المشاهدة في شاشة سجل النشاط" />
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
        <div className="filter-chip-row">
          <button className={`button ${filterMode === 'all' ? 'button-primary' : 'button-secondary'}`} onClick={() => setFilterMode('all')}>الكل</button>
          <button className={`button ${filterMode === 'today' ? 'button-primary' : 'button-secondary'}`} onClick={() => setFilterMode('today')}>اليوم</button>
          <button className={`button ${filterMode === 'withDetails' ? 'button-primary' : 'button-secondary'}`} onClick={() => setFilterMode('withDetails')}>بسجل تفاصيل</button>
        </div>
        <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث بالإجراء أو التفاصيل أو المنفذ" />
        <div className="stats-grid compact-grid">
          <div className="stat-card"><span>إجمالي السجلات المطابقة</span><strong>{totalRows}</strong></div>
          <div className="stat-card"><span>عدد المنفذين</span><strong>{summary.distinctUsers}</strong></div>
          <div className="stat-card"><span>سجلات اليوم</span><strong>{summary.todayCount}</strong></div>
          <div className="stat-card"><span>المعروض الآن</span><strong>{rangeStart}-{rangeEnd}</strong></div>
        </div>
        <QueryFeedback
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={!totalRows}
          loadingText="جاري تحميل السجل..."
          errorTitle="تعذر تحميل سجل النشاط"
          emptyTitle="لا توجد سجلات نشاط حاليًا"
          emptyHint="ستظهر العمليات هنا بمجرد وجود أنشطة أو بعد توسيع الفلاتر."
        >
          <DataTable rows={rows} columns={[
            { key: 'action', header: 'الإجراء', cell: (row) => row.action },
            { key: 'details', header: 'التفاصيل', cell: (row: AuditLog) => row.detailsSummary || row.details || '—' },
            { key: 'user', header: 'المنفذ', cell: (row) => row.createdByName || '—' },
            { key: 'date', header: 'التاريخ', cell: (row) => formatDate(row.createdAt) }
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
