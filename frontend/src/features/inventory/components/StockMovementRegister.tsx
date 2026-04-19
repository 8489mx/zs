import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { downloadCsvFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatDate } from '@/lib/format';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

const movementLabels: Record<string, string> = {
  opening: 'رصيد افتتاحي',
  add: 'إضافة',
  deduct: 'خصم',
  damaged: 'تالف',
  stock_count_gain: 'زيادة جرد',
  stock_count_loss: 'عجز جرد'
};

const movementToneMap: Record<string, string> = {
  damaged: 'negative',
  deduct: 'negative',
  stock_count_loss: 'negative',
  stock_count_gain: 'positive',
  opening: 'positive',
  add: 'positive'
};

function getMovementLabel(type: string) {
  return movementLabels[type] || type || 'movement';
}

function MovementPill({ type }: { type: string }) {
  const tone = movementToneMap[type] || 'neutral';
  return <span className={`status-badge movement-pill movement-${tone}`}>{getMovementLabel(type)}</span>;
}

function makeParamsKey(page: number, pageSize: number, search: string, type: string) {
  return JSON.stringify({ page, pageSize, search, type });
}

export function StockMovementRegister() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const paramsKey = makeParamsKey(page, pageSize, search, typeFilter);
  const movementsQuery = useQuery({
    queryKey: queryKeys.stockMovementsPage(paramsKey),
    queryFn: () => inventoryApi.stockMovementsPage({ page, pageSize, search, type: typeFilter }),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  const rows = useMemo(() => movementsQuery.data?.rows || [], [movementsQuery.data?.rows]);
  const pagination = movementsQuery.data?.pagination;
  const totals = movementsQuery.data?.summary || { positive: 0, negative: 0, totalItems: 0 };
  const knownTypes = useMemo(() => Array.from(new Set((rows || []).map((movement) => movement.type).filter(Boolean))), [rows]);

  async function fetchAllMatchingMovements() {
    const first = await inventoryApi.stockMovementsPage({ page: 1, pageSize: 100, search, type: typeFilter });
    const totalPages = first.pagination?.totalPages || 1;
    const allRows = [...(first.rows || [])];
    for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
      const nextPage = await inventoryApi.stockMovementsPage({ page: currentPage, pageSize: 100, search, type: typeFilter });
      allRows.push(...(nextPage.rows || []));
    }
    return allRows;
  }

  const exportCsv = async () => {
    const allRows = await fetchAllMatchingMovements();
    if (!allRows.length) return;
    downloadCsvFile('stock-movements.csv', ['product', 'type', 'qty', 'beforeQty', 'afterQty', 'reason', 'note', SINGLE_STORE_MODE ? 'storeLocation' : 'location', 'date'], allRows.map((movement) => [
      movement.productName || '',
      getMovementLabel(movement.type),
      movement.qty,
      movement.beforeQty,
      movement.afterQty,
      movement.reason || '',
      movement.note || '',
      movement.locationName || movement.branchName || '',
      movement.date || ''
    ]));
  };

  const printRegister = async () => {
    const allRows = await fetchAllMatchingMovements();
    if (!allRows.length) return;
    printHtmlDocument('سجل حركات المخزون', `
      <h1>سجل حركات المخزون</h1>
      <table>
        <thead><tr><th>الصنف</th><th>النوع</th><th>الكمية</th><th>قبل</th><th>بعد</th><th>السبب</th><th>${SINGLE_STORE_MODE ? 'المخزن' : 'المخزن'}</th><th>التاريخ</th></tr></thead>
        <tbody>${allRows.map((movement) => `<tr><td>${escapeHtml(movement.productName || '—')}</td><td>${escapeHtml(getMovementLabel(movement.type))}</td><td>${escapeHtml(String(movement.qty || 0))}</td><td>${escapeHtml(String(movement.beforeQty || 0))}</td><td>${escapeHtml(String(movement.afterQty || 0))}</td><td>${escapeHtml(movement.reason || movement.note || '—')}</td><td>${escapeHtml(movement.locationName || movement.branchName || '—')}</td><td>${escapeHtml(formatDate(movement.date || ''))}</td></tr>`).join('')}</tbody>
      </table>
    `);
  };

  return (
    <div className="page-stack">
      <div className="mini-stats-grid movement-mini-grid">
        <div className="stat-card compact-stat-card"><span>الحركات المطابقة</span><strong>{pagination?.totalItems || 0}</strong></div>
        <div className="stat-card compact-stat-card"><span>إجمالي الزيادات</span><strong>{totals.positive.toFixed(3)}</strong></div>
        <div className="stat-card compact-stat-card"><span>إجمالي الخصومات</span><strong>{totals.negative.toFixed(3)}</strong></div>
      </div>
      <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder={SINGLE_STORE_MODE ? 'ابحث بالصنف أو السبب أو المخزن' : 'ابحث بالصنف أو السبب أو المخزن'}>
        <label className="field">
          <span>نوع الحركة</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">كل الحركات</option>
            {knownTypes.map((type) => <option key={type} value={type}>{getMovementLabel(type)}</option>)}
          </select>
        </label>
        <div className="actions compact-actions align-end-inline">
          <Button type="button" variant="secondary" onClick={() => { setSearch(''); setTypeFilter('all'); }}>إعادة الضبط</Button>
          <Button type="button" variant="secondary" onClick={() => void exportCsv()} disabled={!pagination?.totalItems}>تصدير CSV</Button>
          <Button type="button" variant="secondary" onClick={() => void printRegister()} disabled={!pagination?.totalItems}>طباعة الكل</Button>
        </div>
      </SearchToolbar>
      <QueryFeedback
        isLoading={movementsQuery.isLoading}
        isError={movementsQuery.isError}
        error={movementsQuery.error}
        isEmpty={!pagination?.totalItems}
        loadingText="جاري تحميل سجل حركات المخزون..."
        emptyTitle="لا توجد حركات مخزون مطابقة"
        emptyHint="نفّذ تعديل مخزون أو جرّب تغيير الفلتر الحالي."
      >
        <DataTable
          rows={rows}
          rowKey={(movement) => String(movement.id)}
          density="compact"
          pagination={{
            page: pagination?.page || page,
            pageSize: pagination?.pageSize || pageSize,
            totalItems: pagination?.totalItems || 0,
            onPageChange: setPage,
            onPageSizeChange: (value) => {
              setPageSize(value);
              setPage(1);
            },
            pageSizeOptions: [20, 50, 100],
            itemLabel: 'حركة'
          }}
          columns={[
            {
              key: 'product',
              header: 'الصنف',
              cell: (movement) => (
                <div>
                  <strong>{movement.productName || 'صنف غير معروف'}</strong>
                  <div className="muted small">{movement.locationName || movement.branchName || (SINGLE_STORE_MODE ? 'المخزن الأساسي' : 'بدون مخزن')} · {movement.createdBy || 'مستخدم غير محدد'}</div>
                </div>
              )
            },
            { key: 'type', header: 'النوع', cell: (movement) => <MovementPill type={movement.type} /> },
            {
              key: 'quantities',
              header: 'قبل / بعد / كمية',
              cell: (movement) => (
                <div>
                  <div className="muted small">قبل: {movement.beforeQty} · بعد: {movement.afterQty}</div>
                  <div className={`movement-delta ${movement.qty >= 0 ? 'positive' : 'negative'}`}>{movement.qty >= 0 ? '+' : ''}{movement.qty}</div>
                </div>
              )
            },
            {
              key: 'reason',
              header: 'السبب',
              cell: (movement) => (
                <div>
                  <div>{movement.reason || movement.note || 'بدون سبب إضافي'}</div>
                  <div className="muted small">{formatDate(movement.date || '')}</div>
                </div>
              )
            }
          ]}
        />
      </QueryFeedback>
    </div>
  );
}
