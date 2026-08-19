import type { ProductUnit } from '@/types/domain';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';

const UNIT_PRESETS = ['قطعة', 'علبة', 'كرتونة', 'باكيت', 'زجاجة', 'شريط', 'كيلو', 'جرام', 'لتر', 'متر', 'دستة', 'زوج'];

function nextEmptyUnit(): ProductUnit {
  return {
    id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
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

function conversionText(unit: ProductUnit, baseUnitName: string) {
  const currentName = unitName(unit);
  const multiplier = Number(unit.multiplier || 1) || 1;
  if (unit.isBaseUnit) return `هي أساس المخزون: 1 ${currentName} = 1 ${baseUnitName}`;
  return `1 ${currentName} = ${multiplier} ${baseUnitName}`;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <div>
          <span className="muted small">عرّف أصغر وحدة للمخزون، ثم حدد وحدة البيع ووحدة الشراء الافتراضية.</span>
        </div>
        <Button type="button" variant="secondary" onClick={addRow} disabled={disabled} style={{ minHeight: '32px', padding: '4px 12px', fontSize: '0.82rem' }}>
          + إضافة وحدة
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {normalized.map((unit, index) => {
          const presetValue = UNIT_PRESETS.includes(unit.name) ? unit.name : '__custom__';
          const customNameReadonly = presetValue !== '__custom__';
          return (
            <div key={unit.id || `${index}`} className="product-units-compact-row">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr)) auto', gap: '0.65rem', alignItems: 'flex-end' }}>
                <Field label="نوع الوحدة">
                  <select
                    className="purchase-prototype-field-input"
                    value={presetValue}
                    disabled={disabled}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      patchRow(index, { name: nextValue === '__custom__' ? '' : nextValue });
                    }}
                  >
                    {UNIT_PRESETS.map((option) => <option key={option} value={option}>{option}</option>)}
                    <option value="__custom__">اسم مخصص</option>
                  </select>
                </Field>
                <Field label="اسم الوحدة">
                  <input className="purchase-prototype-field-input" value={unit.name} readOnly={customNameReadonly} disabled={disabled} onChange={(event) => patchRow(index, { name: event.target.value })} placeholder="مثال: قطعة" />
                </Field>
                <Field label={`المضاعف (${baseUnitName})`}>
                  <input className="purchase-prototype-field-input" type="number" min="1" step="1" value={unit.multiplier} disabled={disabled || unit.isBaseUnit} onChange={(event) => patchRow(index, { multiplier: Number(event.target.value || 1) })} />
                </Field>
                <Field label="باركود الوحدة">
                  <input className="purchase-prototype-field-input" value={unit.barcode} disabled={disabled} onChange={(event) => patchRow(index, { barcode: event.target.value })} placeholder="اختياري" />
                </Field>
                {normalized.length > 1 && (
                  <Button type="button" variant="danger" onClick={() => removeRow(index)} disabled={disabled} style={{ minHeight: '38px', padding: '0 12px' }}>
                    حذف
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #edf2f7', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="muted small" style={{ fontWeight: 600 }}>استخدام الوحدة:</span>
                  <label className={`product-unit-chip-btn ${unit.isBaseUnit ? 'active' : ''}`}>
                    <input type="radio" name={`${title}-isBaseUnit`} checked={Boolean(unit.isBaseUnit)} disabled={disabled} onChange={() => setExclusive(index, 'isBaseUnit')} />
                    <span>الوحدة الأساسية (المخزون)</span>
                  </label>
                  <label className={`product-unit-chip-btn ${unit.isSaleUnit ? 'active' : ''}`}>
                    <input type="radio" name={`${title}-isSaleUnit`} checked={Boolean(unit.isSaleUnit)} disabled={disabled} onChange={() => setExclusive(index, 'isSaleUnit')} />
                    <span>وحدة البيع (الكاشير)</span>
                  </label>
                  <label className={`product-unit-chip-btn ${unit.isPurchaseUnit ? 'active' : ''}`}>
                    <input type="radio" name={`${title}-isPurchaseUnit`} checked={Boolean(unit.isPurchaseUnit)} disabled={disabled} onChange={() => setExclusive(index, 'isPurchaseUnit')} />
                    <span>وحدة الشراء (المورد)</span>
                  </label>
                </div>
                <span className="muted small" style={{ fontSize: '0.78rem' }}>{conversionText(unit, baseUnitName)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}