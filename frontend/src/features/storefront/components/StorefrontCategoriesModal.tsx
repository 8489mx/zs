import { useState, useMemo } from 'react';
import { StorefrontCategory } from '../types/storefront.types';
import { getAutoProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconFolder, IconClose, IconSearch, IconShoppingBag } from './StorefrontIcons';

interface StorefrontCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: StorefrontCategory[];
  categoryCounts: Map<number | 'all', number>;
  selectedCategoryId: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
}

export function StorefrontCategoriesModal({
  isOpen,
  onClose,
  categories,
  categoryCounts,
  selectedCategoryId,
  onSelectCategory,
}: StorefrontCategoriesModalProps) {
  const [modalSearch, setModalSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!modalSearch.trim()) return categories;
    const q = modalSearch.trim().toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, modalSearch]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconFolder size={20} color="#170e5e" strokeWidth={2} />
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                تصفح أقسام المتجر ({categories.length} قسم)
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconClose size={15} strokeWidth={2.2} />
            </button>
          </div>

          {/* Quick Filter Search Input inside Modal */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="ابحث عن اسم القسم (مثال: صابون، شاي، زيوت، عصافير)..."
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: '#f8fafc',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: '50%',
                right: '12px',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <IconSearch size={15} color="#94a3b8" />
            </span>
          </div>
        </div>

        {/* Robust Grid of Categories (Fixed Heights, Never Squishes) */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Card: All Categories */}
          {!modalSearch && (
            <div
              onClick={() => {
                onSelectCategory('all');
                onClose();
              }}
              style={{
                borderRadius: '12px',
                border: selectedCategoryId === 'all' ? '2px solid #170e5e' : '1px solid #e2e8f0',
                background: selectedCategoryId === 'all' ? '#f0f3ff' : '#f8fafc',
                padding: '14px',
                height: '130px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#170e5e',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
              >
                <IconShoppingBag size={20} color="#ffffff" strokeWidth={2} />
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                جميع المنتجات
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {categoryCounts.get('all') || 0} صنف
              </span>
            </div>
          )}

          {/* Each Category Card with Guaranteed Robust Layout */}
          {filteredCategories.map((cat) => {
            const count = categoryCounts.get(cat.id) || 0;
            const isSelected = selectedCategoryId === cat.id;
            const photoUrl = cat.imageUrl || getAutoProductPhoto(cat.name, cat.name);

            return (
              <div
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                style={{
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  background: '#ffffff',
                  height: '130px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                }}
              >
                {/* Photo Container */}
                <div
                  style={{
                    width: '100%',
                    height: '82px',
                    minHeight: '82px',
                    maxHeight: '82px',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#f1f5f9',
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
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(15,23,42,0.5) 0%, transparent 60%)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '6px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    {count} صنف
                  </span>
                </div>

                {/* Title Container */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 8px',
                    background: isSelected ? '#f0f3ff' : '#ffffff',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      color: isSelected ? '#170e5e' : '#0f172a',
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                    title={cat.name}
                  >
                    {cat.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
