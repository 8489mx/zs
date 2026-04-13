import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Category, ProductUnit, Supplier } from '@/types/domain';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useCreateProductMutation } from '@/features/products/hooks/useCreateProductMutation';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
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

function splitTokens(value: string | undefined) {
  return String(value || '')
    .split(/[\n،,|/]+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function ProductForm({ categories, suppliers, onCategoryCreated, onSupplierCreated }: ProductFormProps) {
  const settingsQuery = useSettingsQuery();
  const clothingModuleEnabled = settingsQuery.data?.clothingModuleEnabled === true;
  const defaultItemKind: 'standard' | 'fashion' = clothingModuleEnabled && settingsQuery.data?.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(undefined, ''));
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
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
  });

  const watchedValues = useWatch({ control: form.control });
  const watchedBarcode = form.watch('barcode');
  const watchedItemKind = clothingModuleEnabled && form.watch('itemKind') === 'fashion' ? 'fashion' : 'standard';
  const hasUnitsDraftChanges = useMemo(
    () => watchedItemKind === 'fashion' ? false : JSON.stringify(units) !== JSON.stringify(normalizeProductUnits(undefined, (watchedBarcode || '').trim())),
    [units, watchedBarcode, watchedItemKind],
  );
  const hasDraftChanges = form.formState.isDirty || hasUnitsDraftChanges || Boolean(inlineCategoryName.trim()) || Boolean(inlineSupplierName.trim()) || Boolean(inlineSupplierPhone.trim());

  const colorTokens = splitTokens(form.watch('fashionColors'));
  const sizeTokens = splitTokens(form.watch('fashionSizes'));
  const variantsPreview = useMemo(
    () => colorTokens.flatMap((color) => sizeTokens.map((size) => `${color} / ${size}`)),
    [colorTokens, sizeTokens],
  );

  const productFeedbackResetKey = JSON.stringify([watchedValues, units, inlineCategoryName, inlineSupplierName, inlineSupplierPhone]);

  useMutationFeedbackReset(
    mutation.isSuccess || mutation.isError,
    mutation.reset,
    productFeedbackResetKey,
  );

  useEffect(() => {
    const currentCategoryId = form.getValues('categoryId');
    if (currentCategoryId && !categories.some((category) => String(category.id) === String(currentCategoryId))) {
      form.setValue('categoryId', '');
    }
    const currentSupplierId = form.getValues('supplierId');
    if (currentSupplierId && !suppliers.some((supplier) => String(supplier.id) === String(currentSupplierId))) {
      form.setValue('supplierId', '');
    }
  }, [categories, suppliers, form]);

  useEffect(() => {
    if (!clothingModuleEnabled && form.getValues('itemKind') !== 'standard') {
      form.setValue('itemKind', 'standard', { shouldDirty: false, shouldValidate: true });
      return;
    }
    if (clothingModuleEnabled && !form.formState.isDirty && form.getValues('itemKind') !== defaultItemKind) {
      form.setValue('itemKind', defaultItemKind, { shouldDirty: false, shouldValidate: true });
    }
  }, [clothingModuleEnabled, defaultItemKind, form]);

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
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
  }

  return (
    <form className="page-stack" onSubmit={form.handleSubmit((values) => mutation.mutate({ ...values, itemKind: watchedItemKind, units }))}>
      <DraftStateNotice visible={hasDraftChanges && !mutation.isPending} title="بيانات الصنف الحالي لم تُحفظ بعد" hint="يشمل ذلك الوحدات الجديدة أو الإضافة السريعة للقسم والمورد من نفس النموذج." />
      <div className="form-grid">
        {clothingModuleEnabled ? <Field label="نوع الصنف"><select {...form.register('itemKind')} disabled={mutation.isPending}><option value="standard">صنف عادي</option><option value="fashion">موديل ملابس</option></select></Field> : null}
        <Field label="اسم الصنف / الموديل" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
        {watchedItemKind === 'fashion' ? (
          <>
            <Field label="كود الموديل"><input {...form.register('styleCode')} disabled={mutation.isPending} placeholder="مثال: TS-2401" /></Field>
            <Field label="ألوان الموديل"><textarea rows={3} {...form.register('fashionColors')} disabled={mutation.isPending} placeholder="أسود، أبيض، كحلي" /></Field>
            <Field label="مقاسات الموديل"><textarea rows={3} {...form.register('fashionSizes')} disabled={mutation.isPending} placeholder="S، M، L، XL" /></Field>
            <Field label="مخزون افتتاحي لكل Variant"><input type="number" {...form.register('variantStock')} disabled={mutation.isPending} /></Field>
          </>
        ) : (
          <>
            <Field label="الباركود"><input {...form.register('barcode')} disabled={mutation.isPending} /></Field>
            {clothingModuleEnabled ? <Field label="اللون"><input {...form.register('color')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="المقاس"><input {...form.register('size')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
            {clothingModuleEnabled ? <Field label="كود الموديل"><input {...form.register('styleCode')} disabled={mutation.isPending} placeholder="اختياري" /></Field> : null}
          </>
        )}
        <Field label="سعر الشراء"><input type="number" step="0.01" {...form.register('costPrice')} disabled={mutation.isPending} /></Field>
        <Field label="سعر القطاعي"><input type="number" step="0.01" {...form.register('retailPrice')} disabled={mutation.isPending} /></Field>
        <Field label="سعر الجملة"><input type="number" step="0.01" {...form.register('wholesalePrice')} disabled={mutation.isPending} /></Field>
        {watchedItemKind === 'fashion' ? null : <Field label="المخزون الافتتاحي"><input type="number" {...form.register('stock')} disabled={mutation.isPending} /></Field>}
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

      {watchedItemKind === 'fashion' ? (
        <div className="page-stack surface-note" style={{ padding: 12 }}>
          <strong>معاينة Variants</strong>
          <div className="muted small">سيتم إنشاء كل لون/مقاس كصنف مستقل بنفس الأسعار والمورد والقسم. هذا يجعل البيع والشراء والمخزون والباركود يعملون فورًا بدون تعقيد إضافي.</div>
          <div className="muted small">الإجمالي المتوقع: {variantsPreview.length} Variant</div>
          {variantsPreview.length ? <div className="badge-row">{variantsPreview.slice(0, 24).map((entry) => <span key={entry} className="cashier-chip">{entry}</span>)}{variantsPreview.length > 24 ? <span className="cashier-chip">+{variantsPreview.length - 24}</span> : null}</div> : <div className="muted small">اكتب الألوان والمقاسات لتظهر المعاينة.</div>}
        </div>
      ) : (
        <ProductUnitsEditor units={units} onChange={handleUnitsChange} disabled={mutation.isPending} title="وحدات الصنف" />
      )}

      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الصنف" successText={watchedItemKind === 'fashion' ? 'تم إنشاء موديل الملابس بنجاح.' : 'تم حفظ الصنف بنجاح.'} />
      <div className="actions">
        <FormResetButton onReset={handleReset} disabled={!hasDraftChanges || mutation.isPending}>إعادة القيم</FormResetButton>
        <SubmitButton type="submit" disabled={mutation.isPending || (watchedItemKind === 'fashion' && !variantsPreview.length)} idleText={watchedItemKind === 'fashion' ? 'إنشاء Variants الملابس' : 'حفظ الصنف'} pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
