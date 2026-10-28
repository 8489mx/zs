import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StorefrontProduct } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { ShoppingCartIcon, PhoneIcon, CheckCircleIcon, EyeIcon } from '@/shared/components/icons/AppIcons';
import { resolveProductPhoto } from '../lib/storefront-photo-matcher';

interface StorefrontInteractiveSpotlightBreakProps {
  product: StorefrontProduct;
  cartQuantity: number;
  whatsappPhone?: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
}

export const StorefrontInteractiveSpotlightBreak = React.memo(function StorefrontInteractiveSpotlightBreak({
  product,
  cartQuantity,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
  onQuickView,
}: StorefrontInteractiveSpotlightBreakProps) {
  const { t } = useTranslation();
  const [localQty, setLocalQty] = useState(cartQuantity > 0 ? cartQuantity : 1);

  if (!product) return null;

  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPhotoUrl = product.imageUrl || autoPhoto.url;

  const oldPrice = Number(product.originalPrice || Math.round(product.price * 1.25));
  const savings = Math.max(0, oldPrice - product.price);
  const discountPercent = oldPrice > product.price
    ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
    : 20;

  const handleIncrement = () => {
    const next = localQty + 1;
    setLocalQty(next);
    if (cartQuantity > 0) onUpdateQuantity(product.id, next);
  };

  const handleDecrement = () => {
    if (localQty <= 1) {
      if (cartQuantity > 0) onUpdateQuantity(product.id, 0);
      setLocalQty(1);
      return;
    }
    const next = localQty - 1;
    setLocalQty(next);
    if (cartQuantity > 0) onUpdateQuantity(product.id, next);
  };

  const handleAddToCartClick = () => {
    onAddToCart(product);
    if (localQty > 1) {
      onUpdateQuantity(product.id, localQty);
    }
  };

  const cleanPhone = (whatsappPhone || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(`مرحباً، أود الاستفسار وطلب صفقة اليوم: ${product.name} بسعر ${product.price}`)}`
    : undefined;

  return (
    <div
      className="storefront-spotlight-breakaway"
      style={{
        margin: '28px 0',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #170e5e 100%)',
        borderRadius: '20px',
        padding: '24px 28px',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
      }}
    >
      {/* Background ambient glow circles */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          left: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-30px',
          right: '20%',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: 'rgba(236, 72, 153, 0.12)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Right side: Image showcase */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '320px',
              height: '240px',
              borderRadius: '16px',
              background: '#ffffff',
              padding: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
              }}
            >
              {t('storefront.spotlight.badge', 'صفقة اليوم | خصم {{percent}}%', { percent: discountPercent })}
            </div>

            <img
              src={displayPhotoUrl}
              alt={product.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
              loading="lazy"
            />
          </div>
        </div>

        {/* Left side: Content & Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {product.categoryName || 'عرض مميز'}
            </span>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}
            >
              {t('storefront.spotlight.limited_stock', 'متبقي كمية محدودة بالسعر المخفض')}
            </span>
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.35,
            }}
          >
            {product.name}
          </h3>

          {product.description && (
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: '#cbd5e1',
                lineHeight: 1.5,
                maxHeight: '44px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {product.description}
            </p>
          )}

          {/* Pricing Row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{product.price}</span>
              <CurrencySymbol />
            </div>

            {oldPrice > product.price && (
              <span
                style={{
                  fontSize: '14px',
                  color: '#94a3b8',
                  textDecoration: 'line-through',
                }}
              >
                {oldPrice} <CurrencySymbol />
              </span>
            )}

            {savings > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#4ade80',
                  background: 'rgba(74, 222, 128, 0.15)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                {t('storefront.spotlight.saved', 'وفرت {{savings}} ج.م', { savings })}
              </span>
            )}
          </div>

          {/* Stepper + Add to Cart Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            {/* RTL Stepper: [+] on the right, qty in center, [-] on the left */}
            <div
              className="storefront-stepper-control"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#ffffff',
                borderRadius: '10px',
                padding: '3px',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              <button
                type="button"
                onClick={handleIncrement}
                aria-label="زيادة الكمية"
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
              <span
                style={{
                  minWidth: '32px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  color: '#0f172a',
                  padding: '0 4px',
                }}
              >
                {cartQuantity > 0 ? cartQuantity : localQty}
              </span>
              <button
                type="button"
                onClick={handleDecrement}
                aria-label="إنقاص الكمية"
                style={{
                  width: '32px',
                  height: '32px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                -
              </button>
            </div>

            {/* Add to cart primary button */}
            <button
              type="button"
              onClick={handleAddToCartClick}
              style={{
                background: cartQuantity > 0 ? '#16a34a' : '#38bdf8',
                color: cartQuantity > 0 ? '#ffffff' : '#0f172a',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 18px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              {cartQuantity > 0 ? (
                <>
                  <CheckCircleIcon size={16} color="#ffffff" />
                  <span>{t('storefront.spotlight.in_cart', 'في السلة ({{qty}})', { qty: cartQuantity })}</span>
                </>
              ) : (
                <>
                  <ShoppingCartIcon size={16} color="#0f172a" />
                  <span>{t('storefront.spotlight.add_to_cart', 'أضف للسلة الآن')}</span>
                </>
              )}
            </button>

            {onQuickView && (
              <button
                type="button"
                onClick={() => onQuickView(product)}
                aria-label="معاينة التفاصيل"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <EyeIcon size={14} color="#ffffff" />
                <span>{t('storefront.spotlight.quick_view', 'التفاصيل')}</span>
              </button>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(37, 211, 102, 0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(37, 211, 102, 0.3)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <PhoneIcon size={14} color="#4ade80" />
                <span>{t('storefront.spotlight.whatsapp_order', 'طلب واتساب')}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
