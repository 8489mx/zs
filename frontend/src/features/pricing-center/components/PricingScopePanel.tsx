import { memo, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { PricingPreviewPayload, PricingPreviewResponse } from '@/shared/api/pricing.api';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

interface OptionItem {
  id: string | number;
  name: string;
}

interface Props {
  payload: PricingPreviewPayload;
  setPayload: Dispatch<SetStateAction<PricingPreviewPayload>>;
  categories: OptionItem[];
  suppliers: OptionItem[];
  preview: PricingPreviewResponse | null;
}

function PricingScopePanelComponent({ payload, setPayload, categories, suppliers, preview }: Props) {
  const [searchInput, setSearchInput] = useState(payload.filters.q || '');
  const [styleCodeInput, setStyleCodeInput] = useState(payload.filters.styleCode || '');
  const debouncedSearchInput = useDebouncedValue(searchInput, 250);
  const debouncedStyleCodeInput = useDebouncedValue(styleCodeInput, 250);

  useEffect(() => {
    setSearchInput(payload.filters.q || '');
  }, [payload.filters.q]);

  useEffect(() => {
    setStyleCodeInput(payload.filters.styleCode || '');
  }, [payload.filters.styleCode]);

  useEffect(() => {
    if ((payload.filters.q || '') === debouncedSearchInput) return;
    setPayload((current) => ({
      ...current,
      filters: { ...current.filters, q: debouncedSearchInput },
    }));
  }, [debouncedSearchInput, payload.filters.q, setPayload]);

  useEffect(() => {
    if ((payload.filters.styleCode || '') === debouncedStyleCodeInput) return;
    setPayload((current) => ({
      ...current,
      filters: { ...current.filters, styleCode: debouncedStyleCodeInput },
    }));
  }, [debouncedStyleCodeInput, payload.filters.styleCode, setPayload]);

  const summaryCards = useMemo(() => ([
    { label: 'قيمة المخزون قبل', value: formatCurrency(preview?.summary?.inventoryValueBefore || 0) },
    { label: 'قيمة المخزون بعد', value: formatCurrency(preview?.summary?.inventoryValueAfter || 0) },
    { label: 'هامش الربح قبل', value: formatCurrency(preview?.summary?.stockMarginBefore || 0) },
    { label: 'هامش الربح بعد', value: formatCurrency(preview?.summary?.stockMarginAfter || 0) },
    { label: 'تحذير أقل من الشراء', value: String(preview?.summary?.belowCostCount || 0) },
  ]), [preview]);

  return (
    <div className="two-column-grid panel-grid">
      <Card title="النطاق والعملية" description="اختر المورد والقسم ونوع العملية وقواعد التوسيع والاستثناء قبل المعاينة.">
        <div className="form-grid compact-form-grid">
          <Field label="المورد">
            <select
              value={payload.filters.supplierId || ''}
              onChange={(event) => setPayload((current) => ({
                ...current,
                filters: { ...current.filters, supplierId: event.target.value ? Number(event.target.value) : undefined },
              }))}
            >
              <option value="">كل الموردين</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>

          <Field label="القسم">
            <select
              value={payload.filters.categoryId || ''}
              onChange={(event) => setPayload((current) => ({
                ...current,
                filters: { ...current.filters, categoryId: event.target.value ? Number(event.target.value) : undefined },
              }))}
            >
              <option value="">كل الأقسام</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>

          <Field label="نوع الصنف">
            <select
              value={payload.filters.itemKind || ''}
              onChange={(event) => setPayload((current) => ({
                ...current,
                filters: {
                  ...current.filters,
                  itemKind: event.target.value ? event.target.value as 'standard' | 'fashion' : undefined,
                },
              }))}
            >
              <option value="">الكل</option>
              <option value="standard">عادي</option>
              <option value="fashion">ملابس</option>
            </select>
          </Field>

          <Field label="كود الموديل / المجموعة">
            <input
              value={styleCodeInput}
              onChange={(event) => setStyleCodeInput(event.target.value)}
              placeholder="مثل STYLE-100 أو مجموعة-منظفات"
            />
          </Field>

          <Field label="بحث">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="اسم أو باركود"
            />
          </Field>

          <Field label="نوع العملية">
            <select
              value={payload.operation.type}
              onChange={(event) => setPayload((current) => ({
                ...current,
                operation: { ...current.operation, type: event.target.value as PricingPreviewPayload['operation']['type'] },
              }))}
            >
              <option value="percent_increase">زيادة نسبة</option>
              <option value="percent_decrease">خصم نسبة</option>
              <option value="fixed_increase">زيادة مبلغ</option>
              <option value="fixed_decrease">خصم مبلغ</option>
              <option value="set_price">تثبيت سعر</option>
              <option value="margin_from_cost">هامش من الشراء</option>
            </select>
          </Field>

          <Field label="القيمة">
            <input
              type="number"
              step="0.01"
              value={payload.operation.value}
              onChange={(event) => setPayload((current) => ({
                ...current,
                operation: { ...current.operation, value: Number(event.target.value || 0) },
              }))}
            />
          </Field>

          <Field label="استهداف الأسعار">
            <div className="stack gap-sm">
              <label>
                <input
                  type="checkbox"
                  checked={payload.targets.includes('retail')}
                  onChange={(event) => setPayload((current) => ({
                    ...current,
                    targets: event.target.checked
                      ? Array.from(new Set([...current.targets, 'retail']))
                      : current.targets.filter((entry) => entry !== 'retail'),
                  }))}
                />{' '}
                قطاعي
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={payload.targets.includes('wholesale')}
                  onChange={(event) => setPayload((current) => ({
                    ...current,
                    targets: event.target.checked
                      ? Array.from(new Set([...current.targets, 'wholesale']))
                      : current.targets.filter((entry) => entry !== 'wholesale'),
                  }))}
                />{' '}
                جملة
              </label>
            </div>
          </Field>

          <Field label="التقريب">
            <select
              value={payload.rounding.mode}
              onChange={(event) => setPayload((current) => ({
                ...current,
                rounding: { ...current.rounding, mode: event.target.value as PricingPreviewPayload['rounding']['mode'] },
              }))}
            >
              <option value="none">بدون تقريب</option>
              <option value="nearest">لأقرب قيمة</option>
              <option value="ending">نهاية سعر</option>
            </select>
          </Field>

          {payload.rounding.mode === 'nearest' ? (
            <Field label="أقرب قيمة">
              <input
                type="number"
                step="0.01"
                value={payload.rounding.nearestStep || 0.5}
                onChange={(event) => setPayload((current) => ({
                  ...current,
                  rounding: { ...current.rounding, nearestStep: Number(event.target.value || 0.5) },
                }))}
              />
            </Field>
          ) : null}

          {payload.rounding.mode === 'ending' ? (
            <Field label="نهاية السعر">
              <select
                value={payload.rounding.ending || 95}
                onChange={(event) => setPayload((current) => ({
                  ...current,
                  rounding: { ...current.rounding, ending: Number(event.target.value || 95) },
                }))}
              >
                <option value={95}>95</option>
                <option value={99}>99</option>
                <option value={50}>50</option>
              </select>
            </Field>
          ) : null}
        </div>

        <div className="stack gap-sm section-actions">
          <label><input type="checkbox" checked={Boolean(payload.filters.activeOnly)} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, activeOnly: event.target.checked } }))} /> الأصناف النشطة فقط</label>
          <label><input type="checkbox" checked={Boolean(payload.filters.inStockOnly)} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, inStockOnly: event.target.checked } }))} /> الأصناف التي لها مخزون فقط</label>
          <label><input type="checkbox" checked={payload.options.applyToWholeStyleCode} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToWholeStyleCode: event.target.checked } }))} /> توسعة الموجة على كل الملابس بنفس كود الموديل</label>
          <label><input type="checkbox" checked={payload.options.applyToPricingGroup} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToPricingGroup: event.target.checked } }))} /> توسعة الموجة على مجموعة التسعير المعتمدة</label>
          <label><input type="checkbox" checked={payload.options.skipActiveOffers} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipActiveOffers: event.target.checked } }))} /> تخطّي الأصناف التي عليها عروض</label>
          <label><input type="checkbox" checked={payload.options.skipCustomerPrices} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipCustomerPrices: event.target.checked } }))} /> تخطّي الأصناف التي عليها أسعار خاصة</label>
          <label><input type="checkbox" checked={payload.options.skipManualExceptions} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipManualExceptions: event.target.checked } }))} /> تخطّي الأصناف المعلّمة كاستثناء يدوي</label>
        </div>
      </Card>

      <Card title="ملخص المعاينة" description="راجع أثر الموجة على قيمة المخزون وهامش الربح قبل الاعتماد.">
        <div className="stack gap-sm">
          {summaryCards.map((item) => (
            <div key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <div className="muted small">
            اعتماد الموجة يحتاج صلاحية تعديل السعر. يمكنك تحميل قاعدة محفوظة أو حفظ النطاق الحالي كقاعدة جديدة.
          </div>
        </div>
      </Card>
    </div>
  );
}

export const PricingScopePanel = memo(PricingScopePanelComponent);
