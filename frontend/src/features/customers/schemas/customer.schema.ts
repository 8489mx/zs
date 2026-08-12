import { z } from 'zod';

export const customerFormSchema = z.object({
  name: z.string().min(2, 'اسم العميل مطلوب'),
  phone: z.string().optional(),
  address: z.string().optional(),
  balance: z.coerce.number().min(0),
  type: z.enum(['cash', 'vip']),
  creditLimit: z.coerce.number().min(0),
  metadata: z.record(z.string(), z.any()).optional()
});

export type CustomerFormInput = z.input<typeof customerFormSchema>;
export type CustomerFormOutput = z.output<typeof customerFormSchema>;
