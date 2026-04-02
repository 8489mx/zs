import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
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
    <Card title="إضافة قسم / مورد من نفس تبويب الأصناف" actions={<span className="nav-pill">مباشر من شاشة الأصناف</span>}>
      <div className="form-grid">
        <Field label="قسم جديد"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="اسم القسم" disabled={categoryMutation.isPending} /></Field>
        <div className="field" style={{ justifyContent: 'end' }}>
          <span> </span>
          <Button type="button" onClick={() => categoryMutation.mutate()} disabled={categoryMutation.isPending}>إضافة قسم</Button>
        </div>
        <Field label="اسم المورد"><input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="اسم المورد" disabled={supplierMutation.isPending || !canManageSuppliers} /></Field>
        <Field label="الهاتف"><input value={supplierPhone} onChange={(event) => setSupplierPhone(event.target.value)} placeholder="اختياري" disabled={supplierMutation.isPending || !canManageSuppliers} /></Field>
      </div>
      <div className="actions" style={{ marginTop: 12 }}>
        <Button type="button" onClick={() => supplierMutation.mutate()} disabled={supplierMutation.isPending || !canManageSuppliers}>إضافة مورد</Button>
      </div>
      {!canManageSuppliers ? <div className="muted small">صلاحية إضافة مورد جديد غير متاحة لهذا الحساب من شاشة الأصناف.</div> : null}
      <MutationFeedback isError={categoryMutation.isError} error={categoryMutation.error} errorFallback="تعذر إضافة القسم" />
      <MutationFeedback isSuccess={categoryMutation.isSuccess} successText="تمت إضافة القسم وتحديث القائمة." />
      <MutationFeedback isError={supplierMutation.isError} error={supplierMutation.error} errorFallback="تعذر إضافة المورد" />
      <MutationFeedback isSuccess={supplierMutation.isSuccess} successText="تمت إضافة المورد وتحديث القائمة." />
    </Card>
  );
}
