import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(2, 'اسم الصنف مطلوب'),
  barcode: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  retailPrice: z.coerce.number().min(0),
  wholesalePrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  notes: z.string().optional()
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;
