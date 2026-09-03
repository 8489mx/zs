import { StorefrontCategory } from '../types/storefront.types';

interface StorefrontCategoryPillsProps {
  categories: StorefrontCategory[];
  selectedCategoryId: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
  categoryCounts: Map<number | 'all', number>;
}

function getCategoryIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('شاي')) return '🍵';
  if (n.includes('بن') || n.includes('قهو')) return '☕';
  if (n.includes('عطارة') || n.includes('اعشاب') || n.includes('توابل')) return '🌿';
  if (n.includes('بقاله') || n.includes('تموين')) return '🛒';
  if (n.includes('البان') || n.includes('جبن')) return '🧀';
  if (n.includes('ازياء') || n.includes('ملابس')) return '👕';
  if (n.includes('موبايل') || n.includes('الكتروني')) return '📱';
  if (n.includes('عطور')) return '✨';
  if (n.includes('عصافير') || n.includes('طيور')) return '🦜';
  if (n.includes('ميزان')) return '⚖️';
  if (n.includes('حلويات') || n.includes('شوكولاته')) return '🍫';
  if (n.includes('مخبوزات') || n.includes('عيش')) return '🥐';
  return '📦';
}

export function StorefrontCategoryPills({
  categories,
  selectedCategoryId,
  onSelectCategory,
  categoryCounts,
}: StorefrontCategoryPillsProps) {
  const allCount = categoryCounts.get('all') || 0;

  return (
    <div
      style={{
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff',
        padding: '14px 0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* 'All' Pill */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            border: selectedCategoryId === 'all' ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
            background: selectedCategoryId === 'all' ? '#0f172a' : '#f8fafc',
            color: selectedCategoryId === 'all' ? '#ffffff' : '#334155',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
            boxShadow: selectedCategoryId === 'all' ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
          }}
        >
          <span>🏷️</span>
          <span>جميع الأصناف</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '999px',
              background: selectedCategoryId === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
              color: selectedCategoryId === 'all' ? '#ffffff' : '#64748b',
              fontWeight: 800,
            }}
          >
            {allCount}
          </span>
        </button>

        {/* Dynamic Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = categoryCounts.get(cat.id) || 0;
          const icon = getCategoryIcon(cat.name);

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: isSelected ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                background: isSelected ? '#0f172a' : '#f8fafc',
                color: isSelected ? '#ffffff' : '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.background = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#f8fafc';
                }
              }}
            >
              <span>{icon}</span>
              <span>{cat.name}</span>
              {count > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#64748b',
                    fontWeight: 800,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
