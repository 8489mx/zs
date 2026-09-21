import { StorefrontCategory } from '../types/storefront.types';
import { IconGrid, IconFlame, IconCheckCircle, IconClose } from './StorefrontIcons';

interface StorefrontSubNavProps {
  categories: StorefrontCategory[];
  selectedCategoryId?: number | 'all';
  onSelectCategory?: (id: number | 'all') => void;
  onOpenCategoriesModal: () => void;
  onlyDeals: boolean;
  onToggleDeals: () => void;
  inStockOnly: boolean;
  onToggleInStock: () => void;
  dealsCount: number;
  onlyFavorites?: boolean;
  onToggleFavorites?: () => void;
  favoritesCount?: number;
  onClearFilters?: () => void;
}

export function StorefrontSubNav({
  categories,
  onOpenCategoriesModal,
  onlyDeals,
  onToggleDeals,
  inStockOnly,
  onToggleInStock,
  dealsCount,
  onlyFavorites = false,
  onToggleFavorites,
  favoritesCount = 0,
  onClearFilters,
}: StorefrontSubNavProps) {
  return (
    <div
      className="storefront-subnav"
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          .storefront-subnav {
            padding: 6px 10px !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .storefront-subnav::-webkit-scrollbar {
            display: none;
          }
          .storefront-subnav-inner {
            flex-wrap: nowrap !important;
            gap: 8px !important;
            width: max-content !important;
            min-width: 100% !important;
          }
          .storefront-subnav-pills {
            flex-wrap: nowrap !important;
            gap: 6px !important;
            flex-shrink: 0 !important;
          }
          .storefront-subnav-active-cat {
            flex-shrink: 0 !important;
          }
          .storefront-subnav-pill {
            padding: 7px 11px !important;
            font-size: 11.5px !important;
            white-space: nowrap;
            min-height: 34px;
            border-radius: 7px !important;
          }
          .storefront-subnav-hint {
            display: none !important;
          }
        }
      `}</style>
      <div
        className="storefront-subnav-inner storefront-subnav-shell"
        style={{
          maxWidth: 'var(--storefront-container, 1440px)',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left Side: Category Drawer Button + Filter Pills */}
        <div className="storefront-subnav-pills" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Main "Browse Categories" Button */}
          <button
            className="storefront-subnav-pill"
            type="button"
            onClick={onOpenCategoriesModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#110a47')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#170e5e')}
          >
            <IconGrid size={15} strokeWidth={2.2} />
            <span>تصفح الأقسام</span>
            <span
              style={{
                fontSize: '11px',
                background: 'rgba(255,255,255,0.22)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              {categories.length}
            </span>
          </button>

          {/* Deals Pill */}
          {(dealsCount > 0 || onlyDeals) && (
            <button
              className="storefront-subnav-pill"
              type="button"
              onClick={onToggleDeals}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: onlyDeals ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                background: onlyDeals ? '#fef2f2' : '#ffffff',
                color: onlyDeals ? '#dc2626' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <IconFlame size={14} color={onlyDeals ? '#dc2626' : '#ef4444'} strokeWidth={2} />
              <span>عروض وتخفيضات</span>
              {dealsCount > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    background: onlyDeals ? '#ef4444' : '#fee2e2',
                    color: onlyDeals ? '#ffffff' : '#991b1b',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 800,
                  }}
                >
                  {dealsCount}
                </span>
              )}
            </button>
          )}

          {/* In Stock Only Pill */}
          <button
            className="storefront-subnav-pill"
            type="button"
            onClick={onToggleInStock}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: inStockOnly ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
              background: inStockOnly ? '#f0fdf4' : '#ffffff',
              color: inStockOnly ? '#166534' : '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <IconCheckCircle size={14} color={inStockOnly ? '#16a34a' : '#94a3b8'} strokeWidth={2} />
            <span>المتوفر بالمخزن</span>
          </button>

          {/* Favorites Filter Pill */}
          {onToggleFavorites && (
            <button
              className="storefront-subnav-pill"
              type="button"
              onClick={onToggleFavorites}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: onlyFavorites ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                background: onlyFavorites ? '#fef2f2' : '#ffffff',
                color: onlyFavorites ? '#dc2626' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={onlyFavorites || favoritesCount > 0 ? '#ef4444' : 'none'}
                stroke={onlyFavorites || favoritesCount > 0 ? '#ef4444' : '#94a3b8'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>المفضلة</span>
              {favoritesCount > 0 && (
                <span
                  style={{
                    fontSize: '10.5px',
                    background: onlyFavorites ? '#ef4444' : '#fee2e2',
                    color: onlyFavorites ? '#ffffff' : '#991b1b',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    fontWeight: 800,
                  }}
                >
                  {favoritesCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Left Side (RTL End): Clean Reset Button if any filter is active */}
        {(onlyFavorites || onlyDeals || inStockOnly) ? (
          onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '5px 10px',
                borderRadius: '7px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = '#fca5a5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#64748b';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <IconClose size={12} strokeWidth={2.5} />
              <span>مسح التصفية</span>
            </button>
          ) : null
        ) : (
          <div className="storefront-subnav-hint" style={{ fontSize: '11.5px', color: '#64748b' }}>
            تصفح المتجر حسب الأقسام
          </div>
        )}
      </div>
    </div>
  );
}
