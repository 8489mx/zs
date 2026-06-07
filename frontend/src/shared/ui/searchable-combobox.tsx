import { CSSProperties, KeyboardEvent, RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Field } from '@/shared/ui/field';

export type ComboboxOption = {
  id: string;
};

type SearchableComboboxProps<T extends ComboboxOption> = {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: T[];
  search: (option: T, query: string) => boolean;
  getLabel: (option: T) => string;
  getMeta?: (option: T) => string | undefined;
  onSelect: (option: T) => void;
  onCreate?: (query: string) => void;
  createLabel: (query: string) => string;
  emptyLabel?: string;
  error?: string;
  inputId?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  forceOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  inline?: boolean;
  minSearchLength?: number;
  searchOnSingleDigit?: boolean;
  idleHelperLabel?: string;
  showIdleHelper?: boolean;
  showDropdownOnEmpty?: boolean;
};

const containsDigitLikeCharacter = (value: string) => /[0-9٠-٩۰-۹]/.test(value);

export function SearchableCombobox<T extends ComboboxOption>({
  label,
  placeholder,
  value,
  onChange,
  options,
  search,
  getLabel,
  getMeta,
  onSelect,
  onCreate,
  createLabel,
  emptyLabel = 'لا توجد نتائج',
  error,
  inputId,
  inputRef,
  className,
  inputClassName,
  dropdownClassName,
  forceOpen,
  onOpenChange,
  onKeyDown,
  inline = false,
  minSearchLength = 0,
  searchOnSingleDigit = false,
  idleHelperLabel,
  showIdleHelper = true,
  showDropdownOnEmpty = true
}: SearchableComboboxProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);

  const isOpen = forceOpen ?? open;
  const normalizedValue = value.trim();
  const hasDigitLikeSearch = containsDigitLikeCharacter(value);
  const hasSearchIntent = normalizedValue.length >= minSearchLength || (searchOnSingleDigit && hasDigitLikeSearch);
  const filteredOptions = useMemo(
    () => (hasSearchIntent ? options.filter((option) => search(option, value)).slice(0, 8) : []),
    [hasSearchIntent, options, search, value]
  );
  const showCreate = Boolean(onCreate && normalizedValue && hasSearchIntent && filteredOptions.length === 0);
  const optionCount = filteredOptions.length + (showCreate ? 1 : 0);

  const getAnchorElement = () => inputRef?.current ?? (rootRef.current?.querySelector('input') as HTMLInputElement | null);

  const updateDropdownPosition = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const anchor = getAnchorElement();
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const viewportWidth = window.innerWidth;
    const maxDropdownWidth = Math.max(120, viewportWidth - viewportPadding * 2);
    const dropdownWidth = Math.min(Math.max(200, Math.round(rect.width)), maxDropdownWidth);
    const maxLeft = Math.max(viewportPadding, viewportWidth - dropdownWidth - viewportPadding);
    const left = Math.min(Math.max(Math.round(rect.left), viewportPadding), maxLeft);
    const top = Math.round(rect.bottom + gap);
    const maxHeight = Math.max(160, Math.round(window.innerHeight - rect.bottom - 16));

    setDropdownStyle({
      position: 'fixed',
      left,
      top,
      width: dropdownWidth,
      maxHeight,
      zIndex: 1200
    });
  };

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        onOpenChange?.(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      setDropdownStyle(null);
      return;
    }

    if (filteredOptions.length > 0) {
      setHighlightedIndex(0);
      return;
    }

    setHighlightedIndex(-1);
  }, [isOpen, filteredOptions.length, showCreate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();
    const rafId = window.requestAnimationFrame(updateDropdownPosition);
    const handleViewportChange = () => {
      window.requestAnimationFrame(updateDropdownPosition);
    };

    document.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [inputRef, isOpen, normalizedValue, filteredOptions.length, showCreate]);

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  const openDropdown = () => {
    updateDropdownPosition();
    setOpen(true);
    onOpenChange?.(true);
  };

  const selectOption = (option: T) => {
    onSelect(option);
    onChange(getLabel(option));
    close();
  };

  const createOption = () => {
    if (!onCreate) {
      close();
      return;
    }

    onCreate(value);
    close();
  };

  const currentOpen = forceOpen ?? open;
  const hasCreateRow = Boolean(showCreate);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!currentOpen) {
        openDropdown();
      }
      setHighlightedIndex((index) => {
        const maxIndex = Math.max(optionCount - 1, 0);
        if (index < 0) {
          return 0;
        }

        return Math.min(index + 1, maxIndex);
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, -1));
      return;
    }

    if (event.key === 'Enter') {
      const highlightedOption = highlightedIndex >= 0 ? filteredOptions[highlightedIndex] : undefined;
      if (highlightedOption) {
        event.preventDefault();
        selectOption(highlightedOption);
        return;
      }

      if (hasCreateRow && highlightedIndex === filteredOptions.length) {
        event.preventDefault();
        createOption();
      }
    }
  };

  const shouldRenderDropdown = currentOpen && dropdownStyle && (showDropdownOnEmpty || hasSearchIntent);
  const dropdown = shouldRenderDropdown ? createPortal(
    <div
      ref={dropdownRef}
      className={`purchase-prototype-combobox-dropdown ${dropdownClassName ?? ''}`.trim()}
      role="listbox"
      aria-label={label}
      style={dropdownStyle}
    >
      {filteredOptions.length ? (
        <>
          {filteredOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={`purchase-prototype-combobox-option${index === highlightedIndex ? ' is-highlighted' : ''}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectOption(option)}
            >
              <span className="purchase-prototype-combobox-option-title">{getLabel(option)}</span>
              {getMeta?.(option) ? <span className="purchase-prototype-combobox-option-meta">{getMeta(option)}</span> : null}
            </button>
          ))}
          {hasCreateRow ? (
            <button
              type="button"
              className={`purchase-prototype-combobox-create${highlightedIndex === filteredOptions.length ? ' is-highlighted' : ''}`}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
              onClick={createOption}
            >
              {createLabel(value)}
            </button>
          ) : null}
        </>
      ) : hasSearchIntent ? (
        <div className="purchase-prototype-combobox-empty">
          <span>{emptyLabel}</span>
          {hasCreateRow ? (
            <button
              type="button"
              className={`purchase-prototype-combobox-create${highlightedIndex === filteredOptions.length ? ' is-highlighted' : ''}`}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
              onClick={createOption}
            >
              {createLabel(value)}
            </button>
          ) : null}
        </div>
      ) : showIdleHelper ? (
        <div className="purchase-prototype-combobox-empty purchase-prototype-combobox-helper">
          <span>{idleHelperLabel ?? 'ابدأ بالكتابة لعرض النتائج'}</span>
        </div>
      ) : null}
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`purchase-prototype-combobox ${inline ? 'is-inline' : ''} ${className ?? ''}`.trim()}
    >
      {inline ? (
        <input
          ref={inputRef}
          id={inputId}
          className={inputClassName}
          aria-invalid={Boolean(error)}
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={currentOpen}
          onChange={(event) => {
            onChange(event.target.value);
            openDropdown();
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <Field label={label ?? ''} error={error}>
          <input
            ref={inputRef}
            id={inputId}
            className={inputClassName}
            aria-invalid={Boolean(error)}
            value={value}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={currentOpen}
            onChange={(event) => {
              onChange(event.target.value);
              openDropdown();
            }}
            onFocus={openDropdown}
            onKeyDown={handleKeyDown}
          />
        </Field>
      )}
      {dropdown}
    </div>
  );
}
