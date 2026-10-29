import { useTranslation } from 'react-i18next';
import { useState } from 'react';
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

  const [activePolicy, setActivePolicy] = useState<{ title: string; content: string } | null>(null);

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
          padding: 36px 24px 22px;
          box-sizing: border-box;
        }
        .sf-footer-cols-grid {
          display: grid;
          grid-template-columns: 1.3fr 0.85fr 0.85fr 1.15fr;
          gap: 36px;
          margin-bottom: 32px;
          align-items: start;
        }
        .sf-footer-col-header {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 14px;
          letter-spacing: -0.2px;
        }
        .sf-footer-links-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .sf-footer-link-item {
          background: none;
          border: none;
          padding: 0;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          text-align: right;
          transition: color 0.16s ease, transform 0.16s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .sf-footer-link-item:hover {
          color: var(--storefront-primary-color, #2d68c4);
          transform: translateX(-2px);
        }
        .sf-footer-social-btn {
          width: 34px;
          height: 34px;
          padding: 0 !important;
          box-sizing: border-box;
          line-height: 0;
          border-radius: 10px !important;
          background: #ffffff;
          border: 1px solid #E0E3E7;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .sf-footer-social-btn svg {
          display: block;
          flex-shrink: 0;
        }
        .sf-footer-social-btn:hover {
          background: #f8fafc;
          color: var(--storefront-primary-color, #2d68c4);
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .sf-footer-contact-btn {
          height: 36px;
          padding: 0 16px;
          border-radius: 9999px !important;
          background: #ffffff;
          border: 1px solid #dadce0;
          color: #1f1f1f;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          transition: all 0.16s ease;
          box-sizing: border-box;
        }
        .sf-footer-contact-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: var(--storefront-primary-color, #2d68c4);
          transform: translateY(-1px);
        }
        .sf-footer-bottom-bar-clean {
          border-top: 1px solid #f1f5f9;
          padding-top: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          font-size: 12px;
          color: #64748b;
        }
        .sf-footer-legal-links {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .sf-footer-legal-btn {
          background: none;
          border: none;
          padding: 0;
          font-size: 12px;
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
            gap: 28px;
          }
        }
        @media (max-width: 640px) {
          .sf-modern-footer-container {
            padding: 24px 16px calc(80px + env(safe-area-inset-bottom, 0px)) !important;
          }
          .sf-footer-cols-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px 16px;
            margin-bottom: 20px;
          }
          .sf-footer-brand-col {
            grid-column: 1 / -1;
          }
          .sf-footer-contact-col {
            grid-column: 1 / -1;
          }
          .sf-footer-contact-btn {
            width: 100%;
            max-width: 280px;
            height: 38px;
          }
          .sf-footer-bottom-bar-clean {
            flex-direction: column;
            text-align: center;
            gap: 10px;
            padding-top: 14px;
          }
          .sf-footer-legal-links {
            justify-content: center;
            gap: 10px;
          }
        }
      `}</style>

      <div className="sf-modern-footer-container">
        {/* Main 4-Column Compact Directory */}
        <div className="sf-footer-cols-grid">
          {/* Col 1: Brand Info */}
          <div className="sf-footer-brand-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              {info.logo_url || info.logoUrl ? (
                <img
                  src={info.logo_url || info.logoUrl}
                  alt={brand.title}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    objectFit: 'contain',
                    background: '#ffffff',
                    border: '1px solid #E0E3E7',
                    padding: '2px',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'var(--storefront-primary-color, #2d68c4)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                  }}
                >
                  {monogramLetter}
                </div>
              )}
              <h3 dir="auto" style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#0f172a' }}>
                {brand.title}
              </h3>
            </div>

            <p style={{ margin: '0 0 14px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.55, maxWidth: '260px' }}>
              تسوق أفضل المنتجات بسهولة وأمان.
            </p>

            {/* Social Icons Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
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
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24">
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
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links (Concise 3 items) */}
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
              {onOpenCategories && (
                <li>
                  <button type="button" onClick={onOpenCategories} className="sf-footer-link-item">
                    الأقسام
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
              {onOpenOrders && (
                <li>
                  <button type="button" onClick={onOpenOrders} className="sf-footer-link-item">
                    طلباتي
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Customer Care (Concise 2 items) */}
          <div>
            <h4 className="sf-footer-col-header">خدمة العملاء</h4>
            <ul className="sf-footer-links-list">
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy(policies.shipping)}
                  className="sf-footer-link-item"
                >
                  الشحن والتوصيل
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy(policies.returns)}
                  className="sf-footer-link-item"
                >
                  الاستبدال والاسترجاع
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Us (Replaces Newsletter) */}
          <div className="sf-footer-contact-col">
            <h4 className="sf-footer-col-header">تواصل معنا</h4>
            <p style={{ margin: '0 0 12px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.55 }}>
              نسعد بالرد على استفساراتكم ومتابعة طلباتكم.
            </p>

            <a
              href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#contact'}
              onClick={!cleanPhone ? (e) => e.preventDefault() : undefined}
              target={cleanPhone ? '_blank' : undefined}
              rel={cleanPhone ? 'noopener noreferrer' : undefined}
              className="sf-footer-contact-btn"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
              </svg>
              <span>تحدث معنا عبر واتساب</span>
            </a>
          </div>
        </div>

        {/* Bottom Copyright & Legal Links Bar */}
        <div className="sf-footer-bottom-bar-clean">
          <div>
            {t('storefront.storefront_footer.s29', 'جميع الحقوق محفوظة ©')} {currentYear}{' '}
            <span dir="auto" style={{ fontWeight: 600, color: '#0f172a', unicodeBidi: 'isolate' }}>{brand.title}</span>
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
              dir="ltr"
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
              border: '1px solid #E0E3E7',
              padding: '22px 24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.16)',
              position: 'relative',
              direction: 'rtl',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {activePolicy.title}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #E0E3E7',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
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
