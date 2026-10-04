import { useState, useMemo, useEffect } from 'react';
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

function parseCategory(name: string): { group: string; label: string } {
  if (!name) return { group: 'أقسام عامة', label: 'عام' };
  const trimmed = name.trim();
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { group: parts[0], label: parts.slice(1).join(' - ') };
    }
  }
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return { group: parts[0], label: parts.slice(1).join(' / ') };
    }
  }
  return { group: 'أقسام عامة', label: trimmed };
}

function getFamilyIcon(groupName: string, size = 16) {
  const g = groupName.toLowerCase();
  if (g.includes('صوت') || g.includes('سماع') || g.includes('إكسسوار') || g.includes('اكسسوار') || g.includes('شواحن') || g.includes('كابل')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    );
  }
  if (g.includes('فلاجشيب') || g.includes('flagship') || g.includes('برو') || g.includes('pro')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  if (g.includes('اقتصادي') || g.includes('توفير') || g.includes('مخفّض')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }
  // Default Smartphone
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
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
  const [activeGroup, setActiveGroup] = useState<string>('');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Group categories by family
  const groupedFamilies = useMemo(() => {
    const map = new Map<string, StorefrontCategory[]>();
    for (const cat of categories) {
      const parsed = parseCategory(cat.name);
      const grp = parsed.group;
      if (!map.has(grp)) {
        map.set(grp, []);
      }
      map.get(grp)!.push(cat);
    }
    return Array.from(map.entries()).map(([groupName, cats]) => {
      const totalCount = cats.reduce((sum, c) => sum + (categoryCounts.get(c.id) || 0), 0);
      return {
        groupName,
        categories: cats,
        totalCount,
      };
    });
  }, [categories, categoryCounts]);

  // Initialize or keep active group valid
  useEffect(() => {
    if (groupedFamilies.length > 0 && !activeGroup) {
      setActiveGroup(groupedFamilies[0].groupName);
    }
  }, [groupedFamilies, activeGroup]);

  // Current items to show in the right detail panel
  const displayedCategories = useMemo(() => {
    if (modalSearch.trim()) {
      const q = modalSearch.trim().toLowerCase();
      return categories.filter((c) => c.name.toLowerCase().includes(q));
    }
    const targetGroup = activeGroup || (groupedFamilies[0]?.groupName ?? '');
    const found = groupedFamilies.find((f) => f.groupName === targetGroup);
    return found ? found.categories : categories;
  }, [categories, modalSearch, activeGroup, groupedFamilies]);

  if (!isOpen) return null;

  const totalAllCount = categoryCounts.get('all') || 0;
  const currentFamilyObj = groupedFamilies.find((f) => f.groupName === activeGroup);
  const hasMultipleFamilies = groupedFamilies.length > 1;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(1240px, 95vw)"
      maxHeight="min(88vh, 780px)"
      shellClassName="storefront-cat-modal-shell"
      ariaLabel="جميع أقسام وتصنيفات المتجر"
    >
      <div className="full-bleed storefront-cat-modal-root">
        {/* Top Header Bar: Clean & Integrated */}
        <div className="storefront-cat-modal-header">
          {/* Title Area */}
          <div className="storefront-cat-modal-header-brand">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--storefront-primary-subtle, #f0f3ff)',
                color: 'var(--storefront-primary-color, #170e5e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconFolder size={18} color="var(--storefront-primary-color, #170e5e)" strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '14.5px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                تصفح أقسام المتجر
              </h2>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                {categories.length} قسماً وتصنيفاً معتمداً
              </span>
            </div>
          </div>

          {/* Quick Filter Search Input */}
          <div className="storefront-cat-modal-search-box">
            <input
              type="text"
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              placeholder="ابحث عن اسم القسم أو الماركة..."
              style={{
                width: '100%',
                padding: '8px 36px 8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                background: '#f8fafc',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--storefront-primary-color, #170e5e)')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
            <span
              style={{
                position: 'absolute',
                top: '50%',
                right: '11px',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <IconSearch size={15} color="#94a3b8" />
            </span>
            {modalSearch.trim() && (
              <button
                type="button"
                onClick={() => setModalSearch('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10px',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                مسح
              </button>
            )}
          </div>

          {/* Close Button: Circular, never squashed or oval */}
          <button
            type="button"
            onClick={onClose}
            className="storefront-cat-modal-close-btn"
            title="إغلاق (Esc)"
          >
            <IconClose size={15} strokeWidth={2.2} />
          </button>
        </div>

        {/* Mobile Horizontal Tabs Row (Visible only on <= 640px) */}
        <div className="storefront-cat-modal-mobile-tabs">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              onSelectCategory('all');
              onClose();
            }}
            style={{
              borderStyle: 'dashed',
              borderColor: '#cbd5e1',
              background: '#ffffff',
            }}
            className="storefront-cat-modal-chip"
            title="عرض جميع أصناف المتجر بدون فلترة"
          >
            <IconShoppingBag size={11} strokeWidth={2.2} />
            <span>الكل</span>
            <span className="storefront-cat-modal-chip-badge">{totalAllCount}</span>
          </button>

          {hasMultipleFamilies ? (
            groupedFamilies.map((fam) => {
              const isActive = !modalSearch.trim() && activeGroup === fam.groupName;
              return (
                <button
                  key={fam.groupName}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                    setModalSearch('');
                    setActiveGroup(fam.groupName);
                  }}
                  className={`storefront-cat-modal-chip ${isActive ? 'active' : ''}`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {getFamilyIcon(fam.groupName, 11)}
                  </span>
                  <span>{fam.groupName}</span>
                  <span className="storefront-cat-modal-chip-badge">
                    {fam.categories.length}
                  </span>
                </button>
              );
            })
          ) : (
            categories.map((cat) => {
              const isActive = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  className={`storefront-cat-modal-chip ${isActive ? 'active' : ''}`}
                >
                  <span>{cat.name}</span>
                  <span className="storefront-cat-modal-chip-badge">
                    {categoryCounts.get(cat.id) || 0}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Main Two-Column Split Panel Body */}
        <div className="storefront-cat-modal-body">
          {/* Right Sidebar: Master Category Families (260px) */}
          <div className="storefront-cat-modal-sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Master Item: All Products Button */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: selectedCategoryId === 'all'
                    ? '1.5px solid var(--storefront-primary-color, #170e5e)'
                    : '1px solid #e2e8f0',
                  background: selectedCategoryId === 'all'
                    ? 'var(--storefront-primary-subtle, #f0f3ff)'
                    : '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.15s ease',
                  marginBottom: '6px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--storefront-primary-color, #170e5e)';
                  e.currentTarget.style.transform = 'translateX(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = selectedCategoryId === 'all' ? 'var(--storefront-primary-color, #170e5e)' : '#e2e8f0';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: 'var(--storefront-primary-color, #170e5e)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconShoppingBag size={14} color="#ffffff" strokeWidth={2.2} />
                  </div>
                  <span style={{ fontSize: '12.5px', fontWeight: 800 }}>
                    جميع المنتجات
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: 'var(--storefront-primary-color, #170e5e)',
                    background: '#f1f5f9',
                    padding: '2px 6px',
                    borderRadius: '5px',
                  }}
                >
                  {totalAllCount}
                </span>
              </button>

              {/* Sidebar Section Divider */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#64748b',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ width: '3px', height: '10px', backgroundColor: '#94a3b8', borderRadius: '2px', display: 'inline-block' }} />
                <span>فئات وأقسام المتجر</span>
              </div>

              {/* Category Families or Categories List */}
              {hasMultipleFamilies ? (
                groupedFamilies.map((fam) => {
                  const isActive = !modalSearch.trim() && activeGroup === fam.groupName;
                  return (
                    <button
                      key={fam.groupName}
                      type="button"
                      onClick={() => {
                        setModalSearch('');
                        setActiveGroup(fam.groupName);
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: isActive
                          ? '1px solid var(--storefront-primary-color, #170e5e)'
                          : '1px solid transparent',
                        background: isActive ? 'var(--storefront-primary-color, #170e5e)' : 'transparent',
                        color: isActive ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'right',
                        transition: 'all 0.12s ease',
                        boxShadow: isActive ? '0 2px 8px rgba(23, 14, 94, 0.22)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
                          {getFamilyIcon(fam.groupName)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: isActive ? 800 : 600 }}>
                          {fam.groupName}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                          color: isActive ? '#ffffff' : '#475569',
                        }}
                      >
                        {fam.categories.length}
                      </span>
                    </button>
                  );
                })
              ) : (
                categories.map((cat) => {
                  const count = categoryCounts.get(cat.id) || 0;
                  const isActive = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onSelectCategory(cat.id);
                        onClose();
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: isActive
                          ? '1px solid var(--storefront-primary-color, #170e5e)'
                          : '1px solid transparent',
                        background: isActive ? 'var(--storefront-primary-color, #170e5e)' : 'transparent',
                        color: isActive ? '#ffffff' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'right',
                        transition: 'all 0.12s ease',
                        boxShadow: isActive ? '0 2px 8px rgba(23, 14, 94, 0.22)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
                          {getFamilyIcon(cat.name)}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: isActive ? 800 : 600 }}>
                          {cat.name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: isActive ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                          color: isActive ? '#ffffff' : '#475569',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Left Detail Panel: Dedicated Category Cards Grid */}
          <div className="storefront-cat-modal-content">
            {/* Active Group Header Bar */}
            <div className="storefront-cat-modal-content-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '3px',
                      height: '14px',
                      backgroundColor: 'var(--storefront-primary-color, #170e5e)',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }}
                  />
                  <span>
                    {modalSearch.trim()
                      ? `نتائج البحث عن «${modalSearch}»`
                      : hasMultipleFamilies
                        ? activeGroup
                        : 'أقسام وتصنيفات المتجر'}
                  </span>
                </h3>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '2px', display: 'block' }}>
                  {modalSearch.trim()
                    ? `تم العثور على ${displayedCategories.length} قسماً مطابقاً للبحث`
                    : `اختر القسم لتصفح الأصناف المعروضة (${displayedCategories.length} متاح)`}
                </span>
              </div>

              {!modalSearch.trim() && currentFamilyObj && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#475569',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  إجمالي {currentFamilyObj.totalCount} صنف
                </span>
              )}
            </div>

            {/* Grid of Categories - 5 columns for 5 items, else 4 columns on desktop; 2 columns on mobile */}
            {displayedCategories.length > 0 ? (
              <div className={`storefront-cat-modal-grid ${displayedCategories.length === 5 ? 'five-cols' : ''}`}>
                {displayedCategories.map((cat) => {
                  const count = categoryCounts.get(cat.id) || 0;
                  const isSelected = selectedCategoryId === cat.id;
                  const parsed = parseCategory(cat.name);
                  const photoUrl = cat.imageUrl || getAutoProductPhoto(cat.name, cat.name);
                  const hasRealPhoto = Boolean(cat.imageUrl || (photoUrl && !photoUrl.startsWith('data:image/svg')));

                  return (
                    <div
                      key={cat.id}
                      onClick={() => {
                        onSelectCategory(cat.id);
                        onClose();
                      }}
                      className={`storefront-cat-modal-card ${isSelected ? 'selected' : ''}`}
                    >
                      {/* Photo Container */}
                      <div className="storefront-cat-modal-card-img-box">
                        {hasRealPhoto ? (
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
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--storefront-primary-color, #170e5e)',
                              background: '#f8fafc',
                              width: '100%',
                              height: '100%',
                            }}
                          >
                            <IconFolder size={22} color="var(--storefront-primary-color, #170e5e)" strokeWidth={1.8} />
                          </div>
                        )}

                        {/* Frosted Count Pill on Image */}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            fontSize: '9px',
                            fontWeight: 800,
                            color: '#0f172a',
                            background: 'rgba(255, 255, 255, 0.94)',
                            border: '1px solid rgba(226, 232, 240, 0.9)',
                            backdropFilter: 'blur(4px)',
                            padding: '1px 4px',
                            borderRadius: '4px',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
                          }}
                        >
                          {count} {count === 1 ? 'صنف' : count === 2 ? 'صنفان' : count <= 10 ? 'أصناف' : 'صنف'}
                        </span>
                      </div>

                      {/* Text Container */}
                      <div
                        style={{
                          padding: '4px 6px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          gap: '1px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            color: isSelected ? 'var(--storefront-primary-color, #170e5e)' : '#0f172a',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                          title={cat.name}
                        >
                          {parsed.label}
                        </span>

                        {modalSearch.trim() && parsed.group && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              color: '#64748b',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '100%',
                            }}
                          >
                            {parsed.group}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#64748b',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                <IconFolder size={40} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#334155' }}>
                  لا توجد أقسام تطابق «{modalSearch}»
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#94a3b8' }}>
                  تأكد من كتابة الكلمة بشكل صحيح أو اضغط على «مسح» للعودة.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
