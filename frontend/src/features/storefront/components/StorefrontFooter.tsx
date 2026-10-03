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
          grid-template-columns: 1.4fr 1fr 1fr 1.2fr;
          gap: 36px;
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
        }
        .sf-footer-link-btn:hover {
          color: var(--storefront-primary-color, #170e5e);
          transform: translateX(-3px);
        }
        .sf-pay-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 9px;
          border-radius: 7px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          letter-spacing: 0.2px;
          user-select: none;
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
        @media (max-width: 600px) {
          .sf-footer-trust-strip {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .sf-footer-directory {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }
      `}</style>

      {/* Top Enterprise Trust Strip */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '20px 20px' }}>
        <div style={{ maxWidth: 'var(--storefront-container, 1440px)', margin: '0 auto' }}>
          <div className="sf-footer-trust-strip">
            {/* Value 1: Fast Shipping */}
            <div className="sf-footer-trust-item">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'var(--storefront-surface-color, #eef2ff)',
                  color: 'var(--storefront-primary-color, #170e5e)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  توصيل سريع وآمن
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  شحن مباشر مع متابعة دقيقة لحالة الطلب
                </p>
              </div>
            </div>

            {/* Value 2: Original Quality */}
            <div className="sf-footer-trust-item">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  color: '#16a34a',
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
                <h4 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  منتجات أصلية 100%
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  فحص وضمان جودة لكافة الأصناف المعروضة
                </p>
              </div>
            </div>

            {/* Value 3: Flexible Payment */}
            <div className="sf-footer-trust-item">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
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
                <h4 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  دفع آمن ومرن
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  كاش عند الاستلام أو بطاقات ومحافظ رقمية
                </p>
              </div>
            </div>

            {/* Value 4: Customer Care */}
            <div className="sf-footer-trust-item">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
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
                <h4 style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  خدمة عملاء مباشرة
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  دعم واستفسارات فورية عبر محادثة واتساب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Directory & Storefront Details */}
      <div style={{ maxWidth: 'var(--storefront-container, 1440px)', margin: '0 auto', padding: '34px 20px 28px' }}>
        <div className="sf-footer-directory">
          {/* Col 1: Store Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              {info.logo_url || info.logoUrl ? (
                <img
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
                  {brand.title.trim().charAt(0) || 'م'}
                </div>
              )}
              <div>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 900, color: '#0f172a' }}>
                  {brand.title}
                </h3>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: 'var(--storefront-primary-color, #170e5e)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <IconCheckCircle size={11} color="var(--storefront-primary-color, #170e5e)" strokeWidth={2.2} />
                  <span>متجر رسمي معتمد</span>
                </span>
              </div>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.6, maxWidth: '340px' }}>
              {info.bio || 'وجهتك الأولى لتسوق أفضل المنتجات بأفضل الأسعار، جودة مضمونة وسرعة في تنفيذ وتوصيل الطلبات.'}
            </p>

            {brand.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{brand.address}</span>
              </div>
            )}
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--storefront-primary-color, #170e5e)', borderRadius: '2px', display: 'inline-block' }} />
              <span>روابط سريعة</span>
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {onGoHome && (
                <li>
                  <button type="button" onClick={onGoHome} className="sf-footer-link-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>الصفحة الرئيسية</span>
                  </button>
                </li>
              )}
              {onOpenCategories && (
                <li>
                  <button type="button" onClick={onOpenCategories} className="sf-footer-link-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>تصفح جميع الأقسام</span>
                  </button>
                </li>
              )}
              {onToggleDeals && (
                <li>
                  <button type="button" onClick={onToggleDeals} className="sf-footer-link-btn" style={{ color: '#dc2626' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>العروض والتخفيضات المميزة</span>
                  </button>
                </li>
              )}
              {onOpenOrders && (
                <li>
                  <button type="button" onClick={onOpenOrders} className="sf-footer-link-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>متابعة وتتبع طلباتي</span>
                  </button>
                </li>
              )}
              {onOpenCart && (
                <li>
                  <button type="button" onClick={onOpenCart} className="sf-footer-link-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>عرض سلة المشتريات</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Customer Care & WhatsApp */}
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--storefront-primary-color, #170e5e)', borderRadius: '2px', display: 'inline-block' }} />
              <span>خدمة العملاء</span>
            </h4>
            <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
              فريقنا متواجد للرد على كافة الاستفسارات ومساعدتك في اختيار المنتجات:
            </p>
            {cleanPhone ? (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 15px',
                  borderRadius: '10px',
                  background: '#25d366',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.22)',
                  transition: 'transform 0.15s ease, filter 0.15s ease',
                  marginBottom: '10px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.filter = 'brightness(1.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'none';
                }}
              >
                <svg width="17" height="17" fill="#ffffff" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
                </svg>
                <span>محادثة واتساب فورية</span>
              </a>
            ) : null}
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              الطلبات متاحة أونلاين على مدار الساعة
            </div>
          </div>

          {/* Col 4: Payment Badges & SSL */}
          <div>
            <h4 style={{ margin: '0 0 14px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: 'var(--storefront-primary-color, #170e5e)', borderRadius: '2px', display: 'inline-block' }} />
              <span>طرق الدفع والضمان</span>
            </h4>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '14px' }}>
              {/* Cash On Delivery */}
              <div className="sf-pay-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
                <span>كاش عند الاستلام</span>
              </div>

              {/* Visa */}
              <div className="sf-pay-badge" style={{ fontFamily: 'sans-serif', fontWeight: 900, color: '#1a1f71', letterSpacing: '0.5px' }}>
                VISA
              </div>

              {/* Mastercard */}
              <div className="sf-pay-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eb001b', display: 'inline-block', opacity: 0.9 }} />
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f79e1b', display: 'inline-block', marginLeft: '-4px', opacity: 0.9 }} />
                </span>
                <span style={{ fontSize: '10.5px', fontFamily: 'sans-serif', fontWeight: 800, color: '#1e293b' }}>mastercard</span>
              </div>

              {/* Meeza */}
              <div className="sf-pay-badge" style={{ color: '#0284c7' }}>
                <span>ميزة Meeza</span>
              </div>

              {/* Mobile Wallets */}
              <div className="sf-pay-badge" style={{ color: '#475569' }}>
                <span>محافظ إلكترونية</span>
              </div>
            </div>

            {/* SSL Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#166534',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        style={{
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '14px 20px',
        }}
      >
        <div
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
          <div>
            جميع الحقوق محفوظة © {currentYear} <strong style={{ color: '#0f172a' }}>{brand.title}</strong>
          </div>

          <div>
            <a
              href="https://zsystemai.com/erp"
              target="_blank"
              rel="noopener noreferrer"
              title="نظام Z-Systems ERP لإدارة المؤسسات والمتاجر السحابية"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
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
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                مشغّل بواسطة <span style={{ fontFamily: 'sans-serif', fontSize: '10px', color: '#94a3b8' }}>Powered by</span>
              </span>
              <span
                style={{
                  fontWeight: 900,
                  color: 'var(--storefront-primary-color, #170e5e)',
                  background: '#ffffff',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Z-Systems ERP</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
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
