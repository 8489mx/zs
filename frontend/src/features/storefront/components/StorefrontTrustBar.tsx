import React from 'react';
import type { StorefrontInfo } from '../types/storefront.types';

interface StorefrontTrustBarProps {
  info?: StorefrontInfo;
}

export const StorefrontTrustBar = React.memo(function StorefrontTrustBar(_props: StorefrontTrustBarProps) {
  const trustFeatures = [
    {
      id: 'shipping',
      title: 'شحن سريع وآمن',
      subtitle: 'توصيل سريع لكافة المحافظات بعناية فائقة حتى باب المنزل',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </svg>
      ),
    },
    {
      id: 'cod',
      title: 'الدفع عند الاستلام',
      subtitle: 'إمكانية معاينة وفحص طلبك بالكامل قبل الدفع بكل اطمئنان',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      ),
    },
    {
      id: 'quality',
      title: 'جودة أصلية 100%',
      subtitle: 'نختار لكم أجود المنتجات الأصلية بعناية لتجربة فاخرة ومميزة',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'returns',
      title: 'استبدال واسترجاع مرن',
      subtitle: 'سياسة استبدال واسترجاع سهلة ومرنة خلال 14 يوماً بكل سهولة',
      icon: (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
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
        margin: '28px auto 0',
        padding: '0',
        boxSizing: 'border-box',
      }}
    >
      <div className="storefront-trust-banner">
        <div className="storefront-trust-bar-grid">
          {trustFeatures.map((item) => (
            <div key={item.id} className="storefront-trust-feature-item">
              <div className="storefront-trust-icon-wrap" aria-hidden="true">
                {item.icon}
              </div>

              <div className="storefront-trust-text-col">
                <h3 className="storefront-trust-title">{item.title}</h3>
                <p className="storefront-trust-subtitle">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .storefront-trust-banner {
          width: 100%;
          border-radius: 16px;
          background: linear-gradient(
            135deg,
            var(--storefront-secondary-color, #2353a0) 0%,
            var(--storefront-primary-color, #2d68c4) 50%,
            var(--storefront-secondary-color, #2353a0) 100%
          );
          padding: 32px 36px;
          box-sizing: border-box;
          box-shadow: 0 10px 28px -8px rgba(35, 83, 160, 0.28), 0 4px 12px -2px rgba(15, 23, 42, 0.08);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .storefront-trust-bar-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          align-items: center;
          justify-items: center;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
        }

        .storefront-trust-feature-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: #ffffff;
          position: relative;
          width: fit-content;
          margin: 0 auto;
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .storefront-trust-feature-item:hover {
          transform: translateY(-2px);
        }

        .storefront-trust-feature-item:hover .storefront-trust-icon-wrap {
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.85);
          transform: scale(1.04);
        }

        .storefront-trust-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1.5px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .storefront-trust-text-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 0;
          max-width: 210px;
        }

        .storefront-trust-title {
          margin: 0 0 5px;
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.35;
          letter-spacing: -0.1px;
          white-space: nowrap;
        }

        .storefront-trust-subtitle {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.86);
          line-height: 1.55;
        }

        @media (max-width: 1120px) {
          .storefront-trust-banner {
            padding: 26px 22px;
          }
          .storefront-trust-bar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 22px 18px;
          }
          .storefront-trust-text-col {
            max-width: 230px;
          }
        }

        @media (max-width: 640px) {
          .storefront-trust-bar-wrapper {
            margin: 14px auto 0 !important;
            padding: 0 12px !important;
            box-sizing: border-box !important;
          }
          .storefront-trust-banner {
            border-radius: 16px !important;
            padding: 14px 12px !important;
          }
          .storefront-trust-bar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .storefront-trust-feature-item {
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            text-align: center !important;
            width: 100% !important;
            min-width: 0 !important;
            gap: 8px !important;
            padding: 12px 8px !important;
            background: rgba(255, 255, 255, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.16) !important;
            border-radius: 12px !important;
            box-sizing: border-box !important;
          }
          .storefront-trust-text-col {
            width: 100% !important;
            max-width: 100% !important;
          }
          .storefront-trust-icon-wrap {
            width: 36px !important;
            height: 36px !important;
            border-radius: 10px !important;
            border-width: 1.25px !important;
          }
          .storefront-trust-icon-wrap svg {
            width: 18px !important;
            height: 18px !important;
          }
          .storefront-trust-title {
            font-size: 12.5px !important;
            font-weight: 700 !important;
            white-space: normal !important;
            margin-bottom: 3px !important;
            line-height: 1.3 !important;
          }
          .storefront-trust-subtitle {
            font-size: 10.5px !important;
            line-height: 1.42 !important;
          }
        }
      `}</style>
    </section>
  );
});

