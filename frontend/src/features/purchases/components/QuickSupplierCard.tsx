import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { queryKeys } from '@/app/query-keys';
import { catalogApi } from '@/lib/api/catalog';

export function QuickSupplierCard({ canManageSuppliers }: { canManageSuppliers: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const supplierName = name.trim();
      if (!supplierName) throw new Error('اكتب اسم المورد');
      return catalogApi.createSupplier({ name: supplierName, phone: phone.trim(), address: '', balance: 0, notes: '' });
    },
    onSuccess: async () => {
      setName('');
      setPhone('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers });
    }
  });

  return (
    <Card title="إضافة مورد سريع" description="هذا المسار السريع بقي قريبًا من شاشة المشتريات حتى لا يضطر المستخدم لمغادرة الصفحة أثناء تجهيز فاتورة جديدة." actions={<span className="nav-pill">من نفس الشاشة</span>} className="workspace-panel">
      <div className="form-grid">
        <Field label="اسم المورد"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم المورد" disabled={mutation.isPending || !canManageSuppliers} /></Field>
        <Field label="الهاتف"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="اختياري" disabled={mutation.isPending || !canManageSuppliers} /></Field>
      </div>
      <div className="actions section-actions-clean">
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canManageSuppliers}>إضافة المورد</Button>
      </div>
      {!canManageSuppliers ? <div className="muted small">هذا الحساب لا يملك صلاحية إضافة مورد جديد من شاشة المشتريات.</div> : null}
      <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر إضافة المورد" />
      <MutationFeedback isSuccess={mutation.isSuccess} successText="تمت إضافة المورد وتحديث القوائم." />
    </Card>
  );
}
