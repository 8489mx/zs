import type { StorefrontProduct, StorefrontCategory, StorefrontInfo } from '../types/storefront.types';
import { StorefrontProductCard } from './StorefrontProductCard';
import { IconSearch } from './StorefrontIcons';

interface StorefrontFilteredGridProps {
  searchTerm: string;
  onlyFavorites: boolean;
  onlyDeals: boolean;
  selectedCategory: number | 'all';
  categories: StorefrontCategory[];
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'name';
  onSortChange: (val: any) => void;
  onGoHome: () => void;
  filteredProducts: StorefrontProduct[];
  paginatedProducts: StorefrontProduct[];
  hasMore: boolean;
  onLoadMore: () => void;
  cartMap: Map<number, number>;
  info: StorefrontInfo;
  smartDealProductIds: Set<number>;
  favoriteIds: Set<number>;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onOpenReviewModal: (product: StorefrontProduct) => void;
  onToggleFavorite: (productId: number) => void;
}

export function StorefrontFilteredGrid({
  searchTerm,
  onlyFavorites,
  onlyDeals,
  selectedCategory,
  categories,
  sortBy,
  onSortChange,
  onGoHome,
  filteredProducts,
  paginatedProducts,
  hasMore,
  onLoadMore,
  cartMap,
  info,
  smartDealProductIds,
  favoriteIds,
  onAddToCart,
  onUpdateQuantity,
  onOpenReviewModal,
  onToggleFavorite,
}: StorefrontFilteredGridProps) {
  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const title = searchTerm
    ? `بحث: "${searchTerm}"`
    : onlyFavorites
    ? 'المنتجات المفضلة'
    : onlyDeals
    ? 'العروض والتخفيضات'
    : `${currentCategory?.name || 'القسم المختار'}`;

  return (
    <div id="storefront-products-section">
      {/* Filter & Sorting Controls Bar */}
      <div
        className="storefront-filter-header"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '8px 12px',
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
        }}
      >
        {/* Home Return Button */}
        <button
          type="button"
          onClick={onGoHome}
          title="العودة للصفحة الرئيسية"
          aria-label="العودة للصفحة الرئيسية"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#170e5e',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>

        {/* Title & Count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '13px',
              fontWeight: 800,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={title}
          >
            {title}
          </h2>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              background: onlyFavorites ? '#fef2f2' : '#f0f3ff',
              color: onlyFavorites ? '#dc2626' : '#170e5e',
              border: onlyFavorites ? '1px solid #fecaca' : 'none',
              padding: '2px 6px',
              borderRadius: '5px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {filteredProducts.length} صنف
          </span>
        </div>

        {/* Compact Sorting Icon Button with Native Select Overlay */}
        <div
          title="ترتيب المنتجات"
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#1e293b',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="17" y1="12" x2="7" y2="12" />
            <line x1="13" y1="18" x2="11" y2="18" />
          </svg>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as any)}
            aria-label="ترتيب المنتجات"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            <option value="featured">المتوفر أولاً (افتراضي)</option>
            <option value="price-asc">السعر: من الأقل للأعلى</option>
            <option value="price-desc">السعر: من الأعلى للأقل</option>
            <option value="name">أبجدياً (أ - ي)</option>
          </select>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1',
            padding: '50px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            {onlyFavorites ? (
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            ) : (
              <IconSearch size={36} color="#94a3b8" />
            )}
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
            {onlyFavorites ? 'قائمتك المفضلة فارغة حالياً' : 'لا توجد منتجات مطابقة'}
          </h3>
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#94a3b8' }}>
            {onlyFavorites
              ? 'اضغط على رمز القلب في أي منتج لإضافته إلى قائمتك المفضلة والوصول إليه بسرعة في أي وقت.'
              : 'جرب البحث باسم صنف آخر أو تصفح الأقسام الأخرى.'}
          </p>
          <button
            type="button"
            onClick={onGoHome}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {onlyFavorites ? 'تصفح جميع المنتجات' : 'العودة للصفحة الرئيسية'}
          </button>
        </div>
      ) : (
        <>
          <div className="storefront-products-grid">
            {paginatedProducts.map((product) => (
              <StorefrontProductCard
                key={product.id}
                product={product}
                cartQuantity={cartMap.get(product.id) || 0}
                whatsappPhone={info.whatsappPhone}
                onAddToCart={onAddToCart}
                onUpdateQuantity={onUpdateQuantity}
                isSmartDeal={smartDealProductIds.has(product.id)}
                onOpenReviewModal={onOpenReviewModal}
                isFavorite={favoriteIds.has(product.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '28px' }}>
              <button
                type="button"
                onClick={onLoadMore}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                عرض المزيد من المنتجات ({filteredProducts.length - paginatedProducts.length} متبقي) ↓
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
