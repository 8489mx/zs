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

export function CustomerEditorCard({ customer, onSaved }: { customer?: Customer; onSaved?: () => void }) {
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
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تعديلات العميل الحالية غير محفوظة" hint="احفظ التغييرات أو أعد تعيين القيم قبل الانتقال إلى عميل آخر." />
      
      <Field label="اسم العميل *" error={form.formState.errors.name?.message}>
        <input 
          {...form.register('name')} 
          disabled={mutation.isPending} 
          placeholder="مثال: شركة الأمل / أحمد محمود"
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
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث العميل" successText="تم تحديث العميل بنجاح." />
      <div className="actions sticky-form-actions">
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={mutation.isPending}>إعادة القيم</Button>
        <SubmitButton type="submit" isPending={mutation.isPending} idleText="حفظ التعديل" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
