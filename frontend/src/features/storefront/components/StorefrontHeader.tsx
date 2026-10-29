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
      const y = window.scrollY;
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
    updateScrollState();
    return () => {
      window.removeEventListener('scroll', onScroll);
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
            background: transparent;
            border: 1px solid transparent;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            transition: background-color 0.2s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .storefront-sticky-header.is-scrolled .storefront-navbar {
            background: rgba(255, 255, 255, 0.97);
            border-color: rgba(226, 232, 240, 0.95);
            box-shadow: 0 10px 26px -6px rgba(15, 23, 42, 0.1), 0 2px 8px -2px rgba(15, 23, 42, 0.04);
          }
          @media (min-width: 769px) {
            .storefront-sticky-header.is-scrolled .storefront-navbar {
              max-width: 820px;
            }
          }
          @media (max-width: 768px) {
            .storefront-sticky-header {
              padding: 6px 8px !important;
            }
            .storefront-navbar {
              display: grid !important;
              grid-template-columns: auto auto !important;
              justify-content: space-between !important;
              grid-template-rows: auto auto !important;
              gap: 7px 8px !important;
              padding: 7px 12px 9px !important;
              align-items: center !important;
              border-radius: 14px !important;
            }
            .storefront-sticky-header.is-scrolled .storefront-navbar {
              padding: 6px 12px 8px !important;
              gap: 5px 8px !important;
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
              width: 34px !important;
              height: 34px !important;
              border-radius: 9px !important;
              flex-shrink: 0 !important;
            }
            .storefront-brand-title-row {
              gap: 5px !important;
              min-width: 0 !important;
            }
            .storefront-brand-title {
              font-size: clamp(12px, 3.4vw, 13.5px) !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              max-width: calc(100vw - 175px) !important;
            }
            .storefront-brand-verified {
              display: inline-flex !important;
              width: 16px !important;
              height: 16px !important;
              min-width: 16px !important;
              min-height: 16px !important;
              max-width: 16px !important;
              max-height: 16px !important;
              aspect-ratio: 1 / 1 !important;
              border-radius: 50% !important;
              border-width: 1px !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              flex-shrink: 0 !important;
            }
            .storefront-brand-verified svg {
              width: 10px !important;
              height: 10px !important;
              min-width: 10px !important;
              min-height: 10px !important;
              flex-shrink: 0 !important;
              stroke-width: 2.8 !important;
            }
            .storefront-brand-subtitle,
            .storefront-brand-address {
              display: none !important;
            }
            .storefront-nav-bottom-row {
              display: contents !important;
            }
            .storefront-actions {
              grid-column: 2 / 3 !important;
              grid-row: 1 !important;
              display: flex !important;
              align-items: center !important;
              gap: 5px !important;
              flex-shrink: 0 !important;
              margin: 0 !important;
              justify-content: flex-end !important;
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
            .storefront-action-label {
              display: none !important;
            }
            .storefront-action-btn {
              padding: 0 !important;
              width: 35px !important;
              min-width: 35px !important;
              max-width: 35px !important;
              height: 35px !important;
              border-radius: 12px !important;
              background: #ffffff !important;
              border: 1px solid #E0E3E7 !important;
              justify-content: center !important;
            }
            .storefront-cart-btn {
              padding: 0 10px !important;
              border-radius: 12px !important;
              height: 35px !important;
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
              padding: 0 6px 0 12px !important;
              border-radius: 12px !important;
              height: 35px !important;
              border: 1px solid #E0E3E7 !important;
              background: rgba(248, 250, 252, 0.95) !important;
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
              gap: '12px',
              cursor: onGoHome ? 'pointer' : 'default',
              userSelect: 'none',
              outline: 'none',
            }}
          >
            {info.logo_url || info.logoUrl ? (
              <img
                src={info.logo_url || info.logoUrl}
                alt={info.title || info.businessName}
                className="storefront-brand-avatar"
                decoding="async"
                style={{
                  width: '38px',
                  height: '38px',
                  objectFit: 'contain',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  borderRadius: 0,
                  padding: 0,
                  flexShrink: 0,
                  transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            ) : (
              <div
                className="storefront-brand-avatar"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--storefront-primary-color, #2d68c4) 0%, #2353a0 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '16px',
                  boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(45, 104, 196, 0.22))',
                  flexShrink: 0,
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {((brand.title || '').trim().replace(/^ال/, '').trim().charAt(0) || (brand.title || '').trim().charAt(0) || t('storefront.storefront_header.s1', 'م'))}
              </div>
            )}
          </div>

          {/* Unified Search & Actions Bottom Row on Mobile / Inline on Desktop */}
          <div className="storefront-nav-bottom-row">
            {/* Center: Sleek Unified Predictive Search Bar */}
            <StorefrontPredictiveSearch
              slug={info.slug}
              searchTerm={searchTerm}
              onSearchChange={onSearchChange}
              onSelectCategory={onSelectCategory}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
            />
          </div>

          {/* Quick Actions (Orders & Cart) — Left side in RTL */}
          <div className="storefront-actions" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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
                  gap: '6px',
                  padding: '0 14px',
                  height: '37px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #E0E3E7',
                  color: '#0f172a',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  transition: 'transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.16s ease, border-color 0.16s ease',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                }}
              >
                <PackageIcon size={17} />
                <span className="storefront-action-label" style={{ fontSize: '12.5px', fontWeight: 700 }}>
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
                gap: '6px',
                padding: '0 15px',
                height: '37px',
                borderRadius: '12px',
                background: 'var(--storefront-primary-color, #2d68c4)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(45, 104, 196, 0.22))',
                boxSizing: 'border-box',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              <IconShoppingCart size={17} strokeWidth={2.2} />
              <span className="storefront-action-label">{t('storefront.storefront_header.s7', 'السلة')}</span>
              {cartCount > 0 && (
                <span
                  style={{
                    background: '#ffffff',
                    color: 'var(--storefront-primary-color, #0f172a)',
                    fontSize: '10.5px',
                    fontWeight: 900,
                    padding: '1px 5px',
                    borderRadius: '9999px',
                    minWidth: '16px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.18)',
                  }}
                >
                  {cartCount}
                </span>
              )}
              {cartTotal > 0 && (() => {
                const isThreeDec = isThreeDecimalCurrency(storeCurr);
                const formattedTotal = isThreeDec
                  ? cartTotal.toFixed(3)
                  : (storeCurr === 'EGP' && cartTotal % 1 === 0 ? cartTotal.toFixed(0) : cartTotal.toFixed(2));
                return (
                  <span className="storefront-action-label" style={{ borderRight: '1px solid rgba(255,255,255,0.25)', paddingRight: '6px', marginRight: '4px' }}>
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
