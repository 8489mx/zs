import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StorefrontInfo, StorefrontProduct } from '../types/storefront.types';
import { PackageIcon } from '@/shared/components/icons/AppIcons';
import { IconShoppingCart } from './StorefrontIcons';
import { StorefrontPredictiveSearch } from './StorefrontPredictiveSearch';
import { getCurrencySymbol, isThreeDecimalCurrency } from '@/lib/currencies';

interface StorefrontHeaderProps {
  info: StorefrontInfo;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenOrders?: () => void;
  onGoHome?: () => void;
  onSelectCategory?: (categoryId: number) => void;
  onSelectProduct?: (product: StorefrontProduct) => void;
  onAddToCart?: (product: StorefrontProduct) => void;
}

export function resolveStorefrontBrand(info: { title?: string; businessName?: string; address?: string }) {
  let business = String(info.businessName || '').trim();
  let rawTitle = String(info.title || '').trim();
  const rawAddress = String(info.address || '').trim();

  if (business === 'متجرنا' || business === 'متجرنا الإلكتروني' || business === 'المتجر') {
    business = 'Z-Systems ERP';
  }

  if (
    rawTitle === 'تسوق أونلاين بأفضل الأسعار وتوصيل سريع' ||
    rawTitle.includes('تسوق أونلاين بأفضل الأسعار') ||
    rawTitle === 'متجرنا الإلكتروني' ||
    rawTitle === 'متجرنا' ||
    rawTitle === 'المتجر'
  ) {
    rawTitle = business || 'Z-Systems ERP';
  }

  if (rawAddress) {
    return {
      title: rawTitle || business || 'Z-Systems ERP',
      address: rawAddress,
    };
  }

  if (business && rawTitle.startsWith(business) && rawTitle.length > business.length) {
    const remainder = rawTitle.slice(business.length).trim().replace(/^[-–—:]\s*/, '');
    if (remainder.length >= 3) {
      return {
        title: business,
        address: remainder,
      };
    }
  }

  return {
    title: rawTitle || business || 'Z-Systems ERP',
    address: '',
  };
}

const processedLogoCache = new Map<string, string>();

function stripWhiteBackgroundFromImage(src: string): Promise<{ url: string; fallbackMultiply: boolean }> {
  const cached = processedLogoCache.get(src);
  if (cached) {
    return Promise.resolve({ url: cached, fallbackMultiply: false });
  }

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve({ url: src, fallbackMultiply: false });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const naturalW = img.naturalWidth || img.width || 128;
        const naturalH = img.naturalHeight || img.height || 128;
        const maxDim = 256;
        const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH, 1));
        const w = Math.max(1, Math.round(naturalW * scale));
        const h = Math.max(1, Math.round(naturalH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({ url: src, fallbackMultiply: true });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const isNearWhite = (idx: number) => {
          const a = data[idx + 3];
          if (a < 16) return true;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          return min >= 224 && max - min <= 28;
        };

        const totalPixels = w * h;
        const visited = new Uint8Array(totalPixels);
        const queue = new Int32Array(totalPixels);
        let head = 0;
        let tail = 0;
        let opaqueWhiteBorderCount = 0;

        const trySeed = (x: number, y: number) => {
          const p = y * w + x;
          if (visited[p]) return;
          const idx = p * 4;
          if (isNearWhite(idx)) {
            if (data[idx + 3] >= 200) opaqueWhiteBorderCount++;
            visited[p] = 1;
            queue[tail++] = p;
          }
        };

        for (let x = 0; x < w; x++) {
          trySeed(x, 0);
          trySeed(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          trySeed(0, y);
          trySeed(w - 1, y);
        }

        // If the image already has a transparent background (no opaque white border), keep original crisp asset
        if (opaqueWhiteBorderCount === 0) {
          processedLogoCache.set(src, src);
          resolve({ url: src, fallbackMultiply: false });
          return;
        }

        while (head < tail) {
          const p = queue[head++];
          const x = p % w;
          const y = (p - x) / w;

          if (x > 0) {
            const np = p - 1;
            if (!visited[np] && isNearWhite(np * 4)) {
              visited[np] = 1;
              queue[tail++] = np;
            }
          }
          if (x + 1 < w) {
            const np = p + 1;
            if (!visited[np] && isNearWhite(np * 4)) {
              visited[np] = 1;
              queue[tail++] = np;
            }
          }
          if (y > 0) {
            const np = p - w;
            if (!visited[np] && isNearWhite(np * 4)) {
              visited[np] = 1;
              queue[tail++] = np;
            }
          }
          if (y + 1 < h) {
            const np = p + w;
            if (!visited[np] && isNearWhite(np * 4)) {
              visited[np] = 1;
              queue[tail++] = np;
            }
          }
        }

        // Clear all flood-filled white background pixels & softly feather anti-aliased boundary pixels
        for (let p = 0; p < totalPixels; p++) {
          const idx = p * 4;
          if (visited[p]) {
            data[idx + 3] = 0;
            continue;
          }
          const x = p % w;
          const y = (p - x) / w;
          const touchesBg =
            (x > 0 && visited[p - 1] === 1) ||
            (x + 1 < w && visited[p + 1] === 1) ||
            (y > 0 && visited[p - w] === 1) ||
            (y + 1 < h && visited[p + w] === 1);

          if (touchesBg) {
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const min = Math.min(r, g, b);
            const max = Math.max(r, g, b);
            if (min >= 195 && max - min <= 36) {
              const factor = Math.max(0, Math.min(1, (228 - min) / 33));
              data[idx + 3] = Math.round(data[idx + 3] * factor);
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const outputUrl = canvas.toDataURL('image/png');
        processedLogoCache.set(src, outputUrl);
        resolve({ url: outputUrl, fallbackMultiply: false });
      } catch {
        resolve({ url: src, fallbackMultiply: true });
      }
    };

    img.onerror = () => {
      resolve({ url: src, fallbackMultiply: true });
    };

    img.src = src;
  });
}

export function StorefrontBrandLogo({
  src,
  alt,
  size = 36,
  className,
  style,
}: {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [resolvedSrc, setResolvedSrc] = React.useState<string>(() => processedLogoCache.get(src) || src);
  const [useMultiply, setUseMultiply] = React.useState(false);

  useEffect(() => {
    let active = true;
    const cached = processedLogoCache.get(src);
    if (cached) {
      setResolvedSrc(cached);
      setUseMultiply(false);
      return;
    }
    setResolvedSrc(src);
    stripWhiteBackgroundFromImage(src).then((res) => {
      if (!active) return;
      setResolvedSrc(res.url);
      setUseMultiply(res.fallbackMultiply);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return (
    <img
      src={resolvedSrc}
      alt={alt || ''}
      className={className}
      decoding="async"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        background: 'transparent',
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
        borderRadius: 0,
        padding: 0,
        flexShrink: 0,
        mixBlendMode: useMultiply ? 'multiply' : undefined,
        ...style,
      }}
    />
  );
}

export const StorefrontHeader = React.memo(function StorefrontHeader({
  info,
  searchTerm,
  onSearchChange,
  cartCount,
  cartTotal,
  onOpenCart,
  onOpenOrders,
  onGoHome,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
}: StorefrontHeaderProps) {
  const { t } = useTranslation();
  const headerRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    let currentScrolled = false;

    const updateScrollState = () => {
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      // Hysteresis prevents rapid toggling jitter near the scroll threshold
      const nextScrolled = currentScrolled ? y > 8 : y > 24;
      if (nextScrolled !== currentScrolled) {
        currentScrolled = nextScrolled;
        if (headerRef.current) {
          headerRef.current.classList.toggle('is-scrolled', nextScrolled);
        }
      }
      rafId = 0;
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateScrollState);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onScroll, { passive: true });
    updateScrollState();
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const brand = resolveStorefrontBrand(info);
  const storeCurr = info?.currency || 'EGP';
  const currSymbol = getCurrencySymbol(storeCurr);

  return (
    <>
      {/* Top Announcement Bar — scrolls away naturally so sticky header stays sleek */}
      {info.announcement && (
        <div
          style={{
            background: 'linear-gradient(90deg, #2353a0 0%, #2d68c4 50%, #2353a0 100%)',
            color: '#ffffff',
            padding: '7px 16px',
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '0.2px',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span>{info.announcement}</span>
        </div>
      )}

      {/* Sticky Luxury Header — Zero-layout-shift 120Hz GPU composited sticky bar */}
      <header
        ref={headerRef}
        className="storefront-sticky-header"
        style={{
          position: 'sticky',
          top: 0,
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          zIndex: 110,
          padding: '8px 16px',
          boxSizing: 'border-box',
          pointerEvents: 'none',
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
        }}
      >
        <style>{`
          .storefront-brand-btn:hover .storefront-brand-avatar { transform: scale3d(1.05, 1.05, 1); }
          .storefront-brand-btn:hover .storefront-brand-title { color: var(--storefront-primary-color, #2d68c4); }
          .storefront-nav-bottom-row {
            display: contents;
          }
          .storefront-navbar {
            pointer-events: auto;
            width: 100%;
            max-width: var(--storefront-container, 1440px);
            margin: 0 auto;
            padding: 8px 18px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
            align-items: center;
            gap: 14px;
            box-sizing: border-box;
            border-radius: 14px;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.09), 0 2px 6px -1px rgba(15, 23, 42, 0.04) !important;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
          }
          .storefront-sticky-header.is-scrolled .storefront-navbar {
            background: #ffffff !important;
            border-color: #cbd5e1 !important;
            box-shadow: 0 10px 28px -6px rgba(15, 23, 42, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.06) !important;
          }
          @media (min-width: 769px) {
            .storefront-sticky-header.is-scrolled .storefront-navbar {
              max-width: 820px;
            }
          }
          @media (max-width: 768px) {
            .storefront-sticky-header {
              padding: 6px 10px !important;
            }
            .storefront-navbar {
              display: grid !important;
              grid-template-columns: minmax(0, 1fr) auto !important;
              justify-content: space-between !important;
              grid-template-rows: auto auto !important;
              gap: 8px 10px !important;
              padding: 8px 12px 10px !important;
              align-items: center !important;
              border-radius: 14px !important;
              background: #ffffff !important;
              border: 1px solid #e2e8f0 !important;
              box-shadow: 0 4px 18px -4px rgba(15, 23, 42, 0.09) !important;
            }
            .storefront-sticky-header.is-scrolled .storefront-navbar {
              padding: 7px 12px 9px !important;
              gap: 6px 10px !important;
              background: #ffffff !important;
              border-color: #cbd5e1 !important;
              box-shadow: 0 10px 26px -6px rgba(15, 23, 42, 0.14), 0 2px 8px -2px rgba(15, 23, 42, 0.05) !important;
            }
            .storefront-brand-btn {
              grid-column: 1 / 2 !important;
              grid-row: 1 !important;
              gap: 8px !important;
              min-width: 0 !important;
              max-width: 100% !important;
              overflow: hidden !important;
              width: auto !important;
              justify-content: flex-start !important;
            }
            .storefront-brand-avatar {
              width: 32px !important;
              height: 32px !important;
              border-radius: 9px !important;
              flex-shrink: 0 !important;
            }
            img.storefront-brand-avatar {
              border-radius: 0 !important;
              background: transparent !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
            .storefront-brand-title {
              font-size: 14px !important;
              font-weight: 800 !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              max-width: calc(100vw - 165px) !important;
            }
            .storefront-nav-bottom-row {
              display: contents !important;
            }
            .storefront-actions {
              grid-column: 2 / 3 !important;
              grid-row: 1 !important;
              display: flex !important;
              align-items: center !important;
              gap: 6px !important;
              flex-shrink: 0 !important;
              margin: 0 !important;
              justify-content: flex-end !important;
            }
            .storefront-action-label {
              display: none !important;
            }
            .storefront-action-btn,
            .storefront-action-btn:not(.storefront-cart-btn) {
              padding: 0 !important;
              width: 32px !important;
              min-width: 32px !important;
              max-width: 32px !important;
              height: 32px !important;
              min-height: 32px !important;
              border-radius: 10px !important;
              background: #ffffff !important;
              border: 1px solid #E0E3E7 !important;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
              justify-content: center !important;
              align-items: center !important;
            }
            .storefront-cart-btn {
              padding: 0 10px !important;
              min-width: 32px !important;
              border-radius: 10px !important;
              height: 32px !important;
              min-height: 32px !important;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
              justify-content: center !important;
              gap: 4px !important;
            }
            .storefront-search-wrapper {
              grid-column: 1 / -1 !important;
              grid-row: 2 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              flex: none !important;
            }
            .storefront-search-box {
              padding: 0 10px !important;
              border-radius: 10px !important;
              height: 36px !important;
              border: 1px solid #E0E3E7 !important;
              background: #f8fafc !important;
            }
            .storefront-search-input {
              font-size: 13px !important;
              padding: 6px 4px !important;
            }
            .storefront-search-btn {
              display: none !important;
            }
          }
        `}</style>

        {/* Main Navbar */}
        <div
          className="storefront-navbar storefront-header-shell"
        >
          {/* Brand & Store Name (Clickable to go home / reset) — Right side in RTL */}
          <div
            onClick={onGoHome}
            role={onGoHome ? 'button' : undefined}
            tabIndex={onGoHome ? 0 : undefined}
            onKeyDown={(e) => {
              if (onGoHome && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onGoHome();
              }
            }}
            title={onGoHome ? t('storefront.storefront_header.s0', 'العودة للصفحة الرئيسية') : undefined}
            className="storefront-brand-btn"
            style={{
              justifySelf: 'start',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: onGoHome ? 'pointer' : 'default',
              userSelect: 'none',
              outline: 'none',
              minWidth: 0,
            }}
          >
            {info.logo_url || info.logoUrl ? (
              <StorefrontBrandLogo
                src={(info.logo_url || info.logoUrl)!}
                alt={info.title || info.businessName}
                size={36}
                className="storefront-brand-avatar"
                style={{
                  transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            ) : (
              <div
                className="storefront-brand-avatar"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--storefront-primary-color, #2d68c4) 0%, #2353a0 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '15px',
                  boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(45, 104, 196, 0.22))',
                  flexShrink: 0,
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {((brand.title || '').trim().replace(/^ال/, '').trim().charAt(0) || (brand.title || '').trim().charAt(0) || t('storefront.storefront_header.s1', 'م'))}
              </div>
            )}
            <span
              dir="auto"
              className="storefront-brand-title"
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#0f172a',
                letterSpacing: '-0.2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 0.16s ease',
              }}
            >
              {brand.title}
            </span>
          </div>

          {/* Unified Search & Actions Bottom Row on Mobile / Inline on Desktop */}
          <div className="storefront-nav-bottom-row">
            {/* Center: Sleek Unified Predictive Search Bar */}
            <StorefrontPredictiveSearch
              slug={info.slug}
              storeName={brand.title}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              onSelectCategory={onSelectCategory}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
            />
          </div>

          {/* Quick Actions (Orders & Cart) — Left side in RTL */}
          <div className="storefront-actions" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {/* My Orders Trigger */}
            {onOpenOrders && (
              <button
                className="storefront-action-btn"
                type="button"
                onClick={onOpenOrders}
                title={t('storefront.storefront_header.s5', 'متابعة وتتبع طلباتي')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '0 10px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  color: '#1f1f1f',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  transition: 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.16s ease, border-color 0.16s ease',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <PackageIcon size={14} style={{ flexShrink: 0 }} />
                <span className="storefront-action-label" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                  {t('storefront.storefront_header.s6', 'طلباتي')}
                </span>
              </button>
            )}

            {/* Cart Trigger */}
            <button
              className="storefront-cart-btn storefront-gpu-btn"
              type="button"
              onClick={onOpenCart}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 10px',
                height: '32px',
                borderRadius: '10px',
                background: 'var(--storefront-primary-color, #2d68c4)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                fontSize: '11.5px',
                fontWeight: 600,
                border: '1px solid var(--storefront-primary-color, #2d68c4)',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {cartCount > 0 && (
                <span
                  style={{
                    background: '#ffffff',
                    color: 'var(--storefront-primary-color, #0f172a)',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    padding: '0.5px 4.5px',
                    borderRadius: '5px',
                    minWidth: '15px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
                    lineHeight: 1,
                  }}
                >
                  {cartCount}
                </span>
              )}
              <IconShoppingCart size={15} strokeWidth={2.1} />
              {cartTotal > 0 && (() => {
                const isThreeDec = isThreeDecimalCurrency(storeCurr);
                const formattedTotal = isThreeDec
                  ? cartTotal.toFixed(3)
                  : (storeCurr === 'EGP' && cartTotal % 1 === 0 ? cartTotal.toFixed(0) : cartTotal.toFixed(2));
                return (
                  <span className="storefront-action-label" style={{ borderRight: '1px solid rgba(255,255,255,0.25)', paddingRight: '5px', marginRight: '2px', fontSize: '11px', fontWeight: 600 }}>
                    {formattedTotal} {currSymbol}
                  </span>
                );
              })()}
            </button>
          </div>
        </div>
      </header>
    </>
  );
});
