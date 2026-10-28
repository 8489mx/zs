import { useTranslation } from 'react-i18next';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import React, { useState } from 'react';
import { StorefrontProduct } from '../types/storefront.types';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconCheckCircle, IconShoppingCart } from './StorefrontIcons';
import { ClockIcon } from '@/shared/components/icons/AppIcons';

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
  variant?: 'standard' | 'wide';
}

function formatSmartCategoryName(categoryName?: string): string {
  if (!categoryName) return 'عام';
  const trimmed = categoryName.trim();
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  if (trimmed.includes(': ')) {
    const parts = trimmed.split(': ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  return trimmed;
}

export const StorefrontProductCard = React.memo(function StorefrontProductCard({
  product,
  cartQuantity,
  whatsappPhone,
  onAddToCart,
  onUpdateQuantity,
  isSmartDeal,
  isFavorite: isFavoriteProp,
  onToggleFavorite: onToggleFavoriteProp,
  onQuickView,
  variant = 'standard',
}: StorefrontProductCardProps) {
  const isWide = variant === 'wide';
  const { t } = useTranslation();
  const isOutOfStock = product.inStock !== undefined ? !product.inStock : product.stockQty <= 0;
  const isZeroPrice = product.price <= 0;
  const [justAdded, setJustAdded] = useState(false);

  // Clicking Add to Cart adds directly without opening the QuickView modal
  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 650);
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

  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPhotoUrl = product.imageUrl || autoPhoto.url;
  const isIllustrativePhoto = !product.imageUrl && autoPhoto.source === 'category';

  const hasRealOffer = Boolean(product.hasDiscount && product.originalPrice && product.originalPrice > product.price);
  const oldPrice = hasRealOffer
    ? Number(product.originalPrice)
    : (!isZeroPrice && isSmartDeal ? Math.round(product.price * 1.15) : 0);
  const hasDiscount = oldPrice > product.price;
  const hasQuantityOffer = product.offerType === 'bogo' && Boolean(product.offerBadge);
  const discountPercent = product.discountPercent || (hasDiscount && oldPrice > 0
    ? Math.round(((oldPrice - product.price) / oldPrice) * 100)
    : 0);
  const offerBadgeText = product.offerBadge || (discountPercent > 0 ? `خصم ${discountPercent}%` : 'عرض خاص');

  // Single-Badge Discipline: Out of Stock shows "نفدت الكمية"
  let primaryBadge: { text: string; bg: string; color: string; isOut?: boolean } | null = null;
  if (isOutOfStock) {
    primaryBadge = {
      text: 'نفدت الكمية',
      bg: '#dc2626',
      color: '#ffffff',
      isOut: true,
    };
  } else if (product.stockQty > 0 && product.stockQty <= 5) {
    primaryBadge = {
      text: `${t('storefront.storefront_product_card.s2', 'متبقي')} ${product.stockQty} ${t('storefront.storefront_product_card.s3', 'فقط')}`,
      bg: '#c2410c',
      color: '#ffffff',
    };
  } else if (hasDiscount || hasQuantityOffer || Boolean(product.offerBadge)) {
    primaryBadge = {
      text: offerBadgeText,
      bg: '#CC0C39',
      color: '#ffffff',
    };
  }

  return (
    <div
      className={`storefront-product-card ${isWide ? 'storefront-product-card-wide' : ''}`}
      style={{
        background: '#ffffff',
        borderRadius: '22px',
        border: '1px solid #e2e8f0',
        padding: isWide ? '16px' : '12px',
        display: 'flex',
        flexDirection: isWide ? 'row' : 'column',
        justifyContent: 'space-between',
        gap: isWide ? '16px' : '0',
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
      }}
    >
      {/* Pure White Seamless Studio Product Image Box */}
      <div
        className="storefront-product-photo-box"
        onClick={() => onQuickView?.(product)}
        style={{
          cursor: onQuickView ? 'pointer' : 'default',
          width: isWide ? '180px' : '100%',
          minWidth: isWide ? '180px' : undefined,
          maxWidth: isWide ? '200px' : undefined,
          aspectRatio: '1 / 1',
          maxHeight: isWide ? undefined : '260px',
          borderRadius: '16px',
          background: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: isWide ? '0' : '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          padding: '12px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
          <img
            src={displayPhotoUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
              e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
            }}
            className="storefront-product-img"
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              opacity: imageLoaded ? (isOutOfStock ? 0.65 : 1) : 0.92,
              pointerEvents: 'none',
            }}
            onLoad={() => setImageLoaded(true)}
            data-illustrative={isIllustrativePhoto ? 'true' : undefined}
          />

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
              {t('storefront.storefront_product_card.s0', 'صورة توضيحية')}
            </span>
          )}

          {/* Top Right: Deal / Offer badge (Amazon-style flat matte solid box, centered vertically with heart button) */}
          {primaryBadge && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <span
                className="storefront-product-badge"
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: primaryBadge.color,
                  backgroundColor: primaryBadge.bg,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  boxShadow: 'none',
                  filter: 'none',
                  textShadow: 'none',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: '1.2',
                  letterSpacing: '-0.01em',
                  userSelect: 'none',
                }}
              >
                {primaryBadge.isOut && <ClockIcon size={12} color="#ffffff" />}
                <span>{primaryBadge.text}</span>
              </span>
            </div>
          )}

          {/* Top Left: Interactive Wishlist Heart Button */}
          <button
            className="storefront-product-fav-btn"
            type="button"
            onClick={toggleFavorite}
            aria-label={t('storefront.storefront_product_card.s6', 'إضافة للمفضلة')}
            title={isFavorite ? t('storefront.storefront_product_card.s7', 'محفوظ في المفضلة') : t('storefront.storefront_product_card.s8', 'إضافة إلى المفضلة')}
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              maxWidth: '32px',
              maxHeight: '32px',
              aspectRatio: '1 / 1',
              padding: 0,
              margin: 0,
              boxSizing: 'border-box',
              flexShrink: 0,
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              lineHeight: 1,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={isFavorite ? '#e11d48' : 'none'}
              stroke={isFavorite ? '#e11d48' : '#475569'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

      {/* Product Details & Actions Column */}
      <div
        className="storefront-product-info-col"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: '1 1 auto',
          minWidth: 0,
          height: isWide ? '100%' : 'auto',
        }}
      >
        <div>
          {/* Unboxed Metadata Row: Category · Rating */}
          <div
            className="storefront-product-meta-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              height: '20px',
              minHeight: '20px',
              maxHeight: '20px',
              marginBottom: '5px',
            }}
          >
            <span
              className="storefront-product-cat-tag"
              style={{
                fontSize: '11px',
                color: '#64748b',
                fontWeight: 600,
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
              }}
              title={product.categoryName || t('storefront.storefront_product_card.s9', 'عام')}
            >
              {formatSmartCategoryName(product.categoryName)}
            </span>
          </div>

        {/* Product Title - Clicking opens QuickView modal */}
        <h3
          className="storefront-product-title"
          onClick={() => onQuickView?.(product)}
          style={{
            cursor: onQuickView ? 'pointer' : 'default',
            margin: '0 0 6px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#0f172a',
            lineHeight: '1.4',
            height: '20px',
            minHeight: '20px',
            maxHeight: '20px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
          }}
          title={product.name}
        >
          {product.name}
        </h3>

        {isWide && product.description && (
          <p
            className="storefront-product-wide-desc"
            style={{
              fontSize: '12px',
              color: '#64748b',
              lineHeight: '1.45',
              margin: '0 0 8px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </p>
        )}

        {/* Price Row with Tabular Numerals & Unboxed Savings */}
        {isZeroPrice ? (
          <div
            className="storefront-product-price-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: '28px',
              margin: '2px 0 6px',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b' }}>
              {t('storefront.storefront_product_card.s12', 'السعر عند التواصل')}
            </span>
          </div>
        ) : (
          <div
            className="storefront-product-price-row"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: '6px',
              margin: '2px 0 6px',
              minHeight: '28px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '3px' }}>
              <span
                className="storefront-product-price-main"
                style={{
                  fontSize: '19px',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.3px',
                  lineHeight: 1,
                }}
              >
                {product.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className="storefront-product-price-curr" style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
                <CurrencySymbol />
              </span>
            </div>

            {hasDiscount && (
              <span
                className="storefront-product-price-old"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textDecoration: 'line-through',
                  marginInlineStart: '2px',
                }}
              >
                {oldPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action CTA Container */}
      <div className="storefront-product-action-box" style={{ marginTop: 'auto', paddingTop: '6px', height: '46px', minHeight: '46px', boxSizing: 'border-box' }}>
        {isOutOfStock ? (
          <button
            className="storefront-product-action-btn"
            type="button"
            disabled
            style={{
              width: '100%',
              height: '40px',
              padding: '0 14px',
              borderRadius: '9999px',
              border: '1px solid #cbd5e1',
              background: '#e2e8f0',
              color: '#64748b',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'not-allowed',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>غير متوفر</span>
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
              height: '35px',
              padding: '0 14px',
              borderRadius: '12px',
              border: '1px solid #E0E3E7',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{t('storefront.storefront_product_card.s15', 'استفسر عن السعر')}</span>
          </a>
        ) : cartQuantity > 0 ? (
          <div
            className="storefront-product-stepper"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--storefront-primary-color, #170e5e)',
              borderRadius: '12px',
              padding: '3px',
              boxShadow: '0 3px 12px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.14))',
              boxSizing: 'border-box',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <button
              className="storefront-product-stepper-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(product.id, cartQuantity + 1);
              }}
              title={t('storefront.storefront_product_card.s16', 'زيادة الكمية')}
              style={{
                width: '29px',
                height: '29px',
                minWidth: '29px',
                minHeight: '29px',
                padding: 0,
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              +
            </button>
            <span
              className="storefront-product-stepper-count"
              style={{
                fontSize: '13px',
                fontWeight: 900,
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
              onClick={(e) => {
                e.stopPropagation();
                onUpdateQuantity(product.id, cartQuantity - 1);
              }}
              title={t('storefront.storefront_product_card.s17', 'تقليل الكمية')}
              style={{
                width: '29px',
                height: '29px',
                minWidth: '29px',
                minHeight: '29px',
                padding: 0,
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              -
            </button>
          </div>
        ) : (
          <button
            className="storefront-product-action-btn storefront-gpu-btn"
            type="button"
            onClick={handleAdd}
            style={{
              width: '100%',
              height: '35px',
              padding: '0 14px',
              borderRadius: '12px',
              border: 'none',
              background: justAdded ? '#16a34a' : 'var(--storefront-primary-color, #170e5e)',
              color: 'var(--storefront-primary-contrast, #ffffff)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 10px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.1))',
              boxSizing: 'border-box',
              whiteSpace: 'nowrap',
            }}
          >
            {justAdded ? (
              <>
                <IconCheckCircle size={15} strokeWidth={2.4} color="#ffffff" />
                <span>تمت الإضافة</span>
              </>
            ) : (
              <>
                <IconShoppingCart size={15} strokeWidth={2.2} />
                <span>{t('storefront.storefront_product_card.s18', 'أضف للسلة')}</span>
              </>
            )}
          </button>
        )}
      </div>
      </div>
    </div>
  );
});
