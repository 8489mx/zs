import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StorefrontInfo, StorefrontProduct } from '../types/storefront.types';
import { PackageIcon } from '@/shared/components/icons/AppIcons';
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
  const business = String(info.businessName || '').trim();
  let rawTitle = String(info.title || '').trim();
  const rawAddress = String(info.address || '').trim();

  if (rawTitle === 'تسوق أونلاين بأفضل الأسعار وتوصيل سريع' || rawTitle.includes('تسوق أونلاين بأفضل الأسعار')) {
    rawTitle = business && business !== 'متجرنا' ? business : 'المتجر';
  }

  if (rawAddress) {
    return {
      title: rawTitle || business || 'المتجر',
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
    title: rawTitle || business || 'المتجر',
    address: '',
  };
}

export function StorefrontHeader({
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const onScroll = (e?: Event) => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        const target = e?.target as HTMLElement | null;
        const targetTop = target && typeof target.scrollTop === 'number' ? target.scrollTop : 0;
        const docTop = document.documentElement?.scrollTop || document.body?.scrollTop || 0;
        const winTop = window.scrollY || window.pageYOffset || 0;
        const scrollDistance = Math.max(winTop, docTop, targetTop);
        setIsScrolled(scrollDistance > 18);
        rafId = 0;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    document.body?.addEventListener('scroll', onScroll, { passive: true, capture: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as any);
      document.removeEventListener('scroll', onScroll, { capture: true } as any);
      document.body?.removeEventListener('scroll', onScroll, { capture: true } as any);
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
            background: 'linear-gradient(90deg, #2d6c97 0%, #588cb3 50%, #2d6c97 100%)',
            color: '#ffffff',
            padding: '7px 16px',
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '0.2px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span>{info.announcement}</span>
        </div>
      )}

      {/* Sticky Luxury Header — full-width unboxed over Hero at top, morphs into 60% floating pill island on scroll */}
      <header
        className={`storefront-sticky-header ${isScrolled ? 'is-scrolled' : ''}`}
        style={{
          background: isScrolled ? 'rgba(255, 255, 255, 0.96)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(20px) saturate(180%)' : 'none',
          border: isScrolled ? '1px solid rgba(226, 232, 240, 0.92)' : '1px solid transparent',
          borderRadius: isScrolled ? '9999px' : '0px',
          position: 'sticky',
          top: isScrolled ? '12px' : '0px',
          width: isScrolled ? '48%' : '100%',
          maxWidth: isScrolled ? '780px' : '100%',
          margin: '0 auto',
          zIndex: 9999,
          boxShadow: isScrolled
            ? '0 10px 30px -4px rgba(15, 23, 42, 0.12), 0 3px 10px -2px rgba(15, 23, 42, 0.05)'
            : 'none',
          transition:
            'top 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.32s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.32s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
        }}
      >
        <style>{`
          .storefront-brand-btn:hover .storefront-brand-avatar { transform: scale(1.05); }
          .storefront-brand-btn:hover .storefront-brand-title { color: var(--storefront-primary-color, #170e5e); }
          .storefront-nav-bottom-row {
            display: contents;
          }
          @media (min-width: 769px) {
            .storefront-sticky-header.is-scrolled {
              width: 48% !important;
              max-width: 780px !important;
              min-width: 480px !important;
              border-radius: 9999px !important;
              top: 12px !important;
            }
          }
          @media (max-width: 768px) {
            .storefront-sticky-header.is-scrolled {
              top: 8px !important;
              width: calc(100% - 16px) !important;
              max-width: calc(100% - 16px) !important;
              border-radius: 20px !important;
            }
            .storefront-navbar {
              display: grid !important;
              grid-template-columns: auto auto !important;
              justify-content: space-between !important;
              grid-template-rows: auto auto !important;
              gap: 7px 8px !important;
              padding: 7px 12px 9px !important;
              align-items: center !important;
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
          style={{
            width: '100%',
            maxWidth: '100%',
            margin: '0',
            padding: isScrolled ? '4px 14px' : '12px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
            alignItems: 'center',
            gap: isScrolled ? '10px' : '14px',
            boxSizing: 'border-box',
            transition: 'padding 0.25s cubic-bezier(0.16, 1, 0.3, 1), gap 0.25s ease',
          }}
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
                style={{
                  width: isScrolled ? '30px' : '42px',
                  height: isScrolled ? '30px' : '42px',
                  objectFit: 'contain',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  borderRadius: 0,
                  padding: 0,
                  flexShrink: 0,
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            ) : (
              <div
                className="storefront-brand-avatar"
                style={{
                  width: isScrolled ? '30px' : '42px',
                  height: isScrolled ? '30px' : '42px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, var(--storefront-primary-color, #588cb3) 0%, #2d6c97 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: isScrolled ? '14px' : '17px',
                  boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(88, 140, 179, 0.25))',
                  flexShrink: 0,
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
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
              isScrolled={isScrolled}
            />
          </div>

          {/* Quick Actions (WhatsApp, Orders & Cart) — Left side in RTL */}
          <div className="storefront-actions" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: isScrolled ? '6px' : '8px', flexShrink: 0 }}>
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
                  gap: '5px',
                  padding: isScrolled ? '0 10px' : '0 13px',
                  height: isScrolled ? '31px' : '35px',
                  borderRadius: '9999px',
                  background: '#ffffff',
                  border: '1px solid #E0E3E7',
                  color: '#0f172a',
                  fontSize: isScrolled ? '12px' : '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
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
                <PackageIcon size={isScrolled ? 15 : 18} />
                <span className="storefront-action-label" style={{ fontSize: isScrolled ? '11.5px' : '12.5px', fontWeight: 700 }}>
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
                padding: isScrolled ? '0 11px' : '0 14px',
                height: isScrolled ? '31px' : '35px',
                borderRadius: '9999px',
                background: 'var(--storefront-primary-color, #588cb3)',
                color: 'var(--storefront-primary-contrast, #ffffff)',
                fontSize: isScrolled ? '12px' : '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(88, 140, 179, 0.22))',
                boxSizing: 'border-box',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <svg width={isScrolled ? 15 : 18} height={isScrolled ? 15 : 18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
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
}
