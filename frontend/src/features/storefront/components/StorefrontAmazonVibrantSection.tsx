import React, { useRef } from 'react';
import type { StorefrontProduct, StorefrontCategory } from '../types/storefront.types';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';

function getProductPhotoUrl(p?: StorefrontProduct | null): string {
  if (!p) return '';
  if (p.imageUrl) return p.imageUrl;
  const matched = resolveProductPhoto(p.name, p.categoryName);
  if (matched?.url) return matched.url;
  return generatePremiumProductSvg(p.name, p.categoryName);
}

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

  const stageProdCenter = React.useMemo(
    () => products.find((p) => p.imageUrl?.includes('iphone-13-pro')) || products[0] || null,
    [products]
  );
  const stageProdRight = React.useMemo(
    () => products.find((p) => p.imageUrl?.includes('airpods-max')) || products[2] || products[0] || null,
    [products]
  );
  const stageProdLeft = React.useMemo(
    () => products.find((p) => p.imageUrl?.includes('bag-prada')) || products[5] || products[1] || products[0] || null,
    [products]
  );

  const card1Prod = products[0] || null;
  const card2Prods = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    const p1 = products.find((p) => p.imageUrl?.includes('jordan-1')) || products[4] || products[1];
    const p2 = products.find((p) => p.imageUrl?.includes('apple-watch-gold')) || products[1] || products[2];
    const p3 = products.find((p) => p.imageUrl?.includes('echo-plus') || p.imageUrl?.includes('homepod')) || products[2] || products[3];
    return [p1, p2, p3].filter(Boolean) as StorefrontProduct[];
  }, [products]);
  const card3Prod = React.useMemo(
    () => products.find((p) => p.imageUrl?.includes('puma-rider')) || products[4] || products[0] || null,
    [products]
  );
  const card4Prod = React.useMemo(
    () => products.find((p) => p.imageUrl?.includes('perfume-jadore')) || products[3] || products[0] || null,
    [products]
  );

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
          border-radius: 26px;
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
          border-radius: 30px;
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
          border: 1px solid #edf1f7;
          border-radius: 22px;
          padding: 12px 12px 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          height: 190px;
          cursor: pointer;
          box-sizing: border-box;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: border-color 0.18s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
        }
        .sf-amz-quick-tile:hover {
          border-color: #cbd5e1;
          transform: translate3d(0, -3px, 0);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
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
            min-height: 360px;
          }
          .sf-amz-promo-cards-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sf-amz-quick-tiles-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .sf-amz-floating-nav-btn {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .sf-amz-vibrant-section {
            display: none !important;
          }
          .sf-amz-hero-orange-card {
            min-height: 224px !important;
            border-radius: 14px !important;
          }
          .sf-amz-orange-copy {
            padding: 14px 14px 4px !important;
            gap: 4px !important;
            justify-content: flex-start !important;
          }
          .sf-amz-orange-kicker {
            font-size: 11px !important;
          }
          .sf-amz-orange-title {
            font-size: 18px !important;
            line-height: 1.3 !important;
          }
          .sf-amz-orange-pill {
            font-size: 11px !important;
            padding: 5px 12px !important;
            margin-top: 4px !important;
            border-radius: 8px !important;
          }
          .sf-amz-orange-stage {
            height: 136px !important;
          }
          .sf-amz-orange-arch {
            height: 124px !important;
            width: 88% !important;
          }
          .sf-amz-orange-podiums {
            height: 120px !important;
            padding-bottom: 4px !important;
          }
          .sf-amz-podium-side-img {
            width: 56px !important;
            height: 56px !important;
          }
          .sf-amz-podium-side-box {
            width: 54px !important;
            height: 34px !important;
          }
          .sf-amz-podium-center-img {
            width: 72px !important;
            height: 72px !important;
          }
          .sf-amz-podium-center-box {
            width: 66px !important;
            height: 44px !important;
          }
          .sf-amz-promo-cards-row {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
            overflow: visible !important;
            padding-bottom: 0 !important;
          }
          .sf-amz-promo-card {
            min-width: 0 !important;
            width: 100% !important;
            height: 184px !important;
            padding: 11px 10px 8px !important;
            border-radius: 12px !important;
          }
          .sf-amz-promo-card > div:first-child {
            gap: 3px !important;
            padding-bottom: 4px !important;
            justify-content: flex-start !important;
          }
          .sf-amz-promo-card h3 {
            font-size: 13px !important;
            line-height: 1.3 !important;
            font-weight: 700 !important;
          }
          .sf-amz-promo-sub {
            font-size: 10.5px !important;
            line-height: 1.3 !important;
          }
          .sf-amz-promo-stage {
            height: 92px !important;
            padding: 4px !important;
            border-radius: 10px !important;
          }
          .sf-amz-promo-stage img {
            width: 78px !important;
            height: 78px !important;
          }
          .sf-amz-coupon-badge {
            padding: 3px 8px !important;
            margin-top: 2px !important;
            border-radius: 7px !important;
          }
          .sf-amz-coupon-badge span {
            font-size: 10px !important;
          }
          .sf-amz-bundle-row {
            padding: 5px 4px !important;
            border-radius: 10px !important;
            gap: 4px !important;
          }
          .sf-amz-bundle-item {
            width: auto !important;
            height: 46px !important;
            padding: 3px !important;
            border-radius: 8px !important;
          }
          .sf-amz-quick-tiles-row {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 7px !important;
            overflow: visible !important;
          }
          .sf-amz-quick-tile {
            min-width: 0 !important;
            width: 100% !important;
            height: 130px !important;
            padding: 8px 6px 6px !important;
            gap: 4px !important;
            border-radius: 12px !important;
          }
          .sf-amz-quick-tile-title {
            font-size: 10.5px !important;
            font-weight: 600 !important;
            text-align: center !important;
          }
          .sf-amz-quick-tile-img-box {
            padding: 4px !important;
            border-radius: 9px !important;
          }
          .sf-amz-quick-tile-img {
            max-height: 52px !important;
          }
          .sf-amz-quick-tile-badge {
            font-size: 8.5px !important;
            padding: 2px 5px !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            border-radius: 6px !important;
          }
          .sf-amz-floating-nav-btn {
            display: none !important;
          }
        }
      `}</style>

      <div className="sf-amz-vibrant-grid">
        {/* RIGHT COLUMN: Tall Vibrant Orange Flagship Campaign Card */}
        <div className="sf-amz-hero-orange-card" onClick={onSelectDeals}>
          {/* Top Copy — Balanced spacing & sizing to fill the upper box */}
          <div
            className="sf-amz-orange-copy"
            style={{
              padding: '28px 24px 16px',
              textAlign: 'right',
              position: 'relative',
              zIndex: 3,
              width: '100%',
              boxSizing: 'border-box',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div
              className="sf-amz-orange-kicker"
              style={{
                fontSize: '15.5px',
                fontWeight: 700,
                lineHeight: 1.4,
                color: 'rgba(255, 255, 255, 0.96)',
                letterSpacing: '0px',
              }}
            >
              عروض الموسم الكبرى
            </div>
            <h2
              className="sf-amz-orange-title"
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 800,
                lineHeight: 1.38,
                color: '#ffffff',
                letterSpacing: '0px',
                width: '100%',
              }}
            >
              تخفيضات اليوم قربت!
            </h2>
            <span
              className="sf-amz-orange-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '4px',
                background: '#1e293b',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                lineHeight: 1.4,
                padding: '9px 22px',
                borderRadius: '10px',
                boxShadow: '0 6px 14px rgba(15, 23, 42, 0.24)',
              }}
            >
              وفر أكثر مع عروضنا
            </span>
          </div>

          {/* Bottom 3D Fluted Arch Showcase Stage */}
          <div
            className="sf-amz-orange-stage"
            style={{
              position: 'relative',
              width: '100%',
              height: '326px',
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Glowing Arch Frame with Warm Studio Backlight */}
            <div
              className="sf-amz-orange-arch"
              style={{
                position: 'absolute',
                bottom: 0,
                width: '88%',
                height: '312px',
                borderRadius: '999px 999px 0 0',
                border: '4px solid #ffd4b8',
                borderBottom: 'none',
                background:
                  'radial-gradient(circle at 50% 38%, rgba(255, 247, 237, 0.36) 0%, rgba(255, 180, 100, 0.14) 52%, rgba(0, 0, 0, 0) 78%), repeating-linear-gradient(90deg, #d94300 0px, #ef4f00 10px, #c83b00 20px)',
                boxShadow: 'inset 0 12px 28px rgba(0, 0, 0, 0.2), 0 0 26px rgba(255, 212, 184, 0.38)',
                zIndex: 1,
              }}
            />

            {/* Pedestals & Curated Products Composition */}
            <div
              className="sf-amz-orange-podiums"
              style={{
                position: 'relative',
                zIndex: 2,
                width: '92%',
                height: '296px',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '6px',
                paddingBottom: '12px',
              }}
            >
              {/* Right Podium + Product */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate3d(0, 6px, 0)' }}>
                <img
                  className="sf-amz-podium-side-img"
                  src={getProductPhotoUrl(stageProdRight)}
                  alt={stageProdRight?.name || 'عرض مميز'}
                  decoding="async"
                  onError={(e) => {
                    if (stageProdRight) {
                      e.currentTarget.src = generatePremiumProductSvg(stageProdRight.name, stageProdRight.categoryName);
                    }
                  }}
                  style={{
                    width: '104px',
                    height: '104px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 4px, 0)',
                    position: 'relative',
                    zIndex: 2,
                    filter: 'drop-shadow(0 12px 14px rgba(0, 0, 0, 0.36)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.22))',
                  }}
                />
                <div
                  className="sf-amz-podium-side-box"
                  style={{
                    width: '78px',
                    height: '68px',
                    borderRadius: '12px 12px 4px 4px',
                    borderTop: '3px solid #ffedd5',
                    background: 'linear-gradient(180deg, #ff852b 0%, #cc3d00 100%)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.26), inset 0 2px 6px rgba(255,255,255,0.28)',
                  }}
                />
              </div>

              {/* Center Tall Podium + Featured Product */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                <img
                  className="sf-amz-podium-center-img"
                  src={getProductPhotoUrl(stageProdCenter)}
                  alt={stageProdCenter?.name || 'عرض مميز'}
                  decoding="async"
                  onError={(e) => {
                    if (stageProdCenter) {
                      e.currentTarget.src = generatePremiumProductSvg(stageProdCenter.name, stageProdCenter.categoryName);
                    }
                  }}
                  style={{
                    width: '132px',
                    height: '132px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 6px, 0)',
                    position: 'relative',
                    zIndex: 3,
                    filter: 'drop-shadow(0 14px 18px rgba(0, 0, 0, 0.42)) drop-shadow(0 0 14px rgba(255, 255, 255, 0.26))',
                  }}
                />
                <div
                  className="sf-amz-podium-center-box"
                  style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '14px 14px 4px 4px',
                    borderTop: '3.5px solid #fff7ed',
                    background: 'linear-gradient(180deg, #ff9238 0%, #d44200 100%)',
                    boxShadow: '0 10px 22px rgba(0,0,0,0.32), inset 0 2px 8px rgba(255,255,255,0.32)',
                  }}
                />
              </div>

              {/* Left Podium + Product */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate3d(0, 10px, 0)' }}>
                <img
                  className="sf-amz-podium-side-img"
                  src={getProductPhotoUrl(stageProdLeft)}
                  alt={stageProdLeft?.name || 'عرض مميز'}
                  decoding="async"
                  onError={(e) => {
                    if (stageProdLeft) {
                      e.currentTarget.src = generatePremiumProductSvg(stageProdLeft.name, stageProdLeft.categoryName);
                    }
                  }}
                  style={{
                    width: '104px',
                    height: '104px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 4px, 0)',
                    position: 'relative',
                    zIndex: 2,
                    filter: 'drop-shadow(0 12px 14px rgba(0, 0, 0, 0.36)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.22))',
                  }}
                />
                <div
                  className="sf-amz-podium-side-box"
                  style={{
                    width: '78px',
                    height: '58px',
                    borderRadius: '12px 12px 4px 4px',
                    borderTop: '3px solid #ffedd5',
                    background: 'linear-gradient(180deg, #ff852b 0%, #cc3d00 100%)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.26), inset 0 2px 6px rgba(255,255,255,0.28)',
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
                  gap: '10px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '20.5px',
                    fontWeight: 800,
                    lineHeight: 1.45,
                    letterSpacing: '0px',
                    color: '#ffffff',
                  }}
                >
                  أوردرك يوصلك النهارده!
                </h3>
                <div
                  className="sf-amz-promo-sub"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    lineHeight: 1.45,
                    color: 'rgba(255, 255, 255, 0.94)',
                  }}
                >
                  توصيل سريع لباب البيت
                </div>
              </div>

              {/* Real Product Showcase on Luminous Blue Spotlight */}
              <div
                className="sf-amz-promo-stage"
                style={{
                  width: '100%',
                  height: '186px',
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  borderRadius: '16px',
                  background:
                    'radial-gradient(circle at 50% 52%, rgba(255, 255, 255, 0.42) 0%, rgba(186, 230, 253, 0.2) 45%, rgba(255, 255, 255, 0.04) 76%)',
                }}
              >
                <img
                  src={getProductPhotoUrl(card1Prod)}
                  alt={card1Prod?.name || 'توصيل سريع'}
                  decoding="async"
                  onError={(e) => {
                    if (card1Prod) {
                      e.currentTarget.src = generatePremiumProductSvg(card1Prod.name, card1Prod.categoryName);
                    }
                  }}
                  style={{
                    width: '168px',
                    height: '168px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 0, 0)',
                    filter: 'drop-shadow(0 16px 22px rgba(15, 23, 42, 0.36)) drop-shadow(0 0 16px rgba(255, 255, 255, 0.22))',
                  }}
                />
              </div>
            </div>

            {/* Card 2: Vibrant Sunny Yellow — Super Saver Coupon */}
            <div
              className="sf-amz-promo-card"
              onClick={onSelectDeals}
              style={{
                background: 'linear-gradient(168deg, #ffd814 0%, #ffce00 66%, #2d68c4 66.5%, #2353a0 100%)',
                color: '#0f172a',
                padding: '22px 18px 14px',
              }}
            >
              <div
                style={{
                  textAlign: 'right',
                  position: 'relative',
                  zIndex: 2,
                  width: '100%',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '10px',
                  paddingBottom: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  className="sf-amz-promo-sub"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    lineHeight: 1.4,
                    color: '#1e293b',
                  }}
                >
                  اطلب أونلاين ووفر
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '21px',
                    fontWeight: 800,
                    lineHeight: 1.38,
                    letterSpacing: '0px',
                    color: '#0f172a',
                    width: '100%',
                  }}
                >
                  خصم 10% مع الكوبون
                </h3>

                {/* Dark Navy Ribbon Badge — Generous pill filling the space */}
                <div
                  className="sf-amz-coupon-badge"
                  style={{
                    marginTop: '4px',
                    background: '#131921',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '8px 18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 6px 14px rgba(0,0,0,0.16)',
                  }}
                >
                  <span style={{ fontSize: '13.5px', fontWeight: 700, lineHeight: 1.4 }}>
                    أسبوع السوبر{' '}
                    <span style={{ color: '#ffd814', fontWeight: 800 }}>توفير</span>
                  </span>
                </div>
              </div>

              {/* Curated Dynamic Products Bundle Box at Bottom */}
              <div
                className="sf-amz-bundle-row"
                style={{
                  position: 'relative',
                  zIndex: 2,
                  marginTop: 'auto',
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '10px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.2)',
                }}
              >
                {(card2Prods.length > 0 ? card2Prods : [products[0]].filter(Boolean)).slice(0, 3).map((prod, idx) => (
                  <div
                    key={`${prod.id}-${idx}`}
                    className="sf-amz-bundle-item"
                    style={{
                      flex: 1,
                      height: '86px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #eef2f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '5px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <img
                      src={getProductPhotoUrl(prod)}
                      alt={prod.name}
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = generatePremiumProductSvg(prod.name, prod.categoryName);
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 10px rgba(15, 23, 42, 0.16))',
                      }}
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
                  gap: '10px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '20.5px',
                    fontWeight: 800,
                    lineHeight: 1.45,
                    letterSpacing: '0px',
                    color: '#ffffff',
                  }}
                >
                  توصيل مجاني للطلبات
                </h3>
                <div
                  className="sf-amz-promo-sub"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    lineHeight: 1.45,
                    color: '#cbd5e1',
                  }}
                >
                  وفر أكثر مع باقات التوفير
                </div>
              </div>

              {/* Real Product Showcase on Luminous Slate Spotlight */}
              <div
                className="sf-amz-promo-stage"
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '186px',
                  borderRadius: '16px',
                  background:
                    'radial-gradient(circle at 50% 52%, rgba(241, 245, 249, 0.34) 0%, rgba(148, 163, 184, 0.16) 46%, rgba(15, 23, 42, 0.25) 78%)',
                  position: 'relative',
                }}
              >
                <img
                  src={getProductPhotoUrl(card3Prod)}
                  alt={card3Prod?.name || 'توصيل مجاني'}
                  decoding="async"
                  onError={(e) => {
                    if (card3Prod) {
                      e.currentTarget.src = generatePremiumProductSvg(card3Prod.name, card3Prod.categoryName);
                    }
                  }}
                  style={{
                    width: '164px',
                    height: '164px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 0, 0)',
                    filter: 'drop-shadow(0 16px 22px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 18px rgba(255, 255, 255, 0.2))',
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
                  gap: '10px',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '20.5px',
                    fontWeight: 800,
                    lineHeight: 1.45,
                    letterSpacing: '0px',
                    color: '#ffffff',
                  }}
                >
                  اكتشف التشكيلة الجديدة!
                </h3>
                <div
                  className="sf-amz-promo-sub"
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 600,
                    lineHeight: 1.45,
                    color: '#fde68a',
                  }}
                >
                  كل اللي تحتاجه في مكان واحد
                </div>
              </div>

              {/* Warm Golden Spotlight Product Stage */}
              <div
                className="sf-amz-promo-stage"
                style={{
                  marginTop: 'auto',
                  height: '186px',
                  borderRadius: '16px',
                  background:
                    'radial-gradient(circle at 50% 52%, rgba(254, 240, 138, 0.36) 0%, rgba(251, 146, 60, 0.22) 46%, rgba(0, 0, 0, 0.24) 78%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '8px',
                  boxSizing: 'border-box',
                }}
              >
                <img
                  src={getProductPhotoUrl(card4Prod)}
                  alt={card4Prod?.name || 'تشكيلة الموسم'}
                  decoding="async"
                  onError={(e) => {
                    if (card4Prod) {
                      e.currentTarget.src = generatePremiumProductSvg(card4Prod.name, card4Prod.categoryName);
                    }
                  }}
                  style={{
                    width: '160px',
                    height: '160px',
                    objectFit: 'contain',
                    transform: 'translate3d(0, 0, 0)',
                    filter: 'drop-shadow(0 16px 22px rgba(0, 0, 0, 0.45)) drop-shadow(0 0 18px rgba(254, 240, 138, 0.24))',
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
                      className="sf-amz-quick-tile-title"
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1e293b',
                        lineHeight: 1.35,
                        textAlign: 'right',
                        paddingInline: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {meta.label}
                    </div>

                    <div
                      className="sf-amz-quick-tile-img-box"
                      style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        borderRadius: '14px',
                        background: '#f4f6fa',
                      }}
                    >
                      <img
                        className="sf-amz-quick-tile-img"
                        src={photoUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = generatePremiumProductSvg(item.name, item.categoryName);
                        }}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '80px',
                          objectFit: 'contain',
                          transform: 'translate3d(0, 0, 0)',
                          filter: 'drop-shadow(0 6px 10px rgba(15, 23, 42, 0.1))',
                        }}
                      />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <span
                        className="sf-amz-quick-tile-badge"
                        style={{
                          display: 'inline-block',
                          background: meta.badgeBg,
                          color: meta.badgeColor,
                          fontSize: '10px',
                          fontWeight: 600,
                          lineHeight: 1.35,
                          padding: '2.5px 9px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        {meta.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sleek Circular Carousel Button (Desktop only) */}
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
