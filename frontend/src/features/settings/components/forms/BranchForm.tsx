import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { DraftStateNotice } from '@/components/shared/DraftStateNotice';
import { useCreateBranchMutation, type BranchFormValues } from '@/features/settings/hooks/useSettingsMutations';
import { branchFormSchema, type BranchFormInput, type BranchFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { BranchFormProps } from '@/features/settings/components/forms/settings-forms.shared';

export function BranchForm({ canManageSettings, setupMode = false, onSetupAdvance, hasExistingLocations = false }: BranchFormProps) {
  const form = useForm<BranchFormInput, undefined, BranchFormOutput>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: { name: '', code: '' }
  });
  const mutation = useCreateBranchMutation(() => {
    form.reset({ name: '', code: '' });
    if (setupMode && hasExistingLocations) onSetupAdvance?.();
  });
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values as BranchFormValues))}>
      <Field label={SINGLE_STORE_MODE ? 'اسم المتجر الرئيسي' : 'اسم الفرع'} error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending || !canManageSettings} /></Field>
      <Field label={SINGLE_STORE_MODE ? 'كود المتجر' : 'كود الفرع'}><input {...form.register('code')} disabled={mutation.isPending || !canManageSettings} /></Field>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title={SINGLE_STORE_MODE ? 'بيانات المتجر الرئيسي غير محفوظة' : 'بيانات الفرع الجديدة غير محفوظة'} hint={SINGLE_STORE_MODE ? 'احفظ تعريف المتجر الرئيسي قبل الانتقال إلى بقية الإعدادات.' : 'يمكنك الإضافة أو تفريغ النموذج قبل الانتقال إلى جزء آخر من الإعدادات.'} />
      <div className="actions compact-actions sticky-form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => { if (canNavigateAway()) form.reset({ name: '', code: '' }); }} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ</button>
      </div>
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback={SINGLE_STORE_MODE ? 'تعذر حفظ بيانات المتجر الرئيسي' : 'تعذر إضافة الفرع'} successText={SINGLE_STORE_MODE ? 'تم حفظ بيانات المتجر الرئيسي بنجاح.' : 'تمت إضافة الفرع بنجاح.'} />
      <SubmitButton type="submit" variant="secondary" disabled={mutation.isPending || !canManageSettings} idleText={SINGLE_STORE_MODE ? 'حفظ بيانات المتجر الرئيسي' : 'إضافة فرع'} pendingText="جارٍ الإضافة..." />
    </form>
  );
}
