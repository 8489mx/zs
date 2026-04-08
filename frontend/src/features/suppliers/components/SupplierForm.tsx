import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import { useCreateSupplierMutation } from '@/features/suppliers/hooks/useCreateSupplierMutation';
import { supplierFormSchema, type SupplierFormInput, type SupplierFormOutput } from '@/features/suppliers/schemas/supplier.schema';

const DEFAULT_VALUES = { name: '', phone: '', address: '', balance: 0, notes: '' };

export function SupplierForm() {
  const form = useForm<SupplierFormInput, undefined, SupplierFormOutput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: DEFAULT_VALUES
  });
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !form.formState.isSubmitSuccessful && !form.formState.isSubmitting);
  const mutation = useCreateSupplierMutation(() => {
    form.reset(DEFAULT_VALUES);
  });
  const watchedValues = useWatch({ control: form.control });

  useMutationFeedbackReset(
    mutation.isSuccess || mutation.isError,
    mutation.reset,
    [watchedValues],
  );

  function handleReset() {
    if (!form.formState.isDirty) return;
    if (!canNavigateAway()) return;
    mutation.reset();
    form.reset(DEFAULT_VALUES);
  }

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="بيانات المورد الجديدة لم تُحفظ بعد" hint="يمكنك الحفظ أو تفريغ الحقول قبل بدء مورد جديد." />
      <Field label="اسم المورد" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
      <Field label="الهاتف"><input {...form.register('phone')} disabled={mutation.isPending} /></Field>
      <Field label="العنوان"><input {...form.register('address')} disabled={mutation.isPending} /></Field>
      <Field label="رصيد افتتاحي"><input type="number" step="0.01" {...form.register('balance')} disabled={mutation.isPending} /></Field>
      <Field label="ملاحظات"><textarea rows={4} {...form.register('notes')} disabled={mutation.isPending} /></Field>
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ المورد" successText="تم حفظ المورد بنجاح." />
      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ النموذج</FormResetButton>
        <SubmitButton type="submit" disabled={mutation.isPending} idleText="حفظ المورد" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
