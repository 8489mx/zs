import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormSection } from '@/shared/components/form-section';
import { Field } from '@/shared/ui/field';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { queryKeys } from '@/app/query-keys';
import { catalogApi } from '@/lib/api/catalog';
import { useTranslation } from "react-i18next";

export function QuickCustomerCard({ canManageCustomers }: { canManageCustomers: boolean }) {
    const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const customerName = name.trim();
      if (!customerName) throw new Error(t('sales.506e62'));
      return catalogApi.createCustomer({ name: customerName, phone: phone.trim(), address: '', balance: 0, notes: '' });
    },
    onSuccess: async () => {
      setName('');
      setPhone('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers });
    }
  });

  return (
    <FormSection title={t('sales.03df17')} className="workspace-panel sales-quick-customer-card">
      <div className="sales-quick-customer-inline-wrap">
        <div className="sales-quick-customer-inline-grid">
          <Field label={t('sales.2b9848')}><input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('sales.2b9848')} disabled={mutation.isPending || !canManageCustomers} /></Field>
          <Field label={t('sales.76f2f1')}><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t('sales.f36a82')} disabled={mutation.isPending || !canManageCustomers} /></Field>
        </div>
      </div>
      <div className="actions section-actions-clean">
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || !canManageCustomers}>{t('sales.402540')}</Button>
      </div>
      {!canManageCustomers ? <div className="muted small">{t('sales.235e62')}</div> : null}
      <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback={t('sales.b7eb5c')} />
      <MutationFeedback isSuccess={mutation.isSuccess} successText={t('sales.6c6513')} />
    </FormSection>
  );
}
