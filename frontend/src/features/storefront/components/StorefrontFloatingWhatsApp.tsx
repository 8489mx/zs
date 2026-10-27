import { useTranslation } from 'react-i18next';

interface StorefrontFloatingWhatsAppProps {
  phone?: string;
  countryCode?: string;
  currency?: string;
  storeName?: string;
  businessName?: string;
  hasFloatingCart?: boolean;
}

export function StorefrontFloatingWhatsApp({
  phone,
  countryCode,
  currency,
  storeName,
  businessName,
  hasFloatingCart = false,
}: StorefrontFloatingWhatsAppProps) {
  const { t } = useTranslation();

  if (!phone) return null;

  const rawDigits = phone.replace(/[^0-9]/g, '');
  let waNumber = rawDigits;
  if (waNumber.startsWith('00')) {
    waNumber = waNumber.slice(2);
  }

  // Country-aware international code normalization
  if (countryCode === 'KW' || currency === 'KWD') {
    if (waNumber.length === 8 && !waNumber.startsWith('965')) {
      waNumber = `965${waNumber}`;
    }
  } else if (countryCode === 'EG' || currency === 'EGP') {
    if (waNumber.startsWith('01') && waNumber.length === 11) {
      waNumber = `2${waNumber}`;
    }
  } else if (countryCode === 'SA' || currency === 'SAR') {
    if (waNumber.startsWith('5') && waNumber.length === 9) {
      waNumber = `966${waNumber}`;
    }
  }

  if (!waNumber || waNumber.length < 8) return null;

  const displayName = businessName || storeName;
  const welcomeMsg = displayName
    ? t('storefront.floating_whatsapp.welcome_store', 'مرحباً، أود الاستفسار عن منتجات {{name}}', { name: displayName })
    : t('storefront.floating_whatsapp.welcome_generic', 'مرحباً، أود الاستفسار عن منتجات المتجر');

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(welcomeMsg)}`;

  return (
    <>
      <style>{`
        .sf-floating-whatsapp {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9980;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25D366;
          color: #ffffff;
          border-radius: 9999px;
          padding: 10px 16px 10px 14px;
          text-decoration: none;
          box-shadow: 0 10px 25px -3px rgba(37, 211, 102, 0.42), 0 4px 10px -2px rgba(15, 23, 42, 0.12);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background 0.15s ease;
          font-family: inherit;
          user-select: none;
        }
        .sf-floating-whatsapp:hover {
          background: #22c55e;
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 14px 32px -3px rgba(37, 211, 102, 0.52), 0 6px 14px -2px rgba(15, 23, 42, 0.15);
        }
        .sf-floating-whatsapp:active {
          transform: translateY(0) scale(0.98);
        }
        .sf-floating-whatsapp-text {
          font-size: 12.5px;
          font-weight: 800;
          letter-spacing: -0.2px;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .sf-floating-whatsapp {
            bottom: ${hasFloatingCart ? '78px' : '18px'} !important;
            right: 14px !important;
            padding: 11px !important;
            border-radius: 50% !important;
            width: 46px !important;
            height: 46px !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
          .sf-floating-whatsapp-text {
            display: none !important;
          }
        }
        @media print {
          .sf-floating-whatsapp {
            display: none !important;
          }
        }
      `}</style>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="sf-floating-whatsapp"
        title={t('storefront.floating_whatsapp.tooltip', 'تواصل مع خدمة العملاء عبر واتساب')}
        aria-label={t('storefront.floating_whatsapp.aria', 'محادثة واتساب فورية')}
      >
        <svg width="22" height="22" fill="#ffffff" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24m4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.71 4.3 3.8 2.52 1.09 2.52.73 2.98.68.45-.04 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3" />
        </svg>
        <span className="sf-floating-whatsapp-text">
          {t('storefront.floating_whatsapp.label', 'تواصل معنا')}
        </span>
      </a>
    </>
  );
}
