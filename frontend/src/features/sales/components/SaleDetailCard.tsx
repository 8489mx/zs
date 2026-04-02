import type { Sale } from '@/types/domain';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/format';

interface SaleDetailCardProps {
  sale?: Sale;
  isLoading?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onPrint?: () => void;
}

export function SaleDetailCard({ sale, isLoading = false, onEdit, onCancel, onPrint }: SaleDetailCardProps) {
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
