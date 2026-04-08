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

const DEFAULT_VALUES: ProductFormInput = {
  name: '',
  barcode: '',
  costPrice: 0,
  retailPrice: 0,
  wholesalePrice: 0,
  stock: 0,
  minStock: 5,
  categoryId: '',
  supplierId: '',
  notes: ''
};

export function ProductForm({ categories, suppliers, onCategoryCreated, onSupplierCreated }: ProductFormProps) {
  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(undefined, ''));
  const [inlineCategoryName, setInlineCategoryName] = useState('');
  const [inlineSupplierName, setInlineSupplierName] = useState('');
  const [inlineSupplierPhone, setInlineSupplierPhone] = useState('');
  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: DEFAULT_VALUES
  });

  const queryClient = useQueryClient();
  const mutation = useCreateProductMutation(() => {
    form.reset(DEFAULT_VALUES);
    setUnits(normalizeProductUnits(undefined, ''));
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
  });

  const watchedValues = useWatch({ control: form.control });
  const watchedBarcode = form.watch('barcode');
  const hasUnitsDraftChanges = useMemo(() => JSON.stringify(units) !== JSON.stringify(normalizeProductUnits(undefined, (watchedBarcode || '').trim())), [units, watchedBarcode]);
  const hasDraftChanges = form.formState.isDirty || hasUnitsDraftChanges || Boolean(inlineCategoryName.trim()) || Boolean(inlineSupplierName.trim()) || Boolean(inlineSupplierPhone.trim());

  useMutationFeedbackReset(
    mutation.isSuccess || mutation.isError,
    mutation.reset,
    [watchedValues, units, inlineCategoryName, inlineSupplierName, inlineSupplierPhone],
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

  useMutationFeedbackReset(
    categoryMutation.isSuccess || categoryMutation.isError,
    categoryMutation.reset,
    [inlineCategoryName],
  );

  useMutationFeedbackReset(
    supplierMutation.isSuccess || supplierMutation.isError,
    supplierMutation.reset,
    [inlineSupplierName, inlineSupplierPhone],
  );

  const canNavigateAway = useUnsavedChangesGuard(hasDraftChanges && !mutation.isPending && !categoryMutation.isPending && !supplierMutation.isPending);

  function handleUnitsChange(nextUnits: ProductUnit[]) {
    const baseBarcode = (watchedBarcode || '').trim();
    const mapped = nextUnits.map((unit, index) => ({
      ...unit,
      barcode: unit.barcode || (index === 0 ? baseBarcode : unit.barcode)
    }));
    setUnits(mapped);
  }

  function handleReset() {
    if (!hasDraftChanges) return;
    if (!canNavigateAway()) return;
    mutation.reset();
    categoryMutation.reset();
    supplierMutation.reset();
    form.reset(DEFAULT_VALUES);
    setUnits(normalizeProductUnits(undefined, ''));
    setInlineCategoryName('');
    setInlineSupplierName('');
    setInlineSupplierPhone('');
  }

  return (
    <form className="page-stack" onSubmit={form.handleSubmit((values) => mutation.mutate({ ...values, units }))}>
      <DraftStateNotice visible={hasDraftChanges && !mutation.isPending} title="بيانات الصنف الحالي لم تُحفظ بعد" hint="يشمل ذلك الوحدات الجديدة أو الإضافة السريعة للقسم والمورد من نفس النموذج." />
      <div className="form-grid">
        <Field label="اسم الصنف" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
        <Field label="الباركود"><input {...form.register('barcode')} disabled={mutation.isPending} /></Field>
        <Field label="سعر الشراء"><input type="number" step="0.01" {...form.register('costPrice')} disabled={mutation.isPending} /></Field>
        <Field label="سعر القطاعي"><input type="number" step="0.01" {...form.register('retailPrice')} disabled={mutation.isPending} /></Field>
        <Field label="سعر الجملة"><input type="number" step="0.01" {...form.register('wholesalePrice')} disabled={mutation.isPending} /></Field>
        <Field label="المخزون الافتتاحي"><input type="number" {...form.register('stock')} disabled={mutation.isPending} /></Field>
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
      <ProductUnitsEditor units={units} onChange={handleUnitsChange} disabled={mutation.isPending} title="وحدات الصنف الجديد" />
      <MutationFeedback isError={categoryMutation.isError} error={categoryMutation.error} errorFallback="تعذر إضافة القسم" />
      <MutationFeedback isSuccess={categoryMutation.isSuccess} successText="تمت إضافة القسم وتحديده تلقائيًا." />
      <MutationFeedback isError={supplierMutation.isError} error={supplierMutation.error} errorFallback="تعذر إضافة المورد" />
      <MutationFeedback isSuccess={supplierMutation.isSuccess} successText="تمت إضافة المورد وتحديده تلقائيًا." />
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الصنف" successText="تم حفظ الصنف بنجاح." />
      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || categoryMutation.isPending || supplierMutation.isPending || !hasDraftChanges}>تفريغ النموذج</FormResetButton>
        <SubmitButton type="submit" disabled={mutation.isPending} idleText="حفظ الصنف" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
