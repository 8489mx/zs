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
    isPurchaseUnit: false
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
      isPurchaseUnit: Boolean(unit.isPurchaseUnit)
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
        isPurchaseUnit: Boolean(unit.isPurchaseUnit)
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

export function ProductUnitsEditor({ units, onChange, disabled = false, title = 'وحدات الصنف' }: ProductUnitsEditorProps) {
  const normalized = normalizeUnits(units);

  function patchRow(index: number, patch: Partial<ProductUnit>) {
    const next = normalized.map((unit, currentIndex) => (currentIndex === index ? { ...unit, ...patch } : unit));
    onChange(normalizeUnits(next));
  }

  function setExclusive(index: number, key: 'isBaseUnit' | 'isSaleUnit' | 'isPurchaseUnit') {
    const next = normalized.map((unit, currentIndex) => ({
      ...unit,
      [key]: currentIndex === index
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
    <div className="page-stack">
      <div className="section-title" style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>{title}</h3>
        <Button type="button" variant="secondary" onClick={addRow} disabled={disabled}>إضافة وحدة</Button>
      </div>
      <div className="page-stack">
        {normalized.map((unit, index) => {
          const presetValue = UNIT_PRESETS.includes(unit.name) ? unit.name : '__custom__';
          const customNameReadonly = presetValue !== '__custom__';
          return (
            <div key={unit.id || `${index}`} className="list-row" style={{ alignItems: 'stretch', flexDirection: 'column' }}>
              <div className="form-grid" style={{ width: '100%' }}>
                <Field label="الوحدة">
                  <select
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
                <Field label="اسم الوحدة المخصص">
                  <input value={unit.name} readOnly={customNameReadonly} disabled={disabled} onChange={(event) => patchRow(index, { name: event.target.value })} placeholder="مثال: قطعة أو كرتونة" />
                </Field>
                <Field label="المضاعف">
                  <input type="number" min="1" step="1" value={unit.multiplier} disabled={disabled} onChange={(event) => patchRow(index, { multiplier: Number(event.target.value || 1) })} />
                </Field>
                <Field label="باركود الوحدة">
                  <input value={unit.barcode} disabled={disabled} onChange={(event) => patchRow(index, { barcode: event.target.value })} placeholder="اختياري" />
                </Field>
              </div>
              <div className="actions" style={{ justifyContent: 'space-between', width: '100%' }}>
                <div className="actions">
                  <label className="nav-pill" style={{ cursor: disabled ? 'default' : 'pointer' }}>
                    <input type="radio" name={`${title}-base`} checked={unit.isBaseUnit} disabled={disabled} onChange={() => setExclusive(index, 'isBaseUnit')} />
                    <span style={{ marginInlineStart: 6 }}>الوحدة الأساسية</span>
                  </label>
                  <label className="nav-pill" style={{ cursor: disabled ? 'default' : 'pointer' }}>
                    <input type="radio" name={`${title}-sale`} checked={unit.isSaleUnit} disabled={disabled} onChange={() => setExclusive(index, 'isSaleUnit')} />
                    <span style={{ marginInlineStart: 6 }}>وحدة البيع</span>
                  </label>
                  <label className="nav-pill" style={{ cursor: disabled ? 'default' : 'pointer' }}>
                    <input type="radio" name={`${title}-purchase`} checked={unit.isPurchaseUnit} disabled={disabled} onChange={() => setExclusive(index, 'isPurchaseUnit')} />
                    <span style={{ marginInlineStart: 6 }}>وحدة الشراء</span>
                  </label>
                </div>
                <Button type="button" variant="danger" onClick={() => removeRow(index)} disabled={disabled || normalized.length === 1}>حذف الوحدة</Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="muted small">يمكنك تحديد وحدة أساسية ووحدة بيع ووحدة شراء مع باركود ومضاعف لكل وحدة.</div>
    </div>
  );
}
