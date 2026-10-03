import { getProductVariants } from '../lib/storefront-variant-pricing';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import React, { useState } from 'react';
import { StorefrontProduct } from '../types/storefront.types';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconCheckCircle, IconStar, IconShoppingCart } from './StorefrontIcons';

interface StorefrontProductCardProps {
  product: StorefrontProduct;
  cartQuantity: number;
  whatsappPhone?: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  isSmartDeal?: boolean;
  onOpenReviewModal?: (product: StorefrontProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
}

export const StorefrontProductCard = React.memo(function StorefrontProductCard({
  product,
  cartQuantity,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
  isSmartDeal,
  onOpenReviewModal,
  isFavorite: isFavoriteProp,
  onToggleFavorite: onToggleFavoriteProp,
  onQuickView,
}: StorefrontProductCardProps) {
  const isOutOfStock = product.inStock !== undefined ? !product.inStock : product.stockQty <= 0;
  const isZeroPrice = product.price <= 0;
  // A product with variants has no single price to add blindly: open the quick view so the
  // customer picks the size, and the cart line carries it (SF-4).
  const handleAdd = () => {
    if (getProductVariants(product).length > 0 && onQuickView) {
      onQuickView(product);
      return;
    }
    onAddToCart(product);
  };

  const [imageLoaded, setImageLoaded] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(() => {
    try {
      return localStorage.getItem(`zs_fav_${product.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const isFavorite = isFavoriteProp !== undefined ? isFavoriteProp : localFavorite;

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavoriteProp) {
      onToggleFavoriteProp(product.id);
    } else {
      setLocalFavorite((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(`zs_fav_${product.id}`, String(next));
        } catch {}
        return next;
      });
    }
  };

  // Priority: 1. Merchant Uploaded Photo -> 2. Auto-Assigned Photographic Library
  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPhotoUrl = product.imageUrl || autoPhoto.url;
  // صورة القسم تتكرر على كل منتجاته — نوضّح أنها توضيحية بدل أن تُقرأ كصورة المنتج
  const isIllustrativePhoto = !product.imageUrl && autoPhoto.source === 'category';

  // Real ERP Offer Discount takes precedence over smart fallback
  const hasRealOffer = Boolean(product.hasDiscount && product.originalPrice && product.originalPrice > product.price);
  const isDeal = Boolean(hasRealOffer || isSmartDeal || (product.offerType === 'bogo' && product.offerBadge));
  const oldPrice = hasRealOffer
    ? Number(product.originalPrice)
    : (!isZeroPrice && isSmartDeal ? Math.round(product.price * 1.15) : 0);
  const hasDiscount = oldPrice > product.price;
  const hasQuantityOffer = product.offerType === 'bogo' && Boolean(product.offerBadge);
  const discountPercent = product.discountPercent || (hasDiscount && oldPrice > 0
    ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
    : 0);
  const offerBadgeText = product.offerBadge || (discountPercent > 0 ? `خصم ${discountPercent}%` : 'عرض خاص');

  return (
    <div
      className="storefront-product-card"
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 16px 32px -4px rgba(15, 23, 42, 0.12)';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .storefront-product-card {
            padding: 8px !important;
            border-radius: 12px !important;
          }
          .storefront-product-photo-box {
            border-radius: 9px !important;
            margin-bottom: 6px !important;
          }
          .storefront-product-badge {
            font-size: 9px !important;
            padding: 1px 5px !important;
          }
          .storefront-product-meta-row {
            margin-bottom: 3px !important;
          }
          .storefront-product-cat-tag {
            font-size: 10px !important;
            padding: 1px 5px !important;
          }
          .storefront-product-rating {
            font-size: 10.5px !important;
          }
          .storefront-product-title {
            font-size: 12px !important;
            line-height: 1.35 !important;
            min-height: auto !important;
            margin-bottom: 2px !important;
          }
          .storefront-product-action-box {
            margin-top: auto !important;
            padding-top: 4px !important;
          }
          .storefront-product-price-row {
            margin-top: 1px !important;
            margin-bottom: 3px !important;
            min-height: auto !important;
            gap: 3px !important;
          }
          .storefront-product-price-main {
            font-size: 16px !important;
          }
          .storefront-product-price-curr {
            font-size: 10.5px !important;
          }
          .storefront-product-price-old {
            font-size: 10px !important;
          }
          .storefront-product-price-save {
            font-size: 9px !important;
            padding: 1px 4px !important;
          }
          .storefront-product-action-btn {
            padding: 8px 6px !important;
            font-size: 11.5px !important;
            border-radius: 8px !important;
            gap: 4px !important;
          }
          .storefront-product-quick-add {
            width: 24px !important;
            height: 24px !important;
            min-width: 24px !important;
            min-height: 24px !important;
            max-width: 24px !important;
            max-height: 24px !important;
            padding: 0 !important;
            border-radius: 50% !important;
            box-sizing: border-box !important;
          }
          .storefront-product-stepper {
            padding: 2px !important;
            border-radius: 8px !important;
          }
          .storefront-product-stepper-btn {
            width: 32px !important;
            height: 32px !important;
            min-width: 32px !important;
            min-height: 32px !important;
            max-width: 32px !important;
            max-height: 32px !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            font-size: 16px !important;
          }
          .storefront-product-stepper-count {
            font-size: 12.5px !important;
            min-width: 20px !important;
          }
        }
      `}</style>
      <div>
        {/* Real Product Photo Showcase Box (Square 1:1 Aspect Ratio) */}
        <div
          className="storefront-product-photo-box"
          onClick={() => onQuickView?.(product)}
          style={{
            cursor: onQuickView ? 'pointer' : 'default',
            width: '100%',
            aspectRatio: '1 / 1',
            borderRadius: '12px',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #f1f5f9',
          }}
        >
          {/* Main Photo */}
          <img
            src={displayPhotoUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
              e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transition: 'transform 0.4s ease, opacity 0.3s ease',
              opacity: imageLoaded ? 1 : 0.8,
              pointerEvents: 'none',
            }}
            onLoad={() => setImageLoaded(true)}
            data-illustrative={isIllustrativePhoto ? 'true' : undefined}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />

          {/* صورة القسم التوضيحية: تُوسم صراحة حتى لا يفهمها العميل كصورة المنتج */}
          {isIllustrativePhoto && (
            <span
              style={{
                position: 'absolute',
                bottom: '6px',
                insetInlineStart: '6px',
                background: 'rgba(15, 23, 42, 0.78)',
                color: '#ffffff',
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '5px',
                pointerEvents: 'none',
              }}
            >
              صورة توضيحية
            </span>
          )}

          {/* Top Right: Stock Status & Deal Badges */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 2,
            }}
          >
            {isOutOfStock ? (
              <span
                className="storefront-product-badge"
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  background: '#fef2f2',
                  color: '#991b1b',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                }}
              >
                غير متوفر
              </span>
            ) : (
              <>
                <span
                  className="storefront-product-badge"
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 800,
                    background: '#f0fdf4',
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconCheckCircle size={11} strokeWidth={2.2} color="#16a34a" />
                  <span>متوفر</span>
                </span>
                {product.stockQty > 0 && product.stockQty <= 5 && (
                  <span
                    className="storefront-product-badge"
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: '#fff7ed',
                      color: '#c2410c',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      border: '1px solid #fed7aa',
                      boxShadow: '0 1px 3px rgba(194, 65, 12, 0.1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>متبقي {product.stockQty} فقط</span>
                  </span>
                )}
                {product.rating && product.rating >= 4.5 && product.reviewCount && product.reviewCount >= 2 && (
                  <span
                    className="storefront-product-badge"
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: '#170e5e',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>الأكثر مبيعاً</span>
                  </span>
                )}
                {(hasDiscount || hasQuantityOffer) && (
                  <span
                    className="storefront-product-badge"
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: 'var(--storefront-secondary-color, #e11d48)',
                      color: 'var(--storefront-secondary-contrast, #ffffff)',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>{offerBadgeText}</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Top Left: Interactive Wishlist Heart Button (Transparent outline heart, glows red on click) */}
          <button
            className="storefront-product-fav-btn"
            type="button"
            onClick={toggleFavorite}
            aria-label="إضافة للمفضلة"
            title={isFavorite ? 'محفوظ في المفضلة' : 'إضافة إلى المفضلة'}
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '28px',
              height: '28px',
              padding: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              transition: 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={isFavorite ? '#ef4444' : 'none'}
              stroke={isFavorite ? '#ef4444' : '#475569'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: isFavorite
                  ? 'drop-shadow(0 2px 6px rgba(239, 68, 68, 0.45))'
                  : 'drop-shadow(0 1px 2px rgba(255, 255, 255, 0.95)) drop-shadow(0 1px 3px rgba(0, 0, 0, 0.25))',
                transition: 'all 0.2s ease',
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Bottom Left: Quick Add Float Button (Compact & Sleek) */}
          {!isOutOfStock && !isZeroPrice && cartQuantity === 0 && (
            <button
              className="storefront-product-quick-add"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              title="إضافة سريعة للسلة"
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                width: '30px',
                height: '30px',
                minWidth: '30px',
                minHeight: '30px',
                maxWidth: '30px',
                maxHeight: '30px',
                padding: 0,
                boxSizing: 'border-box',
                borderRadius: '50%',
                background: 'var(--storefront-primary-color, #170e5e)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.18))',
                zIndex: 3,
                transition: 'transform 0.15s ease, filter 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'none';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category & Star Rating Row */}
        <div
          className="storefront-product-meta-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '22px',
            minHeight: '22px',
            maxHeight: '22px',
            marginBottom: '6px',
          }}
        >
          <span
            className="storefront-product-cat-tag"
            style={{
              fontSize: '11px',
              color: '#475569',
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 700,
            }}
          >
            {product.categoryName || 'عام'}
          </span>
          <button
            type="button"
            className="storefront-product-rating"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReviewModal?.(product);
            }}
            title="عرض وكتابة تقييم للمنتج"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '11.5px',
              color: '#f59e0b',
              background: 'transparent',
              border: 'none',
              padding: '2px 5px',
              borderRadius: '6px',
              cursor: onOpenReviewModal ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (onOpenReviewModal) {
                e.currentTarget.style.background = '#fefce8';
                e.currentTarget.style.transform = 'scale(1.04)';
              }
            }}
            onMouseLeave={(e) => {
              if (onOpenReviewModal) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
            {product.reviewCount && product.reviewCount > 0 ? (
              <>
                <span style={{ color: '#334155', fontWeight: 800 }}>{Number(product.rating || 5).toFixed(1)}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>({product.reviewCount})</span>
              </>
            ) : (
              <span style={{ color: '#64748b', fontSize: '10.5px', fontWeight: 700 }}>جديد (قيم)</span>
            )}
          </button>
        </div>

        {/* Product Title - Strictly 38px, max 2 lines with ellipsis */}
        <h3
          className="storefront-product-title"
          onClick={() => onQuickView?.(product)}
          style={{
            cursor: onQuickView ? 'pointer' : 'default',
            margin: '0 0 4px',
            fontSize: '13.5px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: '1.38',
            height: '38px',
            minHeight: '38px',
            maxHeight: '38px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word',
          }}
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Price Row: Immediately under product title, strictly 26px */}
        {isZeroPrice ? (
          <div
            className="storefront-product-price-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '26px',
              minHeight: '26px',
              maxHeight: '26px',
              margin: '2px 0 4px',
            }}
          >
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#475569',
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              السعر عند التواصل
            </span>
          </div>
        ) : (
          <div
            className="storefront-product-price-row"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'nowrap',
              gap: '4px',
              margin: '2px 0 4px',
              height: '26px',
              minHeight: '26px',
              maxHeight: '26px',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="storefront-product-price-main"
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              {product.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="storefront-product-price-curr" style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}><CurrencySymbol /></span>
            {hasDiscount && (
              <>
                <span
                  className="storefront-product-price-old"
                  style={{
                    fontSize: '11.5px',
                    color: '#94a3b8',
                    textDecoration: 'line-through',
                    marginRight: '4px',
                  }}
                >
                  {oldPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <CurrencySymbol />
                </span>
                <span
                  className="storefront-product-price-save"
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#16a34a',
                    background: '#f0fdf4',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    marginRight: '2px',
                  }}
                >
                  وفر {Math.round((oldPrice - product.price) * 100) / 100} <CurrencySymbol />
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action CTA Container (Pinned at card bottom, strictly 48px) */}
      <div className="storefront-product-action-box" style={{ marginTop: 'auto', paddingTop: '8px', height: '48px', minHeight: '48px', boxSizing: 'border-box' }}>
        {/* Action Button */}
        {isOutOfStock ? (
          <button
            className="storefront-product-action-btn"
            type="button"
            disabled
            style={{
              width: '100%',
              height: '40px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#94a3b8',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'not-allowed',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            غير متوفر حالياً
          </button>
        ) : isZeroPrice ? (
          <a
            className="storefront-product-action-btn"
            href={
              whatsappPhone
                ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`مرحباً، أستفسر عن سعر صنف: ${product.name}`)}`
                : '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              height: '40px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1.5px solid var(--storefront-primary-color, #170e5e)',
              background: 'var(--storefront-primary-subtle, rgba(23, 14, 94, 0.05))',
              color: 'var(--storefront-primary-color, #170e5e)',
              fontSize: '12.5px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxSizing: 'border-box',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--storefront-primary-color, #170e5e)';
              e.currentTarget.style.color = 'var(--storefront-primary-contrast, #ffffff)';
              const svg = e.currentTarget.querySelector('svg');
              if (svg) svg.style.fill = 'var(--storefront-primary-contrast, #ffffff)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--storefront-primary-subtle, rgba(23, 14, 94, 0.05))';
              e.currentTarget.style.color = 'var(--storefront-primary-color, #170e5e)';
              const svg = e.currentTarget.querySelector('svg');
              if (svg) svg.style.fill = 'var(--storefront-primary-color, #170e5e)';
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="var(--storefront-primary-color, #170e5e)"
              style={{ transition: 'fill 0.18s ease', flexShrink: 0 }}
            >
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
            </svg>
            <span>استفسر عن السعر</span>
          </a>
        ) : cartQuantity > 0 ? (
          /* Dynamic Stepper Counter: [+ count -] in RTL */
          <div
            className="storefront-product-stepper"
            style={{
              width: '100%',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--storefront-primary-color, #170e5e)',
              borderRadius: '11px',
              padding: '3px',
              boxShadow: '0 3px 12px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.15))',
              boxSizing: 'border-box',
            }}
          >
            <button
              className="storefront-product-stepper-btn"
              type="button"
              onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
              title="زيادة الكمية"
              style={{
                width: '34px',
                height: '34px',
                minWidth: '34px',
                minHeight: '34px',
                maxWidth: '34px',
                maxHeight: '34px',
                padding: 0,
                boxSizing: 'border-box',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.22)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.32)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            >
              +
            </button>
            <span
              className="storefront-product-stepper-count"
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--storefront-primary-contrast, #ffffff)',
                minWidth: '24px',
                textAlign: 'center',
              }}
            >
              {cartQuantity}
            </span>
            <button
              className="storefront-product-stepper-btn"
              type="button"
              onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
              title="تقليل الكمية"
              style={{
                width: '34px',
                height: '34px',
                minWidth: '34px',
                minHeight: '34px',
                maxWidth: '34px',
                maxHeight: '34px',
                padding: 0,
                boxSizing: 'border-box',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.22)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.32)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
            >
              -
            </button>
          </div>
        ) : (
          <button
            className="storefront-product-action-btn"
            type="button"
            onClick={handleAdd}
            style={{
              width: '100%',
              height: '40px',
              padding: '0 14px',
              borderRadius: '11px',
              border: 'none',
              background: 'var(--storefront-primary-color, #170e5e)',
              color: 'var(--storefront-primary-contrast, #ffffff)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.12))',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.08)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <IconShoppingCart size={15} strokeWidth={2.2} />
            <span>أضف للسلة</span>
          </button>
        )}
      </div>
    </div>
  );
});
