import { useTranslation } from 'react-i18next';
import { useRef, useEffect } from 'react';
import { StorefrontCategory } from '../types/storefront.types';
import { generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconShoppingBag, IconFolder } from './StorefrontIcons';

interface StorefrontCategoryShowcaseProps {
  categories: StorefrontCategory[];
  selectedCategoryId: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
  onOpenCategoriesModal: () => void;
  categoryCounts: Map<number | 'all', number>;
}

function formatSmartCategoryName(categoryName?: string): string {
  if (!categoryName) return 'عام';
  const trimmed = categoryName.trim();
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  if (trimmed.includes(': ')) {
    const parts = trimmed.split(': ').map((p) => p.trim()).filter(Boolean);
    return parts[parts.length - 1] || trimmed;
  }
  return trimmed;
}

export function StorefrontCategoryShowcase({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoriesModal,
  categoryCounts,
}: StorefrontCategoryShowcaseProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedCategoryId !== 'all' && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedCategoryId]);

  if (!categories || categories.length === 0) return null;

  // Filter only categories that have products, and take top 10 sorted by count
  const populatedCategories = categories
    .filter((c) => (categoryCounts.get(c.id) || 0) > 0)
    .sort((a, b) => (categoryCounts.get(b.id) || 0) - (categoryCounts.get(a.id) || 0));

  const topCategories = populatedCategories.slice(0, 10);
  const remainingCount = populatedCategories.length - topCategories.length;

  return (
    <div
      ref={containerRef}
      className="storefront-cat-showcase"
      style={{
        background: '#ffffff',
        borderBottom: 'none',
        borderRadius: '26px',
        border: '1px solid #edf1f7',
        boxShadow: '0 4px 18px rgba(15, 23, 42, 0.03)',
        padding: '16px 20px 10px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        direction: 'rtl',
        maxWidth: 'var(--storefront-container, 1440px)',
        margin: '0 auto 12px',
        width: 'calc(100% - 32px)',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .storefront-cat-showcase {
            width: calc(100% - 16px) !important;
            margin: 0 auto 8px !important;
            border-radius: 18px !important;
            padding: 10px 12px 6px !important;
            box-sizing: border-box !important;
          }
          .storefront-cat-showcase-inner {
            justify-content: flex-start !important;
            gap: 12px !important;
            width: max-content !important;
            min-width: 100% !important;
            padding-inline: 2px !important;
          }
          .storefront-cat-item {
            min-width: 60px !important;
          }
          .storefront-cat-avatar {
            width: 52px !important;
            height: 52px !important;
            border-radius: 16px !important;
            margin-bottom: 5px !important;
          }
          .storefront-cat-label {
            font-size: 11px !important;
          }
        }
      `}</style>
      <div
        className="storefront-cat-showcase-inner storefront-category-showcase"
        style={{
          maxWidth: 'var(--storefront-container, 1440px)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '32px',
          width: 'max-content',
          minWidth: '100%',
        }}
      >
        {/* All Products Rounded-Square Avatar */}
        <div
          className="storefront-cat-item"
          onClick={() => onSelectCategory('all')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            cursor: 'pointer',
            minWidth: '84px',
            flexShrink: 0,
            transition: 'transform 0.18s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div
            className="storefront-cat-avatar"
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              background: selectedCategoryId === 'all' ? 'var(--storefront-primary-color, #2d68c4)' : '#ffffff',
              color: selectedCategoryId === 'all' ? '#ffffff' : 'var(--storefront-primary-color, #2d68c4)',
              border: selectedCategoryId === 'all' ? '2px solid var(--storefront-primary-color, #2d68c4)' : '1.5px solid #E0E3E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              boxSizing: 'border-box',
              boxShadow:
                selectedCategoryId === 'all'
                  ? '0 6px 16px var(--storefront-primary-subtle, rgba(45, 104, 196, 0.22))'
                  : '0 2px 6px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            <IconShoppingBag
              size={24}
              color={selectedCategoryId === 'all' ? '#ffffff' : '#2d68c4'}
              strokeWidth={2}
            />
          </div>
          <span
            className="storefront-cat-label"
            style={{
              fontSize: '12.5px',
              fontWeight: 500,
              lineHeight: 1.35,
              color: '#0f172a',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            الكل
          </span>
        </div>

        {/* Top 10 Curated Category Rounded-Square Cards */}
        {topCategories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const photoUrl =
            cat.imageUrl && !cat.imageUrl.startsWith('data:image/svg+xml')
              ? cat.imageUrl
              : generatePremiumProductSvg(cat.name, cat.name);

          return (
            <div
              key={cat.id}
              ref={isSelected ? selectedItemRef : undefined}
              className="storefront-cat-item"
              onClick={() => onSelectCategory(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                minWidth: '84px',
                flexShrink: 0,
                transition: 'transform 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                className="storefront-cat-avatar"
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: isSelected ? '2px solid var(--storefront-primary-color, #2d68c4)' : '1.5px solid #E0E3E7',
                  marginBottom: '8px',
                  boxShadow: isSelected
                    ? '0 6px 16px var(--storefront-primary-subtle, rgba(45, 104, 196, 0.22))'
                    : '0 2px 6px rgba(15, 23, 42, 0.04)',
                  position: 'relative',
                  background: '#ffffff',
                  padding: '4px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <img
                  src={photoUrl}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = generatePremiumProductSvg(cat.name, cat.name);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '13px',
                    pointerEvents: 'none',
                    transition: 'transform 0.3s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
              </div>
              <span
                className="storefront-cat-label"
                style={{
                  fontSize: '12.5px',
                  fontWeight: 500,
                  lineHeight: 1.35,
                  color: '#0f172a',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
                title={cat.name}
              >
                {formatSmartCategoryName(cat.name)}
              </span>
            </div>
          );
        })}

        {/* "More Categories" Rounded-Square Avatar */}
        {remainingCount > 0 && (
          <div
            className="storefront-cat-item"
            onClick={onOpenCategoriesModal}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              cursor: 'pointer',
              minWidth: '84px',
              flexShrink: 0,
              transition: 'transform 0.18s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div
              className="storefront-cat-avatar"
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '18px',
                background: '#ffffff',
                color: '#0f172a',
                border: '1.5px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                boxSizing: 'border-box',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <IconFolder size={22} color="#0f172a" strokeWidth={1.8} />
            </div>
            <span
              className="storefront-cat-label"
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                lineHeight: 1.35,
                color: '#0f172a',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {t('storefront.storefront_category_showcase.s2', 'باقي الأقسام')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
