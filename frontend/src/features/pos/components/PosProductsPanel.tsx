import type { Ref } from 'react';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { formatCurrency } from '@/lib/format';
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
  contextBadges: Array<{ key: string; label: string }>;
  onAddProduct: (product: Product) => void;
  productFilter: 'all' | 'offers' | 'priced' | 'low' | 'recent';
  onProductFilterChange: (value: 'all' | 'offers' | 'priced' | 'low' | 'recent') => void;
  scannerMessage: string;
  searchInputRef?: Ref<HTMLInputElement>;
}

export function PosProductsPanel({
  search,
  onSearchChange,
  onSearchSubmitFirstResult,
  priceType,
  onPriceTypeChange,
  products,
  recentProducts,
  contextBadges,
  onAddProduct,
  productFilter,
  onProductFilterChange,
  scannerMessage,
  searchInputRef,
}: PosProductsPanelProps) {
  return (
    <Card
      title="1. اختيار الأصناف"
      description="ابحث بالاسم أو اضرب الباركود من نفس الخانة، ثم أضف الصنف مباشرة إلى السلة."
      actions={<span className="nav-pill">{products.length} صنف</span>}
      className="workspace-panel pos-products-card pos-products-card-compact"
    >
      <div className="pos-products-static">
        {contextBadges.length ? (
          <div className="badge-row pos-context-chip-row pos-context-chip-row-compact">
            {contextBadges.map((badge) => <span key={badge.key} className="cashier-chip">{badge.label}</span>)}
          </div>
        ) : null}

        <div className="pos-toolbar-shell pos-toolbar-shell-compact">
          <div className="pos-products-toolbar-stack">
            <div className="pos-products-top-row pos-products-top-row-unified">
              <div className="pos-products-unified-search-field"><Field label="ابحث بالاسم أو اضرب الباركود">
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onSearchSubmitFirstResult();
                    }
                  }}
                  placeholder="اكتب اسم الصنف أو اضرب الباركود هنا"
                />
              </Field></div>

              <Field label="نوع السعر">
                <select value={priceType} onChange={(event) => onPriceTypeChange(event.target.value === 'wholesale' ? 'wholesale' : 'retail')}>
                  <option value="retail">قطاعي</option>
                  <option value="wholesale">جملة</option>
                </select>
              </Field>

              <div className="field pos-products-reset-field">
                <span>إجراء</span>
                <Button type="button" variant="secondary" onClick={() => { onSearchChange(''); onProductFilterChange('all'); }}>
                  تفريغ
                </Button>
              </div>
            </div>
          </div>
        </div>

        {scannerMessage ? <div className="success-box pos-compact-message">{scannerMessage}</div> : null}

        <div className="filter-chip-row pos-filter-row pos-filter-row-compact">
          <Button type="button" variant={productFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onProductFilterChange('all')}>الكل</Button>
          <Button type="button" variant={productFilter === 'offers' ? 'primary' : 'secondary'} onClick={() => onProductFilterChange('offers')}>بعروض</Button>
          <Button type="button" variant={productFilter === 'priced' ? 'primary' : 'secondary'} onClick={() => onProductFilterChange('priced')}>أسعار خاصة</Button>
          <Button type="button" variant={productFilter === 'low' ? 'primary' : 'secondary'} onClick={() => onProductFilterChange('low')}>منخفضة</Button>
          <Button type="button" variant={productFilter === 'recent' ? 'primary' : 'secondary'} onClick={() => onProductFilterChange('recent')}>الأحدث</Button>
        </div>

        {recentProducts.length ? (
          <div className="list-stack pos-surface-panel pos-recent-panel pos-recent-panel-compact">
            <strong>آخر استخدام</strong>
            <div className="badge-row pos-recent-buttons-row">
              {recentProducts.map((product) => (
                <Button key={product.id} type="button" variant="secondary" onClick={() => onAddProduct(product)}>{product.name}</Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pos-products-scroll">
        {!products.length ? <div className="surface-note pos-compact-empty">لا توجد أصناف مطابقة الآن. جرّب بحثًا آخر أو ألغِ الفلاتر.</div> : null}
        <div className="product-pick-grid pos-product-pick-grid pos-product-pick-grid-compact">
          {products.map((product) => {
            const isLowStock = Number(product.stock || 0) <= Math.max(Number(product.minStock || 0), 0);
            const price = priceType === 'wholesale' ? (product.wholesalePrice || product.retailPrice) : product.retailPrice;
            return (
              <button key={product.id} type="button" className="product-pick-card pos-product-card pos-product-card-compact" onClick={() => onAddProduct(product)}>
                <div className="product-card-top-row">
                  <strong>{product.name}</strong>
                  <span className={isLowStock ? 'low-stock-badge' : 'status-badge status-posted'}>{product.stock}</span>
                </div>
                <div className="muted small">{product.barcode || 'بدون باركود'}</div>
                <div className="muted small">{product.units?.map((unit) => unit.name).join(' / ') || 'قطعة'}</div>
                <div className="pick-meta-row pos-pick-meta-row">
                  <span>{formatCurrency(Number(price || 0))}</span>
                  <span className="small muted">انقر للإضافة</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
