import { useEffect } from 'react';
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

export function LocationForm({ branches, canManageSettings, setupMode = false, onSetupAdvance, initialValues, onCreated }: LocationFormProps) {
  const form = useForm<LocationFormInput, undefined, LocationFormOutput>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: { name: initialValues?.name || '', code: initialValues?.code || '', branchId: initialValues?.branchId || '', locationType: initialValues?.locationType || 'internal_warehouse' },
  });

  useEffect(() => {
    if (!initialValues) return;
    form.reset({ name: initialValues.name || '', code: initialValues.code || '', branchId: initialValues.branchId || '', locationType: initialValues.locationType || 'internal_warehouse' });
  }, [form, initialValues?.branchId, initialValues?.code, initialValues?.name, initialValues?.locationType]);

  const mutation = useCreateLocationMutation((result) => {
    const savedName = String(form.getValues('name') || '').trim();
    const savedBranchId = String(form.getValues('branchId') || '');
    form.reset({ name: '', code: '', branchId: SINGLE_STORE_MODE ? (branches[0]?.id || '') : '', locationType: 'internal_warehouse' });
    onCreated?.({ locationId: result?.locationId, name: savedName, branchId: savedBranchId });
    if (setupMode && branches.length > 0) onSetupAdvance?.();
  });

  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);
  const handleSaveWarehouse = form.handleSubmit((values) =>
    mutation.mutate(({ ...values, branchId: SINGLE_STORE_MODE ? (values.branchId || branches[0]?.id || '') : values.branchId }) as LocationFormValues)
  );

  return (
    <div className="form-grid">
      <Field label={SINGLE_STORE_MODE ? 'اسم المخزن الأساسي' : 'اسم المخزن'} error={form.formState.errors.name?.message}>
        <input {...form.register('name')} disabled={mutation.isPending || !canManageSettings} />
      </Field>
      <Field label="كود المخزن">
        <input {...form.register('code')} disabled={mutation.isPending || !canManageSettings} />
      </Field>
      {!SINGLE_STORE_MODE ? (
        <Field label="الفرع المرتبط">
          <select {...form.register('branchId')} disabled={mutation.isPending || !canManageSettings}>
            <option value="">بدون ربط</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="نوع المخزن">
        <select {...form.register('locationType')} disabled={mutation.isPending || !canManageSettings}>
          <option value="internal_warehouse">مخزن داخلي (لا يظهر كأرصدة فروع)</option>
          <option value="branch_stock">رصيد فرع (متاح للبيع)</option>
        </select>
      </Field>

      <DraftStateNotice
        visible={form.formState.isDirty && !mutation.isPending}
        title={SINGLE_STORE_MODE ? 'بيانات المخزن الأساسي غير محفوظة' : 'بيانات المخزن الجديد غير محفوظة'}
        hint={SINGLE_STORE_MODE ? 'احفظ بيانات المخزن الأساسي قبل مغادرة هذه الشاشة.' : 'احفظ المخزن أو أعد ضبط الحقول قبل مغادرة هذا النموذج.'}
      />

      <div className="actions compact-actions sticky-form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (canNavigateAway()) form.reset({ name: '', code: '', branchId: SINGLE_STORE_MODE ? (branches[0]?.id || '') : '', locationType: 'internal_warehouse' });
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
        successText={SINGLE_STORE_MODE ? 'تم حفظ بيانات المخزن الأساسي بنجاح.' : 'تمت إضافة المخزن بنجاح.'}
      />

      <SubmitButton
        type="button"
        variant="secondary"
        isPending={mutation.isPending} disabled={!canManageSettings}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleSaveWarehouse();
        }}
        idleText={SINGLE_STORE_MODE ? 'حفظ بيانات المخزن الأساسي' : 'حفظ المخزن'}
        pendingText="جارٍ الحفظ..."
      />
    </div>
  );
}
