import React from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingIcon, CreditCardIcon, PhoneIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { IconWhatsapp } from './StorefrontIcons';

interface StorefrontFeaturedBroadcastCardProps {
  whatsappPhone?: string;
  onOpenCategories?: () => void;
}

export const StorefrontFeaturedBroadcastCard = React.memo(function StorefrontFeaturedBroadcastCard({
  whatsappPhone,
  onOpenCategories,
}: StorefrontFeaturedBroadcastCardProps) {
  const { t } = useTranslation();

  const cleanPhone = (whatsappPhone || '').replace(/[^0-9]/g, '');
  const b2bWhatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن عروض وتوريدات الجملة للشركات B2B')}`
    : undefined;

  return (
    <div
      className="storefront-featured-broadcast-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        margin: '28px 0',
      }}
    >
      {/* Card 1: B2B & Wholesale */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--storefront-primary-hover, #120b4c) 0%, var(--storefront-primary-color, #170e5e) 100%)',
          borderRadius: '24px',
          padding: '22px 24px',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: '0 4px 14px var(--storefront-primary-subtle, rgba(23, 14, 94, 0.12))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            left: '-20px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.2)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BuildingIcon size={20} color="#38bdf8" strokeWidth={2} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.15)',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {t('storefront.broadcast.b2b_tag', 'طلبات الجملة والشركات')}
            </span>
          </div>

          <h4
            style={{
              margin: '0 0 6px',
              fontSize: '16px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.35,
            }}
          >
            {t('storefront.broadcast.b2b_title', 'خصومات خاصة لطلبات الجملة')}
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: '#cbd5e1',
              lineHeight: 1.45,
            }}
          >
            {t('storefront.broadcast.b2b_desc', 'أسعار خاصة للكميات الكبيرة والمحلات مع فواتير معتمدة وشحن سريع ومباشر.')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
          {b2bWhatsappUrl && (
            <a
              href={b2bWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#22c55e',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '0 14px',
                height: '35px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.25)',
                boxSizing: 'border-box',
              }}
            >
              <IconWhatsapp size={15} color="#ffffff" />
              <span>{t('storefront.broadcast.request_quote', 'تواصل لطلب الجملة')}</span>
            </a>
          )}
          {onOpenCategories && (
            <button
              type="button"
              onClick={onOpenCategories}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '0 14px',
                height: '35px',
                borderRadius: '12px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {t('storefront.broadcast.browse_catalog', 'تصفح الأقسام')}
            </button>
          )}
        </div>
      </div>

      {/* Card 2: Flexible & Secure Payment */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCardIcon size={20} color="#16a34a" strokeWidth={2} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#16a34a',
                background: '#f0fdf4',
                padding: '2px 8px',
                borderRadius: '6px',
              }}
            >
              {t('storefront.broadcast.payment_tag', 'دفع آمن ومريح')}
            </span>
          </div>

          <h4
            style={{
              margin: '0 0 6px',
              fontSize: '16px',
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.35,
            }}
          >
            {t('storefront.broadcast.payment_title', 'طرق دفع متعددة ومعاينة عند الاستلام')}
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: '#64748b',
              lineHeight: 1.45,
            }}
          >
            {t('storefront.broadcast.payment_desc', 'ادفع نقداً عند الاستلام بعد معاينة طلبك، أو سدد إلكترونياً بأمان عبر البطاقات البنكية والمحافظ الرقمية.')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
            <CheckCircleIcon size={14} color="#16a34a" />
            <span>{t('storefront.broadcast.cod', 'الدفع عند الاستلام')}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
            <CheckCircleIcon size={14} color="#16a34a" />
            <span>{t('storefront.broadcast.cards', 'بطاقات بنكية ودفع إلكتروني')}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
            <CheckCircleIcon size={14} color="#16a34a" />
            <span>{t('storefront.broadcast.instant_inspection', 'معاينة قبل الاستلام')}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
