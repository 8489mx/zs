import { z } from 'zod';

export const productFormSchema = z.object({
  name: z.string().min(2, 'اسم الصنف مطلوب'),
  barcode: z.string().optional(),
  itemType: z.enum(['product', 'raw_material']).default('product'),
  itemKind: z.enum(['standard', 'fashion']).default('standard'),
  styleCode: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  fashionColors: z.string().optional(),
  fashionSizes: z.string().optional(),
  variantStock: z.coerce.number().min(0).default(0),
  costPrice: z.coerce.number().min(0),
  retailPrice: z.coerce.number().min(0),
  wholesalePrice: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  warehouseId: z.string({ message: 'يجب اختيار المستودع' }).min(1, 'يجب اختيار المستودع'),
  binLocation: z.string().optional(),
  notes: z.string().optional(),
  isCombo: z.boolean().default(false),
  comboComponents: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(0.0001)
  })).optional(),
  taxCodeType: z.string().optional(),
  taxCode: z.string().optional(),
  metadata: z.object({
    oemNumber: z.string().optional(),
    carBrand: z.string().optional(),
    carModel: z.string().optional(),
    carYearFrom: z.string().optional(),
    carYearTo: z.string().optional(),
    origin: z.string().optional(),
    condition: z.string().optional(),
  }).optional()
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;
