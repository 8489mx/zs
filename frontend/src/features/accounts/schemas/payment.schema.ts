import { z } from 'zod';

export const customerPaymentSchema = z.object({
  customerId: z.string().min(1, 'اختر العميل'),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  note: z.string().optional()
});

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'اختر المورد'),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  note: z.string().optional()
});

export type CustomerPaymentInput = z.input<typeof customerPaymentSchema>;
export type CustomerPaymentOutput = z.output<typeof customerPaymentSchema>;
export type SupplierPaymentInput = z.input<typeof supplierPaymentSchema>;
export type SupplierPaymentOutput = z.output<typeof supplierPaymentSchema>;
