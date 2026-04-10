import { z } from 'zod';

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'اختر الصنف'),
  actionType: z.enum(['adjust', 'add', 'deduct']),
  qty: z.coerce.number().min(0, 'الكمية يجب أن تكون صفرًا أو أكبر'),
  reason: z.string().trim().min(1, 'حدد سبب الحركة'),
  note: z.string().trim().optional().default(''),
  managerPin: z.string().trim().min(1, 'أدخل كود المدير')
});

export const damagedStockSchema = z.object({
  productId: z.string().trim().min(1, 'اختر الصنف'),
  qty: z.coerce.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  reason: z.string().trim().min(1, 'حدد السبب'),
  note: z.string().trim().optional().default(''),
  branchId: z.string().trim().optional().default(''),
  locationId: z.string().trim().optional().default(''),
  managerPin: z.string().trim().min(1, 'أدخل كود المدير')
});

export type InventoryAdjustmentInput = z.input<typeof inventoryAdjustmentSchema>;
export type InventoryAdjustmentOutput = z.output<typeof inventoryAdjustmentSchema>;
export type DamagedStockInput = z.input<typeof damagedStockSchema>;
export type DamagedStockOutput = z.output<typeof damagedStockSchema>;
