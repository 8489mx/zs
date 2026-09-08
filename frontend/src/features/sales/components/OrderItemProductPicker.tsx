import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SearchIcon } from '@/shared/components/icons/AppIcons';
import { matchesArabic } from '@/lib/arabic-normalization';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

interface OrderItemProductPickerProps {
  value: string;
  selectedProductId: number;
  stockOnHand?: number;
  unitName?: string;
  quantity: number;
  products: Product[];
  onChangeText: (text: string) => void;
  onSelectProduct: (product: Product) => void;
}

export function OrderItemProductPicker({
  value,
  selectedProductId,
  stockOnHand,
  unitName,
  quantity,
  products,
  onChangeText,
  onSelectProduct,
}: OrderItemProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const dropdownWidth = Math.max(rect.width, 360);
    let left = rect.right - dropdownWidth;
    if (left < 10) left = 10;
    if (left + dropdownWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - dropdownWidth - 10);
    }

    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(260, Math.max(120, (openUpwards ? spaceAbove : spaceBelow) - 16));

    if (openUpwards) {
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        left,
        width: dropdownWidth,
        maxHeight,
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left,
        width: dropdownWidth,
        maxHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setOpen]);

  const query = value.trim();
  const filtered = useMemo(() => {
    if (!query) {
      return products.slice(0, 15);
    }
    return products
      .filter((p) => {
        if (matchesArabic(p.name, query)) return true;
        if (p.barcode && p.barcode.includes(query)) return true;
        if (p.sku && p.sku.toLowerCase().includes(query.toLowerCase())) return true;
        if (p.styleCode && p.styleCode.toLowerCase().includes(query.toLowerCase())) return true;
        return false;
      })
      .slice(0, 20);
  }, [products, query]);

  const isExceedingStock = selectedProductId > 0 && quantity > (stockOnHand || 0);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="ابحث باسم الصنف أو الباركود أو الكود..."
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            setOpen(true);
            updatePosition();
          }}
          onFocus={() => {
            updatePosition();
            setOpen(true);
          }}
          style={{
            width: '100%',
            padding: '7px 32px 7px 10px',
            backgroundColor: '#ffffff',
            border: selectedProductId > 0 ? '1px solid #3b82f6' : '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '12px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <SearchIcon size={14} color={selectedProductId > 0 ? '#3b82f6' : '#94a3b8'} />
        </span>
      </div>

      {/* Stock availability indicator */}
      {selectedProductId > 0 && (
        <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '10.5px' }}>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: (stockOnHand || 0) > 0 ? '#f0fdf4' : '#fef2f2',
              color: (stockOnHand || 0) > 0 ? '#15803d' : '#b91c1c',
              border: `1px solid ${(stockOnHand || 0) > 0 ? '#bbf7d0' : '#fecaca'}`,
              fontWeight: 600,
            }}
          >
            المتوفر بالمخزن: {stockOnHand ?? 0} {unitName || 'قطعة'}
          </span>
          {isExceedingStock && (
            <span style={{ color: '#c2410c', fontWeight: 700, fontSize: '10px' }}>
              الكمية تتجاوز رصيد المخزن
            </span>
          )}
        </div>
      )}

      {/* Search Dropdown Portal */}
      {isOpen && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          dir="rtl"
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : 'auto',
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.25), 0 4px 12px -2px rgba(0, 0, 0, 0.1)',
            overflowY: 'auto',
            zIndex: 25000,
            boxSizing: 'border-box',
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((prod) => {
              const stock = Number(prod.stock ?? 0);
              const price = Number(prod.retailPrice || prod.wholesalePrice || 0);
              const hasStock = stock > 0;
              const isSelected = selectedProductId === Number(prod.id);

              return (
                <div
                  key={prod.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                  onClick={() => {
                    onSelectProduct(prod);
                    setOpen(false);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prod.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                      {prod.barcode && <span>باركود: {prod.barcode}</span>}
                      {prod.sku && <span>SKU: {prod.sku}</span>}
                      {prod.styleCode && <span>كود: {prod.styleCode}</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: 'left', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#170e5e' }}>
                      {formatCurrency(price)}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: hasStock ? '#ecfdf5' : '#fef2f2',
                        color: hasStock ? '#065f46' : '#991b1b',
                        border: `1px solid ${hasStock ? '#a7f3d0' : '#fecaca'}`,
                      }}
                    >
                      {hasStock ? `متوفر: ${stock}` : 'غير متوفر'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
              لا توجد أصناف مطابقة للبحث "{query}"
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
