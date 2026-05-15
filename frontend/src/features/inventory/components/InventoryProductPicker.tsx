import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';

type InventoryProductPickerProps = {
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  showStock?: boolean;
  showPrice?: boolean;
  helperText?: string;
};

function getProductText(product: Product, key: 'barcode' | 'sku' | 'code') {
  return String((product as unknown as Record<string, unknown>)[key] ?? '').trim();
}

function getProductAliases(product: Product) {
  return [
    String(product.name || '').trim(),
    getProductText(product, 'barcode'),
    getProductText(product, 'sku'),
    getProductText(product, 'code'),
  ].filter(Boolean);
}

function getProductLookupValues(product: Product) {
  return [
    getProductText(product, 'barcode'),
    getProductText(product, 'sku'),
    getProductText(product, 'code'),
  ].filter(Boolean);
}

function isBarcodeLike(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[\dA-Za-z._/-]+$/.test(trimmed) && trimmed.length >= 4;
}

export function InventoryProductPicker({
  products,
  value,
  onChange,
  disabled = false,
  placeholder = 'ابحث باسم الصنف أو امسح الباركود...',
  showStock = false,
  showPrice = false,
  helperText,
}: InventoryProductPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(value)) || null,
    [products, value],
  );

  useEffect(() => {
    if (selectedProduct) {
      setSearch(selectedProduct.name || '');
      setStatusMessage('');
      return;
    }

    if (!value) {
      setSearch('');
      setStatusMessage('');
    }
  }, [selectedProduct, value]);

  const normalizedSearch = search.trim().toLowerCase();

  const findExactMatch = useCallback((rawValue: string) => {
    const q = rawValue.trim().toLowerCase();
    if (!q) return null;
    return products.find((product) => getProductLookupValues(product).some((text) => text.toLowerCase() === q)) || null;
  }, [products]);

  const hasAnyMatch = useCallback((rawValue: string) => {
    const q = rawValue.trim().toLowerCase();
    if (!q) return false;
    return products.some((product) => getProductAliases(product).some((text) => text.toLowerCase().includes(q)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return [];
    return products
      .filter((product) => getProductAliases(product).some((text) => text.toLowerCase().includes(normalizedSearch)))
      .slice(0, 8);
  }, [normalizedSearch, products]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectProduct = useCallback((product: Product) => {
    onChange(String(product.id));
    setSearch(product.name || '');
    setStatusMessage('');
    setIsOpen(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [onChange]);

  const handleSearchChange = useCallback((nextValue: string) => {
    setSearch(nextValue);
    if (disabled) return;

    const nextQuery = nextValue.trim();
    if (!nextQuery) {
      setStatusMessage('');
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    const exactMatch = findExactMatch(nextValue);
    if (exactMatch) {
      selectProduct(exactMatch);
      return;
    }

    if (!hasAnyMatch(nextValue)) {
      setStatusMessage(isBarcodeLike(nextQuery) ? 'لم يتم العثور على صنف بهذا الباركود.' : 'لا توجد نتائج مطابقة.');
      return;
    }

    setStatusMessage('');
  }, [disabled, findExactMatch, hasAnyMatch, selectProduct]);

  const shouldShowDropdown = isOpen && normalizedSearch.length > 0 && !disabled;
  const showBarcodeHint = Boolean(normalizedSearch) && !filteredProducts.length && isBarcodeLike(normalizedSearch);

  return (
    <div className="inventory-product-picker" ref={rootRef}>
      <div className="inventory-product-picker__field">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(event) => handleSearchChange(event.target.value)}
          onFocus={() => {
            if (!disabled && search.trim()) setIsOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          dir="rtl"
        />
      </div>

      {selectedProduct ? (
        <div className="inventory-product-picker__selected">
          <div className="inventory-product-picker__selected-copy">
            <span className="inventory-product-picker__selected-label">الصنف المختار</span>
            <strong>{selectedProduct.name}</strong>
            <div className="inventory-product-picker__selected-meta">
              {getProductText(selectedProduct, 'barcode') ? <span>الباركود: {getProductText(selectedProduct, 'barcode')}</span> : null}
              {!getProductText(selectedProduct, 'barcode') && getProductText(selectedProduct, 'sku') ? <span>SKU: {getProductText(selectedProduct, 'sku')}</span> : null}
              {!getProductText(selectedProduct, 'barcode') && !getProductText(selectedProduct, 'sku') && getProductText(selectedProduct, 'code') ? <span>CODE: {getProductText(selectedProduct, 'code')}</span> : null}
              {showStock ? <span>الكمية المتاحة: {Number((selectedProduct as { stock?: number }).stock || 0)}</span> : null}
              {showPrice ? <span>السعر: {formatCurrency(Number((selectedProduct as { retailPrice?: number }).retailPrice || 0))}</span> : null}
            </div>
          </div>
          <button
            type="button"
            className="inventory-product-picker__clear"
            onClick={() => {
              onChange('');
              setSearch('');
              setStatusMessage('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            disabled={disabled}
          >
            امسح الاختيار
          </button>
        </div>
      ) : (
        <div className="inventory-product-picker__hint">
          {helperText || 'اكتب اسم الصنف أو امسح الباركود لاختيار الصنف.'}
        </div>
      )}

      {shouldShowDropdown ? (
        <div className="inventory-product-picker__dropdown" role="listbox" aria-label="اختيار الصنف">
          {filteredProducts.length ? filteredProducts.map((product) => {
            const barcode = getProductText(product, 'barcode');
            const sku = getProductText(product, 'sku');
            const code = getProductText(product, 'code');
            return (
              <button
                key={String(product.id)}
                type="button"
                className="inventory-product-picker__option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectProduct(product)}
              >
                <div className="inventory-product-picker__option-head">
                  <strong>{product.name}</strong>
                  {showStock ? <span>الكمية المتاحة: {Number((product as { stock?: number }).stock || 0)}</span> : null}
                </div>
                <div className="inventory-product-picker__option-meta">
                  {barcode ? <span>الباركود: {barcode}</span> : null}
                  {!barcode && sku ? <span>SKU: {sku}</span> : null}
                  {!barcode && !sku && code ? <span>CODE: {code}</span> : null}
                  {showPrice ? <span>السعر: {formatCurrency(Number((product as { retailPrice?: number }).retailPrice || 0))}</span> : null}
                </div>
              </button>
            );
          }) : null}
          {!filteredProducts.length ? (
            <div className="inventory-product-picker__empty">
              {statusMessage || (showBarcodeHint ? 'لم يتم العثور على صنف بهذا الباركود.' : 'لا توجد نتائج مطابقة.')}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
