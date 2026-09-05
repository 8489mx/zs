import { DialogShell } from '@/shared/components/dialog-shell';
import { SubmitButton } from '@/shared/components/submit-button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsFormSchema, type SettingsFormInput, type SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { BranchForm } from '@/features/settings/components/forms/BranchForm';
import { normalizeText, type SettingsMainFormProps } from '@/features/settings/components/forms/settings-forms.shared';
import { useLocalePreference } from '@/shared/locale/LocaleProvider';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';

import { GeneralSettingsTab } from './tabs/GeneralSettingsTab';
import { SalesInventorySettingsTab } from './tabs/SalesInventorySettingsTab';
import { ModulesSettingsTab } from './tabs/ModulesSettingsTab';
import { SecuritySettingsTab } from './tabs/SecuritySettingsTab';
import { PrintingSettingsTab } from './tabs/PrintingSettingsTab';

export const SETTINGS_FIELD_METADATA: Record<
  string,
  { tab: 'general' | 'sales_inventory' | 'modules' | 'printing' | 'security'; label: string }
> = {
  // General Tab
  storeName: { tab: 'general', label: 'اسم النشاط / المتجر' },
  brandName: { tab: 'general', label: 'الاسم التجاري' },
  phone: { tab: 'general', label: 'رقم الهاتف' },
  address: { tab: 'general', label: 'العنوان' },
  currentBranchId: { tab: 'general', label: 'الفرع الرئيسي' },
  currentLocationId: { tab: 'general', label: 'مكان الاستلام الافتراضي' },
  accentColor: { tab: 'general', label: 'لون الواجهة الرئيسي' },
  logoData: { tab: 'general', label: 'شعار المؤسسة' },
  businessIndustry: { tab: 'general', label: 'طبيعة النشاط التجاري' },
  currency: { tab: 'general', label: 'العملة الافتراضية' },
  timezone: { tab: 'general', label: 'المنطقة الزمنية' },
  dateFormat: { tab: 'general', label: 'تنسيق التاريخ' },
  timeFormat: { tab: 'general', label: 'تنسيق الوقت' },
  uiLanguage: { tab: 'general', label: 'لغة النظام' },
  whatsappLinkMode: { tab: 'general', label: 'طريقة فتح روابط واتساب' },

  // Sales & Inventory Tab
  lowStockThreshold: { tab: 'sales_inventory', label: 'حد المخزون الأدنى' },
  expiryAlertDays: { tab: 'sales_inventory', label: 'تنبيه قرب الصلاحية (أيام)' },
  stagnantProductDays: { tab: 'sales_inventory', label: 'تنبيه ركود الأصناف (أيام)' },
  taxNumber: { tab: 'sales_inventory', label: 'الرقم الضريبي' },
  taxRate: { tab: 'sales_inventory', label: 'نسبة الضريبة' },
  taxMode: { tab: 'sales_inventory', label: 'طريقة احتساب الضريبة' },
  allowNegativeStockSales: { tab: 'sales_inventory', label: 'البيع بالسالب عند نفاد المخزون' },
  allowZeroPurchaseCost: { tab: 'sales_inventory', label: 'السماح بتكلفة شراء صفرية' },
  requireCashierShiftForSales: { tab: 'sales_inventory', label: 'إلزام فتح وردية كاشير' },
  defaultProductKind: { tab: 'sales_inventory', label: 'نوع المنتج الافتراضي' },
  defaultPosMode: { tab: 'sales_inventory', label: 'نمط شاشة البيع السريع' },
  deliveryFeeMode: { tab: 'sales_inventory', label: 'نمط خدمة التوصيل' },
  storeFleetCommissionRate: { tab: 'sales_inventory', label: 'عمولة مناديب المتجر' },
  defaultDeliveryFee: { tab: 'sales_inventory', label: 'رسوم التوصيل الافتراضية' },
  defaultBranchIssueMode: { tab: 'sales_inventory', label: 'طريقة صرف بضاعة الفرع الافتراضية' },
  posMaxDiscountThresholdEnabled: { tab: 'sales_inventory', label: 'تفعيل حد أقصى للخصم' },
  posMaxDiscountThresholdType: { tab: 'sales_inventory', label: 'نوع سقف الخصم' },
  posMaxDiscountThresholdValue: { tab: 'sales_inventory', label: 'قيمة سقف الخصم' },
  weightedBarcodeEnabled: { tab: 'sales_inventory', label: 'تفعيل باركود الميزان' },
  weightedBarcodePrefix: { tab: 'sales_inventory', label: 'بادئة باركود الميزان' },
  weightedBarcodeProductCodeLength: { tab: 'sales_inventory', label: 'طول كود الصنف بالميزان' },
  weightedBarcodeWeightDigits: { tab: 'sales_inventory', label: 'خانات الوزن في باركود الميزان' },
  weightedBarcodeWeightDecimals: { tab: 'sales_inventory', label: 'الخانات العشرية لوزن الميزان' },
  loyaltyEnabled: { tab: 'sales_inventory', label: 'برنامج نقاط مكافآت العملاء' },
  loyaltyPointsPer100Egp: { tab: 'sales_inventory', label: 'معدل اكتساب النقاط لكل 100 ج.م' },
  loyaltyPointRedeemValue: { tab: 'sales_inventory', label: 'قيمة استبدال النقطة (ج.م)' },
  loyaltyMinRedeemPoints: { tab: 'sales_inventory', label: 'الحد الأدنى للنقاط للاستبدال' },
  loyaltyMaxDiscountPercentage: { tab: 'sales_inventory', label: 'أقصى نسبة خصم بالنقاط' },
  printShowLoyaltyPoints: { tab: 'sales_inventory', label: 'إظهار رصيد النقاط في الفاتورة' },

  // Modules Tab
  manufacturingModuleEnabled: { tab: 'modules', label: 'موديول التصنيع والتجميع' },
  importModuleEnabled: { tab: 'modules', label: 'موديول الاستيراد والشحن الدولي' },
  comboModuleEnabled: { tab: 'modules', label: 'موديول باقات وعروض الأصناف' },
  restaurantModuleEnabled: { tab: 'modules', label: 'موديول المطاعم والكافيهات' },
  clothingModuleEnabled: { tab: 'modules', label: 'موديول الملابس والمقاسات والألوان' },
  enableMobileStoreFeatures: { tab: 'modules', label: 'ميزات متجر الموبايل والإلكترونيات' },
  enablePharmacyModule: { tab: 'modules', label: 'موديول الصيدليات وتواريخ الصلاحية' },
  servicesModuleEnabled: { tab: 'modules', label: 'موديول مراكز الصيانة والخدمات' },
  maintenanceProfile: { tab: 'modules', label: 'ملف الصيانة والتشغيل' },
  storefrontModuleEnabled: { tab: 'modules', label: 'المتجر الإلكتروني والطلبات أونلاين' },
  installmentsModuleEnabled: { tab: 'modules', label: 'موديول التقسيط وإدارة الديون' },
  fixedAssetsModuleEnabled: { tab: 'modules', label: 'موديول الأصول الثابتة والإهلاك' },
  taxDeclarationModuleEnabled: { tab: 'modules', label: 'موديول الإقرار الضريبي' },
  deliveryFleetModuleEnabled: { tab: 'modules', label: 'موديول أسطول التوصيل والمناديب' },
  enableEnterpriseFeatures: { tab: 'modules', label: 'الميزات المتقدمة للمؤسسات' },
  technicianCommissionRate: { tab: 'modules', label: 'نسبة عمولة فنيي الصيانة' },

  // Printing Tab
  paperSize: { tab: 'printing', label: 'مقاس الورق' },
  invoiceNumberingScheme: { tab: 'printing', label: 'نمط ترقيم الفواتير' },
  invoiceFooter: { tab: 'printing', label: 'تذييل الفاتورة' },
  invoiceQR: { tab: 'printing', label: 'رمز الاستجابة السريعة (QR)' },
  posReceiptTheme: { tab: 'printing', label: 'تصميم وسِمة الإيصال' },
  printNumberFormat: { tab: 'printing', label: 'لغة كتابة الأرقام' },
  printShowLogo: { tab: 'printing', label: 'طباعة شعار المتجر' },
  printShowDocumentType: { tab: 'printing', label: 'طباعة نوع المستند' },
  printShowDocumentNumber: { tab: 'printing', label: 'طباعة رقم المستند' },
  printShowOrderType: { tab: 'printing', label: 'طباعة نوع الطلب' },
  printShowPhone: { tab: 'printing', label: 'طباعة رقم الهاتف' },
  printShowAddress: { tab: 'printing', label: 'طباعة العنوان' },
  printShowTaxNumber: { tab: 'printing', label: 'طباعة الرقم الضريبي' },
  printShowCustomer: { tab: 'printing', label: 'طباعة بيانات العميل' },
  printShowDeliveryCustomerDetails: { tab: 'printing', label: 'طباعة تفاصيل توصيل العميل' },
  printShowCashier: { tab: 'printing', label: 'طباعة اسم الكاشير' },
  printShowBranch: { tab: 'printing', label: 'طباعة اسم الفرع' },
  printShowLocation: { tab: 'printing', label: 'طباعة مكان الاستلام' },
  printShowTax: { tab: 'printing', label: 'طباعة تفاصيل الضريبة' },
  printShowPaymentMethod: { tab: 'printing', label: 'طباعة طريقة الدفع' },
  printShowPaymentBreakdown: { tab: 'printing', label: 'طباعة تفاصيل الدفعات' },
  printShowItemSummary: { tab: 'printing', label: 'طباعة ملخص الأصناف' },
  printShowItemCount: { tab: 'printing', label: 'طباعة عدد الأصناف' },
  printShowPiecesCount: { tab: 'printing', label: 'طباعة إجمالي القطع' },
  printShowDate: { tab: 'printing', label: 'طباعة التاريخ والوقت' },
  printShowItemOffers: { tab: 'printing', label: 'طباعة عروض الأصناف' },
  printShowDiscountBreakdown: { tab: 'printing', label: 'طباعة تفاصيل الخصومات' },
  printShowSavingsBanner: { tab: 'printing', label: 'طباعة شريط التوفير' },
  printShowInvoiceBarcode: { tab: 'printing', label: 'طباعة باركود الفاتورة' },
  printShowFooter: { tab: 'printing', label: 'طباعة عبارة تذييل الفاتورة' },
  printCompactReceipt: { tab: 'printing', label: 'تنسيق الإيصال المدمج' },
  printDeliveryRepOnReceipt: { tab: 'printing', label: 'طباعة اسم مندوب التوصيل' },
  printDualReceiptForOnlineDelivery: { tab: 'printing', label: 'طباعة نسختين لطلبات الدليفري' },
  posShowCartMeta: { tab: 'printing', label: 'إظهار تفاصيل السلة الإضافية' },
  posKitchenPrinterEnabled: { tab: 'printing', label: 'طابعة المطبخ' },
  posKitchenPrinterAuto: { tab: 'printing', label: 'طباعة المطبخ التلقائية' },
  posKitchenPrinterMode: { tab: 'printing', label: 'تنسيق طباعة المطبخ' },
  posElectronCashierPrinter: { tab: 'printing', label: 'طابعة الكاشير الافتراضية' },
  posElectronKitchenPrinter: { tab: 'printing', label: 'طابعة المطبخ الافتراضية' },

  // Security Tab
  managerPin: { tab: 'security', label: 'الرقم السري للمدير' },
  autoBackup: { tab: 'security', label: 'النسخ الاحتياطي التلقائي' },
};

export function SettingsMainForm({ settings, branches, locations, canManageSettings, setupMode = false, onSetupAdvance, onUpdateBranch }: SettingsMainFormProps) {
  const locale = useLocalePreference();
  const setLocaleLanguage = locale.setLanguage;
  const [activeTab, setActiveTab] = useState<'general' | 'sales_inventory' | 'modules' | 'printing' | 'security'>('general');
  const form = useForm<SettingsFormInput, undefined, SettingsFormOutput>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      storeName: '',
      brandName: 'Z Systems',
      phone: '',
      address: '',
      lowStockThreshold: 5,
      expiryAlertDays: 60,
      stagnantProductDays: 60,
      invoiceFooter: '',
      invoiceQR: '',
      taxNumber: '',
      taxRate: 0,
      taxMode: 'exclusive',
      paperSize: 'receipt',
      managerPin: '',
      autoBackup: 'on',
      accentColor: '#170c5c',
      logoData: '',
      businessIndustry: 'general',
      currentBranchId: '',
      currentLocationId: '',
      manufacturingModuleEnabled: false,
      importModuleEnabled: false,
      comboModuleEnabled: false,
      restaurantModuleEnabled: false,
      posShowCartMeta: false,
      printDeliveryRepOnReceipt: false,
      storefrontModuleEnabled: true,
      installmentsModuleEnabled: true,
      fixedAssetsModuleEnabled: true,
      taxDeclarationModuleEnabled: true,
      deliveryFleetModuleEnabled: true,
      clothingModuleEnabled: false,
      enableMobileStoreFeatures: false,
      enablePharmacyModule: false,
      servicesModuleEnabled: false,
      maintenanceProfile: 'mobile',
      enableEnterpriseFeatures: false,
      technicianCommissionRate: 30,
      defaultProductKind: 'standard',
      defaultPosMode: 'scanner',
      deliveryFeeMode: 'freelance_courier',
      storeFleetCommissionRate: 0,
      defaultDeliveryFee: 0,
      allowNegativeStockSales: false,
      allowZeroPurchaseCost: false,
      requireCashierShiftForSales: true,
      loyaltyEnabled: true,
      loyaltyPointsPer100Egp: 10,
      loyaltyPointRedeemValue: 0.1,
      loyaltyMinRedeemPoints: 50,
      loyaltyMaxDiscountPercentage: 50,
      printShowLoyaltyPoints: true,
      posMaxDiscountThresholdEnabled: false,
      posMaxDiscountThresholdType: 'percentage',
      posMaxDiscountThresholdValue: 15,
      posKitchenPrinterEnabled: false,
      posKitchenPrinterAuto: false,
      posKitchenPrinterMode: 'detailed',
      posElectronCashierPrinter: '',
      posElectronKitchenPrinter: '',
      weightedBarcodeEnabled: false,
      weightedBarcodePrefix: '21',
      weightedBarcodeProductCodeLength: 5,
      weightedBarcodeWeightDigits: 5,
      weightedBarcodeWeightDecimals: 3,
      printShowLogo: true,
      printShowDocumentType: true,
      printShowDocumentNumber: true,
      printShowOrderType: true,
      printShowPhone: true,
      printShowAddress: true,
      printShowTaxNumber: false,
      printShowCustomer: true,
      printShowDeliveryCustomerDetails: true,
      printShowCashier: true,
      printShowBranch: true,
      printShowLocation: true,
      printShowTax: true,
      printShowPaymentMethod: true,
      printShowItemSummary: true,
      printShowItemCount: true,
      printShowPiecesCount: true,
      printShowPaymentBreakdown: true,
      printShowDate: true,
      printShowItemOffers: true,
      printShowDiscountBreakdown: true,
      printShowSavingsBanner: true,
      printShowInvoiceBarcode: true,
      printShowFooter: true,
      printCompactReceipt: true,
      posReceiptTheme: 'classic',
      printNumberFormat: 'arabic',
      printDualReceiptForOnlineDelivery: false,
      uiLanguage: locale.language,
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: '12h',
      whatsappLinkMode: 'wa_me',
      defaultBranchIssueMode: 'final_issue',
      invoiceNumberingScheme: 'daily',
    },
  });

  const mutation = useSettingsUpdateMutation(settings, setupMode ? onSetupAdvance : undefined);
  const [showBranchQuickAdd, setShowBranchQuickAdd] = useState(false);
  const [branchQuery, setBranchQuery] = useState('');
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [branchPrefillName, setBranchPrefillName] = useState('');
  const currentBranchId = form.watch('currentBranchId');

  const clothingModuleEnabled = form.watch('clothingModuleEnabled');
          const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

  const resolvedBranchId = SINGLE_STORE_MODE ? (currentBranchId || settings?.currentBranchId || branches[0]?.id || '') : currentBranchId;
  const visibleLocations = useMemo(() => locations, [locations]);

  const selectedBranch = branches.find((branch) => String(branch.id) === String(resolvedBranchId)) || branches[0] || null;

  // Branch stock settings state
  const [stockMode, setStockMode] = useState<'single_location' | 'all_operational_locations'>('single_location');
  const [defaultStockLocationId, setDefaultStockLocationId] = useState<string>('');
  const [allowExternalSalesStock, setAllowExternalSalesStock] = useState<boolean>(false);
  const [branchStockSaving, setBranchStockSaving] = useState(false);
  const [branchStockSaved, setBranchStockSaved] = useState(false);
  const [branchStockError, setBranchStockError] = useState<string | null>(null);
  const [branchStockDirty, setBranchStockDirty] = useState(false);

  const [systemPrinters, setSystemPrinters] = useState<{name: string, displayName: string}[]>([]);
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronPrinter) {
      (window as any).electronPrinter.getPrinters().then((printers: any[]) => {
        if (printers && Array.isArray(printers)) {
          setSystemPrinters(printers);
        }
      });
    }
  }, []);

  // Re-apply saved printer values after system printers list loads,
  // because the <select> loses its value if the matching <option> wasn't rendered yet during form.reset()
  useEffect(() => {
    if (!systemPrinters.length || !settings) return;
    const savedCashier = String(settings.posElectronCashierPrinter || '').trim();
    const savedKitchen = String(settings.posElectronKitchenPrinter || '').trim();
    if (savedCashier && form.getValues('posElectronCashierPrinter') !== savedCashier) {
      form.setValue('posElectronCashierPrinter', savedCashier, { shouldDirty: false });
    }
    if (savedKitchen && form.getValues('posElectronKitchenPrinter') !== savedKitchen) {
      form.setValue('posElectronKitchenPrinter', savedKitchen, { shouldDirty: false });
    }
  }, [systemPrinters, settings, form]);

  // Sync branch stock state when selected branch changes
  useEffect(() => {
    if (!selectedBranch) return;
    setStockMode((selectedBranch as any).salesStockMode === 'all_operational_locations' ? 'all_operational_locations' : 'single_location');
    setDefaultStockLocationId((selectedBranch as any).defaultStockLocationId || '');
    setAllowExternalSalesStock((selectedBranch as any).allowExternalSalesStock === true);
    setBranchStockDirty(false);
    setBranchStockSaved(false);
    setBranchStockError(null);
  }, [selectedBranch?.id]);

  const filteredBranches = useMemo(
    () => branches.filter((branch) => !normalizeText(branchQuery) || normalizeText(String(branch.name || '')).includes(normalizeText(branchQuery))),
    [branchQuery, branches]
  );
  
  const branchHasExactMatch = useMemo(
    () => branches.some((branch) => normalizeText(String(branch.name || '')) === normalizeText(branchQuery)),
    [branchQuery, branches]
  );
  
  const branchCreateOptionVisible = Boolean(normalizeText(branchQuery) && !branchHasExactMatch);
  
  const branchMenuHasContent = filteredBranches.length > 0 || branchCreateOptionVisible;
  

  const commitSelectedBranch = (branchId: string, branchName?: string) => {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) return;
    form.setValue('currentBranchId', normalizedBranchId, { shouldDirty: true, shouldValidate: true });
    form.clearErrors('currentBranchId');
    form.clearErrors('currentLocationId');
    form.clearErrors('root.serverError');
    if (typeof branchName === 'string' && branchName.trim()) {
      setBranchQuery(branchName.trim());
    }
    setBranchMenuOpen(false);
  };

  useEffect(() => {
    if (!settings) return;
    const clothingEnabled = settings.clothingModuleEnabled === true;
    form.reset({
      storeName: settings.storeName || 'Z Systems',
      brandName: settings.brandName || settings.storeName || 'Z Systems',
      phone: settings.phone || '',
      address: settings.address || '',
      lowStockThreshold: Number(settings.lowStockThreshold || 5),
      invoiceFooter: settings.invoiceFooter || '',
      invoiceQR: settings.invoiceQR || '',
      taxNumber: settings.taxNumber || '',
      taxRate: Number(settings.taxRate || 0),
      taxMode: settings.taxMode === 'inclusive' ? 'inclusive' : 'exclusive',
      paperSize: settings.paperSize === 'receipt' ? 'receipt' : 'a4',
      managerPin: '',
      autoBackup: settings.autoBackup === 'off' ? 'off' : 'on',
      accentColor: settings.accentColor || '#170c5c',
      logoData: settings.logoData || '',
      businessIndustry: ((settings as any)?.businessIndustry as any) || 'general',
      currentBranchId: settings.currentBranchId || '',
      currentLocationId: settings.currentLocationId || '',
      clothingModuleEnabled: clothingEnabled,
      enableMobileStoreFeatures: settings.enableMobileStoreFeatures === true,
      enablePharmacyModule: settings.enablePharmacyModule === true,
      servicesModuleEnabled: settings.servicesModuleEnabled === true,
      maintenanceProfile: settings.maintenanceProfile || 'mobile',
      enableEnterpriseFeatures: settings.enableEnterpriseFeatures === true,
      technicianCommissionRate: Number(settings.technicianCommissionRate ?? 30),
      defaultProductKind: clothingEnabled && settings.defaultProductKind === 'fashion' ? 'fashion' : 'standard',
      defaultPosMode: settings.defaultPosMode === 'touch' ? 'touch' : 'scanner',
      deliveryFeeMode: settings.deliveryFeeMode === 'store_fleet' ? 'store_fleet' : 'freelance_courier',
      storeFleetCommissionRate: Number(settings.storeFleetCommissionRate ?? 0),
      defaultDeliveryFee: Number(settings.defaultDeliveryFee ?? 0),
      manufacturingModuleEnabled: settings.manufacturingModuleEnabled === true,
      importModuleEnabled: settings.importModuleEnabled === true,
      comboModuleEnabled: settings.comboModuleEnabled === true,
      restaurantModuleEnabled: settings.restaurantModuleEnabled === true,
      posShowCartMeta: settings.posShowCartMeta === true,
      printDeliveryRepOnReceipt: settings.printDeliveryRepOnReceipt === true,
      storefrontModuleEnabled: settings.storefrontModuleEnabled !== false,
      installmentsModuleEnabled: settings.installmentsModuleEnabled !== false,
      fixedAssetsModuleEnabled: settings.fixedAssetsModuleEnabled !== false,
      taxDeclarationModuleEnabled: settings.taxDeclarationModuleEnabled !== false,
      deliveryFleetModuleEnabled: settings.deliveryFleetModuleEnabled !== false,
      allowNegativeStockSales: settings.allowNegativeStockSales === true || settings.allowSellingBelowStock === true,
      allowZeroPurchaseCost: settings.allowZeroPurchaseCost === true,
      requireCashierShiftForSales: settings.requireCashierShiftForSales !== false,
      loyaltyEnabled: (settings as any)?.loyaltyEnabled !== false,
      loyaltyPointsPer100Egp: Number((settings as any)?.loyaltyPointsPer100Egp ?? 10),
      loyaltyPointRedeemValue: Number((settings as any)?.loyaltyPointRedeemValue ?? 0.1),
      loyaltyMinRedeemPoints: Number((settings as any)?.loyaltyMinRedeemPoints ?? 50),
      loyaltyMaxDiscountPercentage: Number((settings as any)?.loyaltyMaxDiscountPercentage ?? 50),
      printShowLoyaltyPoints: (settings as any)?.printShowLoyaltyPoints !== false,
      posMaxDiscountThresholdEnabled: settings.posMaxDiscountThresholdEnabled === true,
      posMaxDiscountThresholdType: (settings.posMaxDiscountThresholdType as any) || 'percentage',
      posMaxDiscountThresholdValue: Number(settings.posMaxDiscountThresholdValue ?? 15),
      posKitchenPrinterEnabled: settings.posKitchenPrinterEnabled === true,
      posKitchenPrinterAuto: settings.posKitchenPrinterAuto === true,
      posKitchenPrinterMode: settings.posKitchenPrinterMode || 'detailed',
      posElectronCashierPrinter: settings.posElectronCashierPrinter || '',
      posElectronKitchenPrinter: settings.posElectronKitchenPrinter || '',
      weightedBarcodeEnabled: settings.weightedBarcodeEnabled === true,
      weightedBarcodePrefix: String(settings.weightedBarcodePrefix || '21').replace(/\D/g, '') || '21',
      weightedBarcodeProductCodeLength: Math.min(8, Math.max(3, Math.floor(Number(settings.weightedBarcodeProductCodeLength || 5)))),
      weightedBarcodeWeightDigits: Math.min(8, Math.max(3, Math.floor(Number(settings.weightedBarcodeWeightDigits || 5)))),
      weightedBarcodeWeightDecimals: Math.min(3, Math.max(0, Math.floor(Number(settings.weightedBarcodeWeightDecimals || 3)))),
      printShowLogo: settings.printShowLogo !== false,
      printShowDocumentType: settings.printShowDocumentType !== false,
      printShowDocumentNumber: settings.printShowDocumentNumber !== false,
      printShowOrderType: settings.printShowOrderType !== false,
      printShowPhone: settings.printShowPhone !== false,
      printShowAddress: settings.printShowAddress !== false,
      printShowTaxNumber: settings.printShowTaxNumber === true,
      printShowCustomer: settings.printShowCustomer !== false,
      printShowDeliveryCustomerDetails: settings.printShowDeliveryCustomerDetails !== false,
      printShowCashier: settings.printShowCashier !== false,
      printShowBranch: settings.printShowBranch !== false,
      printShowLocation: settings.printShowLocation !== false,
      printShowTax: settings.printShowTax !== false,
      printShowPaymentMethod: settings.printShowPaymentMethod !== false,
      printShowItemSummary: settings.printShowItemSummary !== false,
      printShowItemCount: settings.printShowItemCount !== false,
      printShowPiecesCount: settings.printShowPiecesCount !== false,
      printShowPaymentBreakdown: settings.printShowPaymentBreakdown !== false,
      printShowSavingsBanner: settings.printShowSavingsBanner !== false,
      printShowInvoiceBarcode: settings.printShowInvoiceBarcode !== false,
      printShowFooter: settings.printShowFooter !== false,
      printCompactReceipt: settings.printCompactReceipt !== false,
      posReceiptTheme: settings.posReceiptTheme || 'classic',
      printNumberFormat: settings.printNumberFormat === 'english' ? 'english' : 'arabic',
      printDualReceiptForOnlineDelivery: Boolean(settings.printDualReceiptForOnlineDelivery),
      uiLanguage: settings.uiLanguage === 'en' ? 'en' : 'ar',
      currency: String(settings.currency || 'EGP').trim() || 'EGP',
      timezone: String(settings.timezone || 'Africa/Cairo').trim() || 'Africa/Cairo',
      dateFormat: settings.dateFormat === 'dd/MM/yyyy' ? 'dd/MM/yyyy' : 'yyyy-MM-dd',
      timeFormat: settings.timeFormat === '12h' ? '12h' : '24h',
      whatsappLinkMode: settings.whatsappLinkMode === 'app' ? 'app' : settings.whatsappLinkMode === 'web' ? 'web' : 'wa_me',
      defaultBranchIssueMode: settings.defaultBranchIssueMode === 'transfer_to_branch_stock' ? 'transfer_to_branch_stock' : 'final_issue',
      invoiceNumberingScheme: settings.invoiceNumberingScheme === 'sequential' ? 'sequential' : 'daily',
      expiryAlertDays: Math.max(1, Number(settings.expiryAlertDays || 60)),
      stagnantProductDays: Math.max(1, Number(settings.stagnantProductDays || 60)),
    });
  }, [settings, form, branches]);

  useEffect(() => {
    const selectedLocationId = form.getValues('currentLocationId');
    if (selectedLocationId && !visibleLocations.some((location) => String(location.id) === String(selectedLocationId))) {
      form.setValue('currentLocationId', '', { shouldDirty: true });
    }
  }, [visibleLocations, form]);

  useEffect(() => {
    if (SINGLE_STORE_MODE) {
      const currentId = form.getValues('currentBranchId');
      const branchExists = currentId ? branches.some((b) => String(b.id) === String(currentId)) : false;
      
      if ((!currentId || !branchExists) && branches[0]?.id) {
        form.setValue('currentBranchId', String(branches[0].id), { shouldDirty: false });
      }
    }
  }, [branches, form]);

  useEffect(() => {
    if (!form.getValues('currentLocationId')) {
      const currentBranchId = form.getValues('currentBranchId');
      const branch = branches.find(b => String(b.id) === String(currentBranchId)) || branches[0];
      if (branch?.defaultStockLocationId) {
        form.setValue('currentLocationId', String(branch.defaultStockLocationId), { shouldDirty: false });
      } else if (SINGLE_STORE_MODE && visibleLocations[0]?.id) {
        form.setValue('currentLocationId', String(visibleLocations[0].id), { shouldDirty: false });
      }
    }
  }, [visibleLocations, branches, form]);

  useEffect(() => {
    if (!clothingModuleEnabled && form.getValues('defaultProductKind') !== 'standard') {
      form.setValue('defaultProductKind', 'standard', { shouldDirty: true });
    }
  }, [clothingModuleEnabled, form]);

  useEffect(() => {
    if (!branchMenuOpen) setBranchQuery(selectedBranch?.name || '');
  }, [branchMenuOpen, selectedBranch?.name]);

  useEffect(() => {
    if (!form.getValues('currentBranchId') && branches.length === 1 && branches[0]?.id) {
      form.setValue('currentBranchId', String(branches[0].id), { shouldDirty: false });
    }
  }, [branches, form]);

  useEffect(() => {
    if (!form.getValues('currentLocationId') && visibleLocations.length === 1 && visibleLocations[0]?.id) {
      form.setValue('currentLocationId', String(visibleLocations[0].id), { shouldDirty: false });
    }
  }, [visibleLocations, form]);


  const disabled = mutation.isPending || !canManageSettings;
  const watchedLanguage = form.watch('uiLanguage');

  useEffect(() => {
    setLocaleLanguage(watchedLanguage === 'en' ? 'en' : 'ar');
  }, [setLocaleLanguage, watchedLanguage]);

  const navigateToFieldAndHighlight = (fieldKey: string) => {
    const meta = SETTINGS_FIELD_METADATA[fieldKey];
    const targetTab = meta ? meta.tab : 'general';

    setActiveTab(targetTab);

    setTimeout(() => {
      // 1. Search for input element by name, id or data-field
      const input =
        document.querySelector<HTMLElement>(`[name="${fieldKey}"]`) ||
        document.getElementById(fieldKey) ||
        document.querySelector<HTMLElement>(`#${fieldKey}`) ||
        document.querySelector<HTMLElement>(`[data-field="${fieldKey}"]`);

      let highlightTarget: HTMLElement | null = input;

      if (input) {
        // Walk up to find the enclosing card, label, or field row
        let curr: HTMLElement | null = input.parentElement;
        while (
          curr &&
          curr !== document.body &&
          !curr.classList.contains('settings-two-col-grid') &&
          !curr.classList.contains('settings-tab-content-wrapper') &&
          !curr.classList.contains('document-prototype-section') &&
          !curr.classList.contains('page-stack')
        ) {
          if (
            curr.tagName === 'LABEL' ||
            curr.style.border ||
            curr.style.borderRadius ||
            curr.classList.contains('field') ||
            curr.classList.contains('form-group') ||
            curr.classList.contains('form-row')
          ) {
            highlightTarget = curr;
            break;
          }
          curr = curr.parentElement;
        }
      }

      if (highlightTarget) {
        highlightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });

        document.querySelectorAll('.settings-error-highlight').forEach((el) => {
          el.classList.remove('settings-error-highlight');
        });

        void highlightTarget.offsetWidth;
        highlightTarget.classList.add('settings-error-highlight');

        if (input && typeof input.focus === 'function') {
          try {
            input.focus({ preventScroll: true });
          } catch {
            // Ignore focus errors
          }
        }

        setTimeout(() => {
          highlightTarget?.classList.remove('settings-error-highlight');
        }, 3600);
      } else {
        const wrapper = document.querySelector('.settings-tab-content-wrapper');
        wrapper?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const submit = form.handleSubmit(
    async (values) => {
      let branchIdToUse = String(values.currentBranchId || '').trim();
      const locationIdToUse = String(values.currentLocationId || '').trim();

      if (!branchIdToUse && branchQuery.trim()) {
        const existingBranch = branches.find((b) => normalizeText(String(b.name || '')) === normalizeText(branchQuery));
        if (existingBranch) {
          branchIdToUse = String(existingBranch.id);
        } else {
          try {
            // Fallback dynamic import if settingsApi is not at the top
            const { settingsApi } = await import('@/features/settings/api/settings.api');
            const res = await settingsApi.createBranch({ name: branchQuery.trim() });
            const newId = res.branchId || res.branch?.id;
            if (res.ok && newId) branchIdToUse = String(newId);
          } catch (err) {
            console.error(err);
          }
        }
      }

      values.currentBranchId = branchIdToUse;
      values.currentLocationId = locationIdToUse;

      const isBranchMissing = !String(values.currentBranchId || '').trim();
      const isLocationMissing = !String(values.currentLocationId || '').trim();

      if (isBranchMissing) {
        form.setError('currentBranchId', { type: 'manual', message: 'يجب اختيار الفرع الرئيسي قبل حفظ الإعدادات.' });
      }
      
      if (isLocationMissing) {
        form.setError('currentLocationId', { type: 'manual', message: 'يجب اختيار مكان الاستلام الافتراضي قبل حفظ الإعدادات.' });
      }

      const missingCoreFields =
        !String(values.storeName || '').trim() ||
        !String(values.defaultPosMode || '').trim() ||
        !String(values.paperSize || '').trim();

      if (missingCoreFields) {
        form.setError('storeName', {
          type: 'manual',
          message: form.formState.errors.storeName?.message || 'يرجى إكمال الحقول المطلوبة قبل حفظ الإعدادات.',
        });
      }

      if (isBranchMissing || isLocationMissing || missingCoreFields) {
        form.setError('root.serverError', { type: 'manual', message: 'يرجى إكمال الحقول المطلوبة قبل حفظ الإعدادات.' });
        if (isBranchMissing) navigateToFieldAndHighlight('currentBranchId');
        else if (isLocationMissing) navigateToFieldAndHighlight('currentLocationId');
        else if (missingCoreFields) navigateToFieldAndHighlight('storeName');
        return;
      }

      form.clearErrors('root.serverError');
      mutation.mutate(values);
    },
    (errors) => {
      // Auto navigate to the first invalid field and highlight it with glow
      const errorKeys = Object.keys(errors).filter((k) => k !== 'root');
      if (errorKeys.length > 0) {
        navigateToFieldAndHighlight(errorKeys[0]);
      }
    }
  );

  const tabErrors = useMemo(() => {
    const errors = form.formState.errors;
    const map: Record<
      'general' | 'sales_inventory' | 'modules' | 'printing' | 'security',
      { fieldKey: string; label: string; message?: string }[]
    > = {
      general: [],
      sales_inventory: [],
      modules: [],
      printing: [],
      security: [],
    };

    for (const [field, err] of Object.entries(errors)) {
      if (!err || field === 'root') continue;
      const meta = SETTINGS_FIELD_METADATA[field];
      const label = meta ? meta.label : field;
      const tab = meta ? meta.tab : 'general';
      const rawMessage = (err as any)?.message;
      const message = typeof rawMessage === 'string' && rawMessage.trim() ? rawMessage.trim() : undefined;

      map[tab].push({
        fieldKey: field,
        label,
        message,
      });
    }
    return map;
  }, [form.formState.errors]);

  return (
    <form id="settings-main-form" className="page-stack settings-core-form" dir="rtl" autoComplete="off" onSubmit={submit} noValidate>
      <style>{`
        @keyframes settingsErrorGlowPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7), inset 0 0 0 1px rgba(239, 68, 68, 0.5);
            border-color: #ef4444 !important;
            background-color: #fef2f2 !important;
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.25), inset 0 0 0 2px rgba(239, 68, 68, 0.8);
            border-color: #dc2626 !important;
            background-color: #fee2e2 !important;
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0), inset 0 0 0 1px rgba(239, 68, 68, 0.5);
            border-color: #ef4444 !important;
            background-color: #fef2f2 !important;
          }
        }

        .settings-error-highlight {
          animation: settingsErrorGlowPulse 1.1s ease-in-out 3 !important;
          border-color: #ef4444 !important;
          outline: 2.5px solid #ef4444 !important;
          outline-offset: 3px !important;
          border-radius: 10px !important;
          transition: all 0.25s ease-in-out !important;
        }
      `}</style>

        {/* الإشعارات والأخطاء */}
        <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تغييرات غير محفوظة" hint="احفظ التعديلات أو أعد ضبطها قبل مغادرة الشاشة." />
        {!canManageSettings ? <div className="muted small" style={{ marginBottom: 16 }}>هذا الحساب يملك صلاحية عرض الإعدادات فقط بدون تعديل.</div> : null}
        <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الإعدادات" successText="تم حفظ الإعدادات بنجاح." />
        {form.formState.errors.root?.serverError?.message ? (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', marginBottom: 16 }}>
            <div style={{ color: '#b91c1c' }}>{form.formState.errors.root.serverError.message}</div>
          </div>
        ) : null}

        {/* التابات وتنبيه الأخطاء التفاعلي */}
        {!form.formState.isValid && form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
          <div
            className="settings-validation-alert"
            style={{
              padding: '14px 18px',
              background: '#fff5f5',
              border: '1px solid #fca5a5',
              borderInlineStart: '4px solid #ef4444',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '0.86rem',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.92rem' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <span>توجد حقول تتطلب المراجعة أو استكمال البيانات قبل الحفظ ({Object.keys(form.formState.errors).filter(k => k !== 'root').length} حقول):</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>
                💡 انقر على أي حقل أدناه للانتقال إليه مباشرة وتمييزه
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {Object.entries(tabErrors).map(([tabId, items]) => {
                if (!items.length) return null;
                const tabNames: Record<string, string> = {
                  general: 'عام',
                  sales_inventory: 'البيع والمخزون',
                  modules: 'موديولات النظام',
                  printing: 'الطباعة',
                  security: 'الأمان',
                };
                return (
                  <div
                    key={tabId}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
                      <span>تبويب &quot;{tabNames[tabId] || tabId}&quot;:</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {items.map((item) => (
                        <button
                          key={item.fieldKey}
                          type="button"
                          onClick={() => navigateToFieldAndHighlight(item.fieldKey)}
                          title="انقر للانتقال للحقل وتمييزه"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#fef2f2',
                            border: '1px solid #f87171',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.8rem',
                            color: '#b91c1c',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2';
                            e.currentTarget.style.borderColor = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#f87171';
                          }}
                        >
                          <span>🎯 {item.label}</span>
                          {item.message && item.message !== item.label ? (
                            <span style={{ fontWeight: 500, color: '#991b1b', fontSize: '0.76rem' }}>
                              ({item.message})
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="settings-tabs" style={{ display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px', marginBottom: '16px', overflowX: 'auto' }}>
          {[
            { id: 'general', label: 'عام' },
            { id: 'sales_inventory', label: 'البيع والمخزون' },
            { id: 'modules', label: 'موديولات النظام' },
            { id: 'printing', label: 'الطباعة' },
            { id: 'security', label: 'الأمان' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: activeTab === tab.id ? 'var(--primary, #0f172a)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : ((tabErrors as any)[tab.id]?.length ? '#ef4444' : '#64748b'),
                border: 'none',
                padding: '6px 16px',
                borderRadius: '7px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.label}</span>
              {(tabErrors as any)[tab.id]?.length > 0 ? (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', borderRadius: '10px', padding: '1px 6px', fontWeight: 800 }}>
                  {(tabErrors as any)[tab.id].length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        

      <div className="settings-tab-content-wrapper" style={{ minHeight: '480px' }}>
        <GeneralSettingsTab
          form={form}
          branches={branches}
          locations={locations}
          canManageSettings={canManageSettings}
          disabled={disabled}
          activeTab={activeTab}
          branchQuery={branchQuery}
          setBranchQuery={setBranchQuery}
          filteredBranches={filteredBranches}
          selectedBranch={selectedBranch || undefined}
          stockMode={stockMode}
          setStockMode={setStockMode}
          defaultStockLocationId={defaultStockLocationId}
          setDefaultStockLocationId={setDefaultStockLocationId}
          allowExternalSalesStock={allowExternalSalesStock}
          setAllowExternalSalesStock={setAllowExternalSalesStock}
          branchStockSaving={branchStockSaving}
          setBranchStockSaving={setBranchStockSaving}
          branchStockSaved={branchStockSaved}
          setBranchStockSaved={setBranchStockSaved}
          branchStockError={branchStockError}
          setBranchStockError={setBranchStockError}
          branchStockDirty={branchStockDirty}
          setBranchStockDirty={setBranchStockDirty}
          branchMenuOpen={branchMenuOpen}
          setBranchMenuOpen={setBranchMenuOpen}
          branchMenuHasContent={branchMenuHasContent}
          branchCreateOptionVisible={branchCreateOptionVisible}
          commitSelectedBranch={commitSelectedBranch}
          setBranchPrefillName={setBranchPrefillName}
          setShowBranchQuickAdd={setShowBranchQuickAdd}
          visibleLocations={visibleLocations}
          onUpdateBranch={onUpdateBranch}
        />

        <SalesInventorySettingsTab
          form={form}
          disabled={disabled}
          activeTab={activeTab}
        />

        <ModulesSettingsTab form={form} disabled={disabled} activeTab={activeTab} />

        <SecuritySettingsTab form={form} disabled={disabled} activeTab={activeTab} settings={settings} />

        <PrintingSettingsTab
          form={form}
          disabled={disabled}
          activeTab={activeTab}
          settings={settings}
          systemPrinters={systemPrinters}
          savedCashierPrinter={form.watch('posElectronCashierPrinter')}
          savedKitchenPrinter={form.watch('posElectronKitchenPrinter')}
          posKitchenPrinterEnabled={form.watch('posKitchenPrinterEnabled')}
        />
      </div>

      <div className="actions compact-actions sticky-form-actions settings-save-actions">
        <button type="button" className="btn btn-secondary" onClick={() => { if (canNavigateAway()) form.reset(); }} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ التغييرات</button>
      </div>

      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تغييرات غير محفوظة" hint="احفظ التعديلات أو أعد ضبطها قبل مغادرة الشاشة." />
      {!canManageSettings ? <div className="muted small">هذا الحساب يملك صلاحية عرض الإعدادات فقط بدون تعديل.</div> : null}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الإعدادات" successText="تم حفظ الإعدادات بنجاح." />
      <SubmitButton type="submit" isPending={mutation.isPending} disabled={!canManageSettings} idleText={setupMode ? 'حفظ والانتقال للخطوة التالية' : 'حفظ الإعدادات'} pendingText="جارٍ الحفظ..." />

      {/* مودال إضافة فرع سريع */}
      <DialogShell open={!SINGLE_STORE_MODE && showBranchQuickAdd} onClose={() => setShowBranchQuickAdd(false)} width="min(560px, 100%)" ariaLabel="إضافة فرع جديد">
        <div className="page-stack">
          <div><strong>إضافة فرع جديد</strong></div>
          <BranchForm
            canManageSettings={canManageSettings}
            setupMode={setupMode}
            onSetupAdvance={onSetupAdvance}
            hasExistingLocations={locations.length > 0}
            initialValues={{ name: branchPrefillName }}
            onCreated={(payload) => {
              const nextBranchId = String(payload.branchId || '').trim();
              if (nextBranchId) {
                commitSelectedBranch(nextBranchId, payload.name || branchPrefillName);
              } else if (payload.name) {
                const matched = branches.find((branch) => normalizeText(String(branch.name || '')) === normalizeText(payload.name || ''));
                if (matched?.id) {
                  commitSelectedBranch(String(matched.id), String(matched.name || payload.name));
                } else {
                  setBranchQuery(payload.name || branchPrefillName);
                }
              }
              setShowBranchQuickAdd(false);
            }}
          />
          <div className="actions compact-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowBranchQuickAdd(false)}>إلغاء</button>
          </div>
        </div>
      </DialogShell>


    </form>
  );
}

