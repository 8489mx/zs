import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef } from 'react';
import { StorefrontProduct, StorefrontInfo } from '../types/storefront.types';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import {
  XIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
} from '@/shared/components/icons/AppIcons';
import { IconFlame, IconShoppingCart } from './StorefrontIcons';
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
  product: propProduct,
  isOpen,
  onClose,
  onAddToCart,
  info,
  cartLine,
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
      const gallery = (propProduct as any).gallery || [];
      const autoPhoto = resolveProductPhoto(propProduct.name, propProduct.categoryName);
      const defaultPhoto = gallery[0] || propProduct.imageUrl || autoPhoto.url || '';
      setActivePhoto(defaultPhoto);
      const variants = (propProduct as any).variants || [];
      setSelectedVariantIndex(variants.length > 0 ? 0 : null);
    }
  }, [propProduct]);

  if (!product || (!isOpen && !mountedProduct)) return null;

  const autoPhoto = resolveProductPhoto(product.name, product.categoryName);
  const displayPrimaryPhoto = product.imageUrl || autoPhoto.url || '';

  const brandColor = info?.brandColor || 'var(--storefront-primary-color, #2d68c4)';
  const brandColorContrast = getContrastTextColor(info?.brandColor);
  const inStock = product.inStock !== false;
  const isLowStock = inStock && product.stockQty > 0 && product.stockQty <= 5;

  const gallery: string[] = (product as any).gallery && (product as any).gallery.length > 0
    ? (product as any).gallery
    : (displayPrimaryPhoto ? [displayPrimaryPhoto] : []);

  const variants = getProductVariants(product);
  const selectedVariant = selectedVariantIndex !== null ? variants[selectedVariantIndex] || null : null;

  const basePrice = resolveVariantUnitPrice(product.price, selectedVariant) ?? product.price;
  const isZeroPrice = Number(basePrice || 0) <= 0;
  const cartHasOtherVariant = Boolean(
    cartLine && (cartLine.variantName || null) !== (selectedVariant?.name || null),
  );

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
      style={{
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
      } as React.CSSProperties}
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
          background-color: rgba(15, 23, 42, 0.48);
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

        @media (max-width: 640px) {
          .sf-quickview-shell {
            max-width: min(100%, 420px) !important;
            border-radius: 20px !important;
          }
          .sf-quickview-photo-box {
            height: 210px !important;
          }
        }
      `}</style>

      <div
        className="sf-quickview-shell"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          border: '1px solid #E0E3E7',
          maxWidth: '440px',
          width: '100%',
          maxHeight: '90vh',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.22)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: '16px 18px 18px',
          gap: '14px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Row: Google AI Studio Box Style Category Badge & Squircle Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {product.categoryName ? (
            <span
              className="sf-quickview-cat-badge"
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#1f1f1f',
                background: '#f1f3f4',
                border: '1px solid #E0E3E7',
                padding: '0 13px',
                height: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '10px',
                boxSizing: 'border-box',
              }}
            >
              {product.categoryName}
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            className="sf-quickview-close-btn sf-quickview-ai-btn"
            onClick={handleAnimatedClose}
            aria-label={t('storefront.storefront_product_quick_view_modal.s2', "إغلاق النافذة")}
            style={{
              background: '#ffffff',
              border: '1px solid #E0E3E7',
              width: '36px',
              height: '36px',
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
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#E0E3E7';
            }}
          >
            <XIcon size={16} strokeWidth={2.2} />
          </button>
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
          }}
        >
          {/* Product Image Stage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              className="sf-quickview-photo-box"
              style={{
                width: '100%',
                height: '235px',
                borderRadius: '14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #E0E3E7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                padding: '16px',
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
                }}
              />

              {isLowStock && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#CC0C39',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconFlame size={13} color="#ffffff" strokeWidth={2.2} />
                  <span>{t('storefront.storefront_product_quick_view_modal.s3', "متبقي")} {product.stockQty} {t('storefront.storefront_product_quick_view_modal.s4', "فقط")}</span>
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
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      border: activePhoto === imgUrl ? `2px solid ${brandColor}` : '1px solid #E0E3E7',
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
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info: Title + Price + Clean Description + Variant Boxes */}
          <div className="sf-quickview-info-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Title & Price */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h2
                style={{
                  fontSize: '18.5px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {product.name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {isZeroPrice ? (
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#475569' }}>
                    {t('storefront.storefront_product_quick_view_modal.s5', "السعر عند التواصل")}
                  </span>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: '23px',
                        fontWeight: 900,
                        color: brandColor,
                        letterSpacing: '-0.4px',
                        lineHeight: 1.1,
                      }}
                    >
                      {basePrice.toLocaleString()}{' '}
                      <span style={{ fontSize: '13px', fontWeight: 800 }}>
                        <CurrencySymbol />
                      </span>
                    </span>

                    {product.hasDiscount && product.originalPrice && product.originalPrice > product.price && (
                      <span style={{ fontSize: '13.5px', color: '#94a3b8', textDecoration: 'line-through', fontWeight: 600 }}>
                        {product.originalPrice.toLocaleString()} <CurrencySymbol />
                      </span>
                    )}

                    {(product.hasDiscount || product.offerType === 'bogo') && product.offerBadge && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          background: '#CC0C39',
                          color: '#ffffff',
                          padding: '3px 9px',
                          borderRadius: '8px',
                        }}
                      >
                        {product.offerBadge}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Clean Unboxed Description */}
            {product.description && (
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                {product.description}
              </p>
            )}

            {/* Variant Buttons in Exact Google AI Studio Box Style (10px radius, 1px solid #E0E3E7) */}
            {variants.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
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
                          borderRadius: '10px',
                          border: isSelected ? `1.5px solid ${brandColor}` : '1px solid #E0E3E7',
                          background: isSelected ? brandColor : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1f1f1f',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          boxShadow: isSelected ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.03)',
                          transition: 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                        }}
                      >
                        <span>{v.name}</span>
                        {vPrice !== null && vPrice !== product.price && (
                          <span style={{ opacity: 0.9 }}>
                            ({vPrice.toLocaleString()} {t('storefront.storefront_product_quick_view_modal.s11', "ج")})
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
                    {t('storefront.storefront_product_quick_view_modal.s12', "في سلتك الآن")} {cartLine.variantName ? `«${cartLine.variantName}»` : t('storefront.storefront_product_quick_view_modal.s13', "هذا الصنف")} ({cartLine.quantity})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer: Unified Google AI Studio 10px Squircle Box Style */}
        <div
          className="sf-quickview-footer"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '4px',
            width: '100%',
          }}
        >
          {isZeroPrice ? (
            <a
              className="sf-quickview-cta-btn sf-quickview-ai-btn"
              href={
                (info?.whatsappPhone || (info as any)?.whatsapp)
                  ? `https://wa.me/${((info?.whatsappPhone || (info as any)?.whatsapp) || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن سعر وتوفر صنف: ${product.name}`)}`
                  : '#'
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '10px',
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
              <span>{t('storefront.storefront_product_quick_view_modal.s23', "استفسر عن السعر عبر واتساب")}</span>
            </a>
          ) : (
            <>
              {/* Add to Cart Button (10px Google AI Studio Box Curvature) */}
              <button
                type="button"
                className="sf-quickview-cta-btn sf-quickview-ai-btn"
                disabled={!inStock}
                onClick={handleAdd}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: inStock ? brandColor : '#f1f3f4',
                  color: inStock ? (brandColorContrast || '#ffffff') : '#64748b',
                  border: inStock ? `1px solid ${brandColor}` : '1px solid #E0E3E7',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: inStock ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: inStock ? '0 2px 6px rgba(45, 104, 196, 0.2)' : 'none',
                  transition: 'transform 0.16s ease, background-color 0.16s ease, opacity 0.16s ease',
                  whiteSpace: 'nowrap',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                }}
              >
                {addedAnimation ? (
                  <>
                    <CheckIcon size={16} color="#ffffff" />
                    <span>{t('storefront.storefront_product_quick_view_modal.s24', "تمت الإضافة بنجاح")}</span>
                  </>
                ) : inStock ? (
                  <>
                    <IconShoppingCart size={16} color="#ffffff" strokeWidth={2.2} />
                    <span>
                      {t('storefront.storefront_product_quick_view_modal.s25', "إضافة إلى السلة (")}
                      {(basePrice * qty).toLocaleString()} <CurrencySymbol />)
                    </span>
                  </>
                ) : (
                  <>
                    <ClockIcon size={16} color="#64748b" />
                    <span>{t('storefront.storefront_product_quick_view_modal.s26', "ستتوفر قريباً")}</span>
                  </>
                )}
              </button>

              {/* Quantity Stepper in Exact Google AI Studio Box Style (10px outer, 7px inner buttons) */}
              <div
                className="sf-quickview-stepper"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '40px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #E0E3E7',
                  borderRadius: '10px',
                  padding: '3px',
                  gap: '2px',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                <button
                  type="button"
                  className="sf-quickview-stepper-btn sf-quickview-ai-btn"
                  disabled={!inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty)}
                  onClick={() => setQty((prev) => prev + 1)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '7px',
                    border: '1px solid #E0E3E7',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: !inStock || (product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty) ? 'not-allowed' : 'pointer',
                    opacity: product.stockQty > 0 && product.stockQty < 999 && qty >= product.stockQty ? 0.4 : 1,
                    color: '#1f1f1f',
                  }}
                >
                  <PlusIcon size={14} color="#1f1f1f" />
                </button>
                <span
                  style={{
                    minWidth: '28px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#1f1f1f',
                  }}
                >
                  {qty}
                </span>
                <button
                  type="button"
                  className="sf-quickview-stepper-btn sf-quickview-ai-btn"
                  disabled={qty <= 1 || !inStock}
                  onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '7px',
                    border: '1px solid #E0E3E7',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: qty <= 1 || !inStock ? 'not-allowed' : 'pointer',
                    opacity: qty <= 1 ? 0.4 : 1,
                    fontWeight: 800,
                    fontSize: '15px',
                    color: '#1f1f1f',
                  }}
                >
                  -
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
