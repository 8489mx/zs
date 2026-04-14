/* eslint-disable max-lines */
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
import { normalizeArabicInput, normalizeArabicSearchKey } from '@/lib/arabic-normalization';
import type { Category, Product, Supplier } from '@/types/domain';

interface FashionGroupEditorCardProps {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  onSaved?: (product: Product) => void;
}

type CommonDraft = {
  name: string;
  styleCode: string;
  itemKind: 'standard' | 'fashion';
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  minStock: number;
  categoryId: string;
  supplierId: string;
  notes: string;
};

type VariantDraft = {
  id?: string;
  color: string;
  size: string;
  barcode: string;
  useCustomPricing: boolean;
  pricingEditorOpen: boolean;
  costPrice: number;
  retailPrice: number;
  wholesalePrice: number;
};

function toCommonDraft(product: Product): CommonDraft {
  return {
    name: product.name || '',
    styleCode: product.styleCode || '',
    itemKind: product.itemKind === 'fashion' ? 'fashion' : 'standard',
    costPrice: Number(product.costPrice || 0),
    retailPrice: Number(product.retailPrice || 0),
    wholesalePrice: Number(product.wholesalePrice || 0),
    minStock: Number(product.minStock || 0),
    categoryId: product.categoryId || '',
    supplierId: product.supplierId || '',
    notes: product.notes || '',
  };
}

function variantLabel(row: Pick<VariantDraft, 'color' | 'size'>) {
  const primary = normalizeArabicInput(String(row.color || ''));
  const secondary = normalizeArabicInput(String(row.size || ''));
  if (primary && secondary) return `${primary} / ${secondary}`;
  return primary || secondary;
}

function sortVariants(rows: VariantDraft[]) {
  return [...rows].sort((a, b) => variantLabel(a).localeCompare(variantLabel(b), 'ar'));
}

function toVariantRows(products: Product[]) {
  const baseline = products[0];
  const baselineCost = Number(baseline?.costPrice || 0);
  const baselineRetail = Number(baseline?.retailPrice || 0);
  const baselineWholesale = Number(baseline?.wholesalePrice || 0);
  return sortVariants(products.map((entry) => {
    const costPrice = Number(entry.costPrice || 0);
    const retailPrice = Number(entry.retailPrice || 0);
    const wholesalePrice = Number(entry.wholesalePrice || 0);
    const useCustomPricing = costPrice !== baselineCost || retailPrice !== baselineRetail || wholesalePrice !== baselineWholesale;
    return {
      id: String(entry.id),
      color: entry.color || '',
      size: entry.size || '',
      barcode: entry.barcode || '',
      useCustomPricing,
      pricingEditorOpen: false,
      costPrice,
      retailPrice,
      wholesalePrice,
    };
  }));
}

function rowsFingerprint(rows: VariantDraft[]) {
  return JSON.stringify(sortVariants(rows).map((row) => ({
    id: row.id || '',
    color: row.color.trim(),
    size: row.size.trim(),
    barcode: row.barcode.trim(),
    useCustomPricing: Boolean(row.useCustomPricing),
    costPrice: Number(row.costPrice || 0),
    retailPrice: Number(row.retailPrice || 0),
    wholesalePrice: Number(row.wholesalePrice || 0),
  })));
}

function duplicateSummary(rows: VariantDraft[]) {
  const comboCounts = new Map<string, number>();
  const barcodeCounts = new Map<string, number>();
  let duplicateCombos = 0;
  let duplicateBarcodes = 0;
  for (const row of rows) {
    const combo = `${normalizeArabicSearchKey(String(row.color || ''))}::${normalizeArabicSearchKey(String(row.size || ''))}`;
    if (combo !== '::') {
      const nextCombo = Number(comboCounts.get(combo) || 0) + 1;
      comboCounts.set(combo, nextCombo);
      if (nextCombo === 2) duplicateCombos += 1;
    }
    const barcode = String(row.barcode || '').trim().toLowerCase();
    if (barcode) {
      const nextBarcode = Number(barcodeCounts.get(barcode) || 0) + 1;
      barcodeCounts.set(barcode, nextBarcode);
      if (nextBarcode === 2) duplicateBarcodes += 1;
    }
  }
  return { duplicateCombos, duplicateBarcodes };
}

function buildPayload(common: CommonDraft, row: VariantDraft, source?: Product) {
  const label = variantLabel(row);
  return {
    name: label ? `${common.name.trim()} - ${label}` : common.name.trim(),
    barcode: row.barcode.trim(),
    itemKind: common.itemKind,
    styleCode: common.styleCode.trim(),
    color: row.color.trim(),
    size: row.size.trim(),
    costPrice: Number((row.useCustomPricing ? row.costPrice : common.costPrice) || 0),
    retailPrice: Number((row.useCustomPricing ? row.retailPrice : common.retailPrice) || 0),
    wholesalePrice: Number((row.useCustomPricing ? row.wholesalePrice : common.wholesalePrice) || 0),
    minStock: Number(common.minStock || 0),
    categoryId: common.categoryId || '',
    supplierId: common.supplierId || '',
    notes: common.notes || '',
    units: [{ name: 'قطعة', multiplier: 1, barcode: row.barcode.trim(), isBaseUnit: true, isSaleUnit: true, isPurchaseUnit: true }],
    offers: (source?.offers || []).map((offer) => ({
      type: offer.type === 'price' ? 'price' : offer.type === 'fixed' ? 'fixed' : 'percent',
      value: Number(offer.value || 0),
      minQty: Math.max(1, Number(offer.minQty || 1)),
      from: offer.from || null,
      to: offer.to || null,
    })),
    customerPrices: (source?.customerPrices || []).map((entry) => ({
      customerId: Number(entry.customerId || 0),
      price: Number(entry.price || 0),
    })).filter((entry) => entry.customerId > 0 && entry.price >= 0),
    fashionVariants: [],
  };
}

function deriveBaseName(entry: Product) {
  const label = variantLabel({ color: entry.color || '', size: entry.size || '' });
  const rawName = String(entry.name || '').trim();
  if (!label) return rawName;
  const suffix = ` - ${label}`;
  return rawName.endsWith(suffix) ? rawName.slice(0, -suffix.length).trim() : rawName;
}

export function FashionGroupEditorCard({ product, categories, suppliers, onSaved }: FashionGroupEditorCardProps) {
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
  const primaryLabel = isFashion ? 'اللون' : 'الخاصية الأولى';
  const secondaryLabel = isFashion ? 'المقاس' : 'الخاصية الثانية';
  const groupTitle = isFashion ? 'تعديل الموديل بالكامل مرة واحدة' : 'تعديل الصنف الرئيسي وكل الأصناف الفرعية مرة واحدة';
  const groupHint = isFashion
    ? 'عدّل البيانات العامة للموديل مرة واحدة، وسيتم تطبيقها على كل الألوان والمقاسات.'
    : 'عدّل السعر والقسم والمورد والملاحظات مرة واحدة على الصنف الرئيسي، وسيتم تطبيقها على كل الأصناف الفرعية التابعة له.';

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

  function toggleVariantPricing(index: number) {
    setVariantRows((current) => current.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return {
          ...row,
          pricingEditorOpen: false,
        };
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
    <div className="page-stack fashion-group-editor">
      <div className="surface-note fashion-group-editor__intro">
        <strong>{groupTitle}</strong>
        <div className="muted small">{groupHint}</div>
      </div>

      <div className="actions compact-actions fashion-group-editor__badges">
        <span className="cashier-chip">{variantRows.length} صنف فرعي</span>
        {styleCode ? <span className="cashier-chip">مجموعة {styleCode}</span> : null}
      </div>

      <div className="form-grid">
        <Field label="اسم الصنف الأساسي"><input value={commonDraft.name} onChange={(event) => setCommonDraft((current) => ({ ...current, name: normalizeArabicInput(event.target.value) }))} disabled={mutation.isPending} /></Field>
        <Field label={isFashion ? 'كود الموديل' : 'كود المجموعة / الصنف الرئيسي'}><input value={commonDraft.styleCode} onChange={(event) => setCommonDraft((current) => ({ ...current, styleCode: event.target.value }))} disabled={mutation.isPending} placeholder={isFashion ? 'مثال: TS-2401' : 'مثال: DEO-X'} /></Field>
        <Field label="سعر الشراء"><input type="number" step="0.01" value={commonDraft.costPrice} onChange={(event) => setCommonDraft((current) => ({ ...current, costPrice: Number(event.target.value || 0) }))} disabled={mutation.isPending} /></Field>
        <Field label="سعر القطاعي"><input type="number" step="0.01" value={commonDraft.retailPrice} onChange={(event) => setCommonDraft((current) => ({ ...current, retailPrice: Number(event.target.value || 0) }))} disabled={mutation.isPending} /></Field>
        <Field label="سعر الجملة"><input type="number" step="0.01" value={commonDraft.wholesalePrice} onChange={(event) => setCommonDraft((current) => ({ ...current, wholesalePrice: Number(event.target.value || 0) }))} disabled={mutation.isPending} /></Field>
        <Field label="الحد الأدنى"><input type="number" value={commonDraft.minStock} onChange={(event) => setCommonDraft((current) => ({ ...current, minStock: Number(event.target.value || 0) }))} disabled={mutation.isPending} /></Field>
        <Field label="القسم">
          <select value={commonDraft.categoryId} onChange={(event) => setCommonDraft((current) => ({ ...current, categoryId: event.target.value }))} disabled={mutation.isPending}>
            <option value="">بدون قسم</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </Field>
        <Field label="المورد">
          <select value={commonDraft.supplierId} onChange={(event) => setCommonDraft((current) => ({ ...current, supplierId: event.target.value }))} disabled={mutation.isPending}>
            <option value="">بدون مورد</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </Field>
        <Field label="ملاحظات"><textarea rows={4} value={commonDraft.notes} onChange={(event) => setCommonDraft((current) => ({ ...current, notes: normalizeArabicInput(event.target.value) }))} disabled={mutation.isPending} /></Field>
      </div>

      <div className="actions compact-actions fashion-group-editor__toolbar">
        <Button type="button" variant="secondary" onClick={addVariantRow} disabled={mutation.isPending}>إضافة صنف فرعي</Button>
        <Button type="button" variant="secondary" onClick={resetDraft} disabled={mutation.isPending || !hasDraftChanges}>إعادة القيم</Button>
      </div>

      <div className="fashion-group-editor__table-wrap">
        <table className="fashion-group-editor__table">
          <thead>
            <tr>
              <th>{primaryLabel}</th>
              <th>{secondaryLabel}</th>
              <th>الباركود</th>
              <th>الاسم النهائي</th>
              <th>السعر</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {variantRows.map((row, index) => (
              <Fragment key={`${row.id || 'draft'}-${index}`}>
                <tr>
                  <td><input value={row.color} onChange={(event) => updateRow(index, { color: normalizeArabicInput(event.target.value) })} disabled={mutation.isPending} placeholder={isFashion ? 'مثال: احمر' : 'مثال: توت'} /></td>
                  <td><input value={row.size} onChange={(event) => updateRow(index, { size: normalizeArabicInput(event.target.value) })} disabled={mutation.isPending} placeholder={isFashion ? 'مثال: M' : 'اختياري'} /></td>
                  <td><input value={row.barcode} onChange={(event) => updateRow(index, { barcode: event.target.value })} disabled={mutation.isPending} placeholder="اختياري" /></td>
                  <td><span className="muted small">{commonDraft.name ? `${commonDraft.name}${variantLabel(row) ? ` - ${variantLabel(row)}` : ''}` : '-'}</span></td>
                  <td>
                    <Button type="button" variant={row.useCustomPricing ? 'primary' : 'secondary'} onClick={() => toggleVariantPricing(index)} disabled={mutation.isPending}>
                      {row.useCustomPricing ? (row.pricingEditorOpen ? 'إخفاء السعر الفرعي' : 'سعر فرعي مفعل') : 'سعر أساسي'}
                    </Button>
                  </td>
                  <td>
                    <Button type="button" variant="secondary" onClick={() => removeDraftRow(index)} disabled={mutation.isPending || variantRows.length === 1}>
                      حذف السطر
                    </Button>
                  </td>
                </tr>
                {row.useCustomPricing && row.pricingEditorOpen ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="form-grid" style={{ padding: '12px 0' }}>
                        <Field label="سعر الشراء للفرعي"><input type="number" step="0.01" value={row.costPrice} onChange={(event) => updateRow(index, { costPrice: Number(event.target.value || 0) })} disabled={mutation.isPending} /></Field>
                        <Field label="سعر القطاعي للفرعي"><input type="number" step="0.01" value={row.retailPrice} onChange={(event) => updateRow(index, { retailPrice: Number(event.target.value || 0) })} disabled={mutation.isPending} /></Field>
                        <Field label="سعر الجملة للفرعي"><input type="number" step="0.01" value={row.wholesalePrice} onChange={(event) => updateRow(index, { wholesalePrice: Number(event.target.value || 0) })} disabled={mutation.isPending} /></Field>
                      </div>
                      <div className="actions compact-actions" style={{ paddingBottom: '12px' }}>
                        <Button type="button" variant="secondary" onClick={() => disableVariantPricing(index)} disabled={mutation.isPending}>
                          الرجوع للسعر الأساسي
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <DraftStateNotice visible={hasDraftChanges && !mutation.isPending} title="فيه تعديلات غير محفوظة على الصنف الرئيسي" hint="الأسعار العامة فوق تطبق على الكل، وأي سعر فرعي مفعّل تحت يظل خاصًا بهذا السطر فقط." />
      {incompleteRows ? <div className="muted small" style={{ color: '#b45309' }}>يوجد {incompleteRows} سطر غير مكتمل. سيتم تجاهله حتى تكتب قيمة فرعية واحدة على الأقل.</div> : null}
      {duplicates.duplicateCombos ? <div className="muted small" style={{ color: '#b91c1c' }}>يوجد تكرار داخل نفس المجموعة.</div> : null}
      {duplicates.duplicateBarcodes ? <div className="muted small" style={{ color: '#b91c1c' }}>يوجد باركود مكرر داخل نفس المجموعة.</div> : null}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث المجموعة" successText="تم تحديث الصنف الرئيسي وكل الأصناف الفرعية بنجاح." />
      <div className="actions">
        <SubmitButton type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || duplicates.duplicateCombos > 0 || duplicates.duplicateBarcodes > 0} idleText="حفظ كل التعديلات مرة واحدة" pendingText="جارٍ الحفظ..." />
      </div>
    </div>
  );
}
