import React, { useState } from 'react';
import type { StorefrontProduct } from '../types/storefront.types';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { getProductVariants } from '../lib/storefront-variant-pricing';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { IconShoppingCart, IconCheckCircle, IconFlame, IconTruck, IconShieldCheck } from './StorefrontIcons';
import { EyeIcon } from '@/shared/components/icons/AppIcons';

interface StorefrontDealSpotlightProps {
  product: StorefrontProduct;
  cartQuantity: number;
  whatsappPhone?: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: number) => void;
}

function formatCategoryName(name?: string): string {
  if (!name) return 'قسم عام';
  const trimmed = name.trim();
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  return trimmed;
}

export function StorefrontDealSpotlight({
  product,
  cartQuantity,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
  onQuickView,
  isFavorite: isFavoriteProp,
  onToggleFavorite,
}: StorefrontDealSpotlightProps) {
  const [localFavorite, setLocalFavorite] = useState(() => {
    try {
      return localStorage.getItem(`zs_fav_${product.id}`) === 'true';
    } catch {
      return false;
    }
  });

  const isFavorite = isFavoriteProp !== undefined ? isFavoriteProp : localFavorite;

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(product.id);
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

  const isOutOfStock = product.inStock !== undefined ? !product.inStock : product.stockQty <= 0;
  const isZeroPrice = product.price <= 0;
  const hasRealOffer = Boolean(product.hasDiscount && product.originalPrice && product.originalPrice > product.price);
  const oldPrice = hasRealOffer
    ? Number(product.originalPrice)
    : (!isZeroPrice ? Math.round(product.price * 1.15) : 0);

  const discountPercent = oldPrice > product.price
    ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
    : 0;

  const savingsAmount = oldPrice > product.price ? oldPrice - product.price : 0;

  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPhotoUrl = product.imageUrl || autoPhoto.url;

  const cleanPhone = (whatsappPhone || '').replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

  const handleAdd = () => {
    if (getProductVariants(product).length > 0 && onQuickView) {
      onQuickView(product);
      return;
    }
    onAddToCart(product);
  };

  return (
    <div
      className="storefront-deal-spotlight-card"
      style={{
        background: '#fafbfc',
        border: '1px solid #f1f5f9',
        borderRadius: '14px',
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: '290px minmax(0, 1fr) 280px',
        gap: '24px',
        alignItems: 'start',
        direction: 'rtl',
        position: 'relative',
      }}
    >
      <style>{`
        @media (max-width: 1080px) {
          .storefront-deal-spotlight-card {
            grid-template-columns: 260px minmax(0, 1fr) !important;
            gap: 20px !important;
          }
          .storefront-deal-buy-box {
            grid-column: 1 / -1 !important;
          }
        }
        @media (max-width: 768px) {
          .storefront-deal-spotlight-card {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
            padding: 14px !important;
          }
          .storefront-deal-spotlight-photo-box {
            max-width: 100% !important;
            height: 240px !important;
          }
          .storefront-deal-buy-box {
            grid-column: auto !important;
          }
        }
      `}</style>

      {/* 1. Product Photo Box (Right side in RTL) */}
      <div
        className="storefront-deal-spotlight-photo-box"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={displayPhotoUrl}
          alt={product.name}
          onClick={() => onQuickView?.(product)}
          onError={(e) => {
            e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            cursor: onQuickView ? 'pointer' : 'default',
            transition: 'transform 0.3s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />

        {/* Discount Badge on Top Right */}
        {discountPercent > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 9px',
              borderRadius: '6px',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 2,
            }}
          >
            <span>خصم {discountPercent}%</span>
          </span>
        )}

        {/* Favorite Heart Button on Top Left */}
        <button
          type="button"
          onClick={handleToggleFav}
          aria-label={isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.1)',
            zIndex: 2,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isFavorite ? '#ef4444' : 'none'}
            stroke={isFavorite ? '#ef4444' : '#64748b'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Availability Badge on Bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              background: isOutOfStock ? '#fef2f2' : '#f0fdf4',
              color: isOutOfStock ? '#b91c1c' : '#166534',
              border: isOutOfStock ? '1px solid #fecaca' : '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <IconCheckCircle size={11} color={isOutOfStock ? '#b91c1c' : '#16a34a'} strokeWidth={2.4} />
            <span>{isOutOfStock ? 'نفد من المخزن' : 'متوفر بالمخزن'}</span>
          </span>
        </div>
      </div>

      {/* 2. Product Specs & Trust Guarantees (Center in RTL) */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'flex-start' }}>
        {/* Kicker & Category */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: 'linear-gradient(90deg, #fee2e2 0%, #fef3c7 100%)',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <IconFlame size={12} color="#dc2626" strokeWidth={2.4} />
            <span>عرض حصري مميز</span>
          </span>
          <span
            style={{
              fontSize: '11.5px',
              color: '#64748b',
              fontWeight: 600,
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            {formatCategoryName(product.categoryName)}
          </span>
        </div>

        {/* Product Title */}
        <h3
          onClick={() => onQuickView?.(product)}
          style={{
            margin: '0 0 10px',
            fontSize: '19px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: '1.4',
            cursor: onQuickView ? 'pointer' : 'default',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => onQuickView && (e.currentTarget.style.color = 'var(--storefront-primary-color, #170e5e)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#0f172a')}
        >
          {product.name}
        </h3>

        {/* Product Description */}
        <p
          style={{
            margin: '0 0 16px',
            fontSize: '13px',
            color: '#475569',
            lineHeight: '1.65',
            textAlign: 'justify',
            textJustify: 'inter-word',
            textAlignLast: 'start',
          }}
        >
          {product.description || 'استفد من هذا العرض الحصري المخفض مع ضمان الجودة الكامل والدفع عند الاستلام والتوصيل المباشر.'}
        </p>

        {/* Trust Badges - 3 Unified Luxury Monochrome Micro-Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            margin: '0 0 14px',
          }}
        >
          {/* Badge 1: Quality & Warranty */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconShieldCheck size={16} color="#334155" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>أصلي ومضمون</div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>ضمان استبدال معتمد</div>
            </div>
          </div>

          {/* Badge 2: Fast Delivery */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconTruck size={16} color="#334155" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>شحن لباب المنزل</div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>خلال 24-48 ساعة</div>
            </div>
          </div>

          {/* Badge 3: Inspection Before Payment */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <EyeIcon size={15} color="#334155" />
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a' }}>معاينة وفحص</div>
              <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>افحص طلبك قبل الدفع</div>
            </div>
          </div>
        </div>

        {/* Small Reassurance Note */}
        <div
          style={{
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconCheckCircle size={13} color="#64748b" strokeWidth={2.2} />
          <span>الدفع عند الاستلام نقداً أو إلكترونياً • إمكانية الإرجاع والاستبدال السريع</span>
        </div>
      </div>

      {/* 3. Dedicated Buy Box (Left side in RTL) */}
      <div
        className="storefront-deal-buy-box"
        style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Buy Box Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>سعر العرض الحصري</span>
          {savingsAmount > 0 && (
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: '#166534',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              وفرت {savingsAmount.toLocaleString()} ج
            </span>
          )}
        </div>

        {/* Price Display */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: 'var(--storefront-primary-color, #170e5e)',
                letterSpacing: '-0.5px',
                lineHeight: '1',
              }}
            >
              {Number(product.price || 0).toLocaleString()}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
              <CurrencySymbol />
            </span>
            {oldPrice > product.price && (
              <span
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  textDecoration: 'line-through',
                  fontWeight: 600,
                  marginInlineStart: '6px',
                }}
              >
                {oldPrice.toLocaleString()} <CurrencySymbol />
              </span>
            )}
          </div>
          <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px' }}>
            شامل ضريبة القيمة المضافة
          </div>
        </div>

        {/* Action Controls: Stepper vs Add to Cart */}
        <div>
          {cartQuantity > 0 ? (
            /* Strict RTL Stepper Standard: [+] first (right), quantity in middle, [-] last (left) */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '4px 6px',
                height: '42px',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              {/* Increase button (+) on the RIGHT in RTL */}
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
                aria-label="زيادة الكمية"
                style={{
                  width: '34px',
                  height: '32px',
                  borderRadius: '7px',
                  background: 'var(--storefront-primary-color, #170e5e)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'filter 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
              >
                +
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: '1.2',
                  }}
                >
                  {cartQuantity}
                </span>
                <span style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 600 }}>بالسلة</span>
              </div>

              {/* Decrease button (-) on the LEFT in RTL */}
              <button
                type="button"
                onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
                aria-label="إنقاص الكمية"
                style={{
                  width: '34px',
                  height: '32px',
                  borderRadius: '7px',
                  background: '#e2e8f0',
                  color: '#0f172a',
                  border: 'none',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#cbd5e1')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#e2e8f0')}
              >
                -
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                background: isOutOfStock ? '#94a3b8' : 'var(--storefront-primary-color, #170e5e)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isOutOfStock ? 'none' : '0 2px 10px var(--storefront-primary-subtle, rgba(23, 14, 94, 0.22))',
                transition: 'filter 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => !isOutOfStock && (e.currentTarget.style.filter = 'brightness(1.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
            >
              <IconShoppingCart size={17} color="#ffffff" strokeWidth={2.2} />
              <span>{isOutOfStock ? 'غير متاح حالياً' : 'أضف العرض للسلة'}</span>
            </button>
          )}
        </div>

        {/* WhatsApp Direct Inquiry */}
        {formattedPhone && (
          <a
            href={`https://wa.me/${formattedPhone}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن عرض: ${product.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              color: '#166534',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxSizing: 'border-box',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dcfce7';
              e.currentTarget.style.borderColor = '#86efac';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0fdf4';
              e.currentTarget.style.borderColor = '#bbf7d0';
            }}
          >
            <svg width="15" height="15" fill="#25d366" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
            </svg>
            <span>طلب سريع عبر واتساب</span>
          </a>
        )}

        {/* Quick View Link */}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '4px 0',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--storefront-primary-color, #170e5e)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <EyeIcon size={13} />
            <span>عرض المواصفات بالكامل</span>
          </button>
        )}
      </div>
    </div>
  );
}
