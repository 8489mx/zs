import { z } from 'zod';

const accentColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'اكتب لونًا صحيحًا مثل #2563eb');

export const settingsFormSchema = z.object({
  storeName: z.string().min(2, 'اسم المحل مطلوب'),
  brandName: z.string().min(2, 'الاسم التجاري مطلوب').default('Z Systems'),
  phone: z.string().optional(),
  address: z.string().optional(),
  lowStockThreshold: z.coerce.number().min(0, 'الحد الأدنى يجب أن يكون موجبًا أو صفرًا'),
  invoiceFooter: z.string().optional(),
  invoiceQR: z.string().optional(),
  taxNumber: z.string().optional(),
  taxRate: z.coerce.number().min(0),
  taxMode: z.enum(['exclusive', 'inclusive']),
  paperSize: z.enum(['a4', 'receipt']),
  managerPin: z.union([
    z.literal(''),
    z.string().regex(/^\d{4,10}$/, 'الرقم السري يجب أن يكون من 4 إلى 10 أرقام')
  ]),
  autoBackup: z.enum(['on', 'off']),
  accentColor: accentColorSchema,
  logoData: z.string().optional(),
  currentBranchId: z.string().optional(),
  currentLocationId: z.string().optional(),
  clothingModuleEnabled: z.boolean().default(false),
  defaultProductKind: z.enum(['standard', 'fashion']).default('standard'),
  printShowLogo: z.boolean().default(true),
  printShowPhone: z.boolean().default(true),
  printShowAddress: z.boolean().default(true),
  printShowTaxNumber: z.boolean().default(false),
  printShowCustomer: z.boolean().default(true),
  printShowCashier: z.boolean().default(true),
  printShowBranch: z.boolean().default(true),
  printShowLocation: z.boolean().default(true),
  printShowTax: z.boolean().default(true),
  printShowPaymentMethod: z.boolean().default(true),
  printShowItemSummary: z.boolean().default(true),
  printShowPaymentBreakdown: z.boolean().default(true),
  printShowFooter: z.boolean().default(true),
  printCompactReceipt: z.boolean().default(true),
});

export const branchFormSchema = z.object({
  name: z.string().min(2, 'اسم الفرع مطلوب'),
  code: z.string().optional()
});

export const locationFormSchema = z.object({
  name: z.string().min(2, 'اسم المخزن مطلوب'),
  code: z.string().optional(),
  branchId: z.string().optional()
});

export type SettingsFormInput = z.input<typeof settingsFormSchema>;
export type SettingsFormOutput = z.output<typeof settingsFormSchema>;
export type BranchFormInput = z.input<typeof branchFormSchema>;
export type BranchFormOutput = z.output<typeof branchFormSchema>;
export type LocationFormInput = z.input<typeof locationFormSchema>;
export type LocationFormOutput = z.output<typeof locationFormSchema>;
