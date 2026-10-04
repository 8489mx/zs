import React, { useState, useEffect, useRef, useCallback } from 'react';

interface StorefrontBannerCarouselProps {
  banners: string[];
  title?: string;
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: string;
  bannerPositions?: string[];
  autoPlayIntervalMs?: number;
  bannerIntervalSeconds?: number;
  onBannerClick?: (index: number) => void;
}

export function StorefrontBannerCarousel({
  banners,
  title = 'عروض المتجر الترويجية',
  bannerFit = 'contain',
  bannerPosition = 'center',
  bannerPositions,
  autoPlayIntervalMs,
  bannerIntervalSeconds = 4,
  onBannerClick,
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
        maxWidth: 'var(--storefront-container, 1440px)',
        width: '100%',
        margin: '14px auto 8px',
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
          bottom: 12px !important;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px !important;
          padding: 3px 10px !important;
          background: rgba(15, 23, 42, 0.45) !important;
          backdrop-filter: blur(6px) !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          border-radius: 999px !important;
          z-index: 3;
          pointer-events: auto;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .storefront-banner-dot {
          width: 6px !important;
          height: 6px !important;
          min-width: 6px !important;
          min-height: 6px !important;
          border-radius: 50% !important;
          border: none !important;
          padding: 0 !important;
          background: rgba(255, 255, 255, 0.55) !important;
          transition: all 0.25s ease !important;
          cursor: pointer !important;
        }
        .storefront-banner-dot:hover {
          background: rgba(255, 255, 255, 0.9) !important;
        }
        .storefront-banner-dot.active {
          width: 18px !important;
          border-radius: 999px !important;
          background: #ffffff !important;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4) !important;
        }
        @media (max-width: 640px) {
          .storefront-banner-carousel-wrapper {
            padding: 0 10px !important;
            margin: 6px auto 4px !important;
          }
          .storefront-banner-carousel-inner {
            aspect-ratio: auto !important;
            height: clamp(140px, 34vw, 260px) !important;
            border-radius: 14px !important;
          }
          .storefront-banner-img {
            border-radius: 14px !important;
          }
          .storefront-banner-nav-btn {
            display: none !important;
          }
          .storefront-banner-dots {
            bottom: 6px !important;
            padding: 2px 8px !important;
            gap: 4px !important;
          }
          .storefront-banner-dot {
            width: 4.5px !important;
            height: 4.5px !important;
            min-width: 4.5px !important;
            min-height: 4.5px !important;
          }
          .storefront-banner-dot.active {
            width: 12px !important;
          }
          .storefront-banner-cta-chip {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="storefront-banner-carousel-inner"
        onClick={() => onBannerClick?.(currentIndex)}
        role={onBannerClick ? 'button' : undefined}
        tabIndex={onBannerClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onBannerClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onBannerClick(currentIndex);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          aspectRatio: '4 / 1',
          minHeight: '160px',
          maxHeight: '360px',
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
          cursor: onBannerClick ? 'pointer' : 'default',
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
                  background: '#090d16',
                  borderRadius: 'inherit',
                  overflow: 'hidden',
                }}
              >
                {/* Ambient Blurred Backdrop for Ultra-Wide Displays (Fills gaps with matching lighting) */}
                {bannerFit === 'contain' && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: '-25px',
                      backgroundImage: `url(${url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: slidePos,
                      filter: 'blur(36px) saturate(1.3) brightness(0.65)',
                      transform: 'scale(1.2)',
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  />
                )}

                <img
                  className="storefront-banner-img"
                  src={url}
                  alt={`${title} - إعلان ${idx + 1}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                    objectFit: bannerFit,
                    objectPosition: slidePos,
                    display: 'block',
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    filter: bannerFit === 'contain' ? 'drop-shadow(0 6px 24px rgba(0, 0, 0, 0.45))' : 'none',
                    transform: isHovered && onBannerClick ? 'scale(1.012)' : 'scale(1)',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Floating CTA Chip on Desktop */}
        {onBannerClick && (
          <div
            className="storefront-banner-cta-chip"
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '18px',
              zIndex: 3,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '999px',
              background: isHovered ? 'var(--storefront-primary-color, #170e5e)' : 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.28)',
              pointerEvents: 'none',
              transition: 'all 0.25s ease',
            }}
          >
            <span>تصفح العروض والمنتجات</span>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}

        {/* Navigation Arrows (Shown when more than 1 banner) */}
        {total > 1 && (
          <>
            {/* Prev Button (Right side in RTL) */}
            <button
              className="storefront-banner-nav-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              aria-label="البانر السابق"
              style={{
                position: 'absolute',
                top: '50%',
                right: '12px',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.95)',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? 'auto' : 'none',
                transition: 'all 0.25s ease',
                zIndex: 3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Next Button (Left side in RTL) */}
            <button
              className="storefront-banner-nav-btn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              aria-label="البانر التالي"
              style={{
                position: 'absolute',
                top: '50%',
                left: '12px',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.95)',
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                opacity: isHovered ? 1 : 0,
                pointerEvents: isHovered ? 'auto' : 'none',
                transition: 'all 0.25s ease',
                zIndex: 3,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </>
        )}

        {/* Carousel Pagination Indicator Dots (Clean & Sleek) */}
        {total > 1 && (
          <div className="storefront-banner-dots">
            {validBanners.map((_, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={`dot-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToSlide(idx);
                  }}
                  aria-label={`الانتقال إلى شريحة ${idx + 1}`}
                  className={`storefront-banner-dot ${isActive ? 'active' : ''}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
