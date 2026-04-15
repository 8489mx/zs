import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, ProductUnit, Supplier } from '@/types/domain';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { Button } from '@/shared/ui/button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useCreateProductMutation } from '@/features/products/hooks/useCreateProductMutation';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { buildFashionVariantDrafts, splitFashionTokens, type FashionVariantDraft } from '@/features/products/components/fashion-variants.utils';
import { invalidateCatalogDomain } from '@/app/query-invalidation';

interface ProductFormProps {
  categories: Category[];
  suppliers: Supplier[];
  onCategoryCreated?: (categoryId: string) => void;
  onSupplierCreated?: (supplierId: string) => void;
}

function getDefaultValues(itemKind: 'standard' | 'fashion' = 'standard'): ProductFormInput {
  return {
    name: '',
    barcode: '',
    itemKind,
    styleCode: '',
    color: '',
    size: '',
    fashionColors: '',
    fashionSizes: '',
    variantStock: 0,
    costPrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    stock: 0,
    minStock: 5,
    categoryId: '',
    supplierId: '',
    notes: ''
  };
}

function serializeVariantRows(rows: FashionVariantDraft[]) {
  return JSON.stringify(rows.map((row) => ({ color: row.color, size: row.size, barcode: row.barcode, stock: Number(row.stock || 0) })));
}

const LazyFashionVariantsBuilder = lazy(() => import('@/features/products/components/FashionVariantsBuilder').then((module) => ({ default: module.FashionVariantsBuilder })));

function makeStyleCodeSuggestion(name: string) {
  const cleaned = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join('-');
  const suffix = String(Date.now()).slice(-4);
  return cleaned ? `${cleaned}-${suffix}` : `GRP-${suffix}`;
}

export function ProductForm({ categories, suppliers, onCategoryCreated, onSupplierCreated }: ProductFormProps) {
  const settingsQuery = useSettingsQuery();
  const clothingModuleEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const defaultItemKind: 'standard' | 'fashion' = clothingModuleEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const defaultGroupedMode = defaultItemKind === 'fashion';
  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(undefined, ''));
  const [fashionVariantRows, setFashionVariantRows] = useState<FashionVariantDraft[]>([]);
  const [variantBarcodePrefix, setVariantBarcodePrefix] = useState('');
  const [groupedEntryEnabled, setGroupedEntryEnabled] = useState(defaultGroupedMode);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [inlineSupplierName, setInlineSupplierName] = useState('');
  const [inlineSupplierPhone, setInlineSupplierPhone] = useState('');
  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(defaultItemKind)
  });

  const queryClient = useQueryClient();
  const mutation = useCreateProductMutation(() => {
    form.reset(getDefaultValues(defaultItemKind));
    setUnits(normalizeProductUnits(undefined, ''));
    setFashionVariantRows([]);
    setVariantBarcodePrefix('');
    setGroupedEntryEnabled(defaultGroupedMode);
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
  });

  useWatch({ control: form.control });
  const watchedBarcode = form.watch('barcode');
  const watchedItemKind = clothingModuleEnabled && form.watch('itemKind') === 'fashion' ? 'fashion' : 'standard';
  const watchedName = form.watch('name');
  const watchedStyleCode = form.watch('styleCode');
  const watchedFashionColors = form.watch('fashionColors');
  const watchedFashionSizes = form.watch('fashionSizes');
  const watchedVariantStock = Number(form.watch('variantStock') || 0);
  const usesVariantBuilder = watchedItemKind === 'fashion' || groupedEntryEnabled;

  useEffect(() => {
    if (watchedItemKind === 'fashion' && !groupedEntryEnabled) setGroupedEntryEnabled(true);
  }, [watchedItemKind, groupedEntryEnabled]);

  const colorTokens = useMemo(() => splitFashionTokens(watchedFashionColors), [watchedFashionColors]);
  const sizeTokens = useMemo(() => splitFashionTokens(watchedFashionSizes), [watchedFashionSizes]);
  const syncedDefaultFashionRows = useMemo(
    () => buildFashionVariantDrafts(colorTokens, sizeTokens, [], watchedVariantStock),
    [colorTokens, sizeTokens, watchedVariantStock],
  );
  const hasUnitsDraftChanges = useMemo(
    () => usesVariantBuilder ? false : JSON.stringify(units) !== JSON.stringify(normalizeProductUnits(undefined, (watchedBarcode || '').trim())),
    [units, watchedBarcode, usesVariantBuilder],
  );
  const hasFashionDraftChanges = useMemo(
    () => usesVariantBuilder && (serializeVariantRows(fashionVariantRows) !== serializeVariantRows(syncedDefaultFashionRows) || Boolean(variantBarcodePrefix.trim())),
    [fashionVariantRows, syncedDefaultFashionRows, variantBarcodePrefix, usesVariantBuilder],
  );
  const duplicateFashionBarcodes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of fashionVariantRows) {
      const barcode = String(row.barcode || '').trim().toLowerCase();
      if (!barcode) continue;
      counts.set(barcode, Number(counts.get(barcode) || 0) + 1);
    }
    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [fashionVariantRows]);
  const hasDraftChanges = form.formState.isDirty || hasUnitsDraftChanges || hasFashionDraftChanges || Boolean(inlineCategoryName.trim()) || Boolean(inlineSupplierName.trim()) || Boolean(inlineSupplierPhone.trim()) || groupedEntryEnabled !== defaultGroupedMode;

  useEffect(() => {
    if (!usesVariantBuilder) {
      if (fashionVariantRows.length) setFashionVariantRows([]);
      if (variantBarcodePrefix) setVariantBarcodePrefix('');
      if (form.getValues('fashionColors')) form.setValue('fashionColors', '', { shouldDirty: false, shouldValidate: false });
      if (form.getValues('fashionSizes')) form.setValue('fashionSizes', '', { shouldDirty: false, shouldValidate: false });
      if (Number(form.getValues('variantStock') || 0) !== 0) form.setValue('variantStock', 0, { shouldDirty: false, shouldValidate: false });
      return;
    }
    setFashionVariantRows((current) => buildFashionVariantDrafts(colorTokens, sizeTokens, current, watchedVariantStock));
  }, [usesVariantBuilder, colorTokens, sizeTokens, watchedVariantStock, form, fashionVariantRows.length, variantBarcodePrefix]);

  const categoryMutation = useMutation<{ id?: string | number; category?: { id?: string | number }; data?: { id?: string | number } }, Error, void>({
    mutationFn: async () => {
      const name = inlineCategoryName.trim();
      if (!name) throw new Error('اكتب اسم القسم');
      return productsApi.createCategory({ name }) as Promise<{ id?: string | number; category?: { id?: string | number }; data?: { id?: string | number } }>;
    },
    onSuccess: async (created) => {
      const nextId = String(created?.id || created?.category?.id || created?.data?.id || '');
      setInlineCategoryName('');
      await invalidateCatalogDomain(queryClient, { includeCategories: true });
      if (nextId) {
        form.setValue('categoryId', nextId);
        onCategoryCreated?.(nextId);
      }
    }
  });

  const supplierMutation = useMutation<{ id?: string | number; supplier?: { id?: string | number }; data?: { id?: string | number } }, Error, void>({
    mutationFn: async () => {
      const name = inlineSupplierName.trim();
      if (!name) throw new Error('اكتب اسم المورد');
      return productsApi.createSupplier({ name, phone: inlineSupplierPhone.trim(), address: '', balance: 0, notes: '' }) as Promise<{ id?: string | number; supplier?: { id?: string | number }; data?: { id?: string | number } }>;
    },
    onSuccess: async (created) => {
      const nextId = String(created?.id || created?.supplier?.id || created?.data?.id || '');
      setInlineSupplierName('');
      setInlineSupplierPhone('');
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      if (nextId) {
        form.setValue('supplierId', nextId);
        onSupplierCreated?.(nextId);
      }
    }
  });

  useMutationFeedbackReset(categoryMutation.isSuccess || categoryMutation.isError, categoryMutation.reset, inlineCategoryName.trim());
  useMutationFeedbackReset(supplierMutation.isSuccess || supplierMutation.isError, supplierMutation.reset, JSON.stringify([inlineSupplierName.trim(), inlineSupplierPhone.trim()]));

  const canNavigateAway = useUnsavedChangesGuard(hasDraftChanges && !mutation.isPending && !categoryMutation.isPending && !supplierMutation.isPending);

  function handleUnitsChange(nextUnits: ProductUnit[]) {
    const baseBarcode = (watchedBarcode || '').trim();
    const mapped = nextUnits.map((unit, index) => ({ ...unit, barcode: unit.barcode || (index === 0 ? baseBarcode : unit.barcode) }));
    setUnits(mapped);
  }

  function handleReset() {
    if (!hasDraftChanges) return;
    if (!canNavigateAway()) return;
    mutation.reset();
    categoryMutation.reset();
    supplierMutation.reset();
    form.reset(getDefaultValues(defaultItemKind));
    setUnits(normalizeProductUnits(undefined, ''));
    setFashionVariantRows([]);
    setVariantBarcodePrefix('');
    setGroupedEntryEnabled(defaultGroupedMode);
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
  }

  function handleGenerateStyleCode() {
    form.setValue('styleCode', makeStyleCodeSuggestion(watchedName), { shouldDirty: true, shouldValidate: true });
  }

  const builderMode = watchedItemKind === 'fashion' ? 'fashion' : 'standard';
  const primaryTitle = watchedItemKind === 'fashion' ? 'موديل ملابس' : groupedEntryEnabled ? 'صنف رئيسي مع أصناف فرعية' : 'صنف مفرد';
  const submitText = watchedItemKind === 'fashion'
    ? 'إنشاء الموديل بكل المقاسات والألوان'
    : groupedEntryEnabled
      ? 'إنشاء الصنف الرئيسي بكل الأصناف الفرعية'
      : 'حفظ الصنف';

  return (
    <form className="page-stack" onSubmit={form.handleSubmit((values) => mutation.mutate({ ...values, itemKind: watchedItemKind, units, fashionVariantRows, groupedEntryEnabled: usesVariantBuilder }))}>
      <DraftStateNotice visible={hasDraftChanges && !mutation.isPending} title="بيانات الصنف الحالي لم تُحفظ بعد" hint="يشمل ذلك الوحدات الجديدة أو الإضافة السريعة للقسم والمورد من نفس النموذج، ومعها تجهيز الأصناف الفرعية قبل الإنشاء." />

      <div className="surface-note" style={{ padding: 12 }}>
        <div className="actions compact-actions" style={{ flexWrap: 'wrap' }}>
          {clothingModuleEnabled ? (
            <div className="field" style={{ minWidth: 220 }}><label>نوع الصنف</label>
              <select {...form.register('itemKind')} disabled={mutation.isPending}>
                <option value="standard">صنف عادي</option>
                <option value="fashion">موديل ملابس</option>
              </select>
            </div>
          ) : null}
          {watchedItemKind === 'standard' ? (
            <>
              <Button type="button" variant={!groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(false)} disabled={mutation.isPending}>صنف مفرد</Button>
              <Button type="button" variant={groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(true)} disabled={mutation.isPending}>صنف رئيسي + أصناف فرعية</Button>
            </>
          ) : null}
          <span className="cashier-chip">{primaryTitle}</span>
        </div>
      </div>

      <div className="form-grid">
        <Field label={watchedItemKind === 'fashion' ? 'اسم الموديل الأساسي' : groupedEntryEnabled ? 'اسم الصنف الأساسي' : 'اسم الصنف'} error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} placeholder={watchedItemKind === 'fashion' ? 'مثال: تيشيرت بنجول' : groupedEntryEnabled ? 'مثال: مزيل عرق X' : undefined} /></Field>

        {usesVariantBuilder ? (
          <Field label={watchedItemKind === 'fashion' ? 'كود الموديل' : 'كود المجموعة / الصنف الرئيسي'}>
            <div className="inline-create-row">
              <input {...form.register('styleCode')} disabled={mutation.isPending} placeholder={watchedItemKind === 'fashion' ? 'مثال: TS-2401' : 'مثال: DEO-X'} />
              <button type="button" className="btn btn-secondary" onClick={handleGenerateStyleCode} disabled={mutation.isPending}>توليد كود</button>
            </div>
          </Field>
        ) : (
          <>
            <Field label="الباركود"><input {...form.register('barcode')} disabled={mutation.isPending} /></Field>
            {clothingModuleEnabled ? <Field label="كود المجموعة / الموديل"><input {...form.register('styleCode')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="الخاصية الأولى"><input {...form.register('color')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="الخاصية الثانية"><input {...form.register('size')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
          </>
        )}

        <Field label="سعر الشراء"><input type="number" step="0.01" {...form.register('costPrice')} disabled={mutation.isPending} /></Field>
        <Field label="سعر القطاعي"><input type="number" step="0.01" {...form.register('retailPrice')} disabled={mutation.isPending} /></Field>
        <Field label="سعر الجملة"><input type="number" step="0.01" {...form.register('wholesalePrice')} disabled={mutation.isPending} /></Field>
        {!usesVariantBuilder ? <Field label="المخزون الافتتاحي"><input type="number" {...form.register('stock')} disabled={mutation.isPending} /></Field> : null}
        <Field label="الحد الأدنى"><input type="number" {...form.register('minStock')} disabled={mutation.isPending} /></Field>

        <div className="field">
          <label>القسم</label>
          <select {...form.register('categoryId')} disabled={mutation.isPending || categoryMutation.isPending}>
            <option value="">بدون قسم</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div className="inline-create-row">
            <input value={inlineCategoryName} onChange={(event) => setInlineCategoryName(event.target.value)} placeholder="إضافة قسم جديد من نفس النموذج" disabled={mutation.isPending || categoryMutation.isPending} />
            <button type="button" className="btn btn-secondary" onClick={() => categoryMutation.mutate()} disabled={mutation.isPending || categoryMutation.isPending || !inlineCategoryName.trim()}>إضافة قسم</button>
          </div>
        </div>

        <div className="field">
          <label>المورد</label>
          <select {...form.register('supplierId')} disabled={mutation.isPending || supplierMutation.isPending}>
            <option value="">بدون مورد</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
          <div className="inline-create-row">
            <input value={inlineSupplierName} onChange={(event) => setInlineSupplierName(event.target.value)} placeholder="إضافة مورد جديد" disabled={mutation.isPending || supplierMutation.isPending} />
            <input value={inlineSupplierPhone} onChange={(event) => setInlineSupplierPhone(event.target.value)} placeholder="الهاتف" disabled={mutation.isPending || supplierMutation.isPending} />
            <button type="button" className="btn btn-secondary" onClick={() => supplierMutation.mutate()} disabled={mutation.isPending || supplierMutation.isPending || !inlineSupplierName.trim()}>إضافة مورد</button>
          </div>
        </div>

        <Field label="ملاحظات"><textarea {...form.register('notes')} rows={4} disabled={mutation.isPending} /></Field>
      </div>

      {usesVariantBuilder ? (
        <Suspense fallback={<div className="loading-card">جاري تجهيز أدوات الأصناف الفرعية...</div>}>
          <LazyFashionVariantsBuilder
            mode={builderMode}
            name={watchedName || ''}
            styleCode={watchedStyleCode || ''}
            colorsValue={watchedFashionColors || ''}
            sizesValue={watchedFashionSizes || ''}
            defaultStock={watchedVariantStock}
            barcodePrefix={variantBarcodePrefix}
            rows={fashionVariantRows}
            disabled={mutation.isPending}
            onColorsChange={(value) => form.setValue('fashionColors', value, { shouldDirty: true, shouldValidate: true })}
            onSizesChange={(value) => form.setValue('fashionSizes', value, { shouldDirty: true, shouldValidate: true })}
            onDefaultStockChange={(value) => form.setValue('variantStock', value, { shouldDirty: true, shouldValidate: true })}
            onBarcodePrefixChange={setVariantBarcodePrefix}
            onRowsChange={setFashionVariantRows}
          />
        </Suspense>
      ) : (
        <ProductUnitsEditor units={units} onChange={handleUnitsChange} disabled={mutation.isPending} title="وحدات الصنف" />
      )}

      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الصنف" successText={usesVariantBuilder ? 'تم حفظ الصنف الأساسي مع أصنافه الفرعية بنجاح.' : 'تم حفظ الصنف بنجاح.'} />
      {usesVariantBuilder && duplicateFashionBarcodes ? <div className="muted small" style={{ color: '#b91c1c' }}>يوجد باركودات مكررة داخل نفس المجموعة. صححها قبل الحفظ.</div> : null}
      <div className="actions">
        <FormResetButton onReset={handleReset} disabled={!hasDraftChanges || mutation.isPending}>إعادة القيم</FormResetButton>
        <SubmitButton type="submit" disabled={mutation.isPending || (usesVariantBuilder && (!fashionVariantRows.length || duplicateFashionBarcodes > 0 || !String(watchedStyleCode || '').trim()))} idleText={submitText} pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
