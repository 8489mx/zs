import React from 'react';
import type { StorefrontInfo } from '../types/storefront.types';

interface StorefrontTrustBarProps {
  info?: StorefrontInfo;
}

export const StorefrontTrustBar = React.memo(function StorefrontTrustBar(_props: StorefrontTrustBarProps) {
  const trustFeatures = [
    {
      id: 'shipping',
      num: '01',
      title: 'شحن سريع وآمن',
      subtitle: 'توصيل لكافة المحافظات بعناية',
      colorSolid: '#f5b316',
      colorMid: '#fbe29d',
      iconColor: '#d97706',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="1.5" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
    },
    {
      id: 'cod',
      num: '02',
      title: 'الدفع عند الاستلام',
      subtitle: 'عاين طلبك قبل الدفع',
      colorSolid: '#68bd49',
      colorMid: '#bfeab0',
      iconColor: '#15803d',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <circle cx="12" cy="12" r="3" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      ),
    },
    {
      id: 'quality',
      num: '03',
      title: 'جودة أصلية 100%',
      subtitle: 'ضمان على جميع المنتجات',
      colorSolid: '#67c7d0',
      colorMid: '#c4eef2',
      iconColor: '#0e7490',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      id: 'returns',
      num: '04',
      title: 'استبدال واسترجاع مرن',
      subtitle: 'خلال 14 يوم بكل سهولة',
      colorSolid: '#3988c8',
      colorMid: '#b3d7f4',
      iconColor: '#1d4ed8',
      icon: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <polyline points="23 20 23 14 17 14" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-label="مميزات وثقة المتجر"
      className="storefront-trust-bar-wrapper"
      dir="rtl"
      style={{
        maxWidth: 'var(--storefront-container, 1440px)',
        width: '100%',
        margin: '26px auto 16px',
        padding: '0 8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="storefront-trust-bar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
      >
        {trustFeatures.map((item) => (
          <div
            key={item.id}
            style={{
              filter: 'drop-shadow(2px 5px 6px rgba(15, 23, 42, 0.08))',
              transition: 'transform 0.2s ease, filter 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.filter = 'drop-shadow(3px 7px 9px rgba(15, 23, 42, 0.12))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.filter = 'drop-shadow(2px 5px 6px rgba(15, 23, 42, 0.08))';
            }}
          >
            {/* Outer Sleek U-Ribbon with Concentric 32px Radius & Smooth Left Fade */}
            <div
              style={{
                height: '64px',
                borderRadius: '0 32px 32px 0',
                padding: '6px 6px 6px 0',
                background: `linear-gradient(270deg, ${item.colorSolid} 0%, ${item.colorMid} 58%, rgba(255, 255, 255, 0) 100%)`,
                WebkitMaskImage: 'linear-gradient(270deg, #000000 0%, #000000 74%, transparent 100%)',
                maskImage: 'linear-gradient(270deg, #000000 0%, #000000 74%, transparent 100%)',
                boxSizing: 'border-box',
                cursor: 'default',
              }}
            >
              {/* Inner White Plate with Concentric 26px Radius (32px - 6px = 26px) */}
              <div
                style={{
                  height: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0 14px 0 12px',
                  borderRadius: '0 26px 26px 0',
                  background: '#ffffff',
                  boxShadow: 'inset -2px 2px 5px rgba(15, 23, 42, 0.06)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Icon & Number inside the perfectly curved right cap */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.iconColor,
                    flexShrink: 0,
                    minWidth: '34px',
                    paddingLeft: '8px',
                    borderLeft: '1px solid #f1f5f9',
                  }}
                >
                  {item.icon}
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: '#64748b',
                      lineHeight: 1,
                      marginTop: '2px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.num}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div style={{ minWidth: 0, flex: 1, textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: 1.3,
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
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.subtitle}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 1080px) {
          .storefront-trust-bar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 14px !important;
          }
        }
        @media (max-width: 600px) {
          .storefront-trust-bar-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </section>
  );
});
