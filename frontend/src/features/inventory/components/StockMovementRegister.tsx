import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { downloadExcelFile, escapeHtml, printHtmlDocument } from '@/lib/browser';
import { formatDate } from '@/lib/format';
import { inventoryApi } from '@/features/inventory/api/inventory.api';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useIsMobile } from '@/shared/hooks/use-is-mobile';

const movementLabels: Record<string, string> = {
  opening: 'رصيد افتتاحي',
  add: 'إضافة',
  deduct: 'خصم',
  damaged: 'تالف',
  stock_count_gain: 'زيادة جرد',
  stock_count_loss: 'عجز جرد',
  transfer_send: 'إذن صرف',
  transfer_receive: 'استلام بضاعة',
  transfer_cancel: 'إلغاء صرف'
};

const movementToneMap: Record<string, string> = {
  damaged: 'negative',
  deduct: 'negative',
  stock_count_loss: 'negative',
  transfer_send: 'negative',
  transfer_cancel: 'positive',
  stock_count_gain: 'positive',
  opening: 'positive',
  add: 'positive',
  transfer_receive: 'positive'
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
  const isMobile = useIsMobile();
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
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
    downloadExcelFile('stock-movements.xlsx', ['product', 'type', 'qty', 'beforeQty', 'afterQty', 'reason', 'note', SINGLE_STORE_MODE ? 'storeLocation' : 'location', 'date'], allRows.map((movement) => [
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
            {Object.keys(movementLabels).map((type) => <option key={type} value={type}>{getMovementLabel(type)}</option>)}
          </select>
        </label>
        <div className="actions compact-actions align-end-inline">
          <Button type="button" variant="secondary" onClick={() => { setSearch(''); setTypeFilter('all'); }}>إعادة الضبط</Button>
          <Button type="button" variant="secondary" onClick={() => void exportCsv()} disabled={!pagination?.totalItems}>تصدير Excel</Button>
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
          onRowClick={(movement) => {
            if (isMobile) {
              setSelectedMovement(movement);
            }
          }}
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

        {/* Mobile Details Modal */}
        {selectedMovement && (
          <DialogShell
            open={Boolean(selectedMovement)}
            onClose={() => setSelectedMovement(null)}
            width="min(500px, 95vw)"
            ariaLabel={`تفاصيل حركة مخزون ${selectedMovement.productName || ''}`}
            showCloseButton={false}
          >
            <div className="dialog-card" dir="rtl" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '85vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  تفاصيل حركة المخزون
                </h3>
                <MovementPill type={selectedMovement.type} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginBottom: '2px' }}>اسم الصنف</span>
                  <strong style={{ fontSize: '0.98rem', color: '#0f172a' }}>{selectedMovement.productName || 'صنف غير معروف'}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>قبل الحركة</span>
                    <strong style={{ fontSize: '0.92rem', color: '#334155' }}>{selectedMovement.beforeQty}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>مقدار التغير</span>
                    <strong style={{ fontSize: '0.95rem', color: selectedMovement.qty >= 0 ? '#16a34a' : '#dc2626' }}>
                      {selectedMovement.qty >= 0 ? '+' : ''}{selectedMovement.qty}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>بعد الحركة</span>
                    <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{selectedMovement.afterQty}</strong>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>المخزن:</span>
                    <strong style={{ color: '#1e293b' }}>{selectedMovement.locationName || selectedMovement.branchName || (SINGLE_STORE_MODE ? 'المخزن الأساسي' : 'بدون مخزن')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>المستخدم المسئول:</span>
                    <strong style={{ color: '#1e293b' }}>{selectedMovement.createdBy || 'مستخدم غير محدد'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>التاريخ والوقت:</span>
                    <strong style={{ color: '#334155' }}>{formatDate(selectedMovement.date || '')}</strong>
                  </div>
                </div>

                {(selectedMovement.reason || selectedMovement.note) && (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>السبب / الملاحظات:</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{selectedMovement.reason || selectedMovement.note}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setSelectedMovement(null)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </DialogShell>
        )}
      </QueryFeedback>
    </div>
  );
}
