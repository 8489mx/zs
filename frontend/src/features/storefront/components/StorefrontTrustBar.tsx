import React from 'react';
import { useTranslation } from 'react-i18next';
import { UsersIcon, ShieldCheckIcon, TruckIcon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';
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
    : t('storefront.trust_bar.fast_delivery', 'شحن وتوصيل سريع ومباشر لبابك');

  const trustItems = [
    {
      id: 'clients',
      icon: UsersIcon,
      accentColor: '#4338ca',
      bgLight: '#eef2ff',
      title: '+1,420 متجر وعميل',
      subtitle: t('storefront.trust_bar.clients_sub', 'يعتمدون على منتجاتنا في مصر والشرق الأوسط'),
    },
    {
      id: 'warranty',
      icon: ShieldCheckIcon,
      accentColor: '#16a34a',
      bgLight: '#f0fdf4',
      title: 'ضمان استبدال معتمد',
      subtitle: t('storefront.trust_bar.warranty_sub', 'ضمان رسمي شامل مع دعم فني مستمر'),
    },
    {
      id: 'shipping',
      icon: TruckIcon,
      accentColor: '#0284c7',
      bgLight: '#f0f9ff',
      title: freeShippingText,
      subtitle: t('storefront.trust_bar.shipping_sub', 'تجهيز وشحن فوري خلال 24 - 48 ساعة'),
    },
    {
      id: 'sync',
      icon: RefreshCwIcon,
      accentColor: '#7c3aed',
      bgLight: '#f5f3ff',
      title: '100% متزامن وأصلي',
      subtitle: t('storefront.trust_bar.sync_sub', 'ربط لحظي للأسعار والمخزون مع الفرع الرئيسي'),
    },
  ];

  return (
    <section
      aria-label="مؤشرات الثقة والضمان"
      className="storefront-trust-bar-wrapper"
      style={{
        maxWidth: 'var(--storefront-container, 1440px)',
        width: '100%',
        margin: '12px auto 6px',
        padding: '0 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="storefront-trust-bar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '14px 18px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
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
                gap: '12px',
                padding: '6px 8px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: item.bgLight,
                  color: item.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Icon size={22} color={item.accentColor} strokeWidth={2.2} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.35,
                    marginBottom: '2px',
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
            </div>
          );
        })}
      </div>
    </section>
  );
});
