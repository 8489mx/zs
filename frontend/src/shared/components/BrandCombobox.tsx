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

  // Save custom brand to localStorage
  const rememberBrand = (newBrand: string) => {
    if (!newBrand || !newBrand.trim()) return;
    const clean = newBrand.trim();

    // Check if already in presets or saved
    const allPresets = sampleBrands || DEFAULT_MOBILE_BRANDS;
    const isPreset = allPresets.some((b) => b.toLowerCase() === clean.toLowerCase());
    if (isPreset) return;

    const alreadySaved = customBrands.some((b) => b.toLowerCase() === clean.toLowerCase());
    if (alreadySaved) return;

    try {
      const updated = [clean, ...customBrands].slice(0, 50); // keep up to 50
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
      console.warn('Failed to remove custom brand:', err);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Combined and filtered brands
  const allAvailableBrands = useMemo(() => {
    const baseList = sampleBrands && sampleBrands.length > 0 ? sampleBrands : DEFAULT_MOBILE_BRANDS;
    const combined = [...customBrands, ...baseList];
    // Deduplicate (case-insensitive)
    const seen = new Set<string>();
    return combined.filter((item) => {
      const lower = item.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [sampleBrands, customBrands]);

  const filtered = useMemo(() => {
    if (!value || !value.trim()) return allAvailableBrands;
    return allAvailableBrands.filter((b) => matchesArabic(b, value));
  }, [allAvailableBrands, value]);

  // Is exact match?
  const isExactMatch = useMemo(() => {
    if (!value || !value.trim()) return true;
    return allAvailableBrands.some((b) => b.toLowerCase() === value.trim().toLowerCase());
  }, [allAvailableBrands, value]);

  // Keyboard navigation
  useEffect(() => {
    if (filtered.length > 0) {
      const selectedIdx = filtered.findIndex((b) => b.toLowerCase() === value.toLowerCase());
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [value, filtered]);

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
        return;
      }
      setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen && filtered.length > 0 && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        e.preventDefault();
        const selected = filtered[highlightedIndex];
        onChange(selected);
        rememberBrand(selected);
        setIsOpen(false);
      } else if (value.trim()) {
        rememberBrand(value.trim());
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
            fontSize: '0.88rem',
            height: '36px',
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
          className="custom-combobox-dropdown"
          style={{
            top: 'calc(100% + 4px)',
            right: 0,
            width: 'max(100%, 210px)',
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
                  className={`custom-combobox-option ${isHighlighted ? 'is-highlighted' : ''}`}
                  onClick={() => {
                    onChange(brandName);
                    rememberBrand(brandName);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    fontWeight: isHighlighted || isSelected ? 700 : 500,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{brandName}</span>
                    {isCustom && (
                      <span style={{ fontSize: '0.68rem', background: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
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
              className="custom-combobox-create"
              onClick={() => {
                rememberBrand(value.trim());
                setIsOpen(false);
              }}
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>+</span>
                <span>حفظ <strong>"{value.trim()}"</strong></span>
              </div>
              <span style={{ fontSize: '0.65rem', color: '#475569', background: '#ffffff', padding: '1px 5px', borderRadius: '3px', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                Enter ↵
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
