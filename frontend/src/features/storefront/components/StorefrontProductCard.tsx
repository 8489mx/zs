import React, { useState } from 'react';
import { StorefrontProduct } from '../types/storefront.types';
import { getAutoProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconCheckCircle, IconStar, IconShoppingCart } from './StorefrontIcons';

interface StorefrontProductCardProps {
  product: StorefrontProduct;
  cartQuantity: number;
  whatsappPhone?: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  isSmartDeal?: boolean;
}

export const StorefrontProductCard = React.memo(function StorefrontProductCard({
  product,
  cartQuantity,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
  isSmartDeal,
}: StorefrontProductCardProps) {
  const isOutOfStock = !product.inStock || product.stockQty <= 0;
  const isZeroPrice = product.price <= 0;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    try {
      return localStorage.getItem(`zs_fav_${product.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`zs_fav_${product.id}`, String(next));
      } catch {}
      return next;
    });
  };

  // Priority: 1. Merchant Uploaded Photo -> 2. Auto-Assigned Photographic Library
  const displayPhotoUrl = product.imageUrl || getAutoProductPhoto(product.name, product.categoryName);

  // Optional smart discount badge for visual psychological appeal only when isSmartDeal is enabled
  const isDeal = Boolean(isSmartDeal || (product as any).hasDiscount);
  const fakeOldPrice = (!isZeroPrice && isDeal) ? Math.round(product.price * 1.15) : 0;
  const hasDiscount = fakeOldPrice > product.price;
  const discountPercent = hasDiscount && fakeOldPrice > 0
    ? Math.round(((fakeOldPrice - product.price) / fakeOldPrice) * 100)
    : 0;

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
          .storefront-product-stepper {
            padding: 2px !important;
            border-radius: 8px !important;
          }
          .storefront-product-stepper-btn {
            width: 28px !important;
            height: 28px !important;
            font-size: 15px !important;
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
          style={{
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
            }}
            onLoad={() => setImageLoaded(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />

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
                  background: 'rgba(254, 242, 242, 0.95)',
                  color: '#991b1b',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  backdropFilter: 'blur(4px)',
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
                    background: 'rgba(240, 253, 244, 0.95)',
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #bbf7d0',
                    backdropFilter: 'blur(4px)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconCheckCircle size={11} strokeWidth={2.2} color="#16a34a" />
                  <span>متوفر</span>
                </span>
                {hasDiscount && (
                  <span
                    className="storefront-product-badge"
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: '#ef4444',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <span>خصم {discountPercent}%</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* Top Left: Interactive Wishlist Heart Button */}
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
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              color: isFavorite ? '#ef4444' : '#64748b',
              boxShadow: '0 2px 5px rgba(0,0,0,0.06)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={isFavorite ? '#ef4444' : 'none'}
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Bottom Left: Quick Add Float Button (Noon Style) */}
          {!isOutOfStock && !isZeroPrice && cartQuantity === 0 && (
            <button
              className="storefront-product-quick-add"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
              }}
              title="إضافة سريعة للسلة"
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontSize: '18px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(23, 14, 94, 0.3)',
                zIndex: 3,
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.12)';
                e.currentTarget.style.background = '#24168f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#170e5e';
              }}
            >
              +
            </button>
          )}
        </div>

        {/* Category & Star Rating Row */}
        <div className="storefront-product-meta-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
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
          <div className="storefront-product-rating" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: '#f59e0b' }}>
            <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
            <span style={{ color: '#475569', fontWeight: 700 }}>4.9</span>
          </div>
        </div>

        {/* Product Title */}
        <h3
          className="storefront-product-title"
          style={{
            margin: '0 0 3px',
            fontSize: '14px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: '1.35',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Price Row: Immediately under product title */}
        {isZeroPrice ? (
          <div className="storefront-product-price-row" style={{ display: 'flex', alignItems: 'center', minHeight: '26px', margin: '2px 0 4px' }}>
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
              flexWrap: 'wrap',
              gap: '4px',
              margin: '2px 0 4px',
              minHeight: '26px',
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
            <span className="storefront-product-price-curr" style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>ج.م</span>
            {hasDiscount && (
              <>
                <span
                  className="storefront-product-price-old"
                  style={{
                    fontSize: '11.5px',
                    color: '#94a3b8',
                    textDecoration: 'line-through',
                    marginRight: '3px',
                  }}
                >
                  {fakeOldPrice} ج
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
                  وفر {fakeOldPrice - product.price} ج
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Action CTA Container (Pinned at card bottom) */}
      <div className="storefront-product-action-box" style={{ marginTop: 'auto', paddingTop: '8px' }}>
        {/* Action Button */}
        {isOutOfStock ? (
          <button
            className="storefront-product-action-btn"
            type="button"
            disabled
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#94a3b8',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'not-allowed',
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
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span>استفسر عن السعر</span>
          </a>
        ) : cartQuantity > 0 ? (
          /* Dynamic Stepper Counter: [- count +] */
          <div
            className="storefront-product-stepper"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#170e5e',
              borderRadius: '10px',
              padding: '3px',
              boxShadow: '0 4px 14px rgba(23, 14, 94, 0.22)',
            }}
          >
            <button
              className="storefront-product-stepper-btn"
              type="button"
              onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              -
            </button>
            <span
              className="storefront-product-stepper-count"
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#ffffff',
                minWidth: '24px',
                textAlign: 'center',
              }}
            >
              {cartQuantity}
            </span>
            <button
              className="storefront-product-stepper-btn"
              type="button"
              onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: 'none',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            className="storefront-product-action-btn"
            type="button"
            onClick={() => onAddToCart(product)}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '10px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(23, 14, 94, 0.22)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#24168f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#170e5e';
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
