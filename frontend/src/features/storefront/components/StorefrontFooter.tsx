import { useState } from 'react';
import type { StorefrontInfo } from '../types/storefront.types';
import { resolveStorefrontBrand, StorefrontBrandLogo } from './StorefrontHeader';

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
  const brand = resolveStorefrontBrand(info);
  const whatsappNumber = (info.whatsappPhone || '').replace(/[^0-9]/g, '');
  const cleanPhone = whatsappNumber.startsWith('01') ? `2${whatsappNumber}` : whatsappNumber;
  const currentYear = new Date().getFullYear();

  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activePolicy, setActivePolicy] = useState<{ title: string; content: string } | null>(null);

  const supportEmail =
    ((info as unknown as Record<string, unknown>).email as string | undefined)?.trim() ||
    'support@stylehub.com';

  const policies = {
    contact: {
      title: 'تواصل معنا',
      content: cleanPhone
        ? `يسعدنا تواصلك معنا مباشرة عبر واتساب أو الهاتف على الرقم ${info.whatsappPhone} أو عبر البريد الإلكتروني ${supportEmail} طوال أيام الأسبوع.`
        : `يسعدنا تواصلك معنا عبر البريد الإلكتروني ${supportEmail} للرد على كافة استفساراتك وطلباتك في أسرع وقت.`,
    },
    faq: {
      title: 'الأسئلة الشائعة',
      content:
        'يمكنك الطلب بسهولة عبر إضافة المنتجات إلى سلة المشتريات ثم الضغط على إتمام الطلب وإدخال بيانات التوصيل. نوفر خدمة الدفع عند الاستلام والتوصيل السريع لكافة المناطق.',
    },
    shippingReturns: {
      title: 'الشحن والاسترجاع',
      content:
        'يتم شحن الطلبات خلال 24 إلى 48 ساعة من تأكيد الطلب. كما يحق للعميل استبدال أو استرجاع المنتج خلال 14 يوماً من تاريخ الاستلام بشرط أن يكون بحالته الأصلية.',
    },
    sizeGuide: {
      title: 'دليل المقاسات',
      content:
        'تتوفر جميع المنتجات بمقاسات قياسية دقيقة (S, M, L, XL, XXL). في حال رغبتك في التأكد من المقاس الأنسب لك قبل الطلب، لا تتردد في مراسلة فريق خدمة العملاء.',
    },
    privacy: {
      title: 'سياسة الخصوصية',
      content:
        'نحن نلتزم بحماية بياناتك الشخصية واستخدامها فقط لتنفيذ طلباتك وتحسين تجربة التسوق. جميع بياناتك ومعاملاتك محمية بأعلى معايير الأمان والخصوصية.',
    },
    terms: {
      title: 'شروط الخدمة',
      content:
        'باستخدامك للمتجر فإنك توافق على شروط الخدمة والأسعار المعلنة. نحرص دائماً على تقديم أفضل جودة وأدق مواصفات لكافة المنتجات المعروضة.',
    },
  };

  const storeDescription =
    (info.bio || info.description || '').trim() ||
    'وجهتك المفضلة للأناقة المختارة بعناية وتجربة تسوق سلسة. اكتشف الجودة، الأناقة، والراحة في مكان واحد.';

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubscribed(true);
    setEmailInput('');
    setTimeout(() => setSubscribed(false), 3500);
  };

  const scrollTopAndRun = (fn?: () => void) => {
    if (fn) fn();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="sf-stylehub-footer-outer" dir="rtl">
      <style>{`
        .sf-stylehub-footer-outer {
          width: 100%;
          max-width: 100%;
          margin: 18px 0 0;
          padding: 0;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
          box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.025);
          box-sizing: border-box;
          direction: rtl;
          color: #111827;
        }

        .sf-stylehub-footer-card {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;
          padding: 24px 24px 14px;
          box-sizing: border-box;
        }

        .sf-stylehub-footer-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 28px;
          width: 100%;
        }

        .sf-stylehub-col-brand {
          flex: 0 1 280px;
        }

        .sf-stylehub-col-connect {
          flex: 0 1 290px;
        }

        /* Column 1: Brand */
        .sf-stylehub-brand-row {
          display: inline-flex;
          direction: ltr;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .sf-stylehub-cube-icon {
          color: var(--storefront-primary-color, #e87a24);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .sf-stylehub-brand-name {
          margin: 0;
          font-size: 16.5px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }

        .sf-stylehub-brand-desc {
          margin: 0 0 12px;
          font-size: 12.5px;
          color: #6b7280;
          line-height: 1.55;
          max-width: 265px;
        }

        .sf-stylehub-socials {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          width: 100%;
          max-width: 265px;
        }

        .sf-stylehub-social-link {
          color: #6b7280;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: color 0.16s ease, transform 0.16s ease;
          padding: 2px;
        }

        .sf-stylehub-social-link:hover {
          color: var(--storefront-primary-color, #e87a24);
          transform: translateY(-1px);
        }

        /* Columns 2, 3, 4 Headings */
        .sf-stylehub-col-heading {
          margin: 0 0 9px;
          font-size: 13.5px;
          font-weight: 700;
          color: #111827;
          line-height: 1.35;
        }

        /* Link Lists */
        .sf-stylehub-links-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sf-stylehub-link-btn {
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          font-size: 12.5px;
          font-weight: 400;
          color: #6b7280;
          cursor: pointer;
          text-align: right;
          transition: color 0.15s ease;
          line-height: 1.35;
        }

        .sf-stylehub-link-btn:hover {
          color: var(--storefront-primary-color, #e87a24);
        }

        /* Column 4: Stay Connected */
        .sf-stylehub-newsletter-text {
          margin: 0 0 9px;
          font-size: 12.5px;
          color: #6b7280;
          line-height: 1.5;
        }

        .sf-stylehub-newsletter-form {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }

        .sf-stylehub-newsletter-input {
          flex: 1;
          min-width: 0;
          height: 34px;
          padding: 0 10px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          font-family: inherit;
          font-size: 12px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .sf-stylehub-newsletter-input::placeholder {
          color: #9ca3af;
        }

        .sf-stylehub-newsletter-input:focus {
          border-color: var(--storefront-primary-color, #e87a24);
          box-shadow: 0 0 0 3px rgba(232, 122, 36, 0.1);
        }

        .sf-stylehub-newsletter-submit {
          width: 36px;
          height: 34px;
          border-radius: 6px;
          background: var(--storefront-primary-color, #e87a24);
          border: none;
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .sf-stylehub-newsletter-submit:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .sf-stylehub-newsletter-submit:active {
          transform: scale(0.97);
        }

        .sf-stylehub-support-mail {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12.5px;
          color: #4b5563;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .sf-stylehub-support-mail:hover {
          color: var(--storefront-primary-color, #e87a24);
        }

        .sf-stylehub-support-mail svg {
          color: #6b7280;
          flex-shrink: 0;
        }

        /* Divider & Centered Bottom Copyright */
        .sf-stylehub-divider {
          border: none;
          border-top: 1px solid #f1f5f9;
          margin: 16px 0 12px;
        }

        .sf-stylehub-bottom {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sf-stylehub-copyright {
          margin: 0;
          font-size: 11.5px;
          color: #9ca3af;
          line-height: 1.4;
          text-align: right;
        }

        .sf-stylehub-bottom-links {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          font-size: 11.5px;
          color: #9ca3af;
        }

        .sf-stylehub-bottom-link {
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          font-size: 11.5px;
          color: #9ca3af;
          cursor: pointer;
          transition: color 0.15s ease;
        }

        .sf-stylehub-bottom-link:hover {
          color: #4b5563;
        }

        @media (max-width: 1024px) {
          .sf-stylehub-footer-card {
            padding: 22px 20px 14px;
          }
          .sf-stylehub-footer-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px 20px;
          }
          .sf-stylehub-brand-desc {
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .sf-stylehub-footer-outer {
            padding: 0 0 calc(84px + env(safe-area-inset-bottom, 0px)) !important;
            margin-top: 12px !important;
          }
          .sf-stylehub-footer-card {
            border-radius: 0 !important;
            padding: 20px 16px 14px !important;
          }
          .sf-stylehub-footer-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 18px 14px !important;
          }
          .sf-stylehub-col-brand,
          .sf-stylehub-col-connect {
            grid-column: 1 / -1 !important;
          }
          .sf-stylehub-divider {
            margin: 14px 0 10px !important;
          }
        }
      `}</style>

      <div className="sf-stylehub-footer-card">
        <div className="sf-stylehub-footer-grid">
          {/* Column 1: Brand + Description + Outline Social Icons */}
          <div className="sf-stylehub-col-brand">
            <div className="sf-stylehub-brand-row">
              {info.logo_url || info.logoUrl ? (
                <StorefrontBrandLogo
                  src={(info.logo_url || info.logoUrl)!}
                  alt={brand.title}
                  size={28}
                />
              ) : (
                <span className="sf-stylehub-cube-icon" aria-hidden="true">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </span>
              )}
              <h3 dir="auto" className="sf-stylehub-brand-name">
                {brand.title}
              </h3>
            </div>

            <p className="sf-stylehub-brand-desc">{storeDescription}</p>

            <div className="sf-stylehub-socials">
              {/* Facebook Outline Icon */}
              <a
                href="#facebook"
                onClick={(e) => e.preventDefault()}
                className="sf-stylehub-social-link"
                aria-label="فيسبوك"
                title="فيسبوك"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>

              {/* Instagram Outline Icon */}
              <a
                href="#instagram"
                onClick={(e) => e.preventDefault()}
                className="sf-stylehub-social-link"
                aria-label="إنستغرام"
                title="إنستغرام"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>

              {/* Twitter Bird Outline Icon */}
              <a
                href="#twitter"
                onClick={(e) => e.preventDefault()}
                className="sf-stylehub-social-link"
                aria-label="تويتر"
                title="تويتر"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>

              {/* YouTube Play Screen Outline Icon */}
              <a
                href={cleanPhone ? `https://wa.me/${cleanPhone}` : '#youtube'}
                onClick={!cleanPhone ? (e) => e.preventDefault() : undefined}
                target={cleanPhone ? '_blank' : undefined}
                rel={cleanPhone ? 'noopener noreferrer' : undefined}
                className="sf-stylehub-social-link"
                aria-label="يوتيوب"
                title="يوتيوب"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links (روابط سريعة) */}
          <div>
            <h4 className="sf-stylehub-col-heading">روابط سريعة</h4>
            <ul className="sf-stylehub-links-list">
              <li>
                <button
                  type="button"
                  onClick={() => scrollTopAndRun(onGoHome)}
                  className="sf-stylehub-link-btn"
                >
                  تسوق الكل
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => (onOpenCategories ? onOpenCategories() : scrollTopAndRun(onGoHome))}
                  className="sf-stylehub-link-btn"
                >
                  الأكثر مبيعاً
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTopAndRun(onToggleDeals || onGoHome)}
                  className="sf-stylehub-link-btn"
                >
                  العروض والتخفيضات
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Service (خدمة العملاء) */}
          <div>
            <h4 className="sf-stylehub-col-heading">خدمة العملاء</h4>
            <ul className="sf-stylehub-links-list">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (cleanPhone) {
                      window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
                    } else {
                      setActivePolicy(policies.contact);
                    }
                  }}
                  className="sf-stylehub-link-btn"
                >
                  تواصل معنا
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActivePolicy(policies.shippingReturns)}
                  className="sf-stylehub-link-btn"
                >
                  الشحن والاسترجاع
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => (onOpenOrders ? onOpenOrders() : setActivePolicy(policies.shippingReturns))}
                  className="sf-stylehub-link-btn"
                >
                  تتبع الطلب
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Stay Connected (ابقَ على تواصل) */}
          <div className="sf-stylehub-col-connect">
            <h4 className="sf-stylehub-col-heading">ابقَ على تواصل</h4>

            <form className="sf-stylehub-newsletter-form" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={subscribed ? 'تم الاشتراك بنجاح ✓' : 'بريدك الإلكتروني'}
                className="sf-stylehub-newsletter-input"
                aria-label="بريدك الإلكتروني"
              />
              <button
                type="submit"
                className="sf-stylehub-newsletter-submit"
                aria-label="إرسال"
                title="اشترك"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>

            <a
              href={cleanPhone ? `https://wa.me/${cleanPhone}` : `mailto:${supportEmail}`}
              target={cleanPhone ? '_blank' : undefined}
              rel={cleanPhone ? 'noopener noreferrer' : undefined}
              className="sf-stylehub-support-mail"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span dir="ltr">{supportEmail}</span>
            </a>
          </div>
        </div>

        <hr className="sf-stylehub-divider" />

        {/* Centered Bottom Copyright & Legal Links */}
        <div className="sf-stylehub-bottom">
          <p className="sf-stylehub-copyright">
            © {currentYear} <span dir="auto">{brand.title}</span>. جميع الحقوق محفوظة.
          </p>
          <div className="sf-stylehub-bottom-links">
            <button
              type="button"
              onClick={() => setActivePolicy(policies.privacy)}
              className="sf-stylehub-bottom-link"
            >
              سياسة الخصوصية
            </button>
            <span style={{ color: '#d1d5db' }}>|</span>
            <button
              type="button"
              onClick={() => setActivePolicy(policies.terms)}
              className="sf-stylehub-bottom-link"
            >
              شروط الخدمة
            </button>
          </div>
        </div>
      </div>

      {/* Policy Modal */}
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
              border: '1px solid #e2e8f0',
              padding: '22px 24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(15, 23, 42, 0.16)',
              position: 'relative',
              direction: 'rtl',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {activePolicy.title}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
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
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
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


