import { useState, useEffect, useMemo } from 'react';
import type { StorefrontProduct } from '../types/storefront.types';
import { resolveProductPhoto } from '../lib/storefront-photo-matcher';
import {
  LAPTOP_PHOTO,
  IPHONE_PHOTO,
  SMARTWATCH_PHOTO,
  HEADPHONES_PHOTO,
  WATCH_CLASSIC_PHOTO,
} from '../lib/product-photos-registry';

interface StorefrontFlashSaleCountdownProps {
  products: StorefrontProduct[];
  cartMap: Map<number, number>;
  whatsappPhone?: string;
  favoriteIds?: Set<number>;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
  onToggleFavorite?: (productId: number) => void;
  onSelectDeals?: () => void;
}

export function StorefrontFlashSaleCountdown({
  products,
  onQuickView,
  onSelectDeals,
}: StorefrontFlashSaleCountdownProps) {
  // Live Countdown Timer: Days, Hours, Minutes, Seconds
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({
    days: 3,
    hours: 23,
    minutes: 19,
    seconds: 45,
  });

  useEffect(() => {
    // Target: 3 days + remaining time today for an authentic live countdown matching the reference
    const calculateTimeRemaining = () => {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = Math.max(0, endOfDay.getTime() - now.getTime());

      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return { days: 3, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeRemaining());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Resolve up to 5 showcase products or fallback to crisp cutout product images
  const showcaseItems = useMemo(() => {
    const defaults = [
      { img: LAPTOP_PHOTO, product: products[0] },
      { img: IPHONE_PHOTO, product: products[1] || products[0] },
      { img: SMARTWATCH_PHOTO, product: products[2] || products[0] },
      { img: HEADPHONES_PHOTO, product: products[3] || products[0] },
      { img: WATCH_CLASSIC_PHOTO, product: products[4] || products[0] },
    ];

    if (!products || products.length === 0) return defaults;

    return defaults.map((def, idx) => {
      const p = products[idx];
      if (!p) return def;
      const resolved = resolveProductPhoto(p.name, p.categoryName);
      const url = p.imageUrl || resolved.url || def.img;
      return {
        img: url,
        product: p,
      };
    });
  }, [products]);

  const padZero = (n: number) => String(n).padStart(2, '0');

  const handleBannerClick = () => {
    if (onSelectDeals) {
      onSelectDeals();
      window.scrollTo({ top: 180, behavior: 'smooth' });
    }
  };

  return (
    <section
      className="storefront-deals-of-the-day-section"
      dir="rtl"
      style={{
        margin: '32px 0',
        padding: '0 4px',
        userSelect: 'none',
      }}
    >
      {/* Top Centered Section Heading: Deals Of the Day */}
      <h2
        style={{
          textAlign: 'center',
          fontSize: 'clamp(22px, 2.5vw, 30px)',
          fontWeight: 800,
          color: '#111827',
          margin: '0 0 18px 0',
          letterSpacing: '-0.3px',
        }}
      >
        عروض وتخفيضات اليوم
      </h2>

      {/* Main Pastel Mesh Gradient Banner Card */}
      <div
        onClick={handleBannerClick}
        className="storefront-flash-banner-card"
        style={{
          position: 'relative',
          borderRadius: '18px',
          overflow: 'hidden',
          background:
            'radial-gradient(circle at 85% 20%, #dbeafe 0%, transparent 45%), radial-gradient(circle at 48% 15%, #ffedd5 0%, transparent 45%), radial-gradient(circle at 15% 25%, #fef9c3 0%, transparent 40%), radial-gradient(circle at 25% 85%, #d1fae5 0%, transparent 50%), linear-gradient(125deg, #e0ecff 0%, #f4f7fb 48%, #e6f9f6 100%)',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.06), 0 2px 8px -2px rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          minHeight: '320px',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1.25fr',
          alignItems: 'center',
          padding: '32px 42px',
          gap: '24px',
          cursor: onSelectDeals ? 'pointer' : 'default',
        }}
      >
        {/* Decorative Flowing 3D Ribbon Wave SVG in Background */}
        <svg
          viewBox="0 0 1200 360"
          fill="none"
           preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          <defs>
            <linearGradient id="flashRibbonGrad1" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="45%" stopColor="#34d399" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="flashRibbonGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {/* Sweeping Ribbon Wave */}
          <path
            d="M-60 260 C 120 330, 290 290, 410 230 C 490 190, 440 130, 380 165 C 320 200, 390 310, 560 310 C 750 310, 920 240, 1260 290"
            stroke="url(#flashRibbonGrad1)"
            strokeWidth="26"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M80 350 C 260 310, 430 220, 620 275 C 810 330, 990 220, 1250 250"
            stroke="url(#flashRibbonGrad2)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Right Side (in RTL): 3 Feature Badges + Title + 4 Countdown Boxes */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '26px',
          }}
        >
          {/* Top 3 Feature Badges Row with Circular Coral/Orange Icons & Vertical Dividers */}
          <div
            className="storefront-flash-badges-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            {/* Feature 1: Latest Technology */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1.2px solid #f97316',
                  background: 'rgba(255, 255, 255, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea580c',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b' }}>أحدث</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>الإصدارات</span>
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

            {/* Feature 2: Premium Quality */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1.2px solid #f97316',
                  background: 'rgba(255, 255, 255, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea580c',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b' }}>جودة</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>فائقة 100%</span>
              </div>
            </div>

            <div style={{ width: '1px', height: '26px', background: '#cbd5e1' }} />

            {/* Feature 3: Perfect Compatibility / Guarantee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1.2px solid #f97316',
                  background: 'rgba(255, 255, 255, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ea580c',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b' }}>ضمان</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>وأفضل سعر</span>
              </div>
            </div>
          </div>

          {/* Hurry! Limited Deals Heading + 4 Countdown Boxes */}
          <div>
            <h3
              style={{
                fontSize: 'clamp(20px, 2.2vw, 26px)',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 14px 0',
                letterSpacing: '-0.3px',
              }}
            >
              سارع الآن! عروض محدودة
            </h3>

            {/* 4 Tinted Frosted Countdown Squares */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                direction: 'rtl',
              }}
            >
              {[
                { label: 'يوم', value: padZero(timeLeft.days) },
                { label: 'ساعة', value: padZero(timeLeft.hours) },
                { label: 'دقيقة', value: padZero(timeLeft.minutes) },
                { label: 'ثانية', value: padZero(timeLeft.seconds) },
              ].map((box, index) => (
                <div
                  key={index}
                  style={{
                    width: '62px',
                    height: '64px',
                    borderRadius: '10px',
                    background: 'rgba(226, 224, 232, 0.65)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#64748b',
                      lineHeight: 1.1,
                    }}
                  >
                    {box.label}
                  </span>
                  <span
                    style={{
                      fontSize: '19px',
                      fontWeight: 800,
                      color: '#0f172a',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.15,
                    }}
                  >
                    {box.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Left Side (in RTL): Floating 3D-Style Product Collage */}
        <div
          className="storefront-flash-collage"
          style={{
            position: 'relative',
            zIndex: 2,
            height: '270px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Floating Item 4: Far Right/Back Watch */}
          {showcaseItems[2] && (
            <div
              onClick={(e) => {
                if (showcaseItems[2].product && onQuickView) {
                  e.stopPropagation();
                  onQuickView(showcaseItems[2].product);
                }
              }}
              style={{
                position: 'absolute',
                right: '4%',
                bottom: '12%',
                width: '95px',
                height: '95px',
                transform: 'rotate(14deg)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                zIndex: 3,
                filter: 'drop-shadow(0 12px 18px rgba(15, 23, 42, 0.16))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(8deg) scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(14deg) scale(1)';
              }}
            >
              <img
                src={showcaseItems[2].img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Floating Item 2: Fanned Smartphone / Secondary Item */}
          {showcaseItems[1] && (
            <div
              onClick={(e) => {
                if (showcaseItems[1].product && onQuickView) {
                  e.stopPropagation();
                  onQuickView(showcaseItems[1].product);
                }
              }}
              style={{
                position: 'absolute',
                right: '20%',
                top: '14%',
                width: '135px',
                height: '155px',
                transform: 'rotate(-16deg)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                zIndex: 2,
                filter: 'drop-shadow(0 14px 22px rgba(15, 23, 42, 0.18))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(-10deg) scale(1.07)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(-16deg) scale(1)';
              }}
            >
              <img
                src={showcaseItems[1].img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Main Centerpiece Hero Product (Laptop / Main Deal) */}
          {showcaseItems[0] && (
            <div
              onClick={(e) => {
                if (showcaseItems[0].product && onQuickView) {
                  e.stopPropagation();
                  onQuickView(showcaseItems[0].product);
                }
              }}
              style={{
                position: 'relative',
                width: '250px',
                height: '240px',
                transform: 'rotate(-4deg)',
                transition: 'transform 0.35s ease',
                cursor: 'pointer',
                zIndex: 4,
                filter: 'drop-shadow(0 20px 28px rgba(15, 23, 42, 0.22))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(-4deg) scale(1)';
              }}
            >
              <img
                src={showcaseItems[0].img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Floating Top-Left Earbuds / Headphones */}
          {showcaseItems[3] && (
            <div
              onClick={(e) => {
                if (showcaseItems[3].product && onQuickView) {
                  e.stopPropagation();
                  onQuickView(showcaseItems[3].product);
                }
              }}
              style={{
                position: 'absolute',
                left: '14%',
                top: '4%',
                width: '90px',
                height: '90px',
                transform: 'rotate(12deg)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                zIndex: 3,
                filter: 'drop-shadow(0 10px 16px rgba(15, 23, 42, 0.14))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(4deg) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(12deg) scale(1)';
              }}
            >
              <img
                src={showcaseItems[3].img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          {/* Floating Bottom-Left Secondary Device / Classic Watch */}
          {showcaseItems[4] && (
            <div
              onClick={(e) => {
                if (showcaseItems[4].product && onQuickView) {
                  e.stopPropagation();
                  onQuickView(showcaseItems[4].product);
                }
              }}
              style={{
                position: 'absolute',
                left: '2%',
                bottom: '8%',
                width: '130px',
                height: '130px',
                transform: 'rotate(-12deg)',
                transition: 'transform 0.3s ease',
                cursor: 'pointer',
                zIndex: 5,
                filter: 'drop-shadow(0 16px 22px rgba(15, 23, 42, 0.2))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(-6deg) scale(1.07)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(-12deg) scale(1)';
              }}
            >
              <img
                src={showcaseItems[4].img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .storefront-flash-banner-card {
            grid-template-columns: 1fr !important;
            padding: 24px 20px !important;
            text-align: right;
          }
          .storefront-flash-collage {
            height: 220px !important;
            margin-top: 8px;
          }
        }
      `}</style>
    </section>
  );
}
