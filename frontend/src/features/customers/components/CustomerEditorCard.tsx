import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useUpdateCustomerMutation } from '@/features/customers/hooks/useCustomerActions';
import { customerFormSchema, type CustomerFormInput, type CustomerFormOutput } from '@/features/customers/schemas/customer.schema';
import type { Customer } from '@/types/domain';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useCustomerProfile } from '@/features/customers/constants/customer-profiles';
import { getGlobalCurrencySymbol } from '@/lib/currencies';

export function CustomerEditorCard({ customer, onSaved }: { customer?: Customer; onSaved?: () => void }) {
  const profile = useCustomerProfile();
  const settingsQuery = useSettingsQuery();
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;
  const form = useForm<CustomerFormInput, undefined, CustomerFormOutput>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: '', phone: '', address: '', balance: 0, type: 'cash', creditLimit: 0 }
  });
  const mutation = useUpdateCustomerMutation(customer?.id ? String(customer.id) : undefined, onSaved);
  useUnsavedChangesGuard(Boolean(customer) && form.formState.isDirty && !mutation.isPending);

  useEffect(() => {
    if (!customer) return;
    form.reset({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      balance: Number(customer.balance || 0),
      type: (['vip', 'credit', 'wholesale', 'cash'].includes(customer.type) ? customer.type : 'cash') as any,
      creditLimit: Number(customer.creditLimit || 0),
      metadata: customer.metadata || { currency: 'EGP' }
    });
  }, [customer, form]);

  if (!customer) {
    return <div className="muted">اختر عميلًا من الجدول لعرض نموذج التعديل.</div>;
  }

  return (
    <form className="form-grid customer-form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تعديلات الحساب الحالية غير محفوظة" hint="احفظ التغييرات أو أعد تعيين القيم قبل الانتقال إلى حساب آخر." />
      
      <Field label={profile.nameLabel} error={form.formState.errors.name?.message} className="field-full-span">
        <input 
          {...form.register('name')} 
          disabled={mutation.isPending} 
          placeholder={profile.namePlaceholder}
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
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث البيانات" successText="تم تحديث البيانات بنجاح." />
      <div className="actions sticky-form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={mutation.isPending} style={{ flex: '1 1 120px' }}>إعادة القيم</Button>
        <SubmitButton type="submit" isPending={mutation.isPending} idleText={profile.submitEditText} pendingText="جارٍ الحفظ..." style={{ flex: '2 1 180px' }} />
      </div>
    </form>
  );
}
