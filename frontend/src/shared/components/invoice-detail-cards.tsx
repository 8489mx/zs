import type { Purchase, Sale } from '@/types/domain';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

export function SharedSaleDetailCard({ sale, isLoading = false, onEdit, onCancel, onPrint }: { sale?: Sale; isLoading?: boolean; onEdit?: () => void; onCancel?: () => void; onPrint?: () => void; }) {
  if (isLoading) return <Card title="تفاصيل الفاتورة"><div className="muted">جاري تحميل تفاصيل الفاتورة...</div></Card>;
  if (!sale) return <Card title="تفاصيل الفاتورة"><div className="muted">اختر فاتورة من الجدول لعرض التفاصيل.</div></Card>;

  return (
    <Card
      title={`تفاصيل ${sale.docNo || sale.id}`}
      actions={sale.status !== 'cancelled' ? (
        <div className="actions">
          {onPrint ? <Button variant="secondary" onClick={onPrint}>طباعة</Button> : null}
          {onEdit ? <Button variant="secondary" onClick={onEdit}>تعديل الفاتورة</Button> : null}
          {onCancel ? <Button variant="danger" onClick={onCancel}>إلغاء الفاتورة</Button> : null}
        </div>
      ) : <span className="status-badge status-cancelled">ملغاة</span>}
    >
      <div className="stats-grid compact-grid">
        <div className="stat-card"><span>العميل</span><strong>{sale.customerName || 'عميل نقدي'}</strong></div>
        <div className="stat-card"><span>الحالة</span><strong>{sale.status || 'draft'}</strong></div>
        <div className="stat-card"><span>الإجمالي</span><strong>{formatCurrency(sale.total)}</strong></div>
        <div className="stat-card"><span>التاريخ</span><strong>{formatDate(sale.date)}</strong></div>
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead>
            <tr><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item) => (
              <tr key={item.id || `${item.productId}-${item.unitName}`}>
                <td>{item.name}</td>
                <td>{item.unitName || '—'}</td>
                <td>{item.qty}</td>
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SharedPurchaseDetailCard({ purchase, isLoading = false, onEdit, onCancel, onPrint }: { purchase?: Purchase; isLoading?: boolean; onEdit?: () => void; onCancel?: () => void; onPrint?: () => void; }) {
  if (isLoading) return <Card title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">جاري تحميل تفاصيل الفاتورة...</div></Card>;
  if (!purchase) return <Card title="تفاصيل الفاتورة" className="purchase-detail-card"><div className="muted">اختر فاتورة من الجدول لعرض التفاصيل.</div></Card>;

  return (
    <Card
      className="purchase-detail-card"
      title={`تفاصيل ${purchase.docNo || purchase.id}`}
      actions={purchase.status !== 'cancelled' ? (
        <div className="actions compact-actions">
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
        <div className="stat-card"><span>{SINGLE_STORE_MODE ? 'المخزن' : 'الفرع/المخزن'}</span><strong>{SINGLE_STORE_MODE ? (purchase.locationName || 'المخزن الأساسي') : `${purchase.branchName || '—'} / ${purchase.locationName || '—'}`}</strong></div>
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
    </Card>
  );
}
