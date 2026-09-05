import { StorefrontInfo } from '../types/storefront.types';
import { IconCheckCircle, IconSearch } from './StorefrontIcons';
import { PackageIcon } from '@/shared/components/icons/AppIcons';

interface StorefrontHeaderProps {
  info: StorefrontInfo;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  cartCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  onOpenOrders?: () => void;
  onGoHome?: () => void;
}

export function resolveStorefrontBrand(info: { title?: string; businessName?: string; address?: string }) {
  const business = String(info.businessName || '').trim();
  const rawTitle = String(info.title || '').trim();
  const rawAddress = String(info.address || '').trim();

  if (rawAddress) {
    return {
      title: rawTitle || business || 'المتجر',
      address: rawAddress,
    };
  }

  // Auto-separate if title begins with businessName and includes address
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
}: StorefrontHeaderProps) {
  const brand = resolveStorefrontBrand(info);
  const whatsappNumber = info.whatsappPhone.replace(/[^0-9]/g, '');
  const cleanPhone = whatsappNumber.startsWith('01') ? `2${whatsappNumber}` : whatsappNumber;

  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <style>{`
        .storefront-brand-btn:hover .storefront-brand-avatar { transform: scale(1.06); }
        .storefront-brand-btn:hover .storefront-brand-title { color: #170e5e; }
        .storefront-nav-bottom-row {
          display: contents;
        }
        @media (max-width: 640px) {
          .storefront-navbar {
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 8px 12px 10px !important;
            gap: 8px !important;
          }
          .storefront-brand-btn {
            gap: 8px !important;
            width: 100% !important;
            justify-content: flex-start !important;
          }
          .storefront-brand-avatar {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
          .storefront-brand-title {
            font-size: 15px !important;
          }
          .storefront-brand-verified {
            font-size: 10px !important;
            padding: 1px 6px !important;
          }
          .storefront-brand-subtitle {
            display: none !important;
          }
          .storefront-nav-bottom-row {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .storefront-search-wrapper {
            flex: 1 !important;
            min-width: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .storefront-search-box {
            padding: 3px 4px 3px 10px !important;
            border-radius: 8px !important;
          }
          .storefront-search-input {
            font-size: 12.5px !important;
            padding: 5px 4px !important;
          }
          .storefront-search-btn {
            padding: 6px 10px !important;
            border-radius: 6px !important;
          }
          .storefront-search-btn-text {
            display: none !important;
          }
          .storefront-actions {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            flex-shrink: 0 !important;
            margin: 0 !important;
          }
          .storefront-action-label {
            display: none !important;
          }
          .storefront-action-btn {
            padding: 7px 9px !important;
            border-radius: 8px !important;
            min-width: 36px !important;
            height: 36px !important;
            justify-content: center !important;
          }
          .storefront-cart-btn {
            padding: 7px 10px !important;
            border-radius: 8px !important;
            height: 36px !important;
            justify-content: center !important;
            gap: 4px !important;
          }
        }
      `}</style>

      {/* Top Announcement Bar */}
      {info.announcement && (
        <div
          style={{
            background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            color: '#ffffff',
            padding: '7px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            textAlign: 'center',
            letterSpacing: '0.3px',
          }}
        >
          <span>{info.announcement}</span>
        </div>
      )}

      {/* Main Navbar */}
      <div
        className="storefront-navbar"
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        {/* Brand & Store Name (Clickable to go home / reset) */}
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
          title={onGoHome ? 'العودة للصفحة الرئيسية' : undefined}
          className="storefront-brand-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: onGoHome ? 'pointer' : 'default',
            userSelect: 'none',
            outline: 'none',
          }}
        >
          {info.logo_url ? (
            <img
              src={info.logo_url}
              alt={info.title || info.businessName}
              className="storefront-brand-avatar"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                objectFit: 'contain',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.08)',
                flexShrink: 0,
                transition: 'transform 0.2s ease',
              }}
            />
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
              <span
                className="storefront-brand-title"
                style={{
                  fontSize: '17px',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.3px',
                  transition: 'color 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {brand.title}
              </span>
              <span
                className="storefront-brand-verified"
                style={{
                  fontSize: '11px',
                  background: '#f0f3ff',
                  color: '#170e5e',
                  border: '1px solid #d8e0fc',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <IconCheckCircle size={12} color="#170e5e" strokeWidth={2.2} />
                <span>متجر معتمد</span>
              </span>
            </div>
            {brand.address ? (
              <div
                className="storefront-brand-address"
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  fontWeight: 600,
                  marginTop: '1.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  lineHeight: '1.25',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {brand.address}
                </span>
              </div>
            ) : info.bio ? (
              <span
                className="storefront-brand-subtitle"
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  marginTop: '1.5px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {info.bio}
              </span>
            ) : (
              <span
                className="storefront-brand-subtitle"
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  marginTop: '1.5px',
                  whiteSpace: 'nowrap',
                }}
              >
                تسوق أونلاين والدفع عند الاستلام
              </span>
            )}
          </div>
        </div>

        {/* Unified Search & Actions Bottom Row on Mobile / Inline on Desktop */}
        <div className="storefront-nav-bottom-row">
          {/* Center: Sleek Unified Search Bar */}
          <div
            className="storefront-search-wrapper"
            style={{
              flex: 1,
              maxWidth: '640px',
              margin: '0 16px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              className="storefront-search-box"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '4px 6px 4px 14px',
                border: '1.5px solid #cbd5e1',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
              }}
            >
              <input
                className="storefront-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="ابحث عن أي منتج، كود، أو تصنيف..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#0f172a',
                  background: 'transparent',
                  padding: '7px 6px',
                  fontFamily: 'inherit',
                  minWidth: 0,
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              )}
              <button
                className="storefront-search-btn"
                type="button"
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <IconSearch size={15} strokeWidth={2.2} />
                <span className="storefront-search-btn-text">بحث</span>
              </button>
            </div>
          </div>

        {/* Quick Actions (WhatsApp & Cart) */}
        <div className="storefront-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {cleanPhone && (
            <a
              className="storefront-action-btn"
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#1e293b',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#10b981';
                e.currentTarget.style.color = '#047857';
                e.currentTarget.style.background = '#f0fdf4';
                const svg = e.currentTarget.querySelector('svg');
                if (svg) svg.style.fill = '#10b981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#1e293b';
                e.currentTarget.style.background = '#f8fafc';
                const svg = e.currentTarget.querySelector('svg');
                if (svg) svg.style.fill = '#1e293b';
              }}
            >
              <svg
                width="19"
                height="19"
                fill="#1e293b"
                viewBox="0 0 24 24"
                style={{ transition: 'fill 0.15s ease' }}
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
              </svg>
              <span className="storefront-action-label">خدمة العملاء</span>
            </a>
          )}

          {/* My Orders Trigger */}
          {onOpenOrders && (
            <button
              className="storefront-action-btn"
              type="button"
              onClick={onOpenOrders}
              title="متابعة وتتبع طلباتي"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#1e293b',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#170e5e';
                e.currentTarget.style.color = '#170e5e';
                e.currentTarget.style.background = '#f0f3ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#1e293b';
                e.currentTarget.style.background = '#f8fafc';
              }}
            >
              <PackageIcon size={19} />
              <span className="storefront-action-label" style={{ fontSize: '12.5px', fontWeight: 700 }}>
                طلباتي
              </span>
            </button>
          )}

          {/* Cart Trigger */}
          <button
            className="storefront-cart-btn"
            type="button"
            onClick={onOpenCart}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0f172a')}
          >
            <svg width="19" height="19" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <span className="storefront-action-label">السلة</span>
            {cartCount > 0 && (
              <span
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: 900,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  minWidth: '20px',
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.25)',
                }}
              >
                {cartCount}
              </span>
            )}
            {cartTotal > 0 && (
              <span className="storefront-action-label" style={{ borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '6px', marginRight: '4px' }}>
                {cartTotal.toFixed(0)} ج
              </span>
            )}
          </button>
        </div>
        </div>
      </div>
    </header>
  );
}
