import { useTranslation } from 'react-i18next';
import { memo, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { PricingPreviewPayload, PricingPreviewResponse } from '@/shared/api/pricing.api';
import { FormSection } from '@/shared/components/form-section';
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
  const { t } = useTranslation();
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
      <FormSection title={t('pricing_center.pricing_scope_panel.s0', "النطاق والعملية")} description={t('pricing_center.pricing_scope_panel.s1', "اختر المورد والقسم ونوع العملية وقواعد التوسيع والاستثناء قبل المعاينة.")}>
        <div className="form-grid compact-form-grid">
          <Field label={t('pricing_center.pricing_scope_panel.s2', "المورد")}>
            <select
              value={payload.filters.supplierId || ''}
              onChange={(event) => setPayload((current) => ({
                ...current,
                filters: { ...current.filters, supplierId: event.target.value ? Number(event.target.value) : undefined },
              }))}
            >
              <option value="">{t('pricing_center.pricing_scope_panel.s3', "كل الموردين")}</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s4', "القسم")}>
            <select
              value={payload.filters.categoryId || ''}
              onChange={(event) => setPayload((current) => ({
                ...current,
                filters: { ...current.filters, categoryId: event.target.value ? Number(event.target.value) : undefined },
              }))}
            >
              <option value="">{t('pricing_center.pricing_scope_panel.s5', "كل الأقسام")}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s6', "نوع الصنف")}>
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
              <option value="">{t('pricing_center.pricing_scope_panel.s7', "الكل")}</option>
              <option value="standard">{t('pricing_center.pricing_scope_panel.s8', "عادي")}</option>
              <option value="fashion">{t('pricing_center.pricing_scope_panel.s9', "ملابس")}</option>
            </select>
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s10', "كود الموديل / المجموعة")}>
            <input
              value={styleCodeInput}
              onChange={(event) => setStyleCodeInput(event.target.value)}
              placeholder={t('pricing_center.pricing_scope_panel.s11', "مثل STYLE-100 أو مجموعة-منظفات")}
            />
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s12', "بحث")}>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('pricing_center.pricing_scope_panel.s13', "اسم أو باركود")}
            />
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s14', "نوع العملية")}>
            <select
              value={payload.operation.type}
              onChange={(event) => setPayload((current) => ({
                ...current,
                operation: { ...current.operation, type: event.target.value as PricingPreviewPayload['operation']['type'] },
              }))}
            >
              <option value="percent_increase">{t('pricing_center.pricing_scope_panel.s15', "زيادة نسبة")}</option>
              <option value="percent_decrease">{t('pricing_center.pricing_scope_panel.s16', "خصم نسبة")}</option>
              <option value="fixed_increase">{t('pricing_center.pricing_scope_panel.s17', "زيادة مبلغ")}</option>
              <option value="fixed_decrease">{t('pricing_center.pricing_scope_panel.s18', "خصم مبلغ")}</option>
              <option value="set_price">{t('pricing_center.pricing_scope_panel.s19', "تثبيت سعر")}</option>
              <option value="margin_from_cost">{t('pricing_center.pricing_scope_panel.s20', "هامش من الشراء")}</option>
            </select>
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s21', "القيمة")}>
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

          <Field label={t('pricing_center.pricing_scope_panel.s22', "استهداف الأسعار")}>
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
                {t('pricing_center.pricing_scope_panel.s23', "قطاعي")}
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
                {t('pricing_center.pricing_scope_panel.s24', "جملة")}
              </label>
            </div>
          </Field>

          <Field label={t('pricing_center.pricing_scope_panel.s25', "التقريب")}>
            <select
              value={payload.rounding.mode}
              onChange={(event) => setPayload((current) => ({
                ...current,
                rounding: { ...current.rounding, mode: event.target.value as PricingPreviewPayload['rounding']['mode'] },
              }))}
            >
              <option value="none">{t('pricing_center.pricing_scope_panel.s26', "بدون تقريب")}</option>
              <option value="nearest">{t('pricing_center.pricing_scope_panel.s27', "لأقرب قيمة")}</option>
              <option value="ending">{t('pricing_center.pricing_scope_panel.s28', "نهاية سعر")}</option>
            </select>
          </Field>

          {payload.rounding.mode === 'nearest' ? (
            <Field label={t('pricing_center.pricing_scope_panel.s29', "أقرب قيمة")}>
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
            <Field label={t('pricing_center.pricing_scope_panel.s30', "نهاية السعر")}>
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
          <label><input type="checkbox" checked={Boolean(payload.filters.activeOnly)} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, activeOnly: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s31', "الأصناف النشطة فقط")}</label>
          <label><input type="checkbox" checked={Boolean(payload.filters.inStockOnly)} onChange={(event) => setPayload((current) => ({ ...current, filters: { ...current.filters, inStockOnly: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s32', "الأصناف التي لها مخزون فقط")}</label>
          <label><input type="checkbox" checked={payload.options.applyToWholeStyleCode} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToWholeStyleCode: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s33', "توسعة الموجة على كل الملابس بنفس كود الموديل")}</label>
          <label><input type="checkbox" checked={payload.options.applyToPricingGroup} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, applyToPricingGroup: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s34', "توسعة الموجة على مجموعة التسعير المعتمدة")}</label>
          <label><input type="checkbox" checked={payload.options.skipActiveOffers} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipActiveOffers: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s35', "تخطّي الأصناف التي عليها عروض")}</label>
          <label><input type="checkbox" checked={payload.options.skipCustomerPrices} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipCustomerPrices: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s36', "تخطّي الأصناف التي عليها أسعار خاصة")}</label>
          <label><input type="checkbox" checked={payload.options.skipManualExceptions} onChange={(event) => setPayload((current) => ({ ...current, options: { ...current.options, skipManualExceptions: event.target.checked } }))} /> {t('pricing_center.pricing_scope_panel.s37', "تخطّي الأصناف المعلّمة كاستثناء يدوي")}</label>
        </div>
      </FormSection>

      <FormSection title={t('pricing_center.pricing_scope_panel.s38', "ملخص المعاينة")} description={t('pricing_center.pricing_scope_panel.s39', "راجع أثر الموجة على قيمة المخزون وهامش الربح قبل الاعتماد.")}>
        <div className="stack gap-sm">
          {summaryCards.map((item) => (
            <div key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
          <div className="muted small">
            {t('pricing_center.pricing_scope_panel.s40', "اعتماد الموجة يحتاج صلاحية تعديل السعر. يمكنك تحميل قاعدة محفوظة أو حفظ النطاق الحالي كقاعدة جديدة.")}
          </div>
        </div>
      </FormSection>
    </div>
  );
}

export const PricingScopePanel = memo(PricingScopePanelComponent);
