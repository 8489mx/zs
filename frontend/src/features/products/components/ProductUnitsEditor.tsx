import type { ProductUnit } from '@/types/domain';
import { Button } from '@/shared/ui/button';
import { UnitCombobox } from '@/shared/components/UnitCombobox';

function nextEmptyUnit(): ProductUnit {
  return {
    id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'علبة',
    multiplier: 1,
    barcode: '',
    isBaseUnit: false,
    isSaleUnit: false,
    isPurchaseUnit: false,
  };
}

function normalizeUnits(units: ProductUnit[]) {
  const source = units.length ? units : [{ ...nextEmptyUnit(), name: 'قطعة', isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }];
  let hasBase = false;
  let hasSale = false;
  let hasPurchase = false;
  const normalized = source.map((unit, index) => {
    const next = {
      ...unit,
      name: unit.name || (index === 0 ? 'قطعة' : ''),
      multiplier: Number(unit.multiplier || 1) || 1,
      barcode: unit.barcode || '',
      isBaseUnit: Boolean(unit.isBaseUnit),
      isSaleUnit: Boolean(unit.isSaleUnit),
      isPurchaseUnit: Boolean(unit.isPurchaseUnit),
    };
    if (next.isBaseUnit && !hasBase) {
      hasBase = true;
    } else if (next.isBaseUnit) {
      next.isBaseUnit = false;
    }
    if (next.isSaleUnit && !hasSale) {
      hasSale = true;
    } else if (next.isSaleUnit) {
      next.isSaleUnit = false;
    }
    if (next.isPurchaseUnit && !hasPurchase) {
      hasPurchase = true;
    } else if (next.isPurchaseUnit) {
      next.isPurchaseUnit = false;
    }
    return next;
  });

  if (!hasBase && normalized[0]) normalized[0].isBaseUnit = true;
  if (!hasSale && normalized[0]) normalized[0].isSaleUnit = true;
  if (!hasPurchase && normalized[0]) normalized[0].isPurchaseUnit = true;

  return normalized;
}

export function normalizeProductUnits(units: ProductUnit[] | undefined, barcodeFallback = ''): ProductUnit[] {
  const initial = Array.isArray(units) && units.length
    ? units.map((unit, index) => ({
        id: unit.id || `u-${index + 1}`,
        name: unit.name || (index === 0 ? 'قطعة' : ''),
        multiplier: Number(unit.multiplier || 1) || 1,
        barcode: unit.barcode || (index === 0 ? barcodeFallback : ''),
        isBaseUnit: Boolean(unit.isBaseUnit),
        isSaleUnit: Boolean(unit.isSaleUnit),
        isPurchaseUnit: Boolean(unit.isPurchaseUnit),
      }))
    : [{ id: 'u-1', name: 'قطعة', multiplier: 1, barcode: barcodeFallback, isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }];
  return normalizeUnits(initial);
}

interface ProductUnitsEditorProps {
  units: ProductUnit[];
  onChange: (units: ProductUnit[]) => void;
  disabled?: boolean;
  title?: string;
}

function unitName(unit: ProductUnit, fallback = 'وحدة') {
  return String(unit.name || '').trim() || fallback;
}

export function ProductUnitsEditor({ units, onChange, disabled = false, title = 'وحدات الصنف' }: ProductUnitsEditorProps) {
  const normalized = normalizeUnits(units);
  const baseUnit = normalized.find((unit) => unit.isBaseUnit) || normalized[0];
  const baseUnitName = unitName(baseUnit, 'الوحدة الأساسية');

  function patchRow(index: number, patch: Partial<ProductUnit>) {
    const next = normalized.map((unit, currentIndex) => (currentIndex === index ? { ...unit, ...patch } : unit));
    onChange(normalizeUnits(next));
  }

  function setExclusive(index: number, key: 'isBaseUnit' | 'isSaleUnit' | 'isPurchaseUnit') {
    const next = normalized.map((unit, currentIndex) => ({
      ...unit,
      [key]: currentIndex === index,
    }));
    onChange(normalizeUnits(next));
  }

  function removeRow(index: number) {
    const next = normalized.filter((_, currentIndex) => currentIndex !== index);
    onChange(normalizeUnits(next));
  }

  function addRow() {
    onChange(normalizeUnits([...normalized, nextEmptyUnit()]));
  }

  return (
    <div className="product-units-table-container">
      {/* Header Row */}
      <div className="product-units-header-row">
        <div style={{ flex: '1.4' }}>اسم / نوع الوحدة</div>
        <div style={{ flex: '0.9' }}>المضاعف ({baseUnitName})</div>
        <div style={{ flex: '1.3' }}>باركود الوحدة</div>
        <div style={{ flex: '2.5' }}>دور واستخدام الوحدة الافتراضي</div>
        {normalized.length > 1 && <div style={{ width: '36px' }}></div>}
      </div>

      {/* Data Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {normalized.map((unit, index) => {
          return (
            <div key={unit.id || `${index}`} className="product-units-data-row">
              {/* Unit Searchable Combobox */}
              <div style={{ flex: '1.4', minWidth: 0 }}>
                <UnitCombobox
                  value={unit.name}
                  disabled={disabled}
                  onChange={(val) => patchRow(index, { name: val })}
                  placeholder="ابحث أو اكتب..."
                />
              </div>

              {/* Multiplier */}
              <div style={{ flex: '0.9', minWidth: 0 }}>
                <input
                  className="purchase-prototype-field-input"
                  type="number"
                  min="1"
                  step="1"
                  value={unit.multiplier}
                  disabled={disabled || unit.isBaseUnit}
                  onChange={(event) => patchRow(index, { multiplier: Number(event.target.value || 1) })}
                  style={{
                    height: '34px',
                    fontSize: '0.86rem',
                    background: unit.isBaseUnit ? '#f1f5f9' : '#fff',
                    cursor: unit.isBaseUnit ? 'not-allowed' : 'text'
                  }}
                  title={unit.isBaseUnit ? 'الوحدة الأساسية مضاعفها دائماً 1' : `تحتوي على كم ${baseUnitName}`}
                />
              </div>

              {/* Barcode */}
              <div style={{ flex: '1.3', minWidth: 0 }}>
                <input
                  className="purchase-prototype-field-input"
                  value={unit.barcode}
                  disabled={disabled}
                  onChange={(event) => patchRow(index, { barcode: event.target.value })}
                  placeholder="باركود الوحدة (اختياري)"
                  style={{ height: '34px', fontSize: '0.86rem' }}
                />
              </div>

              {/* Usage Chips or Single-Unit Badge */}
              <div className="product-unit-roles-group" style={{ flex: '2.5', minWidth: 0 }}>
                {normalized.length === 1 ? (
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: '#334155',
                      background: '#f1f5f9',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                    }}
                  >
                    <span>✨ وحدة افتراضية شاملة (المخزون • البيع • الشراء)</span>
                  </span>
                ) : (
                  <>
                    <label className={`product-unit-chip-btn ${unit.isBaseUnit ? 'active' : ''}`} title="أساس حساب المخزون والتحويلات">
                      <input
                        type="radio"
                        name={`${title}-isBaseUnit`}
                        checked={Boolean(unit.isBaseUnit)}
                        disabled={disabled}
                        onChange={() => setExclusive(index, 'isBaseUnit')}
                      />
                      <span>📦 أساسية (المخزون)</span>
                    </label>
                    <label className={`product-unit-chip-btn ${unit.isSaleUnit ? 'active' : ''}`} title="الوحدة الافتراضية للبيع في شاشة الكاشير">
                      <input
                        type="radio"
                        name={`${title}-isSaleUnit`}
                        checked={Boolean(unit.isSaleUnit)}
                        disabled={disabled}
                        onChange={() => setExclusive(index, 'isSaleUnit')}
                      />
                      <span>🛒 بيع (الكاشير)</span>
                    </label>
                    <label className={`product-unit-chip-btn ${unit.isPurchaseUnit ? 'active' : ''}`} title="الوحدة الافتراضية في فواتير الشراء">
                      <input
                        type="radio"
                        name={`${title}-isPurchaseUnit`}
                        checked={Boolean(unit.isPurchaseUnit)}
                        disabled={disabled}
                        onChange={() => setExclusive(index, 'isPurchaseUnit')}
                      />
                      <span>🚚 شراء (المورد)</span>
                    </label>
                  </>
                )}
              </div>

              {/* Delete Button */}
              {normalized.length > 1 && (
                <div style={{ width: '36px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    className="unit-delete-btn"
                    title="حذف هذه الوحدة"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Helper & Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid #f1f5f9' }}>
        <span className="muted small" style={{ fontSize: '0.78rem' }}>
          * حدد أصغر وحدة كأساسية للمخزون، واختر وحدة البيع الافتراضية للكاشير ووحدة الشراء للموردين.
        </span>
        <Button
          type="button"
          variant="secondary"
          onClick={addRow}
          disabled={disabled}
          style={{ minHeight: '30px', padding: '3px 12px', fontSize: '0.82rem' }}
        >
          + إضافة وحدة جديدة
        </Button>
      </div>
    </div>
  );
}