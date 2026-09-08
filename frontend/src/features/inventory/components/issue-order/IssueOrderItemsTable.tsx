import React from 'react';
import { LineItem } from './types';
import { AsyncSearchableCombobox } from '@/shared/ui/async-searchable-combobox';
import { SearchableCombobox } from '@/shared/ui/searchable-combobox';

interface IssueOrderItemsTableProps {
  lines: LineItem[];
  fromLocationId: string;
  products: any[];
  locationOptions: { id: string; name: string; searchTerms: string }[];
  productOptions: { id: string; name: string; code: string; searchTerms: string }[];
  fetchProductOptions: (query: string) => Promise<{ id: string; name: string; code: string; searchTerms: string }[]>;
  stocks: any[];
  onSelectProduct: (lineId: number, product: { id: string; name: string }) => void;
  onUpdateLine: (lineId: number, field: keyof LineItem, value: any) => void;
  onRemoveLine: (lineId: number) => void;
  onQtyKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, lineId: number) => void;
}

export const IssueOrderItemsTable: React.FC<IssueOrderItemsTableProps> = ({
  lines,
  fromLocationId,
  products,
  locationOptions,
  productOptions,
  fetchProductOptions,
  stocks,
  onSelectProduct,
  onUpdateLine,
  onRemoveLine,
  onQtyKeyDown,
}) => {
  return (
    <div className="purchase-prototype-desktop-table">
      <div className="purchase-prototype-items-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table className="purchase-prototype-items-table" style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead style={{ backgroundColor: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '280px' }}>الصنف (بحث بالاسم أو الباركود)</th>
              {fromLocationId === 'all' && (
                <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '180px' }}>مخزن الصرف</th>
              )}
              <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '130px' }}>الكمية المتاحة (بالمخزن)</th>
              <th style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontWeight: 600, width: '120px' }}>الكمية المصروفة</th>
              <th style={{ padding: '10px 14px', width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const product = products.find(p => String(p.id) === line.productId);
              let availableStock = '-';

              if (product) {
                const locId = fromLocationId === 'all' ? line.fromLocationId : fromLocationId;

                if (locId && locId !== 'all') {
                  const locStock = stocks.find(s => String(s.productId) === String(line.productId) && String(s.locationId) === String(locId));
                  if (locStock) {
                    const remaining = Math.max(0, locStock.qty - (line.qty || 0));
                    availableStock = String(remaining);
                  } else {
                    availableStock = '0';
                  }
                } else {
                  const totalStock = stocks.filter(s => String(s.productId) === String(line.productId)).reduce((acc, s) => acc + s.qty, 0);
                  availableStock = String(Math.max(0, totalStock - (line.qty || 0)));
                }
              }

              return (
                <tr key={line.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 16px' }}>
                    <AsyncSearchableCombobox
                      inputId={`product-input-${line.id}`}
                      defaultOptions={productOptions}
                      value={line.productName || ''}
                      onChange={(v) => onUpdateLine(line.id, 'productName', v)}
                      onSelect={(p) => onSelectProduct(line.id, p)}
                      getLabel={(p) => p.name}
                      fetchOptions={fetchProductOptions}
                      createLabel={(q) => `إضافة "${q}"`}
                      placeholder="بحث عن صنف..."
                      inline={true}
                      inputClassName="purchase-prototype-field-input"
                    />
                  </td>
                  {fromLocationId === 'all' && (
                    <td style={{ padding: '8px 16px' }}>
                      <SearchableCombobox
                        options={locationOptions.filter(l => l.id !== 'all')}
                        value={line.fromLocationName || ''}
                        onChange={(v) => onUpdateLine(line.id, 'fromLocationName', v)}
                        onSelect={(l) => onUpdateLine(line.id, 'fromLocationId', l.id)}
                        getLabel={(l) => l.name}
                        search={(l, q) => l.searchTerms.includes(q.toLowerCase())}
                        createLabel={(q) => `إضافة "${q}"`}
                        placeholder="اختر المخزن..."
                        inline={true}
                        inputClassName="purchase-prototype-field-input"
                      />
                    </td>
                  )}
                  <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                    {availableStock}
                  </td>
                  <td style={{ padding: '8px 16px' }}>
                    <input
                      id={`quantity-input-${line.id}`}
                      type="number"
                      className="purchase-prototype-field-input"
                      min="0.001"
                      step="any"
                      value={line.qty}
                      onChange={(e) => onUpdateLine(line.id, 'qty', e.target.value ? Number(e.target.value) : '')}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => onQtyKeyDown(e, line.id)}
                      style={{ height: '36px' }}
                    />
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      disabled={lines.length === 1 && !line.productId}
                      style={{
                        color: 'var(--danger-color)',
                        background: 'none',
                        border: 'none',
                        cursor: (lines.length === 1 && !line.productId) ? 'not-allowed' : 'pointer',
                        padding: '8px',
                        opacity: (lines.length === 1 && !line.productId) ? 0.5 : 1,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
