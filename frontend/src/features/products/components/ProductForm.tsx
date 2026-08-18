import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, ProductUnit, Supplier, Location } from '@/types/domain';
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
import { extractCreatedEntityId } from '@/lib/api/extract-created-entity-id';

interface ProductFormProps {
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onCategoryCreated?: (categoryId: string) => void;
  onSupplierCreated?: (supplierId: string) => void;
  onSuccess?: (productId: string, name: string) => void;
  initialName?: string;
}

const normalizeLookupText = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();

const findCreatedCategoryId = (categories: Category[], name: string) => {
  const normalizedName = normalizeLookupText(name);
  if (!normalizedName) return '';
  const matched = [...categories].reverse().find((category) => normalizeLookupText(category.name) === normalizedName);
  return matched?.id ? String(matched.id) : '';
};

const findCreatedSupplierId = (suppliers: Supplier[], name: string, phone: string) => {
  const normalizedName = normalizeLookupText(name);
  const normalizedPhone = normalizeLookupText(phone);
  if (!normalizedName) return '';
  const matched = [...suppliers].reverse().find((supplier) => {
    if (normalizeLookupText(supplier.name) !== normalizedName) return false;
    return normalizedPhone ? normalizeLookupText(supplier.phone) === normalizedPhone : true;
  });
  return matched?.id ? String(matched.id) : '';
};

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
    warehouseId: '',
    notes: '',
    trackSerials: false,
    taxCodeType: 'GS1',
    taxCode: '',
    metadata: {
      oemNumber: '',
      carBrand: '',
      carModel: '',
      carYearFrom: '',
      carYearTo: '',
      origin: '',
      condition: ''
    }
  };
}

function serializeVariantRows(rows: FashionVariantDraft[]) {
  return JSON.stringify(rows.map((row) => ({ color: row.color, size: row.size, barcode: row.barcode, stock: Number(row.stock || 0) })));
}

const LazyFashionVariantsBuilder = lazy(() => import('@/features/products/components/FashionVariantsBuilder').then((module) => ({ default: module.FashionVariantsBuilder })));

async function generateNextStyleCode() {
  const result = await productsApi.allocateStyleCode();
  return result.styleCode;
}

export function ProductForm({ categories, suppliers, locations, onCategoryCreated, onSupplierCreated, onSuccess, initialName }: ProductFormProps) {
  const settingsQuery = useSettingsQuery();
  const clothingModuleEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const manufacturingModuleEnabled = settingsQuery.data?.manufacturingModuleEnabled === true;
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;
  const defaultItemKind: 'standard' | 'fashion' = clothingModuleEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const defaultGroupedMode = defaultItemKind === 'fashion';
  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(undefined, ''));
  const [fashionVariantRows, setFashionVariantRows] = useState<FashionVariantDraft[]>([]);
  const [variantBarcodePrefix, setVariantBarcodePrefix] = useState('');
  const [groupedEntryEnabled, setGroupedEntryEnabled] = useState(defaultGroupedMode);
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [inlineSupplierName, setInlineSupplierName] = useState('');
  const [inlineSupplierPhone, setInlineSupplierPhone] = useState('');
  const [isGeneratingStyleCode, setIsGeneratingStyleCode] = useState(false);
  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      ...getDefaultValues(defaultItemKind),
      name: initialName || ''
    }
  });

  const queryClient = useQueryClient();
  const mutation = useCreateProductMutation((productId, name) => {
    form.reset({
      ...getDefaultValues(defaultItemKind),
      name: initialName || ''
    });
    setUnits(normalizeProductUnits(undefined, ''));
    setFashionVariantRows([]);
    setVariantBarcodePrefix('');
    setGroupedEntryEnabled(defaultGroupedMode);
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
    onSuccess?.(productId, name);
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

  useEffect(() => {
    if (locations.length === 1) {
      const singleLocId = String(locations[0].id);
      if (form.getValues('warehouseId') !== singleLocId) {
        form.setValue('warehouseId', singleLocId, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [locations, form]);


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
      const createdName = inlineCategoryName.trim();
      let nextId = extractCreatedEntityId(created);
      setInlineCategoryName('');
      await invalidateCatalogDomain(queryClient, { includeCategories: true });
      if (!nextId) {
        nextId = findCreatedCategoryId(await productsApi.categories(), createdName);
      }
      if (nextId) {
        form.setValue('categoryId', nextId, { shouldDirty: true, shouldValidate: true });
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
      const createdName = inlineSupplierName.trim();
      const createdPhone = inlineSupplierPhone.trim();
      let nextId = extractCreatedEntityId(created);
      setInlineSupplierName('');
      setInlineSupplierPhone('');
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
      if (!nextId) {
        nextId = findCreatedSupplierId(await productsApi.suppliers(), createdName, createdPhone);
      }
      if (nextId) {
        form.setValue('supplierId', nextId, { shouldDirty: true, shouldValidate: true });
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

  async function handleGenerateStyleCode() {
    if (isGeneratingStyleCode) return;
    setIsGeneratingStyleCode(true);
    try {
      const nextCode = await generateNextStyleCode();
      form.setValue('styleCode', nextCode, { shouldDirty: true, shouldValidate: true });
    } finally {
      setIsGeneratingStyleCode(false);
    }
  }

  const builderMode = watchedItemKind === 'fashion' ? 'fashion' : 'standard';

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
              <Button type="button" variant={!groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(false)} disabled={mutation.isPending}>صنف عادي (بسيط)</Button>
              <Button type="button" variant={groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(true)} disabled={mutation.isPending}>صنف بمتغيرات (أنواع/أحجام)</Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="form-grid">
        {manufacturingModuleEnabled ? (
          <Field label="تصنيف الصنف">
            <select {...form.register('itemType')} disabled={mutation.isPending}>
              <option value="product">منتج نهائي للبيع</option>
              <option value="raw_material">مادة خام / مكون تصنيع</option>
            </select>
          </Field>
        ) : null}
        <Field label={watchedItemKind === 'fashion' ? 'اسم الموديل الأساسي' : groupedEntryEnabled ? 'اسم الصنف الأساسي' : 'اسم الصنف'} error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} placeholder={watchedItemKind === 'fashion' ? 'مثال: تيشيرت بنجول' : groupedEntryEnabled ? 'مثال: مزيل عرق X' : undefined} /></Field>

        {usesVariantBuilder ? (
          <Field label={watchedItemKind === 'fashion' ? 'كود الموديل' : 'كود المجموعة / الصنف الرئيسي'}>
            <div className="inline-create-row">
              <input {...form.register('styleCode')} disabled={mutation.isPending || isGeneratingStyleCode} inputMode="numeric" placeholder="101" />
              <button type="button" className="btn btn-secondary" onClick={() => { void handleGenerateStyleCode(); }} disabled={mutation.isPending || isGeneratingStyleCode}>{isGeneratingStyleCode ? 'جارٍ التوليد...' : 'توليد كود'}</button>
            </div>
          </Field>
        ) : (
          <>
            <Field label="الباركود"><input {...form.register('barcode')} disabled={mutation.isPending} /></Field>
            {clothingModuleEnabled ? <Field label="كود المجموعة / الموديل"><input {...form.register('styleCode')} disabled={mutation.isPending} inputMode="numeric" placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="الخاصية الأولى"><input {...form.register('color')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="الخاصية الثانية"><input {...form.register('size')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
          </>
        )}
        
        <Field label="نوع الكود الضريبي">
          <select {...form.register('taxCodeType')} disabled={mutation.isPending}>
            <option value="GS1">GS1 (عالمي)</option>
            <option value="EGS">EGS (مصري)</option>
          </select>
        </Field>
        
        <Field label="الكود الضريبي (EGS/GS1)">
          <input {...form.register('taxCode')} disabled={mutation.isPending} placeholder="مثال: 10003923..." />
        </Field>

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
          {form.formState.errors.categoryId && <small className="field-error">{form.formState.errors.categoryId.message}</small>}
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
          {form.formState.errors.supplierId && <small className="field-error">{form.formState.errors.supplierId.message}</small>}
        </div>

        <div className="field">
          <label>المخزن (موقع التخزين)</label>
          <select {...form.register('warehouseId')} disabled={mutation.isPending || locations.length === 1}>
            {locations.length !== 1 && <option value="">اختر المخزن...</option>}
            {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
          </select>
          {form.formState.errors.warehouseId && <small className="field-error">{form.formState.errors.warehouseId.message}</small>}
          <small className="muted" style={{ display: 'block', marginTop: 4 }}>
            * إجباري: يحدد المخزن الذي سيتم إضافة الرصيد الافتتاحي إليه، وسيكون المخزن الافتراضي للعمليات القادمة.
          </small>
        </div>

        <Field label="مكان التخزين (Bin Location)"><input {...form.register('binLocation')} disabled={mutation.isPending} placeholder="مثال: مخزن رئيسي، رف 5، شقة 2" /></Field>
        
        {importModuleEnabled ? (
          <div className="surface-note form-grid" style={{ padding: 12, gridColumn: '1 / -1', background: 'var(--blue-50)', border: '1px solid var(--blue-200)', marginTop: 8 }}>
            <h4 style={{ gridColumn: '1 / -1', margin: '0 0 12px 0', color: 'var(--blue-900)' }}>بيانات قطعة الغيار (Auto Parts)</h4>
            <Field label="رقم القطعة (OEM)"><input {...form.register('metadata.oemNumber')} disabled={mutation.isPending} placeholder="مثال: 1J0907530" /></Field>
            <Field label="الماركة (Brand)"><input {...form.register('metadata.carBrand')} disabled={mutation.isPending} placeholder="مثال: Toyota, Audi" /></Field>
            <Field label="الموديل (Model)"><input {...form.register('metadata.carModel')} disabled={mutation.isPending} placeholder="مثال: Corolla" /></Field>
            <Field label="سنة الصنع (من)"><input type="number" {...form.register('metadata.carYearFrom')} disabled={mutation.isPending} placeholder="مثال: 2015" /></Field>
            <Field label="سنة الصنع (إلى)"><input type="number" {...form.register('metadata.carYearTo')} disabled={mutation.isPending} placeholder="مثال: 2020" /></Field>
            <Field label="بلد المنشأ"><input {...form.register('metadata.origin')} disabled={mutation.isPending} placeholder="مثال: China, Japan" /></Field>
            <Field label="الحالة">
              <select {...form.register('metadata.condition')} disabled={mutation.isPending}>
                <option value="">غير محدد</option>
                <option value="new">جديد (New)</option>
                <option value="used">استيراد/مستعمل (Used)</option>
              </select>
            </Field>
          </div>
        ) : null}

        <div className="field span-full" style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#166534', margin: 0 }}>
            <input type="checkbox" {...form.register('trackSerials')} disabled={mutation.isPending} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <span>📱 تتبع أرقام السيريال / الـ IMEI لهذا الصنف (للهواتف، الأجهزة، وقطع الإلكترونيات)</span>
          </label>
          <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '4px', marginInlineStart: '28px' }}>
            يتيح تتبع كل جهاز برقم السيريال/IMEI المنفرد، تسجيل السيريالات عند الشراء، وخصمها بالمسح المباشر في الكاشير ومتابعة الضمان.
          </div>
        </div>

        <Field label="ملاحظات" className="span-full"><textarea {...form.register('notes')} rows={4} disabled={mutation.isPending} style={{ width: '100%' }} /></Field>
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
        <SubmitButton type="submit" isPending={mutation.isPending} disabled={(usesVariantBuilder && (!fashionVariantRows.length || duplicateFashionBarcodes > 0 || !String(watchedStyleCode || '').trim()))} idleText={submitText} pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
