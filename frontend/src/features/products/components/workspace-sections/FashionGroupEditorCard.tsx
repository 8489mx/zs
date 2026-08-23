import { Fragment, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { queryKeys } from '@/app/query-keys';
import { productsApi } from '@/features/products/api/products.api';
import { getNextSequentialStyleCode, getStyleCodeSequenceStart } from '@/features/products/lib/style-code.utils';
import { normalizeArabicInput } from '@/lib/arabic-normalization';
import { formatCurrency } from '@/lib/format';
import { Trash2Icon } from '@/shared/components/icons/AppIcons';
import type { Category, Product, Supplier, Location } from '@/types/domain';
import {
  buildPayload,
  deriveBaseName,
  duplicateSummary,
  rowsFingerprint,
  sortVariants,
  toCommonDraft,
  toVariantRows,
  variantLabel,
  type CommonDraft,
  type VariantDraft
} from '@/features/products/components/workspace-sections/FashionGroupEditorCard.helpers';

interface FashionGroupEditorCardProps {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onSaved?: (product: Product) => void;
}

export function FashionGroupEditorCard({ product, categories, suppliers, locations, onSaved }: FashionGroupEditorCardProps) {
  const allProductsQuery = useQuery({ queryKey: queryKeys.products, queryFn: productsApi.list, staleTime: 30_000 });
  const queryClient = useQueryClient();
  const styleCode = String(product.styleCode || '').trim();

  const groupQuery = useQuery({
    queryKey: queryKeys.productsPage(`variant-group:${styleCode || product.id}`),
    queryFn: async () => {
      const payload = styleCode ? await productsApi.listAll({ q: styleCode }) : { products: [product] };
      const rows = (payload.products || []).filter((entry) => (styleCode ? String(entry.styleCode || '').trim() === styleCode : String(entry.id) === String(product.id)));
      return rows.length ? rows : [product];
    },
    staleTime: 30_000,
  });

  const groupProducts = useMemo(() => {
    const rows = groupQuery.data || [];
    const byId = new Map(rows.map((entry) => [String(entry.id), entry]));
    if (!byId.has(String(product.id))) byId.set(String(product.id), product);
    return Array.from(byId.values()).sort((a, b) => variantLabel({ color: a.color || '', size: a.size || '' }).localeCompare(variantLabel({ color: b.color || '', size: b.size || '' }), 'ar'));
  }, [groupQuery.data, product]);

  const seedProduct = useMemo(() => (groupProducts[0] || product), [groupProducts, product]);
  const [commonDraft, setCommonDraft] = useState<CommonDraft>(() => ({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) }));
  const [variantRows, setVariantRows] = useState<VariantDraft[]>(() => toVariantRows(groupProducts));

  useEffect(() => {
    setCommonDraft({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) });
    setVariantRows(toVariantRows(groupProducts));
  }, [product.id, seedProduct, groupProducts]);

  const baselineCommon = useMemo(() => JSON.stringify({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) }), [seedProduct]);
  const baselineRows = useMemo(() => rowsFingerprint(toVariantRows(groupProducts)), [groupProducts]);
  const hasDraftChanges = JSON.stringify(commonDraft) !== baselineCommon || rowsFingerprint(variantRows) !== baselineRows;
  const duplicates = useMemo(() => duplicateSummary(variantRows), [variantRows]);
  const incompleteRows = useMemo(() => variantRows.filter((row) => !variantLabel(row)).length, [variantRows]);
  const canNavigateAway = useUnsavedChangesGuard(hasDraftChanges);
  const isFashion = commonDraft.itemKind === 'fashion';
  const primaryLabel = isFashion ? 'اللون / الرائحة' : 'الخاصية الأولى';
  const secondaryLabel = isFashion ? 'المقاس / الحجم' : 'الخاصية الثانية';

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = commonDraft.name.trim();
      const trimmedStyleCode = commonDraft.styleCode.trim();
      const cleanRows = sortVariants(variantRows.map((row) => ({
        id: row.id,
        color: row.color.trim(),
        size: row.size.trim(),
        barcode: row.barcode.trim(),
        useCustomPricing: Boolean(row.useCustomPricing),
        pricingEditorOpen: false,
        costPrice: Number(row.costPrice || 0),
        retailPrice: Number(row.retailPrice || 0),
        wholesalePrice: Number(row.wholesalePrice || 0),
      })).filter((row) => Boolean(variantLabel(row))));

      if (!trimmedName) throw new Error('اسم الصنف الأساسي مطلوب');
      if (!trimmedStyleCode) throw new Error('كود المجموعة / الموديل مطلوب');
      if (!cleanRows.length) throw new Error('أضف صنفًا فرعيًا واحدًا على الأقل');
      if (duplicates.duplicateCombos) throw new Error('يوجد صنف فرعي مكرر داخل نفس المجموعة');
      if (duplicates.duplicateBarcodes) throw new Error('يوجد باركود مكرر داخل نفس المجموعة');

      const sourceById = new Map(groupProducts.map((entry) => [String(entry.id), entry]));
      const keptIds = new Set<string>();
      for (const row of cleanRows) {
        const source = row.id ? sourceById.get(String(row.id)) : undefined;
        const payload = buildPayload({ ...commonDraft, name: trimmedName, styleCode: trimmedStyleCode }, row, source);
        if (row.id && source) {
          keptIds.add(String(row.id));
          await productsApi.update(String(row.id), payload);
        } else {
          await productsApi.create(payload);
        }
      }
      const removedExisting = groupProducts.filter((entry) => !keptIds.has(String(entry.id)) && !cleanRows.some((row) => String(row.id || '') === String(entry.id)));
      for (const entry of removedExisting) {
        await productsApi.remove(String(entry.id));
      }
      return cleanRows;
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.productsPage(`variant-group:${styleCode || product.id}`) });
      const refreshed = await queryClient.fetchQuery({ queryKey: queryKeys.products, queryFn: productsApi.list });
      const selected = refreshed.find((entry) => String(entry.id) === String(product.id)) || refreshed.find((entry) => String(entry.styleCode || '').trim() === commonDraft.styleCode.trim()) || null;
      if (selected) onSaved?.(selected);
    },
  });

  function handleGenerateStyleCode() {
    const sourceProducts = allProductsQuery.data || [];
    setCommonDraft((current) => ({ ...current, styleCode: getNextSequentialStyleCode(sourceProducts, getStyleCodeSequenceStart()) }));
  }

  function updateRow(index: number, patch: Partial<VariantDraft>) {
    setVariantRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addVariantRow() {
    setVariantRows((current) => [...current, {
      color: '',
      size: '',
      barcode: '',
      useCustomPricing: false,
      pricingEditorOpen: false,
      costPrice: Number(commonDraft.costPrice || 0),
      retailPrice: Number(commonDraft.retailPrice || 0),
      wholesalePrice: Number(commonDraft.wholesalePrice || 0),
    }]);
  }

  function generateSequentialBarcodes() {
    const prefix = commonDraft.styleCode.trim();
    if (!prefix) return;
    setVariantRows((current) => current.map((row, index) => ({
      ...row,
      barcode: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    })));
  }

  function toggleVariantPricing(index: number) {
    setVariantRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return { ...row, pricingEditorOpen: false };
      }
      if (!row.useCustomPricing) {
        return {
          ...row,
          useCustomPricing: true,
          pricingEditorOpen: true,
          costPrice: Number(row.costPrice || commonDraft.costPrice || 0),
          retailPrice: Number(row.retailPrice || commonDraft.retailPrice || 0),
          wholesalePrice: Number(row.wholesalePrice || commonDraft.wholesalePrice || 0),
        };
      }
      return {
        ...row,
        pricingEditorOpen: !row.pricingEditorOpen,
      };
    }));
  }

  function disableVariantPricing(index: number) {
    setVariantRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return {
        ...row,
        useCustomPricing: false,
        pricingEditorOpen: false,
        costPrice: Number(commonDraft.costPrice || 0),
        retailPrice: Number(commonDraft.retailPrice || 0),
        wholesalePrice: Number(commonDraft.wholesalePrice || 0),
      };
    }));
  }

  function removeDraftRow(index: number) {
    setVariantRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function resetDraft() {
    if (!canNavigateAway()) return;
    setCommonDraft({ ...toCommonDraft(seedProduct), name: deriveBaseName(seedProduct) });
    setVariantRows(toVariantRows(groupProducts));
  }

  return (
    <div className="page-stack" style={{ gap: '0.9rem' }} dir="rtl">
      {/* 1. Master Product Card */}
      <div className="product-compact-card">
        <div className="product-compact-card-header">
          <h3 className="product-compact-card-title">بيانات الصنف والأسعار الأساسية للمجموعة</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="cashier-chip" style={{ fontWeight: 700, background: '#dbeafe', color: '#1e40af' }}>
              {variantRows.length} صنف فرعي
            </span>
            {commonDraft.styleCode ? (
              <span className="cashier-chip" style={{ fontWeight: 600, background: '#f1f5f9', color: '#334155' }}>
                كود الموديل: {commonDraft.styleCode}
              </span>
            ) : null}
          </div>
        </div>

        <div className="page-stack" style={{ gap: '0.75rem' }}>
          {/* Row 1: 6 Columns: Name, StyleCode, Cost, Retail, Wholesale, MinStock */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 0.9fr)', gap: '0.65rem', alignItems: 'start' }}>
            <Field label="اسم الصنف الأساسي">
              <input
                className="purchase-prototype-field-input"
                style={{ fontWeight: 700, color: '#0f172a' }}
                value={commonDraft.name}
                onChange={(event) => setCommonDraft((current) => ({ ...current, name: normalizeArabicInput(event.target.value) }))}
                disabled={mutation.isPending}
                placeholder="مثال: مزيل عرق"
              />
            </Field>

            <Field label={isFashion ? 'كود الموديل' : 'كود المجموعة'}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  className="purchase-prototype-field-input"
                  style={{ fontWeight: 700 }}
                  value={commonDraft.styleCode}
                  onChange={(event) => setCommonDraft((current) => ({ ...current, styleCode: event.target.value }))}
                  disabled={mutation.isPending}
                  placeholder="106"
                />
                <Button type="button" variant="secondary" onClick={handleGenerateStyleCode} disabled={mutation.isPending} style={{ whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '0 8px' }}>
                  توليد
                </Button>
              </div>
            </Field>

            <Field label="سعر الشراء">
              <input
                className="purchase-prototype-field-input"
                type="number"
                step="0.01"
                value={commonDraft.costPrice}
                onChange={(event) => setCommonDraft((current) => ({ ...current, costPrice: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
              />
            </Field>

            <Field label="سعر البيع (قطاعي)">
              <input
                className="purchase-prototype-field-input"
                type="number"
                step="0.01"
                value={commonDraft.retailPrice}
                onChange={(event) => setCommonDraft((current) => ({ ...current, retailPrice: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
                style={{ fontWeight: 800, color: '#15803d' }}
              />
            </Field>

            <Field label="سعر الجملة">
              <input
                className="purchase-prototype-field-input"
                type="number"
                step="0.01"
                value={commonDraft.wholesalePrice}
                onChange={(event) => setCommonDraft((current) => ({ ...current, wholesalePrice: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
                style={{ fontWeight: 700, color: '#b45309' }}
              />
            </Field>

            <Field label="الحد الأدنى">
              <input
                className="purchase-prototype-field-input"
                type="number"
                value={commonDraft.minStock}
                onChange={(event) => setCommonDraft((current) => ({ ...current, minStock: Number(event.target.value || 0) }))}
                disabled={mutation.isPending}
              />
            </Field>
          </div>

          {/* Row 2: 4 Columns: Category, Supplier, Location, Notes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 2fr)', gap: '0.65rem', alignItems: 'start' }}>
            <Field label="القسم">
              <select
                className="purchase-prototype-field-input"
                value={commonDraft.categoryId}
                onChange={(event) => setCommonDraft((current) => ({ ...current, categoryId: event.target.value }))}
                disabled={mutation.isPending}
              >
                <option value="">بدون قسم</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>

            <Field label="المورد">
              <select
                className="purchase-prototype-field-input"
                value={commonDraft.supplierId}
                onChange={(event) => setCommonDraft((current) => ({ ...current, supplierId: event.target.value }))}
                disabled={mutation.isPending}
              >
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </Field>

            <Field label="المخزن الافتراضي">
              <select
                className="purchase-prototype-field-input"
                value={commonDraft.defaultLocationId || ''}
                onChange={(event) => setCommonDraft((current) => ({ ...current, defaultLocationId: event.target.value }))}
                disabled={mutation.isPending}
              >
                <option value="">بدون مخزن افتراضي</option>
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </Field>

            <Field label="ملاحظات حول الموديل">
              <input
                className="purchase-prototype-field-input"
                value={commonDraft.notes}
                onChange={(event) => setCommonDraft((current) => ({ ...current, notes: normalizeArabicInput(event.target.value) }))}
                disabled={mutation.isPending}
                placeholder="ملاحظات اختيارية..."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* 2. Child Variants Matrix Card */}
      <div className="product-compact-card">
        <div className="product-compact-card-header">
          <h3 className="product-compact-card-title">جدول الأصناف الفرعية والباركودات</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="primary"
              onClick={addVariantRow}
              disabled={mutation.isPending}
              style={{ fontSize: '0.78rem', padding: '4px 12px' }}
            >
              + إضافة صنف فرعي
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={generateSequentialBarcodes}
              disabled={mutation.isPending || !variantRows.length || !commonDraft.styleCode.trim()}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              توليد باركودات متسلسلة
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetDraft}
              disabled={mutation.isPending || !hasDraftChanges}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              إعادة القيم
            </Button>
          </div>
        </div>

        {/* Variants Table */}
        <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: 700, textAlign: 'right' }}>
                <th style={{ padding: '8px 10px', width: '32px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '8px 10px', minWidth: '120px' }}>{primaryLabel}</th>
                <th style={{ padding: '8px 10px', minWidth: '110px' }}>{secondaryLabel}</th>
                <th style={{ padding: '8px 10px', minWidth: '130px' }}>الباركود</th>
                <th style={{ padding: '8px 10px', minWidth: '160px' }}>الاسم النهائي للصنف</th>
                <th style={{ padding: '8px 10px', width: '150px', textAlign: 'center' }}>التسعير</th>
                <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>حذف</th>
              </tr>
            </thead>
            <tbody>
              {variantRows.map((row, index) => {
                const finalLabel = variantLabel(row);
                const fullName = commonDraft.name ? `${commonDraft.name}${finalLabel ? ` - ${finalLabel}` : ''}` : '-';

                return (
                  <Fragment key={`${row.id || 'draft'}-${index}`}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: '0.76rem' }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '5px 8px', fontSize: '0.82rem' }}
                          value={row.color}
                          onChange={(event) => updateRow(index, { color: normalizeArabicInput(event.target.value) })}
                          disabled={mutation.isPending}
                          placeholder={isFashion ? 'مثال: احمر' : 'مثال: توت'}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '5px 8px', fontSize: '0.82rem' }}
                          value={row.size}
                          onChange={(event) => updateRow(index, { size: normalizeArabicInput(event.target.value) })}
                          disabled={mutation.isPending}
                          placeholder={isFashion ? 'مثال: M' : 'اختياري'}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          className="purchase-prototype-field-input"
                          style={{ padding: '5px 8px', fontSize: '0.82rem', direction: 'ltr' }}
                          value={row.barcode}
                          onChange={(event) => updateRow(index, { barcode: event.target.value })}
                          disabled={mutation.isPending}
                          placeholder="اختياري"
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem' }}>
                          {fullName}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => toggleVariantPricing(index)}
                          disabled={mutation.isPending}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 8px',
                            borderRadius: '5px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            background: row.useCustomPricing ? '#eff6ff' : '#f1f5f9',
                            color: row.useCustomPricing ? '#1d4ed8' : '#475569',
                            border: row.useCustomPricing ? '1px solid #bfdbfe' : '1px solid #cbd5e1',
                          }}
                        >
                          {row.useCustomPricing ? `سعر مخصص (${formatCurrency(row.retailPrice)})` : `سعر الموديل (${formatCurrency(commonDraft.retailPrice)})`}
                        </button>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeDraftRow(index)}
                          disabled={mutation.isPending || variantRows.length === 1}
                          title={variantRows.length === 1 ? 'يجب أن يتبقى صنف فرعي واحد على الأقل' : 'حذف هذا الصنف الفرعي'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '5px',
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            cursor: variantRows.length === 1 ? 'not-allowed' : 'pointer',
                            opacity: variantRows.length === 1 ? 0.35 : 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Trash2Icon size={14} />
                        </button>
                      </td>
                    </tr>

                    {/* Inline Custom Pricing Card Drawer */}
                    {row.useCustomPricing && row.pricingEditorOpen && (
                      <tr style={{ background: '#f0f9ff' }}>
                        <td colSpan={7} style={{ padding: '10px 16px', borderBottom: '1px solid #bae6fd' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0369a1' }}>
                              تخصيص أسعار الفرعي: {fullName}
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => disableVariantPricing(index)}
                              disabled={mutation.isPending}
                              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                            >
                              الرجوع للسعر الموحد
                            </Button>
                          </div>

                          <div className="product-form-grid-3">
                            <Field label="سعر الشراء للفرعي">
                              <input
                                className="purchase-prototype-field-input"
                                type="number"
                                step="0.01"
                                value={row.costPrice}
                                onChange={(event) => updateRow(index, { costPrice: Number(event.target.value || 0) })}
                                disabled={mutation.isPending}
                              />
                            </Field>
                            <Field label="سعر البيع للفرعي">
                              <input
                                className="purchase-prototype-field-input"
                                type="number"
                                step="0.01"
                                value={row.retailPrice}
                                onChange={(event) => updateRow(index, { retailPrice: Number(event.target.value || 0) })}
                                disabled={mutation.isPending}
                                style={{ fontWeight: 800, color: '#15803d' }}
                              />
                            </Field>
                            <Field label="سعر الجملة للفرعي">
                              <input
                                className="purchase-prototype-field-input"
                                type="number"
                                step="0.01"
                                value={row.wholesalePrice}
                                onChange={(event) => updateRow(index, { wholesalePrice: Number(event.target.value || 0) })}
                                disabled={mutation.isPending}
                                style={{ fontWeight: 700, color: '#b45309' }}
                              />
                            </Field>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notices & Alerts */}
      <DraftStateNotice
        visible={hasDraftChanges && !mutation.isPending}
        title="توجد تعديلات غير محفوظة على هذا الموديل"
        hint="عند الضغط على حفظ، سيتم تحديث وتطبيق البيانات على جميع الأصناف الفرعية التابعة له في المخازن ونقطة البيع."
      />

      {incompleteRows ? (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
          يوجد {incompleteRows} سطر فرعي غير مكتمل. يرجى ملء الخاصية لتجنب تجاهل السطر.
        </div>
      ) : null}

      {duplicates.duplicateCombos ? (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 700 }}>
          يوجد صنف فرعي مكرر بنفس الخاصية داخل نفس المجموعة.
        </div>
      ) : null}

      {duplicates.duplicateBarcodes ? (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 700 }}>
          يوجد باركود مكرر مسند لأكثر من صنف فرعي داخل المجموعة.
        </div>
      ) : null}

      <MutationFeedback
        isError={mutation.isError}
        isSuccess={mutation.isSuccess}
        error={mutation.error}
        errorFallback="تعذر حفظ تعديلات المجموعة"
        successText="تم حفظ وتحديث الصنف الرئيسي وجميع الأصناف الفرعية بنجاح!"
      />

      {/* Sticky Bottom Footer Action Bar */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '10px 16px',
        boxShadow: '0 -2px 12px rgba(15, 23, 42, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 10,
      }}>
        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
          إجمالي الأصناف الفرعية: <strong style={{ color: '#0f172a' }}>{variantRows.length} صنف</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={resetDraft}
            disabled={mutation.isPending || !hasDraftChanges}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            إلغاء التعديلات
          </Button>

          <SubmitButton
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || duplicates.duplicateCombos > 0 || duplicates.duplicateBarcodes > 0 || !variantRows.length}
            idleText="حفظ كل التعديلات مرة واحدة"
            pendingText="جارٍ الحفظ..."
            style={{ fontSize: '0.84rem', padding: '6px 20px', fontWeight: 800 }}
          />
        </div>
      </div>
    </div>
  );
}
