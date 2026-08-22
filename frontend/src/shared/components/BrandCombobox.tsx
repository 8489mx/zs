import { useState, useRef, useEffect, useMemo } from 'react';
import { matchesArabic } from '@/lib/arabic-normalization';

const DEFAULT_MOBILE_BRANDS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'Oppo',
  'Realme',
  'Vivo',
  'Huawei',
  'Honor',
  'Infinix',
  'Poco',
  'OnePlus',
  'Nokia',
  'Google Pixel',
  'Motorola',
];

export interface BrandComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categoryKey?: string;
  sampleBrands?: string[];
  placeholder?: string;
  style?: React.CSSProperties;
}

export function BrandCombobox({
  value,
  onChange,
  categoryKey = 'general',
  sampleBrands,
  placeholder = 'اختر أو اكتب الماركة...',
  style,
}: BrandComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const storageKey = `zs_saved_brands_${categoryKey}`;

  // Load saved custom brands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomBrands(parsed);
        }
      } else {
        setCustomBrands([]);
      }
    } catch (e) {
      console.warn('Failed to load saved brands:', e);
    }
  }, [storageKey]);

  // Combine default profile brands + saved custom brands
  const allBrands = useMemo(() => {
    const base = sampleBrands && sampleBrands.length > 0 ? sampleBrands : DEFAULT_MOBILE_BRANDS;
    const combined = [...base];
    for (const b of customBrands) {
      if (!combined.some((item) => item.toLowerCase() === b.toLowerCase())) {
        combined.push(b);
      }
    }
    return combined;
  }, [sampleBrands, customBrands]);

  // Save new custom brand to memory
  const rememberBrand = (newBrand: string) => {
    const trimmed = newBrand.trim();
    if (!trimmed) return;
    if (allBrands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) return;

    try {
      const updated = [trimmed, ...customBrands].slice(0, 50);
      setCustomBrands(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save custom brand:', e);
    }
  };

  const removeCustomBrand = (brandToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = customBrands.filter((b) => b.toLowerCase() !== brandToRemove.toLowerCase());
      setCustomBrands(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to delete custom brand:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Auto-save typed custom brand on blur if non-empty
        if (value && value.trim().length > 1) {
          rememberBrand(value.trim());
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    if (!value || !value.trim()) return allBrands;
    return allBrands.filter((b) => matchesArabic(b, value));
  }, [allBrands, value]);

  const isExactMatch = allBrands.some((b) => b.toLowerCase() === (value || '').trim().toLowerCase());

  useEffect(() => {
    if (filtered.length > 0) {
      setHighlightedIndex(0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [value, filtered.length]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filtered.length - 1);
        return;
      }
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (filtered.length > 0 && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          const selected = filtered[highlightedIndex];
          onChange(selected);
          rememberBrand(selected);
        } else if (value.trim()) {
          rememberBrand(value.trim());
        }
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'Tab') {
      if (isOpen && filtered.length > 0 && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        const selected = filtered[highlightedIndex];
        onChange(selected);
        rememberBrand(selected);
      }
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="purchase-prototype-field-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (filtered.length > 0 && highlightedIndex === -1) {
              setHighlightedIndex(0);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            background: '#fff',
            padding: '8px 30px 8px 12px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            boxSizing: 'border-box',
            fontSize: '0.9rem',
            ...style,
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (!isOpen && filtered.length > 0) setHighlightedIndex(0);
          }}
          style={{
            position: 'absolute',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1100,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((brandName, index) => {
              const isSelected = value.toLowerCase() === brandName.toLowerCase();
              const isHighlighted = highlightedIndex === index;
              const isCustom = customBrands.some((cb) => cb.toLowerCase() === brandName.toLowerCase());

              return (
                <div
                  key={brandName}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => {
                    onChange(brandName);
                    rememberBrand(brandName);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isHighlighted ? '#e0e7ff' : isSelected ? '#eff6ff' : 'transparent',
                    color: isHighlighted ? '#1e40af' : isSelected ? '#1d4ed8' : '#1e293b',
                    fontSize: '0.85rem',
                    fontWeight: isHighlighted || isSelected ? 700 : 500,
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{brandName}</span>
                    {isCustom && (
                      <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        محفوظة
                      </span>
                    )}
                  </div>

                  {isCustom ? (
                    <button
                      type="button"
                      title="حذف من الماركات المحفوظة"
                      onClick={(e) => removeCustomBrand(brandName, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '11px',
                        padding: '2px 4px',
                        borderRadius: '3px',
                      }}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : null}

          {!isExactMatch && value.trim().length > 0 && (
            <div
              onClick={() => {
                rememberBrand(value.trim());
                setIsOpen(false);
              }}
              style={{
                padding: '8px 10px',
                fontSize: '0.8rem',
                color: '#2563eb',
                background: '#f8fafc',
                borderRadius: '6px',
                cursor: 'pointer',
                textAlign: 'center',
                borderTop: '1px solid #f1f5f9',
                marginTop: '2px',
                fontWeight: 600,
              }}
            >
              + حفظ <strong>"${value.trim()}"</strong> كماركة جديدة
            </div>
          )}
        </div>
      )}
    </div>
  );
}
