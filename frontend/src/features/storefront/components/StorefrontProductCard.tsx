import React, { useState } from 'react';
import { StorefrontProduct } from '../types/storefront.types';
import { getAutoProductPhoto } from '../lib/storefront-photo-matcher';
import { IconCheckCircle, IconTag, IconStar, IconShoppingCart } from './StorefrontIcons';

interface StorefrontProductCardProps {
  product: StorefrontProduct;
  cartQuantity: number;
  whatsappPhone?: string;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, newQty: number) => void;
}

export const StorefrontProductCard = React.memo(function StorefrontProductCard({
  product,
  cartQuantity,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
}: StorefrontProductCardProps) {
  const isOutOfStock = !product.inStock || product.stockQty <= 0;
  const isZeroPrice = product.price <= 0;
  const [imageLoaded, setImageLoaded] = useState(false);

  // Priority: 1. Merchant Uploaded Photo -> 2. Auto-Assigned Photographic Library
  const displayPhotoUrl = product.imageUrl || getAutoProductPhoto(product.name, product.categoryName);

  // Fake slight discount for visual psychological appeal on active products
  const fakeOldPrice = !isZeroPrice ? Math.round(product.price * 1.15) : 0;
  const hasDiscount = fakeOldPrice > product.price;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '18px',
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
      <div>
        {/* Real Product Photo Showcase Box */}
        <div
          style={{
            width: '100%',
            height: '175px',
            borderRadius: '14px',
            background: '#f1f5f9',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '12px',
          }}
        >
          {/* Main Photo */}
          <img
            src={displayPhotoUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=260&q=45&fm=webp';
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
              e.currentTarget.style.transform = 'scale(1.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />

          {/* Top Right: Stock Status */}
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
              <span
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
            )}
          </div>

          {/* Top Left: Special Deal Tag */}
          {hasDiscount && !isOutOfStock && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '10.5px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                zIndex: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <IconTag size={11} strokeWidth={2.2} />
              <span>عرض خاص</span>
            </div>
          )}
        </div>

        {/* Category & Star Rating Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11.5px', color: '#f59e0b' }}>
            <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
            <span style={{ color: '#475569', fontWeight: 700 }}>4.9</span>
          </div>
        </div>

        {/* Product Title */}
        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '14.5px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '40px',
          }}
          title={product.name}
        >
          {product.name}
        </h3>
      </div>

      {/* Pricing & CTA Bottom Row */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
        {isZeroPrice ? (
          <div style={{ marginBottom: '10px', minHeight: '30px', display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                background: '#f1f5f9',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              السعر عند التواصل
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px', minHeight: '30px' }}>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.4px',
              }}
            >
              {product.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>ج.م</span>
            {hasDiscount && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  textDecoration: 'line-through',
                  marginRight: '4px',
                }}
              >
                {fakeOldPrice} ج
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        {isOutOfStock ? (
          <button
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
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a',
              borderRadius: '10px',
              padding: '3px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
            }}
          >
            <button
              type="button"
              onClick={() => onUpdateQuantity(product.id, cartQuantity - 1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: 'none',
                fontSize: '16px',
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
              type="button"
              onClick={() => onUpdateQuantity(product.id, cartQuantity + 1)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.15)',
                color: '#ffffff',
                border: 'none',
                fontSize: '16px',
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
            type="button"
            onClick={() => onAddToCart(product)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#0f172a';
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
