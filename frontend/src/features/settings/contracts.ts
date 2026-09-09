import type { AppSettings } from '@/types/domain';
import type { BranchFormOutput, LocationFormOutput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';

function cleanText(value: unknown, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function normalizeMoney(value: number) {
  return Number(Number(value || 0).toFixed(2));
}

export function buildSettingsUpdatePayload(
  currentSettings: AppSettings | undefined,
  values: SettingsFormOutput | Record<string, any>
) {
  const current = currentSettings as Record<string, any> | undefined;

  // Preserve core branding and store identity safely
  const storeName = values.storeName !== undefined && cleanText(values.storeName)
    ? cleanText(values.storeName)
    : cleanText(current?.storeName, 'Z Systems');

  const brandName = values.brandName !== undefined && cleanText(values.brandName)
    ? cleanText(values.brandName)
    : cleanText(current?.brandName, current?.storeName || 'Z Systems');

  const phone = values.phone !== undefined ? cleanText(values.phone) : cleanText(current?.phone);
  const address = values.address !== undefined ? cleanText(values.address) : cleanText(current?.address);
  const logoData = values.logoData !== undefined ? cleanText(values.logoData) : cleanText(current?.logoData);
  const currentBranchId = values.currentBranchId !== undefined && cleanText(values.currentBranchId)
    ? cleanText(values.currentBranchId)
    : cleanText(current?.currentBranchId);
  const currentLocationId = values.currentLocationId !== undefined && cleanText(values.currentLocationId)
    ? cleanText(values.currentLocationId)
    : cleanText(current?.currentLocationId);

  const lowStockThreshold = values.lowStockThreshold !== undefined
    ? Math.max(0, Number(values.lowStockThreshold || 0))
    : Math.max(0, Number(current?.lowStockThreshold || 0));

  const invoiceFooter = values.invoiceFooter !== undefined ? cleanText(values.invoiceFooter) : cleanText(current?.invoiceFooter);
  const invoiceQR = values.invoiceQR !== undefined ? cleanText(values.invoiceQR) : cleanText(current?.invoiceQR);
  const taxNumber = values.taxNumber !== undefined ? cleanText(values.taxNumber) : cleanText(current?.taxNumber);
  const taxRate = values.taxRate !== undefined
    ? normalizeMoney(Number(values.taxRate || 0))
    : normalizeMoney(Number(current?.taxRate || 0));
  const taxMode = values.taxMode !== undefined
    ? (values.taxMode === 'inclusive' ? 'inclusive' : 'exclusive')
    : (current?.taxMode === 'inclusive' ? 'inclusive' : 'exclusive');
  const paperSize = values.paperSize !== undefined
    ? (values.paperSize === 'receipt' ? 'receipt' : 'a4')
    : (current?.paperSize === 'a4' ? 'a4' : 'receipt');

  const managerPin = values.managerPin !== undefined ? cleanText(values.managerPin) : cleanText(current?.managerPin);
  const autoBackup = values.autoBackup !== undefined
    ? (values.autoBackup === 'off' ? 'off' : 'on')
    : (current?.autoBackup === 'off' ? 'off' : 'on');
  const accentColor = values.accentColor !== undefined && cleanText(values.accentColor)
    ? cleanText(values.accentColor)
    : cleanText(current?.accentColor, '#170c5c');

  // Module configurations
  const clothingModuleEnabled = values.clothingModuleEnabled !== undefined
    ? values.clothingModuleEnabled === true
    : current?.clothingModuleEnabled === true;

  const defaultProductKind = values.defaultProductKind !== undefined
    ? (clothingModuleEnabled && values.defaultProductKind === 'fashion' ? 'fashion' : 'standard')
    : (current?.defaultProductKind || 'standard');

  const defaultPosMode = values.defaultPosMode !== undefined
    ? (values.defaultPosMode === 'touch' ? 'touch' : 'scanner')
    : (current?.defaultPosMode || 'scanner');

  const deliveryFeeMode = values.deliveryFeeMode !== undefined
    ? (values.deliveryFeeMode === 'store_fleet' ? 'store_fleet' : 'freelance_courier')
    : (current?.deliveryFeeMode || 'freelance_courier');

  const storeFleetCommissionRate = values.storeFleetCommissionRate !== undefined
    ? Math.max(0, Math.min(100, Number(values.storeFleetCommissionRate || 0)))
    : Math.max(0, Math.min(100, Number(current?.storeFleetCommissionRate || 0)));

  const defaultDeliveryFee = values.defaultDeliveryFee !== undefined
    ? Math.max(0, normalizeMoney(Number(values.defaultDeliveryFee || 0)))
    : Math.max(0, normalizeMoney(Number(current?.defaultDeliveryFee || 0)));

  const settings = {
    ...(currentSettings || {}),
    storeName,
    brandName,
    phone,
    address,
    lowStockThreshold,
    invoiceFooter,
    invoiceQR,
    taxNumber,
    taxRate,
    taxMode,
    paperSize,
    ...(managerPin ? { managerPin } : {}),
    autoBackup,
    accentColor,
    logoData,
    currentBranchId,
    currentLocationId,
    clothingModuleEnabled,
    enableMobileStoreFeatures: values.enableMobileStoreFeatures !== undefined
      ? values.enableMobileStoreFeatures === true
      : current?.enableMobileStoreFeatures === true,
    enablePharmacyModule: values.enablePharmacyModule !== undefined
      ? values.enablePharmacyModule === true
      : current?.enablePharmacyModule === true,
    servicesModuleEnabled: values.servicesModuleEnabled !== undefined
      ? values.servicesModuleEnabled === true
      : current?.servicesModuleEnabled === true,
    maintenanceProfile: values.maintenanceProfile || current?.maintenanceProfile || 'mobile',
    enableEnterpriseFeatures: values.enableEnterpriseFeatures !== undefined
      ? values.enableEnterpriseFeatures === true
      : current?.enableEnterpriseFeatures === true,
    technicianCommissionRate: values.technicianCommissionRate !== undefined
      ? Number(values.technicianCommissionRate ?? 30)
      : Number(current?.technicianCommissionRate ?? 30),
    defaultProductKind,
    defaultPosMode,
    deliveryFeeMode,
    storeFleetCommissionRate,
    defaultDeliveryFee,
    manufacturingModuleEnabled: values.manufacturingModuleEnabled !== undefined
      ? values.manufacturingModuleEnabled === true
      : current?.manufacturingModuleEnabled === true,
    importModuleEnabled: values.importModuleEnabled !== undefined
      ? values.importModuleEnabled === true
      : current?.importModuleEnabled === true,
    comboModuleEnabled: values.comboModuleEnabled !== undefined
      ? values.comboModuleEnabled === true
      : current?.comboModuleEnabled === true,
    restaurantModuleEnabled: values.restaurantModuleEnabled !== undefined
      ? values.restaurantModuleEnabled === true
      : current?.restaurantModuleEnabled === true,
    posShowCartMeta: values.posShowCartMeta !== undefined
      ? values.posShowCartMeta === true
      : current?.posShowCartMeta === true,
    printDeliveryRepOnReceipt: values.printDeliveryRepOnReceipt !== undefined
      ? values.printDeliveryRepOnReceipt === true
      : current?.printDeliveryRepOnReceipt === true,
    posModuleEnabled: values.posModuleEnabled !== undefined
      ? values.posModuleEnabled !== false
      : current?.posModuleEnabled !== false,
    purchasesModuleEnabled: values.purchasesModuleEnabled !== undefined
      ? values.purchasesModuleEnabled !== false
      : current?.purchasesModuleEnabled !== false,
    inventoryModuleEnabled: values.inventoryModuleEnabled !== undefined
      ? values.inventoryModuleEnabled !== false
      : current?.inventoryModuleEnabled !== false,
    hrModuleEnabled: values.hrModuleEnabled !== undefined
      ? values.hrModuleEnabled === true
      : current?.hrModuleEnabled === true,
    businessIndustry: values.businessIndustry || current?.businessIndustry || 'general',
    onboardingCompleted: values.onboardingCompleted !== undefined
      ? Boolean(values.onboardingCompleted)
      : (current?.onboardingCompleted ?? true),
    storefrontModuleEnabled: values.storefrontModuleEnabled !== undefined
      ? values.storefrontModuleEnabled === true
      : current?.storefrontModuleEnabled === true,
    installmentsModuleEnabled: values.installmentsModuleEnabled !== undefined
      ? values.installmentsModuleEnabled === true
      : current?.installmentsModuleEnabled === true,
    fixedAssetsModuleEnabled: values.fixedAssetsModuleEnabled !== undefined
      ? values.fixedAssetsModuleEnabled === true
      : current?.fixedAssetsModuleEnabled === true,
    taxDeclarationModuleEnabled: values.taxDeclarationModuleEnabled !== undefined
      ? values.taxDeclarationModuleEnabled === true
      : current?.taxDeclarationModuleEnabled === true,
    deliveryFleetModuleEnabled: values.deliveryFleetModuleEnabled !== undefined
      ? values.deliveryFleetModuleEnabled === true
      : current?.deliveryFleetModuleEnabled === true,
    loyaltyEnabled: values.loyaltyEnabled !== undefined
      ? values.loyaltyEnabled !== false
      : current?.loyaltyEnabled !== false,
    loyaltyPointsPer100Egp: values.loyaltyPointsPer100Egp !== undefined
      ? Math.max(0, Number(values.loyaltyPointsPer100Egp ?? 10))
      : Math.max(0, Number(current?.loyaltyPointsPer100Egp ?? 10)),
    loyaltyPointRedeemValue: values.loyaltyPointRedeemValue !== undefined
      ? Math.max(0.01, Number(values.loyaltyPointRedeemValue ?? 0.1))
      : Math.max(0.01, Number(current?.loyaltyPointRedeemValue ?? 0.1)),
    loyaltyMinRedeemPoints: values.loyaltyMinRedeemPoints !== undefined
      ? Math.max(0, Number(values.loyaltyMinRedeemPoints ?? 50))
      : Math.max(0, Number(current?.loyaltyMinRedeemPoints ?? 50)),
    loyaltyMaxDiscountPercentage: values.loyaltyMaxDiscountPercentage !== undefined
      ? Math.max(1, Math.min(100, Number(values.loyaltyMaxDiscountPercentage ?? 50)))
      : Math.max(1, Math.min(100, Number(current?.loyaltyMaxDiscountPercentage ?? 50))),
    printShowLoyaltyPoints: values.printShowLoyaltyPoints !== undefined
      ? values.printShowLoyaltyPoints !== false
      : current?.printShowLoyaltyPoints !== false,
    allowNegativeStockSales: values.allowNegativeStockSales !== undefined
      ? values.allowNegativeStockSales === true
      : current?.allowNegativeStockSales === true,
    allowSellingBelowStock: values.allowNegativeStockSales !== undefined
      ? values.allowNegativeStockSales === true
      : current?.allowNegativeStockSales === true,
    allowZeroPurchaseCost: values.allowZeroPurchaseCost !== undefined
      ? values.allowZeroPurchaseCost === true
      : current?.allowZeroPurchaseCost === true,
    requireCashierShiftForSales: values.requireCashierShiftForSales !== undefined
      ? values.requireCashierShiftForSales !== false
      : current?.requireCashierShiftForSales !== false,
    posMaxDiscountThresholdEnabled: values.posMaxDiscountThresholdEnabled !== undefined
      ? values.posMaxDiscountThresholdEnabled === true
      : current?.posMaxDiscountThresholdEnabled === true,
    posMaxDiscountThresholdType: values.posMaxDiscountThresholdType !== undefined
      ? (values.posMaxDiscountThresholdType === 'fixed' ? 'fixed' : 'percentage')
      : (current?.posMaxDiscountThresholdType === 'fixed' ? 'fixed' : 'percentage'),
    posMaxDiscountThresholdValue: values.posMaxDiscountThresholdValue !== undefined
      ? Math.max(0, Number(values.posMaxDiscountThresholdValue ?? 15))
      : Math.max(0, Number(current?.posMaxDiscountThresholdValue ?? 15)),
    posKitchenPrinterEnabled: values.posKitchenPrinterEnabled !== undefined
      ? values.posKitchenPrinterEnabled === true
      : current?.posKitchenPrinterEnabled === true,
    posKitchenPrinterAuto: values.posKitchenPrinterAuto !== undefined
      ? values.posKitchenPrinterAuto === true
      : current?.posKitchenPrinterAuto === true,
    posKitchenPrinterMode: values.posKitchenPrinterMode !== undefined
      ? (values.posKitchenPrinterMode === 'mini' ? 'mini' : 'detailed')
      : (current?.posKitchenPrinterMode === 'mini' ? 'mini' : 'detailed'),
    posElectronCashierPrinter: values.posElectronCashierPrinter !== undefined
      ? cleanText(values.posElectronCashierPrinter)
      : cleanText(current?.posElectronCashierPrinter),
    posElectronKitchenPrinter: values.posElectronKitchenPrinter !== undefined
      ? cleanText(values.posElectronKitchenPrinter)
      : cleanText(current?.posElectronKitchenPrinter),
    weightedBarcodeEnabled: values.weightedBarcodeEnabled !== undefined
      ? values.weightedBarcodeEnabled === true
      : current?.weightedBarcodeEnabled === true,
    weightedBarcodePrefix: values.weightedBarcodePrefix !== undefined
      ? (cleanText(values.weightedBarcodePrefix, '21').replace(/\D/g, '') || '21')
      : (cleanText(current?.weightedBarcodePrefix, '21').replace(/\D/g, '') || '21'),
    weightedBarcodeProductCodeLength: values.weightedBarcodeProductCodeLength !== undefined
      ? Math.min(8, Math.max(3, Math.floor(Number(values.weightedBarcodeProductCodeLength || 5))))
      : Math.min(8, Math.max(3, Math.floor(Number(current?.weightedBarcodeProductCodeLength || 5)))),
    weightedBarcodeWeightDigits: values.weightedBarcodeWeightDigits !== undefined
      ? Math.min(8, Math.max(3, Math.floor(Number(values.weightedBarcodeWeightDigits || 5))))
      : Math.min(8, Math.max(3, Math.floor(Number(current?.weightedBarcodeWeightDigits || 5)))),
    weightedBarcodeWeightDecimals: values.weightedBarcodeWeightDecimals !== undefined
      ? Math.min(3, Math.max(0, Math.floor(Number(values.weightedBarcodeWeightDecimals || 3))))
      : Math.min(3, Math.max(0, Math.floor(Number(current?.weightedBarcodeWeightDecimals || 3)))),
    printShowLogo: values.printShowLogo !== undefined ? values.printShowLogo !== false : current?.printShowLogo !== false,
    printShowDocumentType: values.printShowDocumentType !== undefined ? values.printShowDocumentType !== false : current?.printShowDocumentType !== false,
    printShowDocumentNumber: values.printShowDocumentNumber !== undefined ? values.printShowDocumentNumber !== false : current?.printShowDocumentNumber !== false,
    printShowOrderType: values.printShowOrderType !== undefined ? values.printShowOrderType !== false : current?.printShowOrderType !== false,
    printShowPhone: values.printShowPhone !== undefined ? values.printShowPhone !== false : current?.printShowPhone !== false,
    printShowAddress: values.printShowAddress !== undefined ? values.printShowAddress !== false : current?.printShowAddress !== false,
    printShowTaxNumber: values.printShowTaxNumber !== undefined ? values.printShowTaxNumber === true : current?.printShowTaxNumber === true,
    printShowCustomer: values.printShowCustomer !== undefined ? values.printShowCustomer !== false : current?.printShowCustomer !== false,
    printShowDeliveryCustomerDetails: values.printShowDeliveryCustomerDetails !== undefined ? values.printShowDeliveryCustomerDetails !== false : current?.printShowDeliveryCustomerDetails !== false,
    printShowCashier: values.printShowCashier !== undefined ? values.printShowCashier !== false : current?.printShowCashier !== false,
    printShowBranch: values.printShowBranch !== undefined ? values.printShowBranch !== false : current?.printShowBranch !== false,
    printShowLocation: values.printShowLocation !== undefined ? values.printShowLocation !== false : current?.printShowLocation !== false,
    printShowTax: values.printShowTax !== undefined ? values.printShowTax !== false : current?.printShowTax !== false,
    printShowPaymentMethod: values.printShowPaymentMethod !== undefined ? values.printShowPaymentMethod !== false : current?.printShowPaymentMethod !== false,
    printShowItemSummary: values.printShowItemSummary !== undefined ? values.printShowItemSummary !== false : current?.printShowItemSummary !== false,
    printShowItemCount: values.printShowItemCount !== undefined ? values.printShowItemCount !== false : current?.printShowItemCount !== false,
    printShowPiecesCount: values.printShowPiecesCount !== undefined ? values.printShowPiecesCount !== false : current?.printShowPiecesCount !== false,
    printShowPaymentBreakdown: values.printShowPaymentBreakdown !== undefined ? values.printShowPaymentBreakdown !== false : current?.printShowPaymentBreakdown !== false,
    printShowDate: values.printShowDate !== undefined ? values.printShowDate !== false : current?.printShowDate !== false,
    printShowHijriDate: values.printShowHijriDate !== undefined ? Boolean(values.printShowHijriDate) : Boolean(current?.printShowHijriDate),
    printShowItemOffers: values.printShowItemOffers !== undefined ? values.printShowItemOffers !== false : current?.printShowItemOffers !== false,
    printShowDiscountBreakdown: values.printShowDiscountBreakdown !== undefined ? values.printShowDiscountBreakdown !== false : current?.printShowDiscountBreakdown !== false,
    printShowSavingsBanner: values.printShowSavingsBanner !== undefined ? values.printShowSavingsBanner !== false : current?.printShowSavingsBanner !== false,
    printShowInvoiceBarcode: values.printShowInvoiceBarcode !== undefined ? values.printShowInvoiceBarcode !== false : current?.printShowInvoiceBarcode !== false,
    printShowFooter: values.printShowFooter !== undefined ? values.printShowFooter !== false : current?.printShowFooter !== false,
    printCompactReceipt: values.printCompactReceipt !== undefined ? values.printCompactReceipt !== false : current?.printCompactReceipt !== false,
    posReceiptTheme: values.posReceiptTheme || current?.posReceiptTheme || 'classic',
    printNumberFormat: values.printNumberFormat !== undefined
      ? (values.printNumberFormat === 'english' ? 'english' : 'arabic')
      : (current?.printNumberFormat === 'english' ? 'english' : 'arabic'),
    printDualReceiptForOnlineDelivery: values.printDualReceiptForOnlineDelivery !== undefined
      ? Boolean(values.printDualReceiptForOnlineDelivery)
      : Boolean(current?.printDualReceiptForOnlineDelivery),
    uiLanguage: values.uiLanguage !== undefined
      ? (values.uiLanguage === 'en' ? 'en' : 'ar')
      : (current?.uiLanguage === 'en' ? 'en' : 'ar'),
    currency: values.currency !== undefined
      ? cleanText(values.currency, 'EGP').toUpperCase()
      : cleanText(current?.currency, 'EGP').toUpperCase(),
    timezone: values.timezone !== undefined
      ? cleanText(values.timezone, 'Africa/Cairo')
      : cleanText(current?.timezone, 'Africa/Cairo'),
    dateFormat: values.dateFormat !== undefined
      ? (values.dateFormat === 'yyyy-MM-dd' ? 'yyyy-MM-dd' : 'dd/MM/yyyy')
      : (current?.dateFormat === 'yyyy-MM-dd' ? 'yyyy-MM-dd' : 'dd/MM/yyyy'),
    timeFormat: values.timeFormat !== undefined
      ? (values.timeFormat === '24h' ? '24h' : '12h')
      : (current?.timeFormat === '24h' ? '24h' : '12h'),
    whatsappLinkMode: values.whatsappLinkMode !== undefined
      ? (values.whatsappLinkMode === 'web' ? 'web' : values.whatsappLinkMode === 'app' ? 'app' : 'wa_me')
      : (current?.whatsappLinkMode || 'wa_me'),
    invoiceNumberingScheme: values.invoiceNumberingScheme !== undefined
      ? (values.invoiceNumberingScheme === 'sequential' ? 'sequential' : 'daily')
      : (current?.invoiceNumberingScheme === 'sequential' ? 'sequential' : 'daily'),
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
  const branchId = cleanText(values.branchId);
  const payload: { name: string; code: string; locationType: string; branchId?: number } = {
    name: cleanText(values.name),
    code: cleanText(values.code),
    locationType: values.locationType || 'internal_warehouse',
  };
  if (branchId && branchId !== '0' && !Number.isNaN(Number(branchId))) {
    payload.branchId = Number(branchId);
  }
  return payload;
}
