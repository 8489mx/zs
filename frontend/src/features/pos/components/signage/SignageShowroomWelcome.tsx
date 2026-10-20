import React from 'react';
import { useTranslation } from 'react-i18next';
import { SignageTheme } from './types';
import {
  AwardIcon,
  ShieldCheckIcon,
  TruckIcon,
  CreditCardIcon,
  QrCodeIcon,
  ShoppingCartIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';

interface SignageShowroomWelcomeProps {
  storeName: string;
  qrSvgUrl: string;
  theme: SignageTheme;
  hasFilterOffers?: boolean;
  onSwitchToAllProducts?: () => void;
}

export const SignageShowroomWelcome: React.FC<SignageShowroomWelcomeProps> = ({
  storeName,
  qrSvgUrl,
  theme,
  hasFilterOffers,
  onSwitchToAllProducts,
}) => {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        borderRadius: '24px',
        padding: '36px 44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        background: isDark
          ? 'linear-gradient(145deg, #0f172a 0%, #0b1120 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        boxShadow: isDark
          ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 20px 40px -15px rgba(15, 23, 42, 0.07)',
      }}
    >
      {/* Background Ambient Glow for Dark Mode */}
      {isDark && (
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Top Banner / Store Hero */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: isDark
                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                : 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDark
                ? '0 8px 24px rgba(37, 99, 235, 0.35)'
                : '0 8px 24px rgba(23, 14, 94, 0.25)',
              flexShrink: 0,
            }}
          >
            <ShoppingCartIcon size={32} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '3px 12px',
                  borderRadius: '20px',
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#eef2ff',
                  color: isDark ? '#38bdf8' : '#170e5e',
                  border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #c7d2fe',
                }}
              >
                {t('pos.signage.welcome.badge', 'صالة العرض التفاعلية الذكية')}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontWeight: 600,
                }}
              >
                {t('pos.signage.welcome.live_status', 'مرحباً بكم')}
              </span>
            </div>

            <h1
              style={{
                margin: '6px 0 0',
                fontSize: '34px',
                fontWeight: 900,
                color: isDark ? '#ffffff' : '#0f172a',
                letterSpacing: '-0.5px',
              }}
            >
              {storeName}
            </h1>
          </div>
        </div>

        <p
          style={{
            margin: '16px 0 0',
            fontSize: '15px',
            lineHeight: 1.6,
            color: isDark ? '#cbd5e1' : '#475569',
            maxWidth: '650px',
          }}
        >
          {t(
            'pos.signage.welcome.desc',
            'وجهتكم الأولى لأفضل المنتجات والصفقات الحصرية بأسعار تنافسية وضمان معتمد. تسوق مباشرة من الصالة أو اطلب عبر هاتفك فوراً.'
          )}
        </p>
      </div>

      {/* Middle Stage: Showroom Perks Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '14px',
          margin: '20px 0',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AwardIcon size={22} color={isDark ? '#38bdf8' : '#0284c7'} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            >
              {t('pos.signage.welcome.perk1_title', 'فحص وتجربة فورية')}
            </h4>
            <span
              style={{
                fontSize: '12px',
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'block',
                marginTop: '2px',
              }}
            >
              {t('pos.signage.welcome.perk1_desc', 'معاينة وفحص كافة المنتجات قبل إتمام الشراء')}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CreditCardIcon size={22} color={isDark ? '#34d399' : '#16a34a'} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            >
              {t('pos.signage.welcome.perk2_title', 'دفع إلكتروني آمن')}
            </h4>
            <span
              style={{
                fontSize: '12px',
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'block',
                marginTop: '2px',
              }}
            >
              {t('pos.signage.welcome.perk2_desc', 'دعم بطاقات فيزا، ماستركارد، InstaPay، والمحافظ الذكية')}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <TruckIcon size={22} color={isDark ? '#fbbf24' : '#d97706'} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            >
              {t('pos.signage.welcome.perk3_title', 'تسليم واستلام فوري')}
            </h4>
            <span
              style={{
                fontSize: '12px',
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'block',
                marginTop: '2px',
              }}
            >
              {t('pos.signage.welcome.perk3_desc', 'استلام مشترياتك مباشرة من صالة العرض أو توصيل سريع')}
            </span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheckIcon size={22} color={isDark ? '#818cf8' : '#4f46e5'} />
          </div>
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
              }}
            >
              {t('pos.signage.welcome.perk4_title', 'ضمان معتمد وفواتير رسمية')}
            </h4>
            <span
              style={{
                fontSize: '12px',
                color: isDark ? '#94a3b8' : '#64748b',
                display: 'block',
                marginTop: '2px',
              }}
            >
              {t('pos.signage.welcome.perk4_desc', 'كافة المبيعات موثقة بفواتير إلكترونية معتمدة')}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Action & QR Hub */}
      <div
        style={{
          backgroundColor: isDark ? 'rgba(11, 15, 25, 0.8)' : '#f1f5f9',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #cbd5e1',
          borderRadius: '20px',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '6px',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              flexShrink: 0,
            }}
          >
            <img
              src={qrSvgUrl}
              alt="Store QR Code"
              style={{ width: '84px', height: '84px', display: 'block' }}
            />
          </div>

          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 900,
                color: isDark ? '#ffffff' : '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <QrCodeIcon size={18} color={isDark ? '#38bdf8' : '#170e5e'} />
              <span>{t('pos.signage.welcome.qr_title', 'تصفح واطلب فورياً من هاتفك')}</span>
            </div>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '12px',
                color: isDark ? '#94a3b8' : '#64748b',
                lineHeight: 1.5,
                maxWidth: '440px',
              }}
            >
              {t(
                'pos.signage.welcome.qr_desc',
                'وجّه كاميرا هاتفك نحو رمز الـ QR لتصفح كامل أقسام ومنتجات الصالة مع الأسعار المحدثة والتوصيل الفوري.'
              )}
            </p>
          </div>
        </div>

        {hasFilterOffers && onSwitchToAllProducts && (
          <button
            type="button"
            onClick={onSwitchToAllProducts}
            style={{
              padding: '12px 22px',
              borderRadius: '12px',
              backgroundColor: isDark ? '#2563eb' : '#170e5e',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isDark
                ? '0 4px 16px rgba(37, 99, 235, 0.4)'
                : '0 4px 16px rgba(23, 14, 94, 0.25)',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <RefreshCwIcon size={16} color="#ffffff" />
            <span>{t('pos.signage.welcome.show_all_products', 'عرض كافة منتجات الصالة')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
