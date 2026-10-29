import React, { useRef } from 'react';
import type { StorefrontProduct, StorefrontCategory } from '../types/storefront.types';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import {
  LAPTOP_PHOTO,
  PERFUME_PHOTO,
  SMARTWATCH_PHOTO,
  HEADPHONES_PHOTO,
  SNEAKER_2_PHOTO,
  WATCH_CLASSIC_PHOTO,
} from '../lib/product-photos-registry';

interface StorefrontAmazonVibrantSectionProps {
  products: StorefrontProduct[];
  categories: StorefrontCategory[];
  onSelectDeals: () => void;
  onSelectCategory: (categoryId: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
}

const QUICK_TILE_ITEMS = [
  { label: 'الأكثر مبيعاً', badge: 'اختيار مميز', badgeBg: '#f1f5f9', badgeColor: '#334155' },
  { label: 'ترشيحاتنا لك', badge: 'اختيار المتجر', badgeBg: '#eff6ff', badgeColor: '#2d68c4' },
  { label: 'عرض خاص لك', badge: 'عرض لمدة محدودة', badgeBg: '#cc0c39', badgeColor: '#ffffff' },
  { label: 'أفضل العروض', badge: 'خصم حصري', badgeBg: '#fef3c7', badgeColor: '#b45309' },
  { label: 'مختارات مميزة', badge: 'الأكثر طلباً', badgeBg: '#f1f5f9', badgeColor: '#334155' },
  { label: 'وصل حديثاً', badge: 'تشكيلة جديدة', badgeBg: '#ecfdf5', badgeColor: '#047857' },
  { label: 'عروض اليوم', badge: 'فرصة توفير', badgeBg: '#eff6ff', badgeColor: '#2d68c4' },
  { label: 'اختياراتنا لك', badge: 'موصى به', badgeBg: '#f1f5f9', badgeColor: '#334155' },
];

export const StorefrontAmazonVibrantSection = React.memo(function StorefrontAmazonVibrantSection({
  products,
  categories,
  onSelectDeals,
  onSelectCategory,
  onQuickView,
}: StorefrontAmazonVibrantSectionProps) {
  const quickRowRef = useRef<HTMLDivElement>(null);

  const quickProducts = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    const list: StorefrontProduct[] = [];
    for (let i = 0; i < Math.min(8, Math.max(6, products.length)); i++) {
      list.push(products[i % products.length]);
    }
    return list;
  }, [products]);

  const scrollQuickRow = (dir: 'left' | 'right') => {
    if (!quickRowRef.current) return;
    const offset = dir === 'left' ? -320 : 320;
    quickRowRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleCategoryOrDeals = (catIdx: number) => {
    if (categories && categories[catIdx]) {
      onSelectCategory(categories[catIdx].id);
    } else {
      onSelectDeals();
    }
  };

  return (
    <section
      dir="rtl"
      className="sf-amz-vibrant-section"
      style={{
        width: '100%',
        margin: '6px 0 12px',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .sf-amz-vibrant-grid {
          display: grid;
          grid-template-columns: 345px minmax(0, 1fr);
          gap: 14px;
          align-items: stretch;
          width: 100%;
        }
        .sf-amz-left-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }
        .sf-amz-promo-cards-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          position: relative;
        }
        .sf-amz-promo-card {
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          height: 342px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
          user-select: none;
          box-sizing: border-box;
        }
        .sf-amz-promo-card:hover {
          transform: translate3d(0, -4px, 0);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        }
        .sf-amz-hero-orange-card {
          border-radius: 18px;
          background: linear-gradient(180deg, #ff6200 0%, #f95700 60%, #ea4c00 100%);
          color: #ffffff;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          cursor: pointer;
          min-height: 542px;
          box-shadow: 0 6px 20px rgba(255, 98, 0, 0.22);
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s ease;
          user-select: none;
          box-sizing: border-box;
        }
        .sf-amz-hero-orange-card:hover {
          transform: translate3d(0, -4px, 0);
          box-shadow: 0 12px 28px rgba(255, 98, 0, 0.3);
        }
        .sf-amz-quick-tiles-wrapper {
          position: relative;
          width: 100%;
          min-width: 0;
        }
        .sf-amz-quick-tiles-row {
          display: grid;
          grid-template-columns: repeat(6, minmax(135px, 1fr));
          gap: 12px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: smooth;
          padding: 2px 0;
        }
        .sf-amz-quick-tiles-row::-webkit-scrollbar {
          display: none;
        }
        .sf-amz-quick-tile {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 14px 12px 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 186px;
          cursor: pointer;
          box-sizing: border-box;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: border-color 0.18s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease;
        }
        .sf-amz-quick-tile:hover {
          border-color: #cbd5e1;
          transform: translate3d(0, -3px, 0);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
        }
        .sf-amz-floating-nav-btn {
          position: absolute;
          left: 6px;
          top: 50%;
          transform: translate3d(0, -50%, 0);
          width: 34px;
          height: 34px;
          background: #ffffff !important;
          border: 1px solid #E0E3E7 !important;
          border-radius: 10px !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          color: #1f1f1f;
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sf-amz-floating-nav-btn:hover {
          background: #ffffff !important;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.18);
          transform: translate3d(0, -50%, 0) scale3d(1.06, 1.06, 1);
        }

        @media (max-width: 1200px) {
          .sf-amz-vibrant-grid {
            grid-template-columns: 300px minmax(0, 1fr);
          }
          .sf-amz-promo-cards-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sf-amz-quick-tiles-row {
            grid-template-columns: repeat(4, minmax(140px, 1fr));
          }
        }

        @media (max-width: 860px) {
          .sf-amz-vibrant-grid {
            grid-template-columns: 1fr;
          }
          .sf-amz-hero-orange-card {
            min-height: 390px;
          }
          .sf-amz-promo-cards-row {
            display: flex;
            overflow-x: auto;
            scrollbar-width: none;
            gap: 12px;
            padding-bottom: 4px;
          }
          .sf-amz-promo-cards-row::-webkit-scrollbar {
            display: none;
          }
          .sf-amz-promo-card {
            min-width: 220px;
            flex-shrink: 0;
          }
          .sf-amz-quick-tiles-row {
            display: flex;
            overflow-x: auto;
          }
          .sf-amz-quick-tile {
            min-width: 150px;
            flex-shrink: 0;
          }
        }
      `}</style>

      <div className="sf-amz-vibrant-grid">
        {/* RIGHT COLUMN: Tall Vibrant Orange Flagship Campaign Card */}
        <div className="sf-amz-hero-orange-card" onClick={onSelectDeals}>
          {/* Top Copy — Generous Arabic line-height & breathing room */}
          <div
            style={{
              padding: '26px 24px 0',
              textAlign: 'right',
              position: 'relative',
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                lineHeight: 1.5,
                color: 'rgba(255, 255, 255, 0.94)',
                letterSpacing: '0px',
              }}
            >
              عروض الموسم الكبرى
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '26px',
                fontWeight: 800,
                lineHeight: 1.5,
                color: '#ffffff',
                letterSpacing: '0px',
              }}
            >
              تخفيضات اليوم قربت!
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginTop: '6px',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 700,
                lineHeight: 1.4,
                padding: '7px 14px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.22)',
              }}
            >
              وفر أكثر مع عروضنا
            </span>
          </div>

          {/* Bottom 3D Fluted Arch Showcase Stage */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '315px',
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Glowing Arch Frame */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                width: '84%',
                height: '278px',
                borderRadius: '999px 999px 0 0',
                border: '4px solid #ffd4b8',
                borderBottom: 'none',
                background:
                  'repeating-linear-gradient(90deg, #d94300 0px, #ef4f00 10px, #c83b00 20px)',
                boxShadow: 'inset 0 12px 28px rgba(0, 0, 0, 0.22), 0 0 24px rgba(255, 212, 184, 0.35)',
                zIndex: 1,
              }}
            />

            {/* Pedestals & Curated Products Composition */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: '90%',
                height: '250px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '8px',
                paddingBottom: '12px',
              }}
            >
              {/* Right Podium + Product */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate3d(0, 6px, 0)' }}>
                <img
                  src={PERFUME_PHOTO}
                  alt="عرض مميز"
                  decoding="async"
                  style={{ width: '82px', height: '82px', objectFit: 'contain', transform: 'translate3d(0, 0, 0)' }}
                />
                <div
                  style={{
                    width: '72px',
                    height: '60px',
                    borderRadius: '10px 10px 4px 4px',
                    background: 'linear-gradient(180deg, #ff7a1a 0%, #cc3d00 100%)',
                    boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
                  }}
                />
              </div>

              {/* Center Tall Podium + Featured Product */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                <img
                  src={SMARTWATCH_PHOTO}
                  alt="عرض مميز"
                  decoding="async"
                  style={{ width: '104px', height: '104px', objectFit: 'contain', transform: 'translate3d(0, 0, 0)' }}
                />
                <div
                  style={{
                    width: '90px',
                    height: '88px',
                    borderRadius: '12px 12px 4px 4px',
                    background: 'linear-gradient(180deg, #ff852b 0%, #d44200 100%)',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.26)',
                  }}
                />
              </div>

              {/* Left Podium + Product */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate3d(0, 10px, 0)' }}>
                <img
                  src={HEADPHONES_PHOTO}
                  alt="عرض مميز"
                  decoding="async"
                  style={{ width: '84px', height: '84px', objectFit: 'contain', transform: 'translate3d(0, 0, 0)' }}
                />
                <div
                  style={{
                    width: '72px',
                    height: '50px',
                    borderRadius: '10px 10px 4px 4px',
                    background: 'linear-gradient(180deg, #ff7a1a 0%, #cc3d00 100%)',
                    boxShadow: '0 6px 14px rgba(0,0,0,0.22)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: 4 Vibrant Promo Cards (Top) + 6 Quick Product Tiles (Bottom) */}
        <div className="sf-amz-left-stack">
          {/* TOP ROW: 4 Vibrant Campaign Cards */}
          <div className="sf-amz-promo-cards-row">
            {/* Card 1: Soft Calm Azure Blue — Fast Delivery */}
            <div
              className="sf-amz-promo-card"
              onClick={() => handleCategoryOrDeals(0)}
              style={{
                background: 'linear-gradient(180deg, #2d68c4 0%, #3470ce 60%, #3d7add 100%)',
                color: '#ffffff',
                padding: '22px 18px 14px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '19px',
                    fontWeight: 800,
                    lineHeight: 1.52,
                    letterSpacing: '0px',
                    color: '#ffffff',
                  }}
                >
                  أوردرك يوصلك النهارده!
                </h3>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: 'rgba(255, 255, 255, 0.92)',
                  }}
                >
                  توصيل سريع لباب البيت*
                </div>
              </div>

              {/* Real Transparent PNG Product Showcase */}
              <div
                style={{
                  width: '100%',
                  height: '175px',
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  borderRadius: '14px',
                  background: 'radial-gradient(circle at 50% 55%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 70%)',
                }}
              >
                <img
                  src={LAPTOP_PHOTO}
                  alt="توصيل سريع"
                  decoding="async"
                  style={{
                    width: '158px',
                    height: '158px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 0, 0)',
                  }}
                />
              </div>
            </div>

            {/* Card 2: Vibrant Sunny Yellow — Super Saver Coupon */}
            <div
              className="sf-amz-promo-card"
              onClick={onSelectDeals}
              style={{
                background: 'linear-gradient(168deg, #ffd814 0%, #ffce00 68%, #2d68c4 68.5%, #2353a0 100%)',
                color: '#0f172a',
                padding: '20px 16px 14px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    lineHeight: 1.45,
                    color: '#1e293b',
                  }}
                >
                  اطلب أونلاين ووفر
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18.5px',
                    fontWeight: 800,
                    lineHeight: 1.5,
                    letterSpacing: '0px',
                    color: '#0f172a',
                  }}
                >
                  خصم 10% مع الكوبون*
                </h3>

                {/* Dark Navy Ribbon Badge — Clean single-line pill */}
                <div
                  style={{
                    marginTop: '4px',
                    background: '#131921',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.14)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.4 }}>
                    أسبوع السوبر{' '}
                    <span style={{ color: '#ffd814', fontWeight: 800 }}>توفير</span>
                  </span>
                </div>
              </div>

              {/* Curated Bundle Box at Bottom */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  marginTop: 'auto',
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.14)',
                }}
              >
                {[PERFUME_PHOTO, SMARTWATCH_PHOTO, HEADPHONES_PHOTO].map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Sleek Dark Slate & Navy — Free Delivery */}
            <div
              className="sf-amz-promo-card"
              onClick={() => handleCategoryOrDeals(1)}
              style={{
                background: 'linear-gradient(180deg, #273549 0%, #1e293b 55%, #0f172a 100%)',
                color: '#ffffff',
                padding: '22px 18px 14px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '19px',
                    fontWeight: 800,
                    lineHeight: 1.52,
                    letterSpacing: '0px',
                    color: '#ffffff',
                  }}
                >
                  توصيل مجاني للطلبات
                </h3>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: '#cbd5e1',
                  }}
                >
                  وفر أكثر مع باقات التوفير
                </div>
              </div>

              {/* Real Transparent PNG Product Showcase */}
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '175px',
                  borderRadius: '14px',
                  background: 'radial-gradient(circle at 50% 55%, rgba(148, 163, 184, 0.16) 0%, rgba(15, 23, 42, 0.35) 75%)',
                  position: 'relative',
                }}
              >
                <img
                  src={SNEAKER_2_PHOTO}
                  alt="توصيل مجاني"
                  decoding="async"
                  style={{
                    width: '150px',
                    height: '150px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 0, 0)',
                  }}
                />
              </div>
            </div>

            {/* Card 4: Rich Warm Espresso — Seasonal Collection */}
            <div
              className="sf-amz-promo-card"
              onClick={() => handleCategoryOrDeals(2)}
              style={{
                background: 'linear-gradient(180deg, #5c2d0c 0%, #3b1a06 58%, #230f03 100%)',
                color: '#ffffff',
                padding: '22px 18px 14px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '19px',
                    fontWeight: 800,
                    lineHeight: 1.52,
                    letterSpacing: '0px',
                    color: '#ffffff',
                  }}
                >
                  اكتشف التشكيلة الجديدة!
                </h3>
                <div
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: '#fde68a',
                  }}
                >
                  كل اللي تحتاجه في مكان واحد
                </div>
              </div>

              {/* Warm Spotlight Product Stage */}
              <div
                style={{
                  marginTop: 'auto',
                  height: '175px',
                  borderRadius: '14px',
                  background: 'radial-gradient(circle at 50% 55%, rgba(251, 146, 60, 0.32) 0%, rgba(0, 0, 0, 0.28) 75%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '12px',
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={WATCH_CLASSIC_PHOTO}
                  alt="تشكيلة الموسم"
                  decoding="async"
                  style={{
                    width: '136px',
                    height: '136px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 0, 0)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: 6 Compact White Quick-Discovery Product Tiles */}
          <div className="sf-amz-quick-tiles-wrapper">
            <div ref={quickRowRef} className="sf-amz-quick-tiles-row">
              {quickProducts.slice(0, 6).map((item, idx) => {
                const meta = QUICK_TILE_ITEMS[idx % QUICK_TILE_ITEMS.length];
                const photoUrl = item.imageUrl || resolveProductPhoto(item.name, item.categoryName).url;

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="sf-amz-quick-tile"
                    onClick={() => (onQuickView ? onQuickView(item) : onSelectDeals())}
                  >
                    <div
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 700,
                        color: '#0f172a',
                        lineHeight: 1.5,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {meta.label}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 0',
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = generatePremiumProductSvg(item.name, item.categoryName);
                        }}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '94px',
                          objectFit: 'contain',
                          transform: 'translate3d(0, 0, 0)',
                        }}
                      />
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '2px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          background: meta.badgeBg,
                          color: meta.badgeColor,
                          fontSize: '11px',
                          fontWeight: 600,
                          lineHeight: 1.4,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meta.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sleek Circular Carousel Button */}
            <button
              type="button"
              className="sf-amz-floating-nav-btn"
              onClick={() => scrollQuickRow('left')}
              aria-label="التالي"
              title="استعرض المزيد"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});
