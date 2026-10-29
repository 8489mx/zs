import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheckIcon, TruckIcon, CreditCardIcon } from '@/shared/components/icons/AppIcons';
import { IconWhatsapp } from './StorefrontIcons';
import type { StorefrontInfo } from '../types/storefront.types';

interface StorefrontTrustBarProps {
  info: StorefrontInfo;
}

export const StorefrontTrustBar = React.memo(function StorefrontTrustBar({ info }: StorefrontTrustBarProps) {
  const { t } = useTranslation();

  const freeShippingText = info.freeShippingEnabled && info.freeShippingMinOrder
    ? t('storefront.trust_bar.free_shipping_min', 'شحن مجاني للطلبات فوق {{amount}} {{curr}}', {
        amount: info.freeShippingMinOrder,
        curr: info.currency || 'ج.م',
      })
    : 'توصيل سريع وآمن';

  const trustItems = [
    {
      id: 'shipping',
      icon: TruckIcon,
      accentColor: '#1e293b',
      bgLight: '#f1f5f9',
      title: freeShippingText,
      subtitle: t('storefront.trust_bar.shipping_sub', 'شحن مباشر مع متابعة دقيقة لحالة الطلب'),
    },
    {
      id: 'sync',
      icon: ShieldCheckIcon,
      accentColor: '#1e293b',
      bgLight: '#f1f5f9',
      title: 'جودة مضمونة 100%',
      subtitle: t('storefront.trust_bar.sync_sub', 'عناية فائقة بجودة وتغليف كافة الأصناف المعروضة'),
    },
    {
      id: 'payment',
      icon: CreditCardIcon,
      accentColor: '#1e293b',
      bgLight: '#f1f5f9',
      title: 'دفع آمن ومارن',
      subtitle: 'الدفع عند الاستلام أو بالبطاقات والمحافظ الرقمية',
    },
    {
      id: 'support',
      icon: IconWhatsapp,
      accentColor: '#25D366',
      bgLight: '#f0fdf4',
      title: 'خدمة عملاء مباشرة',
      subtitle: 'دعم واستفسارات فورية عبر محادثة واتساب',
    },
  ];

  return (
    <section
      aria-label="مؤشرات الثقة والضمان"
      className="storefront-trust-bar-wrapper"
      style={{
        maxWidth: 'var(--storefront-container, 1440px)',
        width: '100%',
        margin: '16px auto 8px',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="storefront-trust-bar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}
      >
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '16px 20px',
                background: '#ffffff',
                border: '1px solid #edf1f7',
                borderRadius: '24px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}
            >
              <div style={{ minWidth: 0, flex: 1, textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.35,
                    marginBottom: '3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#64748b',
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.subtitle}
                </div>
              </div>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: item.bgLight,
                  color: item.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid #e2e8f0',
                }}
              >
                <Icon size={18} color={item.accentColor} strokeWidth={2} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

