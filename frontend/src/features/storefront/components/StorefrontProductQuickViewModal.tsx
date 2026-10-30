import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StorefrontProduct, StorefrontInfo } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  XIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  Share2Icon,
  CopyIcon,
  TruckIcon,
  ShieldCheckIcon,
  BarcodeIcon,
} from '@/shared/components/icons/AppIcons';
import {
  IconFlame,
  IconShoppingCart,
  IconStar,
  IconWhatsapp,
  IconCheckCircle,
} from './StorefrontIcons';
import { trackStorefrontEvent } from '../lib/storefront-pixel-tracker';
import { buildCartProduct, getProductVariants, resolveVariantUnitPrice } from '../lib/storefront-variant-pricing';
import { generatePremiumProductSvg, resolveProductPhoto } from '../lib/storefront-photo-matcher';
import { getContrastTextColor } from '../lib/storefront-theme-contrast';

interface TapOriginMetrics {
  dx: number;
  dy: number;
  scale: number;
  timestamp: number;
}

// Tracks the exact screen coordinates & bounding rect of the last tapped product card for Apple iOS spring morphing
let lastProductTapOrigin: TapOriginMetrics | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const cardEl = target.closest(
        '.storefront-product-card, .storefront-coverflow-card, .sf-amz-quick-tile, .sf-amz-promo-card, .sf-amz-hero-orange-card, .storefront-deal-spotlight'
      ) as HTMLElement | null;

      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 800;

      if (cardEl) {
        const rect = cardEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const ratio = Math.min(rect.width / 460, rect.height / 520);
        lastProductTapOrigin = {
          dx: Math.round(cx - vw / 2),
          dy: Math.round(cy - vh / 2),
          scale: Number(Math.max(0.28, Math.min(0.52, ratio)).toFixed(3)),
          timestamp: performance.now(),
        };
      } else if (e.clientX && e.clientY) {
        lastProductTapOrigin = {
          dx: Math.round(e.clientX - vw / 2),
          dy: Math.round(e.clientY - vh / 2),
          scale: 0.36,
          timestamp: performance.now(),
        };
      }
    },
    { capture: true, passive: true }
  );
}

export interface StorefrontProductQuickViewModalProps {
  product: StorefrontProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: StorefrontProduct, quantity: number) => void;
  info?: StorefrontInfo;
  tenantSlug?: string;
  slug?: string;
  /** This product's line already in the cart, if any (the cart holds one variant per product). */
  cartLine?: { variantName?: string | null; quantity: number } | null;
  /** Related / recommended products from the store catalog */
  allProducts?: StorefrontProduct[];
  onSelectProduct?: (product: StorefrontProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: number) => void;
  onOpenReviewModal?: (product: StorefrontProduct) => void;
}

export function StorefrontProductQuickViewModal({
  product: propProduct,
  isOpen,
  onClose,
  onAddToCart,
  info,
  tenantSlug,
  slug,
  cartLine,
  allProducts = [],
  onSelectProduct,
  isFavorite: isFavoriteProp,
  onToggleFavorite,
  onOpenReviewModal,
}: StorefrontProductQuickViewModalProps) {
  const { t } = useTranslation();
  const [mountedProduct, setMountedProduct] = useState<StorefrontProduct | null>(propProduct);
  const [isClosing, setIsClosing] = useState(false);
  const [originMetrics, setOriginMetrics] = useState<TapOriginMetrics>({ dx: 0, dy: 48, scale: 0.38, timestamp: 0 });
  const closeTimerRef = useRef<number | null>(null);

  const [qty, setQty] = useState(1);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const [activePhoto, setActivePhoto] = useState('');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(false);

  // Sync open/close state with Apple iOS spring launch & dismiss lifecycle
  useEffect(() => {
    if (isOpen && propProduct) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      const now = performance.now();
      if (lastProductTapOrigin && now - lastProductTapOrigin.timestamp < 1500) {
        setOriginMetrics(lastProductTapOrigin);
      } else {
        setOriginMetrics({ dx: 0, dy: 64, scale: 0.42, timestamp: now });
      }
      setMountedProduct(propProduct);
      setIsClosing(false);
    } else if (!isOpen && mountedProduct) {
      setIsClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        setMountedProduct(null);
        setIsClosing(false);
        closeTimerRef.current = null;
      }, 250);
    }
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen, propProduct]);

  const handleAnimatedClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setMountedProduct(null);
      setIsClosing(false);
      closeTimerRef.current = null;
      onClose();
    }, 240);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleAnimatedClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleAnimatedClose]);

  const product = propProduct || mountedProduct;

  useEffect(() => {
    if (propProduct) {
      setQty(1);
      setAddedAnimation(false);
      setCopiedLink(false);
      const gallery = (propProduct as any).gallery || [];
      const autoPhoto = resolveProductPhoto(propProduct.name, propProduct.categoryName);
      const defaultPhoto = gallery[0] || propProduct.imageUrl || autoPhoto.url || '';
      setActivePhoto(defaultPhoto);
      const variants = (propProduct as any).variants || [];
      setSelectedVariantIndex(variants.length > 0 ? 0 : null);
      try {
        setLocalFavorite(localStorage.getItem(`zs_fav_${propProduct.id}`) === 'true');
      } catch {
        setLocalFavorite(false);
      }
    }
  }, [propProduct]);

  const relatedProducts = useMemo(() => {
    if (!product || !allProducts || allProducts.length === 0) return [];
    const sameCat = allProducts.filter(
      (p) => Number(p.id) !== Number(product.id) && p.inStock !== false && p.categoryName === product.categoryName
    );
    if (sameCat.length >= 3) return sameCat.slice(0, 4);
    const others = allProducts.filter(
      (p) => Number(p.id) !== Number(product.id) && p.inStock !== false && p.categoryName !== product.categoryName
    );
    return [...sameCat, ...others].slice(0, 4);
  }, [product, allProducts]);

  if (!product || (!isOpen && !mountedProduct)) return null;

  const isFavorite = isFavoriteProp !== undefined ? isFavoriteProp : localFavorite;

  const handleFavoriteClick = () => {
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

  const getProductDirectUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const activeSlug = tenantSlug || slug || info?.slug || 'demo';
    const pathMatch = window.location.pathname.match(/^\/(st|store|shop)\/[^/]+/);
    const basePath = pathMatch ? pathMatch[0] : `/st/${activeSlug}`;
    return `${origin}${basePath}/p/${product.id}`;
  };

  const handleCopyProductLink = async () => {
    const shareUrl = getProductDirectUrl();
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: `${product.name} - ${product.price.toLocaleString()} ${info?.currency || 'ج.م'}`,
          url: shareUrl,
        });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {}
  };

  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPrimaryPhoto = product.imageUrl || autoPhoto.url || '';

  const brandColor = info?.brandColor || 'var(--storefront-primary-color, #2d68c4)';
  const brandColorContrast = getContrastTextColor(info?.brandColor);
  const inStock = product.inStock !== false;
  const isLowStock = inStock && product.stockQty > 0 && product.stockQty <= 5;

  const gallery: string[] =
    (product as any).gallery && (product as any).gallery.length > 0
      ? (product as any).gallery
      : displayPrimaryPhoto
      ? [displayPrimaryPhoto]
      : [];

  const variants = getProductVariants(product);
  const selectedVariant = selectedVariantIndex !== null ? variants[selectedVariantIndex] || null : null;

  const basePrice = resolveVariantUnitPrice(product.price, selectedVariant) ?? product.price;
  const isZeroPrice = Number(basePrice || 0) <= 0;
  const cartHasOtherVariant = Boolean(
    cartLine && (cartLine.variantName || null) !== (selectedVariant?.name || null)
  );

  const hasOriginalDiscount = Boolean(product.hasDiscount && product.originalPrice && product.originalPrice > basePrice);
  const savingsAmount = hasOriginalDiscount && product.originalPrice ? Math.max(0, product.originalPrice - basePrice) : 0;
  const discountPercentage =
    product.discountPercent ||
    (hasOriginalDiscount && product.originalPrice
      ? Math.round(((product.originalPrice - basePrice) / product.originalPrice) * 100)
      : 0);

  const ratingValue = Number(product.rating || 4.9);
  const reviewCountValue = Number(product.reviewCount || 24);

  const cleanWhatsappPhone = ((info?.whatsappPhone || (info as any)?.whatsapp) || '').replace(/[^0-9]/g, '');
  const whatsappInquiryUrl = cleanWhatsappPhone
    ? `https://wa.me/${cleanWhatsappPhone}?text=${encodeURIComponent(
        `مرحباً، أود الاستفسار عن صنف: ${product.name}${selectedVariant ? ` (${selectedVariant.name})` : ''} - بسعر ${basePrice.toLocaleString()} ${info?.currency || 'ج.م'}`
      )}`
    : null;

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
      handleAnimatedClose();
    }, 320);
  };

  return (
    <div
      dir="rtl"
      className={`sf-quickview-backdrop ${isClosing ? 'is-closing' : 'is-opening'}`}
      style={
        {
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'min(16px, 3.5vw)',
          '--ios-origin-x': `${originMetrics.dx}px`,
          '--ios-origin-y': `${originMetrics.dy}px`,
          '--ios-init-scale': `${originMetrics.scale}`,
        } as React.CSSProperties
      }
      onClick={handleAnimatedClose}
    >
      <style>{`
        /* ============================================================================
           Apple iOS 18 App-Launch / App-Store Card Spring Morph Physics (120Hz GPU)
           ============================================================================ */
        @keyframes sfIosBackdropIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes sfIosBackdropOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes sfIosAppLaunchOpen {
          0% {
            opacity: 0;
            transform: translate3d(var(--ios-origin-x, 0px), var(--ios-origin-y, 48px), 0) scale3d(var(--ios-init-scale, 0.36), var(--ios-init-scale, 0.36), 1);
          }
          14% {
            opacity: 1;
          }
          66% {
            opacity: 1;
            transform: translate3d(calc(var(--ios-origin-x, 0px) * -0.016), calc(var(--ios-origin-y, 48px) * -0.016), 0) scale3d(1.016, 1.016, 1);
          }
          86% {
            transform: translate3d(0, 0, 0) scale3d(0.997, 0.997, 1);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
        }

        @keyframes sfIosAppLaunchClose {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
          100% {
            opacity: 0;
            transform: translate3d(var(--ios-origin-x, 0px), var(--ios-origin-y, 48px), 0) scale3d(var(--ios-init-scale, 0.34), var(--ios-init-scale, 0.34), 1);
          }
        }

        @keyframes sfIosPhotoFloatIn {
          0% {
            opacity: 0.4;
            transform: scale3d(0.84, 0.84, 1) translate3d(0, 10px, 0);
          }
          66% {
            opacity: 1;
            transform: scale3d(1.024, 1.024, 1) translate3d(0, -2px, 0);
          }
          100% {
            opacity: 1;
            transform: scale3d(1, 1, 1) translate3d(0, 0, 0);
          }
        }

        @keyframes sfIosContentCascadeIn {
          0% {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        .sf-quickview-backdrop {
          background-color: rgba(15, 23, 42, 0.52);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          will-change: opacity;
        }
        .sf-quickview-backdrop.is-opening {
          animation: sfIosBackdropIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sf-quickview-backdrop.is-closing {
          animation: sfIosBackdropOut 0.22s cubic-bezier(0.32, 0.72, 0, 1) forwards;
          pointer-events: none;
        }

        .sf-quickview-shell {
          will-change: transform, opacity;
          transform-origin: center center;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .sf-quickview-backdrop.is-opening .sf-quickview-shell {
          animation: sfIosAppLaunchOpen 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sf-quickview-backdrop.is-closing .sf-quickview-shell {
          animation: sfIosAppLaunchClose 0.22s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }

        .sf-quickview-backdrop.is-opening .sf-quickview-photo-img {
          animation: sfIosPhotoFloatIn 0.48s cubic-bezier(0.22, 1, 0.36, 1) 0.02s both;
        }
        .sf-quickview-backdrop.is-opening .sf-quickview-info-section {
          animation: sfIosContentCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }
        .sf-quickview-backdrop.is-opening .sf-quickview-footer {
          animation: sfIosContentCascadeIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
        }

        .sf-quickview-ai-btn:active {
          transform: scale3d(0.96, 0.96, 1) !important;
        }

        .sf-quickview-related-card:hover {
          border-color: #cbd5e1 !important;
          transform: translateY(-2px);
        }

        @media (max-width: 640px) {
          .sf-quickview-shell {
            max-width: min(100%, 440px) !important;
            border-radius: 24px !important;
            padding: 14px 15px 16px !important;
          }
          .sf-quickview-photo-box {
            height: 215px !important;
          }
          .sf-quickview-trust-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
          }
        }
      `}</style>

      <div
        className="sf-quickview-shell"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          border: '1px solid #edf1f7',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '91vh',
          boxShadow: '0 28px 60px -12px rgba(15, 23, 42, 0.26), 0 4px 16px -2px rgba(15, 23, 42, 0.08)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '16px 20px 18px',
          gap: '12px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Row: Category Pill + Stock Status on Right | Share + Wishlist + Close on Left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
            {product.categoryName && (
              <span
                className="sf-quickview-cat-badge"
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e293b',
                  background: '#f4f6fa',
                  border: '1px solid #e2e8f0',
                  padding: '0 12px',
                  height: '34px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '11px',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  maxWidth: '210px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {product.categoryName}
              </span>
            )}

            {/* Availability Status Badge */}
            {inStock ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isLowStock ? '#c2410c' : '#15803d',
                  background: isLowStock ? '#fff7ed' : '#f0fdf4',
                  border: `1px solid ${isLowStock ? '#fed7aa' : '#bbf7d0'}`,
                  padding: '0 9px',
                  height: '34px',
                  borderRadius: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {isLowStock ? (
                  <>
                    <IconFlame size={12} color="#c2410c" strokeWidth={2.2} />
                    <span>
                      {t('storefront.storefront_product_quick_view_modal.s3', 'متبقي')} {product.stockQty}{' '}
                      {t('storefront.storefront_product_quick_view_modal.s4', 'فقط')}
                    </span>
                  </>
                ) : (
                  <>
                    <IconCheckCircle size={12} color="#16a34a" strokeWidth={2.3} />
                    <span>متوفر في المخزون</span>
                  </>
                )}
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#b91c1c',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  padding: '0 9px',
                  height: '34px',
                  borderRadius: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <ClockIcon size={12} color="#b91c1c" />
                <span>نفدت الكمية</span>
              </span>
            )}
          </div>

          {/* Left Action Controls: Share / Copy Link + Favorite Heart + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleCopyProductLink}
              className="sf-quickview-ai-btn"
              title={copiedLink ? 'تم نسخ رابط المنتج' : 'مشاركة / نسخ رابط المنتج'}
              style={{
                background: copiedLink ? '#f0fdf4' : '#ffffff',
                border: `1px solid ${copiedLink ? '#86efac' : '#dadce0'}`,
                height: '34px',
                padding: copiedLink ? '0 10px' : '0',
                width: copiedLink ? 'auto' : '34px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                color: copiedLink ? '#15803d' : '#475569',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.16s ease',
              }}
            >
              {copiedLink ? (
                <>
                  <CheckIcon size={14} color="#16a34a" strokeWidth={2.4} />
                  <span>تم النسخ</span>
                </>
              ) : (
                <Share2Icon size={15} color="#475569" strokeWidth={2.1} />
              )}
            </button>

            <button
              type="button"
              onClick={handleFavoriteClick}
              className="sf-quickview-ai-btn"
              aria-label="إضافة إلى المفضلة"
              title={isFavorite ? 'محفوظ في المفضلة' : 'إضافة إلى المفضلة'}
              style={{
                background: isFavorite ? '#fff1f2' : '#ffffff',
                border: `1px solid ${isFavorite ? '#fecdd3' : '#dadce0'}`,
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.16s ease',
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
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            <button
              type="button"
              className="sf-quickview-close-btn sf-quickview-ai-btn"
              onClick={handleAnimatedClose}
              aria-label={t('storefront.storefront_product_quick_view_modal.s2', 'إغلاق النافذة')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#3c4043',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f4f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#dadce0';
              }}
            >
              <XIcon size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div
          className="sf-quickview-body thin-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            paddingLeft: '2px',
          }}
        >
          {/* Product Image Stage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              className="sf-quickview-photo-box"
              style={{
                width: '100%',
                height: '240px',
                borderRadius: '20px',
                backgroundColor: '#f4f6fa',
                border: '1px solid #edf1f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: '18px',
                boxSizing: 'border-box',
              }}
            >
              <img
                className="sf-quickview-photo-img"
                src={activePhoto || displayPrimaryPhoto || generatePremiumProductSvg(product.name, product.categoryName)}
                alt={product.name}
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
                }}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 20px rgba(15, 23, 42, 0.08))',
                }}
              />

              {/* Discount % Corner Pill on Image */}
              {discountPercentage > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#CC0C39',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(204, 12, 57, 0.25)',
                  }}
                >
                  خصم {discountPercentage}%
                </div>
              )}

              {/* SKU / Barcode Pill on Bottom Left of Image */}
              {product.barcode && (
                <div
                  dir="ltr"
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '7px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <BarcodeIcon size={11} color="#64748b" />
                  <span>{product.barcode}</span>
                </div>
              )}
            </div>

            {/* Gallery Thumbnails (if multiple images) */}
            {gallery.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', justifyContent: 'center' }}>
                {gallery.map((imgUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhoto(imgUrl)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      border: activePhoto === imgUrl ? `2px solid ${brandColor}` : '1px solid #e2e8f0',
                      padding: '3px',
                      background: '#ffffff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info: Title + Rating + Price + Description + Variants + Trust Highlights */}
          <div className="sf-quickview-info-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Title & Interactive Rating Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                {/* Star Rating & Review Trigger */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#fefce8',
                      border: '1px solid #fef08a',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: '#b45309',
                    }}
                  >
                    <IconStar size={12} fill="#f59e0b" color="#f59e0b" />
                    <span>{ratingValue.toFixed(1)}</span>
                    <span style={{ color: '#92400e', fontWeight: 600, fontSize: '10.5px' }}>
                      ({reviewCountValue} تقييم)
                    </span>
                  </div>

                  {onOpenReviewModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenReviewModal(product);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '2px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: brandColor,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        fontFamily: 'inherit',
                      }}
                    >
                      أضف تقييمك
                    </button>
                  )}
                </div>

                {/* Copy Direct Link Text Action */}
                <button
                  type="button"
                  onClick={handleCopyProductLink}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'inherit',
                  }}
                >
                  <CopyIcon size={11} color="#64748b" />
                  <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط المنتج'}</span>
                </button>
              </div>

              <h2
                style={{
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {product.name}
              </h2>

              {/* Price Row with Original Price, Offer Badge, and Savings Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '2px',
                }}
              >
                {isZeroPrice ? (
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#475569' }}>
                    {t('storefront.storefront_product_quick_view_modal.s5', 'السعر عند التواصل')}
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: '24px',
                        fontWeight: 900,
                        color: brandColor,
                        letterSpacing: '-0.4px',
                        lineHeight: 1.1,
                      }}
                    >
                      {basePrice.toLocaleString()}{' '}
                      <span style={{ fontSize: '13.5px', fontWeight: 800 }}>
                        <CurrencySymbol />
                      </span>
                    </span>

                    {hasOriginalDiscount && product.originalPrice && (
                      <span
                        style={{
                          fontSize: '13.5px',
                          color: '#94a3b8',
                          textDecoration: 'line-through',
                          fontWeight: 600,
                        }}
                      >
                        {product.originalPrice.toLocaleString()} <CurrencySymbol />
                      </span>
                    )}

                    {(product.hasDiscount || product.offerType === 'bogo') && product.offerBadge && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#CC0C39',
                          color: '#ffffff',
                          padding: '3px 9px',
                          borderRadius: '8px',
                        }}
                      >
                        {product.offerBadge}
                      </span>
                    )}

                    {savingsAmount > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          padding: '2.5px 8px',
                          borderRadius: '8px',
                        }}
                      >
                        وفر {savingsAmount.toLocaleString()} <CurrencySymbol />
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Clean Description Box */}
            {product.description && (
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.65,
                  color: '#475569',
                  fontWeight: 500,
                  background: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #edf1f7',
                }}
              >
                {product.description}
              </p>
            )}

            {/* Variant Selector Buttons */}
            {variants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  اختر المواصفات / المقاس المتاح:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {variants.map((v, idx) => {
                    const isSelected = selectedVariantIndex === idx;
                    const vPrice = resolveVariantUnitPrice(product.price, v);
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="sf-quickview-ai-btn"
                        onClick={() => setSelectedVariantIndex(idx)}
                        style={{
                          height: '36px',
                          padding: '0 14px',
                          borderRadius: '11px',
                          border: isSelected ? `1.5px solid ${brandColor}` : '1px solid #dadce0',
                          background: isSelected ? brandColor : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1f1f1f',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          boxShadow: isSelected ? '0 3px 8px rgba(45, 104, 196, 0.2)' : '0 1px 2px rgba(15, 23, 42, 0.03)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{v.name}</span>
                        {vPrice !== null && vPrice !== product.price && (
                          <span style={{ opacity: 0.9 }}>
                            ({vPrice.toLocaleString()} {t('storefront.storefront_product_quick_view_modal.s11', 'ج')})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {cartHasOtherVariant && cartLine && (
                  <div
                    style={{
                      fontSize: '11.5px',
                      color: '#92400e',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '5px 10px',
                      fontWeight: 600,
                      alignSelf: 'flex-start',
                    }}
                  >
                    {t('storefront.storefront_product_quick_view_modal.s12', 'في سلتك الآن')}{' '}
                    {cartLine.variantName
                      ? `«${cartLine.variantName}»`
                      : t('storefront.storefront_product_quick_view_modal.s13', 'هذا الصنف')}{' '}
                    ({cartLine.quantity})
                  </div>
                )}
              </div>
            )}

            {/* Store Trust & Delivery Highlights Strip */}
            <div
              className="sf-quickview-trust-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginTop: '2px',
              }}
            >
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #edf1f7',
                  borderRadius: '12px',
                  padding: '8px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '4px',
                }}
              >
                <TruckIcon size={15} color={brandColor} strokeWidth={2.1} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', lineHeight: 1.25 }}>
                  {info?.freeShippingEnabled && info?.freeShippingMinOrder
                    ? `شحن مجاني فوق ${info.freeShippingMinOrder}`
                    : 'توصيل سريع لباب البيت'}
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #edf1f7',
                  borderRadius: '12px',
                  padding: '8px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '4px',
                }}
              >
                <ShieldCheckIcon size={15} color="#16a34a" strokeWidth={2.1} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', lineHeight: 1.25 }}>
                  منتج أصلي مضمون 100%
                </span>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #edf1f7',
                  borderRadius: '12px',
                  padding: '8px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '4px',
                }}
              >
                <IconCheckCircle size={15} color="#d97706" strokeWidth={2.1} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', lineHeight: 1.25 }}>
                  دفع آمن عند الاستلام
                </span>
              </div>
            </div>

            {/* Related Products Mini Carousel (If available) */}
            {relatedProducts.length > 0 && onSelectProduct && (
              <div
                style={{
                  marginTop: '4px',
                  paddingTop: '10px',
                  borderTop: '1px solid #edf1f7',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                    منتجات مشابهة قد تعجبك
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                    اضغط للعرض السريع
                  </span>
                </div>

                <div
                  className="thin-scrollbar"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '8px',
                  }}
                >
                  {relatedProducts.map((rel) => {
                    const relPhoto =
                      rel.imageUrl ||
                      resolveProductPhoto(rel.name, rel.categoryName).url ||
                      generatePremiumProductSvg(rel.name, rel.categoryName);
                    return (
                      <button
                        key={rel.id}
                        type="button"
                        className="sf-quickview-related-card"
                        onClick={() => onSelectProduct(rel)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.16s ease',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '46px',
                            borderRadius: '8px',
                            background: '#f4f6fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <img
                            src={relPhoto}
                            alt={rel.name}
                            onError={(e) => {
                              e.currentTarget.src = generatePremiumProductSvg(rel.name, rel.categoryName);
                            }}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#1e293b',
                            width: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {rel.name}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: brandColor }}>
                          {rel.price.toLocaleString()} <CurrencySymbol />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer: Add to Cart + RTL Stepper [ + ] (qty) [ - ] + WhatsApp Direct Inquiry */}
        <div
          className="sf-quickview-footer"
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            {isZeroPrice ? (
              <a
                className="sf-quickview-cta-btn sf-quickview-ai-btn"
                href={whatsappInquiryUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#25d366',
                  color: '#ffffff',
                  border: '1px solid #22c55e',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.16s ease, opacity 0.16s ease',
                }}
              >
                <IconWhatsapp size={17} color="#ffffff" />
                <span>{t('storefront.storefront_product_quick_view_modal.s23', 'استفسر عن السعر عبر واتساب')}</span>
              </a>
            ) : (
              <>
                {/* Add to Cart Button */}
                <button
                  type="button"
                  className="sf-quickview-cta-btn sf-quickview-ai-btn"
                  disabled={!inStock}
                  onClick={handleAdd}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: inStock ? brandColor : '#f1f3f4',
                    color: inStock ? brandColorContrast || '#ffffff' : '#64748b',
                    border: inStock ? `1px solid ${brandColor}` : '1px solid #dadce0',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: inStock ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(45, 104, 196, 0.18)',
                    transition: 'transform 0.16s ease, background-color 0.16s ease, opacity 0.16s ease',
                    whiteSpace: 'nowrap',
                    padding: '0 16px',
                    boxSizing: 'border-box',
                  }}
                >
                  {addedAnimation ? (
                    <>
                      <span>{t('storefront.storefront_product_quick_view_modal.s24', 'تمت الإضافة بنجاح')}</span>
                      <CheckIcon size={16} color="#ffffff" />
                    </>
                  ) : inStock ? (
                    <>
                      <span>
                        {t('storefront.storefront_product_quick_view_modal.s25', 'إضافة إلى السلة (')}
                        {(basePrice * qty).toLocaleString()} <CurrencySymbol />)
                      </span>
                      <IconShoppingCart size={16} color="#ffffff" strokeWidth={2.2} />
                    </>
                  ) : (
                    <>
                      <span>{t('storefront.storefront_product_quick_view_modal.s26', 'ستتوفر قريباً')}</span>
                      <ClockIcon size={16} color="#64748b" />
                    </>
                  )}
                </button>

                {/* Quantity Stepper in RTL Order: [ + ] (qty) [ - ] */}
                <div
                  className="sf-quickview-stepper"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: '38px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #dadce0',
                    borderRadius: '12px',
                    padding: '2px 4px',
                    gap: '2px',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <button
                    type="button"
                    className="sf-quickview-stepper-btn sf-quickview-ai-btn"
                    disabled={!inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty)}
                    onClick={() => setQty((prev) => prev + 1)}
                    title="زيادة الكمية"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '9px',
                      border: '1px solid #dadce0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor:
                        !inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty)
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty ? 0.4 : 1,
                      color: '#1f1f1f',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <PlusIcon size={14} color="#1f1f1f" />
                  </button>
                  <span
                    style={{
                      minWidth: '28px',
                      textAlign: 'center',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="sf-quickview-stepper-btn sf-quickview-ai-btn"
                    disabled={qty <= 1 || !inStock}
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                    title="تقليل الكمية"
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '9px',
                      border: '1px solid #dadce0',
                      backgroundColor: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: qty <= 1 || !inStock ? 'not-allowed' : 'pointer',
                      opacity: qty <= 1 ? 0.4 : 1,
                      fontWeight: 800,
                      fontSize: '15px',
                      color: '#1f1f1f',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    -
                  </button>
                </div>

                {/* WhatsApp Direct Product Inquiry Button */}
                {whatsappInquiryUrl && (
                  <a
                    href={whatsappInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="استفسر عن هذا المنتج عبر واتساب"
                    className="sf-quickview-ai-btn"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      textDecoration: 'none',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <IconWhatsapp size={18} color="#16a34a" />
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
