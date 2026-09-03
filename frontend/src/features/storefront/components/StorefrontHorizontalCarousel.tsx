import React, { useRef } from 'react';
import { StorefrontProduct } from '../types/storefront.types';
import { StorefrontProductCard } from './StorefrontProductCard';
import { IconArrowUpRight } from './StorefrontIcons';

interface StorefrontHorizontalCarouselProps {
  title: string;
  badge?: string;
  totalCount: number;
  products: StorefrontProduct[];
  cartMap: Map<number, number>;
  whatsappPhone?: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onViewAll: () => void;
}

export const StorefrontHorizontalCarousel = React.memo(function StorefrontHorizontalCarousel({
  title,
  badge = 'تشكيلة مختارة',
  totalCount,
  products,
  cartMap,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
  onViewAll,
}: StorefrontHorizontalCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 320;
    // In RTL, scrolling right goes backwards (positive) or left (negative)
    // We scroll smooth using standard scrollBy
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
        direction: 'rtl',
      }}
    >
      {/* Header with Title and Scroll Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
            {title}
          </h3>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: '#f0f3ff',
              color: '#170e5e',
              border: '1px solid #d8e0fc',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {badge}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#64748b',
            }}
          >
            ({totalCount} صنف)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Arrow Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleScroll('right')}
              title="السابق"
              style={{
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
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleScroll('left')}
              title="التالي"
              style={{
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
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

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
              padding: '4px 8px',
            }}
          >
            <span>عرض الكل</span>
            <IconArrowUpRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Track */}
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: '16px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          paddingBottom: '8px',
          scrollbarWidth: 'none', // Hide default scrollbar on Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            style={{
              flex: '0 0 240px',
              scrollSnapAlign: 'start',
              minWidth: '240px',
            }}
          >
            <StorefrontProductCard
              product={product}
              cartQuantity={cartMap.get(product.id) || 0}
              whatsappPhone={whatsappPhone}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
