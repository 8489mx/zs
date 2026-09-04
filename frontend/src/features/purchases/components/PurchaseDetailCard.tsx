import { useState } from 'react';
import type { Purchase } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { FileTextIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { PurchasePaymentScheduleCard } from '@/features/purchases/components/PurchasePaymentScheduleCard';
import { resolveRequestUrl } from '@/lib/http';
import { purchasesApi } from '@/features/purchases/api/purchases.api';

interface PurchaseDetailCardProps {
  purchase?: Purchase;
  isLoading?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
}

export function PurchaseDetailCard({ purchase, isLoading = false, onEdit, onCancel, onPrint, onRefresh }: PurchaseDetailCardProps) {
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingItems, setReceivingItems] = useState<{ [itemId: string]: number }>({});
  const [isSubmittingGrn, setIsSubmittingGrn] = useState(false);
  const [grnError, setGrnError] = useState('');

  if (isLoading) return <FormSection title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">جاري تحميل تفاصيل الفاتورة...</div></FormSection>;
  if (!purchase) return <FormSection title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">اختر فاتورة من الجدول لعرض التفاصيل.</div></FormSection>;

  const openReceiveModal = () => {
    const initial: { [itemId: string]: number } = {};
    (purchase.items || []).forEach((item) => {
      const remaining = Math.max(0, Number(item.qty || 0) - Number(item.receivedQty || 0));
      initial[item.id] = remaining;
    });
    setReceivingItems(initial);
    setGrnError('');
    setShowReceiveModal(true);
  };

  const handleConfirmGrn = async () => {
    try {
      setIsSubmittingGrn(true);
      setGrnError('');
      const payload = Object.entries(receivingItems).map(([itemId, qty]) => ({
        itemId: Number(itemId),
        receivedQty: Number(qty) || 0,
      })).filter((x) => x.receivedQty > 0);

      if (payload.length === 0) {
        setGrnError('الرجاء إدخال كميات صالحة للاستلام');
        setIsSubmittingGrn(false);
        return;
      }

      await purchasesApi.receiveGoods(purchase.id, payload);
      setShowReceiveModal(false);
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setGrnError(err?.message || 'تعذر إتمام الاستلام المخزني');
    } finally {
      setIsSubmittingGrn(false);
    }
  };

  const isMatched = purchase.matchedStatus === 'matched' || (!purchase.matchedStatus && purchase.status === 'posted');
  const isCancelled = purchase.status === 'cancelled';
  const isGrn = purchase.lifecycleStatus === 'grn_received';


  return (
    <div className="purchase-detail-card-shell" dir="rtl">
      {/* 1. Header with Title and Status */}
      <div className="invoice-detail-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '12px',
        paddingBottom: '10px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '4px', height: '18px', background: '#0284c7', borderRadius: '2px' }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              {`تفاصيل ${purchase.docNo || purchase.id}`}
            </h3>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span className={`status-badge ${isCancelled ? 'status-cancelled' : 'status-posted'}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: isCancelled ? '#fee2e2' : '#dcfce7',
            color: isCancelled ? '#991b1b' : '#166534',
          }}>
            {purchase.status === 'posted' ? 'مرحلة' : isCancelled ? 'ملغاة' : 'مسودة'}
          </span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: isMatched ? '#dcfce7' : isGrn ? '#e0f2fe' : '#fef3c7',
            color: isMatched ? '#166534' : isGrn ? '#0369a1' : '#92400e',
          }}>
            {isMatched ? 'مطابقة ثلاثية كاملة' : isGrn ? 'استلام جزئي (GRN)' : 'أمر شراء (PO) معلق'}
          </span>
        </div>
      </div>

      {/* 3-Way Matching Workflow Stepper */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#0284c7',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
          }}>1</span>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>أمر الشراء (PO)</span>
        </div>
        <div style={{ width: '30px', height: '2px', background: '#cbd5e1' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: isGrn || isMatched ? '#0284c7' : '#cbd5e1',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
          }}>2</span>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: isGrn || isMatched ? '#0f172a' : '#64748b' }}>الاستلام المخزني (GRN)</span>
        </div>
        <div style={{ width: '30px', height: '2px', background: '#cbd5e1' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: isMatched ? '#16a34a' : '#cbd5e1',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
          }}>3</span>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: isMatched ? '#166534' : '#64748b' }}>المطابقة المحاسبية والترحيل</span>
        </div>
      </div>

      {/* 2. Action Buttons Toolbar */}
      {!isCancelled && (
        <div className="invoice-detail-actions-bar" style={{
          display: 'grid',
          gridTemplateColumns: !isMatched ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
          marginBottom: '14px',
        }}>
          {!isMatched && (
            <Button
              variant="primary"
              style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center', background: '#059669', borderColor: '#059669' }}
              onClick={openReceiveModal}
            >
              📦 استلام بضاعة (GRN)
            </Button>
          )}
          {onPrint ? <Button variant="secondary" style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center' }} onClick={onPrint}>طباعة الفاتورة</Button> : null}
          {onEdit ? <Button variant="secondary" style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center' }} onClick={onEdit}>تعديل الفاتورة</Button> : null}
          {onCancel ? <Button variant="danger" style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center' }} onClick={onCancel}>إلغاء الفاتورة</Button> : null}
        </div>
      )}

      {/* 3. Stats Grid */}
      <div className="stats-grid compact-grid invoice-detail-summary-grid">
        <div className="stat-card"><span>المورد</span><strong>{purchase.supplierName || '—'}</strong></div>
        <div className="stat-card"><span>المطابقة</span><strong className="status-chip">{isMatched ? 'مطابق تماماً' : isGrn ? 'استلام جزئي' : 'بانتظار الاستلام'}</strong></div>
        <div className="stat-card"><span>الإجمالي</span><strong style={{ color: 'var(--primary, #0f172a)' }}>{formatCurrency(purchase.total)}</strong></div>
        <div className="stat-card"><span>نوع الدفع</span><strong>{purchase.paymentType === 'credit' ? 'آجل' : 'نقدي'}</strong></div>
        <div className="stat-card"><span>التاريخ</span><strong style={{ fontSize: '11.5px' }}><bdi dir="ltr">{formatDate(purchase.date)}</bdi></strong></div>
        <div className="stat-card"><span>{SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/الموقع'}</span><strong>{SINGLE_STORE_MODE ? (purchase.locationName || 'المخزن الأساسي') : `${purchase.branchName || '—'} / ${purchase.locationName || '—'}`}</strong></div>
      </div>

      <div className="table-wrap invoice-desktop-table" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr>
              <th>الصنف</th>
              <th>الوحدة</th>
              <th>المطلوب (PO)</th>
              <th>المستلم (GRN)</th>
              <th>المتبقي</th>
              <th>التكلفة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(purchase.items || []).map((item) => {
              const ordered = Number(item.qty || 0);
              const received = Number(item.receivedQty || 0);
              const remaining = Math.max(0, ordered - received);
              return (
                <tr key={item.id || `${item.productId}-${item.unitName}`}>
                  <td>{item.name}</td>
                  <td>{item.unitName === 'Piece' || item.unitName === 'piece' ? 'قطعة' : item.unitName || '—'}</td>
                  <td><strong>{ordered}</strong></td>
                  <td style={{ color: received >= ordered ? '#166534' : '#b45309', fontWeight: 700 }}>
                    {received}
                  </td>
                  <td style={{ color: remaining > 0 ? '#dc2626' : '#64748b' }}>
                    {remaining}
                  </td>
                  <td>{formatCurrency(item.cost)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Smart Item Cards for Purchases */}
      <div className="invoice-mobile-items-list" style={{ marginTop: 12 }}>
        <h5 className="invoice-mobile-items-title">بنود الفاتورة ({(purchase.items || []).length})</h5>
        <div className="invoice-mobile-items-grid">
          {(purchase.items || []).map((item, idx) => {
            const ordered = Number(item.qty || 0);
            const received = Number(item.receivedQty || 0);
            return (
              <div key={item.id || `${item.productId}-${idx}`} className="invoice-mobile-item-card">
                <div className="mobile-item-card-top">
                  <strong className="mobile-item-name">{item.name}</strong>
                  <span className="mobile-item-total">{formatCurrency(item.total)}</span>
                </div>
                <div className="mobile-item-card-bottom">
                  <span className="mobile-item-unit">{item.unitName || 'قطعة'}</span>
                  <span className="mobile-item-calc">
                    مطلوب: {ordered} | مستلم: {received}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {purchase.attachments && purchase.attachments.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <FormSection title="المرفقات" className="purchase-detail-card">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {purchase.attachments.map((att: any, idx: number) => {
              const url = resolveRequestUrl(att.fileUrl);
              return (
                <a key={att.id || idx} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', background: 'var(--surface-color)' }}>
                  <FileTextIcon size={18} color="#64748b" />
                  <span style={{ fontSize: '0.9em' }}>{att.fileName || `مرفق ${idx + 1}`}</span>
                </a>
              );
            })}
          </div>
          </FormSection>
        </div>
      )}

      <PurchasePaymentScheduleCard purchase={purchase} />

      {/* Interactive Modal for Goods Receipt (GRN) */}
      {showReceiveModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '16px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              📦 إثبات استلام بضاعة مخزني (GRN)
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
              حدد الكميات المستلمة فعلياً في المخزن لتحديث الأرصدة والمخزون وإكمال المطابقة الثلاثية.
            </p>

            {grnError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                {grnError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {(purchase.items || []).map((item) => {
                const ordered = Number(item.qty || 0);
                const currentReceived = Number(item.receivedQty || 0);
                const remaining = Math.max(0, ordered - currentReceived);
                return (
                  <div key={item.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    background: '#f8fafc',
                  }}>
                    <div>
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{item.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        المطلوب: {ordered} | المستلم سابقاً: {currentReceived} | المتبقي: {remaining}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>استلام:</span>
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={receivingItems[item.id] ?? remaining}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReceivingItems((prev) => ({ ...prev, [item.id]: val }));
                        }}
                        style={{
                          width: '75px',
                          padding: '6px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setShowReceiveModal(false)} disabled={isSubmittingGrn}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmGrn}
                disabled={isSubmittingGrn}
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                {isSubmittingGrn ? 'جاري الاستلام والتحديث...' : 'تأكيد الاستلام المخزني'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
