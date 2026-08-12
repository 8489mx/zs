import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
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
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تعديلات المورد الحالية غير محفوظة" hint="احفظ التغييرات أو أعد تعيين القيم قبل الانتقال إلى مورد آخر." />
      <Field label="اسم المورد" error={form.formState.errors.name?.message}><input {...form.register('name')} disabled={mutation.isPending} /></Field>
      <Field label="الهاتف"><input {...form.register('phone')} disabled={mutation.isPending} /></Field>
      <Field label="العنوان"><input {...form.register('address')} disabled={mutation.isPending} /></Field>
      <Field label="الرصيد الافتتاحي"><input type="number" step="0.01" {...form.register('balance')} disabled={mutation.isPending} /></Field>
      <Field label="ملاحظات"><textarea rows={4} {...form.register('notes')} disabled={mutation.isPending} /></Field>
      
      {importModuleEnabled && (
        <fieldset className="p-4 border rounded bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <legend className="px-2 font-semibold text-primary">إعدادات الاستيراد</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="عملة التعامل">
              <select {...form.register('metadata.currency')} disabled={mutation.isPending}>
                <option value="USD">دولار أمريكي</option>
                <option value="EUR">يورو</option>
                <option value="CNY">يوان صيني</option>
                <option value="EGP">جنيه مصري</option>
              </select>
            </Field>
            <Field label="تصنيف المورد">
              <select {...form.register('metadata.supplierType')} disabled={mutation.isPending}>
                <option value="factory">مصنع خارجي</option>
                <option value="shipping">شركة شحن</option>
                <option value="customs">مخلص جمركي</option>
              </select>
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
