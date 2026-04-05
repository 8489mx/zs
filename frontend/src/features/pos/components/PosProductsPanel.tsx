import type { Ref } from 'react';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SearchToolbar } from '@/components/shared/SearchToolbar';
import { formatCurrency } from '@/lib/format';
import type { Product } from '@/types/domain';
import type { PosPriceType } from '@/features/pos/types/pos.types';

interface PosProductsPanelProps {
  search: string;
  onSearchChange: (value: string) => void;
  priceType: PosPriceType;
  onPriceTypeChange: (value: PosPriceType) => void;
  products: Product[];
  recentProducts: Product[];
  contextBadges: Array<{ key: string; label: string }>;
  onAddProduct: (product: Product) => void;
  productFilter: 'all' | 'offers' | 'priced' | 'low' | 'recent';
  onProductFilterChange: (value: 'all' | 'offers' | 'priced' | 'low' | 'recent') => void;
  quickAddCode: string;
  onQuickAddCodeChange: (value: string) => void;
  onQuickAddCodeSubmit: (value?: string) => boolean;
  scannerMessage: string;
  searchInputRef?: Ref<HTMLInputElement>;
  quickAddInputRef?: Ref<HTMLInputElement>;
}

export function PosProductsPanel({
  search,
  onSearchChange,
  priceType,
  onPriceTypeChange,
  products,
  recentProducts,
  contextBadges,
  onAddProduct,
  productFilter,
  onProductFilterChange,
  quickAddCode,
  onQuickAddCodeChange,
  onQuickAddCodeSubmit,
  scannerMessage,
  searchInputRef,
  quickAddInputRef,
}: PosProductsPanelProps) {
  return (
    <Card
      title="اختيار الأصناف"
      actions={<span className="nav-pill">{products.length} صنف</span>}
      className="workspace-panel pos-products-card pos-products-card-compact"
    >
      <div className="pos-products-static">
        {contextBadges.length ? (
          <div className="badge-row pos-context-chip-row pos-context-chip-row-compact">
            {contextBadges.map((badge) => <span key={badge.key} className="cashier-chip">{badge.label}</span>)}
          </div>
        ) : null}

        <SearchToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="ابحث بالاسم أو الباركود"
          onReset={() => { onSearchChange(''); onProductFilterChange('all'); }}
          resetLabel="تفريغ"
          inputRef={searchInputRef}
          className="pos-toolbar-shell pos-toolbar-shell-compact"
        >
          <Field label="السعر">
            <select value={priceType} onChange={(event) => onPriceTypeChange(event.target.value === 'wholesale' ? 'wholesale' : 'retail')}>
              <option value="retail">قطاعي</option>
              <option value="wholesale">جملة</option>
            </select>
          </Field>
          <Field label="باركود سريع">
            <div className="inline-create-row pos-quick-add-row">
              <input
                ref={quickAddInputRef}
                value={quickAddCode}
                onChange={(event) => onQuickAddCodeChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onQuickAddCodeSubmit();
                  }
                }}
                placeholder="امسح أو اكتب الكود"
              />
              <Button type="button" variant="secondary" onClick={() => onQuickAddCodeSubmit()} disabled={!quickAddCode.trim()}>
                إضافة
              </Button>
            </div>
          </Field>
        </SearchToolbar>

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
        {!products.length ? <EmptyState title="لا توجد أصناف مطابقة" hint="جرّب بحثًا آخر أو ألغِ الفلاتر." /> : null}
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
