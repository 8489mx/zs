import { useState, useMemo } from 'react';
import { StorefrontCategory } from '../types/storefront.types';
import { getAutoProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';
import { IconFolder, IconClose, IconSearch, IconShoppingBag } from './StorefrontIcons';
import { DialogShell } from '@/shared/components/dialog-shell';

interface StorefrontCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: StorefrontCategory[];
  categoryCounts: Map<number | 'all', number>;
  selectedCategoryId: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
}

function parseCategoryLabel(name: string): { main: string; sub?: string } {
  if (!name) return { main: 'عام' };
  const trimmed = name.trim();
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { main: parts[parts.length - 1], sub: parts.slice(0, -1).join(' - ') };
    }
  }
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { main: parts[parts.length - 1], sub: parts.slice(0, -1).join(' / ') };
    }
  }
  return { main: trimmed };
}

function getCategoryColorTheme(subOrMain?: string) {
  const text = (subOrMain || '').toLowerCase();
  if (text.includes('فلاجشيب') || text.includes('flagship') || text.includes('apple') || text.includes('ايفون') || text.includes('آيفون')) {
    return { bg: '#f3e8ff', color: '#7e22ce', border: '#e9d5ff' };
  }
  if (text.includes('اقتصادي') || text.includes('شاومي') || text.includes('xiaomi') || text.includes('realme') || text.includes('infinix')) {
    return { bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
  }
  if (text.includes('إكسسوار') || text.includes('شواحن') || text.includes('كابل') || text.includes('صوت')) {
    return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
  }
  if (text.includes('samsung') || text.includes('سامسونج') || text.includes('honor') || text.includes('oppo')) {
    return { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
  }
  return { bg: '#eef2ff', color: '#3730a3', border: '#c7d2fe' };
}

function getCategoryMonogram(name: string): string {
  if (!name) return 'GP';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
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
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, number>();
    for (const cat of categories) {
      const parsed = parseCategoryLabel(cat.name);
      if (parsed.sub) {
        groups.set(parsed.sub, (groups.get(parsed.sub) || 0) + 1);
      }
    }
    if (groups.size < 2) return [];
    return Array.from(groups.entries()).map(([name, count]) => ({ name, count }));
  }, [categories]);

  const filteredCategories = useMemo(() => {
    let result = categories;
    if (selectedGroup !== 'all') {
      result = result.filter((c) => {
        const parsed = parseCategoryLabel(c.name);
        return parsed.sub === selectedGroup;
      });
    }
    if (modalSearch.trim()) {
      const q = modalSearch.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [categories, modalSearch, selectedGroup]);

  if (!isOpen) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(920px, 96vw)"
      ariaLabel="جميع أقسام وتصنيفات المتجر"
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* Header with Search and Group Pills */}
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
              <IconFolder size={20} color="var(--storefront-primary-color, #170e5e)" strokeWidth={2} />
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
              placeholder="ابحث عن اسم القسم أو الماركة (مثال: آبل، سامسونج، شواحن، كابلات)..."
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

          {/* Category Group Family Pills (if multiple families exist) */}
          {categoryGroups.length > 0 && !modalSearch.trim() && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '2px',
                scrollbarWidth: 'none',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedGroup('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedGroup === 'all' ? 'var(--storefront-primary-color, #170e5e)' : '#f1f5f9',
                  color: selectedGroup === 'all' ? 'var(--storefront-primary-contrast, #ffffff)' : '#475569',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                الكل ({categories.length})
              </button>
              {categoryGroups.map((grp) => {
                const isGrpActive = selectedGroup === grp.name;
                return (
                  <button
                    key={grp.name}
                    type="button"
                    onClick={() => setSelectedGroup(grp.name)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: isGrpActive ? 'var(--storefront-primary-color, #170e5e)' : '#f1f5f9',
                      color: isGrpActive ? 'var(--storefront-primary-contrast, #ffffff)' : '#475569',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {grp.name} ({grp.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Robust Grid of Categories (Fixed Heights, Brand-First Hierarchy) */}
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
          {!modalSearch && selectedGroup === 'all' && (
            <div
              onClick={() => {
                onSelectCategory('all');
                onClose();
              }}
              style={{
                borderRadius: '12px',
                border: selectedCategoryId === 'all' ? '2px solid var(--storefront-primary-color, #170e5e)' : '1px solid #e2e8f0',
                background: selectedCategoryId === 'all' ? 'var(--storefront-primary-subtle, #f0f3ff)' : '#f8fafc',
                padding: '14px',
                height: '136px',
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
                  background: 'var(--storefront-primary-color, #170e5e)',
                  color: 'var(--storefront-primary-contrast, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
              >
                <IconShoppingBag size={20} color="var(--storefront-primary-contrast, #ffffff)" strokeWidth={2} />
              </div>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                جميع المنتجات
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {categoryCounts.get('all') || 0} صنف
              </span>
            </div>
          )}

          {/* Each Category Card with Distinct Brand-First Layout */}
          {filteredCategories.map((cat) => {
            const count = categoryCounts.get(cat.id) || 0;
            const isSelected = selectedCategoryId === cat.id;
            const parsed = parseCategoryLabel(cat.name);
            const colorTheme = getCategoryColorTheme(parsed.sub || parsed.main);
            const photoUrl = cat.imageUrl || getAutoProductPhoto(cat.name, cat.name);
            const hasRealPhoto = Boolean(cat.imageUrl || (photoUrl && !photoUrl.startsWith('data:image/svg')));

            return (
              <div
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  onClose();
                }}
                style={{
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--storefront-primary-color, #170e5e)' : '1px solid #e2e8f0',
                  background: '#ffffff',
                  height: '136px',
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
                {/* Photo / Distinct Squircle Badge Container */}
                <div
                  style={{
                    width: '100%',
                    height: '82px',
                    minHeight: '82px',
                    maxHeight: '82px',
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    background: hasRealPhoto ? '#f1f5f9' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {hasRealPhoto ? (
                    <>
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
                          background: 'linear-gradient(to top, rgba(15,23,42,0.45) 0%, transparent 60%)',
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
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '13px',
                          background: colorTheme.bg,
                          border: `1.5px solid ${colorTheme.border}`,
                          color: colorTheme.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 800,
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {getCategoryMonogram(parsed.main)}
                      </div>
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#64748b',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        {count} صنف
                      </span>
                    </>
                  )}
                </div>

                {/* Title Container: Brand-First & Clear Hierarchy */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 8px',
                    background: isSelected ? 'var(--storefront-primary-subtle, #f0f3ff)' : '#ffffff',
                    textAlign: 'center',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: isSelected ? 'var(--storefront-primary-color, #170e5e)' : '#0f172a',
                      lineHeight: '1.25',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                    title={cat.name}
                  >
                    {parsed.main}
                  </span>
                  {parsed.sub ? (
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: '#64748b',
                        lineHeight: '1.2',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {parsed.sub}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DialogShell>
  );
}
