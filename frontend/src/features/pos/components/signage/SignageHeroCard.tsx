import { useTranslation } from 'react-i18next';
import React from 'react';
import { SignagePromoItem } from './types';
import { TagIcon, AwardIcon, TruckIcon, PackageIcon } from '@/shared/components/icons/AppIcons';

interface SignageHeroCardProps {
  activeItem: SignagePromoItem;
  currentIndex: number;
  totalItems: number;
  currencyCode: string;
}

export const SignageHeroCard: React.FC<SignageHeroCardProps> = ({
  activeItem,
  currentIndex,
  totalItems,
  currencyCode,
}) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 8px 28px -4px rgba(15, 23, 42, 0.06), 0 0 1px 1px rgba(15, 23, 42, 0.02)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Badges & Indicator */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                padding: '5px 14px',
                borderRadius: '20px',
                boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <TagIcon size={14} color="#ffffff" />
              <span>{activeItem.badge}</span>
            </span>

            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontSize: '13px',
                fontWeight: 700,
                padding: '5px 14px',
                borderRadius: '20px',
              }}
            >
              {activeItem.categoryName}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeItem.discountPercent > 0 && (
              <div
                style={{
                  backgroundColor: '#eef2ff',
                  color: '#170e5e',
                  border: '1px solid #c7d2fe',
                  fontSize: '15px',
                  fontWeight: 900,
                  padding: '5px 14px',
                  borderRadius: '12px',
                }}
              >
                {t('pos.signage.signage_hero_card.s0', "خصم")} {activeItem.discountPercent}%
              </div>
            )}

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '4px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 800,
              }}
            >
              {currentIndex + 1} {t('pos.signage.signage_hero_card.s1', "من")} {totalItems}
            </div>
          </div>
        </div>

        {/* Showcase Deck (Centered Product Presentation) */}
        <div
          style={{
            marginTop: '20px',
            marginBottom: '20px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '18px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.05)',
            }}
          >
            <TagIcon size={56} color="#170e5e" strokeWidth={1.75} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 900,
                lineHeight: 1.3,
                color: '#0f172a',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeItem.name}
            </h2>

            {activeItem.barcode && (
              <div
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  marginTop: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                }}
              >
                {t('pos.signage.signage_hero_card.s2', "كود الصنف:")} {activeItem.barcode}
              </div>
            )}

            {/* Highlights / Perks Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AwardIcon size={12} color="#170e5e" />
                <span>{t('pos.signage.signage_hero_card.s3', "منتج أصلي ومضمون 100%")}</span>
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <TruckIcon size={12} color="#170e5e" />
                <span>{t('pos.signage.signage_hero_card.s4', "تسليم فوري من صالة العرض")}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Price Mega Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '2px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>{t('pos.signage.signage_hero_card.s5', "السعر السابق")}</span>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#94a3b8',
              textDecoration: 'line-through',
              marginTop: '2px',
            }}
          >
            {activeItem.originalPrice.toFixed(2)} {currencyCode}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              color: '#170e5e',
              backgroundColor: '#eef2ff',
              border: '1px solid #c7d2fe',
              padding: '4px 14px',
              borderRadius: '20px',
            }}
          >
            {t('pos.signage.signage_hero_card.s6', "وفر")} {activeItem.savingAmount.toFixed(2)} {currencyCode}
          </span>
          <div
            style={{
              fontSize: '46px',
              fontWeight: 900,
              color: '#170e5e',
              letterSpacing: '-1px',
              marginTop: '2px',
            }}
          >
            {activeItem.promoPrice.toFixed(2)}{' '}
            <span style={{ fontSize: '20px', fontWeight: 800 }}>{currencyCode}</span>
          </div>
        </div>

        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 800,
              padding: '12px 20px',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.25)',
            }}
          >
            <PackageIcon size={16} color="#ffffff" />
            <span>{t('pos.signage.signage_hero_card.s7', "متوفر بصالة العرض")}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
