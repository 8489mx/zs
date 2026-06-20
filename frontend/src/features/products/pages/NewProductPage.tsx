import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, ProductUnit, Supplier } from '@/types/domain';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { useSettingsQuery, useCategoriesQuery, useSuppliersQuery } from '@/shared/hooks/use-catalog-queries';
import { useCreateProductMutation } from '@/features/products/hooks/useCreateProductMutation';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { buildFashionVariantDrafts, splitFashionTokens, type FashionVariantDraft } from '@/features/products/components/fashion-variants.utils';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { extractCreatedEntityId } from '@/lib/api/extract-created-entity-id';

import { useAppToolbar } from '@/stores/toolbar-store';

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
    notes: ''
  };
}

function serializeVariantRows(rows: FashionVariantDraft[]) {
  return JSON.stringify(rows.map((row) => ({ color: row.color, size: row.size, barcode: row.barcode, stock: Number(row.stock || 0) })));
}

const LazyFashionVariantsBuilder = lazy(() => import('@/features/products/components/FashionVariantsBuilder').then((module) => ({ default: module.FashionVariantsBuilder })));

async function generateNextStyleCode() {
  const payload = await productsApi.listAll();
  const usedCodes = new Set(
    (payload.products || [])
      .map((product) => String(product.styleCode || '').trim())
      .filter((value) => /^\d+$/.test(value))
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 101),
  );

  let nextCode = 101;
  while (usedCodes.has(nextCode)) nextCode += 1;
  return String(nextCode);
}

export function NewProductPage() {
  const navigate = useNavigate();
  const settingsQuery = useSettingsQuery();
  const categoriesQuery = useCategoriesQuery();
  const suppliersQuery = useSuppliersQuery();
  
  const categories = categoriesQuery.data || [];
  const suppliers = suppliersQuery.data || [];

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
  const [isGeneratingStyleCode, setIsGeneratingStyleCode] = useState(false);
  
  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(defaultItemKind)
  });

  const queryClient = useQueryClient();
  const mutation = useCreateProductMutation(() => {
    navigate('/products');
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
  
  void (form.formState.isDirty || hasUnitsDraftChanges || hasFashionDraftChanges || Boolean(inlineCategoryName.trim()) || Boolean(inlineSupplierName.trim()) || Boolean(inlineSupplierPhone.trim()) || groupedEntryEnabled !== defaultGroupedMode);

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
      return productsApi.createCategory({ name }) as Promise<any>;
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
      }
    }
  });

  const supplierMutation = useMutation<{ id?: string | number; supplier?: { id?: string | number }; data?: { id?: string | number } }, Error, void>({
    mutationFn: async () => {
      const name = inlineSupplierName.trim();
      if (!name) throw new Error('اكتب اسم المورد');
      return productsApi.createSupplier({ name, phone: inlineSupplierPhone.trim(), address: '', balance: 0, notes: '' }) as Promise<any>;
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
      }
    }
  });

  function handleUnitsChange(nextUnits: ProductUnit[]) {
    const baseBarcode = (watchedBarcode || '').trim();
    const mapped = nextUnits.map((unit, index) => ({ ...unit, barcode: unit.barcode || (index === 0 ? baseBarcode : unit.barcode) }));
    setUnits(mapped);
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

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate({ ...values, itemKind: watchedItemKind, units, fashionVariantRows, groupedEntryEnabled: usesVariantBuilder });
  });

  const isFormDisabled = mutation.isPending || settingsQuery.isLoading || categoriesQuery.isLoading || suppliersQuery.isLoading;

  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الأصناف', to: '/products' },
    { label: 'إضافة صنف جديد' }
  ]);

  return (
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              <button type="button" className="document-prototype-back-link" onClick={() => navigate('/products')} aria-label="الرجوع">←</button>
              <h1>إضافة صنف جديد</h1>
            </div>
            
            <div className="document-prototype-topbar-actions">
              <Button variant="secondary" onClick={() => navigate('/products')} disabled={isFormDisabled}>
                إلغاء
              </Button>
              <Button 
                variant="primary" 
                onClick={onSubmit} 
                disabled={isFormDisabled || (usesVariantBuilder && (!fashionVariantRows.length || duplicateFashionBarcodes > 0 || !String(watchedStyleCode || '').trim()))}
              >
                {isFormDisabled ? 'جارٍ الحفظ...' : submitText}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="document-prototype-column">
        {mutation.isError && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
            <div style={{ color: '#b91c1c' }}>تعذر حفظ الصنف. برجاء التحقق من البيانات والمحاولة مرة أخرى.</div>
          </div>
        )}
        
        {usesVariantBuilder && duplicateFashionBarcodes > 0 && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
            <div style={{ color: '#b91c1c' }}>يوجد باركودات مكررة داخل نفس المجموعة. صححها قبل الحفظ.</div>
          </div>
        )}

        <section className="document-prototype-section">
          <div className="document-prototype-section-header" style={{ marginBottom: 16 }}>
            <h3 className="document-prototype-section-title">نوع الصنف</h3>
          </div>
          <div className="actions compact-actions" style={{ flexWrap: 'wrap', marginBottom: 24 }}>
            {clothingModuleEnabled ? (
              <div className="field" style={{ minWidth: 220 }}>
                <select className="purchase-prototype-field-input" {...form.register('itemKind')} disabled={isFormDisabled}>
                  <option value="standard">صنف عادي</option>
                  <option value="fashion">موديل ملابس</option>
                </select>
              </div>
            ) : null}
            {watchedItemKind === 'standard' ? (
              <>
                <Button type="button" variant={!groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(false)} disabled={isFormDisabled}>صنف عادي (بسيط)</Button>
                <Button type="button" variant={groupedEntryEnabled ? 'primary' : 'secondary'} onClick={() => setGroupedEntryEnabled(true)} disabled={isFormDisabled}>صنف بمتغيرات (أنواع/أحجام)</Button>
              </>
            ) : null}
          </div>

          <div className="document-prototype-grid compact-grid-2">
            <Field label="تصنيف الصنف">
              <select className="purchase-prototype-field-input" {...form.register('itemType')} disabled={isFormDisabled}>
                <option value="product">منتج نهائي للبيع</option>
                <option value="raw_material">مادة خام / مكون تصنيع</option>
              </select>
            </Field>
            <Field label={watchedItemKind === 'fashion' ? 'اسم الموديل الأساسي' : groupedEntryEnabled ? 'اسم الصنف الأساسي' : 'اسم الصنف'} error={form.formState.errors.name?.message}>
              <input className="purchase-prototype-field-input" {...form.register('name')} disabled={isFormDisabled} placeholder={watchedItemKind === 'fashion' ? 'مثال: تيشيرت بنجول' : groupedEntryEnabled ? 'مثال: مزيل عرق X' : undefined} />
            </Field>

            {usesVariantBuilder ? (
              <Field label={watchedItemKind === 'fashion' ? 'كود الموديل' : 'كود المجموعة / الصنف الرئيسي'}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="purchase-prototype-field-input" {...form.register('styleCode')} disabled={isFormDisabled || isGeneratingStyleCode} inputMode="numeric" placeholder="101" style={{ flex: 1 }} />
                  <Button type="button" variant="secondary" onClick={() => void handleGenerateStyleCode()} disabled={isFormDisabled || isGeneratingStyleCode}>{isGeneratingStyleCode ? 'جارٍ التوليد...' : 'توليد كود'}</Button>
                </div>
              </Field>
            ) : (
              <>
                <Field label="الباركود"><input className="purchase-prototype-field-input" {...form.register('barcode')} disabled={isFormDisabled} /></Field>
                {clothingModuleEnabled ? <Field label="كود المجموعة / الموديل"><input className="purchase-prototype-field-input" {...form.register('styleCode')} disabled={isFormDisabled} inputMode="numeric" placeholder="اختياري" /></Field> : null}
                {clothingModuleEnabled ? <Field label="الخاصية الأولى"><input className="purchase-prototype-field-input" {...form.register('color')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
                {clothingModuleEnabled ? <Field label="الخاصية الثانية"><input className="purchase-prototype-field-input" {...form.register('size')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
              </>
            )}
          </div>
        </section>

        <section className="document-prototype-section">
          <div className="document-prototype-section-header" style={{ marginBottom: 16 }}>
            <h3 className="document-prototype-section-title">التسعير والمخزون</h3>
          </div>
          <div className="document-prototype-grid compact-grid-3">
            <Field label="سعر الشراء"><input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('costPrice')} disabled={isFormDisabled} /></Field>
            <Field label="سعر القطاعي"><input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('retailPrice')} disabled={isFormDisabled} /></Field>
            <Field label="سعر الجملة"><input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('wholesalePrice')} disabled={isFormDisabled} /></Field>
            {!usesVariantBuilder ? <Field label="المخزون الافتتاحي"><input className="purchase-prototype-field-input" type="number" {...form.register('stock')} disabled={isFormDisabled} /></Field> : null}
            <Field label="الحد الأدنى"><input className="purchase-prototype-field-input" type="number" {...form.register('minStock')} disabled={isFormDisabled} /></Field>
          </div>
        </section>

        <section className="document-prototype-section">
          <div className="document-prototype-section-header" style={{ marginBottom: 16 }}>
            <h3 className="document-prototype-section-title">بيانات القسم والمورد</h3>
          </div>
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>القسم</label>
              <select className="purchase-prototype-field-input" {...form.register('categoryId')} disabled={isFormDisabled || categoryMutation.isPending} style={{ marginBottom: 8 }}>
                <option value="">بدون قسم</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="purchase-prototype-field-input" value={inlineCategoryName} onChange={(event) => setInlineCategoryName(event.target.value)} placeholder="إضافة قسم جديد" disabled={isFormDisabled || categoryMutation.isPending} style={{ flex: 1 }} />
                <Button type="button" variant="secondary" onClick={() => categoryMutation.mutate()} disabled={isFormDisabled || categoryMutation.isPending || !inlineCategoryName.trim()}>إضافة</Button>
              </div>
            </div>

            <div className="field">
              <label>المورد</label>
              <select className="purchase-prototype-field-input" {...form.register('supplierId')} disabled={isFormDisabled || supplierMutation.isPending} style={{ marginBottom: 8 }}>
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="purchase-prototype-field-input" value={inlineSupplierName} onChange={(event) => setInlineSupplierName(event.target.value)} placeholder="اسم المورد" disabled={isFormDisabled || supplierMutation.isPending} style={{ flex: 1 }} />
                <input className="purchase-prototype-field-input" value={inlineSupplierPhone} onChange={(event) => setInlineSupplierPhone(event.target.value)} placeholder="الهاتف" disabled={isFormDisabled || supplierMutation.isPending} style={{ width: 100 }} />
                <Button type="button" variant="secondary" onClick={() => supplierMutation.mutate()} disabled={isFormDisabled || supplierMutation.isPending || !inlineSupplierName.trim()}>إضافة</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="document-prototype-section">
          <div className="document-prototype-section-header" style={{ marginBottom: 16 }}>
            <h3 className="document-prototype-section-title">ملاحظات</h3>
          </div>
          <Field label="ملاحظات"><textarea className="purchase-prototype-field-input" {...form.register('notes')} rows={4} disabled={isFormDisabled} /></Field>
        </section>

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
              disabled={isFormDisabled}
              onColorsChange={(value) => form.setValue('fashionColors', value, { shouldDirty: true, shouldValidate: true })}
              onSizesChange={(value) => form.setValue('fashionSizes', value, { shouldDirty: true, shouldValidate: true })}
              onDefaultStockChange={(value) => form.setValue('variantStock', value, { shouldDirty: true, shouldValidate: true })}
              onBarcodePrefixChange={setVariantBarcodePrefix}
              onRowsChange={setFashionVariantRows}
            />
          </Suspense>
        ) : (
          <div className="document-prototype-section">
            <ProductUnitsEditor units={units} onChange={handleUnitsChange} disabled={isFormDisabled} title="وحدات الصنف" />
          </div>
        )}
      </main>
    </div>
  );
}
