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

      <PurchasePaymentScheduleCard purchase={purchase} />
    </>
  );
}
