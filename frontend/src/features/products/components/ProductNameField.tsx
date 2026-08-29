import React, { useMemo, useState } from 'react';
import type { Product } from '@/types/domain';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { normalizeArabicSearchKey } from '@/lib/arabic-normalization';

const normalizeLookupText = (value: unknown) => normalizeArabicSearchKey(value);

export interface ProductNameFieldProps {
  value: string;
  onChange: (v: string) => void;
  allProducts: Product[];
  disabled?: boolean;
  label: string;
  placeholder?: string;
  error?: string;
  iconPicker?: React.ReactNode;
}

export function ProductNameField({
  value,
  onChange,
  allProducts,
  disabled,
  label,
  placeholder,
  error,
  iconPicker,
}: ProductNameFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const similarProducts = useMemo(() => {
    const q = normalizeLookupText(value);
    if (!q || q.length < 2) return [];
    return allProducts.filter((p) => normalizeLookupText(p.name).includes(q)).slice(0, 6);
  }, [value, allProducts]);

  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ position: 'relative', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {iconPicker}
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            className="purchase-prototype-field-input"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            disabled={disabled}
            placeholder={placeholder}
            style={{ width: '100%' }}
          />
          {showSuggestions && similarProducts.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: '#fff',
              border: '1px solid #fbbf24',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              marginTop: 4,
              maxHeight: 200,
              overflowY: 'auto',
              padding: 4,
            }}>
              <div style={{ padding: '6px 10px', fontSize: 12, color: '#92400e', background: '#fffbeb', borderRadius: 6, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangleIcon size={14} color="#d97706" /> أصناف مشابهة موجودة مسبقاً:
              </div>
              {similarProducts.map((p) => (
                <div key={p.id} style={{ padding: '6px 10px', fontSize: 13, color: '#374151', borderRadius: 6 }}>
                  <strong>{p.name}</strong>
                  {p.barcode ? <span style={{ color: '#9ca3af', marginRight: 8, fontSize: 11 }}>{p.barcode}</span> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
