import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import type { Customer, Supplier } from '@/types/domain';
import {
  useCustomerPaymentMutation,
  useSupplierPaymentMutation,
  type CustomerPaymentFormValues,
  type SupplierPaymentFormValues
} from '@/features/accounts/hooks/useAccountingMutations';
import {
  customerPaymentSchema,
  supplierPaymentSchema,
  type CustomerPaymentInput,
  type CustomerPaymentOutput,
  type SupplierPaymentInput,
  type SupplierPaymentOutput
} from '@/features/accounts/schemas/payment.schema';

export function CustomerPaymentForm({ customers, activeCustomerId, disabled = false }: { customers: Customer[]; activeCustomerId: string; disabled?: boolean }) {
  const form = useForm<CustomerPaymentInput, undefined, CustomerPaymentOutput>({
    resolver: zodResolver(customerPaymentSchema),
    defaultValues: { customerId: '', amount: 0, note: '' }
  });
  const mutation = useCustomerPaymentMutation(activeCustomerId, () => form.reset({ customerId: '', amount: 0, note: '' }));

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values as CustomerPaymentFormValues))}>
      <Field label="العميل" error={form.formState.errors.customerId?.message}>
        <select {...form.register('customerId')} disabled={mutation.isPending || disabled}>
          <option value="">اختر العميل</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </Field>
      <Field label="المبلغ" error={form.formState.errors.amount?.message}><input type="number" step="0.01" {...form.register('amount')} disabled={mutation.isPending || disabled} /></Field>
      <Field label="ملاحظات"><textarea rows={4} {...form.register('note')} disabled={mutation.isPending || disabled} /></Field>
      {disabled ? <div className="muted small">هذا الحساب يملك متابعة كشوف الحساب فقط بدون تسجيل تحصيل جديد.</div> : null}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ التحصيل" successText="تم حفظ التحصيل بنجاح." />
      <SubmitButton type="submit" variant="success" disabled={mutation.isPending || disabled} idleText="حفظ التحصيل" pendingText="جارٍ الحفظ..." />
    </form>
  );
}

export function SupplierPaymentForm({ suppliers, activeSupplierId, disabled = false }: { suppliers: Supplier[]; activeSupplierId: string; disabled?: boolean }) {
  const form = useForm<SupplierPaymentInput, undefined, SupplierPaymentOutput>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: { supplierId: '', amount: 0, note: '' }
  });
  const mutation = useSupplierPaymentMutation(activeSupplierId, () => form.reset({ supplierId: '', amount: 0, note: '' }));

  return (
    <form className="form-grid" onSubmit={form.handleSubmit((values) => mutation.mutate(values as SupplierPaymentFormValues))}>
      <Field label="المورد" error={form.formState.errors.supplierId?.message}>
        <select {...form.register('supplierId')} disabled={mutation.isPending || disabled}>
          <option value="">اختر المورد</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
      </Field>
      <Field label="المبلغ" error={form.formState.errors.amount?.message}><input type="number" step="0.01" {...form.register('amount')} disabled={mutation.isPending || disabled} /></Field>
      <Field label="ملاحظات"><textarea rows={4} {...form.register('note')} disabled={mutation.isPending || disabled} /></Field>
      {disabled ? <div className="muted small">هذا الحساب يملك متابعة كشوف الحساب فقط بدون تسجيل تحصيل جديد.</div> : null}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الدفع" successText="تم حفظ الدفع بنجاح." />
      <SubmitButton type="submit" variant="primary" disabled={mutation.isPending || disabled} idleText="حفظ الدفع" pendingText="جارٍ الحفظ..." />
    </form>
  );
}
