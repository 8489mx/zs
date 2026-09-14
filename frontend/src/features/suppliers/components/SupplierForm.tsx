import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { FormResetButton } from '@/shared/components/form-reset-button';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useMutationFeedbackReset } from '@/shared/hooks/use-mutation-feedback-reset';
import { useCreateSupplierMutation } from '@/features/suppliers/hooks/useCreateSupplierMutation';
import { supplierFormSchema, type SupplierFormInput, type SupplierFormOutput } from '@/features/suppliers/schemas/supplier.schema';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

const DEFAULT_VALUES = { name: '', phone: '', address: '', balance: 0, notes: '', metadata: { currency: 'USD', supplierType: 'factory' } };

export function SupplierForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const settingsQuery = useSettingsQuery();
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;

  const form = useForm<SupplierFormInput, undefined, SupplierFormOutput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: DEFAULT_VALUES
  });
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !form.formState.isSubmitSuccessful && !form.formState.isSubmitting);
  const mutation = useCreateSupplierMutation(() => {
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
    <form className="form-grid supplier-form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="بيانات المورد الجديدة لم تُحفظ بعد" hint="يمكنك الحفظ أو تفريغ الحقول قبل بدء مورد جديد." />
      
      <Field label="اسم المورد *" error={form.formState.errors.name?.message} className="field-full-span">
        <input 
          {...form.register('name')} 
          disabled={mutation.isPending} 
          placeholder="مثال: شركة التوحيد للتوريدات / أحمد حسن"
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

      <Field 
        label={`الرصيد الافتتاحي (${getGlobalCurrencySymbol()})`} 
        hint="المبلغ المستحق للمورد عند بداية التسجيل (إن وجد)"
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

      <Field label="العنوان / المقر" className="field-full-span">
        <input 
          {...form.register('address')} 
          disabled={mutation.isPending} 
          placeholder="المدينة، المنطقة، العنوان التفصيلي..."
        />
      </Field>

      <Field 
        label="ملاحظات إضافية" 
        className="field-full-span"
        hint="ملاحظات اختيارية أو شروط سداد خاصة بالمورد"
      >
        <textarea 
          rows={3} 
          {...form.register('notes')} 
          disabled={mutation.isPending} 
          placeholder="أي شروط دفع، أرقام تواصل بديلة، أو تفاصيل خاصة بالمورد..."
        />
      </Field>
      
      {importModuleEnabled && (
        <fieldset style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <legend style={{ padding: '0 8px', fontWeight: 700, color: '#170e5e', fontSize: '0.82rem' }}>إعدادات الاستيراد</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <Field label="عملة التعامل">
              <Controller
                name="metadata.currency"
                control={form.control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={mutation.isPending}
                    options={[
                      { value: 'USD', label: 'USD (دولار أمريكي)' },
                      { value: 'EUR', label: 'EUR (يورو)' },
                      { value: 'CNY', label: 'CNY (يوان صيني)' },
                      { value: 'EGP', label: 'EGP (جنيه مصري)' },
                    ]}
                  />
                )}
              />
            </Field>
            <Field label="تصنيف المورد">
              <Controller
                name="metadata.supplierType"
                control={form.control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={mutation.isPending}
                    options={[
                      { value: 'factory', label: 'مصنع خارجي' },
                      { value: 'shipping', label: 'شركة شحن' },
                      { value: 'customs', label: 'مخلص جمركي' },
                    ]}
                  />
                )}
              />
            </Field>
          </div>
        </fieldset>
      )}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ المورد" successText="تم حفظ المورد بنجاح." />
      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ النموذج</FormResetButton>
        <SubmitButton type="submit" isPending={mutation.isPending} idleText="حفظ المورد" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
