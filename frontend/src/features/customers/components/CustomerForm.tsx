import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import { useCreateCustomerMutation } from '@/features/customers/hooks/useCreateCustomerMutation';
import { customerFormSchema, type CustomerFormInput, type CustomerFormOutput } from '@/features/customers/schemas/customer.schema';

const DEFAULT_VALUES = { name: '', phone: '', address: '', balance: 0, type: 'cash' as const, creditLimit: 0 };

export function CustomerForm() {
  const form = useForm<CustomerFormInput, undefined, CustomerFormOutput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: DEFAULT_VALUES
  });
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !form.formState.isSubmitSuccessful && !form.formState.isSubmitting);
  const mutation = useCreateCustomerMutation(() => {
    form.reset(DEFAULT_VALUES);
  });
  const watchedValues = useWatch({ control: form.control });

  const feedbackResetKey = JSON.stringify(watchedValues);

  useMutationFeedbackReset(
    mutation.isSuccess || mutation.isError,
    mutation.reset,
    feedbackResetKey,
  );

  function handleReset() {
    if (!form.formState.isDirty) return;
    if (!canNavigateAway()) return;
    mutation.reset();
    form.reset(DEFAULT_VALUES);
  }

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="بيانات العميل الجديدة لم تُحفظ بعد" hint="يمكنك الحفظ الآن أو تفريغ النموذج قبل الانتقال لعميل آخر." />
      <Field label="اسم العميل" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
      <Field label="الهاتف"><input {...form.register('phone')} disabled={mutation.isPending} /></Field>
      <Field label="العنوان"><input {...form.register('address')} disabled={mutation.isPending} /></Field>
      <Field label="نوع العميل">
        <select {...form.register('type')} disabled={mutation.isPending}>
          <option value="cash">نقدي</option>
          <option value="vip">مميز</option>
        </select>
      </Field>
      <Field label="رصيد افتتاحي"><input type="number" step="0.01" {...form.register('balance')} disabled={mutation.isPending} /></Field>
      <Field label="حد الائتمان"><input type="number" step="0.01" {...form.register('creditLimit')} disabled={mutation.isPending} /></Field>
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ العميل" successText="تم حفظ العميل بنجاح." />
      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ النموذج</FormResetButton>
        <SubmitButton type="submit" disabled={mutation.isPending} idleText="حفظ العميل" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
