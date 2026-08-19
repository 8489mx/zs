import { useState, useRef, useEffect } from 'react';
import { matchesArabic } from '@/lib/arabic-normalization';

const POPULAR_BRANDS = [
  { en: 'Apple', ar: 'آبل / آيفون' },
  { en: 'Samsung', ar: 'سامسونج' },
  { en: 'Xiaomi', ar: 'شاومي / ريدمي' },
  { en: 'Oppo', ar: 'أوبو' },
  { en: 'Realme', ar: 'ريلمي' },
  { en: 'Vivo', ar: 'فيفو' },
  { en: 'Huawei', ar: 'هواوي' },
  { en: 'Honor', ar: 'هونر' },
  { en: 'Infinix', ar: 'إنفينيكس' },
  { en: 'Poco', ar: 'بوكو' },
  { en: 'OnePlus', ar: 'ون بلس' },
  { en: 'Nokia', ar: 'نوكيا' },
  { en: 'Google Pixel', ar: 'جوجل بيكسل' },
  { en: 'Motorola', ar: 'موتورولا' },
];

interface BrandComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function BrandCombobox({ value, onChange, placeholder = '...Apple, Samsung', style }: BrandComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = POPULAR_BRANDS.filter(
    (b) =>
      !value ||
      matchesArabic(b.en, value) ||
      matchesArabic(b.ar, value)
  );

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
          onChange(filtered[highlightedIndex].en);
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
        onChange(filtered[highlightedIndex].en);
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
            maxHeight: '210px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((b, index) => {
              const isSelected = value.toLowerCase() === b.en.toLowerCase();
              const isHighlighted = highlightedIndex === index;
              return (
                <div
                  key={b.en}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => {
                    onChange(b.en);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    background: isHighlighted ? '#e0e7ff' : isSelected ? '#eff6ff' : 'transparent',
                    color: isHighlighted ? '#1e40af' : isSelected ? '#1d4ed8' : '#1e293b',
                    fontSize: '0.85rem',
                    fontWeight: isHighlighted ? 600 : 400,
                    transition: 'background 0.12s ease',
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{b.en}</span>
                  <span style={{ fontSize: '0.75rem', color: isHighlighted ? '#3b82f6' : '#64748b' }}>{b.ar}</span>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: '8px 10px',
                fontSize: '0.8rem',
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              استخدام <strong>"{value}"</strong> كماركة مخصصة
            </div>
          )}
        </div>
      )}
    </div>
  );
}
