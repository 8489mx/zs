import { z } from 'zod';

const accentColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'اكتب لونًا صحيحًا مثل #2563eb');

export const settingsFormSchema = z.object({
  storeName: z.string().min(2, 'اسم النشاط / المتجر مطلوب'),
  brandName: z.string().optional(),
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
  manufacturingModuleEnabled: z.boolean().default(false),
  clothingModuleEnabled: z.boolean().default(false),
  defaultProductKind: z.enum(['standard', 'fashion']).default('standard'),
  defaultPosMode: z.enum(['scanner', 'touch']).default('scanner'),
  allowNegativeStockSales: z.boolean().default(false),
  allowZeroPurchaseCost: z.boolean().default(false),
  requireCashierShiftForSales: z.boolean().default(true),
  posKitchenPrinterEnabled: z.boolean().default(false),
  posKitchenPrinterAuto: z.boolean().default(false),
  posKitchenPrinterMode: z.enum(['detailed', 'mini']).optional().default('detailed'),
  posElectronCashierPrinter: z.string().optional(),
  posElectronKitchenPrinter: z.string().optional(),
  weightedBarcodeEnabled: z.boolean().default(false),
  weightedBarcodePrefix: z.string().regex(/^\d{1,4}$/, 'اكتب بادئة أرقام فقط مثل 21').default('21'),
  weightedBarcodeProductCodeLength: z.coerce.number().int().min(3).max(8).default(5),
  weightedBarcodeWeightDigits: z.coerce.number().int().min(3).max(8).default(5),
  weightedBarcodeWeightDecimals: z.coerce.number().int().min(0).max(3).default(3),
  printShowLogo: z.boolean().default(true),
  printShowDocumentType: z.boolean().default(true),
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
  printNumberFormat: z.enum(['arabic', 'english']).default('arabic'),
  uiLanguage: z.enum(['ar', 'en']).default('ar'),
  currency: z.string().trim().min(2).default('EGP'),
  timezone: z.string().trim().min(2).default('Africa/Cairo'),
  dateFormat: z.enum(['yyyy-MM-dd', 'dd/MM/yyyy']).default('yyyy-MM-dd'),
  timeFormat: z.enum(['24h', '12h']).default('24h'),
  whatsappLinkMode: z.enum(['wa_me', 'web', 'app']).default('wa_me'),
  defaultBranchIssueMode: z.enum(['final_issue', 'transfer_to_branch_stock']).default('final_issue'),
});

export const branchFormSchema = z.object({
  name: z.string().min(2, 'اسم الفرع مطلوب'),
  code: z.string().optional(),
  defaultStockLocationId: z.string().optional(),
  salesStockMode: z.enum(['single_location', 'all_operational_locations']).default('single_location'),
  allowExternalSalesStock: z.boolean().default(false),
});

export const locationFormSchema = z.object({
  name: z.string().min(2, 'اسم المخزن مطلوب'),
  code: z.string().optional(),
  branchId: z.string().optional(),
  locationType: z.enum(['internal_warehouse', 'branch_stock']).default('internal_warehouse'),
});

export type SettingsFormInput = z.input<typeof settingsFormSchema>;
export type SettingsFormOutput = z.output<typeof settingsFormSchema>;
export type BranchFormInput = z.input<typeof branchFormSchema>;
export type BranchFormOutput = z.output<typeof branchFormSchema>;
export type LocationFormInput = z.input<typeof locationFormSchema>;
export type LocationFormOutput = z.output<typeof locationFormSchema>;
