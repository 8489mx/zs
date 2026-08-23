import { useState, useRef, useEffect } from 'react';
import { matchesArabic } from '@/lib/arabic-normalization';

export const POPULAR_UNITS = [
  { name: 'قطعة', hint: 'الوحدة الأساسية' },
  { name: 'علبة', hint: 'مجموعة قطع' },
  { name: 'كرتونة', hint: 'تخزين / شحن' },
  { name: 'باكيت', hint: 'حزمة مغلفة' },
  { name: 'شريط', hint: 'أدوية ومستلزمات' },
  { name: 'زجاجة', hint: 'سوائل ومشروبات' },
  { name: 'كيلو', hint: 'وزن (1000 جم)' },
  { name: 'جرام', hint: 'وزن خفيف' },
  { name: 'لتر', hint: 'حجم سوائل' },
  { name: 'متر', hint: 'أطوال وأقمشة' },
  { name: 'دستة', hint: '12 قطعة' },
  { name: 'زوج', hint: 'قطعتين' },
  { name: 'شيكارة', hint: 'أجولة وحبوب' },
  { name: 'طرد', hint: 'شحن وتوريد' },
  { name: 'برميل', hint: 'كميات كبيرة' },
  { name: 'رول', hint: 'بكر ولفائف' },
  { name: 'كيس', hint: 'تعبئة' },
  { name: 'صندوق', hint: 'تعبئة خشب/كرتون' },
  { name: 'بلتة', hint: 'شحنة لوجستية' },
  { name: 'طبق', hint: 'أغذية' },
  { name: 'متر مربع', hint: 'مساحات وسيراميك' },
  { name: 'متر مكعب', hint: 'حجوم وأخشاب' },
];

interface UnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function UnitCombobox({ value, onChange, placeholder = 'اختر أو اكتب...', disabled = false, style }: UnitComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep search term in sync when value changes externally while closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value || '');
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If search term matches the current value exactly or is empty, show ALL units
  const isExactCurrent = searchTerm.trim() === value.trim();
  const isSearching = Boolean(searchTerm.trim()) && !isExactCurrent;

  const filtered = POPULAR_UNITS.filter((u) => {
    if (!isSearching) return true;
    return matchesArabic(u.name, searchTerm) || matchesArabic(u.hint, searchTerm);
  });

  const hasExactPresetMatch = POPULAR_UNITS.some(
    (u) => matchesArabic(u.name, searchTerm) && u.name.trim().toLowerCase() === searchTerm.trim().toLowerCase()
  );

  useEffect(() => {
    if (filtered.length > 0) {
      const selectedIdx = filtered.findIndex((u) => u.name.trim() === value.trim());
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [searchTerm, filtered.length, value]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

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
      e.preventDefault();
      if (isOpen && filtered.length > 0 && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        handleSelectUnit(filtered[highlightedIndex].name);
      } else if (searchTerm.trim()) {
        handleSelectUnit(searchTerm.trim());
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
        handleSelectUnit(filtered[highlightedIndex].name);
      }
      setIsOpen(false);
    }
  };

  const handleSelectUnit = (unitName: string) => {
    onChange(unitName);
    setSearchTerm(unitName);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : value}
          placeholder={placeholder}
          className="purchase-prototype-field-input"
          style={{
            width: '100%',
            background: disabled ? '#f8fafc' : '#ffffff',
            padding: '8px 28px 8px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            boxSizing: 'border-box',
            fontSize: '0.88rem',
            height: '36px',
            cursor: disabled ? 'not-allowed' : 'text',
            ...style,
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            setSearchTerm(value || '');
            inputRef.current?.select();
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            const nextOpen = !isOpen;
            setIsOpen(nextOpen);
            if (nextOpen) {
              inputRef.current?.focus();
              inputRef.current?.select();
            }
          }}
          style={{
            position: 'absolute',
            left: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: disabled ? 'default' : 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: 'transform 0.18s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>

      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="custom-combobox-dropdown"
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            width: 'max(100%, 210px)',
          }}
        >
          {filtered.length > 0 ? (
            <>
              {filtered.map((u, index) => {
                const isSelected = value.trim() === u.name.trim();
                const isHighlighted = highlightedIndex === index;
                return (
                  <div
                    key={u.name}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={`custom-combobox-option ${isHighlighted ? 'is-highlighted' : ''}`}
                    onClick={() => handleSelectUnit(u.name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      fontWeight: isHighlighted || isSelected ? 700 : 500,
                    }}
                  >
                    <span>{u.name}</span>
                    <span style={{ fontSize: '0.74rem', color: isHighlighted ? '#475569' : '#64748b' }}>{u.hint}</span>
                  </div>
                );
              })}

              {/* If custom input typed and not exact preset */}
              {isSearching && !hasExactPresetMatch && (
                <div
                  className="custom-combobox-create"
                  onClick={() => handleSelectUnit(searchTerm.trim())}
                  style={{
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>+</span>
                    <span>استخدام <strong>"{searchTerm}"</strong> كوحدة</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#475569', background: '#ffffff', padding: '1px 5px', borderRadius: '3px', border: '1px solid #cbd5e1', flexShrink: 0 }}>
                    Enter ↵
                  </span>
                </div>
              )}
            </>
          ) : (
            <div
              className="custom-combobox-create"
              onClick={() => handleSelectUnit(searchTerm.trim())}
              style={{
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>+</span>
                <span>استخدام <strong>"{searchTerm}"</strong> كوحدة</span>
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
