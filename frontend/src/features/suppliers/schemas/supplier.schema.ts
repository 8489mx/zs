import { z } from 'zod';

export const supplierFormSchema = z.object({
  name: z.string().min(2, 'اسم المورد مطلوب'),
  phone: z.string().optional(),
  address: z.string().optional(),
  balance: z.coerce.number().min(0),
  notes: z.string().optional()
});

export type SupplierFormInput = z.input<typeof supplierFormSchema>;
export type SupplierFormOutput = z.output<typeof supplierFormSchema>;
