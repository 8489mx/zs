import type { Purchase } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { FileTextIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { PurchasePaymentScheduleCard } from '@/features/purchases/components/PurchasePaymentScheduleCard';
import { resolveRequestUrl } from '@/lib/http';

interface PurchaseDetailCardProps {
  purchase?: Purchase;
  isLoading?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
}

export function PurchaseDetailCard({ purchase, isLoading = false, onEdit, onCancel, onPrint }: PurchaseDetailCardProps) {
  if (isLoading) return <FormSection title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">جاري تحميل تفاصيل الفاتورة...</div></FormSection>;
  if (!purchase) return <FormSection title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">اختر فاتورة من الجدول لعرض التفاصيل.</div></FormSection>;

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
        <div>
          <span className={`status-badge ${purchase.status === 'cancelled' ? 'status-cancelled' : 'status-posted'}`} style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 700,
            background: purchase.status === 'cancelled' ? '#fee2e2' : '#dcfce7',
            color: purchase.status === 'cancelled' ? '#991b1b' : '#166534',
          }}>
            {purchase.status === 'posted' ? 'مرحلة' : purchase.status === 'cancelled' ? 'ملغاة' : purchase.status || 'مسودة'}
          </span>
        </div>
      </div>

      {/* 2. Action Buttons Toolbar (Responsive Grid on Mobile) */}
      {purchase.status !== 'cancelled' && (
        <div className="invoice-detail-actions-bar" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
          marginBottom: '14px',
        }}>
          {onPrint ? <Button variant="secondary" style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center' }} onClick={onPrint}>طباعة الفاتورة</Button> : null}
          {onEdit ? <Button variant="secondary" style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center' }} onClick={onEdit}>تعديل الفاتورة</Button> : null}
          {onCancel ? <Button variant="danger" style={{ fontSize: '12.5px', padding: '7px 8px', justifyContent: 'center' }} onClick={onCancel}>إلغاء الفاتورة</Button> : null}
        </div>
      )}

      {/* 3. Stats Grid */}
      <div className="stats-grid compact-grid invoice-detail-summary-grid">
        <div className="stat-card"><span>المورد</span><strong>{purchase.supplierName || '—'}</strong></div>
        <div className="stat-card"><span>الحالة</span><strong className="status-chip">{purchase.status === 'posted' ? 'مرحلة' : purchase.status === 'cancelled' ? 'ملغاة' : purchase.status === 'draft' ? 'مسودة' : (purchase.status || 'مسودة')}</strong></div>
        <div className="stat-card"><span>الإجمالي</span><strong style={{ color: 'var(--primary, #0f172a)' }}>{formatCurrency(purchase.total)}</strong></div>
        <div className="stat-card"><span>المدفوع الضمني</span><strong>{purchase.paymentType === 'credit' ? 'آجل' : 'نقدي'}</strong></div>
        <div className="stat-card"><span>التاريخ</span><strong style={{ fontSize: '11.5px' }}><bdi dir="ltr">{formatDate(purchase.date)}</bdi></strong></div>
        <div className="stat-card"><span>{SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/الموقع'}</span><strong>{SINGLE_STORE_MODE ? (purchase.locationName || 'المخزن الأساسي') : `${purchase.branchName || '—'} / ${purchase.locationName || '—'}`}</strong></div>
      </div>
        <div className="table-wrap invoice-desktop-table" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>التكلفة</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((item) => (
                <tr key={item.id || `${item.productId}-${item.unitName}`}>
                  <td>{item.name}</td>
                  <td>{item.unitName === 'Piece' || item.unitName === 'piece' ? 'قطعة' : item.unitName || '—'}</td>
                  <td>{item.qty}</td>
                  <td>{formatCurrency(item.cost)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Smart Item Cards for Purchases */}
        <div className="invoice-mobile-items-list" style={{ marginTop: 12 }}>
          <h5 className="invoice-mobile-items-title">بنود الفاتورة ({(purchase.items || []).length})</h5>
          <div className="invoice-mobile-items-grid">
            {(purchase.items || []).map((item, idx) => (
              <div key={item.id || `${item.productId}-${idx}`} className="invoice-mobile-item-card">
                <div className="mobile-item-card-top">
                  <strong className="mobile-item-name">{item.name}</strong>
                  <span className="mobile-item-total">{formatCurrency(item.total)}</span>
                </div>
                <div className="mobile-item-card-bottom">
                  <span className="mobile-item-unit">{item.unitName === 'Piece' || item.unitName === 'piece' ? 'قطعة' : item.unitName || 'قطعة'}</span>
                  <span className="mobile-item-calc">
                    {item.qty} × {formatCurrency(item.cost)}
                  </span>
                </div>
              </div>
            ))}
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
    </div>
  );
}
