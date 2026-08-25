import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import { useCreateCustomerMutation } from '@/features/customers/hooks/useCreateCustomerMutation';
import { customerFormSchema, type CustomerFormInput, type CustomerFormOutput } from '@/features/customers/schemas/customer.schema';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

const DEFAULT_VALUES = { name: '', phone: '', address: '', balance: 0, type: 'cash' as const, creditLimit: 0, metadata: { currency: 'EGP' } };

export function CustomerForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const settingsQuery = useSettingsQuery();
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;

  const form = useForm<CustomerFormInput, undefined, CustomerFormOutput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: DEFAULT_VALUES
  });
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !form.formState.isSubmitSuccessful && !form.formState.isSubmitting);
  const mutation = useCreateCustomerMutation(() => {
    form.reset(DEFAULT_VALUES);
    onSuccess?.();
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
    <form className="form-grid customer-form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="بيانات العميل الجديدة لم تُحفظ بعد" hint="يمكنك الحفظ الآن أو تفريغ النموذج قبل الانتقال لعميل آخر." />
      
      <Field label="اسم العميل *" error={form.formState.errors.name?.message}>
        <input 
          {...form.register('name')} 
          disabled={mutation.isPending} 
          placeholder="مثال: شركة الأمل / أحمد محمود"
          data-autofocus
        />
      </Field>

      <Field label="رقم الهاتف" error={form.formState.errors.phone?.message}>
        <input 
          type="tel"
          {...form.register('phone')} 
          disabled={mutation.isPending} 
          placeholder="مثال: 010xxxxxxxx"
        />
      </Field>

      <Field label="نوع وتصنيف العميل">
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <CustomSelect
              value={field.value}
              onChange={field.onChange}
              disabled={mutation.isPending}
              options={[
                { value: 'cash', label: 'عميل عادي / تجزئة (افتراضي)' },
                { value: 'vip', label: 'عميل مميز (VIP) - خصومات خاصة' },
                { value: 'credit', label: 'عميل آجل (سحب على الحساب)' },
                { value: 'wholesale', label: 'عميل جملة (أسعار جملة)' },
              ]}
            />
          )}
        />
      </Field>

      <Field label="العنوان / المنطقة">
        <input 
          {...form.register('address')} 
          disabled={mutation.isPending} 
          placeholder="المدينة، الحي، اسم الشارع..."
        />
      </Field>

      <Field 
        label="الرصيد الافتتاحي (ج.م)" 
        hint="المبلغ المستحق على العميل عند بداية التسجيل (إن وجد)"
        error={form.formState.errors.balance?.message}
      >
        <input 
          type="number" 
          step="0.01" 
          {...form.register('balance')} 
          disabled={mutation.isPending} 
          placeholder="0.00"
        />
      </Field>

      <Field 
        label="حد الائتمان (ج.م)" 
        hint="أقصى مبلغ مسموح بالسحب الآجل (0 = نقدي فقط)"
        error={form.formState.errors.creditLimit?.message}
      >
        <input 
          type="number" 
          step="0.01" 
          {...form.register('creditLimit')} 
          disabled={mutation.isPending} 
          placeholder="0.00"
        />
      </Field>
      
      {importModuleEnabled && (
        <fieldset className="p-4 border rounded bg-slate-50 dark:bg-slate-800/50 space-y-4 col-span-2">
          <legend className="px-2 font-semibold text-primary">إعدادات الاستيراد</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="عملة الحساب">
              <Controller
                name="metadata.currency"
                control={form.control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={mutation.isPending}
                    options={[
                      { value: 'EGP', label: 'جنيه مصري' },
                      { value: 'USD', label: 'دولار أمريكي' },
                    ]}
                  />
                )}
              />
            </Field>
          </div>
        </fieldset>
      )}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ العميل" successText="تم حفظ العميل بنجاح." />
      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ النموذج</FormResetButton>
        <SubmitButton type="submit" isPending={mutation.isPending} idleText="حفظ العميل" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
