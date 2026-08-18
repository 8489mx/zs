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
      currentBranchId: '',
      currentLocationId: '',
      manufacturingModuleEnabled: false,
      importModuleEnabled: false,
      comboModuleEnabled: false,
      restaurantModuleEnabled: false,
      posShowCartMeta: false,
      printDeliveryRepOnReceipt: false,
      clothingModuleEnabled: false,
      defaultProductKind: 'standard',
      defaultPosMode: 'scanner',
      allowNegativeStockSales: false,
      allowZeroPurchaseCost: false,
      requireCashierShiftForSales: true,
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
      printShowCashier: true,
      printShowBranch: true,
      printShowLocation: true,
      printShowTax: true,
      printShowPaymentMethod: true,
      printShowItemSummary: true,
      printShowPaymentBreakdown: true,
      printShowFooter: true,
      printCompactReceipt: true,
      posReceiptTheme: 'classic',
      printNumberFormat: 'arabic',
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
      currentBranchId: settings.currentBranchId || '',
      currentLocationId: settings.currentLocationId || '',
      clothingModuleEnabled: clothingEnabled,
      defaultProductKind: clothingEnabled && settings.defaultProductKind === 'fashion' ? 'fashion' : 'standard',
      defaultPosMode: settings.defaultPosMode === 'touch' ? 'touch' : 'scanner',
      manufacturingModuleEnabled: settings.manufacturingModuleEnabled === true,
      importModuleEnabled: settings.importModuleEnabled === true,
      comboModuleEnabled: settings.comboModuleEnabled === true,
      restaurantModuleEnabled: settings.restaurantModuleEnabled === true,
      posShowCartMeta: settings.posShowCartMeta === true,
      printDeliveryRepOnReceipt: settings.printDeliveryRepOnReceipt === true,
      allowNegativeStockSales: settings.allowNegativeStockSales === true || settings.allowSellingBelowStock === true,
      allowZeroPurchaseCost: settings.allowZeroPurchaseCost === true,
      requireCashierShiftForSales: settings.requireCashierShiftForSales !== false,
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
      printShowPaymentBreakdown: settings.printShowPaymentBreakdown !== false,
      printShowFooter: settings.printShowFooter !== false,
      printCompactReceipt: settings.printCompactReceipt !== false,
      posReceiptTheme: settings.posReceiptTheme || 'classic',
      printNumberFormat: settings.printNumberFormat === 'english' ? 'english' : 'arabic',
      uiLanguage: settings.uiLanguage === 'en' ? 'en' : 'ar',
      currency: String(settings.currency || 'EGP').trim() || 'EGP',
      timezone: String(settings.timezone || 'Africa/Cairo').trim() || 'Africa/Cairo',
      dateFormat: settings.dateFormat === 'dd/MM/yyyy' ? 'dd/MM/yyyy' : 'yyyy-MM-dd',
      timeFormat: settings.timeFormat === '12h' ? '12h' : '24h',
      whatsappLinkMode: settings.whatsappLinkMode === 'app' ? 'app' : settings.whatsappLinkMode === 'web' ? 'web' : 'wa_me',
      defaultBranchIssueMode: settings.defaultBranchIssueMode === 'transfer_to_branch_stock' ? 'transfer_to_branch_stock' : 'final_issue',
      invoiceNumberingScheme: settings.invoiceNumberingScheme === 'sequential' ? 'sequential' : 'daily',
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

  const submit = form.handleSubmit(async (values) => {
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
      return;
    }

    form.clearErrors('root.serverError');
    mutation.mutate(values);
  });

  return (
    <form id="settings-main-form" className="page-stack settings-core-form" dir="rtl" onSubmit={submit}>
      

        {/* الإشعارات والأخطاء */}
        <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تغييرات غير محفوظة" hint="احفظ التعديلات أو أعد ضبطها قبل مغادرة الشاشة." />
        {!canManageSettings ? <div className="muted small" style={{ marginBottom: 16 }}>هذا الحساب يملك صلاحية عرض الإعدادات فقط بدون تعديل.</div> : null}
        <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الإعدادات" successText="تم حفظ الإعدادات بنجاح." />
        {form.formState.errors.root?.serverError?.message ? (
          <div className="document-prototype-section" style={{ backgroundColor: '#fee2e2', borderColor: '#ef4444', marginBottom: 16 }}>
            <div style={{ color: '#b91c1c' }}>{form.formState.errors.root.serverError.message}</div>
          </div>
        ) : null}

        {/* التابات */}
        {!form.formState.isValid && form.formState.isSubmitted && Object.keys(form.formState.errors).length > 0 && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 8, marginBottom: 16 }}>
            يوجد حقول مطلوبة لم يتم إدخالها بشكل صحيح في تبويبات أخرى (مثل اسم النشاط في تبويب "عام"). يرجى مراجعتها ثم المحاولة مرة أخرى.
          </div>
        )}
        <div className="settings-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border, #dbe2ea)', paddingBottom: '8px', overflowX: 'auto' }}>
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
                background: activeTab === tab.id ? 'var(--primary, #170c5c)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--text, #1e293b)',
                border: activeTab === tab.id ? '1px solid var(--primary, #170c5c)' : '1px solid transparent',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: activeTab === tab.id ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        

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
        settings={settings}
        systemPrinters={systemPrinters}
        savedCashierPrinter={form.watch('posElectronCashierPrinter')}
        savedKitchenPrinter={form.watch('posElectronKitchenPrinter')}
        posKitchenPrinterEnabled={form.watch('posKitchenPrinterEnabled')}
      />

      <ModulesSettingsTab form={form} disabled={disabled} activeTab={activeTab} />

      <SecuritySettingsTab form={form} disabled={disabled} activeTab={activeTab} settings={settings} />

      <PrintingSettingsTab form={form} disabled={disabled} activeTab={activeTab} />

      <div className="actions compact-actions sticky-form-actions settings-save-actions">
        <button type="button" className="btn btn-secondary" onClick={() => form.setValue('logoData', '', { shouldDirty: true })} disabled={mutation.isPending || !form.watch('logoData')}>حذف الشعار</button>
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

