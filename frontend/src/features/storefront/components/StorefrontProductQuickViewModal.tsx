import { buildStorePublicUrl } from '@/lib/store-public-url';
import { useState, useEffect } from 'react';
import { StorefrontProduct, StorefrontInfo } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  XIcon,
  PlusIcon,
  Share2Icon,
  CheckIcon,
  ShoppingBagIcon,
  TruckIcon,
  ClockIcon,
  TagIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { IconStar, IconFlame } from './StorefrontIcons';
import { trackStorefrontEvent } from '../lib/storefront-pixel-tracker';
import { buildCartProduct, getProductVariants, resolveVariantUnitPrice } from '../lib/storefront-variant-pricing';
import { generatePremiumProductSvg, resolveProductPhoto } from '../lib/storefront-photo-matcher';
import { getContrastTextColor } from '../lib/storefront-theme-contrast';

interface StorefrontProductQuickViewModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: StorefrontProduct, quantity: number) => void;
  info?: StorefrontInfo;
  tenantSlug?: string;
  slug?: string;
  /** This product's line already in the cart, if any (the cart holds one variant per product). */
  cartLine?: { variantName?: string | null; quantity: number } | null;
}

export function StorefrontProductQuickViewModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  info,
  tenantSlug,
  slug,
  cartLine,
}: StorefrontProductQuickViewModalProps) {
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [activePhoto, setActivePhoto] = useState('');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);

  // Escape key closes the QuickView modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (product) {
      setQty(1);
      setCopied(false);
      setAddedAnimation(false);
      const gallery = (product as any).gallery || [];
      const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
      const defaultPhoto = gallery[0] || product.imageUrl || autoPhoto.url || '';
      setActivePhoto(defaultPhoto);
      const variants = (product as any).variants || [];
      setSelectedVariantIndex(variants.length > 0 ? 0 : null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPrimaryPhoto = product.imageUrl || autoPhoto.url || '';

  const brandColor = info?.brandColor || 'var(--storefront-primary-color, #170e5e)';
  const brandSurfaceColor = info?.brandSurfaceColor || 'var(--storefront-surface-color, #f8fafc)';
  const brandColorContrast = getContrastTextColor(info?.brandColor);
  const inStock = product.inStock !== false;
  const isLowStock = inStock && product.stockQty > 0 && product.stockQty <= 5;

  const gallery: string[] = (product as any).gallery && (product as any).gallery.length > 0
    ? (product as any).gallery
    : (displayPrimaryPhoto ? [displayPrimaryPhoto] : []);

  const variants = getProductVariants(product);
  const selectedVariant = selectedVariantIndex !== null ? variants[selectedVariantIndex] || null : null;

  // Same rule as the server's pricing engine (SF-4), so the cart shows what checkout will charge.
  const basePrice = resolveVariantUnitPrice(product.price, selectedVariant) ?? product.price;
  const isZeroPrice = Number(basePrice || 0) <= 0;
  const cartHasOtherVariant = Boolean(
    cartLine && (cartLine.variantName || null) !== (selectedVariant?.name || null),
  );

  const effectiveSlug = tenantSlug || slug;
  /*
   * رابط المنتج القابل للمشاركة.
   *
   * كان `#product-<id>` — جزء Hash لا يصل إلى الخادم إطلاقاً، فلا تراه زواحف
   * واتساب/فيسبوك ولا جوجل، وبالتالي لا بطاقة معاينة ولا فهرسة. صار مساراً
   * حقيقياً `/p/:id` يقرؤه الخادم ويرد عليه بوسوم OG.
   */
  const productUrl = `${effectiveSlug ? buildStorePublicUrl(effectiveSlug) : `${window.location.origin}${window.location.pathname.replace(/\/p\/\d+$/, '')}`}/p/${product.id}`;

  const handleShareWhatsApp = () => {
    const text = `شاهد هذا المنتج في ${info?.title || 'متجرنا'}:\n*${product.name}*\nالسعر: ${basePrice} ${info?.currency || 'ج.م'}\n${productUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = () => {
    if (!inStock || isZeroPrice) return;
    const finalProduct = buildCartProduct(product, selectedVariant?.name);
    if (!finalProduct) return;

    onAddToCart(finalProduct, qty);
    setAddedAnimation(true);
    trackStorefrontEvent('AddToCart', {
      contentName: finalProduct.name,
      contentId: product.id,
      value: basePrice * qty,
      currency: info?.currency || 'EGP',
    });
    setTimeout(() => {
      setAddedAnimation(false);
      onClose();
    }, 450);
  };

  return (
    <div
      dir="rtl"
      className="sf-quickview-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        padding: 'min(16px, 3vw)',
      }}
      onClick={onClose}
    >
      <style>{`
        .sf-highlight-text-mobile {
          display: none;
        }
        .sf-highlight-text-full {
          display: inline;
        }
        @media (max-width: 640px) {
          .sf-quickview-backdrop {
            padding: clamp(8px, 2vh, 16px) clamp(8px, 2.5vw, 16px) !important;
            align-items: center !important;
          }
          .sf-quickview-shell {
            max-height: 94vh !important;
            border-radius: 16px !important;
            width: 100% !important;
            max-width: min(100%, 460px) !important;
          }
          .sf-quickview-header {
            padding: clamp(9px, 1.8vh, 12px) 14px !important;
          }
          .sf-quickview-cat-badge {
            font-size: clamp(11.5px, 3.2vw, 12.5px) !important;
            padding: 3px 9px !important;
          }
          .sf-quickview-close-btn {
            width: clamp(30px, 8vw, 34px) !important;
            height: clamp(30px, 8vw, 34px) !important;
            min-width: clamp(30px, 8vw, 34px) !important;
            min-height: clamp(30px, 8vw, 34px) !important;
            max-width: clamp(30px, 8vw, 34px) !important;
            max-height: clamp(30px, 8vw, 34px) !important;
            aspect-ratio: 1 / 1 !important;
            border-radius: 50% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            flex-shrink: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            line-height: 1 !important;
          }
          .sf-quickview-close-btn svg {
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            min-height: 16px !important;
            flex-shrink: 0 !important;
            stroke-width: 2.2 !important;
          }
          .sf-quickview-body {
            padding: clamp(8px, 1.8vh, 14px) clamp(10px, 3.5vw, 16px) !important;
            gap: clamp(8px, 1.5vh, 12px) !important;
          }
          .sf-quickview-photo-wrap {
            gap: 6px !important;
          }
          .sf-quickview-photo-box {
            max-height: clamp(140px, 24vh, 185px) !important;
            height: clamp(140px, 24vh, 185px) !important;
            max-width: clamp(200px, 60vw, 260px) !important;
            aspect-ratio: auto !important;
            padding: 4px 8px !important;
            border-radius: 12px !important;
            margin: 0 auto !important;
          }
          .sf-quickview-photo-img {
            max-height: 100% !important;
            object-fit: contain !important;
          }
          .sf-quickview-lowstock-badge {
            top: 6px !important;
            right: 6px !important;
            font-size: 10px !important;
            padding: 2px 7px !important;
          }
          .sf-quickview-thumbs {
            gap: 6px !important;
            padding-bottom: 2px !important;
          }
          .sf-quickview-thumbs button {
            width: 32px !important;
            height: 32px !important;
            border-radius: 6px !important;
          }
          .sf-quickview-info-section {
            margin-top: 0 !important;
          }
          .sf-quickview-title {
            font-size: clamp(14px, 4vw, 16.5px) !important;
            line-height: 1.35 !important;
            margin-bottom: 3px !important;
            font-weight: 800 !important;
          }
          .sf-quickview-barcode {
            font-size: 9.5px !important;
            padding: 1.5px 5px !important;
          }
          .sf-quickview-price-stock-row {
            margin-top: 3px !important;
            gap: 6px !important;
          }
          .sf-quickview-price-val {
            font-size: clamp(20px, 5.5vw, 24px) !important;
          }
          .sf-quickview-discount-badge {
            font-size: 10px !important;
            padding: 2px 6px !important;
          }
          .sf-quickview-stock-badge {
            font-size: 10px !important;
            padding: 2px 7px !important;
          }
          .sf-quickview-variants-box {
            margin-top: 4px !important;
            padding: 5px 8px !important;
          }
          .sf-quickview-variants-box button {
            padding: 4px 8px !important;
            font-size: 11px !important;
          }
          .sf-quickview-desc {
            margin-top: 4px !important;
            padding: 6px 10px !important;
            font-size: 11.5px !important;
            line-height: 1.4 !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          .sf-highlight-text-mobile {
            display: inline !important;
          }
          .sf-highlight-text-full {
            display: none !important;
          }
          .sf-quickview-highlights-box {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-evenly !important;
            align-items: center !important;
            gap: 6px !important;
            padding: 6px 8px !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
          .sf-quickview-highlight-item {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 5px !important;
            flex: 1 1 0 !important;
            min-width: 0 !important;
          }
          .sf-quickview-highlight-icon {
            width: 20px !important;
            height: 20px !important;
            min-width: 20px !important;
            min-height: 20px !important;
            flex-shrink: 0 !important;
          }
          .sf-quickview-highlight-icon svg {
            width: 11px !important;
            height: 11px !important;
            flex-shrink: 0 !important;
          }
          .sf-quickview-highlight-text {
            font-size: clamp(9.5px, 2.7vw, 11px) !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .sf-quickview-share-bar {
            padding: 3px 0 !important;
            margin-top: 2px !important;
          }
          .sf-quickview-share-label {
            font-size: 10.5px !important;
          }
          .sf-quickview-share-btn {
            padding: 3px 7px !important;
            font-size: 10.5px !important;
            border-radius: 6px !important;
          }
          .sf-quickview-footer {
            padding: clamp(8px, 1.6vh, 12px) 14px !important;
            gap: 8px !important;
          }
          .sf-quickview-stepper {
            padding: 2px !important;
            border-radius: 8px !important;
          }
          .sf-quickview-stepper-btn {
            width: 32px !important;
            height: 32px !important;
            font-size: 15px !important;
          }
          .sf-quickview-stepper-val {
            min-width: 24px !important;
            font-size: 13.5px !important;
            font-weight: 800 !important;
          }
          .sf-quickview-cta-btn {
            height: 42px !important;
            font-size: 13px !important;
            font-weight: 800 !important;
            padding: 0 10px !important;
            border-radius: 8px !important;
          }
        }
      `}</style>
      <div
        className="sf-quickview-shell"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Category and Close */}
        <div
          className="sf-quickview-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="sf-quickview-cat-badge"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: brandColor,
                background: brandSurfaceColor,
                padding: '3px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(23, 14, 94, 0.15)',
              }}
            >
              {product.categoryName || 'تفاصيل الصنف'}
            </span>
            {Boolean(product.rating && product.rating >= 4.5) && (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#b45309',
                  background: '#fef3c7',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
                <span>{Number(product.rating).toFixed(1)}</span>
                {product.reviewCount ? (
                  <span style={{ color: '#92400e', fontSize: '10px' }}>({product.reviewCount} تقييم)</span>
                ) : null}
              </span>
            )}
          </div>

          <button
            type="button"
            className="sf-quickview-close-btn"
            onClick={onClose}
            aria-label="إغلاق النافذة"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              width: '32px',
              height: '32px',
              minWidth: '32px',
              minHeight: '32px',
              maxWidth: '32px',
              maxHeight: '32px',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              padding: 0,
              margin: 0,
              boxSizing: 'border-box',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.15s ease',
              lineHeight: 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <XIcon size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="sf-quickview-body thin-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Main Product Image & Multi-photo Gallery */}
          <div className="sf-quickview-photo-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              className="sf-quickview-photo-box"
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                maxHeight: '300px',
                maxWidth: '300px',
                margin: '0 auto',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: '10px',
                boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
              }}
            >
              {activePhoto || displayPrimaryPhoto ? (
                <img
                  className="sf-quickview-photo-img"
                  src={activePhoto || displayPrimaryPhoto}
                  alt={product.name}
                  onError={(e) => {
                    e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    transition: 'transform 0.25s ease',
                  }}
                />
              ) : (
                <img
                  className="sf-quickview-photo-img"
                  src={generatePremiumProductSvg(product.name, product.categoryName)}
                  alt={product.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              )}

              {/* Urgency Badge overlay on image */}
              {isLowStock && (
                <div
                  className="sf-quickview-lowstock-badge"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <IconFlame size={13} color="#ffffff" strokeWidth={2.2} />
                  <span>متبقي {product.stockQty} قطع فقط!</span>
                </div>
              )}
            </div>

            {/* Gallery Thumbnails (if multiple images) */}
            {gallery.length > 1 && (
              <div className="sf-quickview-thumbs" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', justifyContent: 'center' }}>
                {gallery.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(imgUrl)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      border: activePhoto === imgUrl ? `2px solid ${brandColor}` : '1px solid #e2e8f0',
                      padding: '2px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      flexShrink: 0,
                      boxShadow: activePhoto === imgUrl ? '0 2px 8px rgba(23, 14, 94, 0.2)' : 'none',
                    }}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Title, Barcode & Price */}
          <div className="sf-quickview-info-section">
            <div className="sf-quickview-title-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <h2 className="sf-quickview-title" style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.35 }}>
                {product.name}
              </h2>
              {product.barcode && (
                <span
                  className="sf-quickview-barcode"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    fontFamily: 'monospace',
                    flexShrink: 0,
                  }}
                >
                  {product.barcode}
                </span>
              )}
            </div>

            {/* Price & Stock status */}
            <div className="sf-quickview-price-stock-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                {isZeroPrice ? (
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#475569' }}>
                    السعر عند التواصل
                  </span>
                ) : (
                  <>
                    <span className="sf-quickview-price-val" style={{ fontSize: '24px', fontWeight: 900, color: brandColor, letterSpacing: '-0.5px' }}>
                      {basePrice.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b' }}>
                      <CurrencySymbol />
                    </span>
                    {product.hasDiscount && product.originalPrice && product.originalPrice > product.price && (
                      <span style={{ fontSize: '13.5px', color: '#94a3b8', textDecoration: 'line-through', marginInlineStart: '4px' }}>
                        {product.originalPrice.toLocaleString()} <CurrencySymbol />
                      </span>
                    )}
                    {(product.hasDiscount || product.offerType === 'bogo') && product.offerBadge && (
                      <span
                        className="sf-quickview-discount-badge"
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          background: 'var(--storefront-secondary-color, #e11d48)',
                          color: 'var(--storefront-secondary-contrast, #ffffff)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          marginInlineStart: '4px',
                        }}
                      >
                        {product.offerBadge || (product.discountPercent ? `خصم ${product.discountPercent}%` : 'عرض خاص')}
                      </span>
                    )}
                  </>
                )}
              </div>

              {isZeroPrice ? (
                <span
                  className="sf-quickview-stock-badge"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '20px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ClockIcon size={13} color="#475569" />
                  <span>تواصل لمعرفة السعر</span>
                </span>
              ) : (
                <span
                  className="sf-quickview-stock-badge"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: '20px',
                    backgroundColor: inStock ? '#dcfce7' : '#f8fafc',
                    color: inStock ? '#15803d' : '#64748b',
                    border: inStock ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {inStock ? <CheckCircleIcon size={13} color="#16a34a" /> : <ClockIcon size={13} color="#64748b" />}
                  <span>{inStock ? (product.stockQty >= 999 ? 'متوفر للطلب الفوري' : `متوفر بالمخزون (${product.stockQty})`) : 'ستتوفر قريباً'}</span>
                </span>
              )}
            </div>

            {/* Product Variants (e.g. Size / Options) */}
            {variants.length > 0 && (
              <div className="sf-quickview-variants-box" style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TagIcon size={12} color={brandColor} />
                  <span>اختر المقاس / الحجم:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {variants.map((v, idx) => {
                    const isSelected = selectedVariantIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedVariantIndex(idx)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: isSelected ? `2px solid ${brandColor}` : '1px solid #cbd5e1',
                          background: isSelected ? brandColor : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1e293b',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{v.name}</span>
                        {(() => {
                          const vPrice = resolveVariantUnitPrice(product.price, v);
                          return vPrice !== null && vPrice !== product.price ? <span>({vPrice.toLocaleString()} ج)</span> : null;
                        })()}
                      </button>
                    );
                  })}
                </div>
                {cartHasOtherVariant && cartLine && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 10px', lineHeight: 1.5 }}>
                    في سلتك الآن {cartLine.variantName ? `المقاس «${cartLine.variantName}»` : 'هذا الصنف'} ({cartLine.quantity}). الإضافة ستستبدله بالمقاس المختار، لأن الطلب الواحد يقبل مقاساً واحداً لكل صنف.
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div
                className="sf-quickview-desc"
                style={{
                  marginTop: '10px',
                  fontSize: '12.5px',
                  lineHeight: '1.55',
                  color: '#334155',
                  textAlign: 'justify',
                  textJustify: 'inter-word',
                  backgroundColor: '#f8fafc',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                }}
              >
                {product.description}
              </div>
            )}
          </div>

          {/* Social Proof & Delivery Highlights */}
          <div
            className="sf-quickview-highlights-box"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div className="sf-quickview-highlight-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="sf-quickview-highlight-icon" style={{ width: 26, height: 26, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TruckIcon size={13} color="#170e5e" />
              </div>
              <span className="sf-quickview-highlight-text" style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                <span className="sf-highlight-text-full">توصيل سريع حتى باب منزلك</span>
                <span className="sf-highlight-text-mobile">توصيل سريع للباب</span>
              </span>
            </div>
            <div className="sf-quickview-highlight-item" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="sf-quickview-highlight-icon" style={{ width: 26, height: 26, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ClockIcon size={13} color="#b45309" />
              </div>
              <span className="sf-quickview-highlight-text" style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                <span className="sf-highlight-text-full">تجهيز فوري طازج عند الطلب</span>
                <span className="sf-highlight-text-mobile">تجهيز فوري للطلب</span>
              </span>
            </div>
          </div>

          {/* Share Product Bar */}
          <div
            className="sf-quickview-share-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <span className="sf-quickview-share-label" style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b' }}>مشاركة الصنف:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="sf-quickview-share-btn"
                onClick={handleShareWhatsApp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>واتساب</span>
              </button>
              <button
                type="button"
                className="sf-quickview-share-btn"
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #e2e8f0',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {copied ? <CheckIcon size={13} color="#16a34a" /> : <Share2Icon size={13} />}
                <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Pinned Bottom Footer (Always Visible, Zero Clipping) */}
        <div
          className="sf-quickview-footer"
          style={{
            flexShrink: 0,
            background: '#ffffff',
            borderTop: '1px solid #f1f5f9',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.05)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          {isZeroPrice ? (
            <a
              className="sf-quickview-cta-btn"
              href={
                (info?.whatsappPhone || (info as any)?.whatsapp)
                  ? `https://wa.me/${((info?.whatsappPhone || (info as any)?.whatsapp) || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن سعر وتوفر صنف: ${product.name}`)}`
                  : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#f0fdf4',
                color: '#166534',
                border: '1.5px solid #bbf7d0',
                fontSize: '13.5px',
                fontWeight: 800,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dcfce7';
                e.currentTarget.style.borderColor = '#86efac';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f0fdf4';
                e.currentTarget.style.borderColor = '#bbf7d0';
              }}
            >
              <svg width="18" height="18" fill="#25d366" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
              </svg>
              <span>استفسر عن السعر عبر واتساب</span>
            </a>
          ) : (
            <>
              {/* Quantity Stepper */}
              <div
                className="sf-quickview-stepper"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '2px',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="sf-quickview-stepper-btn"
                  disabled={!inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty)}
                  onClick={() => setQty((prev) => prev + 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty) ? 'not-allowed' : 'pointer',
                    opacity: product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty ? 0.4 : 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    fontWeight: 800,
                    fontSize: '15px',
                    color: '#0f172a',
                  }}
                >
                  <PlusIcon size={14} color="#0f172a" />
                </button>
                <span
                  className="sf-quickview-stepper-val"
                  style={{
                    minWidth: '28px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  className="sf-quickview-stepper-btn"
                  disabled={qty <= 1 || !inStock}
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: qty <= 1 || !inStock ? 'not-allowed' : 'pointer',
                    opacity: qty <= 1 ? 0.4 : 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    fontWeight: 800,
                    fontSize: '15px',
                    color: '#0f172a',
                  }}
                >
                  -
                </button>
              </div>

              {/* Add to Cart CTA */}
              <button
                type="button"
                className="sf-quickview-cta-btn"
                disabled={!inStock}
                onClick={handleAdd}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: inStock ? brandColor : '#f8fafc',
                  color: inStock ? (brandColorContrast || 'var(--storefront-primary-contrast, #ffffff)') : '#64748b',
                  border: inStock ? 'none' : '1px solid #e2e8f0',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: inStock ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: inStock ? '0 2px 8px var(--storefront-primary-subtle, rgba(0, 0, 0, 0.15))' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  padding: '0 10px',
                }}
              >
                {addedAnimation ? (
                  <>
                    <CheckIcon size={16} color="#ffffff" />
                    <span>تمت الإضافة بنجاح!</span>
                  </>
                ) : inStock ? (
                  <>
                    <ShoppingBagIcon size={16} color="#ffffff" />
                    <span>إضافة إلى السلة ({(basePrice * qty).toLocaleString()} <CurrencySymbol />)</span>
                  </>
                ) : (
                  <>
                    <ClockIcon size={16} color="#64748b" />
                    <span>ستتوفر قريباً</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
