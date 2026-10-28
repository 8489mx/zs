import React, { useState, useMemo } from 'react';
import type { StorefrontInfo, StorefrontProduct, StorefrontCategory } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconShoppingCart, IconCheckCircle, IconArrowUpRight } from './StorefrontIcons';

interface StorefrontHeroEditorialProps {
  info: StorefrontInfo;
  featuredProducts: StorefrontProduct[];
  categories: StorefrontCategory[];
  cartMap: Map<number, number>;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onQuickView: (product: StorefrontProduct) => void;
  onSelectDeals: () => void;
  onSelectCategory: (categoryId: number) => void;
  onOpenCategoriesModal: () => void;
}

// Preset badges for the 3D coverflow product deck
const CARD_BADGES = [
  'عرض محدود',
  'وصل حديثاً',
  'خصم خاص',
  'أفضل تقييم',
  'تخفيضات اليوم',
  'الأكثر مبيعاً',
  'مختاراتنا',
];

// Pure GPU 3D Coverflow transforms by offset from center (-3 to +3)
// Fixed layout width/height (ZERO DOM reflow or page shake on hover!)
// Milder angles (14deg - 22deg) so side cards remain clearly visible and readable
function getCoverflowTransform(offset: number, isHovered: boolean, hoveredOffset: number | null) {
  const isActiveHero = isHovered || (hoveredOffset === null && offset === 0);

  if (isActiveHero) {
    return {
      transform: isHovered
        ? 'perspective(1100px) rotateY(0deg) translateY(-8px) scale(1.12)'
        : 'perspective(1100px) rotateY(0deg) translateY(-2px) scale(1.1)',
      zIndex: 40,
      opacity: 1,
      isHighlighted: true,
    };
  }

  // If a side card is hovered, the center card gently steps back via GPU transform only
  if (offset === 0 && hoveredOffset !== null) {
    const tiltSign = hoveredOffset > 0 ? -1 : 1;
    const rotY = tiltSign * 14;
    return {
      transform: `perspective(1000px) rotateY(${rotY}deg) translateY(6px) scale(0.96)`,
      zIndex: 20,
      opacity: 0.96,
      isHighlighted: false,
    };
  }

  const abs = Math.abs(offset);
  const sign = offset < 0 ? -1 : 1;

  if (abs === 1) {
    const rotY = sign * 15;
    return {
      transform: `perspective(1000px) rotateY(${rotY}deg) translateY(6px) scale(0.96)`,
      zIndex: 20,
      opacity: 0.98,
      isHighlighted: false,
    };
  }

  if (abs === 2) {
    const rotY = sign * 19;
    return {
      transform: `perspective(1000px) rotateY(${rotY}deg) translateY(14px) scale(0.89)`,
      zIndex: 12,
      opacity: 0.95,
      isHighlighted: false,
    };
  }

  // abs >= 3
  const rotY = sign * 22;
  return {
    transform: `perspective(1000px) rotateY(${rotY}deg) translateY(22px) scale(0.82)`,
    zIndex: 6,
    opacity: 0.92,
    isHighlighted: false,
  };
}

export const StorefrontHeroEditorial = React.memo(function StorefrontHeroEditorial({
  info,
  featuredProducts,
  categories,
  cartMap,
  onAddToCart,
  onUpdateQuantity,
  onQuickView,
  onSelectDeals,
  onSelectCategory,
  onOpenCategoriesModal,
}: StorefrontHeroEditorialProps) {
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  // Build a 7-card deck for the symmetrical 3D Coverflow (3 Left + 1 Center + 3 Right)
  const deckProducts = useMemo(() => {
    if (!featuredProducts || featuredProducts.length === 0) return [];
    if (featuredProducts.length >= 7) return featuredProducts.slice(0, 7);
    const list: StorefrontProduct[] = [];
    const targetLen = Math.min(7, featuredProducts.length >= 5 ? 7 : featuredProducts.length);
    for (let i = 0; i < targetLen; i++) {
      list.push(featuredProducts[i % featuredProducts.length]);
    }
    return list;
  }, [featuredProducts]);

  const [centerIdx, setCenterIdx] = useState<number>(3);
  const effectiveCenterIdx = deckProducts.length > 0
    ? Math.min(centerIdx, deckProducts.length - 1)
    : 0;

  // Arrange products so the selected center product sits in the middle slot (slot 3)
  const orderedDeck = useMemo(() => {
    if (deckProducts.length < 7) {
      return deckProducts.map((product, originalIdx) => ({ product, originalIdx }));
    }
    const midSlot = 3;
    const result: Array<{ product: StorefrontProduct; originalIdx: number }> = [];
    for (let slot = 0; slot < 7; slot++) {
      const idx = (effectiveCenterIdx + (slot - midSlot) + deckProducts.length) % deckProducts.length;
      result.push({ product: deckProducts[idx], originalIdx: idx });
    }
    return result;
  }, [deckProducts, effectiveCenterIdx]);

  const handleInstantAdd = (e: React.MouseEvent, product: StorefrontProduct) => {
    e.stopPropagation();
    if (!product.inStock || product.stockQty <= 0) return;
    onAddToCart(product);
    setJustAddedId(product.id);
    window.setTimeout(() => {
      setJustAddedId((curr) => (curr === product.id ? null : curr));
    }, 1200);
  };

  return (
    <section
      className="storefront-pallet-hero"
      style={{
        position: 'relative',
        background: 'radial-gradient(ellipse 90% 70% at 50% 15%, #ffffff 0%, #f4f7fb 55%, #eaeff7 100%)',
        color: '#0f172a',
        padding: '40px 16px 48px',
        overflow: 'hidden',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        userSelect: 'none',
      }}
    >
      <style>{`
        .storefront-coverflow-card {
          transition:
            transform 0.34s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.28s ease,
            border-color 0.28s ease,
            opacity 0.28s ease !important;
          will-change: transform;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        /* Responsive Mobile Scroll Track */
        @media (max-width: 920px) {
          .storefront-pallet-hero {
            padding: 28px 12px 36px !important;
          }
          .storefront-fanned-deck {
            overflow-x: auto !important;
            height: auto !important;
            min-height: 270px !important;
            padding: 16px 12px 24px !important;
            width: 100% !important;
            justify-content: flex-start !important;
            gap: 12px !important;
            scrollbar-width: none !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .storefront-fanned-deck::-webkit-scrollbar {
            display: none !important;
          }
          .storefront-coverflow-card {
            transform: none !important;
            width: 185px !important;
            min-width: 185px !important;
            height: 255px !important;
            margin-inline: 0 !important;
            opacity: 1 !important;
            flex-shrink: 0 !important;
          }
        }
      `}</style>

      {/* Top Main Headline */}
      <div style={{ maxWidth: '100%', marginBottom: '12px', position: 'relative', zIndex: 5 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '25px',
            fontWeight: 800,
            lineHeight: 1.3,
            color: '#0f172a',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            fontFamily: "'Alexandria', 'Inter', 'Tajawal', 'Cairo', sans-serif",
          }}
        >
          أفضل المنتجات بأحسن سعر
        </h1>
      </div>

      {/* Centerpiece: Fixed-Height 3D Coverflow Stage (Zero page reflow on hover) */}
      <div
        dir="ltr"
        className="storefront-fanned-deck"
        onMouseLeave={() => setHoveredCardIdx(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          height: '336px',
          position: 'relative',
          padding: '12px 16px 24px',
          maxWidth: '100%',
          zIndex: 4,
          flexWrap: 'nowrap',
          perspective: '1200px',
        }}
      >
        {orderedDeck.map((item, slotIdx) => {
          const { product, originalIdx } = item;
          const midSlot = Math.floor(orderedDeck.length / 2);
          const offset = slotIdx - midSlot;
          const isHovered = hoveredCardIdx === slotIdx;
          const hoveredOffset = hoveredCardIdx !== null ? hoveredCardIdx - midSlot : null;
          const covStyle = getCoverflowTransform(offset, isHovered, hoveredOffset);
          const isHighlighted = covStyle.isHighlighted;

          const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
          const photoUrl = product.imageUrl || autoPhoto.url;
          const isOutOfStock = !product.inStock || product.stockQty <= 0;
          const badgeText = isOutOfStock ? 'نفدت الكمية' : CARD_BADGES[originalIdx % CARD_BADGES.length];

          return (
            <div
              key={`${product.id}-${slotIdx}`}
              dir="rtl"
              className="storefront-coverflow-card"
              onMouseEnter={() => setHoveredCardIdx(slotIdx)}
              onClick={() => {
                if (offset !== 0 && orderedDeck.length >= 7) {
                  setCenterIdx(originalIdx);
                } else {
                  onQuickView(product);
                }
              }}
              style={{
                width: '186px',
                height: '274px',
                borderRadius: '20px',
                background: '#ffffff',
                border: isHighlighted ? '1.5px solid #cbd5e1' : '1px solid #E0E3E7',
                boxShadow: isHighlighted
                  ? '0 24px 48px -12px rgba(15, 23, 42, 0.22), 0 6px 16px rgba(15, 23, 42, 0.08)'
                  : '0 12px 24px -8px rgba(15, 23, 42, 0.1), 0 2px 6px rgba(0, 0, 0, 0.03)',
                position: 'relative',
                transform: covStyle.transform,
                transformOrigin: 'center 55%',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '12px',
                boxSizing: 'border-box',
                zIndex: covStyle.zIndex,
                opacity: covStyle.opacity,
                flexShrink: 0,
              }}
            >
              {/* Card Header: Badge & Price Tag (Always rendered so layout never shifts) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  zIndex: 2,
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    background: isOutOfStock ? '#ef4444' : '#0f172a',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '3.5px 8px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {badgeText}
                </span>

                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    fontVariantNumeric: 'tabular-nums',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '2.5px 7px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  {product.price} <CurrencySymbol />
                </span>
              </div>

              {/* Product Artwork Container */}
              <div
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 4px',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <img
                  src={photoUrl}
                  alt={product.name}
                  onError={(e) => {
                    e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transition: 'transform 0.3s ease',
                    transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
                  }}
                />
              </div>

              {/* Card Footer: Product Name & Add Action */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '8px',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.32,
                    textAlign: 'right',
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={product.name}
                >
                  {product.name}
                </span>

                <button
                  type="button"
                  onClick={(e) => handleInstantAdd(e, product)}
                  disabled={isOutOfStock}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    background: justAddedId === product.id ? '#16a34a' : isOutOfStock ? '#e2e8f0' : '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  title="أضف للسلة"
                >
                  {justAddedId === product.id ? (
                    <IconCheckCircle size={15} />
                  ) : (
                    <IconShoppingCart size={14} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA Buttons */}
      <div
        style={{
          maxWidth: '640px',
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 5,
        }}
      >
          <button
            type="button"
            onClick={onSelectDeals}
            style={{
              height: '35px',
              padding: '0 18px',
              borderRadius: '12px',
              background: '#0f172a',
              color: '#ffffff',
              border: '1px solid #0f172a',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>تصفح عروض اليوم</span>
            <span style={{ fontSize: '15px', lineHeight: 1 }}>←</span>
          </button>

          <button
            type="button"
            onClick={onOpenCategoriesModal}
            style={{
              height: '35px',
              padding: '0 16px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#0f172a',
              border: '1px solid #E0E3E7',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>تصفح كل الأقسام</span>
            <IconArrowUpRight size={14} />
          </button>
        </div>
    </section>
  );
});
