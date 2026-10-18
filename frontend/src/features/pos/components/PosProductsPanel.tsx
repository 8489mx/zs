import { memo, useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { StarIcon } from '@/shared/components/icons/AppIcons';
import { formatCurrency } from '@/lib/format';
import { sharedProductsApi } from '@/shared/api/products';
import {
  buildPosProductGroups,
  buildRecentGroupKeys,
  getGroupShelfGroups,
  type PosGroupShelf,
  type PosProductGroup,
} from '@/features/pos/lib/pos-product-groups';
import type { Product } from '@/types/domain';
import type { PosPriceType } from '@/features/pos/types/pos.types';
import type { PosSaleMode } from '@/features/pos/lib/pos-sale-mode';
import { ProductIcon } from '@/shared/components/icons/product-svg-catalog';
import { ProductIconStudioModal } from '@/shared/components/icons/ProductIconStudioModal';
import { useProductIconSettings } from '@/shared/components/icons/product-icon-theme';
import { isInvoiceBarcodeQuery, sanitizeSearchInputLive } from '@/features/pos/lib/pos-barcode-normalizer';
import { useScannerBuffer } from '@/features/pos/hooks/useScannerBuffer';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { useIsMobile } from '@/shared/hooks/use-is-mobile';

interface PosProductsPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmitFirstResult: (rawQuery?: string) => boolean;
  priceType: PosPriceType;
  onPriceTypeChange: (value: PosPriceType) => void;
  products: Product[];
  recentProducts: Product[];
  onAddProduct: (product: Product) => void;
  productFilter: 'all' | 'offers' | 'priced' | 'low' | 'recent' | 'raw_materials' | 'services';
  onProductFilterChange: (value: 'all' | 'offers' | 'priced' | 'low' | 'recent' | 'raw_materials' | 'services') => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  posMode: PosSaleMode;
  onOpenNewProduct?: (params: { name?: string; barcode?: string }) => void;
  restaurantModuleEnabled?: boolean;
}

const favoritesStorageKey = 'pos-group-favorites-v2';
const cardDensityStorageKey = 'pos-card-density-preference-v1';
const touchModeVisibleStep = 60;

function readCardDensityPreference(): 'comfortable' | 'compact' {
  if (typeof window === 'undefined') return 'comfortable';
  try {
    const val = window.localStorage.getItem(cardDensityStorageKey);
    if (val === 'compact' || val === 'comfortable') return val;
  } catch {}
  return 'comfortable';
}

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
  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;
  return products.some((product) => 
    product.barcode?.trim().toLowerCase() === normalized || 
    product.units?.some((unit) => unit.barcode?.trim().toLowerCase() === normalized)
  );
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
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    setSelectedColor(group.colors[0] || '');
    setSelectedSize(group.sizes[0] || '');
  }, [group]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        onClose();
        focusSearchInput(searchInputRef);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, searchInputRef]);

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
      <button type="button" className="pos-inline-picker-backdrop" aria-label={t('pos.pos_products_panel.s0', "إغلاق الاختيارات")} onClick={() => { onClose(); focusSearchInput(searchInputRef); }} />
      <section className="pos-inline-picker-panel" aria-label={`اختيارات ${group.title}`}>
        <div className="pos-inline-picker-head">
          <div>
            <div className="pos-inline-picker-kicker">{t('pos.pos_products_panel.s1', "اختيارات الصنف")}</div>
            <h4>{group.title}</h4>
            <p className="muted small">{t('pos.pos_products_panel.s2', "اختر الفرع المناسب ثم أضفه مباشرة. السلة ستظل ثابتة كما هي.")}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => { onClose(); focusSearchInput(searchInputRef); }}>
            {t('pos.pos_products_panel.s3', "إغلاق")}
          </Button>
        </div>

        {group.colors.length ? (
          <div className="pos-inline-picker-filter-block">
            <span>{t('pos.pos_products_panel.s4', "اللون")}</span>
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
            <span>{group.colors.length ? t('pos.pos_products_panel.s5', "المقاس / العبوة / الوحدة") : t('pos.pos_products_panel.s6', "الاختيار")}</span>
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
          <span>{filteredProducts.length} {t('pos.pos_products_panel.s7', "فرع مطابق")}</span>
          <span>{t('pos.pos_products_panel.s8', "اختر من البطاقات التالية للإضافة السريعة")}</span>
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
                  <span className="muted small">{t('pos.pos_products_panel.s9', "إضافة هذا الفرع")}</span>
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
  posMode,
  onOpenNewProduct,
  restaurantModuleEnabled,
}: PosProductsPanelProps) {
  const { t: __t } = useTranslation();
  const { t } = useTranslation();
  // Scanner buffer: detects rapid barcode scanner input and batches it into a single
  // state update instead of triggering re-renders on every character.
  // Uses refs + direct DOM manipulation — ZERO React renders during scanning.
  const scannerBuffer = useScannerBuffer({
    externalValue: search,
    onFlush: onSearchChange,
    onAutoSubmit: (val) => {
      const trimmed = val.trim();
      if (!trimmed) return false;
      if (hasExactCodeMatch(products, trimmed) || isInvoiceBarcodeQuery(trimmed)) {
        return onSearchSubmitFirstResult(trimmed);
      }
      return false;
    },
    inputRef: searchInputRef,
    sanitize: sanitizeSearchInputLive,
    scanThresholdMs: 65,
    scanFlushMs: 75,
    typeFlushMs: 120,
  });

  const [shelf, setShelf] = useState<PosGroupShelf>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>(readFavoriteKeys);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [touchVisibleCount, setTouchVisibleCount] = useState(touchModeVisibleStep);
  const [cardDensity, setCardDensity] = useState<'comfortable' | 'compact'>(readCardDensityPreference);
  const groupRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  
  const toggleCardDensity = () => {
    setCardDensity((prev) => {
      const next = prev === 'comfortable' ? 'compact' : 'comfortable';
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(cardDensityStorageKey, next);
        } catch {}
      }
      return next;
    });
  };
  
  const categoriesQuery = useQuery({ queryKey: ['pos-categories'], queryFn: sharedProductsApi.categories, staleTime: 300000 });
  const categories: any[] = categoriesQuery.data || [];
  const iconSettings = useProductIconSettings();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const handleCameraBarcodeScan = (scannedCode: string) => {
    if (searchInputRef.current) {
      searchInputRef.current.value = scannedCode;
    }
    scannerBuffer.flushNow(scannedCode);
    onSearchSubmitFirstResult(scannedCode);
  };

  const [activeDaypart, setActiveDaypart] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'beverages'>('all');

  const daypartFilteredProducts = useMemo(() => {
    if (!restaurantModuleEnabled || activeDaypart === 'all') {
      return products;
    }
    const kwMap: Record<string, RegExp> = {
      breakfast: /فطور|إفطار|صباح|بيض|فول|بانكيك|شاي|كرواسون|breakfast/i,
      lunch: /غداء|مشويات|شاورما|برجر|بيتزا|أرز|دجاج|لحم|lunch|burger/i,
      dinner: /عشاء|سهرة|سندوتش|فاهيتا|بيتزا|dinner/i,
      beverages: /عصير|مشروب|قهوة|كافيه|لاتيه|حلى|حلويات|آيسكريم|كيك|drink|coffee|dessert/i,
    };
    const reg = kwMap[activeDaypart];
    if (!reg) return products;
    const filtered = products.filter((p) => {
      const targetStr = `${p.name} ${p.categoryName || ''} ${(p as any).description || ''}`;
      return reg.test(targetStr);
    });
    return filtered.length > 0 ? filtered : products;
  }, [restaurantModuleEnabled, activeDaypart, products]);

  const categoryFilteredProducts = useMemo(() => {
    if (!selectedCategoryId) return daypartFilteredProducts;
    return daypartFilteredProducts.filter((p) => String(p.categoryId) === String(selectedCategoryId));
  }, [daypartFilteredProducts, selectedCategoryId]);

  const groupedProducts = useMemo(() => buildPosProductGroups(categoryFilteredProducts, priceType), [priceType, categoryFilteredProducts]);
  const recentGroupKeys = useMemo(() => buildRecentGroupKeys(recentProducts, groupedProducts), [groupedProducts, recentProducts]);
  const favoriteKeySet = useMemo(() => new Set(favoriteKeys), [favoriteKeys]);
  const deferredSearch = useDeferredValue(search);
  const scannerSearchQuery = deferredSearch.trim();
  const isScannerMode = posMode === 'scanner';
  const isTouchMode = posMode === 'touch';
  const isMobile = useIsMobile(900);
  const hasBrowseFilter = productFilter !== 'all' || shelf !== 'all';
  const canShowScannerResults = !isScannerMode || isMobile || scannerSearchQuery.length >= 2 || hasBrowseFilter;
  const visibleGroups = useMemo(() => getGroupShelfGroups({
    groups: groupedProducts,
    shelf,
    favoriteKeys: favoriteKeySet,
    recentKeys: recentGroupKeys,
  }), [favoriteKeySet, groupedProducts, recentGroupKeys, shelf]);
  const visibleTouchGroupCount = Math.min(touchVisibleCount, visibleGroups.length);
  const displayedGroups = useMemo(
    () => (canShowScannerResults ? visibleGroups.slice(0, visibleTouchGroupCount) : []),
    [canShowScannerResults, visibleGroups, visibleTouchGroupCount]
  );
  const hasMoreTouchGroups = visibleGroups.length > displayedGroups.length;

  useEffect(() => {
    if (!hasMoreTouchGroups || !sentinelRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setTouchVisibleCount((prev) => prev + touchModeVisibleStep);
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreTouchGroups]);
  const groupedProductsMap = useMemo(() => new Map(groupedProducts.map((g) => [g.key, g])), [groupedProducts]);
  const visibleRecentGroups = useMemo(
    () => recentGroupKeys
      .map((key) => groupedProductsMap.get(key))
      .filter(Boolean)
      .slice(0, 6) as PosProductGroup[],
    [groupedProductsMap, recentGroupKeys],
  );
  const visibleFavoriteGroups = useMemo(
    () => favoriteKeys
      .map((key) => groupedProductsMap.get(key))
      .filter(Boolean)
      .slice(0, 5) as PosProductGroup[],
    [favoriteKeys, groupedProductsMap],
  );
  const selectedGroup = displayedGroups[selectedIndex] || null;
  const openGroup = openGroupKey ? (groupedProductsMap.get(openGroupKey) || null) : null;

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(favoritesStorageKey, JSON.stringify(favoriteKeys));
  }, [favoriteKeys]);

  useEffect(() => {
    setTouchVisibleCount(touchModeVisibleStep);
  }, [isTouchMode, isMobile, productFilter, products, search, shelf]);

  useEffect(() => {
    if (!displayedGroups.length) {
      if (selectedIndex !== 0) setSelectedIndex(0);
      return;
    }
    if (selectedIndex >= displayedGroups.length) setSelectedIndex(0);
  }, [displayedGroups, selectedIndex]);

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
    if (!displayedGroups.length) return;
    const safeIndex = Math.max(0, Math.min(nextIndex, displayedGroups.length - 1));
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
    const currentQuery = event.currentTarget.value || search;
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
      moveSelection(displayedGroups.length - 1);
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
      // Flush scanner buffer immediately then clear
      scannerBuffer.flushNow('');
      onProductFilterChange('all');
      setShelf('all');
      setSelectedCategoryId(null);
      setSelectedIndex(0);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      // Flush scanner buffer immediately so parent state is up-to-date
      scannerBuffer.flushNow(currentQuery);
      if (currentQuery.trim()) {
        if (hasExactCodeMatch(products, currentQuery) && onSearchSubmitFirstResult(currentQuery)) {
          setOpenGroupKey(null);
          setSelectedIndex(0);
          return;
        }
        onSearchSubmitFirstResult(currentQuery);
        return;
      }
      if (selectedGroup) activateGroup(selectedGroup);
    }
  }

  return (
    <Card
      className={`workspace-panel pos-products-card pos-products-card-compact pos-products-card-density-compact pos-products-card-mode-${posMode}`.trim()}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', flex: 1 }}
    >
      <div className="pos-products-static" style={{ flexShrink: 0 }}>

        <div className="pos-toolbar-shell pos-toolbar-shell-compact">
          <div className="pos-products-toolbar-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <div className="pos-products-unified-search-field">
              <div className="field" style={{ margin: 0, position: 'relative' }}>
                <input
                  ref={searchInputRef}
                  autoFocus
                  defaultValue={search}
                  onChange={scannerBuffer.handleChange}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('pos.search_placeholder', 'امسح باركود أو اكتب الاسم...')}
                  style={{ borderRadius: '8px', width: '100%', padding: '10px 48px 10px 14px', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
                />
                <button
                  type="button"
                  className="pos-camera-scan-btn"
                  onClick={() => setIsCameraScannerOpen(true)}
                  title={t('pos.scan_camera', 'مسح باركود بكاميرا الموبايل')}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#2563eb',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </button>
              </div>
            </div>

            <div className="pos-price-toggle-container" style={{ width: '100%' }}>
              <div className="pos-price-toggle-buttons" style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '4px' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    background: priceType === 'retail' ? '#0f172a' : 'transparent',
                    color: priceType === 'retail' ? '#ffffff' : '#475569',
                    boxShadow: priceType === 'retail' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => onPriceTypeChange('retail')}
                >
                  {t('pos.retail_price', 'سعر القطاعي')}
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    background: priceType === 'wholesale' ? '#dc2626' : 'transparent',
                    color: priceType === 'wholesale' ? '#ffffff' : '#475569',
                    boxShadow: priceType === 'wholesale' ? '0 1px 3px rgba(220,38,38,0.3)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => onPriceTypeChange('wholesale')}
                >
                  {t('pos.wholesale_price', 'سعر الجملة')}
                </button>
              </div>
            </div>

          </div>
        </div>

        {restaurantModuleEnabled && (
          <div
            className="filter-chip-row pos-filter-row-compact pos-filter-row-single"
            style={{
              gap: '6px',
              marginTop: '8px',
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            {[
              { id: 'all', label: __t('pos.pos_products_panel.s10', __t('pos.pos_products_panel.s0', "جميع الوجبات")) },
              { id: 'breakfast', label: __t('pos.pos_products_panel.s11', __t('pos.pos_products_panel.s1', "الفطور الصباحي")) },
              { id: 'lunch', label: __t('pos.pos_products_panel.s12', __t('pos.pos_products_panel.s2', "وجبات الغداء")) },
              { id: 'dinner', label: __t('pos.pos_products_panel.s13', __t('pos.pos_products_panel.s3', "وجبات العشاء")) },
              { id: 'beverages', label: __t('pos.pos_products_panel.s14', __t('pos.pos_products_panel.s4', "الحلويات والمشروبات")) },
            ].map((dp) => (
              <button
                key={dp.id}
                type="button"
                onClick={() => {
                  setActiveDaypart(dp.id as any);
                  setSelectedIndex(0);
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  borderRadius: '7px',
                  border: activeDaypart === dp.id ? '1px solid #170e5e' : '1px solid #cbd5e1',
                  background: activeDaypart === dp.id ? '#170e5e' : '#ffffff',
                  color: activeDaypart === dp.id ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              >
                {dp.label}
              </button>
            ))}
          </div>
        )}

        {(isTouchMode || isMobile) && categories.length > 0 && (
          <div
            className="filter-chip-row pos-filter-row-compact pos-filter-row-single"
            style={{ gap: '6px', marginTop: '10px', display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(null);
                setSelectedIndex(0);
              }}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                borderRadius: '8px',
                border: selectedCategoryId === null ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: selectedCategoryId === null ? '#0f172a' : '#ffffff',
                color: selectedCategoryId === null ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                fontWeight: 700,
                transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              }}
            >
              {t('pos.all_categories', 'كل الأقسام')}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setSelectedIndex(0);
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: selectedCategoryId === String(cat.id) ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  background: selectedCategoryId === String(cat.id) ? '#0f172a' : '#ffffff',
                  color: selectedCategoryId === String(cat.id) ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  fontWeight: 700,
                  transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {(isTouchMode || isMobile) && (
          <div
            className="filter-chip-row pos-filter-row-compact pos-filter-row-single"
            style={{ gap: '6px', marginTop: '6px', display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px' }}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShelf('all');
                onProductFilterChange('all');
                setSelectedIndex(0);
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '7px',
                border: shelf === 'all' && productFilter === 'all' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: shelf === 'all' && productFilter === 'all' ? '#0f172a' : '#ffffff',
                color: shelf === 'all' && productFilter === 'all' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: shelf === 'all' && productFilter === 'all' ? 'bold' : '500',
              }}
            >
              {t('common.all', 'الكل')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShelf('favorites');
                onProductFilterChange('all');
                setSelectedIndex(0);
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '7px',
                border: shelf === 'favorites' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: shelf === 'favorites' ? '#0f172a' : '#ffffff',
                color: shelf === 'favorites' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: shelf === 'favorites' ? 'bold' : '500',
              }}
            >
              {__t('pos.pos_products_panel.s15', __t('pos.pos_products_panel.s5', "المفضلة"))}
            </button>
            <button
              type="button"
              onClick={() => {
                onProductFilterChange('offers');
                setShelf('all');
                setSelectedIndex(0);
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '7px',
                border: productFilter === 'offers' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: productFilter === 'offers' ? '#0f172a' : '#ffffff',
                color: productFilter === 'offers' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: productFilter === 'offers' ? 'bold' : '500',
              }}
            >
              {__t('pos.pos_products_panel.s16', __t('pos.pos_products_panel.s6', "بعروض"))}
            </button>
            <button
              type="button"
              onClick={() => {
                setShelf('recent');
                onProductFilterChange('all');
                setSelectedIndex(0);
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '7px',
                border: shelf === 'recent' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: shelf === 'recent' ? '#0f172a' : '#ffffff',
                color: shelf === 'recent' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: shelf === 'recent' ? 'bold' : '500',
              }}
            >
              {__t('pos.pos_products_panel.s17', __t('pos.pos_products_panel.s7', "آخر استخدام"))}
            </button>
            <button
              type="button"
              onClick={() => {
                onProductFilterChange('raw_materials');
                setShelf('all');
                setSelectedIndex(0);
              }}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                borderRadius: '7px',
                border: productFilter === 'raw_materials' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                background: productFilter === 'raw_materials' ? '#0f172a' : '#ffffff',
                color: productFilter === 'raw_materials' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: productFilter === 'raw_materials' ? 'bold' : '500',
              }}
            >
              {__t('pos.pos_products_panel.s18', __t('pos.pos_products_panel.s8', "مواد خام"))}
            </button>

            {/* Density Toggle Button */}
            <button
              type="button"
              onClick={toggleCardDensity}
              title={cardDensity === 'comfortable' ? __t('pos.pos_products_panel.s19', __t('pos.pos_products_panel.s9', "التبديل إلى كروت مضغوطة")) : __t('pos.pos_products_panel.s20', __t('pos.pos_products_panel.s10', "التبديل إلى كروت موسعة"))}
              style={{
                marginInlineStart: 'auto',
                padding: '4px 10px',
                fontSize: '11px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                background: cardDensity === 'compact' ? '#0f172a' : '#ffffff',
                color: cardDensity === 'compact' ? '#ffffff' : '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {cardDensity === 'compact' ? __t('pos.pos_products_panel.s21', __t('pos.pos_products_panel.s11', "كروت مضغوطة")) : __t('pos.pos_products_panel.s22', __t('pos.pos_products_panel.s12', "كروت موسعة"))}
            </button>

            {/* Icon Theme Studio Button */}
            <button
              type="button"
              onClick={() => setIsStudioOpen(true)}
              title={__t('pos.pos_products_panel.s23', __t('pos.pos_products_panel.s13', "تخصيص ألوان ومظهر أيقونات الأصناف"))}
              style={{
                padding: '4px 9px',
                fontSize: '11px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{__t('pos.pos_products_panel.s24', __t('pos.pos_products_panel.s14', "الأيقونات"))}</span>
            </button>
          </div>
        )}

        {(isTouchMode || isMobile) && visibleRecentGroups.length ? (
          <div className="pos-quick-picks-row" aria-label={__t('pos.pos_products_panel.s25', __t('pos.pos_products_panel.s15', "وصول سريع"))}>
            <span className="muted small">{__t('pos.pos_products_panel.s26', __t('pos.pos_products_panel.s16', "وصول سريع"))}</span>
            <div className="pos-quick-picks-buttons">
              {visibleRecentGroups.map((group) => (
                <Button key={group.key} type="button" variant="secondary" onClick={() => activateGroup(group)}>{group.title}</Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="pos-products-viewport-wrapper"
        style={{
          position: 'relative',
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          className="pos-products-scroll"
          style={{
            flex: '1 1 0%',
            minHeight: 0,
            overflowY: openGroup ? 'hidden' : 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
        {!canShowScannerResults ? (
          <div className="pos-scanner-ready-panel">
            <div className="pos-scanner-ready-copy">
              <strong>{__t('pos.pos_products_panel.s27', __t('pos.pos_products_panel.s17', "اضرب الباركود أو اكتب أول حرفين للبحث"))}</strong>
              <span>{__t('pos.pos_products_panel.s28', __t('pos.pos_products_panel.s18', "تبقى الفاتورة والسلة أمامك، والنتائج ستظهر هنا فقط بعد البحث."))}</span>
            </div>

            {visibleRecentGroups.length ? (
              <div className="pos-scanner-ready-section">
                <span className="muted small">{__t('pos.pos_products_panel.s29', __t('pos.pos_products_panel.s19', "آخر ما تمت إضافته"))}</span>
                <div className="pos-scanner-ready-buttons">
                  {visibleRecentGroups.map((group) => (
                    <Button key={group.key} type="button" variant="secondary" onClick={() => activateGroup(group)}>{group.title}</Button>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleFavoriteGroups.length ? (
              <div className="pos-scanner-ready-section">
                <span className="muted small">{__t('pos.pos_products_panel.s30', __t('pos.pos_products_panel.s20', "المفضلة"))}</span>
                <div className="pos-scanner-ready-buttons">
                  {visibleFavoriteGroups.map((group) => (
                    <Button key={group.key} type="button" variant="secondary" onClick={() => activateGroup(group)}>{group.title}</Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {canShowScannerResults && !displayedGroups.length ? (
          <div
            className="surface-note pos-compact-empty"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '24px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              margin: '12px 0',
            }}
          >
            <div style={{ fontSize: '0.92rem', color: '#64748b' }}>
              {__t('pos.pos_products_panel.s31', __t('pos.pos_products_panel.s21', "لم يتم العثور على أي صنف مطابق لـ"))} <strong style={{ color: '#0f172a' }}>"{search}"</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {isInvoiceBarcodeQuery(search.trim()) ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onSearchSubmitFirstResult(search.trim())}
                  style={{
                    fontWeight: 700,
                    padding: '8px 18px',
                    background: '#f0f9ff',
                    borderColor: '#0284c7',
                    color: '#0369a1',
                  }}
                >
                  {__t('pos.pos_products_panel.s32', __t('pos.pos_products_panel.s22', "استعراض / إعادة طباعة الفاتورة \""))}{search}"
                </Button>
              ) : null}

              {onOpenNewProduct ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    const query = search.trim();
                    const isBarcode = /^\d{4,}$/.test(query);
                    onOpenNewProduct(isBarcode ? { barcode: query } : { name: query });
                  }}
                  style={{
                    fontWeight: 700,
                    padding: '8px 18px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {__t('pos.pos_products_panel.s33', __t('pos.pos_products_panel.s23', "+ إضافة صنف جديد باسم / باركود \""))}{search}"
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {canShowScannerResults ? (
          <>
            <div className={`product-pick-grid pos-product-group-grid ${cardDensity === 'compact' ? 'pos-product-group-grid-density-compact' : ''}`}>
              {displayedGroups.map((group, index) => {
                const isSelected = index === selectedIndex;
                const isFavorite = favoriteKeySet.has(group.key);
                const priceLabel = group.minPrice === group.maxPrice
                  ? formatCurrency(group.minPrice)
                  : `${formatCurrency(group.minPrice)} - ${formatCurrency(group.maxPrice)}`;

                const rawIcon = group.products[0]?.icon;
                const showCardIcon = iconSettings.showIcons;

                if (cardDensity === 'comfortable') {
                  // Classic Comfortable Card (Default)
                  return (
                    <article key={group.key} className={`pos-group-card ${isSelected ? 'is-selected' : ''}`}>
                      <div className="pos-group-card-top">
                        <span className={`pos-group-kind ${group.hasVariants ? 'has-choices' : 'is-direct'}`}>
                          {group.hasVariants ? `${group.products.length} فرع` : __t('pos.pos_products_panel.s34', __t('pos.pos_products_panel.s24', "مباشر"))}
                        </span>
                        <button
                          type="button"
                          className={`pos-favorite-star ${isFavorite ? 'is-active' : ''}`}
                          onClick={() => toggleFavorite(group.key)}
                          aria-label={isFavorite ? __t('pos.pos_products_panel.s35', __t('pos.pos_products_panel.s25', "إزالة من المفضلة")) : __t('pos.pos_products_panel.s36', __t('pos.pos_products_panel.s26', "إضافة إلى المفضلة"))}
                        >
                          <StarIcon size={14} filled={isFavorite} color={isFavorite ? '#f59e0b' : '#94a3b8'} />
                        </button>
                      </div>

                      <button
                        ref={(node) => { groupRefs.current[index] = node; }}
                        type="button"
                        dir="rtl"
                        className="pos-group-card-action"
                        onClick={() => {
                          setSelectedIndex(index);
                          activateGroup(group);
                        }}
                        onFocus={() => setSelectedIndex(index)}
                        style={{ direction: 'rtl', textAlign: 'right' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px', width: '100%', direction: 'rtl' }}>
                          {showCardIcon && (
                            <div className="pos-card-product-icon" style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: 'var(--product-icon-color, #2563eb)',
                              border: '1px solid #e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ProductIcon name={rawIcon || 'box-package'} size={16} />
                            </div>
                          )}
                          <strong style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>{group.title}</strong>
                        </div>
                        <div className="muted small pos-group-card-meta">{groupMetaLabel(group)}</div>
                        {group.hasVariants ? (
                          <div className="pos-group-tags">
                            {group.colors.slice(0, 3).map((color) => <span key={`${group.key}-${color}`} className="pos-group-tag">{color}</span>)}
                            {group.sizes.slice(0, 3).map((size) => <span key={`${group.key}-${size}`} className="pos-group-tag">{size}</span>)}
                          </div>
                        ) : null}
                        <div className="pick-meta-row pos-pick-meta-row" style={{ direction: 'rtl', width: '100%' }}>
                          <span>{priceLabel}</span>
                          <span className="small muted">{group.hasVariants ? __t('pos.pos_products_panel.s37', __t('pos.pos_products_panel.s27', "افتح الاختيارات")) : __t('pos.pos_products_panel.s38', __t('pos.pos_products_panel.s28', "أضف الآن"))}</span>
                        </div>
                      </button>
                    </article>
                  );
                }

                // Refined Soothing Compact Card
                return (
                  <article
                    key={group.key}
                    className={`pos-group-card ${isSelected ? 'is-selected' : ''}`}
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                      border: isSelected ? '2px solid #0f172a' : '1px solid rgba(148, 163, 184, 0.28)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.12)' : '0 1px 3px rgba(15, 23, 42, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '94px',
                      position: 'relative',
                    }}
                  >
                    <button
                      ref={(node) => { groupRefs.current[index] = node; }}
                      type="button"
                      dir="rtl"
                      className="pos-group-card-action"
                      onClick={() => {
                        setSelectedIndex(index);
                        activateGroup(group);
                      }}
                      onFocus={() => setSelectedIndex(index)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'right',
                        direction: 'rtl',
                        padding: 0,
                        width: '100%',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', width: '100%', marginBottom: '6px', direction: 'rtl' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, direction: 'rtl' }}>
                          {showCardIcon && (
                            <div className="pos-card-product-icon" style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '5px',
                              background: '#f8fafc',
                              color: 'var(--product-icon-color, #2563eb)',
                              border: '1px solid #e2e8f0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ProductIcon name={rawIcon || 'box-package'} size={15} />
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong
                              style={{
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                color: '#0f172a',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                              }}
                            >
                              {group.title}
                            </strong>
                            {group.hasVariants ? (
                              <div style={{ marginTop: '3px' }}>
                                <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' }}>
                                  {group.products.length} {__t('pos.pos_products_panel.s39', __t('pos.pos_products_panel.s29', "مقاسات"))}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`pos-favorite-star ${isFavorite ? 'is-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(group.key);
                          }}
                          aria-label={isFavorite ? __t('pos.pos_products_panel.s40', __t('pos.pos_products_panel.s30', "إزالة من المفضلة")) : __t('pos.pos_products_panel.s41', __t('pos.pos_products_panel.s31', "إضافة إلى المفضلة"))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: isFavorite ? '#f59e0b' : '#cbd5e1',
                            fontSize: '1rem',
                            cursor: 'pointer',
                            padding: 0,
                            lineHeight: 1,
                            flexShrink: 0,
                          }}
                        >
                          <StarIcon size={14} filled={isFavorite} color={isFavorite ? '#f59e0b' : '#cbd5e1'} />
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid rgba(148, 163, 184, 0.16)',
                          paddingTop: '5px',
                          marginTop: 'auto',
                          width: '100%',
                        }}
                      >
                        <strong style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
                          {priceLabel}
                        </strong>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: group.hasVariants ? '#eff6ff' : '#ecfdf5',
                            color: group.hasVariants ? '#1d4ed8' : '#047857',
                            border: group.hasVariants ? '1px solid #dbeafe' : '1px solid #a7f3d0',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {group.hasVariants ? __t('pos.pos_products_panel.s42', __t('pos.pos_products_panel.s32', "خيارات ▾")) : __t('pos.pos_products_panel.s43', __t('pos.pos_products_panel.s33', "+ أضف"))}
                        </span>
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>

            {hasMoreTouchGroups ? (
              <div className="pos-touch-show-more-row" ref={sentinelRef}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTouchVisibleCount((current) => current + touchModeVisibleStep)}
                >
                  {__t('pos.pos_products_panel.s44', __t('pos.pos_products_panel.s34', "عرض المزيد"))}
                </Button>
                <span className="muted small">{__t('pos.pos_products_panel.s45', __t('pos.pos_products_panel.s35', "المعروض"))} {displayedGroups.length} {__t('pos.pos_products_panel.s46', __t('pos.pos_products_panel.s36', "من"))} {visibleGroups.length}</span>
              </div>
            ) : null}
          </>
        ) : null}
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

        <ProductIconStudioModal
          open={isStudioOpen}
          onClose={() => setIsStudioOpen(false)}
        />

        <CameraBarcodeScannerModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScan={handleCameraBarcodeScan}
          title={__t('pos.pos_products_panel.s47', __t('pos.pos_products_panel.s37', "مسح باركود الصنف بكاميرا الهاتف"))}
          continuous={true}
        />
      </div>
    </Card>
  );
}

function arePropsEqual(prev: PosProductsPanelProps, next: PosProductsPanelProps) {
  return prev.search === next.search
    && prev.priceType === next.priceType
    && prev.products === next.products
    && prev.recentProducts === next.recentProducts
    && prev.productFilter === next.productFilter
    && prev.posMode === next.posMode
    && prev.onOpenNewProduct === next.onOpenNewProduct;
}

export const PosProductsPanel = memo(PosProductsPanelComponent, arePropsEqual);
