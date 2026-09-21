import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { StorefrontProduct } from '../types/storefront.types';
import { StorefrontProductCard } from './StorefrontProductCard';
import { IconArrowUpRight } from './StorefrontIcons';

/**
 * رفّ منتجات موحّد: ترويسة + شريط تمرير أفقي.
 *
 * **لماذا وُحِّد:** كانت الصفحة الرئيسية تعرض ثلاثة أشكال مختلفة لنفس الفكرة —
 * شبكة للعروض، ورفّ بلا أسهم للأقسام، و`StorefrontHorizontalCarousel` منفصل
 * للقسم الثالث فقط. ثلاث ترويسات بثلاثة تنسيقات في صفحة واحدة.
 *
 * ومشكلة الترويسة القديمة تحديداً: `flexWrap: 'wrap'` مع عنوان طويل وبلا أي
 * تحكم في الانكماش، فكانت مجموعة الأزرار («عرض الكل» والأسهم) **تنزل لسطر
 * ثانٍ** وتترك فراغاً مكسوراً. هنا العنوان وحده هو ما ينكمش (`min-width: 0`
 * و`text-overflow: ellipsis`)، والأزرار لا تنزل أبداً (`flex-shrink: 0`).
 */

type Props = {
  /** الاسم المعروض في الشارة (اسم القسم عادة) */
  badge: string;
  /** سطر وصفي بجانب الشارة — يُخفى على الموبايل */
  subtitle?: string;
  /** نص زر عرض الكل */
  viewAllLabel: string;
  products: StorefrontProduct[];
  cartMap: Map<number, number>;
  whatsappPhone?: string;
  favoriteIds?: Set<number>;
  isSmartDeal?: boolean;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onViewAll: () => void;
  onOpenReviewModal?: (product: StorefrontProduct) => void;
  onToggleFavorite?: (productId: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
};

export const StorefrontShelfSection = React.memo(function StorefrontShelfSection({
  badge,
  subtitle,
  viewAllLabel = 'عرض كل أصناف القسم',
  products,
  cartMap,
  whatsappPhone,
  favoriteIds,
  isSmartDeal,
  onAddToCart,
  onUpdateQuantity,
  onViewAll,
  onOpenReviewModal,
  onToggleFavorite,
  onQuickView,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScroll, setCanScroll] = useState(false);

  // الأسهم تظهر فقط عندما يكون هناك ما يُمرَّر إليه فعلاً
  const syncScrollability = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth - el.clientWidth > 8;
    setCanScroll((prev) => (prev !== scrollable ? scrollable : prev));
  }, []);

  useEffect(() => {
    syncScrollability();
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(syncScrollability);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncScrollability, products.length]);

  /**
   * `prev`/`next` منطقيان لا بصريان: في RTL يتكفّل المتصفح بعكس الاتجاه، فلا
   * نحتاج التعامل مع إشارة `scrollLeft` يدوياً (وهي تختلف بين المتصفحات).
   */
  const scrollBy = (direction: 'prev' | 'next') => {
    const el = trackRef.current;
    if (!el) return;
    const firstItem = el.querySelector<HTMLElement>('.storefront-shelf-item');
    const step = firstItem ? firstItem.offsetWidth + 16 : 226;
    el.scrollBy({ left: direction === 'next' ? step : -step, behavior: 'smooth' });
  };

  const arrowStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    flexShrink: 0,
  };

  return (
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
      <div
        className="storefront-cat-shelf-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
          gap: '12px',
          // بلا `wrap`: الأزرار لا تنزل لسطر ثانٍ مهما طال العنوان
          flexWrap: 'nowrap',
        }}
      >
        {/* المجموعة الوحيدة المسموح لها بالانكماش */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
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
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {badge}
          </span>
          {subtitle && (
            <span
              className="storefront-deals-subtitle"
              style={{
                fontSize: '12.5px',
                color: '#64748b',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {canScroll && (
            <div className="storefront-shelf-arrows" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => scrollBy('prev')}
                title="السابق"
                aria-label="السابق"
                style={arrowStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scrollBy('next')}
                title="التالي"
                aria-label="التالي"
                style={arrowStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onViewAll}
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
              whiteSpace: 'nowrap',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <span className="storefront-shelf-viewall-label">{viewAllLabel}</span>
            <IconArrowUpRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div className="storefront-shelf-wrapper">
        {/* Floating Right Chevron (Previous in RTL) */}
        {canScroll && (
          <button
            type="button"
            className="storefront-shelf-floating-arrow storefront-shelf-arrow-prev"
            onClick={() => scrollBy('prev')}
            aria-label="السابق"
            title="السابق"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div
          className="storefront-shelf"
          ref={trackRef}
        >
          {products.map((product) => (
            <div className="storefront-shelf-item" key={product.id}>
              <StorefrontProductCard
                product={product}
                cartQuantity={cartMap.get(product.id) || 0}
                whatsappPhone={whatsappPhone}
                isSmartDeal={isSmartDeal}
                onAddToCart={onAddToCart}
                onUpdateQuantity={onUpdateQuantity}
                onOpenReviewModal={onOpenReviewModal}
                isFavorite={favoriteIds?.has(product.id)}
                onToggleFavorite={onToggleFavorite}
                onQuickView={onQuickView}
              />
            </div>
          ))}
        </div>

        {/* Floating Left Chevron (Next in RTL) */}
        {canScroll && (
          <button
            type="button"
            className="storefront-shelf-floating-arrow storefront-shelf-arrow-next"
            onClick={() => scrollBy('next')}
            aria-label="التالي"
            title="التالي"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});
