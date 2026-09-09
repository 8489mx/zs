import React from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';

type PricingOperationType = 'percent_increase' | 'percent_decrease' | 'fixed_increase' | 'fixed_decrease' | 'set_price' | 'margin_from_cost';
type PricingRoundingMode = 'none' | 'nearest' | 'ending';

interface PricingScopeFormulaSectionProps {
  payload: any;
  setPayload: React.Dispatch<React.SetStateAction<any>>;
  suppliers: any[];
  categories: any[];
}

export function PricingScopeFormulaSection({
  payload,
  setPayload,
  suppliers,
  categories,
}: PricingScopeFormulaSectionProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <FormSection title="نطاق التطبيق ومعادلة التسعير" className="h-full" bodyClassName="flex-1 flex flex-col justify-between">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', justifyContent: 'space-between' }}>
          
          {/* 1. Target Scope: 5 Equal Width Columns */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              ١. نطاق الأصناف المستهدفة
            </div>
            <div className="pricing-center-scope-grid">
              <Field label="المورد">
                <CustomSelect
                  value={payload.filters.supplierId || ''}
                  onChange={(val) => setPayload((current: any) => ({ ...current, filters: { ...current.filters, supplierId: val ? Number(val) : undefined } }))}
                  options={[
                    { value: '', label: 'كل الموردين' },
                    ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
                  ]}
                />
              </Field>
              <Field label="القسم">
                <CustomSelect
                  value={payload.filters.categoryId || ''}
                  onChange={(val) => setPayload((current: any) => ({ ...current, filters: { ...current.filters, categoryId: val ? Number(val) : undefined } }))}
                  options={[
                    { value: '', label: 'كل الأقسام' },
                    ...categories.map((category) => ({ value: String(category.id), label: category.name })),
                  ]}
                />
              </Field>
              <Field label="نوع الصنف">
                <CustomSelect
                  value={payload.filters.itemKind || ''}
                  onChange={(val) => setPayload((current: any) => ({ ...current, filters: { ...current.filters, itemKind: val ? (val as 'standard' | 'fashion') : undefined } }))}
                  options={[
                    { value: '', label: 'الكل' },
                    { value: 'standard', label: 'عادي' },
                    { value: 'fashion', label: 'ملابس' },
                  ]}
                />
              </Field>
              <Field label="كود الموديل">
                <input
                  value={payload.filters.styleCode || ''}
                  onChange={(event) => setPayload((current: any) => ({ ...current, filters: { ...current.filters, styleCode: event.target.value } }))}
                  placeholder="STYLE-100"
                  style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </Field>
              <Field label="بحث سريع">
                <input
                  value={payload.filters.q || ''}
                  onChange={(event) => setPayload((current: any) => ({ ...current, filters: { ...current.filters, q: event.target.value } }))}
                  placeholder="اسم أو باركود..."
                  style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </Field>
            </div>
          </div>

          {/* 2. Pricing Formula & Targets: Compact Single Row */}
          <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              ٢. معادلة التسعير والأسعار المستهدفة
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1.4 1 140px' }}>
                <Field label="نوع العملية">
                  <CustomSelect
                    value={payload.operation.type}
                    onChange={(val) => setPayload((current: any) => ({ ...current, operation: { ...current.operation, type: val as PricingOperationType } }))}
                    options={[
                      { value: 'percent_increase', label: 'زيادة نسبة (%)' },
                      { value: 'percent_decrease', label: 'خفض نسبة (%)' },
                      { value: 'fixed_increase', label: 'زيادة مبلغ ثابت' },
                      { value: 'fixed_decrease', label: 'خفض مبلغ ثابت' },
                      { value: 'set_price', label: 'تثبيت سعر مباشر' },
                      { value: 'margin_from_cost', label: 'هامش ربح من الشراء' },
                    ]}
                  />
                </Field>
              </div>

              <div style={{ width: '85px', flexShrink: 0 }}>
                <Field label="القيمة">
                  <input
                    type="number"
                    step="0.01"
                    value={payload.operation.value}
                    onChange={(event) => setPayload((current: any) => ({ ...current, operation: { ...current.operation, value: Number(event.target.value || 0) } }))}
                    style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </Field>
              </div>

              <div style={{ flex: '1.2 1 120px' }}>
                <Field label="قاعدة التقريب">
                  <CustomSelect
                    value={payload.rounding.mode}
                    onChange={(val) => setPayload((current: any) => ({ ...current, rounding: { ...current.rounding, mode: val as PricingRoundingMode } }))}
                    options={[
                      { value: 'none', label: 'بدون تقريب' },
                      { value: 'nearest', label: 'لأقرب قيمة' },
                      { value: 'ending', label: 'كسور تسويقية' },
                    ]}
                  />
                </Field>
              </div>

              {payload.rounding.mode === 'nearest' && (
                <div style={{ width: '75px', flexShrink: 0 }}>
                  <Field label="التقريب">
                    <input
                      type="number"
                      step="0.01"
                      value={payload.rounding.nearestStep || 0.5}
                      onChange={(event) => setPayload((current: any) => ({ ...current, rounding: { ...current.rounding, nearestStep: Number(event.target.value || 0.5) } }))}
                      style={{ height: '34px', width: '100%', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </Field>
                </div>
              )}

              {payload.rounding.mode === 'ending' && (
                <div style={{ width: '75px', flexShrink: 0 }}>
                  <Field label="النهاية">
                    <CustomSelect
                      value={payload.rounding.ending || 95}
                      onChange={(val) => setPayload((current: any) => ({ ...current, rounding: { ...current.rounding, ending: Number(val || 95) } }))}
                      options={[
                        { value: '95', label: '.95' },
                        { value: '99', label: '.99' },
                        { value: '50', label: '.50' },
                      ]}
                    />
                  </Field>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '34px', paddingInlineStart: '4px' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 600 }}>تطبيق على:</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={payload.targets.includes('retail')}
                    onChange={(event) => setPayload((current: any) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'retail'])) : current.targets.filter((entry: any) => entry !== 'retail') }))}
                    style={{ width: '15px', height: '15px' }}
                  />
                  <span>قطاعي</span>
                </label>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'nowrap', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={payload.targets.includes('wholesale')}
                    onChange={(event) => setPayload((current: any) => ({ ...current, targets: event.target.checked ? Array.from(new Set([...current.targets, 'wholesale'])) : current.targets.filter((entry: any) => entry !== 'wholesale') }))}
                    style={{ width: '15px', height: '15px' }}
                  />
                  <span>جملة</span>
                </label>
              </div>
            </div>
          </div>

          {/* 3. Safety Rules & Reason: Compact Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>قواعد الحماية:</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.76rem', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={Boolean(payload?.safeguards?.preventBelowCost)}
                  onChange={(event) => setPayload((current: any) => ({ ...current, safeguards: { ...(current?.safeguards || {}), preventBelowCost: event.target.checked } }))}
                  style={{ width: '14px', height: '14px' }}
                />
                <span>منع البيع تحت التكلفة</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.76rem', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={Boolean(payload?.safeguards?.skipActiveOffers ?? payload?.options?.skipActiveOffers)}
                  onChange={(event) => setPayload((current: any) => ({
                    ...current,
                    options: { ...(current?.options || {}), skipActiveOffers: event.target.checked },
                    safeguards: { ...(current?.safeguards || {}), skipActiveOffers: event.target.checked }
                  }))}
                  style={{ width: '14px', height: '14px' }}
                />
                <span>تخطي العروض النشطة</span>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.76rem', color: '#475569' }}>
                <input
                  type="checkbox"
                  checked={Boolean(payload?.safeguards?.skipManualExceptions ?? payload?.options?.skipManualExceptions)}
                  onChange={(event) => setPayload((current: any) => ({
                    ...current,
                    options: { ...(current?.options || {}), skipManualExceptions: event.target.checked },
                    safeguards: { ...(current?.safeguards || {}), skipManualExceptions: event.target.checked }
                  }))}
                  style={{ width: '14px', height: '14px' }}
                />
                <span>تخطي الاستثناءات اليدوية</span>
              </label>
            </div>

            <div style={{ flex: '1 1 200px', maxWidth: '300px' }}>
              <input
                value={payload?.reason || ''}
                onChange={(event) => setPayload((current: any) => ({ ...current, reason: event.target.value }))}
                placeholder="سبب التعديل (مثال: زيادة تكلفة المورد)..."
                style={{ height: '32px', width: '100%', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

        </div>
      </FormSection>
    </div>
  );
}
