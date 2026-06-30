import type { Purchase } from '@/types/domain';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { PurchasePaymentScheduleCard } from '@/features/purchases/components/PurchasePaymentScheduleCard';

interface PurchaseDetailCardProps {
  purchase?: Purchase;
  isLoading?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
}

import { resolveRequestUrl } from '@/lib/http';

export function PurchaseDetailCard({ purchase, isLoading = false, onEdit, onCancel, onPrint }: PurchaseDetailCardProps) {
  if (isLoading) return <FormSection title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">جاري تحميل تفاصيل الفاتورة...</div></FormSection>;
  if (!purchase) return <FormSection title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">اختر فاتورة من الجدول لعرض التفاصيل.</div></FormSection>;

  return (
    <>
      <FormSection
        className="purchase-detail-card"
        title={`تفاصيل ${purchase.docNo || purchase.id}`}
        actions={purchase.status !== 'cancelled' ? (
          <div className="actions compact-actions" style={{ flexWrap: 'nowrap' }}>
            {onPrint ? <Button variant="secondary" onClick={onPrint}>طباعة الفاتورة</Button> : null}
            {onEdit ? <Button variant="secondary" onClick={onEdit}>تعديل الفاتورة</Button> : null}
            {onCancel ? <Button variant="danger" onClick={onCancel}>إلغاء الفاتورة</Button> : null}
          </div>
        ) : <span className="status-badge status-cancelled">ملغاة</span>}
      >
        <div className="stats-grid compact-grid">
          <div className="stat-card"><span>المورد</span><strong>{purchase.supplierName || '—'}</strong></div>
          <div className="stat-card"><span>الحالة</span><strong>{purchase.status || 'draft'}</strong></div>
          <div className="stat-card"><span>الإجمالي</span><strong>{formatCurrency(purchase.total)}</strong></div>
          <div className="stat-card"><span>المدفوع الضمني</span><strong>{purchase.paymentType === 'credit' ? 'آجل' : 'نقدي'}</strong></div>
          <div className="stat-card"><span>التاريخ</span><strong>{formatDate(purchase.date)}</strong></div>
          <div className="stat-card"><span>{SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/الموقع'}</span><strong>{SINGLE_STORE_MODE ? (purchase.locationName || 'المخزن الأساسي') : `${purchase.branchName || '—'} / ${purchase.locationName || '—'}`}</strong></div>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>التكلفة</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((item) => (
                <tr key={item.id || `${item.productId}-${item.unitName}`}>
                  <td>{item.name}</td>
                  <td>{item.unitName || '—'}</td>
                  <td>{item.qty}</td>
                  <td>{formatCurrency(item.cost)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      {purchase.attachments && purchase.attachments.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <FormSection title="المرفقات" className="purchase-detail-card">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {purchase.attachments.map((att: any, idx: number) => {
              const url = resolveRequestUrl(att.fileUrl);
              return (
                <a key={att.id || idx} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', background: 'var(--surface-color)' }}>
                  <span style={{ fontSize: '1.2em' }}>📄</span>
                  <span style={{ fontSize: '0.9em' }}>{att.fileName || `مرفق ${idx + 1}`}</span>
                </a>
              );
            })}
          </div>
          </FormSection>
        </div>
      )}

      <PurchasePaymentScheduleCard purchase={purchase} />
    </>
  );
}
