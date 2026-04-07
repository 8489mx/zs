import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/card';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { queryKeys } from '@/app/query-keys';
import { catalogApi } from '@/lib/api/catalog';

export function QuickCustomerCard({ canManageCustomers }: { canManageCustomers: boolean }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const customerName = name.trim();
      if (!customerName) throw new Error('اكتب اسم العميل');
      return catalogApi.createCustomer({ name: customerName, phone: phone.trim(), address: '', balance: 0, notes: '' });
    },
    onSuccess: async () => {
      setName('');
      setPhone('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    }
  });

  return (
    <Card title="إضافة عميل سريع" className="workspace-panel sales-quick-customer-card">
      <div className="sales-quick-customer-inline-wrap">
        <div className="sales-quick-customer-inline-grid">
          <Field label="اسم العميل"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم العميل" disabled={mutation.isPending || !canManageCustomers} /></Field>
          <Field label="الهاتف"><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="اختياري" disabled={mutation.isPending || !canManageCustomers} /></Field>
        </div>
      </div>
      <div className="actions section-actions-clean">
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canManageCustomers}>إضافة العميل</Button>
      </div>
      {!canManageCustomers ? <div className="muted small">لا تملك صلاحية إضافة عميل جديد.</div> : null}
      <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر إضافة العميل" />
      <MutationFeedback isSuccess={mutation.isSuccess} successText="تمت إضافة العميل." />
    </Card>
  );
}
