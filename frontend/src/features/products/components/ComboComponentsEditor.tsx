import React, { useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';
import type { Product } from '@/types/domain';

export interface ComboComponentData {
  productId: number;
  quantity: number;
}

interface ComboComponentsEditorProps {
  value: ComboComponentData[];
  onChange: (value: ComboComponentData[]) => void;
  products: Product[];
  disabled?: boolean;
}

function ComboProductSelect({ productId, onSelectProduct, options, disabled }: { productId: number, onSelectProduct: (id: number) => void, options: any[], disabled?: boolean }) {
  const selectedOption = options.find(o => o.id === String(productId));
  const [query, setQuery] = React.useState(selectedOption?.label || '');

  React.useEffect(() => {
    if (productId) {
      const opt = options.find(o => o.id === String(productId));
      if (opt) setQuery(opt.label);
    } else {
      setQuery('');
    }
  }, [productId, options]);

  return (
    <SearchableCombobox
      options={options}
      value={query}
      onChange={setQuery}
      onSelect={(opt) => {
        setQuery(opt.label);
        onSelectProduct(Number(opt.id));
      }}
      placeholder="ابحث عن المكون..."
      disabled={disabled}
      search={(option, q) => (option.label || '').toLowerCase().includes(q.toLowerCase())}
      getLabel={(option) => option.label || ''}
      inputClassName="purchase-prototype-field-input"
    />
  );
}

export function ComboComponentsEditor({ value, onChange, products, disabled }: ComboComponentsEditorProps) {
  const addLine = () => {
    onChange([...value, { productId: 0, quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  const updateLine = (index: number, key: keyof ComboComponentData, val: any) => {
    const next = [...value];
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  };

  const options = useMemo(() => {
    return products.map(p => ({ id: String(p.id), label: p.name }));
  }, [products]);

  const totalComponentsPrice = useMemo(() => {
    return value.reduce((sum, line) => {
      const p = products.find(prod => String(prod.id) === String(line.productId));
      const price = Number(p?.retailPrice || 0);
      return sum + (price * Number(line.quantity || 1));
    }, 0);
  }, [value, products]);

  return (
    <div className="combo-components-editor" style={{ marginTop: 16 }}>
      {value.length > 0 && (
        <table className="document-prototype-table" style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right' }}>المكون (الصنف الفرعي)</th>
              <th style={{ width: 120, textAlign: 'center' }}>الكمية</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {value.map((line, idx) => (
              <tr key={idx}>
                <td>
                  <ComboProductSelect
                    options={options}
                    productId={line.productId}
                    onSelectProduct={(id) => updateLine(idx, 'productId', id)}
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="purchase-prototype-field-input"
                    style={{ textAlign: 'center' }}
                    min="0.0001"
                    step="1"
                    value={line.quantity || ''}
                    onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value) || 0)}
                    disabled={disabled}
                  />
                </td>
                <td style={{ textAlign: 'center' }}>
                  <Button type="button" variant="secondary" onClick={() => removeLine(idx)} disabled={disabled} style={{ color: '#ef4444', padding: '4px 8px' }}>
                    حذف
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Button type="button" variant="secondary" onClick={addLine} disabled={disabled}>
          + إضافة مكون جديد
        </Button>
        {totalComponentsPrice > 0 && (
          <div style={{ fontSize: 13, background: 'rgba(59, 130, 246, 0.08)', padding: '6px 14px', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.2)', color: '#1e40af' }}>
            إجمالي أسعار المكونات الفردية قبل العرض: <strong>{totalComponentsPrice.toFixed(2)} ج.م</strong>
          </div>
        )}
      </div>
    </div>
  );
}
