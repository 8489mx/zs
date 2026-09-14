import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { useUpdateSupplierMutation } from '@/features/suppliers/hooks/useSupplierActions';
import { supplierFormSchema, type SupplierFormInput, type SupplierFormOutput } from '@/features/suppliers/schemas/supplier.schema';
import type { Supplier } from '@/types/domain';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';

export function SupplierEditorCard({ supplier, onSaved }: { supplier?: Supplier; onSaved?: () => void }) {
  const settingsQuery = useSettingsQuery();
  const importModuleEnabled = settingsQuery.data?.importModuleEnabled === true;
  const form = useForm<SupplierFormInput, undefined, SupplierFormOutput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: { name: '', phone: '', address: '', balance: 0, notes: '' }
  });
  const mutation = useUpdateSupplierMutation(supplier?.id ? String(supplier.id) : undefined, onSaved);
  useUnsavedChangesGuard(Boolean(supplier) && form.formState.isDirty && !mutation.isPending);

  useEffect(() => {
    if (!supplier) return;
    form.reset({
      name: supplier.name || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      balance: Number(supplier.balance || 0),
      notes: supplier.notes || '',
      metadata: supplier.metadata || { currency: 'USD', supplierType: 'factory' }
    });
  }, [supplier, form]);

  if (!supplier) {
    return <div className="muted">اختر موردًا من الجدول لعرض نموذج التعديل.</div>;
  }

  return (
    <form className="form-grid supplier-form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تعديلات المورد الحالية غير محفوظة" hint="احفظ التغييرات أو أعد تعيين القيم قبل الانتقال إلى مورد آخر." />
      
      <Field label="اسم المورد *" error={form.formState.errors.name?.message} className="field-full-span">
        <input 
          {...form.register('name')} 
          disabled={mutation.isPending} 
          placeholder="مثال: شركة التوحيد للتوريدات / أحمد حسن"
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
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث المورد" successText="تم تحديث المورد بنجاح." />
      <div className="actions sticky-form-actions">
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={mutation.isPending}>إعادة القيم</Button>
        <SubmitButton type="submit" isPending={mutation.isPending} idleText="حفظ التعديل" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
