import { useTranslation } from 'react-i18next';
import { IconWhatsapp } from './StorefrontIcons';

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
          justify-content: center;
          width: 52px;
          height: 52px;
          padding: 0;
          box-sizing: border-box;
          background: #25D366;
          color: #ffffff;
          border-radius: 50% !important;
          text-decoration: none;
          box-shadow: 0 10px 25px -3px rgba(37, 211, 102, 0.45), 0 4px 10px -2px rgba(15, 23, 42, 0.12);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background 0.15s ease;
          font-family: inherit;
          user-select: none;
        }
        .sf-floating-whatsapp:hover {
          background: #22c55e;
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 14px 32px -3px rgba(37, 211, 102, 0.55), 0 6px 14px -2px rgba(15, 23, 42, 0.15);
        }
        .sf-floating-whatsapp:active {
          transform: translateY(0) scale(0.96);
        }
        @media (max-width: 640px) {
          .sf-floating-whatsapp {
            bottom: ${hasFloatingCart ? '134px' : '68px'} !important;
            left: 14px !important;
            right: auto !important;
            width: 44px !important;
            height: 44px !important;
            border-radius: 50% !important;
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
        <IconWhatsapp size={26} color="#ffffff" />
      </a>
    </>
  );
}
