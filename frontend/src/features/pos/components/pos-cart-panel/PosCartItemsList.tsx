import { formatCurrency } from '@/lib/format';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import type { PosCartPanelProps } from './posCartPanel.types';

export function PosCartItemsList({ cart, lastAddedLineKey, selectedLineKey, onQtyChange, onItemNoteChange, onItemModifiersClick, onRemoveItem, onSelectLine }: Pick<PosCartPanelProps, 'cart' | 'lastAddedLineKey' | 'selectedLineKey' | 'onQtyChange' | 'onItemNoteChange' | 'onItemModifiersClick' | 'onRemoveItem' | 'onSelectLine'>) {
  const settingsQuery = useSettingsQuery();
  const allowItemNotes = settingsQuery.data?.manufacturingModuleEnabled === true;
  const allowItemModifiers = settingsQuery.data?.manufacturingModuleEnabled === true;

  if (!cart.length) {
    return (
      <section className="pos-cart-empty-state pos-cart-empty-state-guided" aria-label="السلة فارغة">
        <div className="pos-cart-empty-state-mark" aria-hidden="true">+</div>
        <div className="pos-cart-empty-state-copy">
          <strong>السلة جاهزة لأول صنف</strong>
          <span>اضرب الباركود أو ابحث عن الصنف من لوحة الأصناف، وسيظهر هنا مباشرة مع الكمية والإجمالي.</span>
        </div>
        <div className="pos-cart-empty-hints" aria-label="اختصارات سريعة">
          <span>Enter لإضافة أول نتيجة</span>
          <span>F2 لإنهاء البيع</span>
          <span>F4 لتعليق الفاتورة</span>
        </div>
      </section>
    );
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
          const isWeightedLine = item.isWeighted === true;
          const minQty = isWeightedLine ? 0.001 : 1;
          const inputStep = isWeightedLine ? 0.001 : 1;

          return (
            <div
              className={`list-row stacked-row pos-cart-row pos-cart-row-upgraded pos-cart-grid-row ${index % 2 === 0 ? 'pos-cart-row-odd' : 'pos-cart-row-even'} ${isSelected ? 'pos-cart-row-selected' : ''} ${isRecent ? 'pos-cart-row-highlight' : ''}`.trim()}
              key={item.lineKey}
              onClick={() => onSelectLine(item.lineKey)}
            >
              <div className="pos-cart-col pos-cart-col-index">
                <span className="pos-cart-index-badge">{index + 1}</span>
              </div>

              <div className="pos-cart-col pos-cart-col-product">
                <div className="pos-cart-product-inline" title={itemCode ? `${item.name} - ${itemCode}` : item.name}>
                  <strong className="pos-cart-product-name">{item.name}</strong>
                  {itemCode ? <span className="pos-cart-product-code">#{itemCode}</span> : null}
                  {!item.notes && allowItemNotes && (
                    <button
                      type="button"
                      title="إضافة ملاحظة"
                      style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer', opacity: isSelected ? 1 : 0.4 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newNotes = window.prompt('ملاحظات الصنف:', '');
                        if (newNotes !== null) {
                          onItemNoteChange(item.lineKey, newNotes);
                        }
                      }}
                    >
                      📝
                    </button>
                  )}
                </div>
                {item.notes && allowItemNotes && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px', cursor: 'pointer' }} onClick={(e) => {
                    e.stopPropagation();
                    const newNotes = window.prompt('ملاحظات الصنف:', item.notes || '');
                    if (newNotes !== null) {
                      onItemNoteChange(item.lineKey, newNotes);
                    }
                  }}>
                    {item.notes}
                  </div>
                )}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '2px' }}>
                    {item.modifiers.map((mod: any, i: number) => (
                      <div key={i}>+ {mod.name} {mod.qty > 1 ? `(x${mod.qty})` : ''}</div>
                    ))}
                  </div>
                )}
                {item.offerName && (
                  <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '2px', fontWeight: 500 }}>
                    ✨ {item.offerName}
                  </div>
                )}
                {onItemModifiersClick && allowItemModifiers && (
                  <button
                    type="button"
                    style={{ fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 6px', marginTop: '4px', cursor: 'pointer', opacity: isSelected ? 1 : 0.6 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemModifiersClick(item.lineKey);
                    }}
                  >
                    + إضافات
                  </button>
                )}
              </div>

              <div className="pos-cart-col pos-cart-col-qty">
                <div className="pos-cart-qty-shell" style={{ gridTemplateColumns: '34px max-content 34px' }}>
                  <button
                    type="button"
                    className="pos-cart-qty-btn"
                    aria-label={`زيادة كمية ${item.name}`}
                    onFocus={() => onSelectLine(item.lineKey)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onQtyChange(item.lineKey, Math.min(Number(item.stockLimit || item.qty + 1), Number(item.qty || minQty) + 1));
                    }}
                  >
                    +
                  </button>
                  <input
                    type="number"
                    dir="ltr"
                    style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'center', fieldSizing: 'content', minWidth: '54px' } as any}
                    min={minQty}
                    step={inputStep}
                    max={item.stockLimit}
                    value={item.qty}
                    onFocus={() => onSelectLine(item.lineKey)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onQtyChange(item.lineKey, Number(event.target.value || minQty))}
                  />
                  <button
                    type="button"
                    className="pos-cart-qty-btn"
                    aria-label={`تقليل كمية ${item.name}`}
                    onFocus={() => onSelectLine(item.lineKey)}
                    onClick={(event) => {
                      event.stopPropagation();
                      onQtyChange(item.lineKey, Math.max(minQty, Number(item.qty || minQty) - 1));
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
