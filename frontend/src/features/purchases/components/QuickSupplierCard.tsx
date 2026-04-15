import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { queryKeys } from '@/app/query-keys';
import { catalogApi } from '@/lib/api/catalog';

interface QuickSupplierCardProps {
  canManageSuppliers: boolean;
  inline?: boolean;
}

export function QuickSupplierCard({ canManageSuppliers, inline = false }: QuickSupplierCardProps) {
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

  if (inline) {
    return (
      <div className="purchase-quick-supplier-inline" style={{ gridColumn: '1 / -1' }}>
        <div className="purchase-quick-supplier-inline-head">
          <strong>إضافة مورد سريع</strong>
          <span className="muted small">من نفس الشاشة</span>
        </div>

        <div className="purchase-quick-supplier-inline-grid">
          <Field label="اسم المورد">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اسم المورد"
              disabled={mutation.isPending || !canManageSuppliers}
            />
          </Field>

          <Field label="الهاتف">
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="اختياري"
              disabled={mutation.isPending || !canManageSuppliers}
            />
          </Field>

          <div className="purchase-quick-supplier-inline-action">
            <Button type="button" variant="secondary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canManageSuppliers}>
              إضافة المورد
            </Button>
          </div>
        </div>

        {!canManageSuppliers ? <div className="muted small">هذا الحساب لا يملك صلاحية إضافة مورد جديد من شاشة المشتريات.</div> : null}
        <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر إضافة المورد" />
        <MutationFeedback isSuccess={mutation.isSuccess} successText="تمت إضافة المورد وتحديث القوائم." />
      </div>
    );
  }

  return (
    <Card title="إضافة مورد سريع" actions={<span className="nav-pill">من نفس الشاشة</span>} className="workspace-panel purchases-quick-supplier-card">
      <div className="form-grid compact-form-grid">
        <Field label="اسم المورد"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم المورد" disabled={mutation.isPending || !canManageSuppliers} /></Field>
        <Field label="الهاتف"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="اختياري" disabled={mutation.isPending || !canManageSuppliers} /></Field>
      </div>
      <div className="actions section-actions-clean purchases-quick-supplier-actions">
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canManageSuppliers}>إضافة المورد</Button>
      </div>
      {!canManageSuppliers ? <div className="muted small">هذا الحساب لا يملك صلاحية إضافة مورد جديد من شاشة المشتريات.</div> : null}
      <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر إضافة المورد" />
      <MutationFeedback isSuccess={mutation.isSuccess} successText="تمت إضافة المورد وتحديث القوائم." />
    </Card>
  );
}
