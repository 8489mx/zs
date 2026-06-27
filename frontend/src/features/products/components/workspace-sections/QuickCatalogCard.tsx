import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import { productsApi } from '@/features/products/api/products.api';

export function QuickCatalogCard({ canManageSuppliers }: { canManageSuppliers: boolean }) {
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  const categoryMutation = useMutation({
    mutationFn: async () => {
      const name = categoryName.trim();
      if (!name) throw new Error('اكتب اسم القسم');
      return productsApi.createCategory({ name });
    },
    onSuccess: async () => {
      setCategoryName('');
      await invalidateCatalogDomain(queryClient, { includeCategories: true });
    }
  });

  const supplierMutation = useMutation({
    mutationFn: async () => {
      const name = supplierName.trim();
      if (!name) throw new Error('اكتب اسم المورد');
      return productsApi.createSupplier({ name, phone: supplierPhone.trim(), address: '', balance: 0, notes: '' });
    },
    onSuccess: async () => {
      setSupplierName('');
      setSupplierPhone('');
      await invalidateCatalogDomain(queryClient, { includeSuppliers: true });
    }
  });

  return (
    <FormSection title="إضافة قسم / مورد من نفس تبويب الأصناف" actions={<span className="nav-pill">مباشر من شاشة الأصناف</span>} className="workspace-panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {/* Category Form */}
        <div className="page-stack" style={{ gap: '12px' }}>
          <strong style={{ fontSize: '14px' }}>إضافة قسم جديد</strong>
          <Field label="اسم القسم">
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="اكتب اسم القسم هنا..." disabled={categoryMutation.isPending} />
          </Field>
          <div className="actions" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
            <Button type="button" onClick={() => categoryMutation.mutate()} disabled={categoryMutation.isPending}>إضافة قسم</Button>
          </div>
          <MutationFeedback isError={categoryMutation.isError} error={categoryMutation.error} errorFallback="تعذر إضافة القسم" />
          <MutationFeedback isSuccess={categoryMutation.isSuccess} successText="تمت إضافة القسم بنجاح." />
        </div>

        {/* Supplier Form */}
        <div className="page-stack" style={{ gap: '12px' }}>
          <strong style={{ fontSize: '14px' }}>إضافة مورد جديد</strong>
          <div className="form-grid">
            <Field label="اسم المورد">
              <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="اسم المورد" disabled={supplierMutation.isPending || !canManageSuppliers} />
            </Field>
            <Field label="هاتف المورد (اختياري)">
              <input value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} placeholder="رقم التليفون" disabled={supplierMutation.isPending || !canManageSuppliers} />
            </Field>
          </div>
          <div className="actions" style={{ justifyContent: 'flex-start', marginTop: '4px' }}>
            <Button type="button" onClick={() => supplierMutation.mutate()} disabled={supplierMutation.isPending || !canManageSuppliers}>إضافة مورد</Button>
          </div>
          {!canManageSuppliers ? <div className="muted small">صلاحية إضافة مورد جديد غير متاحة لهذا الحساب.</div> : null}
          <MutationFeedback isError={supplierMutation.isError} error={supplierMutation.error} errorFallback="تعذر إضافة المورد" />
          <MutationFeedback isSuccess={supplierMutation.isSuccess} successText="تمت إضافة المورد بنجاح." />
        </div>
      </div>
    </FormSection>
  );
}
