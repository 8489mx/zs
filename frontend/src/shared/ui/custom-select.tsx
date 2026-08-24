import React, { useState, useRef, useEffect, useMemo } from 'react';
import { matchesArabic } from '@/lib/arabic-normalization';

export interface SelectOption {
  value: string | number;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  options: readonly SelectOption[] | SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  disabled = false,
  style,
  className = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value ?? ''));
  }, [options, value]);

  // Sync display text when value changes and closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.label : '');
    }
  }, [value, selectedOption, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Reset query back to selected label if user typed something but didn't select
        setQuery(selectedOption ? selectedOption.label : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  // Filter options based on typed query
  const isSearching = isOpen && query.trim() !== '' && query.trim() !== (selectedOption?.label || '');
  const filteredOptions = useMemo(() => {
    if (!isSearching) return options;
    return options.filter(
      (opt) => matchesArabic(opt.label, query) || (opt.hint && matchesArabic(opt.hint, query))
    );
  }, [options, query, isSearching]);

  // Highlight selection
  useEffect(() => {
    if (filteredOptions.length > 0) {
      const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value ?? ''));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions.length, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt: SelectOption) => {
    onChange(String(opt.value));
    setQuery(opt.label);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
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
      if (isOpen && filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery(selectedOption ? selectedOption.label : '');
      }
      return;
    }

    if (e.key === 'Tab') {
      if (isOpen && filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${className}`.trim()}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div style={{ position: 'relative' }}>
        {selectedOption?.icon && !isSearching && (
          <div
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {selectedOption.icon}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          name="custom_select_search_field"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          className="purchase-prototype-field-input"
          style={{
            width: '100%',
            height: '34px',
            background: disabled ? '#f8fafc' : '#ffffff',
            padding: selectedOption?.icon && !isSearching ? '6px 26px 6px 32px' : '6px 26px 6px 10px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            boxSizing: 'border-box',
            fontSize: '0.82rem',
            color: '#0f172a',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'text',
            textAlign: 'right',
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            inputRef.current?.select();
          }}
          onClick={() => {
            if (disabled) return;
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        {/* Chevron Toggle Button */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            const next = !isOpen;
            setIsOpen(next);
            if (next) {
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
            padding: '3px',
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

      {/* Floating Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="custom-combobox-dropdown"
          style={{
            top: 'calc(100% + 4px)',
            right: 0,
            width: 'max(100%, 190px)',
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const isSelected = String(opt.value) === String(value ?? '');
              const isHighlighted = highlightedIndex === index;

              return (
                <div
                  key={String(opt.value)}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={`custom-combobox-option ${isHighlighted ? 'is-highlighted' : ''}`}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    fontWeight: isSelected || isHighlighted ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    {opt.icon && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          background: isSelected ? '#170c5c' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#334155',
                          flexShrink: 0,
                        }}
                      >
                        {opt.icon}
                      </span>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                  </div>
                  {opt.hint && (
                    <span style={{ fontSize: '0.72rem', color: '#64748b', flexShrink: 0 }}>{opt.hint}</span>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '8px 10px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
              لا توجد نتائج
            </div>
          )}
        </div>
      )}
    </div>
  );
}
