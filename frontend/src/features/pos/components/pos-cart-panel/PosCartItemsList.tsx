import { formatCurrency } from '@/lib/format';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartItemsList({ cart, lastAddedLineKey, selectedLineKey, onQtyChange, onRemoveItem, onSelectLine }: Pick<PosCartPanelProps, 'cart' | 'lastAddedLineKey' | 'selectedLineKey' | 'onQtyChange' | 'onRemoveItem' | 'onSelectLine'>) {
  if (!cart.length) {
    return <div className="pos-cart-empty-state" aria-hidden="true" />;
  }

  return (
    <section className="pos-cart-table" aria-label="عناصر السلة">
      <div className="pos-cart-table-head" aria-hidden="true">
        <div className="pos-cart-col pos-cart-col-index">م</div>
        <div className="pos-cart-col pos-cart-col-product">الصنف</div>
        <div className="pos-cart-col pos-cart-col-qty">الكمية</div>
        <div className="pos-cart-col pos-cart-col-price">السعر</div>
        <div className="pos-cart-col pos-cart-col-total">الإجمالي</div>
        <div className="pos-cart-col pos-cart-col-remove">حذف</div>
      </div>

      <div className="list-stack pos-cart-list pos-cart-list-premium pos-cart-list-upgraded pos-cart-table-body">
        {cart.map((item, index) => {
          const isSelected = selectedLineKey === item.lineKey;
          const isRecent = lastAddedLineKey === item.lineKey;
          const lineTotal = item.qty * item.price;
          const itemCode = String(item.itemCode || '').trim();

          return (
            <div
              className={`list-row stacked-row pos-cart-row pos-cart-row-upgraded pos-cart-grid-row ${isSelected ? 'pos-cart-row-selected' : ''} ${isRecent ? 'pos-cart-row-highlight' : ''}`.trim()}
              key={item.lineKey}
              onClick={() => onSelectLine(item.lineKey)}
            >
              <div className="pos-cart-col pos-cart-col-index">
                <span className="pos-cart-index-badge">{index + 1}</span>
              </div>

              <div className="pos-cart-col pos-cart-col-product">
                <div className="pos-cart-product-inline" title={itemCode ? `${item.name} - ${itemCode}` : item.name}>
                  <strong className="pos-cart-product-name">{item.name}</strong>
                  {itemCode ? <span className="pos-cart-product-code">{itemCode}</span> : null}
                </div>
              </div>

              <div className="pos-cart-col pos-cart-col-qty">
                <div className="pos-cart-qty-shell">
                  <button
                    type="button"
                    className="pos-cart-qty-btn"
                    aria-label={`زيادة كمية ${item.name}`}
                    onFocus={() => onSelectLine(item.lineKey)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onQtyChange(item.lineKey, Math.min(Number(item.stockLimit || item.qty + 1), Number(item.qty || 1) + 1));
                    }}
                  >
                    +
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={item.stockLimit}
                    value={item.qty}
                    onFocus={() => onSelectLine(item.lineKey)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onQtyChange(item.lineKey, Number(event.target.value || 1))}
                  />
                  <button
                    type="button"
                    className="pos-cart-qty-btn"
                    aria-label={`تقليل كمية ${item.name}`}
                    onFocus={() => onSelectLine(item.lineKey)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onQtyChange(item.lineKey, Math.max(1, Number(item.qty || 1) - 1));
                    }}
                  >
                    −
                  </button>
                </div>
              </div>

              <div className="pos-cart-col pos-cart-col-price">
                <strong className="pos-cart-number">{formatCurrency(item.price)}</strong>
              </div>

              <div className="pos-cart-col pos-cart-col-total">
                <strong className="pos-cart-number pos-cart-number-total">{formatCurrency(lineTotal)}</strong>
              </div>

              <div className="pos-cart-col pos-cart-col-remove">
                <button
                  type="button"
                  className="pos-cart-remove-button"
                  onFocus={() => onSelectLine(item.lineKey)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveItem(item.lineKey);
                  }}
                >
                  حذف
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
