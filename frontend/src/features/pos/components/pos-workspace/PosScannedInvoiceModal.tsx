import { useState } from 'react';
import type { AppSettings, Sale } from '@/types/domain';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { printPostedSaleReceipt } from '@/lib/pos-printing';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';

interface PosScannedInvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  settings?: Partial<AppSettings> | null;
  onOpenReturns?: (sale: Sale) => void;
}

export function PosScannedInvoiceModal({
  sale,
  isOpen,
  onClose,
  settings,
  onOpenReturns,
}: PosScannedInvoiceModalProps) {
  const [printSuccess, setPrintSuccess] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    try {
      printPostedSaleReceipt(sale, { settings });
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 3000);
    } catch {
      // Fallback
    }
  };

  const isCancelled = sale.status === 'cancelled';

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(760px, 95vw)"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>🧾 فاتورة مبيعات: {sale.docNo || `Z-${sale.id}`}</h3>
              <span
                style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  background: isCancelled ? '#fee2e2' : '#dcfce7',
                  color: isCancelled ? '#b91c1c' : '#15803d',
                }}
              >
                {isCancelled ? 'ملغاة' : 'مكتملة'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              تم مسح باركود الفاتورة بنجاح. يمكنك استعراض التفاصيل، إعادة طباعة الإيصال، أو تحويلها لمرتجع.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose} style={{ fontSize: '14px', padding: '4px 10px', minWidth: 'auto' }}>
            ✕
          </Button>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>العميل</div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
              {sale.customerName || 'عميل نقدي'}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>التاريخ والوقت</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
              {sale.date ? formatDate(sale.date) : '—'}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>طريقة الدفع</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
              {paymentLabel((sale.paymentType || 'cash') as 'cash' | 'credit', sale.paymentChannel || 'cash')}
            </div>
          </div>
          <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>الكاشير / الفرع</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
              {sale.createdBy || sale.branchName || '—'}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ padding: '8px 12px' }}>الصنف</th>
                <th style={{ padding: '8px 12px', textAlign: 'center' }}>الكمية</th>
                <th style={{ padding: '8px 12px' }}>السعر</th>
                <th style={{ padding: '8px 12px' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(sale.items || []).map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.offerName ? (
                      <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{item.offerName}</div>
                    ) : null}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    {item.qty} {item.unitName || 'قطعة'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {item.originalPrice && item.originalPrice > item.price ? (
                      <div>
                        <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '11px', marginLeft: '4px' }}>
                          {formatCurrency(item.originalPrice)}
                        </span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    ) : (
                      formatCurrency(item.price)
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
            <div>عدد البنود: <strong>{(sale.items || []).length}</strong></div>
            {Number(sale.discount || 0) > 0 ? (
              <div style={{ color: '#059669' }}>الخصم: <strong>{formatCurrency(sale.discount)}</strong></div>
            ) : null}
            {Number(sale.taxAmount || 0) > 0 ? (
              <div>الضريبة: <strong>{formatCurrency(sale.taxAmount)}</strong></div>
            ) : null}
          </div>
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '6px' }}>الإجمالي النهائي:</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--primary-color, #0284c7)' }}>
              {formatCurrency(sale.total)}
            </strong>
          </div>
        </div>

        {printSuccess ? (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
            ✓ تم إرسال أمر طباعة الإيصال بنجاح!
          </div>
        ) : null}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            إغلاق (Esc)
          </Button>

          {onOpenReturns && !isCancelled ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenReturns(sale)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, borderColor: '#cbd5e1' }}
            >
              <span>🔄</span>
              <span>إنشاء مرتجع لهذه الفاتورة</span>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="primary"
            onClick={handlePrint}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <span>🖨️</span>
            <span>إعادة طباعة الإيصال</span>
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
