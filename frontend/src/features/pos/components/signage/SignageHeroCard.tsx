import React from 'react';
import { SignagePromoItem } from './types';
import { FlameIcon, TagIcon, AwardIcon, TruckIcon, PackageIcon } from '@/shared/components/icons/AppIcons';

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
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 900,
                padding: '6px 16px',
                borderRadius: '30px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FlameIcon size={14} color="#ffffff" />
              <span>{activeItem.badge}</span>
            </span>

            <span
              style={{
                backgroundColor: '#f1f5f9',
                color: '#170e5e',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 800,
                padding: '6px 14px',
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
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  fontSize: '16px',
                  fontWeight: 900,
                  padding: '5px 14px',
                  borderRadius: '12px',
                }}
              >
                خصم {activeItem.discountPercent}%
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
              {currentIndex + 1} من {totalItems}
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
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
              border: '1px solid #cbd5e1',
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
                كود الصنف: {activeItem.barcode}
              </div>
            )}

            {/* Highlights / Perks Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AwardIcon size={12} color="#1d4ed8" />
                <span>منتج أصلي ومضمون 100%</span>
              </span>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #bbf7d0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <TruckIcon size={12} color="#166534" />
                <span>تسليم فوري من صالة العرض</span>
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
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>السعر السابق</span>
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
              color: '#166534',
              backgroundColor: '#dcfce7',
              border: '1px solid #bbf7d0',
              padding: '3px 12px',
              borderRadius: '20px',
            }}
          >
            وفر {activeItem.savingAmount.toFixed(2)} {currencyCode}
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
            <span>متوفر بصالة العرض</span>
          </span>
        </div>
      </div>
    </div>
  );
};
