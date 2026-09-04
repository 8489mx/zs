import React, { useState, useEffect, useRef, useCallback } from 'react';

interface StorefrontBannerCarouselProps {
  banners: string[];
  title?: string;
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: string;
  bannerPositions?: string[];
  autoPlayIntervalMs?: number;
  bannerIntervalSeconds?: number;
}

export function StorefrontBannerCarousel({
  banners,
  title = 'عروض المتجر الترويجية',
  bannerFit = 'contain',
  bannerPosition = 'center',
  bannerPositions,
  autoPlayIntervalMs,
  bannerIntervalSeconds = 4,
}: StorefrontBannerCarouselProps) {
  const validBanners = banners.filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);
  const touchStartXRef = useRef<number | null>(null);

  const effectiveIntervalMs = autoPlayIntervalMs ?? Math.max(1000, (bannerIntervalSeconds || 4) * 1000);
  const total = validBanners.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Autoplay timer with pause on hover
  useEffect(() => {
    if (total <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, effectiveIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, nextSlide, effectiveIntervalMs]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;
    if (Math.abs(diff) > 40) {
      // In RTL: dragging left means next slide, right means prev slide
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  if (total === 0) return null;

  return (
    <div
      className="storefront-banner-carousel-wrapper"
      style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '16px auto 10px',
        padding: '0 20px',
        boxSizing: 'border-box',
        direction: 'rtl',
      }}
    >
      <style>{`
        .storefront-banner-carousel-inner {
          border-radius: 16px;
          overflow: hidden;
          isolation: isolate;
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          transform: translateZ(0);
        }
        .storefront-banner-img {
          border-radius: 16px !important;
          overflow: hidden !important;
        }
        .storefront-banner-nav-btn {
          display: flex;
        }
        .storefront-banner-dots {
          position: absolute;
          bottom: 6px !important;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 4px !important;
          padding: 0 !important;
          background: transparent !important;
          backdrop-filter: none !important;
          z-index: 3;
          pointer-events: none;
        }
        .storefront-banner-dot {
          width: 4px !important;
          height: 4px !important;
          min-width: 4px !important;
          min-height: 4px !important;
          border-radius: 50% !important;
          border: none !important;
          padding: 0 !important;
          background: rgba(255, 255, 255, 0.65) !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
          transition: all 0.25s ease !important;
          pointer-events: auto;
        }
        .storefront-banner-dot.active {
          width: 10px !important;
          border-radius: 999px !important;
          background: #ffffff !important;
        }
        @media (max-width: 640px) {
          .storefront-banner-carousel-wrapper {
            padding: 0 10px !important;
            margin: 6px auto 4px !important;
          }
          .storefront-banner-carousel-inner {
            height: clamp(140px, 34vw, 320px) !important;
            border-radius: 14px !important;
          }
          .storefront-banner-img {
            border-radius: 14px !important;
          }
          .storefront-banner-nav-btn {
            display: none !important;
          }
          .storefront-banner-dots {
            bottom: 4px !important;
            gap: 3px !important;
          }
          .storefront-banner-dot {
            width: 3.5px !important;
            height: 3.5px !important;
            min-width: 3.5px !important;
            min-height: 3.5px !important;
          }
          .storefront-banner-dot.active {
            width: 8px !important;
          }
        }
      `}</style>
      <div
        className="storefront-banner-carousel-inner"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: 'clamp(170px, 26vw, 320px)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          isolation: 'isolate',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        }}
      >
        {/* Slides Container - Absolute layered slides for 100% stable zero-layout-shift height */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: 'inherit',
          }}
        >
          {validBanners.map((url, idx) => {
            const isActive = idx === currentIndex;
            const slidePos = bannerPositions?.[idx] || bannerPosition || 'center';
            return (
              <div
                key={`${url}-${idx}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive ? 1 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                  transition: 'opacity 0.45s ease-in-out',
                  background: '#ffffff',
                  borderRadius: 'inherit',
                  overflow: 'hidden',
                }}
              >
                <img
                  className="storefront-banner-img"
                  src={url}
                  alt={`${title} - إعلان ${idx + 1}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: bannerFit,
                    objectPosition: slidePos,
                    display: 'block',
                    borderRadius: 'inherit',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows (Shown when more than 1 banner) */}
        {total > 1 && (
          <>
            {/* Prev Button (Right side in RTL) */}
            <button
              className="storefront-banner-nav-btn"
              type="button"
              onClick={prevSlide}
              aria-label="البانر السابق"
              style={{
                position: 'absolute',
                top: '50%',
                right: '12px',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                color: '#0f172a',
                fontSize: '18px',
                fontWeight: 900,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                opacity: isHovered ? 1 : 0.65,
                transition: 'all 0.2s ease',
                zIndex: 3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.opacity = isHovered ? '1' : '0.65';
              }}
            >
              ›
            </button>

            {/* Next Button (Left side in RTL) */}
            <button
              className="storefront-banner-nav-btn"
              type="button"
              onClick={nextSlide}
              aria-label="البانر التالي"
              style={{
                position: 'absolute',
                top: '50%',
                left: '12px',
                transform: 'translateY(-50%)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                color: '#0f172a',
                fontSize: '18px',
                fontWeight: 900,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                opacity: isHovered ? 1 : 0.65,
                transition: 'all 0.2s ease',
                zIndex: 3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                e.currentTarget.style.opacity = isHovered ? '1' : '0.65';
              }}
            >
              ‹
            </button>
          </>
        )}

        {/* Carousel Pagination Indicator Dots (Clean & Sleek) */}
        {total > 1 && (
          <div
            className="storefront-banner-dots"
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0',
              background: 'transparent',
              zIndex: 3,
            }}
          >
            {validBanners.map((_, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={`الانتقال إلى شريحة ${idx + 1}`}
                  className={`storefront-banner-dot ${isActive ? 'active' : ''}`}
                  style={{
                    width: isActive ? '10px' : '4px',
                    height: '4px',
                    borderRadius: '999px',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.25s ease',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
