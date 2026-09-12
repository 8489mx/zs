import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import React from 'react';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { AsyncSearchableCombobox } from '@/shared/ui/async-searchable-combobox';
import { FormSection } from '@/shared/components/form-section';
import { componentsApi, type ManufacturingComponent } from '@/features/manufacturing/api/components.api';
import { MANUFACTURING_UNITS } from '@/features/manufacturing/utils/units';
import type { BomLine } from './bom-types';

interface BomLinesTableProps {
  lines: BomLine[];
  components: ManufacturingComponent[];
  onAddLine: () => void;
  onUpdateLine: (id: number, key: keyof BomLine, value: any) => void;
  onRemoveLine: (id: number) => void;
  onSelectComponent: (id: number, comp: ManufacturingComponent) => void;
  onQuickModalOpen?: (name: string, lineId: number) => void;
}

export const BomLinesTable: React.FC<BomLinesTableProps> = ({
  lines,
  components,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onSelectComponent,
  onQuickModalOpen,
}) => {
  return (
    <FormSection title="المكونات (المواد الخام)">
      {/* Desktop Table */}
      <div className="purchase-prototype-desktop-table">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500' }}>المكون</th>
                <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '120px' }}>الكمية</th>
                <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '120px' }}>نسبة الهالك (%)</th>
                <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '150px' }}>الوحدة</th>
                <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '150px' }}>التكلفة (للوحدة)</th>
                <th style={{ padding: '12px 8px', color: '#6b7280', fontWeight: '500', width: '150px' }}>الإجمالي</th>
                <th style={{ padding: '12px 8px', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px' }}>
                    <AsyncSearchableCombobox<ManufacturingComponent>
                      value={line.query}
                      onChange={(q) => onUpdateLine(line.id, 'query', q)}
                      defaultOptions={components}
                      fetchOptions={async (q) => {
                        const res = await componentsApi.searchComponents(q);
                        return res;
                      }}
                      getLabel={(c) => c.name}
                      onCreate={onQuickModalOpen ? ((q) => onQuickModalOpen(q, line.id)) : undefined}
                      createLabel={(q) => `إضافة مادة خام جديدة: "${q}"`}
                      onSelect={(comp) => onSelectComponent(line.id, comp)}
                      placeholder="ابحث عن مكون أو اكتب اسماً جديداً..."
                      className="purchase-prototype-inline-combobox"
                      inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                    />
                    {line.query && !line.componentId && (
                      <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        هذا المكون غير مسجل بالأسعار!
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      className="purchase-prototype-input"
                      min="0"
                      step="any"
                      value={line.quantity || ''}
                      onChange={(e) => onUpdateLine(line.id, 'quantity', Number(e.target.value))}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      className="purchase-prototype-input"
                      min="0"
                      max="99"
                      step="any"
                      value={line.wastePercentage || ''}
                      onChange={(e) => onUpdateLine(line.id, 'wastePercentage', Number(e.target.value))}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                      placeholder="%"
                    />
                  </td>
                  <td style={{ padding: '8px' }}>
                    <select
                      className="purchase-prototype-input"
                      value={line.unitName}
                      onChange={(e) => onUpdateLine(line.id, 'unitName', e.target.value)}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    >
                      {MANUFACTURING_UNITS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <input
                      type="number"
                      className="purchase-prototype-input"
                      min="0"
                      step="any"
                      value={line.expectedCost ?? ''}
                      onChange={(e) => onUpdateLine(line.id, 'expectedCost', Number(e.target.value))}
                      style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#f9fafb' }}
                      readOnly
                      title="يتم حسابه تلقائياً بناءً على سعر الوحدة الأساسية"
                    />
                  </td>
                  <td style={{ padding: '8px', fontWeight: '500' }}>
                    {((line.expectedCost || 0) * (line.quantity || 0) * (1 / (1 - ((line.wastePercentage || 0) / 100)))).toLocaleString('ar-EG', { maximumFractionDigits: 2 })}{' '} <CurrencySymbol />
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <Button
                      variant="secondary"
                      onClick={() => onRemoveLine(line.id)}
                      style={{ color: '#ef4444', padding: '6px' }}
                      title="حذف السطر"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Smart Item Cards */}
      <div className="purchase-prototype-mobile-cards">
        {lines.map((line, index) => {
          const totalItemCost = (line.expectedCost || 0) * (line.quantity || 0) * (1 / (1 - ((line.wastePercentage || 0) / 100)));
          return (
            <div key={line.id} className="purchase-prototype-item-card">
              <div className="item-card-header">
                <div className="item-card-badge">
                  <span className="item-card-num">مكون #{index + 1}</span>
                  <span className="item-card-stock-pill stock-ok">
                    الإجمالي: {totalItemCost.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${getGlobalCurrencySymbol()}
                  </span>
                </div>
                <button
                  type="button"
                  className="item-card-delete-btn"
                  onClick={() => onRemoveLine(line.id)}
                  title="حذف المكون"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              <div className="item-card-field">
                <Field label="المكون (المادة الخام)">
                  <AsyncSearchableCombobox<ManufacturingComponent>
                    value={line.query}
                    onChange={(q) => onUpdateLine(line.id, 'query', q)}
                    defaultOptions={components}
                    fetchOptions={async (q) => {
                      const res = await componentsApi.searchComponents(q);
                      return res;
                    }}
                    getLabel={(c) => c.name}
                    onCreate={onQuickModalOpen ? ((q) => onQuickModalOpen(q, line.id)) : undefined}
                    createLabel={(q) => `إضافة مادة خام جديدة: "${q}"`}
                    onSelect={(comp) => onSelectComponent(line.id, comp)}
                    placeholder="ابحث عن مكون أو اكتب اسماً جديداً..."
                    className="purchase-prototype-inline-combobox"
                    inputClassName="purchase-prototype-field-input purchase-prototype-combobox-input purchase-prototype-combobox-input-inline"
                  />
                </Field>
              </div>

              <div className="item-card-row">
                <div className="item-card-field">
                  <Field label="الكمية المطلوبة">
                    <input
                      type="number"
                      className="purchase-prototype-field-input"
                      min="0"
                      step="any"
                      value={line.quantity || ''}
                      onChange={(e) => onUpdateLine(line.id, 'quantity', Number(e.target.value))}
                      style={{ height: '38px', minHeight: '38px', fontSize: '15px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                    />
                  </Field>
                </div>

                <div className="item-card-field">
                  <Field label="الوحدة">
                    <select
                      className="purchase-prototype-field-input"
                      value={line.unitName}
                      onChange={(e) => onUpdateLine(line.id, 'unitName', e.target.value)}
                      style={{ height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
                    >
                      {MANUFACTURING_UNITS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <div className="item-card-row">
                <div className="item-card-field">
                  <Field label="نسبة الهالك (%)">
                    <input
                      type="number"
                      className="purchase-prototype-field-input"
                      min="0"
                      max="99"
                      step="any"
                      value={line.wastePercentage || ''}
                      onChange={(e) => onUpdateLine(line.id, 'wastePercentage', Number(e.target.value))}
                      style={{ height: '38px', minHeight: '38px', fontSize: '15px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                      placeholder="%"
                    />
                  </Field>
                </div>

                <div className="item-card-field">
                  <Field label="تكلفة الوحدة">
                    <input
                      type="number"
                      className="purchase-prototype-field-input"
                      min="0"
                      step="any"
                      value={line.expectedCost ?? ''}
                      onChange={(e) => onUpdateLine(line.id, 'expectedCost', Number(e.target.value))}
                      style={{ height: '38px', minHeight: '38px', fontSize: '15px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box', backgroundColor: '#f9fafb' }}
                      readOnly
                    />
                  </Field>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lines.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>
          لم يتم إضافة أي مكونات. اضغط على "إضافة مكون" للبدء.
        </div>
      )}
      <div style={{ marginTop: '16px' }}>
        <Button type="button" variant="secondary" onClick={onAddLine} className="purchase-prototype-add-line-btn">
          + إضافة مكون جديد
        </Button>
      </div>
    </FormSection>
  );
};
