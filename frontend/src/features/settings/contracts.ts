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
  };

  return { settings };
}

export function buildBranchPayload(values: BranchFormOutput) {
  return {
    name: cleanText(values.name),
    code: cleanText(values.code)
  };
}

export function buildLocationPayload(values: LocationFormOutput) {
  return {
    name: cleanText(values.name),
    code: cleanText(values.code),
    branchId: cleanText(values.branchId) || ''
  };
}
