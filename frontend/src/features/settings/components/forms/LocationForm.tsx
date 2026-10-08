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

import { useAuthStore } from '@/stores/auth-store';
import { resolveCurrentVertical } from '@/shared/verticals/vertical-scope';

export function LocationForm({ branches, canManageSettings, setupMode = false, onSetupAdvance, initialValues, onCreated }: LocationFormProps) {
  const tenant = useAuthStore((s) => s.tenant);
  const vertical = resolveCurrentVertical(tenant);
  const isMaritime = vertical === 'maritime';
  const isContracting = vertical === 'contracting';

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

  const nameLabel = isMaritime
    ? 'اسم الميناء / محطة الحاويات'
    : isContracting
    ? 'اسم موقع التشوين الميداني'
    : SINGLE_STORE_MODE
    ? 'اسم المخزن الأساسي'
    : 'اسم المخزن';

  const codeLabel = isMaritime
    ? 'كود الميناء الدولي (UN/LOCODE)'
    : isContracting
    ? 'كود موقع التشوين'
    : 'كود المخزن';

  const branchLabel = isMaritime
    ? 'المكتب الملاحي المشرف'
    : isContracting
    ? 'المقر الإداري / المشروع التابع له'
    : 'الفرع المرتبط';

  const idleButtonText = isMaritime
    ? 'حفظ الميناء / المحطة'
    : isContracting
    ? 'حفظ موقع التشوين'
    : SINGLE_STORE_MODE
    ? 'حفظ بيانات المخزن الأساسي'
    : 'حفظ المخزن';

  const successMessage = isMaritime
    ? 'تمت إضافة الميناء / المحطة بنجاح.'
    : isContracting
    ? 'تمت إضافة موقع التشوين بنجاح.'
    : SINGLE_STORE_MODE
    ? 'تم حفظ بيانات المخزن الأساسي بنجاح.'
    : 'تمت إضافة المخزن بنجاح.';

  return (
    <div className="form-grid">
      <Field label={nameLabel} error={form.formState.errors.name?.message}>
        <input {...form.register('name')} disabled={mutation.isPending || !canManageSettings} />
      </Field>
      <Field label={codeLabel}>
        <input {...form.register('code')} disabled={mutation.isPending || !canManageSettings} placeholder={isMaritime ? 'مثال: EGALY, EGPSD' : ''} />
      </Field>
      {!SINGLE_STORE_MODE ? (
        <Field label={branchLabel}>
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
      <Field label={isMaritime ? 'طبيعة الموقع الملاحي' : isContracting ? 'نوع موقع التشوين' : 'نوع المخزن'}>
        <select {...form.register('locationType')} disabled={mutation.isPending || !canManageSettings}>
          {isMaritime ? (
            <>
              <option value="internal_warehouse">محطة / ساحة تخزين حاويات ومستودع لوجستي</option>
              <option value="branch_stock">ميناء بحري / رصيف شحن وتفريغ</option>
            </>
          ) : isContracting ? (
            <>
              <option value="internal_warehouse">موقع تشوين رئيسي</option>
              <option value="branch_stock">تشوين فرعي للمشروع</option>
            </>
          ) : (
            <>
              <option value="internal_warehouse">مخزن داخلي (لا يظهر كأرصدة فروع)</option>
              <option value="branch_stock">رصيد فرع (متاح للبيع)</option>
            </>
          )}
        </select>
      </Field>

      <DraftStateNotice
        visible={form.formState.isDirty && !mutation.isPending}
        title={isMaritime ? 'بيانات الموقع الملاحي غير محفوظة' : SINGLE_STORE_MODE ? 'بيانات المخزن الأساسي غير محفوظة' : 'بيانات المخزن الجديد غير محفوظة'}
        hint={isMaritime ? 'احفظ بيانات الموقع الملاحي أو أعد ضبط الحقول.' : SINGLE_STORE_MODE ? 'احفظ بيانات المخزن الأساسي قبل مغادرة هذه الشاشة.' : 'احفظ المخزن أو أعد ضبط الحقول قبل مغادرة هذا النموذج.'}
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
        successText={successMessage}
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
        idleText={idleButtonText}
        pendingText="جارٍ الحفظ..."
      />
    </div>
  );
}
