import { useState, useMemo } from 'react';
import {
  PRODUCT_SVG_ICONS,
  PRODUCT_ICON_CATEGORIES,
  ProductIcon,
} from './product-svg-catalog';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SearchIcon } from './AppIcons';

interface ProductIconPickerProps {
  value?: string | null;
  onChange: (iconId: string) => void;
  industry?: string | null;
  disabled?: boolean;
}

export function ProductIconPicker({
  value,
  onChange,
  industry,
  disabled = false,
}: ProductIconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Default active category to the industry if it matches a known category
  const initialCategory = useMemo(() => {
    if (industry && PRODUCT_ICON_CATEGORIES.some((c) => c.id === industry)) {
      return industry;
    }
    return 'all';
  }, [industry]);

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);

  const selectedIcon = useMemo(() => {
    if (!value) return null;
    return PRODUCT_SVG_ICONS.find((i) => i.id === value) || null;
  }, [value]);

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return PRODUCT_SVG_ICONS.filter((icon) => {
      const matchesCategory = activeCategory === 'all' || icon.category === activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        icon.id.toLowerCase().includes(query) ||
        icon.name.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, activeCategory]);

  function getDisplayTitle(name: string): string {
    if (!name) return '';
    const parts = name.split(' و');
    if (parts.length > 1 && parts[0].length >= 3) {
      return parts[0].trim();
    }
    const words = name.split(/\s+/);
    if (words.length <= 3) return name;
    return words.slice(0, 3).join(' ');
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        title={selectedIcon ? `أيقونة الصنف: ${selectedIcon.name} (اضغط للتغيير)` : 'اختر أيقونة الصنف (SVG)'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '34px',
          padding: 0,
          background: value ? '#eff6ff' : '#f8fafc',
          border: value ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease',
          color: value ? '#1d4ed8' : '#94a3b8',
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <ProductIcon name={value || 'box-package'} size={18} color={value ? '#1d4ed8' : '#94a3b8'} />
      </button>

      {/* Clear Icon Button */}
      {value && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange('');
          }}
          title="إزالة الأيقونة"
          style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            border: '1px solid #fca5a5',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            zIndex: 2,
          }}
        >
          ✕
        </button>
      )}

      {/* Modal Dialog */}
      <DialogShell
        open={isOpen}
        onClose={() => setIsOpen(false)}
        ariaLabel="مكتبة أيقونات الأصناف"
        width="min(760px, 95vw)"
      >
        <div style={{ padding: '16px 20px 8px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>مكتبة أيقونات الأصناف (SVG فائقة الخفة)</h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>اختر أيقونة معبرة عن الصنف لتمييزه سريعاً في شاشات الكاشير والمبيعات</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{ border: 'none', background: '#f1f5f9', color: '#64748b', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 16px 20px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن أيقونة (مثال: بهارات، قهوة، تيشيرت، عطر، موبايل، علاج)..."
              autoFocus
              className="purchase-prototype-field-input"
              style={{
                width: '100%',
                height: '40px',
                paddingInlineStart: '38px',
                paddingInlineEnd: searchQuery ? '32px' : '14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                insetInlineStart: '12px',
                color: '#94a3b8',
                display: 'flex',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon size={16} />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  insetInlineEnd: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'thin',
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: !value ? '1px solid #fca5a5' : '1px dashed #cbd5e1',
                cursor: 'pointer',
                background: !value ? '#fef2f2' : '#ffffff',
                color: !value ? '#dc2626' : '#64748b',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              بدون أيقونة
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeCategory === 'all' ? '#170c5c' : '#f1f5f9',
                color: activeCategory === 'all' ? '#ffffff' : '#475569',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              الكل ({PRODUCT_SVG_ICONS.length})
            </button>
            {PRODUCT_ICON_CATEGORIES.map((cat) => {
              const count = PRODUCT_SVG_ICONS.filter((i) => i.category === cat.id).length;
              const isActive = activeCategory === cat.id;
              const isTenantIndustry = industry === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    border: isTenantIndustry && !isActive ? '1px solid #93c5fd' : 'none',
                    cursor: 'pointer',
                    background: isActive ? '#170c5c' : isTenantIndustry ? '#eff6ff' : '#f1f5f9',
                    color: isActive ? '#ffffff' : isTenantIndustry ? '#1d4ed8' : '#475569',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{cat.title}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>({count})</span>
                  {isTenantIndustry && <span style={{ fontSize: '0.65rem', background: '#3b82f6', color: '#fff', borderRadius: '4px', padding: '1px 4px' }}>نشاطك</span>}
                </button>
              );
            })}
          </div>

          {/* Icons Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '10px',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '6px',
            }}
          >
            {filteredIcons.map((icon) => {
              const isSelected = value === icon.id;
              const displayTitle = getDisplayTitle(icon.name);
              return (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => {
                    onChange(icon.id);
                    setIsOpen(false);
                  }}
                  title={icon.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 6px',
                    minHeight: '84px',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                    overflow: 'hidden',
                    boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.1)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: isSelected ? '#dbeafe' : '#f8fafc',
                      color: isSelected ? '#1d4ed8' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {icon.svg({ size: 22, color: isSelected ? '#1d4ed8' : '#334155' })}
                  </div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#1d4ed8' : '#334155',
                      lineHeight: 1.25,
                      maxWidth: '100%',
                      padding: '0 2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayTitle}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.85rem' }}>
              لا توجد أيقونات تطابق بحثك "{searchQuery}"
            </div>
          )}
        </div>
      </DialogShell>
    </div>
  );
}
