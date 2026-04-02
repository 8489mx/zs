import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { DraftStateNotice } from '@/components/shared/DraftStateNotice';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useUpdateCustomerMutation } from '@/features/customers/hooks/useCustomerActions';
import { customerFormSchema, type CustomerFormInput, type CustomerFormOutput } from '@/features/customers/schemas/customer.schema';
import type { Customer } from '@/types/domain';

export function CustomerEditorCard({ customer, onSaved }: { customer?: Customer; onSaved?: () => void }) {
  const form = useForm<CustomerFormInput, undefined, CustomerFormOutput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: '', phone: '', address: '', balance: 0, type: 'cash', creditLimit: 0 }
  });
  const mutation = useUpdateCustomerMutation(customer?.id ? String(customer.id) : undefined, onSaved);
  useUnsavedChangesGuard(Boolean(customer) && form.formState.isDirty && !mutation.isPending);

  useEffect(() => {
    if (!customer) return;
    form.reset({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      balance: Number(customer.balance || 0),
      type: customer.type === 'vip' ? 'vip' : 'cash',
      creditLimit: Number(customer.creditLimit || 0)
    });
  }, [customer, form]);

  if (!customer) {
    return <div className="muted">اختر عميلًا من الجدول لعرض نموذج التعديل.</div>;
  }

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تعديلات العميل الحالية غير محفوظة" hint="احفظ التغييرات أو أعد تعيين القيم قبل الانتقال إلى عميل آخر." />
      <Field label="اسم العميل" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
      <Field label="الهاتف"><input {...form.register('phone')} disabled={mutation.isPending} /></Field>
      <Field label="العنوان"><input {...form.register('address')} disabled={mutation.isPending} /></Field>
      <Field label="نوع العميل">
        <select {...form.register('type')} disabled={mutation.isPending}>
          <option value="cash">نقدي</option>
          <option value="vip">مميز</option>
        </select>
      </Field>
      <Field label="الرصيد الافتتاحي"><input type="number" step="0.01" {...form.register('balance')} disabled={mutation.isPending} /></Field>
      <Field label="حد الائتمان"><input type="number" step="0.01" {...form.register('creditLimit')} disabled={mutation.isPending} /></Field>
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث العميل" successText="تم تحديث العميل بنجاح." />
      <div className="actions sticky-form-actions">
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={mutation.isPending}>إعادة القيم</Button>
        <SubmitButton type="submit" disabled={mutation.isPending} idleText="حفظ التعديل" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
