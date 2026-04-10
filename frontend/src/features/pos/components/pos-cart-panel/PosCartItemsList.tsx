import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartItemsList({ cart, lastAddedLineKey, onQtyChange, onRemoveItem }: Pick<PosCartPanelProps, 'cart' | 'lastAddedLineKey' | 'onQtyChange' | 'onRemoveItem'>) {
  if (!cart.length) {
    return <div className="surface-note pos-compact-empty">السلة فارغة الآن. أضف صنفًا أو استرجع فاتورة معلقة.</div>;
  }

  return (
    <div className="list-stack pos-cart-list pos-cart-list-premium">
      {cart.map((item) => {
        const reachesLowStock = (Number(item.currentStock || 0) - (Number(item.qty || 0) * Number(item.unitMultiplier || 1))) <= Number(item.minStock || 0);
        return (
          <div className={`list-row stacked-row pos-cart-row ${lastAddedLineKey === item.lineKey ? 'pos-cart-row-highlight' : ''}`.trim()} key={item.lineKey}>
            <div className="pos-cart-copy">
              <div className="pos-cart-title-row"><strong>{item.name}</strong><span className="status-badge">{item.priceType === 'wholesale' ? 'جملة' : 'قطاعي'}</span></div>
              <div className="muted small">{item.unitName} · متاح {item.stockLimit} · السعر {formatCurrency(item.price)}</div>
              {reachesLowStock ? <div className="warning-box" style={{ marginTop: 6 }}>بعد إتمام البيع سيصل هذا الصنف إلى حد إعادة الطلب.</div> : null}
            </div>
            <div className="pos-cart-controls">
              <input type="number" min={1} max={item.stockLimit} value={item.qty} onChange={(event) => onQtyChange(item.lineKey, Number(event.target.value || 1))} />
              <div className="strong-amount">{formatCurrency(item.qty * item.price)}</div>
              <Button type="button" variant="secondary" onClick={() => onRemoveItem(item.lineKey)}>حذف</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
