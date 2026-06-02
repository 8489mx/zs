import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useCreateBranchMutation, type BranchFormValues } from '@/features/settings/hooks/useSettingsMutations';
import { branchFormSchema, type BranchFormInput, type BranchFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { BranchFormProps } from '@/features/settings/components/forms/settings-forms.shared';

export function BranchForm({ canManageSettings, setupMode = false, onSetupAdvance, hasExistingLocations = false, initialValues, onCreated }: BranchFormProps) {
  const form = useForm<BranchFormInput, undefined, BranchFormOutput>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: { name: initialValues?.name || '', code: initialValues?.code || '' },
  });

  useEffect(() => {
    if (!initialValues) return;
    form.reset({ name: initialValues.name || '', code: initialValues.code || '' });
  }, [form, initialValues?.code, initialValues?.name]);

  const mutation = useCreateBranchMutation((result) => {
    const savedName = String(form.getValues('name') || '').trim();
    form.reset({ name: '', code: '' });
    onCreated?.({ branchId: result?.branchId, name: savedName });
    if (setupMode && hasExistingLocations) onSetupAdvance?.();
  });

  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);
  const handleSaveBranch = form.handleSubmit((values) => mutation.mutate(values as BranchFormValues));

  return (
    <div className="form-grid">
      <Field label={SINGLE_STORE_MODE ? 'اسم النشاط الرئيسي' : 'اسم الفرع'} error={form.formState.errors.name?.message}>
        <input {...form.register('name')} disabled={mutation.isPending || !canManageSettings} />
      </Field>
      <Field label={SINGLE_STORE_MODE ? 'كود المتجر' : 'كود الفرع'}>
        <input {...form.register('code')} disabled={mutation.isPending || !canManageSettings} />
      </Field>

      <DraftStateNotice
        visible={form.formState.isDirty && !mutation.isPending}
        title={SINGLE_STORE_MODE ? 'بيانات النشاط الرئيسي غير محفوظة' : 'بيانات الفرع الجديد غير محفوظة'}
        hint={SINGLE_STORE_MODE ? 'احفظ تعريف النشاط الرئيسي قبل الانتقال إلى بقية الإعدادات.' : 'يمكنك الإضافة أو تفريغ النموذج قبل الانتقال إلى جزء آخر من الإعدادات.'}
      />

      <div className="actions compact-actions sticky-form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (canNavigateAway()) form.reset({ name: '', code: '' });
          }}
          disabled={mutation.isPending || !form.formState.isDirty}
        >
          تفريغ
        </button>
      </div>

      <MutationFeedback
        isError={mutation.isError}
        isSuccess={mutation.isSuccess}
        error={mutation.error}
        errorFallback="هذا الاسم أو الكود مستخدم بالفعل."
        successText={SINGLE_STORE_MODE ? 'تم حفظ بيانات النشاط الرئيسي بنجاح.' : 'تمت إضافة الفرع بنجاح.'}
      />

      <SubmitButton
        type="button"
        variant="secondary"
        disabled={mutation.isPending || !canManageSettings}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleSaveBranch();
        }}
        idleText={SINGLE_STORE_MODE ? 'حفظ بيانات النشاط الرئيسي' : 'حفظ الفرع'}
        pendingText="جارٍ الحفظ..."
      />
    </div>
  );
}
