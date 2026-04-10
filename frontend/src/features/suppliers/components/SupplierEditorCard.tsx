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

export function SupplierEditorCard({ supplier, onSaved }: { supplier?: Supplier; onSaved?: () => void }) {
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
      notes: supplier.notes || ''
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
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر تحديث المورد" successText="تم تحديث المورد بنجاح." />
      <div className="actions sticky-form-actions">
        <Button type="button" variant="secondary" onClick={() => form.reset()} disabled={mutation.isPending}>إعادة القيم</Button>
        <SubmitButton type="submit" disabled={mutation.isPending} idleText="حفظ التعديل" pendingText="جارٍ الحفظ..." />
      </div>
    </form>
  );
}
