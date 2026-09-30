import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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
import { useCustomerProfile } from '@/features/customers/constants/customer-profiles';
import { deliveryRepsApi } from '@/shared/api/delivery-reps.api';
import { getGlobalCurrencySymbol } from '@/lib/currencies';

const DEFAULT_VALUES = { name: '', phone: '', address: '', balance: 0, type: 'cash' as const, creditLimit: 0, metadata: { currency: 'EGP' } };

export function CustomerForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const profile = useCustomerProfile();
  const settingsQuery = useSettingsQuery();
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;
  const repsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
    staleTime: 60000,
  });

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
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="بيانات السجل الجديدة لم تُحفظ بعد" hint="يمكنك الحفظ الآن أو تفريغ النموذج قبل الانتقال لحساب آخر." />
      
      <Field label={profile.nameLabel} error={form.formState.errors.name?.message} className="field-full-span">
        <input 
          {...form.register('name')} 
          disabled={mutation.isPending} 
          placeholder={profile.namePlaceholder}
          data-autofocus
        />
      </Field>

      <Field label={profile.phoneLabel} error={form.formState.errors.phone?.message}>
        <input 
          type="tel"
          {...form.register('phone')} 
          disabled={mutation.isPending} 
          placeholder={profile.phonePlaceholder}
        />
      </Field>

      <Field label={profile.typeLabel}>
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <CustomSelect
              value={field.value}
              onChange={field.onChange}
              disabled={mutation.isPending}
              options={profile.types.map((t) => ({ value: t.value, label: t.label }))}
            />
          )}
        />
      </Field>

      <Field label={profile.addressLabel} className="field-full-span">
        <input 
          {...form.register('address')} 
          disabled={mutation.isPending} 
          placeholder={profile.addressPlaceholder}
        />
      </Field>

      <Field 
        label={`${profile.balanceLabel} (${getGlobalCurrencySymbol()})`} 
        hint={profile.balanceHint}
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
        label={`${profile.creditLimitLabel} (${getGlobalCurrencySymbol()})`} 
        hint={profile.creditLimitHint}
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
      
      {(profile.id === 'distribution' || settingsQuery.data?.deliveryFleetModuleEnabled) && (
        <fieldset style={{ padding: '12px 16px', border: '1px solid #bfdbfe', borderRadius: '10px', background: '#eff6ff', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <legend style={{ padding: '0 8px', fontWeight: 800, color: '#1e40af', fontSize: '0.84rem' }}>بيانات التوزيع وخطوط السير (Distribution & Route)</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Field label="كود المحل / المنفذ الفريد" hint="رمز تعريفي للمندوب في الشارع">
              <input
                {...form.register('metadata.customer_code')}
                disabled={mutation.isPending}
                placeholder="مثال: CUST-1042 أو 1042"
              />
            </Field>

            <Field label="خط السير / المنطقة" hint="خط التوزيع التابع له المحل">
              <input
                {...form.register('metadata.route')}
                disabled={mutation.isPending}
                placeholder="مثال: خط فيصل / خط الهرم"
              />
            </Field>

            <Field label="الحي / المربع السكني (District)" hint="لتجميع العملاء وترتيب خط سير المندوب تلقائياً">
              <input
                list="customer-known-districts"
                {...form.register('metadata.district')}
                disabled={mutation.isPending}
                placeholder="مثال: حي فيصل / العشرين / الطوابق"
                onChange={(e) => {
                  form.setValue('metadata.district', e.target.value);
                  const val = e.target.value.trim();
                  if (val && typeof window !== 'undefined') {
                    try {
                      const saved: string[] = JSON.parse(localStorage.getItem('zs_van_saved_districts') || '[]');
                      if (!saved.includes(val)) {
                        localStorage.setItem('zs_van_saved_districts', JSON.stringify([...saved, val].slice(-50)));
                      }
                    } catch {}
                  }
                }}
              />
              <datalist id="customer-known-districts">
                {(() => {
                  try {
                    const list: string[] = JSON.parse(localStorage.getItem('zs_van_saved_districts') || '[]');
                    return list.map((d) => <option key={d} value={d} />);
                  } catch {
                    return null;
                  }
                })()}
              </datalist>
            </Field>

            <Field label="رابط الموقع (Google Maps)" hint="رابط موقع المحل على الخريطة">
              <input
                {...form.register('metadata.location_url')}
                disabled={mutation.isPending}
                placeholder="https://maps.google.com/?q=..."
              />
            </Field>

            <Field label="يوم الزيارة الأسبوعي" hint="ميعاد زيارة المندوب الدورية">
              <Controller
                name="metadata.visit_day"
                control={form.control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value || ''}
                    onChange={field.onChange}
                    disabled={mutation.isPending}
                    options={[
                      { value: '', label: 'بدون تحديد' },
                      { value: 'السبت', label: 'السبت' },
                      { value: 'الأحد', label: 'الأحد' },
                      { value: 'الإثنين', label: 'الإثنين' },
                      { value: 'الثلاثاء', label: 'الثلاثاء' },
                      { value: 'الأربعاء', label: 'الأربعاء' },
                      { value: 'الخميس', label: 'الخميس' },
                      { value: 'الجمعة', label: 'الجمعة' },
                    ]}
                  />
                )}
              />
            </Field>

            <Field label="المندوب المسؤول / المخصص" hint="المندوب الذي يظهر له هذا المحل في خط سيره">
              <Controller
                name="metadata.assigned_rep_id"
                control={form.control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ? String(field.value) : ''}
                    onChange={(val) => {
                      field.onChange(val ? Number(val) : null);
                      const rep = repsQuery.data?.find((r) => String(r.id) === String(val));
                      form.setValue('metadata.assigned_rep_name', rep?.name || '');
                    }}
                    disabled={mutation.isPending}
                    options={[
                      { value: '', label: 'بدون تخصيص (مشترك / عام)' },
                      ...(repsQuery.data || []).map((r) => ({
                        value: String(r.id),
                        label: `${r.name} ${r.vehicle_plate ? `(${r.vehicle_plate})` : ''}`,
                      })),
                    ]}
                    placeholder="اختر المندوب..."
                  />
                )}
              />
            </Field>
          </div>
        </fieldset>
      )}

      {importModuleEnabled && (
        <fieldset style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <legend style={{ padding: '0 8px', fontWeight: 700, color: '#170e5e', fontSize: '0.82rem' }}>إعدادات الاستيراد</legend>
          <div>
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
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ البيانات" successText="تم الحفظ بنجاح." />
      <div className="actions sticky-form-actions">
        <FormResetButton onReset={handleReset} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ النموذج</FormResetButton>
        <SubmitButton type="submit" isPending={mutation.isPending} idleText={profile.submitCreateText} pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
