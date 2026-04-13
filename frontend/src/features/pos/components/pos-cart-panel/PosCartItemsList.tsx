import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartItemsList({ cart, lastAddedLineKey, selectedLineKey, onQtyChange, onRemoveItem, onSelectLine }: Pick<PosCartPanelProps, 'cart' | 'lastAddedLineKey' | 'selectedLineKey' | 'onQtyChange' | 'onRemoveItem' | 'onSelectLine'>) {
  if (!cart.length) {
    return <div className="surface-note pos-compact-empty">السلة فارغة الآن. أضف صنفًا أو استرجع فاتورة معلقة.</div>;
  }

  return (
    <div className="list-stack pos-cart-list pos-cart-list-premium">
      {cart.map((item) => {
        const reachesLowStock = (Number(item.currentStock || 0) - (Number(item.qty || 0) * Number(item.unitMultiplier || 1))) <= Number(item.minStock || 0);
        const isSelected = selectedLineKey === item.lineKey;
        const isRecent = lastAddedLineKey === item.lineKey;
        return (
          <div
            className={`list-row stacked-row pos-cart-row ${isSelected ? 'pos-cart-row-selected' : ''} ${isRecent ? 'pos-cart-row-highlight' : ''}`.trim()}
            key={item.lineKey}
            onClick={() => onSelectLine(item.lineKey)}
          >
            <div className="pos-cart-copy">
              <div className="pos-cart-title-row">
                <strong>{item.name}</strong>
                <div className="actions compact-actions pos-cart-badges-inline">
                  {isSelected ? <span className="status-badge pos-cart-selected-badge">محدد</span> : null}
                  <span className="status-badge">{item.priceType === 'wholesale' ? 'جملة' : 'قطاعي'}</span>
                </div>
              </div>
              <div className="muted small">{item.unitName} · متاح {item.stockLimit} · السعر {formatCurrency(item.price)}</div>
              {reachesLowStock ? <div className="warning-box" style={{ marginTop: 6 }}>بعد إتمام البيع سيصل هذا الصنف إلى حد إعادة الطلب.</div> : null}
            </div>
            <div className="pos-cart-controls">
              <input type="number" min={1} max={item.stockLimit} value={item.qty} onFocus={() => onSelectLine(item.lineKey)} onChange={(event) => onQtyChange(item.lineKey, Number(event.target.value || 1))} />
              <div className="strong-amount">{formatCurrency(item.qty * item.price)}</div>
              <Button type="button" variant="secondary" onFocus={() => onSelectLine(item.lineKey)} onClick={() => onRemoveItem(item.lineKey)}>حذف</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
