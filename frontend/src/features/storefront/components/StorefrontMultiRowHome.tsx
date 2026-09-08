import React from 'react';
import type { StorefrontProduct, StorefrontCategory, StorefrontInfo } from '../types/storefront.types';
import { StorefrontProductCard } from './StorefrontProductCard';
import { StorefrontHorizontalCarousel } from './StorefrontHorizontalCarousel';
import { IconFlame, IconFolder, IconArrowUpRight } from './StorefrontIcons';

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
  onSelectDeals,
  onSelectCategory,
  onOpenCategoriesModal,
}: StorefrontMultiRowHomeProps) {
  return (
    <div className="storefront-homepage-sections">
      {/* Row 1: Deals Spotlight */}
      {dealsProducts.length > 0 && (
        <div
          className="storefront-section-card"
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #fee2e2',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)',
          }}
        >
          <div
            className="storefront-deals-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              borderBottom: '1px solid #fef2f2',
              paddingBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IconFlame size={14} color="#ffffff" strokeWidth={2.2} />
                <span>عروض وتخفيضات حصرية</span>
              </span>
              <span className="storefront-deals-subtitle" style={{ fontSize: '12.5px', color: '#64748b' }}>
                أقوى الخصومات والأسعار المخفضة
              </span>
            </div>

            <button
              type="button"
              onClick={onSelectDeals}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>عرض كل العروض ({dealsProducts.length})</span>
              <IconArrowUpRight size={14} strokeWidth={2.2} />
            </button>
          </div>

          <div className="storefront-products-grid">
            {dealsProducts.slice(0, 4).map((product) => (
              <StorefrontProductCard
                key={product.id}
                product={product}
                cartQuantity={cartMap.get(product.id) || 0}
                whatsappPhone={info.whatsappPhone}
                onAddToCart={onAddToCart}
                onUpdateQuantity={onUpdateQuantity}
                isSmartDeal={true}
                onOpenReviewModal={onOpenReviewModal}
                isFavorite={favoriteIds.has(product.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Wide Horizontal Category Cards (Full Width Shelves) */}
      {topHomepageSections.map((section, idx) => (
        <React.Fragment key={section.categoryId}>
          {/* Visual Accent: Section 3 renders as a smooth Horizontal Carousel */}
          {idx === 2 ? (
            <StorefrontHorizontalCarousel
              title={`الأكثر طلباً في قسم ${section.categoryName}`}
              badge="رائج الآن"
              totalCount={section.totalCount}
              products={section.products}
              cartMap={cartMap}
              whatsappPhone={info.whatsappPhone}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
              onOpenReviewModal={onOpenReviewModal}
              onViewAll={() => {
                onSelectCategory(section.categoryId);
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }}
            />
          ) : (
            <div
              className="storefront-section-card"
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              }}
            >
              {/* Wide Shelf Header */}
              <div
                className="storefront-cat-shelf-header"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: '#170e5e',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 800,
                      padding: '4px 12px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {section.categoryName}
                  </span>
                  <span className="storefront-deals-subtitle" style={{ fontSize: '12.5px', color: '#64748b' }}>
                    أفضل منتجات {section.categoryName} بأسعار الجملة
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory(section.categoryId);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#170e5e',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>عرض كل أصناف القسم ({section.totalCount})</span>
                  <IconArrowUpRight size={14} strokeWidth={2.2} />
                </button>
              </div>

              {/* 4 Full Sized Product Cards in Horizontal Row */}
              <div className="storefront-products-grid">
                {section.products.slice(0, 4).map((product) => (
                  <StorefrontProductCard
                    key={product.id}
                    product={product}
                    cartQuantity={cartMap.get(product.id) || 0}
                    whatsappPhone={info.whatsappPhone}
                    onAddToCart={onAddToCart}
                    onUpdateQuantity={onUpdateQuantity}
                    onOpenReviewModal={onOpenReviewModal}
                    isFavorite={favoriteIds.has(product.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </div>
          )}
        </React.Fragment>
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
