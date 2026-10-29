import React from 'react';
import type { StorefrontCategory, StorefrontProduct } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';

interface StorefrontBentoShowcaseProps {
  categories: StorefrontCategory[];
  categoryCounts: Map<number | 'all', number>;
  featuredProducts: StorefrontProduct[];
  onSelectCategory: (categoryId: number) => void;
  onSelectDeals: () => void;
  onQuickView?: (product: StorefrontProduct) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}

export const StorefrontBentoShowcase = React.memo(function StorefrontBentoShowcase({
  categories,
  categoryCounts,
  featuredProducts,
  onSelectCategory,
  onSelectDeals,
  onQuickView,
  onAddToCart,
}: StorefrontBentoShowcaseProps) {
  if (!categories || categories.length === 0) return null;

  const primaryCat = categories[0];
  const secondaryCats = categories.slice(1, 4);
  const lookbookProduct = featuredProducts[1] || featuredProducts[0];

  return (
    <section
      className="storefront-bento-section"
      style={{
        margin: '8px 0 12px',
      }}
    >
      {/* Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--storefront-primary-color, #170e5e)', marginBottom: '2px' }}>
            تسوق حسب القسم
          </div>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.15rem, 2vw, 1.45rem)', fontWeight: 900, color: '#0f172a' }}>
            تصفح كل الأقسام والمنتجات المتوفرة
          </h2>
        </div>
        <button
          type="button"
          onClick={onSelectDeals}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--storefront-primary-color, #170e5e)',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            padding: '4px 0',
            whiteSpace: 'nowrap',
          }}
        >
          عرض كل التخفيضات ←
        </button>
      </div>

      {/* Asymmetric Bento Grid */}
      <div className="storefront-bento-grid">
        {/* Large Flagship Category Card (Cover background + subtle dark gradient overlay) */}
        {primaryCat && (
          <div
            onClick={() => onSelectCategory(primaryCat.id)}
            className="storefront-bento-card storefront-bento-card-hero"
            style={{
              backgroundImage: `linear-gradient(110deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.65) 55%, rgba(15, 23, 42, 0.32) 100%), url("${primaryCat.imageUrl || generatePremiumProductSvg(primaryCat.name, primaryCat.name)}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '260px',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.14)',
            }}
          >
            <div style={{ position: 'relative', zIndex: 2, maxWidth: '72%' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#fbbf24', marginBottom: '6px', fontVariantNumeric: 'tabular-nums' }}>
                الأكثر طلباً · {categoryCounts.get(primaryCat.id) || 12} منتج متوفر
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 900, color: '#ffffff', lineHeight: 1.25 }}>
                {primaryCat.name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.55 }}>
                تشكيلة متنوعة بجودة مضمونة وأسعار مناسبة مع توصيل سريع.
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 2, marginTop: '18px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'var(--storefront-primary-color, #170e5e)',
                  color: '#ffffff',
                  padding: '0 14px',
                  height: '35px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                  boxSizing: 'border-box',
                }}
              >
                <span>تصفح القسم</span>
                <span>←</span>
              </span>
            </div>
          </div>
        )}

        {/* Secondary Category Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
          }}
        >
          {secondaryCats.map((cat) => {
            const count = categoryCounts.get(cat.id) || 8;

            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="storefront-bento-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '22px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  gap: '12px',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      aspectRatio: '1 / 1',
                      borderRadius: '16px',
                      background: '#ffffff',
                      padding: '8px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={cat.imageUrl || generatePremiumProductSvg(cat.name, cat.name)}
                      alt={cat.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 500,
                      color: '#64748b',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {count} صنف
                  </span>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                    {cat.name}
                  </h4>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--storefront-primary-color, #170e5e)' }}>
                    استكشف التشكيلة ←
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Curated Lookbook / Editor's Pick Card */}
        {lookbookProduct && (() => {
          const isLookbookOutOfStock = !lookbookProduct.inStock || lookbookProduct.stockQty <= 0;
          return (
            <div
              className="storefront-bento-card"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '24px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--storefront-primary-color, #170e5e)', marginBottom: '4px' }}>
                  عرض مميز هذا الأسبوع
                </div>
                <h4
                  onClick={() => onQuickView?.(lookbookProduct)}
                  style={{
                    margin: '0 0 6px',
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#0f172a',
                    cursor: 'pointer',
                    lineHeight: 1.35,
                  }}
                >
                  {lookbookProduct.name}
                </h4>
                <div
                  style={{
                    fontSize: '17px',
                    fontWeight: 900,
                    color: 'var(--storefront-primary-color, #170e5e)',
                    fontVariantNumeric: 'tabular-nums',
                    marginBottom: '10px',
                  }}
                >
                  {lookbookProduct.price.toLocaleString('en-US')} <CurrencySymbol />
                </div>
                <button
                  type="button"
                  disabled={isLookbookOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLookbookOutOfStock) onAddToCart(lookbookProduct);
                  }}
                  style={{
                    background: isLookbookOutOfStock ? '#e2e8f0' : 'var(--storefront-primary-color, #170e5e)',
                    color: isLookbookOutOfStock ? '#64748b' : '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '12px',
                    height: '35px',
                    padding: '0 16px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: isLookbookOutOfStock ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isLookbookOutOfStock ? 'غير متوفر' : 'أضف إلى السلة'}
                </button>
              </div>

              <div
                onClick={() => onQuickView?.(lookbookProduct)}
                style={{
                  width: '108px',
                  height: '108px',
                  aspectRatio: '1 / 1',
                  borderRadius: '14px',
                  background: '#ffffff',
                  padding: '12px',
                  boxSizing: 'border-box',
                  border: 'none',
                  flexShrink: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={lookbookProduct.imageUrl || resolveProductPhoto(lookbookProduct.name, lookbookProduct.categoryName).url}
                  alt={lookbookProduct.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
});
