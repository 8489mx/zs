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

function roleSummary(unit: ProductUnit) {
  const roles = [
    unit.isBaseUnit ? 'أساسية' : '',
    unit.isSaleUnit ? 'بيع' : '',
    unit.isPurchaseUnit ? 'شراء' : '',
  ].filter(Boolean);
  return roles.length ? roles.join(' / ') : 'بدون دور محدد';
}

function conversionText(unit: ProductUnit, baseUnitName: string) {
  const currentName = unitName(unit);
  const multiplier = Number(unit.multiplier || 1) || 1;
  if (unit.isBaseUnit) return `هي أساس المخزون: 1 ${currentName} = 1 ${baseUnitName}`;
  return `1 ${currentName} = ${multiplier} ${baseUnitName}`;
}

function roleHelpText(key: 'isBaseUnit' | 'isSaleUnit' | 'isPurchaseUnit') {
  if (key === 'isBaseUnit') return 'أساس حساب المخزون والتحويلات.';
  if (key === 'isSaleUnit') return 'الوحدة الافتراضية في الكاشير.';
  return 'الوحدة الافتراضية في فواتير الشراء.';
}

export function ProductUnitsEditor({ units, onChange, disabled = false, title = 'وحدات الصنف' }: ProductUnitsEditorProps) {
  const normalized = normalizeUnits(units);
  const baseUnit = normalized.find((unit) => unit.isBaseUnit) || normalized[0];
  const baseUnitName = unitName(baseUnit, 'الوحدة الأساسية');
  const saleUnit = normalized.find((unit) => unit.isSaleUnit) || baseUnit;
  const purchaseUnit = normalized.find((unit) => unit.isPurchaseUnit) || baseUnit;

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

  function roleOption(index: number, unit: ProductUnit, key: 'isBaseUnit' | 'isSaleUnit' | 'isPurchaseUnit', label: string) {
    const checked = Boolean(unit[key]);
    return (
      <label
        className="card-soft"
        style={{
          alignItems: 'center',
          background: checked ? 'rgba(239, 246, 255, 0.96)' : 'rgba(255, 255, 255, 0.92)',
          borderColor: checked ? 'rgba(37, 99, 235, 0.34)' : 'rgba(226, 232, 240, 0.88)',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          gap: 10,
          justifyContent: 'space-between',
          margin: 0,
          minHeight: 58,
          overflow: 'hidden',
          padding: '10px 12px',
        }}
      >
        <span style={{ minWidth: 0 }}>
          <strong style={{ color: checked ? 'rgb(29, 78, 216)' : 'rgb(15, 23, 42)', display: 'block', fontSize: 13, lineHeight: 1.7 }}>{label}</strong>
          <span className="muted small" style={{ display: 'block', lineHeight: 1.6, whiteSpace: 'normal' }}>{roleHelpText(key)}</span>
        </span>
        <input type="radio" name={`${title}-${key}`} checked={checked} disabled={disabled} onChange={() => setExclusive(index, key)} style={{ flex: '0 0 auto' }} />
      </label>
    );
  }

  return (
    <div className="page-stack">
      <div className="section-title" style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: 16, margin: 0 }}>{title}</h3>
          <p className="muted small" style={{ margin: '4px 0 0' }}>عرّف أصغر وحدة للمخزون، ثم حدد وحدة البيع ووحدة الشراء.</p>
        </div>
        <Button type="button" variant="secondary" onClick={addRow} disabled={disabled}>إضافة وحدة</Button>
      </div>

      <div className="card-soft" style={{ background: 'rgba(239, 246, 255, 0.58)', borderColor: 'rgba(37, 99, 235, 0.16)', padding: 12 }}>
        <strong style={{ display: 'block', marginBottom: 8 }}>ملخص الوحدات الحالي</strong>
        <div className="form-grid">
          <div className="field" style={{ margin: 0 }}>
            <span>الوحدة الأساسية</span>
            <strong>{unitName(baseUnit)}</strong>
            <small className="muted">المخزون يتحسب بها داخليًا.</small>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <span>وحدة البيع</span>
            <strong>{unitName(saleUnit)}</strong>
            <small className="muted">تظهر افتراضيًا في الكاشير.</small>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <span>وحدة الشراء</span>
            <strong>{unitName(purchaseUnit)}</strong>
            <small className="muted">تستخدم افتراضيًا عند الشراء من المورد.</small>
          </div>
        </div>
        <p className="muted small" style={{ margin: '10px 0 0' }}>
          مثال: لو الوحدة الأساسية قطعة ووحدة الشراء كرتونة بمضاعف 12، فشراء 1 كرتونة يضيف 12 قطعة للمخزون.
        </p>
      </div>

      <div className="page-stack">
        {normalized.map((unit, index) => {
          const presetValue = UNIT_PRESETS.includes(unit.name) ? unit.name : '__custom__';
          const customNameReadonly = presetValue !== '__custom__';
          return (
            <div key={unit.id || `${index}`} className="list-row" style={{ alignItems: 'stretch', flexDirection: 'column', gap: 12, overflow: 'hidden', padding: 14 }}>
              <div className="section-title" style={{ alignItems: 'flex-start', gap: 10, margin: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: 15, lineHeight: 1.7 }}>{unitName(unit, `وحدة ${index + 1}`)}</strong>
                  <span className="muted small" style={{ display: 'block', lineHeight: 1.7 }}>{conversionText(unit, baseUnitName)}</span>
                </div>
                <span
                  className="nav-pill"
                  style={{
                    background: 'rgba(241, 245, 249, 0.92)',
                    flex: '0 0 auto',
                    fontWeight: 800,
                    maxWidth: '100%',
                    whiteSpace: 'normal',
                  }}
                >
                  {roleSummary(unit)}
                </span>
              </div>

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
                <Field label={`المضاعف مقارنة بـ ${baseUnitName}`}>
                  <input type="number" min="1" step="1" value={unit.multiplier} disabled={disabled || unit.isBaseUnit} onChange={(event) => patchRow(index, { multiplier: Number(event.target.value || 1) })} />
                </Field>
                <Field label="باركود الوحدة">
                  <input value={unit.barcode} disabled={disabled} onChange={(event) => patchRow(index, { barcode: event.target.value })} placeholder="اختياري" />
                </Field>
              </div>

              <div className="card-soft" style={{ background: 'rgba(248, 250, 252, 0.88)', overflow: 'hidden', padding: 10 }}>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>استخدام هذه الوحدة</strong>
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                    width: '100%',
                  }}
                >
                  {roleOption(index, unit, 'isBaseUnit', 'الوحدة الأساسية')}
                  {roleOption(index, unit, 'isSaleUnit', 'وحدة البيع')}
                  {roleOption(index, unit, 'isPurchaseUnit', 'وحدة الشراء')}
                </div>
              </div>

              <div className="actions" style={{ justifyContent: 'space-between', width: '100%' }}>
                <span className="muted small" style={{ lineHeight: 1.7 }}>{conversionText(unit, baseUnitName)}</span>
                <Button type="button" variant="danger" onClick={() => removeRow(index)} disabled={disabled || normalized.length === 1}>حذف الوحدة</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-soft" style={{ background: 'rgba(248, 250, 252, 0.92)', padding: 12 }}>
        <strong style={{ display: 'block', marginBottom: 6 }}>قاعدة مهمة</strong>
        <p className="muted small" style={{ margin: 0 }}>
          السيستم لا يخمّن معنى الوحدة؛ هو يعتمد على الاسم والمضاعف. اكتب مثلًا: قطعة = 1، كرتونة = 12، ثم حدد أي وحدة للبيع وأي وحدة للشراء.
        </p>
      </div>
    </div>
  );
}