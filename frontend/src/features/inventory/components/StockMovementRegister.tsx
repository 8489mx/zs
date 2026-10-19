import { useTranslation } from 'react-i18next';
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
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useIsMobile } from '@/shared/hooks/use-is-mobile';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

const movementLabels: Record<string, string> = {
  opening: 'رصيد افتتاحي',
  opening_balance: 'رصيد افتتاحي',
  sale: 'فاتورة بيع',
  sale_return: 'مرتجع بيع',
  sale_edit: 'تعديل بيع',
  sale_edit_reversal: 'عكس تعديل بيع',
  sale_cancel: 'إلغاء بيع',
  purchase: 'فاتورة شراء',
  purchase_return: 'مرتجع شراء',
  van_load_out: 'تحميل سيارة توزيع',
  van_load_in: 'استلام سيارة توزيع',
  van_unload_out: 'تفريغ سيارة توزيع',
  van_unload_in: 'استلام من سيارة توزيع',
  van_sale: 'بيع سيارة توزيع',
  van_return: 'مرتجع سيارة توزيع',
  transfer_send: 'إذن صرف تحويل',
  transfer_receive: 'استلام تحويل',
  transfer_cancel: 'إلغاء تحويل',
  stock_count_gain: 'زيادة جرد',
  stock_count_loss: 'عجز جرد',
  damaged: 'تالف وهالك',
  food_waste: 'هالك أطعمة',
  manufacturing_consumption: 'استهلاك تصنيع',
  manufacturing_production: 'إنتاج تام',
  tradein_in: 'استبدال - استلام',
  tradein_out: 'استبدال - صرف',
  add: 'إضافة مخزنية',
  deduct: 'خصم مخزني',
};

const movementToneMap: Record<string, string> = {
  damaged: 'negative',
  food_waste: 'negative',
  deduct: 'negative',
  stock_count_loss: 'negative',
  transfer_send: 'negative',
  van_load_out: 'negative',
  van_unload_out: 'negative',
  van_sale: 'negative',
  sale: 'negative',
  sale_edit: 'negative',
  purchase_return: 'negative',
  tradein_out: 'negative',
  manufacturing_consumption: 'negative',

  transfer_cancel: 'positive',
  stock_count_gain: 'positive',
  opening: 'positive',
  opening_balance: 'positive',
  add: 'positive',
  transfer_receive: 'positive',
  van_load_in: 'positive',
  van_unload_in: 'positive',
  purchase: 'positive',
  sale_return: 'positive',
  sale_cancel: 'positive',
  sale_edit_reversal: 'positive',
  van_return: 'positive',
  tradein_in: 'positive',
  manufacturing_production: 'positive',
};

const MOVEMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'كل الحركات' },
  ...Object.entries(movementLabels).map(([type, label]) => ({ value: type, label })),
];

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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedMovement, setSelectedMovement] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 280);
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const paramsKey = makeParamsKey(page, pageSize, debouncedSearch, typeFilter);
  const movementsQuery = useQuery({
    queryKey: queryKeys.stockMovementsPage(paramsKey),
    queryFn: () => inventoryApi.stockMovementsPage({ page, pageSize, search: debouncedSearch, type: typeFilter }),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeFilter]);

  const rows = useMemo(() => movementsQuery.data?.rows || [], [movementsQuery.data?.rows]);
  const pagination = movementsQuery.data?.pagination;
  const totals = movementsQuery.data?.summary || { positive: 0, negative: 0, totalItems: 0 };

  async function fetchAllMatchingMovements() {
    const first = await inventoryApi.stockMovementsPage({ page: 1, pageSize: 100, search: debouncedSearch, type: typeFilter });
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
        <div className="stat-card compact-stat-card"><span>{t('inventory.stock_movement_register.s0', "الحركات المطابقة")}</span><strong>{pagination?.totalItems || 0}</strong></div>
        <div className="stat-card compact-stat-card"><span>{t('inventory.stock_movement_register.s1', "إجمالي الزيادات")}</span><strong>{totals.positive.toFixed(3)}</strong></div>
        <div className="stat-card compact-stat-card"><span>{t('inventory.stock_movement_register.s2', "إجمالي الخصومات")}</span><strong>{totals.negative.toFixed(3)}</strong></div>
      </div>
      <SearchToolbar search={search} onSearchChange={setSearch} searchPlaceholder={SINGLE_STORE_MODE ? t('inventory.stock_movement_register.s3', "ابحث بالصنف أو السبب أو المخزن") : t('inventory.stock_movement_register.s4', "ابحث بالصنف أو السبب أو المخزن")}>
        <div className="field" style={{ minWidth: '180px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>{t('inventory.stock_movement_register.s5', "نوع الحركة")}</span>
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={MOVEMENT_FILTER_OPTIONS}
            placeholder={t('inventory.stock_movement_register.s6', "اختر نوع الحركة")}
          />
        </div>
        <div className="actions compact-actions align-end-inline">
          <Button type="button" variant="secondary" onClick={() => { setSearch(''); setTypeFilter('all'); }}>{t('inventory.stock_movement_register.s7', "إعادة الضبط")}</Button>
          <Button type="button" variant="secondary" onClick={() => void exportCsv()} disabled={!pagination?.totalItems}>{t('inventory.stock_movement_register.s8', "تصدير Excel")}</Button>
          <Button type="button" variant="secondary" onClick={() => void printRegister()} disabled={!pagination?.totalItems}>{t('inventory.stock_movement_register.s9', "طباعة الكل")}</Button>
        </div>
      </SearchToolbar>
      <QueryFeedback
        isLoading={movementsQuery.isLoading}
        isError={movementsQuery.isError}
        error={movementsQuery.error}
        isEmpty={!pagination?.totalItems}
        loadingText={t('inventory.stock_movement_register.s10', "جاري تحميل سجل حركات المخزون...")}
        emptyTitle={t('inventory.stock_movement_register.s11', "لا توجد حركات مخزون مطابقة")}
        emptyHint={t('inventory.stock_movement_register.s12', "نفّذ تعديل مخزون أو جرّب تغيير الفلتر الحالي.")}
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
            itemLabel: t('inventory.stock_movement_register.s13', "حركة")
          }}
          columns={[
            {
              key: 'product',
              header: t('inventory.stock_movement_register.s14', "الصنف"),
              cell: (movement) => (
                <div>
                  <strong>{movement.productName || t('inventory.stock_movement_register.s15', "صنف غير معروف")}</strong>
                  <div className="muted small">{movement.locationName || movement.branchName || (SINGLE_STORE_MODE ? t('inventory.stock_movement_register.s16', "المخزن الأساسي") : t('inventory.stock_movement_register.s17', "بدون مخزن"))} · {movement.createdBy || t('inventory.stock_movement_register.s18', "مستخدم غير محدد")}</div>
                </div>
              )
            },
            { key: 'type', header: t('inventory.stock_movement_register.s19', "النوع"), cell: (movement) => <MovementPill type={movement.type} /> },
            {
              key: 'quantities',
              header: t('inventory.stock_movement_register.s20', "قبل / بعد / كمية"),
              cell: (movement) => (
                <div>
                  <div className="muted small">{t('inventory.stock_movement_register.s21', "قبل:")} {movement.beforeQty} {t('inventory.stock_movement_register.s22', "· بعد:")} {movement.afterQty}</div>
                  <div className={`movement-delta ${movement.qty >= 0 ? 'positive' : 'negative'}`}>{movement.qty >= 0 ? '+' : ''}{movement.qty}</div>
                </div>
              )
            },
            {
              key: 'reason',
              header: t('inventory.stock_movement_register.s23', "السبب"),
              cell: (movement) => (
                <div>
                  <div>{movement.reason || movement.note || t('inventory.stock_movement_register.s24', "بدون سبب إضافي")}</div>
                  <div className="muted small">{formatDate(movement.date || '')}</div>
                </div>
              )
            }
          ]}
        />

        {/* Mobile Details Modal */}
        {/* Mobile Details Modal */}
        <StandardDialog
          open={Boolean(selectedMovement)}
          onClose={() => setSelectedMovement(null)}
          title={t('inventory.stock_movement_register.s25', "تفاصيل حركة المخزون")}
          subtitle={selectedMovement ? (selectedMovement.productName || t('inventory.stock_movement_register.s26', "صنف غير معروف")) : ''}
          size="sm"
          footerActions={
            <StandardDialogFooter
              cancelLabel={t('inventory.stock_movement_register.s27', "إغلاق")}
              onCancel={() => setSelectedMovement(null)}
            />
          }
        >
          {selectedMovement && (
            <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('inventory.stock_movement_register.s28', "نوع الحركة:")}</span>
                <MovementPill type={selectedMovement.type} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>{t('inventory.stock_movement_register.s29', "قبل الحركة")}</span>
                  <strong style={{ fontSize: '0.92rem', color: '#334155' }}>{selectedMovement.beforeQty}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>{t('inventory.stock_movement_register.s30', "مقدار التغير")}</span>
                  <strong style={{ fontSize: '0.95rem', color: selectedMovement.qty >= 0 ? '#16a34a' : '#dc2626' }}>
                    {selectedMovement.qty >= 0 ? '+' : ''}{selectedMovement.qty}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>{t('inventory.stock_movement_register.s31', "بعد الحركة")}</span>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{selectedMovement.afterQty}</strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{t('inventory.stock_movement_register.s32', "المخزن:")}</span>
                  <strong style={{ color: '#1e293b' }}>{selectedMovement.locationName || selectedMovement.branchName || (SINGLE_STORE_MODE ? t('inventory.stock_movement_register.s33', "المخزن الأساسي") : t('inventory.stock_movement_register.s34', "بدون مخزن"))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{t('inventory.stock_movement_register.s35', "المستخدم المسئول:")}</span>
                  <strong style={{ color: '#1e293b' }}>{selectedMovement.createdBy || t('inventory.stock_movement_register.s36', "مستخدم غير محدد")}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>{t('inventory.stock_movement_register.s37', "التاريخ والوقت:")}</span>
                  <strong style={{ color: '#334155' }}>{formatDate(selectedMovement.date || '')}</strong>
                </div>
              </div>

              {(selectedMovement.reason || selectedMovement.note) && (
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'block', marginBottom: '4px' }}>{t('inventory.stock_movement_register.s38', "السبب / الملاحظات:")}</span>
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>{selectedMovement.reason || selectedMovement.note}</span>
                </div>
              )}
            </div>
          )}
        </StandardDialog>
      </QueryFeedback>
    </div>
  );
}
