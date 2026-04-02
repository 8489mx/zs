import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { DraftStateNotice } from '@/components/shared/DraftStateNotice';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { ProductUnitsEditor, normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { productsApi } from '@/features/products/api/products.api';
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from '@/features/products/schemas/product.schema';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { Category, Product, ProductCustomerPrice, ProductUnit, Supplier } from '@/types/domain';
import { ProductCustomerPricesCard } from './ProductCustomerPricesCard';
import { buildUpdatePayload, normalizeCustomerPrices, refetchAndSelectProduct, toProductFormValues } from './product-workspace.utils';

export function ProductEditorCard({ product, categories, suppliers, customers, onSaved }: { product?: Product; categories: Category[]; suppliers: Supplier[]; customers: Array<{ id: string; name: string }>; onSaved?: (product: Product) => void }) {
  const queryClient = useQueryClient();
  const [units, setUnits] = useState<ProductUnit[]>(normalizeProductUnits(product?.units, product?.barcode || ''));
  const [customerPrices, setCustomerPrices] = useState<ProductCustomerPrice[]>(normalizeCustomerPrices(product));
  const form = useForm<ProductFormInput, undefined, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', barcode: '', costPrice: 0, retailPrice: 0, wholesalePrice: 0, stock: 0, minStock: 5, categoryId: '', supplierId: '', notes: ''
    }
  });

  useEffect(() => {
    if (!product) return;
    form.reset(toProductFormValues(product));
    setUnits(normalizeProductUnits(product.units, product.barcode || ''));
    setCustomerPrices(normalizeCustomerPrices(product));
  }, [product, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProductFormOutput) => {
      if (!product) throw new Error('اختر صنفًا أولًا');
      return productsApi.update(product.id, buildUpdatePayload(values, product, units, customerPrices));
    },
    onSuccess: async () => {
      if (!product) return;
      const refreshed = await refetchAndSelectProduct(queryClient, product.id);
      if (refreshed) onSaved?.(refreshed);
    }
  });
  const hasDraftChanges = (form.formState.isDirty || JSON.stringify(units) !== JSON.stringify(normalizeProductUnits(product?.units, product?.barcode || '')) || JSON.stringify(customerPrices) !== JSON.stringify(normalizeCustomerPrices(product)));
  const canNavigateAway = useUnsavedChangesGuard(hasDraftChanges && !mutation.isPending);

  async function saveCustomerPricesOnly() {
    if (!product) return;
    const values = productFormSchema.parse(form.getValues());
    await mutation.mutateAsync(values);
  }

  if (!product) {
    return <div className="muted">اختر صنفًا من الجدول لعرض نموذج التعديل. تعديل رصيد المخزون نفسه يتم من تبويب المخزون وليس من master data.</div>;
  }

  return (
    <div className="page-stack">
      <form className="page-stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="form-grid">
          <Field label="اسم الصنف" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
          <Field label="الباركود"><input {...form.register('barcode')} disabled={mutation.isPending} /></Field>
          <Field label="سعر الشراء"><input type="number" step="0.01" {...form.register('costPrice')} disabled={mutation.isPending} /></Field>
          <Field label="سعر القطاعي"><input type="number" step="0.01" {...form.register('retailPrice')} disabled={mutation.isPending} /></Field>
          <Field label="سعر الجملة"><input type="number" step="0.01" {...form.register('wholesalePrice')} disabled={mutation.isPending} /></Field>
          <Field label="المخزون الحالي"><input type="number" {...form.register('stock')} disabled /></Field>
          <Field label="الحد الأدنى"><input type="number" {...form.register('minStock')} disabled={mutation.isPending} /></Field>
          <Field label="القسم">
            <select {...form.register('categoryId')} disabled={mutation.isPending}>
              <option value="">بدون قسم</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="المورد">
            <select {...form.register('supplierId')} disabled={mutation.isPending}>
              <option value="">بدون مورد</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </Field>
          <Field label="ملاحظات"><textarea rows={4} {...form.register('notes')} disabled={mutation.isPending} /></Field>
        </div>
        <ProductUnitsEditor units={units} onChange={setUnits} disabled={mutation.isPending} title="وحدات الصنف" />
        <DraftStateNotice visible={hasDraftChanges && !mutation.isPending} title="تعديلات الصنف الحالية غير محفوظة" hint="احفظ الصنف أو أعد القيم الأصلية قبل الانتقال إلى سجل آخر حتى لا تفقد الوحدات أو الأسعار الخاصة." />
        <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث الصنف" successText="تم تحديث الصنف بنجاح." />
        <div className="actions">
          <Button type="button" variant="secondary" onClick={() => {
            if (!canNavigateAway()) return;
            form.reset(toProductFormValues(product));
            setUnits(normalizeProductUnits(product.units, product.barcode || ''));
            setCustomerPrices(normalizeCustomerPrices(product));
          }} disabled={mutation.isPending}>إعادة القيم</Button>
          <SubmitButton type="submit" disabled={mutation.isPending} idleText="حفظ التعديل" pendingText="جارٍ الحفظ..." />
        </div>
      </form>
      <ProductCustomerPricesCard product={product} customers={customers} customerPrices={customerPrices} onChange={setCustomerPrices} onSave={saveCustomerPricesOnly} isSaving={mutation.isPending} />
    </div>
  );
}
