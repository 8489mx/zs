import { useRef, useState } from 'react'; 
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { formatDate } from '@/lib/format';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useIsMobile } from '@/shared/hooks/use-is-mobile';
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
  onPrintTransfer: (transfer: StockTransfer, format: 'a4' | 'receipt') => void;
  onExportTransfers: () => void;
  onReceiveTransfer?: (transfer: StockTransfer) => void;
  onCancelTransfer?: (transfer: StockTransfer) => void;
  selectedTransferIds?: string[];
  onSelectedTransferIdsChange?: (ids: string[]) => void;
  onReceiveSelectedTransfers?: () => void;
  onCancelSelectedTransfers?: () => void;
}

function TransferDetailContent({
  selectedTransfer,
  selectedTransferTotals,
  onCopyTransferDetails,
  onPrintTransfer,
  onReceiveTransfer,
  onCancelTransfer,
  onClose,
  isMobileModal = false,
}: {
  selectedTransfer: StockTransfer;
  selectedTransferTotals: { itemsCount: number; totalQty: number };
  onCopyTransferDetails: () => void;
  onPrintTransfer: (transfer: StockTransfer, format: 'a4' | 'receipt') => void;
  onReceiveTransfer?: (transfer: StockTransfer) => void;
  onCancelTransfer?: (transfer: StockTransfer) => void;
  onClose?: () => void;
  isMobileModal?: boolean;
}) {
  const statusLabel = selectedTransfer.status === 'received' ? 'مستلم' : selectedTransfer.status === 'sent' ? 'مرسل / قيد الاستلام' : selectedTransfer.status === 'cancelled' ? 'ملغي' : (selectedTransfer.status || '—');
  const isCancelled = Boolean(selectedTransfer.cancelledAt || selectedTransfer.status === 'cancelled');

  return (
    <div className="section-stack" dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            {selectedTransfer.docNo || selectedTransfer.id}
          </h3>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
            لوحة تفصيل المستند: البنود، المخازن، الأثر الزمني، والإجراءات المتاحة.
          </div>
        </div>
        <span className="status-badge" style={{
          padding: '3px 9px',
          borderRadius: '6px',
          fontSize: '11.5px',
          fontWeight: 700,
          background: selectedTransfer.status === 'received' ? '#dcfce7' : isCancelled ? '#fee2e2' : '#eff6ff',
          color: selectedTransfer.status === 'received' ? '#166534' : isCancelled ? '#991b1b' : '#1d4ed8',
          border: `1px solid ${selectedTransfer.status === 'received' ? '#86efac' : isCancelled ? '#fca5a5' : '#bfdbfe'}`,
        }}>
          {statusLabel}
        </span>
      </div>

      {/* 2. Card 1: Route & Parties */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          مسار التحويل والأطراف
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>من مخزن</span>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{selectedTransfer.fromLocationName || '—'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>الوجهة</span>
            <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>{selectedTransfer.toLocationName || selectedTransfer.toBranchName || '—'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>أنشأه (المرسل)</span>
            <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{selectedTransfer.createdBy || '—'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>مستلم البضاعة</span>
            <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{selectedTransfer.recipientName || '—'}</strong>
          </div>
        </div>
      </div>

      {/* 3. Card 2: Quantities & Timeline */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
          الكميات والأثر الزمني
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 12px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>عدد البنود</span>
            <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 700 }}>{selectedTransferTotals.itemsCount}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>إجمالي الكميات</span>
            <strong style={{ fontSize: '12.5px', color: '#2563eb', fontWeight: 800 }}>{selectedTransferTotals.totalQty}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>تاريخ الإنشاء</span>
            <strong style={{ fontSize: '11.5px', color: '#0f172a' }}><bdi dir="ltr">{formatDate(selectedTransfer.date || '')}</bdi></strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 600 }}>تاريخ الاستلام</span>
            <strong style={{ fontSize: '11.5px', color: selectedTransfer.receivedAt ? '#166534' : '#64748b' }}>
              {selectedTransfer.receivedAt ? <bdi dir="ltr">{formatDate(selectedTransfer.receivedAt)}</bdi> : 'لم يتم بعد'}
            </strong>
          </div>
          {isCancelled ? (
            <div style={{ gridColumn: '1 / -1', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px', fontSize: '11.5px', color: '#991b1b' }}>
              <strong>تم الإلغاء: </strong> <bdi dir="ltr">{selectedTransfer.cancelledAt ? formatDate(selectedTransfer.cancelledAt) : 'ملغي'}</bdi>
            </div>
          ) : null}
        </div>
      </div>

      {/* 4. Notes Panel */}
      {selectedTransfer.note ? (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex',
          gap: '6px',
          fontSize: '12.5px',
        }}>
          <span style={{ fontWeight: 800, color: '#92400e', flexShrink: 0 }}>ملاحظات:</span>
          <span style={{ color: '#78350f' }}>{selectedTransfer.note}</span>
        </div>
      ) : null}

      {/* 5. Items Table */}
      <details className="detail-table-wrap" open={isMobileModal} style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: 0,
        overflow: 'hidden',
      }}>
        <summary style={{
          padding: '10px 14px',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '12.5px',
          color: '#334155',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          userSelect: 'none',
        }}>
          تفاصيل بنود التحويل ({selectedTransferTotals.itemsCount} صنف)
        </summary>
        <div style={{ padding: '8px 12px 12px', maxHeight: '250px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '11.5px', color: '#64748b', textAlign: 'right' }}>
                <th style={{ padding: '6px 8px' }}>الصنف</th>
                <th style={{ padding: '6px 8px', textAlign: 'center', width: '80px' }}>الكمية</th>
              </tr>
            </thead>
            <tbody>
              {(selectedTransfer.items || []).map((item) => (
                <tr key={item.id || `${selectedTransfer.id}-${item.productId}`} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12.5px' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.productName || '—'}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{item.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* 6. Action Toolbar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
        {['sent', 'received'].includes(selectedTransfer.status) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {onReceiveTransfer && selectedTransfer.status === 'sent' ? (
              <Button variant="success" onClick={() => { onReceiveTransfer(selectedTransfer); onClose?.(); }} style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}>
                استلام الإذن
              </Button>
            ) : null}
            {onCancelTransfer && selectedTransfer.status === 'sent' ? (
              <Button variant="danger" onClick={() => { onCancelTransfer(selectedTransfer); onClose?.(); }} style={{ flex: 1, justifyContent: 'center', fontWeight: 700 }}>
                إلغاء التحويل
              </Button>
            ) : null}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: isMobileModal ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          <Button variant="secondary" onClick={() => onPrintTransfer(selectedTransfer, 'a4')} style={{ justifyContent: 'center', fontSize: '12px' }}>
            طباعة (A4)
          </Button>
          <Button variant="secondary" onClick={() => onPrintTransfer(selectedTransfer, 'receipt')} style={{ justifyContent: 'center', fontSize: '12px' }}>
            طباعة ريسيت
          </Button>
          <Button variant="secondary" onClick={onCopyTransferDetails} style={{ justifyContent: 'center', fontSize: '12px' }}>
            نسخ التفاصيل
          </Button>
          {isMobileModal && onClose ? (
            <Button variant="secondary" onClick={onClose} style={{ justifyContent: 'center', fontSize: '12px' }}>
              إغلاق
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
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
  const isMobile = useIsMobile();
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  return (
    <FormSection title="تحويلات مخزون قائمة" description="عرض table-first مع لوحة تفاصيل جانبية حتى تستطيع مراجعة البنود والجهات والحالة بسرعة قبل الاستلام أو الإلغاء." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onExportTransfers} disabled={!visibleTransfers.length}>تصدير Excel</Button><span className="nav-pill">{pendingTransfersCount} قيد الاستلام من {transferTotalItems}</span></div>}>
      <div className="filter-chip-row" style={{ marginBottom: 16 }}>
        <Button type="button" variant={transferFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('all')}>الكل</Button>
        <Button type="button" variant={transferFilter === 'sent' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('sent')}>مرسلة</Button>
        <Button type="button" variant={transferFilter === 'received' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('received')}>مستلمة</Button>
        <Button type="button" variant={transferFilter === 'cancelled' ? 'primary' : 'secondary'} onClick={() => onTransferFilterChange('cancelled')}>ملغاة</Button>
      </div>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!visibleTransfers.length}
        loadingText="جاري تحميل التحويلات..."
        emptyTitle="لا توجد تحويلات مطابقة"
      >
        <div className="section-stack">
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
              onRowClick={(transfer) => {
                onSelectTransfer(String(transfer.id));
                if (isMobile) {
                  setIsMobileModalOpen(true);
                } else {
                  window.requestAnimationFrame(() => {
                    detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
                  });
                }
              }}
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
                      <div>{transfer.fromLocationName || '—'} ←→ {transfer.toLocationName || transfer.toBranchName || '—'}</div>
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
                    <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>
                      {['sent', 'received'].includes(transfer.status) ? (
                        <>
                          {onReceiveTransfer && transfer.status === 'sent' ? <Button type="button" variant="success" onClick={(event) => { event.stopPropagation(); onReceiveTransfer(transfer); }}>استلام</Button> : null}
                          {onCancelTransfer ? <Button type="button" variant="danger" onClick={(event) => { event.stopPropagation(); onCancelTransfer(transfer); }}>إلغاء</Button> : null}
                        </>
                      ) : null}
                    </div>
                  ),
                },
              ]}
            />
          </div>
          {!isMobile && (
            <div ref={detailPanelRef} className="detail-panel">
              {selectedTransfer ? (
                <TransferDetailContent
                  selectedTransfer={selectedTransfer}
                  selectedTransferTotals={selectedTransferTotals}
                  onCopyTransferDetails={onCopyTransferDetails}
                  onPrintTransfer={onPrintTransfer}
                  onReceiveTransfer={onReceiveTransfer}
                  onCancelTransfer={onCancelTransfer}
                />
              ) : <EmptyState title="اختر تحويلًا لعرض التفاصيل" hint="انقر على أي تحويل من القائمة لرؤية البنود والجهات والحالة الزمنية." />}
            </div>
          )}
        </div>

        {/* Mobile Details Modal */}
        {isMobile && selectedTransfer && isMobileModalOpen && (
          <DialogShell
            open={Boolean(isMobileModalOpen && selectedTransfer)}
            onClose={() => setIsMobileModalOpen(false)}
            width="min(560px, 95vw)"
            ariaLabel={`تفاصيل تحويل ${selectedTransfer.docNo || selectedTransfer.id}`}
            showCloseButton={false}
          >
            <div className="dialog-card" style={{ padding: '16px', maxHeight: '85vh', overflowY: 'auto' }}>
              <TransferDetailContent
                selectedTransfer={selectedTransfer}
                selectedTransferTotals={selectedTransferTotals}
                onCopyTransferDetails={onCopyTransferDetails}
                onPrintTransfer={onPrintTransfer}
                onReceiveTransfer={onReceiveTransfer}
                onCancelTransfer={onCancelTransfer}
                onClose={() => setIsMobileModalOpen(false)}
                isMobileModal={true}
              />
            </div>
          </DialogShell>
        )}
      </QueryFeedback>
    </FormSection>
  );
}
