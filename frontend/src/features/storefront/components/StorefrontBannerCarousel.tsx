import React, { useState, useEffect, useRef, useCallback } from 'react';

interface StorefrontBannerCarouselProps {
  banners: string[];
  title?: string;
  bannerFit?: 'contain' | 'cover';
  bannerPosition?: 'top' | 'center' | 'bottom';
  autoPlayIntervalMs?: number;
}

export function StorefrontBannerCarousel({
  banners,
  title = 'عروض المتجر الترويجية',
  bannerFit = 'contain',
  bannerPosition = 'center',
  autoPlayIntervalMs = 3800,
}: StorefrontBannerCarouselProps) {
  const validBanners = banners.filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);
  const touchStartXRef = useRef<number | null>(null);

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

  // Autoplay timer
  useEffect(() => {
    if (total <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, autoPlayIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, nextSlide, autoPlayIntervalMs]);

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
      style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '16px auto 10px',
        padding: '0 20px',
        boxSizing: 'border-box',
        direction: 'rtl',
      }}
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '140px',
          maxHeight: bannerFit === 'cover' ? '320px' : 'none',
          userSelect: 'none',
        }}
      >
        {/* Slides Container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {validBanners.map((url, idx) => {
            const isActive = idx === currentIndex;
            return (
              <div
                key={`${url}-${idx}`}
                style={{
                  width: '100%',
                  display: isActive ? 'block' : 'none',
                  opacity: isActive ? 1 : 0,
                  transition: 'opacity 0.4s ease-in-out',
                }}
              >
                <img
                  src={url}
                  alt={`${title} - إعلان ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: bannerFit === 'cover' ? '320px' : 'none',
                    objectFit: bannerFit,
                    objectPosition: bannerPosition,
                    display: 'block',
                    margin: '0 auto',
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
                display: 'flex',
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
                display: 'flex',
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

        {/* Carousel Pagination Indicator Dots (Pills) */}
        {total > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(4px)',
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
                  style={{
                    width: isActive ? '22px' : '7px',
                    height: '7px',
                    borderRadius: '999px',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    background: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
