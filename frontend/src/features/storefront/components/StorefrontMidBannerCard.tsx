import type { StorefrontMidBanner, StorefrontCategory } from '../types/storefront.types';
import { ArrowLeftIcon } from '@/shared/components/icons/AppIcons';

interface StorefrontMidBannerCardProps {
  banner: StorefrontMidBanner;
  categories?: StorefrontCategory[];
  onSelectCategory?: (categoryId: number) => void;
  onSelectDeals?: () => void;
}

export function StorefrontMidBannerCard({
  banner,
  categories = [],
  onSelectCategory,
  onSelectDeals,
}: StorefrontMidBannerCardProps) {
  if (!banner || !banner.imageUrl) return null;

  const handleClick = () => {
    if (banner.linkType === 'category' && banner.categoryId && onSelectCategory) {
      onSelectCategory(banner.categoryId);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (banner.linkType === 'deals' && onSelectDeals) {
      onSelectDeals();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (banner.linkType === 'url' && banner.customUrl) {
      if (banner.customUrl.startsWith('http://') || banner.customUrl.startsWith('https://')) {
        window.open(banner.customUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = banner.customUrl;
      }
    }
  };

  const isClickable =
    (banner.linkType === 'category' && Boolean(banner.categoryId)) ||
    banner.linkType === 'deals' ||
    (banner.linkType === 'url' && Boolean(banner.customUrl));

  const targetCategory =
    banner.linkType === 'category' && banner.categoryId
      ? categories.find((c) => Number(c.id) === Number(banner.categoryId))
      : null;

  const displayTitle = banner.title || (targetCategory ? `أقوى عروض ${targetCategory.name}` : '');
  const displaySubtitle = banner.subtitle || '';

  return (
    <div
      className="storefront-mid-banner-card"
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        position: 'relative',
        width: '100%',
        margin: '18px 0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      <style>{`
        .storefront-mid-banner-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12);
          border-color: #cbd5e1;
        }
        .storefront-mid-banner-card:hover .storefront-mid-banner-img {
          transform: scale(1.02);
        }
        .storefront-mid-banner-card:hover .storefront-mid-banner-cta {
          background: #ffffff !important;
          color: #170e5e !important;
          transform: translateX(-4px);
        }
        @media (max-width: 640px) {
          .storefront-mid-banner-card {
            border-radius: 12px !important;
            margin: 12px 0 !important;
          }
          .storefront-mid-banner-inner {
            aspect-ratio: 2.8 / 1 !important;
            min-height: 110px !important;
          }
          .storefront-mid-banner-overlay {
            padding: 12px 14px !important;
          }
          .storefront-mid-banner-title {
            font-size: 14px !important;
          }
          .storefront-mid-banner-sub {
            font-size: 10.5px !important;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .storefront-mid-banner-cta {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="storefront-mid-banner-inner"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4.2 / 1',
          minHeight: '140px',
          maxHeight: '320px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090d16',
        }}
      >
        {/* Banner Graphic Image */}
        <img
          src={banner.imageUrl}
          alt={displayTitle || 'إعلان ترويجي'}
          className="storefront-mid-banner-img"
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Dynamic Gradient Overlay (Only if title/subtitle or badge exists) */}
        {(displayTitle || displaySubtitle || banner.badge) && (
          <div
            className="storefront-mid-banner-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.65) 45%, rgba(15,23,42,0.05) 100%)',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-start',
              direction: 'rtl',
              zIndex: 2,
            }}
          >
            {banner.badge && (
              <span
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(90deg, #ea580c, #f97316)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  marginBottom: '8px',
                  boxShadow: '0 2px 6px rgba(234,88,12,0.3)',
                  letterSpacing: '0.3px',
                }}
              >
                {banner.badge}
              </span>
            )}

            {displayTitle && (
              <h3
                className="storefront-mid-banner-title"
                style={{
                  margin: '0 0 6px',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#ffffff',
                  textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  lineHeight: 1.3,
                  maxWidth: '550px',
                }}
              >
                {displayTitle}
              </h3>
            )}

            {displaySubtitle && (
              <p
                className="storefront-mid-banner-sub"
                style={{
                  margin: '0 0 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#cbd5e1',
                  maxWidth: '500px',
                  lineHeight: 1.5,
                  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              >
                {displaySubtitle}
              </p>
            )}

            {isClickable && (
              <div
                className="storefront-mid-banner-cta"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.92)',
                  color: '#0f172a',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>
                  {banner.linkType === 'deals'
                    ? 'تسوق العروض الآن'
                    : targetCategory
                    ? `تصفح ${targetCategory.name}`
                    : 'استكشف الآن'}
                </span>
                <ArrowLeftIcon size={14} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
