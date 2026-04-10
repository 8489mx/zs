import { formatCurrency } from '@/lib/format';

export function PurchaseTotals({ subTotal, discount, taxAmount, total }: { subTotal: number; discount: number; taxAmount: number; total: number }) {
  return (
    <div className="stats-grid compact-grid" style={{ gridColumn: '1 / -1' }}>
      <div className="stat-card"><span>الإجمالي قبل الضريبة</span><strong>{formatCurrency(subTotal)}</strong></div>
      <div className="stat-card"><span>الخصم</span><strong>{formatCurrency(discount)}</strong></div>
      <div className="stat-card"><span>الضريبة</span><strong>{formatCurrency(taxAmount)}</strong></div>
      <div className="stat-card"><span>إجمالي الفاتورة</span><strong>{formatCurrency(total)}</strong></div>
    </div>
  );
}
