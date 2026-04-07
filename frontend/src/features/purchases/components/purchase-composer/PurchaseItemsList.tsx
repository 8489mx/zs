import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PurchaseDraftItem } from '@/features/purchases/contracts';

export function PurchaseItemsList({ items, isPending, onRemoveItem }: { items: PurchaseDraftItem[]; isPending: boolean; onRemoveItem: (productId: string, unitName: string) => void }) {
  return (
    <div className="list-stack" style={{ gridColumn: '1 / -1' }}>
      {items.length ? items.map((item) => (
        <div key={`${item.productId}-${item.unitName}`} className="list-row stacked-row">
          <div>
            <strong>{item.name}</strong>
            <div className="muted small" style={{ marginTop: 4 }}>{item.qty} × {formatCurrency(item.cost)} · {item.unitName}</div>
          </div>
          <div className="text-left">
            <div className="strong-amount">{formatCurrency(item.total)}</div>
            <Button type="button" variant="danger" onClick={() => onRemoveItem(item.productId, item.unitName)} disabled={isPending}>حذف</Button>
          </div>
        </div>
      )) : (
        <div className="empty-state">
          <strong>الفاتورة فارغة</strong>
          <span>أضف الأصناف التي استلمتها قبل الضغط على حفظ فاتورة الشراء.</span>
        </div>
      )}
    </div>
  );
}
