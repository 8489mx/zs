import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import type { StorefrontInfo } from '../types/storefront.types';
import { resolveStorefrontBrand } from './StorefrontHeader';

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
  const { t } = useTranslation();
  const brand = resolveStorefrontBrand(info);
  const whatsappNumber = (info.whatsappPhone || '').replace(/[^0-9]/g, '');
  const cleanPhone = whatsappNumber.startsWith('01') ? `2${whatsappNumber}` : whatsappNumber;
  const currentYear = new Date().getFullYear();
  const monogramLetter =
    (brand.title || '').trim().replace(/^ال/, '').trim().charAt(0) ||
    (brand.title || '').trim().charAt(0) ||
    'م';

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [activePolicy, setActivePolicy] = useState<{ title: string; content: string } | null>(null);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setNewsletterSubmitted(true);
  };

  const policies = {
    returns: {
      title: 'سياسة الاستبدال والاسترجاع',
      content:
        'يحق للعميل استبدال أو استرجاع المنتج خلال 14 يوماً من تاريخ الاستلام بشرط أن يكون المنتج بحالته الأصلية وفي غلافه الأصلي مع إرفاق فاتورة الشراء. في حال وجود أي عيب مصنعي يتحمل المتجر كافة تكاليف الشحن.',
    },
    shipping: {
      title: 'الشحن والتوصيل',
      content:
        'يتم شحن الطلبات وتوصيلها لجميع المحافظات خلال 24 إلى 48 ساعة من تأكيد الطلب. نوفر ميزة التوصيل السريع والمتابعة المباشرة لمسار شحنتك حتى باب المنزل.',
    },
    privacy: {
      title: 'سياسة الخصوصية',
      content:
        'نحن نلتزم بحماية بياناتك الشخصية واستخدامها فقط لتنفيذ طلباتك وتحسين تجربة التسوق. جميع بيانات الدفع والمعاملات مشفرة ومحمية بأعلى معايير الأمان العالمية.',
    },
    terms: {
      title: 'الشروط والأحكام',
      content:
        'باستخدامك للمتجر فإنك توافق على شروط الخدمة والأسعار المعلنة. نحرص دائماً على تقديم أفضل جودة وأدق مواصفات لكافة المنتجات المعروضة.',
    },
  };

  return (
    <footer
      style={{
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        marginTop: 'auto',
        color: '#1e293b',
        direction: 'rtl',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .sf-modern-footer-container {
          max-width: var(--storefront-container, 1380px);
          margin: 0 auto;
          padding: 48px 24px 28px;
          box-sizing: border-box;
        }
        .sf-footer-banner {
          background: linear-gradient(135deg, #2353a0 0%, var(--storefront-primary-color, #2d68c4) 50%, #3b76d8 100%);
          border-radius: 24px;
          padding: 44px 32px;
          color: #ffffff;
          text-align: center;
          margin-bottom: 56px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px var(--storefront-primary-subtle, rgba(45, 104, 196, 0.2));
        }
        .sf-footer-banner::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -20%;
          width: 70%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 65%);
          pointer-events: none;
        }
        .sf-footer-banner-title {
          margin: 0 0 10px;
          font-size: clamp(20px, 2.5vw, 28px);
          font-weight: 800;
          line-height: 1.35;
          letter-spacing: -0.3px;
        }
        .sf-footer-banner-desc {
          margin: 0 auto 24px;
          font-size: clamp(13px, 1.4vw, 15px);
          color: rgba(255, 255, 255, 0.88);
          max-width: 620px;
          line-height: 1.6;
        }
        .sf-footer-banner-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ffffff;
          color: var(--storefront-primary-color, #2d68c4);
          font-size: 14px;
          font-weight: 700;
          padding: 12px 28px;
          border-radius: 9999px !important;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sf-footer-banner-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
        }
        .sf-footer-cols-grid {
          display: grid;
          grid-template-columns: 1.35fr 1fr 1.15fr 1.4fr;
          gap: 48px;
          margin-bottom: 48px;
        }
        .sf-footer-col-header {
          font-size: 14.5px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 18px;
          letter-spacing: -0.2px;
        }
        .sf-footer-links-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .sf-footer-link-item {
          background: none;
          border: none;
          padding: 0;
          font-size: 13.5px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          text-align: right;
          transition: color 0.18s ease, transform 0.18s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sf-footer-link-item:hover {
          color: var(--storefront-primary-color, #2d68c4);
          transform: translateX(-3px);
        }
        .sf-footer-social-btn {
          width: 36px;
          height: 36px;
          padding: 0 !important;
          box-sizing: border-box;
          line-height: 0;
          border-radius: 50% !important;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .sf-footer-social-btn svg {
          display: block;
          flex-shrink: 0;
        }
        .sf-footer-social-btn:hover {
          background: var(--storefront-primary-color, #2d68c4);
          color: #ffffff;
          border-color: var(--storefront-primary-color, #2d68c4);
          transform: translateY(-2px);
        }
        .sf-newsletter-pill {
          display: flex;
          align-items: center;
          height: 46px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px !important;
          padding: 4px;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .sf-newsletter-pill:focus-within {
          border-color: var(--storefront-primary-color, #2d68c4);
          box-shadow: 0 0 0 3px rgba(45, 104, 196, 0.12);
          background: #ffffff;
        }
        .sf-newsletter-input {
          flex: 1;
          height: 100%;
          border: none !important;
          background: transparent !important;
          padding: 0 14px;
          font-size: 13px;
          color: #0f172a;
          outline: none !important;
          box-shadow: none !important;
          min-width: 0;
        }
        .sf-newsletter-input::placeholder {
          color: #94a3b8;
        }
        .sf-newsletter-submit-btn {
          height: 36px;
          background: var(--storefront-primary-color, #2d68c4);
          color: #ffffff;
          border: none !important;
          border-radius: 9999px !important;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: opacity 0.15s ease;
        }
        .sf-newsletter-submit-btn:hover {
          opacity: 0.92;
        }
        .sf-footer-bottom-bar-clean {
          border-top: 1px solid #f1f5f9;
          padding-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 12.5px;
          color: #64748b;
        }
        .sf-footer-legal-links {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .sf-footer-legal-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 12.5px;
          color: #64748b;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .sf-footer-legal-btn:hover {
          color: #0f172a;
        }
        @media (max-width: 960px) {
          .sf-footer-cols-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 36px;
          }
        }
        @media (max-width: 640px) {
          .sf-modern-footer-container {
            padding: 32px 16px 20px;
          }
          .sf-footer-banner {
            padding: 28px 18px;
            border-radius: 18px;
            margin-bottom: 36px;
          }
          .sf-footer-cols-grid {
            grid-template-columns: 1fr;
            gap: 28px;
            margin-bottom: 32px;
          }
          .sf-footer-bottom-bar-clean {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }
          .sf-footer-legal-links {
            justify-content: center;
            gap: 12px;
          }
        }
      `}</style>

      <div className="sf-modern-footer-container">
        {/* 1. Fluid Modern Top Banner */}
        <div className="sf-footer-banner">
          <h2 className="sf-footer-banner-title">
            عروض وخصومات حصرية
          </h2>
          <p className="sf-footer-banner-desc">
            أفضل المنتجات بأسعار مخفضة وتوصيل سريع حتى باب المنزل.
          </p>
          <button
            type="button"
            className="sf-footer-banner-btn"
            onClick={() => {
              if (onToggleDeals) {
                onToggleDeals();
              } else if (onGoHome) {
                onGoHome();
              }
              const mainEl = document.querySelector('.storefront-main-content');
              if (mainEl) {
                mainEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            <span>تصفح العروض</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </div>

        {/* 2. Main 4-Column Directory (Airy, Minimalist, Concise) */}
        <div className="sf-footer-cols-grid">
          {/* Col 1: Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              {info.logo_url || info.logoUrl ? (
                <img
                  src={info.logo_url || info.logoUrl}
                  alt={brand.title}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    objectFit: 'contain',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    padding: '2px',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--storefront-primary-color, #2d68c4)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '15px',
                  }}
                >
                  {monogramLetter}
                </div>
              )}
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {brand.title}
              </h3>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b', lineHeight: 1.5, maxWidth: '280px' }}>
              تسوق أفضل المنتجات بسهولة وأمان.
            </p>

            {/* Social Icons Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#whatsapp'}
                onClick={!cleanPhone ? (e) => e.preventDefault() : undefined}
                target={cleanPhone ? '_blank' : undefined}
                rel={cleanPhone ? 'noopener noreferrer' : undefined}
                className="sf-footer-social-btn"
                title="واتساب"
                aria-label="WhatsApp"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  shapeRendering="geometricPrecision"
                >
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                  <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                </svg>
              </a>
              <a
                href="#facebook"
                onClick={(e) => e.preventDefault()}
                className="sf-footer-social-btn"
                title="فيسبوك"
                aria-label="Facebook"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H7.5v-3H10V9.5C10 7.01 11.49 5.63 13.77 5.63c1.09 0 2.23.19 2.23.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 3h-2.34v6.8c4.56-.93 8-4.96 8-9.8z" />
                </svg>
              </a>
              <a
                href="#instagram"
                onClick={(e) => e.preventDefault()}
                className="sf-footer-social-btn"
                title="إنستغرام"
                aria-label="Instagram"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="#telegram"
                onClick={(e) => e.preventDefault()}
                className="sf-footer-social-btn"
                title="تليجرام"
                aria-label="Telegram"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="sf-footer-col-header">روابط سريعة</h4>
            <ul className="sf-footer-links-list">
              {onGoHome && (
                <li>
                  <button type="button" onClick={onGoHome} className="sf-footer-link-item">
                    الرئيسية
                  </button>
                </li>
              )}
              {onToggleDeals && (
                <li>
                  <button type="button" onClick={onToggleDeals} className="sf-footer-link-item">
                    العروض
                  </button>
                </li>
              )}
              {onOpenCategories && (
                <li>
                  <button type="button" onClick={onOpenCategories} className="sf-footer-link-item">
                    الأقسام
                  </button>
                </li>
              )}
              {onOpenCart && (
                <li>
                  <button type="button" onClick={onOpenCart} className="sf-footer-link-item">
                    السلة
                  </button>
                </li>
              )}
              {onOpenOrders && (
                <li>
                  <button type="button" onClick={onOpenOrders} className="sf-footer-link-item">
                    طلباتي
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Customer Care & Policies */}
          <div>
            <h4 className="sf-footer-col-header">خدمة العملاء</h4>
            <ul className="sf-footer-links-list">
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy(policies.returns)}
                  className="sf-footer-link-item"
                >
                  الاستبدال والاسترجاع
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy(policies.shipping)}
                  className="sf-footer-link-item"
                >
                  الشحن والتوصيل
                </button>
              </li>
              {cleanPhone && (
                <li>
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sf-footer-link-item"
                    style={{ textDecoration: 'none' }}
                  >
                    تواصل معنا
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Newsletter */}
          <div>
            <h4 className="sf-footer-col-header">النشرة البريدية</h4>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
              عروض وتخفيضات أسبوعية.
            </p>

            {newsletterSubmitted ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>تم الاشتراك بنجاح!</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="sf-newsletter-pill">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="بريدك الإلكتروني"
                  aria-label="Email Address"
                  required
                  className="sf-newsletter-input"
                />
                <button type="submit" className="sf-newsletter-submit-btn">
                  <span>اشتراك</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* 3. Bottom Copyright & Legal Links Bar */}
        <div className="sf-footer-bottom-bar-clean">
          <div>
            {t('storefront.storefront_footer.s29', 'جميع الحقوق محفوظة ©')} {currentYear}{' '}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{brand.title}</span>
          </div>

          <div className="sf-footer-legal-links">
            <button
              type="button"
              onClick={() => setActivePolicy(policies.privacy)}
              className="sf-footer-legal-btn"
            >
              سياسة الخصوصية
            </button>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <button
              type="button"
              onClick={() => setActivePolicy(policies.terms)}
              className="sf-footer-legal-btn"
            >
              شروط الاستخدام
            </button>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <a
              href="https://zsystemai.com/erp"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'none',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--storefront-primary-color, #2d68c4)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
            >
              <span>Powered by</span>
              <span style={{ fontWeight: 700, color: 'var(--storefront-primary-color, #2d68c4)' }}>
                Z-Systems ERP
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Policy Lightbox Modal */}
      {activePolicy && (
        <div
          onClick={() => setActivePolicy(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px 28px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.16)',
              position: 'relative',
              direction: 'rtl',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                {activePolicy.title}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.7 }}>
              {activePolicy.content}
            </p>
          </div>
        </div>
      )}
    </footer>
  );
}
