import { z } from 'zod';

export const purchaseHeaderSchema = z.object({
  supplierId: z.string().trim().min(1, 'اختر المورد'),
  paymentType: z.enum(['cash', 'credit']),
  discount: z.coerce.number().min(0, 'الخصم لا يكون سالبًا').default(0),
  branchId: z.string().trim().optional().default(''),
  locationId: z.string().trim().optional().default(''),
  note: z.string().trim().optional().default('')
});

export const purchaseLineSchema = z.object({
  productId: z.string().trim().min(1, 'اختر الصنف'),
  qty: z.coerce.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  cost: z.coerce.number().min(0, 'التكلفة يجب أن تكون صفرًا أو أكبر')
});

export type PurchaseHeaderInput = z.input<typeof purchaseHeaderSchema>;
export type PurchaseHeaderOutput = z.output<typeof purchaseHeaderSchema>;
export type PurchaseLineInput = z.input<typeof purchaseLineSchema>;
export type PurchaseLineOutput = z.output<typeof purchaseLineSchema>;
