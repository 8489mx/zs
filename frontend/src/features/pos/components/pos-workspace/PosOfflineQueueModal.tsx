import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { formatCurrency } from '@/lib/format';
import { OfflinePosSale, removeOfflineSale, clearOfflineQueue } from '@/features/pos/lib/pos-offline-sync';

interface PosOfflineQueueModalProps {
  open: boolean;
  onClose: () => void;
  offlineQueue: OfflinePosSale[];
  isSyncing: boolean;
  onRetrySync: () => Promise<void> | void;
}

export function PosOfflineQueueModal({
  open,
  onClose,
  offlineQueue,
  isSyncing,
  onRetrySync,
}: PosOfflineQueueModalProps) {
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  if (!open) return null;

  const totalAmount = offlineQueue.reduce((sum, item) => {
    return sum + Number(item.payload.expectedTotal || 0);
  }, 0);

  const handleCopyJson = () => {
    try {
      const dataStr = JSON.stringify(offlineQueue, null, 2);
      navigator.clipboard.writeText(dataStr);
      setCopyStatus('تم نسخ بيانات الفواتير بنجاح');
      setTimeout(() => setCopyStatus(null), 3000);
    } catch {
      setCopyStatus('تعذر النسخ إلى الحافظة');
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  const handleRemoveSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة من قائمة الانتظار المحلية؟ لن يتم ترحيلها للخادم.')) {
      removeOfflineSale(id);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('تحذير: هل أنت متأكد من حذف جميع الفواتير المعلقة؟ سيتم فقدان بياناتها بالكامل.')) {
      clearOfflineQueue();
      onClose();
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      ariaLabel="سجل الفواتير المحفوظة بدون إنترنت (Offline Queue)"
      width="min(720px, 100%)"
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
        {/* Summary header banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b' }}>إجمالي الفواتير المعلقة محلياً</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {offlineQueue.length} فواتير ({formatCurrency(totalAmount)})
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={isSyncing || offlineQueue.length === 0}
              onClick={() => onRetrySync()}
              style={{
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isSyncing || offlineQueue.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSyncing || offlineQueue.length === 0 ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{isSyncing ? 'جاري المزامنة...' : 'إعادة محاولة المزامنة الآن'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyJson}
              disabled={offlineQueue.length === 0}
              style={{
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: offlineQueue.length === 0 ? 'not-allowed' : 'pointer',
                opacity: offlineQueue.length === 0 ? 0.6 : 1,
              }}
            >
              نسخ البيانات (JSON)
            </button>
          </div>
        </div>

        {copyStatus && (
          <div style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 600 }}>
            {copyStatus}
          </div>
        )}

        {/* List of offline sales */}
        {offlineQueue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              color: '#059669',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#334155' }}>لا توجد فواتير معلقة حالياً</div>
            <div style={{ fontSize: '13px' }}>جميع فواتير الكاشير رُحّلت واعتمدت على الخادم بنجاح.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '50vh', overflowY: 'auto' }}>
            {offlineQueue.map((item, idx) => {
              const isExpanded = expandedSaleId === item.id;
              const dateFormatted = new Date(item.savedAt).toLocaleString('ar-EG', {
                dateStyle: 'short',
                timeStyle: 'medium',
              });
              const itemsCount = item.payload.cart?.length || 0;
              const total = Number(item.payload.expectedTotal || 0);

              let statusBg = '#fef3c7';
              let statusColor = '#92400e';
              let statusLabel = 'في انتظار المزامنة';

              if (item.status === 'syncing') {
                statusBg = '#dbeafe';
                statusColor = '#1e40af';
                statusLabel = 'جاري الترحيل...';
              } else if (item.status === 'failed') {
                statusBg = '#fee2e2';
                statusColor = '#991b1b';
                statusLabel = 'فشلت المزامنة مؤقتاً';
              }

              return (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: '#ffffff',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => setExpandedSaleId(isExpanded ? null : item.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          فاتورة {formatCurrency(total)} ({itemsCount} أصناف)
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{dateFormatted}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: statusBg,
                        color: statusColor,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSingle(item.id, e)}
                        title="حذف من الطابور المحلي"
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fee2e2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '6px',
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>

                  {item.error && (
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 10px',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      borderRadius: '6px',
                      fontSize: '11px',
                      borderRight: '3px solid #ef4444',
                    }}>
                      سبب تعثر الترحيل: {item.error}
                    </div>
                  )}

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>الأصناف في الفاتورة:</div>
                      <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', textAlign: 'right', color: '#64748b' }}>
                            <th style={{ padding: '6px 8px' }}>الصنف</th>
                            <th style={{ padding: '6px 8px' }}>الكمية</th>
                            <th style={{ padding: '6px 8px' }}>السعر</th>
                            <th style={{ padding: '6px 8px' }}>الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.payload.cart?.map((cartItem, cIdx) => (
                            <tr key={cIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{cartItem.name || `صنف #${cartItem.productId}`}</td>
                              <td style={{ padding: '6px 8px' }}>{cartItem.qty} {cartItem.unitName || ''}</td>
                              <td style={{ padding: '6px 8px' }}>{formatCurrency(cartItem.price)}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 700 }}>{formatCurrency(cartItem.qty * cartItem.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          {offlineQueue.length > 0 ? (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'transparent',
                color: '#dc2626',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              حذف الكل
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
