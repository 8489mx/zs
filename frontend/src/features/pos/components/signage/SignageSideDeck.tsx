import React from 'react';
import { SignagePromoItem } from './types';
import { FlameIcon, TagIcon, AwardIcon, QrCodeIcon } from '@/shared/components/icons/AppIcons';

interface SignageSideDeckProps {
  promoItems: SignagePromoItem[];
  currentIndex: number;
  onSelectItem: (index: number) => void;
  currencyCode: string;
  qrSvgUrl: string;
}

export const SignageSideDeck: React.FC<SignageSideDeckProps> = ({
  promoItems,
  currentIndex,
  onSelectItem,
  currencyCode,
  qrSvgUrl,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        justifyContent: 'space-between',
      }}
    >
      {/* Upcoming Deals Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FlameIcon size={18} color="#ea580c" />
          <span>عروض إضافية بالمعرض</span>
          <span style={{ fontSize: '12px', color: '#64748b' }}>({promoItems.length} عرض متوفر)</span>
        </div>

        {promoItems
          .filter((_, idx) => idx !== currentIndex)
          .slice(0, 2)
          .map((item) => (
            <div
              key={item.id}
              onClick={() => {
                const foundIdx = promoItems.findIndex((p) => p.id === item.id);
                if (foundIdx !== -1) onSelectItem(foundIdx);
              }}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <TagIcon size={18} color="#170e5e" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {item.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{item.categoryName}</span>
                </div>
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>
                  {item.originalPrice.toFixed(2)} {currencyCode}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>
                  {item.promoPrice.toFixed(2)} {currencyCode}
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Showroom Perks Box */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#170e5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AwardIcon size={16} color="#170e5e" />
          <span>مزايا التسوق في صالة العرض</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>فحص وتجربة فورية</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>معاينة المنتج قبل الشراء</div>
          </div>
          <div style={{ backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>دفع إلكتروني آمن</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>InstaPay ومحافظ وفيزا</div>
          </div>
        </div>
      </div>

      {/* Storefront QR Code Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '4px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid #e2e8f0',
          }}
        >
          <img
            src={qrSvgUrl}
            alt="Storefront QR Code"
            style={{ width: '80px', height: '80px', display: 'block' }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 900,
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <QrCodeIcon size={16} color="#170e5e" />
            <span>اطلب فورياً من هاتفك</span>
          </div>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '11px',
              color: '#64748b',
              lineHeight: 1.5,
            }}
          >
            وجّه كاميرا هاتفك نحو رمز الـ QR لتصفح كامل الكتالوج والطلب والتوصيل بضغطة واحدة!
          </p>
        </div>
      </div>
    </div>
  );
};
