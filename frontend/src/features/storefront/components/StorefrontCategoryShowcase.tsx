import { StorefrontCategory } from '../types/storefront.types';
import { getAutoProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconShoppingBag, IconFolder } from './StorefrontIcons';

interface StorefrontCategoryShowcaseProps {
  categories: StorefrontCategory[];
  selectedCategoryId: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
  onOpenCategoriesModal: () => void;
  categoryCounts: Map<number | 'all', number>;
}

export function StorefrontCategoryShowcase({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoriesModal,
  categoryCounts,
}: StorefrontCategoryShowcaseProps) {
  if (!categories || categories.length === 0) return null;

  // Filter only categories that have products, and take top 10 sorted by count
  const populatedCategories = categories
    .filter((c) => (categoryCounts.get(c.id) || 0) > 0)
    .sort((a, b) => (categoryCounts.get(b.id) || 0) - (categoryCounts.get(a.id) || 0));

  const topCategories = populatedCategories.slice(0, 10);
  const remainingCount = populatedCategories.length - topCategories.length;

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        direction: 'rtl',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* All Products Avatar */}
        <div
          onClick={() => onSelectCategory('all')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            minWidth: '70px',
            flexShrink: 0,
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: selectedCategoryId === 'all' ? '#170e5e' : '#f1f5f9',
              color: selectedCategoryId === 'all' ? '#ffffff' : '#170e5e',
              border: selectedCategoryId === 'all' ? '2.5px solid #170e5e' : '1.5px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
            }}
          >
            <IconShoppingBag size={22} color={selectedCategoryId === 'all' ? '#ffffff' : '#170e5e'} strokeWidth={2} />
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 800,
              color: selectedCategoryId === 'all' ? '#170e5e' : '#475569',
              textAlign: 'center',
            }}
          >
            الكل ({categoryCounts.get('all') || 0})
          </span>
        </div>

        {/* Top 10 Curated Category Circles */}
        {topCategories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const photoUrl = cat.imageUrl || getAutoProductPhoto(cat.name, cat.name);
          const count = categoryCounts.get(cat.id) || 0;

          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                minWidth: '70px',
                maxWidth: '85px',
                flexShrink: 0,
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: isSelected ? '2.5px solid #170e5e' : '1.5px solid #cbd5e1',
                  marginBottom: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  position: 'relative',
                }}
              >
                <img
                  src={photoUrl}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = generatePremiumProductSvg(cat.name, cat.name);
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isSelected ? 800 : 700,
                  color: isSelected ? '#170e5e' : '#1e293b',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  width: '100%',
                }}
                title={cat.name}
              >
                {cat.name}
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                {count} صنف
              </span>
            </div>
          );
        })}

        {/* "More Categories" Avatar */}
        {remainingCount > 0 && (
          <div
            onClick={onOpenCategoriesModal}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              minWidth: '70px',
              flexShrink: 0,
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#f8fafc',
                color: '#170e5e',
                border: '1.5px dashed #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
              }}
            >
              <IconFolder size={20} color="#170e5e" strokeWidth={1.8} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#170e5e',
                textAlign: 'center',
              }}
            >
              باقي الأقسام
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              +{remainingCount} قسم
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
