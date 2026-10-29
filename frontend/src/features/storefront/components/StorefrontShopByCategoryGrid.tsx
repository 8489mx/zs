import { useTranslation } from 'react-i18next';
import React from 'react';
import type { StorefrontCategory, StorefrontProduct } from '../types/storefront.types';
import { resolveProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconArrowUpRight } from './StorefrontIcons';

interface StorefrontShopByCategoryGridProps {
  categories: StorefrontCategory[];
  products?: StorefrontProduct[];
  categoryCounts?: Map<number | 'all', number>;
  onSelectCategory: (categoryId: number) => void;
  onOpenCategoriesModal?: () => void;
  onSelectDeals?: () => void;
}

interface VibrantTileTheme {
  id: string;
  gradient: string;
  textColor: string;
  badgeBg: string;
  badgeColor: string;
}

const TILE_THEMES: VibrantTileTheme[] = [
  {
    id: 'coral',
    gradient: 'linear-gradient(135deg, #ffa49c 0%, #ffc0b8 48%, #ffe4e6 100%)',
    textColor: '#881337',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#be123c',
  },
  {
    id: 'mint',
    gradient: 'linear-gradient(135deg, #7eedc4 0%, #a7f5d6 48%, #e1fbf2 100%)',
    textColor: '#065f46',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#047857',
  },
  {
    id: 'peach',
    gradient: 'linear-gradient(135deg, #ffb37e 0%, #ffcda5 48%, #fed7aa 100%)',
    textColor: '#7c2d12',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#c2410c',
  },
  {
    id: 'sky',
    gradient: 'linear-gradient(135deg, #7ec0ff 0%, #a4cefe 48%, #dbeafe 100%)',
    textColor: '#0c4a6e',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#0369a1',
  },
  {
    id: 'lavender',
    gradient: 'linear-gradient(135deg, #c4b5fd 0%, #ddd6fe 48%, #ede9fe 100%)',
    textColor: '#4c1d95',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#6d28d9',
  },
  {
    id: 'amber',
    gradient: 'linear-gradient(135deg, #fcd34d 0%, #fde68a 48%, #fef3c7 100%)',
    textColor: '#78350f',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#b45309',
  },
  {
    id: 'slate',
    gradient: 'linear-gradient(135deg, #cbd5e1 0%, #e2e8f0 48%, #f1f5f9 100%)',
    textColor: '#0f172a',
    badgeBg: 'rgba(255, 255, 255, 0.88)',
    badgeColor: '#334155',
  },
  {
    id: 'indigo',
    gradient: 'linear-gradient(135deg, #a5b4fc 0%, #c7d2fe 48%, #e0e7ff 100%)',
    textColor: '#1e1b4b',
    badgeBg: 'rgba(255, 255, 255, 0.82)',
    badgeColor: '#4338ca',
  },
];

export const StorefrontShopByCategoryGrid = React.memo(function StorefrontShopByCategoryGrid({
  categories = [],
  products = [],
  categoryCounts,
  onSelectCategory,
  onOpenCategoriesModal,
  onSelectDeals,
}: StorefrontShopByCategoryGridProps) {
  const { t } = useTranslation();

  // Curate 8 seamless tiles: populated categories first, then smart curated discovery collections
  const tilesData = React.useMemo(() => {
    const validCats = categories.filter((c) => c && c.name);
    const sorted = [...validCats].sort((a, b) => {
      const cntA = categoryCounts?.get(a.id) || 0;
      const cntB = categoryCounts?.get(b.id) || 0;
      return cntB - cntA;
    });

    const items: Array<{
      id: number;
      name: string;
      photo: string;
      count?: number;
      isDeals?: boolean;
    }> = [];

    for (let i = 0; i < sorted.length && items.length < 8; i++) {
      const cat = sorted[i];
      const count = categoryCounts?.get(cat.id);
      const catProduct = products?.find((p) => p.categoryId === cat.id || p.categoryName === cat.name);
      const photo =
        cat.imageUrl && !cat.imageUrl.startsWith('data:image/svg+xml')
          ? cat.imageUrl
          : catProduct?.imageUrl ||
            resolveProductPhoto(catProduct?.name || cat.name, cat.name)?.url ||
            generatePremiumProductSvg(cat.name, cat.name);

      items.push({
        id: cat.id,
        name: cat.name,
        photo,
        count,
      });
    }

    // If fewer than 8 categories exist, fill to 8 with smart discovery collections
    const discoveryFillers = [
      {
        id: -1,
        name: 'عروض وتخفيضات اليوم',
        isDeals: true,
      },
      {
        id: -2,
        name: 'الأكثر طلباً ومبيعاً',
        isDeals: true,
      },
      {
        id: -3,
        name: 'وصل حديثاً للمتجر',
        isDeals: false,
      },
    ];

    let fillerIdx = 0;
    while (items.length < 8 && fillerIdx < discoveryFillers.length) {
      const filler = discoveryFillers[fillerIdx++];
      const fillerProduct = products?.[fillerIdx];
      const photo =
        fillerProduct?.imageUrl ||
        resolveProductPhoto(fillerProduct?.name || filler.name, filler.name)?.url ||
        generatePremiumProductSvg(filler.name, filler.name);

      items.push({
        id: filler.id,
        name: filler.name,
        photo,
        count: undefined,
        isDeals: filler.isDeals,
      });
    }

    return items;
  }, [categories, products, categoryCounts]);

  if (!tilesData || tilesData.length === 0) {
    return null;
  }

  return (
    <section
      className="storefront-section-card storefront-shop-by-cat-section"
      aria-label={t('storefront.shop_by_cat.title', 'تسوق حسب القسم')}
      style={{
        background: '#ffffff',
        borderRadius: '36px',
        border: '1px solid #edf1f7',
        padding: '28px 24px 24px',
        boxShadow: '0 10px 30px -6px rgba(15, 23, 42, 0.04), 0 2px 8px -2px rgba(15, 23, 42, 0.02)',
        margin: '16px 0',
        direction: 'rtl',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        .sf-cat-tiles-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .sf-cat-tile {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          height: 122px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.24s ease;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
        }

        .sf-cat-tile:hover {
          transform: translate3d(0, -4px, 0);
          box-shadow: 0 12px 24px -4px rgba(15, 23, 42, 0.12);
        }

        .sf-cat-tile:active {
          transform: scale3d(0.97, 0.97, 1);
        }

        .sf-cat-tile-img {
          width: 78px;
          height: 78px;
          object-fit: contain;
          transform: translate3d(0, 0, 0);
          transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.15));
          pointer-events: none;
        }

        .sf-cat-tile:hover .sf-cat-tile-img {
          transform: scale(1.09);
        }

        @media (max-width: 1100px) {
          .sf-cat-tiles-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .sf-cat-tiles-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .sf-cat-tile {
            height: 108px;
            padding: 12px 14px;
            border-radius: 18px;
          }
          .sf-cat-tile-img {
            width: 66px;
            height: 66px;
          }
        }

        @media (max-width: 480px) {
          .sf-cat-tiles-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .sf-cat-tile {
            height: 100px;
            padding: 10px 12px;
            border-radius: 16px;
          }
          .sf-cat-tile-img {
            width: 56px;
            height: 56px;
          }
          .sf-cat-tile-title {
            font-size: 13.5px !important;
          }
        }
      `}</style>

      {/* Header Row: Shop By Category & View All */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '18px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
          gap: '12px',
          flexWrap: 'nowrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.2px',
              lineHeight: 1.25,
            }}
          >
            {t('storefront.shop_by_cat.title', 'تسوق حسب القسم')}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onOpenCategoriesModal) {
              onOpenCategoriesModal();
            } else if (onSelectDeals) {
              onSelectDeals();
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#f97316',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            padding: 0,
            transition: 'color 0.16s ease, transform 0.16s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ea580c';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#f97316';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <span>{t('storefront.shop_by_cat.view_all', 'عرض كل الأقسام')}</span>
          <IconArrowUpRight size={14} strokeWidth={2.4} />
        </button>
      </div>

      {/* 8 Vibrant Blended Seamless Category Tiles Grid (Zero Line in Middle) */}
      <div className="sf-cat-tiles-grid">
        {tilesData.map((item, idx) => {
          const theme = TILE_THEMES[idx % TILE_THEMES.length];

          return (
            <div
              key={`${item.id}-${idx}`}
              className="sf-cat-tile"
              onClick={() => {
                if (item.isDeals && onSelectDeals) {
                  onSelectDeals();
                } else if (item.id > 0) {
                  onSelectCategory(item.id);
                } else if (onSelectDeals) {
                  onSelectDeals();
                }
                window.scrollTo({ top: 220, behavior: 'smooth' });
              }}
              style={{
                background: theme.gradient,
              }}
            >
              {/* Text Side (Right in RTL) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  zIndex: 2,
                  minWidth: 0,
                  flex: '1 1 auto',
                  gap: '6px',
                  paddingInlineEnd: '10px',
                }}
              >
                <h3
                  className="sf-cat-tile-title"
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 800,
                    color: theme.textColor,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {item.name}
                </h3>

                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: theme.badgeColor,
                    background: theme.badgeBg,
                    padding: '2.5px 8.5px',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    border: '1px solid rgba(255, 255, 255, 0.65)',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <span>{t('storefront.shop_by_cat.explore', 'تسوق الآن')}</span>
                  <span style={{ fontSize: '10px' }}>←</span>
                </span>
              </div>

              {/* Photo Showcase (Left in RTL) with 100% Feathered Radial Ambient Glow (Zero Hard Split Line) */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.46) 0%, rgba(255, 255, 255, 0) 72%)',
                }}
              >
                <img
                  className="sf-cat-tile-img"
                  src={item.photo || generatePremiumProductSvg(item.name, item.name)}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = generatePremiumProductSvg(item.name, item.name);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
