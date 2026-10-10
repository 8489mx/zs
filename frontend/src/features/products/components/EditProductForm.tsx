import { Suspense, lazy, useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { SlidersIcon, SmartphoneIcon, ArrowRightIcon } from '@/shared/components/icons/AppIcons';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { useSettingsQuery, useCategoriesQuery, useSuppliersQuery, useCustomersQuery } from '@/shared/hooks/use-catalog-queries';
import { QuickStockAdjustmentDialog, useInventoryActionCatalog } from '@/features/inventory';
import type { Product, ProductCustomerPrice, ProductUnit } from '@/types/domain';


import { ProductCustomerPricesCard } from '@/features/products/components/workspace-sections/ProductCustomerPricesCard';
import { buildUpdatePayload, normalizeCustomerPrices, refetchAndSelectProduct, toProductFormValues } from '@/features/products/components/workspace-sections/product-workspace.utils';
import { normalizeNumericStyleCode } from '@/features/products/lib/style-code';
import { bomsApi } from '@/shared/api/boms.api';
import { ComboComponentsEditor } from '@/features/products/components/ComboComponentsEditor';
import { ProductIconPicker } from '@/shared/components/icons/ProductIconPicker';
import { guessProductIcon } from '@/features/products/lib/product-smart-matcher';

import { useAppToolbar } from '@/stores/toolbar-store';

import { queryKeys } from '@/app/query-keys';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { toast } from '@/shared/components/system-alert';
import { ProductArchiveConfirmDialog } from '@/features/products/components/ProductArchiveConfirmDialog';

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

export interface EditProductFormProps {
  productId: string;
  initialProduct?: Product;
  mode?: 'page' | 'modal';
  onCancel?: () => void;
  onSuccess?: (product: Product) => void;
}

export function EditProductForm({
  productId,
  initialProduct,
  mode = 'page',
  onCancel,
  onSuccess,
}: EditProductFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const settingsQuery = useSettingsQuery();
  const categoriesQuery = useCategoriesQuery();
  const suppliersQuery = useSuppliersQuery();
  const customersQuery = useCustomersQuery();
  
  const categories = categoriesQuery.data || [];
  const suppliers = suppliersQuery.data || [];
  const customers = (customersQuery.data || []).map((customer) => ({ id: String(customer.id), name: customer.name }));
  const inventoryCatalog = useInventoryActionCatalog();
  const locations = inventoryCatalog.locationsQuery.data || [];

  const [isStockAdjustmentOpen, setIsStockAdjustmentOpen] = useState(false);

  const handleCloseStockAdjustment = () => {
    setIsStockAdjustmentOpen(false);
    queryClient.invalidateQueries({ queryKey: ['product', productId] });
    queryClient.invalidateQueries({ queryKey: queryKeys.products });
    queryClient.invalidateQueries({ queryKey: ['location-stocks'] });
    inventoryCatalog.locationStocksQuery.refetch();
  };

  const [isTogglingArchive, setIsTogglingArchive] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const handleToggleArchive = () => {
    setArchiveConfirmOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!product) return;
    try {
      setIsTogglingArchive(true);
      const res = await productsApi.toggleArchive(product.id);
      await queryClient.invalidateQueries({ queryKey: ['product', productId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.products });
      toast.success(res.message);
      setArchiveConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تغيير حالة أرشفة الصنف');
    } finally {
      setIsTogglingArchive(false);
    }
  };

  const clothingModuleEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const manufacturingModuleEnabled = settingsQuery.data?.manufacturingModuleEnabled === true;
  const autoPartsModuleEnabled = settingsQuery.data?.autoPartsModuleEnabled === true || settingsQuery.data?.activityType === 'auto_parts' || settingsQuery.data?.businessIndustry === 'auto_parts';
  const comboModuleEnabled = settingsQuery.data?.comboModuleEnabled === true || manufacturingModuleEnabled;

  const { data: product, isLoading: isProductLoading, isError: isProductError } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => productsApi.get(productId),
    enabled: Boolean(productId),
    initialData: () => {
      if (initialProduct) return initialProduct;
      const cachedProducts = queryClient.getQueryData<Product[]>(queryKeys.products);
      return cachedProducts?.find((p) => String(p.id) === String(productId));
    },
    staleTime: 60_000,
  });

  const { data: boms } = useQuery({
    queryKey: ['manufacturing-boms'],
    queryFn: bomsApi.list,
    enabled: manufacturingModuleEnabled && Boolean(productId),
    staleTime: 60_000,
  });

  const allProducts: Product[] = queryClient.getQueryData<Product[]>(queryKeys.products) || [];

  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(product?.units, product?.barcode || ''));
  const [customerPrices, setCustomerPrices] = useState<ProductCustomerPrice[]>(normalizeCustomerPrices(product));

  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', barcode: '', itemKind: 'standard', styleCode: '', color: '', size: '', fashionColors: '', fashionSizes: '', variantStock: 0,
      costPrice: 0, retailPrice: 0, wholesalePrice: 0, creditPrice: 0, consumerPrice: 0, stock: 0, minStock: 5, categoryId: '', supplierId: '', notes: ''
    }
  });

  const watchedItemKind = clothingModuleEnabled && form.watch('itemKind') === 'fashion' ? 'fashion' : 'standard';
  const watchedStyleCode = form.watch('styleCode') || '';
  const groupedEntry = Boolean(String(product?.styleCode || '').trim());

  useAppToolbar(
    mode === 'page'
      ? [
          { label: 'الرئيسية', to: '/' },
          { label: 'الأصناف', to: '/products' },
          { label: groupedEntry ? `تعديل المجموعة: ${product?.name ?? '...'}` : `تعديل صنف: ${product?.name ?? '...'}` }
        ]
      : []
  );

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
      }
      return res;
    },
    onSuccess: async (updatedProduct) => {
      if (!product) return;
      await invalidateCatalogDomain(queryClient);
      const refreshed = await refetchAndSelectProduct(queryClient, product.id);
      const finalProduct = refreshed || updatedProduct || product;
      if (onSuccess) {
        onSuccess(finalProduct as Product);
      } else if (mode === 'page') {
        navigate('/products');
      }
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

  const isFormDisabled = mutation.isPending || isProductLoading || settingsQuery.isLoading;

  const watchedIsCombo = useWatch({ control: form.control, name: 'isCombo' });

  const onSubmit = form.handleSubmit((values) => {
    const invalidMultiplierUnit = units.find((u) => !u.isBaseUnit && Number(u.multiplier || 0) <= 1);
    if (invalidMultiplierUnit) {
      toast.error(`مضاعف الوحدة "${invalidMultiplierUnit.name || 'الإضافية'}" يجب أن يكون أكبر من 1 مقارنة بالوحدة الأساسية`);
      return;
    }
    mutation.mutate({ ...omitStock(values as any), itemKind: watchedItemKind, isCombo: (values as any).isCombo, comboComponents: (values as any).comboComponents });
  });

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

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/products');
    }
  };

  if (isProductLoading) {
    return <div className="screen-center" style={{ minHeight: mode === 'modal' ? '240px' : undefined }}><div className="loading-card">جاري تحميل الصنف...</div></div>;
  }

  if (!product || isProductError) {
    return (
      <div className="screen-center" style={{ minHeight: mode === 'modal' ? '240px' : undefined }}>
        <div className="loading-card">
          <h2>تعذر تحميل الصنف</h2>
          <Button variant="secondary" onClick={handleCancelClick}>{mode === 'modal' ? 'إغلاق' : 'العودة للسجل'}</Button>
        </div>
      </div>
    );
  }

  if (groupedEntry) {
    return (
      <div className={mode === 'modal' ? 'edit-product-modal-mode' : 'page-shell document-prototype-shell purchase-new-prototype'} dir="rtl">
        <div className="purchase-prototype-sticky-stack">
          <div className="purchase-prototype-document-surface">
            <div className="document-prototype-topbar">
              <div className="document-prototype-topbar-right">
                <button type="button" className="document-prototype-back-link" onClick={handleCancelClick} aria-label="الرجوع">←</button>
                <h1 style={{ fontSize: mode === 'modal' ? '1.15rem' : undefined }}>تعديل المجموعة: {product.name}</h1>
              </div>
              <div className="document-prototype-topbar-actions">
                <Button variant="secondary" onClick={handleCancelClick}>{mode === 'modal' ? 'إلغلاق' : 'الرجوع للسجل'}</Button>
              </div>
            </div>
          </div>
        </div>
        <main className="product-form-container" style={{ padding: mode === 'modal' ? '12px 16px' : undefined }}>
          <Suspense fallback={<div className="loading-card">جاري التحميل...</div>}>
            <LazyFashionGroupEditorCard
              product={product}
              categories={categories}
              suppliers={suppliers}
              locations={locations}
              onSaved={(p) => {
                if (onSuccess) onSuccess(p);
                else navigate('/products');
              }}
            />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className={mode === 'modal' ? 'edit-product-modal-mode' : 'page-shell document-prototype-shell purchase-new-prototype'} dir="rtl">
      <div className={mode === 'modal' ? 'edit-product-modal-topbar-wrapper' : 'purchase-prototype-sticky-stack'}>
        <div className={mode === 'modal' ? 'edit-product-modal-topbar' : 'purchase-prototype-document-surface'}>
          <div
            className="document-prototype-topbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'nowrap',
              padding: mode === 'modal' ? '8px 14px' : '8px 16px',
              minHeight: '44px',
              ...(mode === 'modal' ? { borderRadius: 0, border: 'none', background: '#ffffff' } : {}),
            }}
          >
            <div
              className="document-prototype-topbar-right"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: 0,
                flex: 1,
                overflow: 'hidden',
                flexWrap: 'nowrap',
              }}
            >
              {mode === 'page' && (
                <button
                  type="button"
                  className="document-prototype-back-link"
                  onClick={handleCancelClick}
                  aria-label="الرجوع للأصناف"
                  title="الرجوع لدليل الأصناف"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <ArrowRightIcon size={16} strokeWidth={2.4} />
                </button>
              )}
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', flexShrink: 0 }}>
                تعديل صنف:
              </span>
              <span
                title={product.name}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1d4ed8',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                }}
              >
                {product.name}
              </span>
              {product.isActive === false ? (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  معطّل / مؤرشف
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  نشط
                </span>
              )}
            </div>
            <div
              className="document-prototype-topbar-actions"
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <Button
                variant="secondary"
                type="button"
                size="sm"
                onClick={handleToggleArchive}
                disabled={isFormDisabled || isTogglingArchive}
                title={product.isActive === false ? 'تنشيط الصنف' : 'أرشفة الصنف'}
                style={
                  product.isActive === false
                    ? { color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5', fontWeight: 700, height: '32px', minWidth: 'auto', padding: '0 12px', fontSize: '0.8rem' }
                    : { color: '#d97706', borderColor: '#fde68a', background: '#fffbeb', fontWeight: 700, height: '32px', minWidth: 'auto', padding: '0 12px', fontSize: '0.8rem' }
                }
              >
                {product.isActive === false ? 'تنشيط' : 'أرشفة'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelClick}
                disabled={isFormDisabled}
                style={{ height: '32px', minWidth: 'auto', padding: '0 14px', fontSize: '0.8rem' }}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onSubmit}
                disabled={isFormDisabled}
                style={{
                  fontWeight: 700,
                  height: '32px',
                  minWidth: 'auto',
                  padding: '0 16px',
                  fontSize: '0.8rem',
                  background: '#170e5e',
                  borderColor: '#170e5e',
                }}
              >
                {isFormDisabled ? 'جارٍ الحفظ...' : 'حفظ'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <main className="product-form-container" style={mode === 'modal' ? { padding: 0, margin: 0, maxWidth: '100%' } : undefined}>
        {mutation.isError && (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', marginBottom: '8px' }}>
            <div style={{ color: '#b91c1c', fontWeight: 600 }}>
              {(mutation.error as any)?.message || 'تعذر حفظ الصنف. برجاء التحقق من البيانات والمحاولة مرة أخرى.'}
            </div>
          </div>
        )}

        {hasDraftChanges && !mutation.isPending && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '6px',
            padding: '3px 8px',
            marginBottom: '6px',
            fontSize: '0.74rem',
            color: '#92400e',
            fontWeight: 700,
          }}>
            <span>تعديلات غير محفوظة</span>
          </div>
        )}

        {/* 1. Core Info & Pricing */}
        <div className="product-compact-card">
          <div className="product-compact-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
              <h3 className="product-compact-card-title" style={{ margin: 0 }}>بيانات الصنف والأسعار</h3>
              {clothingModuleEnabled && (
                <div style={{
                  display: 'flex',
                  gap: '2px',
                  background: '#f1f5f9',
                  padding: '2px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  boxSizing: 'border-box',
                }}>
                  <button
                    type="button"
                    onClick={() => form.setValue('itemKind', 'standard', { shouldDirty: true, shouldValidate: true })}
                    disabled={isFormDisabled}
                    style={{
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: watchedItemKind === 'standard' ? 800 : 600,
                      background: watchedItemKind === 'standard' ? 'var(--primary, #1e1b4b)' : 'transparent',
                      color: watchedItemKind === 'standard' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: watchedItemKind === 'standard' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    صنف عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => form.setValue('itemKind', 'fashion', { shouldDirty: true, shouldValidate: true })}
                    disabled={isFormDisabled}
                    style={{
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 10px',
                      fontSize: '0.72rem',
                      fontWeight: watchedItemKind === 'fashion' ? 800 : 600,
                      background: watchedItemKind === 'fashion' ? 'var(--primary, #1e1b4b)' : 'transparent',
                      color: watchedItemKind === 'fashion' ? '#ffffff' : '#64748b',
                      cursor: 'pointer',
                      boxShadow: watchedItemKind === 'fashion' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    صنف بمتغيرات
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 1: Product Name, Item Type & Barcode (3 balanced columns on one line) */}
          <div className="product-form-grid-3" style={{ marginBottom: '0.85rem' }}>
            <div className="field">
              <label>{watchedItemKind === 'fashion' ? 'اسم الصنف الأساسي' : 'اسم الصنف'}</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <ProductIconPicker
                  value={form.watch('icon')}
                  onChange={(iconId) => form.setValue('icon', iconId, { shouldDirty: true })}
                  industry={settingsQuery.data?.businessIndustry}
                  disabled={isFormDisabled}
                />
                <input
                  className="purchase-prototype-field-input"
                  {...form.register('name')}
                  onChange={(e) => {
                    form.setValue('name', e.target.value, { shouldDirty: true, shouldValidate: true });
                    const guessed = guessProductIcon(e.target.value, undefined, settingsQuery.data?.businessIndustry);
                    if (guessed) {
                      form.setValue('icon', guessed, { shouldDirty: true });
                    }
                  }}
                  disabled={isFormDisabled}
                  style={{ flex: 1, fontWeight: 600 }}
                  placeholder={watchedItemKind === 'fashion' ? 'مثال: مزيل عرق Nivea / تيشيرت Polo / شامبو L’Oréal' : 'اكتب اسم الصنف'}
                />
              </div>
              {form.formState.errors.name && <small className="field-error">{form.formState.errors.name.message}</small>}
            </div>

            <Field label="نوع الصنف">
              <select className="purchase-prototype-field-input" {...form.register('itemType')} disabled={isFormDisabled}>
                <option value="product">منتج تام للبيع (مخزني)</option>
                <option value="service">خدمة / مصنعية (بدون مخزون)</option>
                {manufacturingModuleEnabled ? (
                  <option value="raw_material">مادة خام / مكون تصنيع</option>
                ) : null}
              </select>
            </Field>

            {watchedItemKind === 'fashion' ? (
              <div className="field">
                <label>
                  <span className="hidden md:inline">كود الصنف الأساسي / الموديل</span>
                  <span className="md:hidden">كود الموديل</span>
                </label>
                <input className="purchase-prototype-field-input" value={watchedStyleCode} onChange={(event) => form.setValue('styleCode', normalizeNumericStyleCode(event.target.value), { shouldDirty: true, shouldValidate: true })} disabled={isFormDisabled} inputMode="numeric" placeholder="1001" />
              </div>
            ) : (
              <Field label="الباركود">
                <input className="purchase-prototype-field-input" {...form.register('barcode')} disabled={isFormDisabled} placeholder="اختياري أو امسحه بالماسح" />
              </Field>
            )}
          </div>

          <div style={{ paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9' }}>
            <div className="product-form-grid-3">
              <div className="field">
                <label>
                  <span className="hidden md:inline">سعر الشراء (التكلفة)</span>
                  <span className="md:hidden">سعر التكلفة</span>
                </label>
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('costPrice')} disabled={isFormDisabled} />
              </div>
              <div className="field product-retail-price-field">
                <label style={{ color: '#1e3a8a', fontWeight: 700 }}>
                  <span className="hidden md:inline">سعر البيع (قطاعي)</span>
                  <span className="md:hidden">سعر البيع</span>
                </label>
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('retailPrice')} disabled={isFormDisabled} />
              </div>
              <Field label="سعر الجملة">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('wholesalePrice')} disabled={isFormDisabled} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.65rem' }}>
              <Field label="سعر البيع الآجل (التوزيع والجملة)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('creditPrice')} disabled={isFormDisabled} placeholder="اختياري - افتراضياً نفس الكاش" />
              </Field>
              <Field label="سعر المستهلك / الجمهور (SRP)">
                <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('consumerPrice')} disabled={isFormDisabled} placeholder="سعر بيع المحل للجمهور لطباعته بالفاتورة" />
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
            <div className="product-form-grid-4">
              <Field label="المخزون الحالي">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'stretch',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    boxSizing: 'border-box',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      userSelect: 'all',
                      minWidth: 0,
                    }}
                    title={`الرصيد الفعلي: ${Number(product?.stock || 0)}`}
                  >
                    <span>{Number(product?.stock || 0).toLocaleString('en-US')}</span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginInlineStart: '4px' }}>
                      {units[0]?.name || 'قطعة'}
                    </span>
                  </div>
                  {product?.itemType !== 'service' && (
                    <button
                      type="button"
                      onClick={() => setIsStockAdjustmentOpen(true)}
                      disabled={isFormDisabled}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '0 10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: 'none',
                        borderInlineStart: '1px solid #bfdbfe',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: isFormDisabled ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isFormDisabled) {
                          e.currentTarget.style.background = '#170e5e';
                          e.currentTarget.style.color = '#ffffff';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isFormDisabled) {
                          e.currentTarget.style.background = '#eff6ff';
                          e.currentTarget.style.color = '#1d4ed8';
                        }
                      }}
                      title="تسوية وتعديل رصيد المخزون (إضافة / خصم / تسوية إلى كمية نهائية / تالف)"
                    >
                      <SlidersIcon size={12} />
                      <span>تسوية</span>
                    </button>
                  )}
                </div>
              </Field>
              <Field label="الحد الأدنى للتنبيه (نواقص)">
                <input className="purchase-prototype-field-input" type="number" {...form.register('minStock')} disabled={isFormDisabled} />
              </Field>
              <Field label="تاريخ الصلاحية">
                <input className="purchase-prototype-field-input" type="date" {...form.register('expiryDate')} disabled={isFormDisabled} />
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <SmartphoneIcon size={16} color="#166534" /> تتبع أرقام IMEI / السيريال المنفرد لهذا الصنف (للهواتف والأجهزة الإلكترونية)
                </span>
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
        {autoPartsModuleEnabled && (
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

      {isStockAdjustmentOpen && product && (
        <QuickStockAdjustmentDialog
          open={isStockAdjustmentOpen}
          onClose={handleCloseStockAdjustment}
          product={product}
          branches={inventoryCatalog.branchesQuery.data || []}
          locations={inventoryCatalog.locationsQuery.data || []}
          locationStocks={Array.isArray(inventoryCatalog.locationStocksQuery.data) ? inventoryCatalog.locationStocksQuery.data : []}
          canManageInventory={true}
        />
      )}

      <ProductArchiveConfirmDialog
        open={archiveConfirmOpen}
        product={product}
        isBusy={isTogglingArchive}
        onCancel={() => setArchiveConfirmOpen(false)}
        onConfirm={handleConfirmArchive}
      />
    </div>
  );
}
