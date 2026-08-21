import { Suspense, lazy, useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { useSettingsQuery, useCategoriesQuery, useSuppliersQuery, useCustomersQuery, useLocationsQuery, useProductsQuery } from '@/shared/hooks/use-catalog-queries';
import type { ProductCustomerPrice, ProductUnit } from '@/types/domain';
import { ProductCustomerPricesCard } from '@/features/products/components/workspace-sections/ProductCustomerPricesCard';
import { buildUpdatePayload, normalizeCustomerPrices, refetchAndSelectProduct, toProductFormValues } from '@/features/products/components/workspace-sections/product-workspace.utils';
import { normalizeNumericStyleCode } from '@/features/products/lib/style-code';
import { bomsApi } from '@/shared/api/boms.api';
import { ComboComponentsEditor } from '@/features/products/components/ComboComponentsEditor';

import { useAppToolbar } from '@/stores/toolbar-store';

type ProductFormOutputWithoutStock = Omit<ProductFormOutput, 'stock' | 'variantStock' | 'fashionColors' | 'fashionSizes'> & {
  stock?: number;
  variantStock?: number;
  fashionColors?: string;
  fashionSizes?: string;
};

function omitStock(values: ProductFormOutput): ProductFormOutput {
  const { stock: _stock, variantStock: _variantStock, fashionColors: _fashionColors, fashionSizes: _fashionSizes, ...safeValues } = values as ProductFormOutputWithoutStock;
  return safeValues as ProductFormOutput;
}

const LazyFashionGroupEditorCard = lazy(() => import('@/features/products/components/workspace-sections/FashionGroupEditorCard').then((module) => ({ default: module.FashionGroupEditorCard })));

export function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const settingsQuery = useSettingsQuery();
  const categoriesQuery = useCategoriesQuery();
  const suppliersQuery = useSuppliersQuery();
  const customersQuery = useCustomersQuery();
  
  const categories = categoriesQuery.data || [];
  const suppliers = suppliersQuery.data || [];
  const customers = (customersQuery.data || []).map((customer) => ({ id: String(customer.id), name: customer.name }));
  const locationsQuery = useLocationsQuery();
  const locations = locationsQuery.data || [];

  const clothingModuleEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const manufacturingModuleEnabled = settingsQuery.data?.manufacturingModuleEnabled === true;
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;
  const comboModuleEnabled = settingsQuery.data?.comboModuleEnabled === true || manufacturingModuleEnabled;

  const { data: product, isLoading: isProductLoading, isError: isProductError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => productsApi.get(id as string),
    enabled: Boolean(id)
  });

  const { data: boms } = useQuery({
    queryKey: ['manufacturing-boms'],
    queryFn: bomsApi.list,
    enabled: manufacturingModuleEnabled && Boolean(id)
  });

  const productsQuery = useProductsQuery();
  const allProducts = productsQuery.data || [];

  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(product?.units, product?.barcode || ''));
  const [customerPrices, setCustomerPrices] = useState<ProductCustomerPrice[]>(normalizeCustomerPrices(product));

  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', barcode: '', itemKind: 'standard', styleCode: '', color: '', size: '', fashionColors: '', fashionSizes: '', variantStock: 0,
      costPrice: 0, retailPrice: 0, wholesalePrice: 0, stock: 0, minStock: 5, categoryId: '', supplierId: '', notes: ''
    }
  });

  const watchedItemKind = clothingModuleEnabled && form.watch('itemKind') === 'fashion' ? 'fashion' : 'standard';
  const watchedStyleCode = form.watch('styleCode') || '';
  const groupedEntry = Boolean(String(product?.styleCode || '').trim());

  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الأصناف', to: '/products' },
    { label: groupedEntry ? `تعديل المجموعة: ${product?.name ?? '...'}` : `تعديل صنف: ${product?.name ?? '...'}` }
  ]);

  useEffect(() => {
    if (!product) return;
    const bom = boms?.find((b: any) => String(b.product_id) === String(product.id));
    const isCombo = Boolean(bom);
    const comboComponents = bom?.lines?.map((l: any) => ({
      productId: l.componentId || l.component_product_id,
      quantity: Number(l.quantity)
    })) || [];
    
    form.reset({ ...toProductFormValues(product), isCombo, comboComponents });
    setUnits(normalizeProductUnits(product.units, product.barcode || ''));
    setCustomerPrices(normalizeCustomerPrices(product));
  }, [product, boms, form]);

  useEffect(() => {
    if (!clothingModuleEnabled && form.getValues('itemKind') !== 'standard') {
      form.setValue('itemKind', 'standard', { shouldDirty: false, shouldValidate: true });
    }
  }, [clothingModuleEnabled, form]);

  useEffect(() => {
    if (locations.length === 1 && !form.getValues('warehouseId')) {
      form.setValue('warehouseId', String(locations[0].id), { shouldDirty: true, shouldValidate: true });
    }
  }, [locations, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormOutput & { isCombo?: boolean; comboComponents?: any[] }) => {
      if (!product) throw new Error('اختر صنفًا أولًا');
      const res = await productsApi.update(product.id, buildUpdatePayload({ ...omitStock(values as any), itemKind: watchedItemKind }, product, units, customerPrices));
      
      if (values.isCombo && values.comboComponents && values.comboComponents.length > 0) {
        const bomPayload = {
          productId: Number(product.id),
          quantity: 1,
          overheadCost: 0,
          lines: values.comboComponents.map(comp => ({
            componentProductId: comp.productId,
            quantity: comp.quantity,
            unitName: 'قطعة',
            expectedCost: 0,
            unitMultiplier: 1,
            wastePercentage: 0
          }))
        };
        const bom = boms?.find((b: any) => String(b.product_id) === String(product.id));
        if (bom) {
          await bomsApi.update(bom.id, bomPayload);
        } else {
          await bomsApi.create(bomPayload);
        }
      } else if (!values.isCombo && boms) {
         // optional: maybe disable bom? We will leave it as is for now or delete it
      }
      return res;
    },
    onSuccess: async () => {
      if (!product) return;
      await refetchAndSelectProduct(queryClient, product.id);
      navigate('/products');
    }
  });

  const hasDraftChanges = (
    form.formState.isDirty
    || (watchedItemKind === 'fashion' ? false : JSON.stringify(units) !== JSON.stringify(normalizeProductUnits(product?.units, product?.barcode || '')))
    || JSON.stringify(customerPrices) !== JSON.stringify(normalizeCustomerPrices(product))
  );

  async function saveCustomerPricesOnly() {
    if (!product) return;
    const values = productFormSchema.parse(form.getValues());
    await mutation.mutateAsync({ ...omitStock(values), itemKind: watchedItemKind });
  }

  const isFormDisabled = mutation.isPending || isProductLoading || settingsQuery.isLoading || productsQuery.isLoading;

  const watchedIsCombo = useWatch({ control: form.control, name: 'isCombo' });

  const onSubmit = form.handleSubmit((values) => mutation.mutate({ ...omitStock(values as any), itemKind: watchedItemKind, isCombo: (values as any).isCombo, comboComponents: (values as any).comboComponents }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isFormDisabled) {
          onSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormDisabled, onSubmit]);

  if (isProductLoading) {
    return <div className="screen-center"><div className="loading-card">جاري تحميل الصنف...</div></div>;
  }

  if (!product || isProductError) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <h2>تعذر تحميل الصنف</h2>
          <Button variant="secondary" onClick={() => navigate('/products')}>العودة للسجل</Button>
        </div>
      </div>
    );
  }

  if (groupedEntry) {
    return (
      <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
        <div className="purchase-prototype-sticky-stack">
          <div className="purchase-prototype-document-surface">
            <div className="document-prototype-topbar">
              <div className="document-prototype-topbar-right">
                <button type="button" className="document-prototype-back-link" onClick={() => navigate('/products')} aria-label="الرجوع">←</button>
                <h1>تعديل المجموعة: {product.name}</h1>
              </div>
              <div className="document-prototype-topbar-actions">
                <Button variant="secondary" onClick={() => navigate('/products')}>الرجوع للسجل</Button>
              </div>
            </div>
          </div>
        </div>
        <main className="document-prototype-column">
          <Suspense fallback={<div className="loading-card">جاري التحميل...</div>}>
            <LazyFashionGroupEditorCard
              product={product}
              categories={categories}
              suppliers={suppliers}
              locations={locations}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="page-shell document-prototype-shell purchase-new-prototype" dir="rtl">
      <div className="purchase-prototype-sticky-stack">
        <div className="purchase-prototype-document-surface">
          <div className="document-prototype-topbar">
            <div className="document-prototype-topbar-right">
              <button type="button" className="document-prototype-back-link" onClick={() => navigate('/products')} aria-label="الرجوع">←</button>
              <h1>تعديل صنف: {product.name}</h1>
            </div>
            <div className="document-prototype-topbar-actions">
              <Button variant="secondary" onClick={() => navigate('/products')} disabled={isFormDisabled}>
                إلغاء
              </Button>
              <Button variant="primary" onClick={onSubmit} disabled={isFormDisabled}>
                {isFormDisabled ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="product-form-container">
        {mutation.isError && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444' }}>
            <div style={{ color: '#b91c1c' }}>تعذر حفظ الصنف. برجاء التحقق من البيانات والمحاولة مرة أخرى.</div>
          </div>
        )}

        {hasDraftChanges && !mutation.isPending && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d' }}>
            <div style={{ color: '#92400e' }}>تعديلات الصنف الحالية غير محفوظة. احفظ الصنف أو أعد القيم الأصلية.</div>
          </div>
        )}

        {/* 1. Core Info & Pricing */}
        <div className="product-compact-card">
          <div className="product-compact-card-header">
            <h3 className="product-compact-card-title">بيانات الصنف والأسعار</h3>
            <span className="muted small">المعلومات الأساسية وقائمة الأسعار</span>
          </div>

          <div className="product-form-grid-3" style={{ marginBottom: '0.85rem' }}>
            <Field label="نوع الصنف">
              <select className="purchase-prototype-field-input" {...form.register('itemType')} disabled={isFormDisabled}>
                <option value="product">منتج تام للبيع (مخزني)</option>
                <option value="service">خدمة / مصنعية (بدون مخزون)</option>
                {manufacturingModuleEnabled ? (
                  <option value="raw_material">مادة خام / مكون تصنيع</option>
                ) : null}
              </select>
            </Field>
            {clothingModuleEnabled ? (
              <Field label="نوع الصنف">
                <select className="purchase-prototype-field-input" {...form.register('itemKind')} disabled={isFormDisabled}>
                  <option value="standard">صنف عادي</option>
                  <option value="fashion">ملابس / Variant</option>
                </select>
              </Field>
            ) : null}
            <Field label="اسم الصنف" error={form.formState.errors.name?.message}>
              <input className="purchase-prototype-field-input" {...form.register('name')} disabled={isFormDisabled} style={{ fontWeight: 600 }} />
            </Field>
            <Field label="الباركود">
              <input className="purchase-prototype-field-input" {...form.register('barcode')} disabled={isFormDisabled} placeholder="اختياري أو امسحه بالماسح" />
            </Field>
            {clothingModuleEnabled ? (
              <Field label="كود الموديل">
                <input className="purchase-prototype-field-input" value={watchedStyleCode} onChange={(event) => form.setValue('styleCode', normalizeNumericStyleCode(event.target.value), { shouldDirty: true, shouldValidate: true })} disabled={isFormDisabled} inputMode="numeric" placeholder="اختياري - أرقام فقط" />
              </Field>
            ) : null}
            {clothingModuleEnabled ? <Field label="اللون"><input className="purchase-prototype-field-input" {...form.register('color')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="المقاس"><input className="purchase-prototype-field-input" {...form.register('size')} disabled={isFormDisabled} placeholder="اختياري" /></Field> : null}
          </div>

          <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="product-form-grid-3">
              <Field label="سعر الشراء (التكلفة)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('costPrice')} disabled={isFormDisabled} />
              </Field>
              <div className="field product-retail-price-field">
                <label style={{ color: '#1e3a8a', fontWeight: 700 }}>سعر البيع (قطاعي)</label>
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('retailPrice')} disabled={isFormDisabled} />
              </div>
              <Field label="سعر الجملة">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('wholesalePrice')} disabled={isFormDisabled} />
              </Field>
            </div>
          </div>
        </div>

        {/* 2. Categorization & Inventory Location */}
        <div className="product-compact-card">
          <div className="product-compact-card-header">
            <h3 className="product-compact-card-title">التصنيف والتخزين والمخزون</h3>
          </div>
          <div className="product-form-grid-4" style={{ marginBottom: '0.85rem' }}>
            <Field label="القسم" error={form.formState.errors.categoryId?.message}>
              <select className="purchase-prototype-field-input" {...form.register('categoryId')} disabled={isFormDisabled}>
                <option value="">بدون قسم</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <Field label="المورد" error={form.formState.errors.supplierId?.message}>
              <select className="purchase-prototype-field-input" {...form.register('supplierId')} disabled={isFormDisabled}>
                <option value="">بدون مورد</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </Field>
            <Field label="المخزن" error={form.formState.errors.warehouseId?.message}>
              <select className="purchase-prototype-field-input" {...form.register('warehouseId')} disabled={isFormDisabled || locations.length === 1}>
                {locations.length !== 1 && <option value="">اختر المخزن...</option>}
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
            </Field>
            <Field label="مكان الرف (Bin)">
              <input className="purchase-prototype-field-input" {...form.register('binLocation')} disabled={isFormDisabled} placeholder="مثال: رف 5" />
            </Field>
          </div>
          <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="product-form-grid-3">
              <Field label="المخزون الحالي (للعرض)">
                <input className="purchase-prototype-field-input" type="number" value={Number(product.stock || 0)} disabled readOnly style={{ background: '#f8fafc', fontWeight: 700 }} />
              </Field>
              <Field label="الحد الأدنى للتنبيه (نواقص)">
                <input className="purchase-prototype-field-input" type="number" {...form.register('minStock')} disabled={isFormDisabled} />
              </Field>
              <Field label="ملاحظات">
                <input className="purchase-prototype-field-input" {...form.register('notes')} disabled={isFormDisabled} placeholder="ملاحظات حول الصنف..." />
              </Field>
            </div>
          </div>

          {settingsQuery.data?.enableMobileStoreFeatures === true && (
            <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
                <input type="checkbox" {...form.register('trackSerials')} disabled={isFormDisabled} style={{ width: 18, height: 18 }} />
                <span>📱 تتبع أرقام IMEI / السيريال المنفرد لهذا الصنف (للهواتف والأجهزة الإلكترونية)</span>
              </label>
            </div>
          )}
        </div>

        {/* 3. Product Units */}
        <div className="product-compact-card">
          <div className="product-compact-card-header">
            <h3 className="product-compact-card-title">وحدات الصنف (Units)</h3>
          </div>
          <ProductUnitsEditor units={units} onChange={setUnits} disabled={isFormDisabled} />
        </div>

        {/* 4. Combo / BOM */}
        {comboModuleEnabled && (
          <div className="product-compact-card">
            <div className="product-compact-card-header">
              <h3 className="product-compact-card-title">العروض المجمعة والوجبات (Combo)</h3>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" {...form.register('isCombo')} disabled={isFormDisabled} style={{ width: 18, height: 18 }} />
                هذا الصنف عبارة عن عرض مجمع / وجبة
              </label>
            </div>
            {watchedIsCombo && (
              <Controller
                control={form.control}
                name="comboComponents"
                render={({ field }) => (
                  <ComboComponentsEditor
                    value={field.value || []}
                    onChange={field.onChange}
                    products={allProducts}
                    disabled={isFormDisabled}
                  />
                )}
              />
            )}
          </div>
        )}

        {/* 5. Auto Parts */}
        {importModuleEnabled && (
          <div className="product-compact-card">
            <div className="product-compact-card-header">
              <h3 className="product-compact-card-title">بيانات قطعة الغيار (Auto Parts)</h3>
            </div>
            <div className="product-form-grid-2">
              <Field label="رقم القطعة (OEM)"><input className="purchase-prototype-field-input" {...form.register('metadata.oemNumber')} disabled={isFormDisabled} placeholder="1J0907530" /></Field>
              <Field label="الماركة"><input className="purchase-prototype-field-input" {...form.register('metadata.carBrand')} disabled={isFormDisabled} placeholder="Toyota" /></Field>
              <Field label="الموديل"><input className="purchase-prototype-field-input" {...form.register('metadata.carModel')} disabled={isFormDisabled} placeholder="Corolla" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Field label="من سنة"><input className="purchase-prototype-field-input" type="number" {...form.register('metadata.carYearFrom')} disabled={isFormDisabled} placeholder="2015" /></Field>
                <Field label="إلى سنة"><input className="purchase-prototype-field-input" type="number" {...form.register('metadata.carYearTo')} disabled={isFormDisabled} placeholder="2020" /></Field>
              </div>
            </div>
          </div>
        )}

        {/* 6. Customer Specific Prices */}
        <div className="product-compact-card product-collapsible-card">
          <details>
            <summary className="product-compact-card-header" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
              <h3 className="product-compact-card-title">
                أسعار خاصة للعملاء ({customerPrices.length})
              </h3>
              <span className="muted small" style={{ fontSize: '0.78rem' }}>اضغط لفتح / إغلاق الأسعار المخصصة ▾</span>
            </summary>
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <ProductCustomerPricesCard product={product} customers={customers} customerPrices={customerPrices} onChange={setCustomerPrices} onSave={saveCustomerPricesOnly} isSaving={mutation.isPending} />
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
