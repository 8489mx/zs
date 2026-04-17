/* eslint-disable max-lines */
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import {
  buildPosProductGroups,
  buildRecentGroupKeys,
  getGroupShelfGroups,
  type PosGroupShelf,
  type PosProductGroup,
} from '@/features/pos/lib/pos-product-groups';
import type { Product } from '@/types/domain';
import type { PosPriceType } from '@/features/pos/types/pos.types';

interface PosProductsPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmitFirstResult: () => boolean;
  priceType: PosPriceType;
  onPriceTypeChange: (value: PosPriceType) => void;
  products: Product[];
  recentProducts: Product[];
  onAddProduct: (product: Product) => void;
  productFilter: 'all' | 'offers' | 'priced' | 'low' | 'recent';
  onProductFilterChange: (value: 'all' | 'offers' | 'priced' | 'low' | 'recent') => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const favoritesStorageKey = 'pos-group-favorites-v2';

function readFavoriteKeys() {
  if (typeof window === 'undefined') return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(favoritesStorageKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : [];
  } catch {
    return [] as string[];
  }
}

function groupMetaLabel(group: PosProductGroup) {
  if (!group.hasVariants) {
    const directProduct = group.products[0];
    return directProduct?.barcode ? `باركود: ${directProduct.barcode}` : 'إضافة مباشرة';
  }
  const parts: string[] = [];
  if (group.colors.length) parts.push(`${group.colors.length} لون`);
  if (group.sizes.length) parts.push(`${group.sizes.length} اختيار`);
  if (!parts.length) parts.push(`${group.products.length} فرع`);
  return parts.join(' • ');
}

function focusSearchInput(searchInputRef: RefObject<HTMLInputElement | null>) {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  });
}

function hasExactCodeMatch(products: Product[], query: string) {
  const normalized = query.trim();
  if (!normalized) return false;
  return products.some((product) => product.barcode === normalized || product.units?.some((unit) => unit.barcode === normalized));
}

function InlineGroupPicker({
  group,
  onClose,
  onAddProduct,
  priceType,
  searchInputRef,
}: {
  group: PosProductGroup;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  priceType: PosPriceType;
  searchInputRef: RefObject<HTMLInputElement | null>;
}) {
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    setSelectedColor(group.colors[0] || '');
    setSelectedSize(group.sizes[0] || '');
  }, [group]);

  const deferredColor = useDeferredValue(selectedColor);
  const deferredSize = useDeferredValue(selectedSize);

  const filteredProducts = useMemo(() => {
    return group.products.filter((product) => {
      if (deferredColor && String(product.color || '') !== deferredColor) return false;
      if (deferredSize && String(product.size || '') !== deferredSize) return false;
      return true;
    });
  }, [deferredColor, deferredSize, group.products]);

  return (
    <div className="pos-inline-picker-overlay" role="presentation">
      <button type="button" className="pos-inline-picker-backdrop" aria-label="إغلاق الاختيارات" onClick={() => { onClose(); focusSearchInput(searchInputRef); }} />
      <section className="pos-inline-picker-panel" aria-label={`اختيارات ${group.title}`}>
        <div className="pos-inline-picker-head">
          <div>
            <div className="pos-inline-picker-kicker">اختيارات الصنف</div>
            <h4>{group.title}</h4>
            <p className="muted small">اختر الفرع المناسب ثم أضفه مباشرة. السلة ستظل ثابتة كما هي.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => { onClose(); focusSearchInput(searchInputRef); }}>
            إغلاق
          </Button>
        </div>

        {group.colors.length ? (
          <div className="pos-inline-picker-filter-block">
            <span>اللون</span>
            <div className="pos-chip-row">
              {group.colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`pos-option-chip ${selectedColor === color ? 'is-active' : ''}`}
                  onClick={() => setSelectedColor(color)}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {group.sizes.length ? (
          <div className="pos-inline-picker-filter-block">
            <span>{group.colors.length ? 'المقاس / العبوة / الوحدة' : 'الاختيار'}</span>
            <div className="pos-chip-row">
              {group.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`pos-option-chip ${selectedSize === size ? 'is-active' : ''}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="pos-inline-picker-results-head muted small">
          <span>{filteredProducts.length} فرع مطابق</span>
          <span>اختر من البطاقات التالية للإضافة السريعة</span>
        </div>

        <div className="pos-inline-picker-grid">
          {filteredProducts.map((product) => {
            const price = priceType === 'wholesale' ? (product.wholesalePrice || product.retailPrice) : product.retailPrice;
            return (
              <button
                key={product.id}
                type="button"
                className="pos-inline-variant-card"
                onClick={() => {
                  onAddProduct(product);
                  onClose();
                  focusSearchInput(searchInputRef);
                }}
              >
                <div className="pos-inline-variant-card-top">
                  <span className="status-badge status-posted">{product.stock}</span>
                  <strong>{[product.color, product.size].filter(Boolean).join(' / ') || product.name}</strong>
                </div>
                <div className="muted small pos-inline-variant-card-meta">{product.name}</div>
                <div className="pos-inline-variant-card-bottom">
                  <span>{formatCurrency(Number(price || 0))}</span>
                  <span className="muted small">إضافة هذا الفرع</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PosProductsPanelComponent({
  search,
  onSearchChange,
  onSearchSubmitFirstResult,
  priceType,
  onPriceTypeChange,
  products,
  recentProducts,
  onAddProduct,
  productFilter,
  onProductFilterChange,
  searchInputRef,
}: PosProductsPanelProps) {
  const [shelf, setShelf] = useState<PosGroupShelf>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>(readFavoriteKeys);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const groupRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const groupedProducts = useMemo(() => buildPosProductGroups(products, priceType), [priceType, products]);
  const recentGroupKeys = useMemo(() => buildRecentGroupKeys(recentProducts, groupedProducts), [groupedProducts, recentProducts]);
  const favoriteKeySet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);
  const visibleGroups = useMemo(() => getGroupShelfGroups({
    groups: groupedProducts,
    shelf,
    favoriteKeys: favoriteKeySet,
    recentKeys: recentGroupKeys,
  }), [favoriteKeySet, groupedProducts, recentGroupKeys, shelf]);
  const visibleRecentGroups = useMemo(
    () => recentGroupKeys
      .map((key) => groupedProducts.find((group) => group.key === key))
      .filter(Boolean)
      .slice(0, 6) as PosProductGroup[],
    [groupedProducts, recentGroupKeys],
  );
  const selectedGroup = visibleGroups[selectedIndex] || null;
  const openGroup = groupedProducts.find((group) => group.key === openGroupKey) || null;

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteKeys));
  }, [favoriteKeys]);

  useEffect(() => {
    if (!visibleGroups.length) {
      if (selectedIndex !== 0) setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= visibleGroups.length) setSelectedIndex(0);
  }, [selectedIndex, visibleGroups]);

  useEffect(() => {
    if (!openGroupKey || typeof window === 'undefined') return undefined;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpenGroupKey(null);
      focusSearchInput(searchInputRef);
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [openGroupKey, searchInputRef]);

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => {
      groupRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [selectedIndex]);

  function moveSelection(nextIndex: number) {
    if (!visibleGroups.length) return;
    const safeIndex = Math.max(0, Math.min(nextIndex, visibleGroups.length - 1));
    setSelectedIndex(safeIndex);
  }

  function toggleFavorite(groupKey: string) {
    setFavoriteKeys((current) => (
      current.includes(groupKey)
        ? current.filter((entry) => entry !== groupKey)
        : [groupKey, ...current].slice(0, 20)
    ));
  }

  function activateGroup(group: PosProductGroup | null) {
    if (!group) return false;
    if (group.hasVariants) {
      setOpenGroupKey(group.key);
      return true;
    }
    onAddProduct(group.products[0]);
    focusSearchInput(searchInputRef);
    return true;
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const pageStep = 8;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSelection(selectedIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSelection(selectedIndex - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      moveSelection(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      moveSelection(visibleGroups.length - 1);
      return;
    }
    if (event.key === 'PageDown') {
      event.preventDefault();
      moveSelection(selectedIndex + pageStep);
      return;
    }
    if (event.key === 'PageUp') {
      event.preventDefault();
      moveSelection(selectedIndex - pageStep);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (openGroupKey) {
        setOpenGroupKey(null);
        return;
      }
      onSearchChange('');
      onProductFilterChange('all');
      setShelf('all');
      setSelectedIndex(0);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (hasExactCodeMatch(products, search) && onSearchSubmitFirstResult()) {
        setOpenGroupKey(null);
        setSelectedIndex(0);
        return;
      }
      if (selectedGroup) {
        activateGroup(selectedGroup);
        return;
      }
      onSearchSubmitFirstResult();
    }
  }

  return (
    <Card
      title="1. اختيار الأصناف"
      actions={<span className="nav-pill">{visibleGroups.length} مجموعة</span>}
      className="workspace-panel pos-products-card pos-products-card-compact pos-products-card-density-compact"
    >
      <div className="pos-products-static">

        <div className="pos-toolbar-shell pos-toolbar-shell-compact">
          <div className="pos-products-toolbar-stack">
            <div className="pos-products-top-row pos-products-top-row-unified">
              <div className="pos-products-unified-search-field">
                <Field label="امسح الباركود أو اكتب الاسم">
                  <input
                    ref={searchInputRef}
                    autoFocus
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="اضرب الباركود هنا أو اكتب الاسم ثم Enter"
                  />
                </Field>
              </div>

              <div className="field pos-price-toggle-field">
                <span>نوع السعر</span>
                <div className="pos-price-toggle-buttons">
                  <Button type="button" variant={priceType === 'retail' ? 'primary' : 'secondary'} onClick={() => onPriceTypeChange('retail')}>قطاعي</Button>
                  <Button type="button" variant={priceType === 'wholesale' ? 'primary' : 'secondary'} onClick={() => onPriceTypeChange('wholesale')}>جملة</Button>
                </div>
              </div>

              <div className="field pos-products-reset-field">
                <span>إجراء</span>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onSearchChange('');
                    onProductFilterChange('all');
                    setShelf('all');
                    setOpenGroupKey(null);
                    setSelectedIndex(0);
                    focusSearchInput(searchInputRef);
                  }}
                >
                  تفريغ
                </Button>
              </div>
            </div>

          </div>
        </div>

        <div className="filter-chip-row pos-filter-row-compact pos-filter-row-single">
          <Button
            type="button"
            variant={shelf === 'all' && productFilter === 'all' ? 'primary' : 'secondary'}
            onClick={() => {
              setShelf('all');
              onProductFilterChange('all');
              setSelectedIndex(0);
            }}
          >
            الكل
          </Button>
          <Button type="button" variant={shelf === 'choices' ? 'primary' : 'secondary'} onClick={() => { setShelf('choices'); onProductFilterChange('all'); setSelectedIndex(0); }}>
            بها اختيارات
          </Button>
          <Button type="button" variant={shelf === 'direct' ? 'primary' : 'secondary'} onClick={() => { setShelf('direct'); onProductFilterChange('all'); setSelectedIndex(0); }}>
            مباشرة
          </Button>
          <Button type="button" variant={shelf === 'favorites' ? 'primary' : 'secondary'} onClick={() => { setShelf('favorites'); onProductFilterChange('all'); setSelectedIndex(0); }}>
            المفضلة
          </Button>
          <Button type="button" variant={shelf === 'recent' ? 'primary' : 'secondary'} onClick={() => { setShelf('recent'); onProductFilterChange('all'); setSelectedIndex(0); }}>
            آخر استخدام
          </Button>
          <Button type="button" variant={productFilter === 'offers' ? 'primary' : 'secondary'} onClick={() => { onProductFilterChange('offers'); setShelf('all'); setSelectedIndex(0); }}>
            بعروض
          </Button>
          <Button type="button" variant={productFilter === 'priced' ? 'primary' : 'secondary'} onClick={() => { onProductFilterChange('priced'); setShelf('all'); setSelectedIndex(0); }}>
            أسعار خاصة
          </Button>
          <Button type="button" variant={productFilter === 'low' ? 'primary' : 'secondary'} onClick={() => { onProductFilterChange('low'); setShelf('all'); setSelectedIndex(0); }}>
            منخفضة
          </Button>
          <Button type="button" variant={productFilter === 'recent' ? 'primary' : 'secondary'} onClick={() => { onProductFilterChange('recent'); setShelf('all'); setSelectedIndex(0); }}>
            الأحدث
          </Button>
        </div>

        {visibleRecentGroups.length ? (
          <div className="pos-quick-picks-row" aria-label="وصول سريع">
            <span className="muted small">وصول سريع</span>
            <div className="pos-quick-picks-buttons">
              {visibleRecentGroups.map((group) => (
                <Button key={group.key} type="button" variant="secondary" onClick={() => activateGroup(group)}>{group.title}</Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pos-products-scroll">
        {!visibleGroups.length ? <div className="surface-note pos-compact-empty">لا توجد مجموعات مطابقة الآن. جرّب بحثًا آخر أو ألغِ الفلاتر.</div> : null}

        <div className="product-pick-grid pos-product-group-grid pos-product-group-grid-density-compact">
          {visibleGroups.map((group, index) => {
            const isSelected = index === selectedIndex;
            const isFavorite = favoriteKeySet.has(group.key);
            const priceLabel = group.minPrice === group.maxPrice
              ? formatCurrency(group.minPrice)
              : `${formatCurrency(group.minPrice)} - ${formatCurrency(group.maxPrice)}`;
            return (
              <article key={group.key} className={`pos-group-card ${isSelected ? 'is-selected' : ''}`}>
                <div className="pos-group-card-top">
                  <span className={`pos-group-kind ${group.hasVariants ? 'has-choices' : 'is-direct'}`}>
                    {group.hasVariants ? `${group.products.length} فرع` : 'مباشر'}
                  </span>
                  <button
                    type="button"
                    className={`pos-favorite-star ${isFavorite ? 'is-active' : ''}`}
                    onClick={() => toggleFavorite(group.key)}
                    aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                  >
                    ★
                  </button>
                </div>

                <button
                  ref={(node) => { groupRefs.current[index] = node; }}
                  type="button"
                  className="pos-group-card-action"
                  onClick={() => {
                    setSelectedIndex(index);
                    activateGroup(group);
                  }}
                  onFocus={() => setSelectedIndex(index)}
                >
                  <strong>{group.title}</strong>
                  <div className="muted small pos-group-card-meta">{groupMetaLabel(group)}</div>
                  {group.hasVariants ? (
                    <div className="pos-group-tags">
                      {group.colors.slice(0, 3).map((color) => <span key={`${group.key}-${color}`} className="pos-group-tag">{color}</span>)}
                      {group.sizes.slice(0, 3).map((size) => <span key={`${group.key}-${size}`} className="pos-group-tag">{size}</span>)}
                    </div>
                  ) : null}
                  <div className="pick-meta-row pos-pick-meta-row">
                    <span>{priceLabel}</span>
                    <span className="small muted">{group.hasVariants ? 'افتح الاختيارات' : 'أضف الآن'}</span>
                  </div>
                </button>
              </article>
            );
          })}
        </div>

        {openGroup ? (
          <InlineGroupPicker
            group={openGroup}
            onClose={() => setOpenGroupKey(null)}
            onAddProduct={onAddProduct}
            priceType={priceType}
            searchInputRef={searchInputRef}
          />
        ) : null}
      </div>
    </Card>
  );
}

function arePropsEqual(prev: PosProductsPanelProps, next: PosProductsPanelProps) {
  return prev.search === next.search
    && prev.priceType === next.priceType
    && prev.products === next.products
    && prev.recentProducts === next.recentProducts
    && prev.productFilter === next.productFilter;
}

export const PosProductsPanel = memo(PosProductsPanelComponent, arePropsEqual);
