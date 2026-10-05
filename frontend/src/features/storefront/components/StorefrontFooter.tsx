import type { StorefrontInfo } from '../types/storefront.types';
import { resolveStorefrontBrand } from './StorefrontHeader';
import { IconCheckCircle } from './StorefrontIcons';

interface StorefrontFooterProps {
  info: StorefrontInfo;
  onOpenCart?: () => void;
  onOpenOrders?: () => void;
  onOpenCategories?: () => void;
  onGoHome?: () => void;
  onToggleDeals?: () => void;
}

export function StorefrontFooter({
  info,
  onOpenCart,
  onOpenOrders,
  onOpenCategories,
  onGoHome,
  onToggleDeals,
}: StorefrontFooterProps) {
  const brand = resolveStorefrontBrand(info);
  const whatsappNumber = (info.whatsappPhone || '').replace(/[^0-9]/g, '');
  const cleanPhone = whatsappNumber.startsWith('01') ? `2${whatsappNumber}` : whatsappNumber;
  const currentYear = new Date().getFullYear();
  const monogramLetter = (brand.title || '').trim().replace(/^ال/, '').trim().charAt(0) || (brand.title || '').trim().charAt(0) || 'م';

  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1.5px solid #e2e8f0',
        marginTop: 'auto',
        color: '#1e293b',
        direction: 'rtl',
      }}
    >
      <style>{`
        .sf-footer-trust-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .sf-footer-trust-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .sf-footer-trust-item:hover {
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .sf-footer-directory {
          display: grid;
          grid-template-columns: 1.35fr 1.1fr 1fr 1.15fr;
          gap: 32px;
        }
        .sf-footer-link-btn {
          background: none;
          border: none;
          padding: 0;
          color: #475569;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          text-align: right;
          transition: color 0.15s ease, transform 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .sf-footer-link-btn:hover {
          color: var(--storefront-primary-color, #170e5e);
          transform: translateX(-3px);
        }
        .sf-pay-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 28px;
          padding: 0 9px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.2px;
          user-select: none;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
        }
        .sf-footer-back-to-top {
          display: none;
          width: 100%;
          background: #f8fafc;
          border: none;
          border-bottom: 1px solid #e2e8f0;
          padding: 8px 16px;
          color: #475569;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s ease;
        }
        .sf-footer-back-to-top:hover {
          background: #f1f5f9;
          color: var(--storefront-primary-color, #170e5e);
        }
        @media (max-width: 960px) {
          .sf-footer-trust-strip {
            grid-template-columns: repeat(2, 1fr);
          }
          .sf-footer-directory {
            grid-template-columns: 1fr 1fr;
            gap: 28px;
          }
        }
        @media (max-width: 640px) {
          .sf-footer-back-to-top {
            display: flex !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
          }
          .sf-footer-trust-wrapper {
            padding: 8px 10px !important;
            background: #ffffff !important;
          }
          .sf-footer-trust-strip {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 2px !important;
          }
          .sf-footer-trust-item {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            padding: 4px 2px !important;
            gap: 3px !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .sf-footer-trust-icon {
            width: 22px !important;
            height: 22px !important;
            min-width: 22px !important;
            border-radius: 6px !important;
            background: transparent !important;
            color: #475569 !important;
            margin: 0 auto !important;
          }
          .sf-footer-trust-icon svg {
            width: 14px !important;
            height: 14px !important;
          }
          .sf-footer-trust-title {
            font-size: 9.5px !important;
            font-weight: 700 !important;
            color: #475569 !important;
            margin: 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100% !important;
          }
          .sf-footer-trust-desc {
            display: none !important;
          }
          .sf-footer-directory-wrapper {
            padding: 12px 14px 10px !important;
          }
          .sf-footer-directory {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 5px !important;
          }
          .sf-footer-section-title {
            display: none !important;
          }
          .sf-footer-brand-col {
            order: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 2px !important;
          }
          .sf-footer-brand-header {
            margin-bottom: 0 !important;
            gap: 6px !important;
            justify-content: center !important;
            display: flex !important;
            align-items: center !important;
          }
          .sf-footer-brand-logo,
          .sf-footer-brand-avatar {
            width: 24px !important;
            height: 24px !important;
            min-width: 24px !important;
            border-radius: 6px !important;
            font-size: 11px !important;
          }
          .sf-footer-brand-title-wrap {
            width: auto !important;
            height: auto !important;
            min-width: 0 !important;
            display: flex !important;
            align-items: center !important;
          }
          .sf-footer-brand-header h3 {
            font-size: 13.5px !important;
            font-weight: 800 !important;
            white-space: nowrap !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
          }
          .sf-footer-brand-desc {
            display: none !important;
          }
          .sf-footer-brand-address {
            margin: 0 !important;
            font-size: 10.5px !important;
            color: #64748b !important;
            justify-content: center !important;
            gap: 4px !important;
          }
          .sf-footer-brand-address svg {
            width: 11px !important;
            height: 11px !important;
          }
          .sf-footer-care-col {
            order: 2 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 0 !important;
            margin: 0 !important;
          }
          .sf-footer-care-desc {
            display: none !important;
          }
          .sf-footer-care-hours {
            display: none !important;
          }
          .sf-footer-whatsapp-link {
            margin: 0 !important;
            padding: 4px 12px !important;
            height: 28px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            border-radius: 20px !important;
            gap: 5px !important;
            box-sizing: border-box !important;
          }
          .sf-footer-whatsapp-link svg {
            width: 13px !important;
            height: 13px !important;
          }
          .sf-footer-links-col {
            order: 3 !important;
            width: 100% !important;
            margin: 0 !important;
          }
          .sf-footer-quick-links {
            display: flex !important;
            flex-wrap: nowrap !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 4px 6px !important;
            white-space: nowrap !important;
            margin: 0 !important;
          }
          .sf-footer-quick-links .sf-footer-link-btn {
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 1px 3px !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
            font-weight: 600 !important;
            color: #475569 !important;
            display: inline-flex !important;
            align-items: center !important;
            white-space: nowrap !important;
          }
          .sf-footer-quick-links .sf-footer-link-btn:not(:last-child):not(.sf-footer-cart-link)::after {
            content: "•";
            margin-inline-start: 6px;
            color: #cbd5e1;
            font-size: 10px;
            pointer-events: none;
          }
          .sf-footer-quick-links .sf-footer-link-btn svg {
            display: none !important;
          }
          .sf-footer-quick-links .sf-footer-cart-link,
          .sf-hide-mobile {
            display: none !important;
          }
          .sf-footer-pay-col {
            order: 4 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 4px !important;
            margin-top: 0 !important;
          }
          .sf-footer-pay-badges {
            display: flex !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 4px !important;
            margin: 0 !important;
          }
          .sf-footer-pay-badges .sf-pay-badge {
            height: 20px !important;
            padding: 0 5px !important;
            font-size: 9px !important;
            border-radius: 4px !important;
          }
          .sf-footer-pay-badges .sf-pay-badge svg {
            width: 10px !important;
            height: 10px !important;
          }
          .sf-footer-pay-badges .sf-pay-badge .sf-pay-mc-logo {
            width: 14px !important;
            height: 9px !important;
          }
          .sf-footer-ssl-badge {
            display: inline-flex !important;
            margin: 0 auto !important;
            padding: 2px 7px !important;
            font-size: 9.5px !important;
            border-radius: 4px !important;
          }
          .sf-footer-ssl-badge svg {
            width: 10px !important;
            height: 10px !important;
          }
          .sf-footer-bottom-wrapper {
            padding: 8px 12px !important;
          }
          .sf-footer-bottom-bar {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
            align-items: center !important;
            text-align: center !important;
            gap: 4px 10px !important;
            font-size: 10px !important;
          }
          .sf-footer-bottom-bar strong {
            font-size: 10.5px !important;
          }
        }
      `}</style>

      {/* Back to top button (Mobile & Responsive) */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="sf-footer-back-to-top"
        title="الرجوع إلى أعلى الصفحة"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span>الرجوع إلى أعلى الصفحة</span>
      </button>

      {/* Top Enterprise Trust Strip - Unified Subtle Slate Palette */}
      <div className="sf-footer-trust-wrapper" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '18px 20px' }}>
        <div style={{ maxWidth: 'var(--storefront-container, 1440px)', margin: '0 auto' }}>
          <div className="sf-footer-trust-strip">
            {/* Value 1: Fast Shipping */}
            <div className="sf-footer-trust-item">
              <div
                className="sf-footer-trust-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div>
                <h4 className="sf-footer-trust-title" style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  توصيل سريع وآمن
                </h4>
                <p className="sf-footer-trust-desc" style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45, fontWeight: 500 }}>
                  شحن مباشر مع متابعة دقيقة لحالة الطلب
                </p>
              </div>
            </div>

            {/* Value 2: Original Quality */}
            <div className="sf-footer-trust-item">
              <div
                className="sf-footer-trust-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div>
                <h4 className="sf-footer-trust-title" style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  منتجات أصلية 100%
                </h4>
                <p className="sf-footer-trust-desc" style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45, fontWeight: 500 }}>
                  فحص وضمان جودة لكافة الأصناف المعروضة
                </p>
              </div>
            </div>

            {/* Value 3: Flexible Payment */}
            <div className="sf-footer-trust-item">
              <div
                className="sf-footer-trust-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div>
                <h4 className="sf-footer-trust-title" style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  دفع آمن ومرن
                </h4>
                <p className="sf-footer-trust-desc" style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45, fontWeight: 500 }}>
                  كاش عند الاستلام أو بطاقات ومحافظ رقمية
                </p>
              </div>
            </div>

            {/* Value 4: Customer Care */}
            <div className="sf-footer-trust-item">
              <div
                className="sf-footer-trust-icon"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div>
                <h4 className="sf-footer-trust-title" style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  خدمة عملاء مباشرة
                </h4>
                <p className="sf-footer-trust-desc" style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45, fontWeight: 500 }}>
                  دعم واستفسارات فورية عبر محادثة واتساب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Directory & Storefront Details */}
      <div className="sf-footer-directory-wrapper" style={{ maxWidth: 'var(--storefront-container, 1440px)', margin: '0 auto', padding: '34px 20px 28px' }}>
        <div className="sf-footer-directory">
          {/* Col 1: Store Brand Info */}
          <div className="sf-footer-brand-col">
            <div className="sf-footer-brand-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              {info.logo_url || info.logoUrl ? (
                <img
                  className="sf-footer-brand-logo"
                  src={info.logo_url || info.logoUrl}
                  alt={brand.title}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    objectFit: 'contain',
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    padding: '2px',
                  }}
                />
              ) : (
                <div
                  className="sf-footer-brand-avatar"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--storefront-primary-color, #170e5e)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '17px',
                  }}
                >
                  {monogramLetter}
                </div>
              )}
              <div className="sf-footer-brand-title-wrap">
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{brand.title}</span>
                  <span title="متجر موثق" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <IconCheckCircle size={13} color="var(--storefront-primary-color, #170e5e)" strokeWidth={2.5} />
                  </span>
                </h3>
              </div>
            </div>

            <p className="sf-footer-brand-desc" style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#475569', lineHeight: 1.6, maxWidth: '340px' }}>
              {info.bio || 'وجهتك الأولى لتسوق أفضل المنتجات بأفضل الأسعار، جودة مضمونة وسرعة في تنفيذ وتوصيل الطلبات.'}
            </p>

            {brand.address && (
              <div className="sf-footer-brand-address" style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{brand.address}</span>
              </div>
            )}
          </div>

          {/* Col 2: Quick Links */}
          <div className="sf-footer-links-col">
            <h4 className="sf-footer-section-title" style={{ margin: '0 0 14px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--storefront-primary-color, #170e5e)', borderRadius: '2px', display: 'inline-block' }} />
              <span>روابط سريعة</span>
            </h4>
            <div className="sf-footer-quick-links" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 12px' }}>
              {onGoHome && (
                <button type="button" onClick={onGoHome} className="sf-footer-link-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>الرئيسية</span>
                </button>
              )}
              {onOpenCategories && (
                <button type="button" onClick={onOpenCategories} className="sf-footer-link-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span><span className="sf-hide-mobile">تصفح </span>الأقسام</span>
                </button>
              )}
              {onToggleDeals && (
                <button type="button" onClick={onToggleDeals} className="sf-footer-link-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>العروض<span className="sf-hide-mobile"> الحصرية</span></span>
                </button>
              )}
              {onOpenOrders && (
                <button type="button" onClick={onOpenOrders} className="sf-footer-link-btn">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span><span className="sf-hide-mobile">تتبع </span>طلباتي</span>
                </button>
              )}
              {onOpenCart && (
                <button type="button" onClick={onOpenCart} className="sf-footer-link-btn sf-footer-cart-link">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>سلة المشتريات</span>
                </button>
              )}
            </div>
          </div>

          {/* Col 3: Customer Care & WhatsApp */}
          <div className="sf-footer-care-col">
            <h4 className="sf-footer-section-title" style={{ margin: '0 0 14px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--storefront-primary-color, #170e5e)', borderRadius: '2px', display: 'inline-block' }} />
              <span>خدمة العملاء</span>
            </h4>
            <p className="sf-footer-care-desc" style={{ margin: '0 0 12px', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
              فريقنا متواجد للرد على كافة الاستفسارات ومساعدتك في اختيار المنتجات:
            </p>
            {cleanPhone ? (
              <a
                className="sf-footer-whatsapp-link"
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '9px',
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 1px 2px rgba(22, 101, 52, 0.05)',
                  transition: 'all 0.15s ease',
                  marginBottom: '10px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dcfce7';
                  e.currentTarget.style.borderColor = '#86efac';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f0fdf4';
                  e.currentTarget.style.borderColor = '#bbf7d0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="17" height="17" fill="#16a34a" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
                </svg>
                <span>محادثة واتساب فورية</span>
              </a>
            ) : null}
            <div className="sf-footer-care-hours" style={{ fontSize: '11px', color: '#94a3b8' }}>
              الطلبات متاحة أونلاين على مدار الساعة
            </div>
          </div>

          {/* Col 4: Payment Badges & SSL */}
          <div className="sf-footer-pay-col">
            <h4 className="sf-footer-section-title" style={{ margin: '0 0 14px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--storefront-primary-color, #170e5e)', borderRadius: '2px', display: 'inline-block' }} />
              <span>طرق الدفع والضمان</span>
            </h4>
            
            <div className="sf-footer-pay-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {/* Cash On Delivery */}
              <div className="sf-pay-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginInlineEnd: '4px' }}>
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
                <span>كاش عند الاستلام</span>
              </div>

              {/* Visa */}
              <div className="sf-pay-badge" style={{ fontFamily: 'sans-serif', fontWeight: 900, color: '#1e293b', letterSpacing: '0.8px' }}>
                VISA
              </div>

              {/* Mastercard - Official Brand Standard */}
              <div className="sf-pay-badge" dir="ltr" style={{ gap: '4px' }}>
                <svg className="sf-pay-mc-logo" width="16" height="10" viewBox="0 0 32 20" fill="none" style={{ display: 'inline-block', flexShrink: 0 }}>
                  <circle cx="10" cy="10" r="10" fill="#EB001B" />
                  <circle cx="22" cy="10" r="10" fill="#F79E1B" />
                  <path d="M 16 2 A 10 10 0 0 1 16 18 A 10 10 0 0 1 16 2 Z" fill="#FF5F00" />
                </svg>
                <span style={{ fontSize: '10.5px', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.2px' }}>
                  Mastercard
                </span>
              </div>

              {/* Mobile Wallets */}
              <div className="sf-pay-badge" style={{ color: '#334155' }}>
                <span>محافظ إلكترونية</span>
              </div>
            </div>

            {/* SSL Badge - Clean Unified Slate Trust Pill */}
            <div
              className="sf-footer-ssl-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>تسوق آمن ومعاملات مشفرة 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Powered by Z-Systems ERP */}
      <div
        className="sf-footer-bottom-wrapper"
        style={{
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '14px 20px',
        }}
      >
        <div
          className="sf-footer-bottom-bar"
          style={{
            maxWidth: 'var(--storefront-container, 1440px)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11.5px',
            color: '#64748b',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            جميع الحقوق محفوظة © {currentYear} <strong style={{ color: '#0f172a' }}>{brand.title}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a
              href="https://zsystemai.com/erp"
              target="_blank"
              rel="noopener noreferrer"
              title="Z-Systems Cloud ERP"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                direction: 'ltr',
                textDecoration: 'none',
                color: '#64748b',
                transition: 'opacity 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', letterSpacing: '0.2px' }}>
                Powered by
              </span>
              <span
                style={{
                  fontWeight: 900,
                  color: 'var(--storefront-primary-color, #170e5e)',
                  background: '#ffffff',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>Z-Systems ERP</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
