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
      // Highlight the selected item if present in filtered list
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
      if (filtered.length > 0) {
        setHighlightedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
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
          const selected = filtered[highlightedIndex].name;
          onChange(selected);
          setSearchTerm(selected);
        } else if (searchTerm.trim()) {
          onChange(searchTerm.trim());
        }
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setSearchTerm(value);
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'Tab') {
      if (isOpen && filtered.length > 0 && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
        const selected = filtered[highlightedIndex].name;
        onChange(selected);
        setSearchTerm(selected);
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
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="purchase-prototype-field-input"
          value={searchTerm}
          disabled={disabled}
          onChange={(e) => {
            const nextVal = e.target.value;
            setSearchTerm(nextVal);
            onChange(nextVal);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={(e) => {
            if (!disabled) {
              setIsOpen(true);
              e.target.select();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '34px',
            background: '#fff',
            padding: '4px 26px 4px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            boxSizing: 'border-box',
            fontSize: '0.86rem',
            fontWeight: 600,
            ...style,
          }}
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
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            minWidth: '200px',
            zIndex: 1200,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.14), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '4px',
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
                    onClick={() => handleSelectUnit(u.name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      background: isHighlighted ? '#e0e7ff' : isSelected ? '#eff6ff' : 'transparent',
                      color: isHighlighted ? '#1e40af' : isSelected ? '#1d4ed8' : '#1e293b',
                      fontSize: '0.84rem',
                      fontWeight: isHighlighted || isSelected ? 700 : 500,
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{u.name}</span>
                    <span style={{ fontSize: '0.74rem', color: isHighlighted ? '#2563eb' : '#64748b' }}>{u.hint}</span>
                  </div>
                );
              })}

              {/* If custom input typed and not exact preset */}
              {isSearching && !hasExactPresetMatch && (
                <div
                  onClick={() => handleSelectUnit(searchTerm.trim())}
                  style={{
                    marginTop: '4px',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    color: '#2563eb',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: '#eff6ff',
                    borderTop: '1px dashed #bfdbfe',
                    borderRadius: '5px',
                    fontWeight: 700,
                  }}
                >
                  + استخدام <strong>"{searchTerm}"</strong> كوحدة مخصصة ↵
                </div>
              )}
            </>
          ) : (
            <div
              onClick={() => handleSelectUnit(searchTerm.trim())}
              style={{
                padding: '8px 10px',
                fontSize: '0.82rem',
                color: '#2563eb',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#eff6ff',
                borderRadius: '5px',
                fontWeight: 700,
              }}
            >
              + استخدام <strong>"{searchTerm}"</strong> كوحدة مخصصة ↵
            </div>
          )}
        </div>
      )}
    </div>
  );
}
