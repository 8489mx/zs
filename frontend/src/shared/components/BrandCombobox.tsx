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
  const containerRef = useRef<HTMLDivElement | null>(null);

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
          onFocus={() => setIsOpen(true)}
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
          onClick={() => setIsOpen(!isOpen)}
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
            filtered.map((b) => {
              const isSelected = value.toLowerCase() === b.en.toLowerCase();
              return (
                <div
                  key={b.en}
                  onClick={() => {
                    onChange(b.en);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    color: isSelected ? '#1d4ed8' : '#1e293b',
                    fontSize: '0.85rem',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{b.en}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{b.ar}</span>
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
