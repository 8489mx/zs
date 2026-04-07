import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useCreateLocationMutation, type LocationFormValues } from '@/features/settings/hooks/useSettingsMutations';
import { locationFormSchema, type LocationFormInput, type LocationFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { LocationFormProps } from '@/features/settings/components/forms/settings-forms.shared';

export function LocationForm({ branches, canManageSettings, setupMode = false, onSetupAdvance }: LocationFormProps) {
  const form = useForm<LocationFormInput, undefined, LocationFormOutput>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: { name: '', code: '', branchId: '' }
  });
  const mutation = useCreateLocationMutation(() => {
    form.reset({ name: '', code: '', branchId: SINGLE_STORE_MODE ? (branches[0]?.id || '') : '' });
    if (setupMode && branches.length > 0) onSetupAdvance?.();
  });
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(({ ...values, branchId: SINGLE_STORE_MODE ? (values.branchId || branches[0]?.id || '') : values.branchId }) as LocationFormValues))}>
      <Field label={SINGLE_STORE_MODE ? 'اسم المخزن الأساسي' : 'اسم الموقع'} error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending || !canManageSettings} /></Field>
      <Field label={SINGLE_STORE_MODE ? 'كود المخزن' : 'كود الموقع'}><input {...form.register('code')} disabled={mutation.isPending || !canManageSettings} /></Field>
      {!SINGLE_STORE_MODE ? <Field label="الفرع المرتبط">
        <select {...form.register('branchId')} disabled={mutation.isPending || !canManageSettings}>
          <option value="">بدون ربط</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </Field> : null}
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title={SINGLE_STORE_MODE ? 'بيانات المخزن الأساسي غير محفوظة' : 'بيانات الموقع الجديدة غير محفوظة'} hint={SINGLE_STORE_MODE ? 'احفظ بيانات المخزن الأساسي قبل مغادرة هذه الشاشة.' : 'احفظ الموقع أو أعد ضبط الحقول قبل مغادرة هذا النموذج.'} />
      <div className="actions compact-actions sticky-form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => { if (canNavigateAway()) form.reset({ name: '', code: '', branchId: SINGLE_STORE_MODE ? (branches[0]?.id || '') : '' }); }} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ</button>
      </div>
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback={SINGLE_STORE_MODE ? 'تعذر حفظ بيانات المخزن الأساسي' : 'تعذر إضافة الموقع'} successText={SINGLE_STORE_MODE ? 'تم حفظ بيانات المخزن الأساسي بنجاح.' : 'تمت إضافة الموقع بنجاح.'} />
      <SubmitButton type="submit" variant="secondary" disabled={mutation.isPending || !canManageSettings} idleText={SINGLE_STORE_MODE ? 'حفظ بيانات المخزن الأساسي' : 'إضافة موقع'} pendingText="جارٍ الإضافة..." />
    </form>
  );
}
