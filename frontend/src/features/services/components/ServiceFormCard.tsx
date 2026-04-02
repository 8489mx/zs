import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { MutationFeedback } from '@/components/shared/MutationFeedback';
import { SubmitButton } from '@/components/shared/SubmitButton';
import { DraftStateNotice } from '@/components/shared/DraftStateNotice';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { ServiceRecord } from '@/types/domain';
import { useSaveServiceMutation, type ServiceFormValues } from '@/features/services/hooks/useServiceMutations';

function buildDefaultValues(service?: ServiceRecord): ServiceFormValues {
  return {
    name: service?.name || '',
    amount: Number(service?.amount || 0),
    notes: service?.notes || '',
    date: (service?.serviceDate || new Date().toISOString()).slice(0, 16)
  };
}

export function ServiceFormCard({ service, onSaved }: { service?: ServiceRecord; onSaved?: () => void }) {
  const form = useForm<ServiceFormValues>({ defaultValues: buildDefaultValues() });
  const mutation = useSaveServiceMutation(service?.id, () => {
    form.reset(buildDefaultValues());
    onSaved?.();
  });
  useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

  useEffect(() => {
    form.reset(buildDefaultValues(service));
  }, [service, form]);

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title={service ? 'تعديلات الخدمة الحالية غير محفوظة' : 'بيانات الخدمة الجديدة لم تُحفظ بعد'} />
      <Field label="اسم الخدمة">
        <input {...form.register('name', { required: true })} disabled={mutation.isPending} />
      </Field>
      <Field label="القيمة">
        <input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} disabled={mutation.isPending} />
      </Field>
      <Field label="التاريخ">
        <input type="datetime-local" {...form.register('date')} disabled={mutation.isPending} />
      </Field>
      <Field label="ملاحظات">
        <textarea rows={4} {...form.register('notes')} disabled={mutation.isPending} />
      </Field>
      <MutationFeedback
        isError={mutation.isError}
        isSuccess={mutation.isSuccess}
        error={mutation.error}
        errorFallback={service ? 'تعذر تحديث الخدمة' : 'تعذر حفظ الخدمة'}
        successText={service ? 'تم تحديث الخدمة بنجاح.' : 'تم حفظ الخدمة بنجاح.'}
      />
      <div className="actions sticky-form-actions">
        {service ? (
          <Button type="button" variant="secondary" onClick={() => onSaved?.()} disabled={mutation.isPending}>
            إلغاء التحديد
          </Button>
        ) : null}
        <SubmitButton
          type="submit"
          disabled={mutation.isPending}
          idleText={service ? 'حفظ التعديل' : 'إضافة الخدمة'}
          pendingText="جارٍ الحفظ..."
        />
      </div>
    </form>
  );
}
