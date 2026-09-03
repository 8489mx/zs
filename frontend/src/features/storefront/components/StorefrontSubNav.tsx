import { StorefrontCategory } from '../types/storefront.types';
import { IconGrid, IconFlame, IconCheckCircle, IconClose } from './StorefrontIcons';

interface StorefrontSubNavProps {
  categories: StorefrontCategory[];
  selectedCategoryId: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
  onOpenCategoriesModal: () => void;
  onlyDeals: boolean;
  onToggleDeals: () => void;
  inStockOnly: boolean;
  onToggleInStock: () => void;
  dealsCount: number;
}

export function StorefrontSubNav({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoriesModal,
  onlyDeals,
  onToggleDeals,
  inStockOnly,
  onToggleInStock,
  dealsCount,
}: StorefrontSubNavProps) {
  const selectedCat = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* Left Side: Category Drawer Button + Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Main "Browse Categories" Button */}
          <button
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
          <button
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

          {/* In Stock Only Pill */}
          <button
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
        </div>

        {/* Right Side: Active Selection Breadcrumb / Reset */}
        {selectedCat ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>القسم الحالي:</span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#170e5e',
                background: '#f0f3ff',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #d8e0fc',
              }}
            >
              {selectedCat.name}
            </span>
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>إلغاء</span>
              <IconClose size={12} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
            تصفح المتجر حسب الأقسام
          </div>
        )}
      </div>
    </div>
  );
}
