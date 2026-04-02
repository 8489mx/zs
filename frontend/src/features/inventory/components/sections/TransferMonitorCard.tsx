import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { QueryFeedback } from '@/components/shared/QueryFeedback';
import { formatDate } from '@/lib/format';
import type { StockTransfer } from '@/types/domain';

interface TransferMonitorCardProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  visibleTransfers: StockTransfer[];
  pendingTransfersCount: number;
  transferTotalItems: number;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  selectedTransfer: StockTransfer | null;
  selectedTransferTotals: { itemsCount: number; totalQty: number };
  transferFilter: 'all' | 'sent' | 'received' | 'cancelled';
  onTransferFilterChange: (value: 'all' | 'sent' | 'received' | 'cancelled') => void;
  onSelectTransfer: (transferId: string) => void;
  onCopyTransferDetails: () => void;
  onPrintTransfer: (transfer: StockTransfer) => void;
  onExportTransfers: () => void;
  onReceiveTransfer?: (transfer: StockTransfer) => void;
  onCancelTransfer?: (transfer: StockTransfer) => void;
  selectedTransferIds?: string[];
  onSelectedTransferIdsChange?: (ids: string[]) => void;
  onReceiveSelectedTransfers?: () => void;
  onCancelSelectedTransfers?: () => void;
}

export function TransferMonitorCard({
  isLoading,
  isError,
  error,
  visibleTransfers,
  pendingTransfersCount,
  transferTotalItems,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  selectedTransfer,
  selectedTransferTotals,
  transferFilter,
  onTransferFilterChange,
  onSelectTransfer,
  onCopyTransferDetails,
  onPrintTransfer,
  onExportTransfers,
  onReceiveTransfer,
  onCancelTransfer,
  selectedTransferIds = [],
  onSelectedTransferIdsChange,
  onReceiveSelectedTransfers,
  onCancelSelectedTransfers,
}: TransferMonitorCardProps) {
  return (
    <Card title="تحويلات مخزون قائمة" description="عرض table-first مع لوحة تفاصيل جانبية حتى تستطيع مراجعة البنود والجهات والحالة بسرعة قبل الاستلام أو الإلغاء." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onExportTransfers} disabled={!visibleTransfers.length}>تصدير CSV</Button><span className="nav-pill">{pendingTransfersCount} قيد الاستلام من {transferTotalItems}</span></div>}>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!visibleTransfers.length}
        loadingText="جاري تحميل تحويلات المخزون..."
        emptyTitle="لا توجد تحويلات مخزون"
      >
        <div className="filter-chip-row">
          <Button type="button" variant={transferFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('all')}>الكل</Button>
          <Button type="button" variant={transferFilter === 'sent' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('sent')}>مرسلة</Button>
          <Button type="button" variant={transferFilter === 'received' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('received')}>مستلمة</Button>
          <Button type="button" variant={transferFilter === 'cancelled' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('cancelled')}>ملغاة</Button>
        </div>
        <div className="inventory-master-detail inventory-master-detail-wide">
          <div className="detail-table-panel">
            {selectedTransferIds.length ? (
              <div className="bulk-toolbar" style={{ marginBottom: 12 }}>
                <strong>تم تحديد {selectedTransferIds.length} تحويل</strong>
                <div className="actions compact-actions">
                  {onReceiveSelectedTransfers ? <Button type="button" variant="success" onClick={onReceiveSelectedTransfers}>استلام المحدد</Button> : null}
                  {onCancelSelectedTransfers ? <Button type="button" variant="danger" onClick={onCancelSelectedTransfers}>إلغاء المحدد</Button> : null}
                  <Button type="button" variant="secondary" onClick={() => onSelectedTransferIdsChange?.([])}>إلغاء التحديد</Button>
                </div>
              </div>
            ) : null}
            <DataTable
              rows={visibleTransfers}
              rowKey={(transfer) => String(transfer.id)}
              onRowClick={(transfer) => onSelectTransfer(String(transfer.id))}
              rowClassName={(transfer) => String(selectedTransfer?.id || '') === String(transfer.id) ? 'table-row-selected' : undefined}
              rowTitle={(transfer) => `فتح التحويل ${transfer.docNo || transfer.id}`}
              density="compact"
              selection={{
                selectedKeys: selectedTransferIds,
                onChange: onSelectedTransferIdsChange || (() => {}),
                checkboxLabel: (transfer) => `تحديد التحويل ${transfer.docNo || transfer.id}`,
              }}
              pagination={{
                page,
                pageSize,
                onPageChange,
                onPageSizeChange,
                totalItems,
                itemLabel: 'تحويل',
              }}
              columns={[
                {
                  key: 'doc',
                  header: 'التحويل',
                  cell: (transfer) => (
                    <div>
                      <strong>{transfer.docNo || transfer.id}</strong>
                      <div className="muted small">{formatDate(transfer.date)}</div>
                    </div>
                  ),
                },
                {
                  key: 'route',
                  header: 'المسار',
                  cell: (transfer) => (
                    <div>
                      <div>{transfer.fromLocationName || '—'} ←→ {transfer.toLocationName || '—'}</div>
                      <div className="muted small">{transfer.items.length} بند</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'الحالة',
                  cell: (transfer) => <span className="nav-pill">{transfer.status || '—'}</span>,
                },
                {
                  key: 'qty',
                  header: 'إجمالي الكمية',
                  cell: (transfer) => transfer.items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
                },
                {
                  key: 'actions',
                  header: 'إجراءات',
                  cell: (transfer) => (
                    <div className="actions compact-actions">
                      <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); onSelectTransfer(String(transfer.id)); }}>التفاصيل</Button>
                      {transfer.status === 'sent' ? (
                        <>
                          {onReceiveTransfer ? <Button type="button" variant="success" onClick={(event) => { event.stopPropagation(); onReceiveTransfer(transfer); }}>استلام</Button> : null}
                          {onCancelTransfer ? <Button type="button" variant="danger" onClick={(event) => { event.stopPropagation(); onCancelTransfer(transfer); }}>إلغاء</Button> : null}
                        </>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <div className="detail-panel">
            {selectedTransfer ? (
              <div className="section-stack">
                <div className="detail-panel-header">
                  <div>
                    <h3 className="detail-panel-title">{selectedTransfer.docNo || selectedTransfer.id}</h3>
                    <div className="detail-panel-subtitle">لوحة تفصيل المستند: البنود، المواقع، الأثر الزمني، والإجراءات المتاحة حسب الحالة.</div>
                  </div>
                  <span className="nav-pill">{selectedTransfer.status || '—'}</span>
                </div>
                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-label">من موقع</div><div className="detail-value">{selectedTransfer.fromLocationName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">إلى موقع</div><div className="detail-value">{selectedTransfer.toLocationName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">عدد البنود</div><div className="detail-value">{selectedTransferTotals.itemsCount}</div></div>
                  <div className="detail-item"><div className="detail-label">إجمالي الكميات</div><div className="detail-value">{selectedTransferTotals.totalQty}</div></div>
                  <div className="detail-item"><div className="detail-label">أنشأه</div><div className="detail-value">{selectedTransfer.createdBy || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">التاريخ</div><div className="detail-value">{formatDate(selectedTransfer.date || '')}</div></div>
                  <div className="detail-item"><div className="detail-label">تم الاستلام</div><div className="detail-value">{selectedTransfer.receivedAt ? formatDate(selectedTransfer.receivedAt) : 'لم يتم بعد'}</div></div>
                  <div className="detail-item"><div className="detail-label">تم الإلغاء</div><div className="detail-value">{selectedTransfer.cancelledAt ? formatDate(selectedTransfer.cancelledAt) : 'غير ملغي'}</div></div>
                </div>
                <div className="surface-note">{selectedTransfer.note || 'لا توجد ملاحظات على هذا التحويل.'}</div>
                <div className="detail-table-wrap">
                  <table>
                    <thead><tr><th>الصنف</th><th>الكمية</th></tr></thead>
                    <tbody>{(selectedTransfer.items || []).map((item) => <tr key={item.id || `${selectedTransfer.id}-${item.productId}`}><td>{item.productName || '—'}</td><td>{item.qty}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={onCopyTransferDetails}>نسخ التفاصيل</Button>
                  <Button variant="secondary" onClick={() => onPrintTransfer(selectedTransfer)}>طباعة المستند</Button>
                  {selectedTransfer.status === 'sent' ? (
                    <>
                      {onReceiveTransfer ? <Button variant="success" onClick={() => onReceiveTransfer(selectedTransfer)}>استلام الآن</Button> : null}
                      {onCancelTransfer ? <Button variant="danger" onClick={() => onCancelTransfer(selectedTransfer)}>إلغاء التحويل</Button> : null}
                    </>
                  ) : null}
                </div>
              </div>
            ) : <EmptyState title="اختر تحويلًا لعرض التفاصيل" hint="انقر على أي تحويل من القائمة لرؤية البنود والجهات والحالة الزمنية." />}
          </div>
        </div>
      </QueryFeedback>
    </Card>
  );
}
