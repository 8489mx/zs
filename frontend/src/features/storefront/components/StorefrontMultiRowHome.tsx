import React from 'react';
import type { StorefrontProduct, StorefrontCategory, StorefrontInfo } from '../types/storefront.types';
import { StorefrontShelfSection } from './StorefrontShelfSection';
import { IconFolder } from './StorefrontIcons';

interface TopHomepageSection {
  categoryId: number;
  categoryName: string;
  products: StorefrontProduct[];
  totalCount: number;
}

interface StorefrontMultiRowHomeProps {
  dealsProducts: StorefrontProduct[];
  topHomepageSections: TopHomepageSection[];
  categories: StorefrontCategory[];
  cartMap: Map<number, number>;
  info: StorefrontInfo;
  favoriteIds: Set<number>;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onOpenReviewModal: (product: StorefrontProduct) => void;
  onToggleFavorite: (productId: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
  onSelectDeals: () => void;
  onSelectCategory: (categoryId: number) => void;
  onOpenCategoriesModal: () => void;
}

export function StorefrontMultiRowHome({
  dealsProducts,
  topHomepageSections,
  categories,
  cartMap,
  info,
  favoriteIds,
  onAddToCart,
  onUpdateQuantity,
  onOpenReviewModal,
  onToggleFavorite,
  onQuickView,
  onSelectDeals,
  onSelectCategory,
  onOpenCategoriesModal,
}: StorefrontMultiRowHomeProps) {
  return (
    <div className="storefront-homepage-sections">
      {/* Row 1: Deals Spotlight */}
      {dealsProducts.length > 0 && (
        <StorefrontShelfSection
          badge="عروض وتخفيضات حصرية"
          subtitle="أقوى الخصومات والأسعار المخفضة"
          viewAllLabel={`عرض كل العروض (${dealsProducts.length})`}
          products={dealsProducts.slice(0, 12)}
          cartMap={cartMap}
          whatsappPhone={info.whatsappPhone}
          favoriteIds={favoriteIds}
          isSmartDeal
          onAddToCart={onAddToCart}
          onUpdateQuantity={onUpdateQuantity}
          onOpenReviewModal={onOpenReviewModal}
          onToggleFavorite={onToggleFavorite}
          onQuickView={onQuickView}
          onViewAll={onSelectDeals}
        />
      )}

      {/* Wide Horizontal Category Cards (Full Width Shelves) */}
      {topHomepageSections.map((section) => (
        <StorefrontShelfSection
          key={section.categoryId}
          badge={section.categoryName}
          subtitle={`أفضل منتجات ${section.categoryName} بأسعار الجملة`}
          viewAllLabel={`عرض كل أصناف القسم (${section.totalCount})`}
          products={section.products.slice(0, 12)}
          cartMap={cartMap}
          whatsappPhone={info.whatsappPhone}
          favoriteIds={favoriteIds}
          onAddToCart={onAddToCart}
          onUpdateQuantity={onUpdateQuantity}
          onOpenReviewModal={onOpenReviewModal}
          onToggleFavorite={onToggleFavorite}
          onQuickView={onQuickView}
          onViewAll={() => {
            onSelectCategory(section.categoryId);
            window.scrollTo({ top: 120, behavior: 'smooth' });
          }}
        />
      ))}

      {/* Bottom Invitation Banner to browse remaining categories */}
      <div
        style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          استكشف باقي أقسام المتجر ({categories.length} قسم متاح)
        </h4>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
          نوفر تشكيلة واسعة من كافة المواد الغذائية والمنظفات ومستلزمات البيت
        </p>
        <button
          type="button"
          onClick={onOpenCategoriesModal}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            background: '#170e5e',
            color: '#ffffff',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <IconFolder size={16} strokeWidth={2} />
          <span>تصفح جميع الأقسام والمنتجات</span>
        </button>
      </div>
    </div>
  );
}
