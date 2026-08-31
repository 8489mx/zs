import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { formatCurrency } from '@/lib/format';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { FileTextIcon, TagIcon, SmartphoneIcon } from '@/shared/components/icons/AppIcons';
import type { PosCartPanelProps } from './posCartPanel.types';

const PosCartItemRow = memo(function PosCartItemRow({
  item,
  index,
  isSelected,
  isRecent,
  allowItemNotes,
  allowItemModifiers,
  onSelectLine,
  onEditProduct,
  onItemNoteChange,
  onItemModifiersClick,
  onQtyChange,
  onChangeLineQtyByDelta,
  onRemoveItem
}: any) {
  const modifiersTotal = (item.modifiers || []).reduce((sum: any, mod: any) => sum + Number(mod.price || 0), 0);
  const lineTotal = item.qty * (item.price + modifiersTotal);
  const itemCode = String(item.itemCode || '').trim();
  const isWeightedLine = item.isWeighted === true;
  const minQty = isWeightedLine ? 0.001 : 1;
  const inputStep = isWeightedLine ? 0.001 : 1;
  const qtyLength = String(item.qty ?? 1).length;
  const dynamicInputWidth = `${Math.max(30, qtyLength * 11 + 16)}px`;

  return (
    <div
      className={`list-row stacked-row pos-cart-row pos-cart-row-upgraded pos-cart-grid-row ${index % 2 === 0 ? 'pos-cart-row-odd' : 'pos-cart-row-even'} ${isSelected ? 'pos-cart-row-selected' : ''} ${isRecent ? 'pos-cart-row-highlight' : ''}`.trim()}
      key={item.lineKey}
      onClick={() => onSelectLine(item.lineKey)}
    >
      <div className="pos-cart-col pos-cart-col-index" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span className="pos-cart-index-badge">{index + 1}</span>
      </div>

      <div
        className="pos-cart-col pos-cart-col-product"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditProduct?.(item.productId);
        }}
        style={{ cursor: 'pointer' }}
        title={itemCode ? `${item.name} - #${itemCode} (انقر مرتين للتعديل)` : `${item.name} (انقر مرتين للتعديل)`}
      >
        <div className="pos-cart-product-inline">
          <strong className="pos-cart-product-name">{item.name}</strong>
          {itemCode ? <span className="pos-cart-product-code">#{itemCode}</span> : null}
          {!item.notes && allowItemNotes && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center', color: '#6b7280' }}
              title="إضافة ملاحظة على الصنف"
              onClick={(e) => {
                e.stopPropagation();
                const newNotes = window.prompt('ملاحظات الصنف:', '');
                if (newNotes !== null) {
                  onItemNoteChange(item.lineKey, newNotes);
                }
              }}
            >
              <FileTextIcon size={14} />
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
          <div style={{ fontSize: '0.74rem', color: '#047857', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', marginTop: '2px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <TagIcon size={12} color="#059669" /> {item.offerName}
            {item.offerDiscount && item.offerDiscount > 0 ? (
              <span style={{ color: '#065f46', fontWeight: 700 }}> (وفرت {formatCurrency(item.offerDiscount * item.qty)})</span>
            ) : null}
          </div>
        )}
        {item.serials && item.serials.length > 0 && (
          <div style={{ fontSize: '0.72rem', color: '#7e22ce', background: '#faf5ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e9d5ff', marginTop: '3px', direction: 'ltr', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
            <strong>{item.serials.join(', ')}</strong> :IMEI <SmartphoneIcon size={12} color="#7e22ce" />
          </div>
        )}
        {onItemModifiersClick && allowItemModifiers && (
          <button
            type="button"
            style={{ fontSize: '0.75rem', color: '#170c5c', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 6px', marginTop: '4px', cursor: 'pointer', opacity: isSelected ? 1 : 0.6 }}
            onClick={(e) => {
              e.stopPropagation();
              onItemModifiersClick(item.lineKey);
            }}
          >
            + إضافات
          </button>
        )}
      </div>

      <div className="pos-cart-col pos-cart-col-qty" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="pos-cart-qty-shell" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', width: 'auto' }}>
          <button
            type="button"
            className="pos-cart-qty-btn"
            style={{ height: '26px', minHeight: '26px', width: '26px', minWidth: '26px', fontSize: '1.05rem', padding: 0 }}
            aria-label={`زيادة كمية ${item.name}`}
            onFocus={() => onSelectLine(item.lineKey)}
            onClick={(event) => {
              event.stopPropagation();
              if (onChangeLineQtyByDelta) {
                onChangeLineQtyByDelta(item.lineKey, 1);
              } else {
                onQtyChange(item.lineKey, Math.min(Number(item.stockLimit || item.qty + 1), Number(item.qty || minQty) + 1));
              }
            }}
          >
            +
          </button>
          <input
            type="number"
            inputMode="decimal"
            aria-label="الكمية"
            dir="ltr"
            style={{
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              width: dynamicInputWidth,
              minWidth: '30px',
              maxWidth: '85px',
              height: '26px',
              minHeight: '26px',
              fontSize: '0.92rem',
              padding: '0 4px',
              boxSizing: 'border-box',
              borderRadius: '6px',
            } as any}
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
            style={{ height: '26px', minHeight: '26px', width: '26px', minWidth: '26px', fontSize: '1.05rem', padding: 0 }}
            aria-label={`تقليل كمية ${item.name}`}
            onFocus={() => onSelectLine(item.lineKey)}
            onClick={(event) => {
              event.stopPropagation();
              if (onChangeLineQtyByDelta) {
                onChangeLineQtyByDelta(item.lineKey, -1);
              } else {
                onQtyChange(item.lineKey, Math.max(minQty, Number(item.qty || minQty) - 1));
              }
            }}
          >
            −
          </button>
        </div>
      </div>

      <div className="pos-cart-col pos-cart-col-price" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
        {item.originalPrice && item.originalPrice > item.price ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.74rem', lineHeight: 1 }}>
              {formatCurrency(item.originalPrice)}
            </span>
            <strong className="pos-cart-number" style={{ color: '#15803d', textAlign: 'center' }}>{formatCurrency(item.price)}</strong>
          </div>
        ) : (
          <strong className="pos-cart-number" style={{ textAlign: 'center' }}>{formatCurrency(item.price)}</strong>
        )}
      </div>

      <div className="pos-cart-col pos-cart-col-total" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', width: '100%' }}>
        <strong className="pos-cart-number pos-cart-number-total" style={{ textAlign: 'center' }}>{formatCurrency(lineTotal)}</strong>
      </div>

      <div className="pos-cart-col pos-cart-col-remove" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <button
          type="button"
          className="pos-cart-remove-button"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '26px', minHeight: '26px', width: '26px', minWidth: '26px', padding: 0, borderRadius: '6px' }}
          onFocus={() => onSelectLine(item.lineKey)}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveItem(item.lineKey);
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  );
});

export function PosCartItemsList({ cart, lastAddedLineKey, selectedLineKey, onQtyChange, onItemNoteChange, onItemModifiersClick, onEditProduct, onRemoveItem, onSelectLine, onChangeLineQtyByDelta }: Pick<PosCartPanelProps, 'cart' | 'lastAddedLineKey' | 'selectedLineKey' | 'onQtyChange' | 'onItemNoteChange' | 'onItemModifiersClick' | 'onEditProduct' | 'onRemoveItem' | 'onSelectLine' | 'onChangeLineQtyByDelta'>) {
  const settingsQuery = useSettingsQuery();
  const allowItemNotes = settingsQuery.data?.manufacturingModuleEnabled === true;
  const allowItemModifiers = settingsQuery.data?.restaurantModuleEnabled === true;

  const containerRef = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [cart.length]); // Re-attach if cart toggles between empty/list

  const handleSelectLine = useCallback((lineKey: string) => onSelectLine(lineKey), [onSelectLine]);
  const handleEditProduct = useCallback((productId: string) => onEditProduct?.(productId), [onEditProduct]);
  const handleItemNoteChange = useCallback((lineKey: string, note: string) => onItemNoteChange(lineKey, note), [onItemNoteChange]);
  const handleItemModifiersClick = useCallback((lineKey: string) => onItemModifiersClick?.(lineKey), [onItemModifiersClick]);
  const handleQtyChange = useCallback((lineKey: string, qty: number) => onQtyChange(lineKey, qty), [onQtyChange]);
  const handleChangeLineQtyByDelta = useCallback((lineKey: string, delta: number) => onChangeLineQtyByDelta?.(lineKey, delta), [onChangeLineQtyByDelta]);
  const handleRemoveItem = useCallback((lineKey: string) => onRemoveItem(lineKey), [onRemoveItem]);

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

  let responsiveClass = '';
  if (containerWidth > 0) {
    if (containerWidth < 440) responsiveClass = 'pos-cart-w440';
    else if (containerWidth < 490) responsiveClass = 'pos-cart-w490';
    else if (containerWidth < 530) responsiveClass = 'pos-cart-w530';
    else if (containerWidth < 580) responsiveClass = 'pos-cart-w580';
  }

  return (
    <section ref={containerRef} className={`pos-cart-table ${responsiveClass}`.trim()} aria-label="عناصر السلة">
      <div className="pos-cart-table-head" aria-hidden="true">
        <div className="pos-cart-col pos-cart-col-index" style={{ textAlign: 'center' }}>م</div>
        <div className="pos-cart-col pos-cart-col-product">الصنف</div>
        <div className="pos-cart-col pos-cart-col-qty" style={{ textAlign: 'center' }}>الكمية</div>
        <div className="pos-cart-col pos-cart-col-price" style={{ textAlign: 'center' }}>السعر</div>
        <div className="pos-cart-col pos-cart-col-total" style={{ textAlign: 'center' }}>الإجمالي</div>
        <div className="pos-cart-col pos-cart-col-remove" style={{ textAlign: 'center' }}>حذف</div>
      </div>

      <div className="list-stack pos-cart-list pos-cart-list-premium pos-cart-list-upgraded pos-cart-table-body">
        {cart.map((item, index) => {
          const isSelected = selectedLineKey === item.lineKey;
          const isRecent = lastAddedLineKey === item.lineKey;

          return (
            <PosCartItemRow
              key={item.lineKey}
              item={item}
              index={index}
              isSelected={isSelected}
              isRecent={isRecent}
              allowItemNotes={allowItemNotes}
              allowItemModifiers={allowItemModifiers}
              onSelectLine={handleSelectLine}
              onEditProduct={handleEditProduct}
              onItemNoteChange={handleItemNoteChange}
              onItemModifiersClick={handleItemModifiersClick}
              onQtyChange={handleQtyChange}
              onChangeLineQtyByDelta={handleChangeLineQtyByDelta}
              onRemoveItem={handleRemoveItem}
            />
          );
        })}
      </div>
    </section>
  );
}
