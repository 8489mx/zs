import type { AppSettings } from '@/types/domain';
import type { BranchFormOutput, LocationFormOutput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';

function cleanText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function buildSettingsUpdatePayload(currentSettings: AppSettings | undefined, values: SettingsFormOutput) {
  const managerPin = cleanText(values.managerPin);
  const clothingModuleEnabled = values.clothingModuleEnabled === true;
  const defaultProductKind = clothingModuleEnabled && values.defaultProductKind === 'fashion' ? 'fashion' : 'standard';
  const defaultPosMode = values.defaultPosMode === 'touch' ? 'touch' : 'scanner';

  const settings = {
    ...(currentSettings || {}),
    storeName: cleanText(values.storeName, 'Z Systems'),
    brandName: cleanText(values.brandName, 'Z Systems'),
    phone: cleanText(values.phone),
    address: cleanText(values.address),
    lowStockThreshold: Math.max(0, Number(values.lowStockThreshold || 0)),
    invoiceFooter: cleanText(values.invoiceFooter),
    invoiceQR: cleanText(values.invoiceQR),
    taxNumber: cleanText(values.taxNumber),
    taxRate: normalizeMoney(Number(values.taxRate || 0)),
    taxMode: values.taxMode === 'inclusive' ? 'inclusive' : 'exclusive',
    paperSize: values.paperSize === 'receipt' ? 'receipt' : 'a4',
    ...(managerPin ? { managerPin } : {}),
    autoBackup: values.autoBackup === 'off' ? 'off' : 'on',
    accentColor: cleanText(values.accentColor, '#2563eb'),
    logoData: cleanText(values.logoData),
    currentBranchId: cleanText(values.currentBranchId),
    currentLocationId: cleanText(values.currentLocationId),
    clothingModuleEnabled,
    defaultProductKind,
    defaultPosMode,
    manufacturingModuleEnabled: values.manufacturingModuleEnabled === true,
    allowNegativeStockSales: values.allowNegativeStockSales === true,
    allowSellingBelowStock: values.allowNegativeStockSales === true,
    allowZeroPurchaseCost: values.allowZeroPurchaseCost === true,
    requireCashierShiftForSales: values.requireCashierShiftForSales !== false,
    posKitchenPrinterEnabled: values.posKitchenPrinterEnabled === true,
    posKitchenPrinterAuto: values.posKitchenPrinterAuto === true,
    weightedBarcodeEnabled: values.weightedBarcodeEnabled === true,
    weightedBarcodePrefix: cleanText(values.weightedBarcodePrefix, '21').replace(/\D/g, '') || '21',
    weightedBarcodeProductCodeLength: Math.min(8, Math.max(3, Math.floor(Number(values.weightedBarcodeProductCodeLength || 5)))),
    weightedBarcodeWeightDigits: Math.min(8, Math.max(3, Math.floor(Number(values.weightedBarcodeWeightDigits || 5)))),
    weightedBarcodeWeightDecimals: Math.min(3, Math.max(0, Math.floor(Number(values.weightedBarcodeWeightDecimals || 3)))),
    printShowLogo: values.printShowLogo !== false,
    printShowPhone: values.printShowPhone !== false,
    printShowAddress: values.printShowAddress !== false,
    printShowTaxNumber: values.printShowTaxNumber === true,
    printShowCustomer: values.printShowCustomer !== false,
    printShowCashier: values.printShowCashier !== false,
    printShowBranch: values.printShowBranch !== false,
    printShowLocation: values.printShowLocation !== false,
    printShowTax: values.printShowTax !== false,
    printShowPaymentMethod: values.printShowPaymentMethod !== false,
    printShowItemSummary: values.printShowItemSummary !== false,
    printShowPaymentBreakdown: values.printShowPaymentBreakdown !== false,
    printShowFooter: values.printShowFooter !== false,
    printCompactReceipt: values.printCompactReceipt !== false,
    printNumberFormat: values.printNumberFormat === 'english' ? 'english' : 'arabic',
    uiLanguage: values.uiLanguage === 'en' ? 'en' : 'ar',
    currency: cleanText(values.currency, 'EGP').toUpperCase(),
    timezone: cleanText(values.timezone, 'Africa/Cairo'),
    dateFormat: values.dateFormat === 'dd/MM/yyyy' ? 'dd/MM/yyyy' : 'yyyy-MM-dd',
    timeFormat: values.timeFormat === '12h' ? '12h' : '24h',
    whatsappLinkMode: values.whatsappLinkMode === 'web' ? 'web' : values.whatsappLinkMode === 'app' ? 'app' : 'wa_me',
  };

  return { settings };
}

export function buildBranchPayload(values: BranchFormOutput) {
  return {
    name: cleanText(values.name),
    code: cleanText(values.code),
    defaultStockLocationId: cleanText(values.defaultStockLocationId) || null,
    salesStockMode: values.salesStockMode || 'single_location',
    allowExternalSalesStock: values.allowExternalSalesStock === true
  };
}

export function buildLocationPayload(values: LocationFormOutput) {
  return {
    name: cleanText(values.name),
    code: cleanText(values.code),
    branchId: cleanText(values.branchId) || '',
    locationType: values.locationType || 'internal_warehouse'
  };
}
