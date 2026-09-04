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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="storefront-brand-title"
                style={{
                  fontSize: '17px',
                  fontWeight: 900,
                  color: '#0f172a',
                  letterSpacing: '-0.3px',
                  transition: 'color 0.15s ease',
                }}
              >
                {info.title || info.businessName}
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
                }}
              >
                <IconCheckCircle size={12} color="#170e5e" strokeWidth={2.2} />
                <span>متجر معتمد</span>
              </span>
            </div>
            <span className="storefront-brand-subtitle" style={{ fontSize: '11.5px', color: '#64748b' }}>
              تسوق أونلاين والدفع عند الاستلام
            </span>
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
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.color = '#1e293b';
                e.currentTarget.style.background = '#f8fafc';
              }}
            >
              <svg width="16" height="16" fill="#10b981" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
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
              <PackageIcon size={16} />
              <span className="storefront-action-label">طلباتي</span>
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
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '999px',
                  minWidth: '20px',
                  textAlign: 'center',
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
