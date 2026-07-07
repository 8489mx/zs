import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { DialogShell } from '@/shared/components/dialog-shell';
import { FormSection } from '@/shared/components/form-section';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { settingsFormSchema, type SettingsFormInput, type SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { BranchForm } from '@/features/settings/components/forms/BranchForm';
import { LocationForm } from '@/features/settings/components/forms/LocationForm';
import { BrandPreview, readFileAsDataUrl, type SettingsMainFormProps } from '@/features/settings/components/forms/settings-forms.shared';
import { useLocalePreference } from '@/shared/locale/LocaleProvider';

const checkboxGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
};

const checkboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 8,
  padding: '8px 10px',
  border: '1px solid var(--border, #dbe2ea)',
  borderRadius: 8,
  background: 'var(--surface, #fff)',
  minHeight: 36,
  cursor: 'pointer',
};

const checkboxInputStyle: CSSProperties = {
  width: 18,
  height: 18,
  flexShrink: 0,
  margin: 0,
  cursor: 'pointer',
};

const requiredStarStyle: CSSProperties = { color: '#dc2626', fontWeight: 700, marginInlineStart: 2 };
const comboListStyle: CSSProperties = { border: '1px solid var(--border, #dbe2ea)', borderRadius: 8, background: 'var(--surface, #fff)', marginTop: 6, maxHeight: 180, overflowY: 'auto', padding: 4 };
const comboRowStyle: CSSProperties = { width: '100%', textAlign: 'right', background: 'transparent', border: 'none', padding: '8px 10px', borderRadius: 8, cursor: 'pointer' };
const comboCreateStyle: CSSProperties = { ...comboRowStyle, fontWeight: 700, color: 'var(--primary, #2563eb)' };

function normalizeText(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

interface RequiredFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

function RequiredField({ label, error, children }: RequiredFieldProps) {
  return (
    <div className="field">
      <label>
        {label}
        <span style={requiredStarStyle}>*</span>
      </label>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </div>
  );
}

export function SettingsMainForm({ settings, branches, locations, canManageSettings, setupMode = false, onSetupAdvance }: SettingsMainFormProps) {
  const locale = useLocalePreference();
  const setLocaleLanguage = locale.setLanguage;
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
      paperSize: 'a4',
      managerPin: '',
      autoBackup: 'on',
      accentColor: '#2563eb',
      logoData: '',
      currentBranchId: '',
      currentLocationId: '',
      clothingModuleEnabled: false,
      defaultProductKind: 'standard',
      defaultPosMode: 'scanner',
      allowNegativeStockSales: false,
      allowZeroPurchaseCost: false,
      requireCashierShiftForSales: true,
      weightedBarcodeEnabled: false,
      weightedBarcodePrefix: '21',
      weightedBarcodeProductCodeLength: 5,
      weightedBarcodeWeightDigits: 5,
      weightedBarcodeWeightDecimals: 3,
      printShowLogo: true,
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
      printNumberFormat: 'arabic',
      uiLanguage: locale.language,
      currency: 'EGP',
      timezone: 'Africa/Cairo',
      dateFormat: 'yyyy-MM-dd',
      timeFormat: '24h',
      whatsappLinkMode: 'wa_me',
    },
  });

  const mutation = useSettingsUpdateMutation(settings, onSetupAdvance);
  const [showBranchQuickAdd, setShowBranchQuickAdd] = useState(false);
  const [showWarehouseQuickAdd, setShowWarehouseQuickAdd] = useState(false);
  const [branchQuery, setBranchQuery] = useState('');
  const [warehouseQuery, setWarehouseQuery] = useState('');
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [warehouseMenuOpen, setWarehouseMenuOpen] = useState(false);
  const [branchPrefillName, setBranchPrefillName] = useState('');
  const [warehousePrefillName, setWarehousePrefillName] = useState('');
  const [warehouseAddError, setWarehouseAddError] = useState('');
  const currentBranchId = form.watch('currentBranchId');
  const currentLocationId = form.watch('currentLocationId');
  const clothingModuleEnabled = form.watch('clothingModuleEnabled');
  const weightedBarcodeEnabled = form.watch('weightedBarcodeEnabled');
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

  const resolvedBranchId = SINGLE_STORE_MODE ? (currentBranchId || settings?.currentBranchId || branches[0]?.id || '') : currentBranchId;
  const visibleLocations = useMemo(
    () => locations.filter((location) => !resolvedBranchId || String(location.branchId || '') === String(resolvedBranchId)),
    [locations, resolvedBranchId]
  );

  const selectedBranch = branches.find((branch) => String(branch.id) === String(resolvedBranchId)) || branches[0] || null;
  const selectedLocation = visibleLocations.find((location) => String(location.id) === String(currentLocationId)) || visibleLocations[0] || locations[0] || null;
  const filteredBranches = useMemo(
    () => branches.filter((branch) => !normalizeText(branchQuery) || normalizeText(String(branch.name || '')).includes(normalizeText(branchQuery))),
    [branchQuery, branches]
  );
  const filteredWarehouses = useMemo(
    () => visibleLocations.filter((location) => !normalizeText(warehouseQuery) || normalizeText(String(location.name || '')).includes(normalizeText(warehouseQuery))),
    [warehouseQuery, visibleLocations]
  );
  const branchHasExactMatch = useMemo(
    () => branches.some((branch) => normalizeText(String(branch.name || '')) === normalizeText(branchQuery)),
    [branchQuery, branches]
  );
  const warehouseHasExactMatch = useMemo(
    () => visibleLocations.some((location) => normalizeText(String(location.name || '')) === normalizeText(warehouseQuery)),
    [warehouseQuery, visibleLocations]
  );
  const branchCreateOptionVisible = Boolean(normalizeText(branchQuery) && !branchHasExactMatch);
  const warehouseCreateOptionVisible = Boolean(normalizeText(warehouseQuery) && !warehouseHasExactMatch);
  const branchMenuHasContent = filteredBranches.length > 0 || branchCreateOptionVisible;
  const warehouseMenuHasContent = filteredWarehouses.length > 0 || warehouseCreateOptionVisible;

  const commitSelectedBranch = (branchId: string, branchName?: string) => {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) return;
    form.setValue('currentBranchId', normalizedBranchId, { shouldDirty: true, shouldValidate: true });
    form.clearErrors('currentBranchId');
    form.clearErrors('currentLocationId');
    form.clearErrors('root.serverError');
    setWarehouseAddError('');
    if (typeof branchName === 'string' && branchName.trim()) {
      setBranchQuery(branchName.trim());
    }
    setBranchMenuOpen(false);
  };

  const commitSelectedWarehouse = (locationId: string, locationName?: string) => {
    const normalizedLocationId = String(locationId || '').trim();
    if (!normalizedLocationId) return;
    form.setValue('currentLocationId', normalizedLocationId, { shouldDirty: true, shouldValidate: true });
    form.clearErrors('currentLocationId');
    form.clearErrors('root.serverError');
    if (typeof locationName === 'string' && locationName.trim()) {
      setWarehouseQuery(locationName.trim());
    }
    setWarehouseMenuOpen(false);
  };

  useEffect(() => {
    if (!settings) return;
    const clothingEnabled = settings.clothingModuleEnabled === true;
    form.reset({
      storeName: settings.storeName || '',
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
      accentColor: settings.accentColor || '#2563eb',
      logoData: settings.logoData || '',
      currentBranchId: settings.currentBranchId || '',
      currentLocationId: settings.currentLocationId || '',
      clothingModuleEnabled: clothingEnabled,
      defaultProductKind: clothingEnabled && settings.defaultProductKind === 'fashion' ? 'fashion' : 'standard',
      defaultPosMode: settings.defaultPosMode === 'touch' ? 'touch' : 'scanner',
      manufacturingModuleEnabled: settings.manufacturingModuleEnabled === true,
      allowNegativeStockSales: settings.allowNegativeStockSales === true || settings.allowSellingBelowStock === true,
      allowZeroPurchaseCost: settings.allowZeroPurchaseCost === true,
      requireCashierShiftForSales: settings.requireCashierShiftForSales !== false,
      posKitchenPrinterEnabled: settings.posKitchenPrinterEnabled === true,
      posKitchenPrinterAuto: settings.posKitchenPrinterAuto === true,
      weightedBarcodeEnabled: settings.weightedBarcodeEnabled === true,
      weightedBarcodePrefix: String(settings.weightedBarcodePrefix || '21').replace(/\D/g, '') || '21',
      weightedBarcodeProductCodeLength: Math.min(8, Math.max(3, Math.floor(Number(settings.weightedBarcodeProductCodeLength || 5)))),
      weightedBarcodeWeightDigits: Math.min(8, Math.max(3, Math.floor(Number(settings.weightedBarcodeWeightDigits || 5)))),
      weightedBarcodeWeightDecimals: Math.min(3, Math.max(0, Math.floor(Number(settings.weightedBarcodeWeightDecimals || 3)))),
      printShowLogo: settings.printShowLogo !== false,
      printShowPhone: settings.printShowPhone !== false,
      printShowAddress: settings.printShowAddress !== false,
      printShowTaxNumber: settings.printShowTaxNumber === true,
      printShowCustomer: settings.printShowCustomer !== false,
      printShowCashier: settings.printShowCashier !== false,
      printShowBranch: settings.printShowBranch !== false,
      printShowLocation: settings.printShowLocation !== false,
      printShowTax: settings.printShowTax !== false,
      printShowPaymentMethod: settings.printShowPaymentMethod !== false,
      printShowItemSummary: settings.printShowItemSummary !== false,
      printShowPaymentBreakdown: settings.printShowPaymentBreakdown !== false,
      printShowFooter: settings.printShowFooter !== false,
      printCompactReceipt: settings.printCompactReceipt !== false,
      printNumberFormat: settings.printNumberFormat === 'english' ? 'english' : 'arabic',
      uiLanguage: settings.uiLanguage === 'en' ? 'en' : 'ar',
      currency: String(settings.currency || 'EGP').trim() || 'EGP',
      timezone: String(settings.timezone || 'Africa/Cairo').trim() || 'Africa/Cairo',
      dateFormat: settings.dateFormat === 'dd/MM/yyyy' ? 'dd/MM/yyyy' : 'yyyy-MM-dd',
      timeFormat: settings.timeFormat === '12h' ? '12h' : '24h',
      whatsappLinkMode: (['web', 'app', 'wa_me'].includes(settings.whatsappLinkMode || '') ? settings.whatsappLinkMode : 'wa_me') as 'web' | 'app' | 'wa_me',
    });
  }, [settings, form]);

  useEffect(() => {
    const selectedLocationId = form.getValues('currentLocationId');
    if (selectedLocationId && !visibleLocations.some((location) => String(location.id) === String(selectedLocationId))) {
      form.setValue('currentLocationId', '', { shouldDirty: true });
    }
  }, [visibleLocations, form]);

  useEffect(() => {
    if (SINGLE_STORE_MODE && !form.getValues('currentBranchId') && branches[0]?.id) {
      form.setValue('currentBranchId', String(branches[0].id), { shouldDirty: false });
    }
  }, [branches, form]);

  useEffect(() => {
    if (SINGLE_STORE_MODE && !form.getValues('currentLocationId') && visibleLocations[0]?.id) {
      form.setValue('currentLocationId', String(visibleLocations[0].id), { shouldDirty: false });
    }
  }, [visibleLocations, form]);

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

  useEffect(() => {
    if (!warehouseMenuOpen) {
      if (!selectedLocation?.name && visibleLocations.length === 0) {
        setWarehouseQuery('مخزون المتجر الداخلي');
      } else {
        setWarehouseQuery(selectedLocation?.name || '');
      }
    }
  }, [warehouseMenuOpen, selectedLocation?.name, visibleLocations.length]);

  const disabled = mutation.isPending || !canManageSettings;
  const watchedLanguage = form.watch('uiLanguage');

  useEffect(() => {
    setLocaleLanguage(watchedLanguage === 'en' ? 'en' : 'ar');
  }, [setLocaleLanguage, watchedLanguage]);

  const submit = form.handleSubmit(async (values) => {
    let branchIdToUse = String(values.currentBranchId || '').trim();
    let locationIdToUse = String(values.currentLocationId || '').trim();

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

    if (!locationIdToUse && warehouseQuery.trim()) {
      const existingLocation = visibleLocations.find((l) => normalizeText(String(l.name || '')) === normalizeText(warehouseQuery));
      if (existingLocation) {
        locationIdToUse = String(existingLocation.id);
      } else {
        try {
          const { settingsApi } = await import('@/features/settings/api/settings.api');
          const res = await settingsApi.createLocation({ name: warehouseQuery.trim(), branchId: branchIdToUse || undefined });
          const newId = res.locationId || res.location?.id;
          if (res.ok && newId) locationIdToUse = String(newId);
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
      form.setError('currentLocationId', { type: 'manual', message: 'يجب اختيار المخزن الأساسي قبل حفظ الإعدادات.' });
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

        {/* معاينة الهوية التجارية */}
        <FormSection title="الهوية التجارية">
          <BrandPreview form={form} />
        </FormSection>

        {/* ===== اللغة والمنطقة ===== */}
        <FormSection title="اللغة والمنطقة" description={<>اضبط لغة الواجهة والعملة والمنطقة الزمنية المستخدمة في شاشة النظام والتقارير.</>}>
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>لغة النظام</label>
              <select className="purchase-prototype-field-input" {...form.register('uiLanguage')} disabled={disabled}>
                <option value="ar">العربية</option>
                <option value="en" disabled>English (قريباً)</option>
              </select>
            </div>
            <div className="field">
              <label>العملة</label>
              <select className="purchase-prototype-field-input" {...form.register('currency')} disabled={disabled}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>المنطقة الزمنية</label>
              <select className="purchase-prototype-field-input" {...form.register('timezone')} disabled={disabled}>
                <option value="Africa/Cairo">Africa/Cairo</option>
                <option value="Asia/Riyadh">Asia/Riyadh</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="field">
              <label>صيغة التاريخ</label>
              <select className="purchase-prototype-field-input" {...form.register('dateFormat')} disabled={disabled}>
                <option value="yyyy-MM-dd">2026-06-07</option>
                <option value="dd/MM/yyyy">07/06/2026</option>
              </select>
            </div>
            <div className="field">
              <label>صيغة الوقت</label>
              <select className="purchase-prototype-field-input" {...form.register('timeFormat')} disabled={disabled}>
                <option value="24h">24 ساعة</option>
                <option value="12h">12 ساعة</option>
              </select>
            </div>
            <div className="field">
              <label>رابط إرسال الواتساب</label>
              <select className="purchase-prototype-field-input" {...form.register('whatsappLinkMode')} disabled={disabled}>
                <option value="wa_me">افتراضي (يسأل المستخدم)</option>
                <option value="web">واتساب ويب مباشرة</option>
                <option value="app">تطبيق الواتساب مباشرة</option>
              </select>
              <div className="muted small" style={{ marginTop: 4 }}>اختر الطريقة الأسرع لك عند إرسال الرسائل.</div>
            </div>
          </div>
        </FormSection>

        {/* ===== الإعدادات المطلوبة ===== */}
        <FormSection title="الإعدادات المطلوبة للتشغيل" description={<>
            أكمل هذه البيانات أولًا حتى تعمل المبيعات والمخزون والقيود بشكل صحيح. الحقول المميزة بـ <span style={{ color: '#dc2626', fontWeight: 700 }}>*</span> مطلوبة.
          </>}>
          <div className="document-prototype-grid compact-grid-2">
            <RequiredField label="اسم النشاط / المتجر" error={form.formState.errors.storeName?.message}>
              <input className="purchase-prototype-field-input" {...form.register('storeName')} disabled={disabled} />
            </RequiredField>

            {SINGLE_STORE_MODE ? (
              <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
                <input className="purchase-prototype-field-input" value={selectedBranch?.name || 'سيتم الربط تلقائيًا بعد حفظ بيانات النشاط الرئيسي'} disabled readOnly />
              </RequiredField>
            ) : (
              <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
                <input
                  className="purchase-prototype-field-input"
                  value={branchQuery}
                  placeholder="ابحث أو اكتب اسم فرع جديد لإضافته"
                  disabled={disabled}
                  onFocus={() => setBranchMenuOpen(true)}
                  onChange={(event) => {
                    setBranchQuery(event.target.value);
                    setBranchMenuOpen(true);
                    form.clearErrors('currentBranchId');
                    form.clearErrors('currentLocationId');
                    form.clearErrors('root.serverError');
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setBranchMenuOpen(false), 120);
                  }}
                />
                {branchMenuOpen && branchMenuHasContent ? (
                  <div style={comboListStyle}>
                    {filteredBranches.map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        style={comboRowStyle}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          commitSelectedBranch(String(branch.id), String(branch.name || ''));
                        }}
                      >
                        {branch.name}
                      </button>
                    ))}
                    {branchCreateOptionVisible ? (
                      <button
                        type="button"
                        style={comboCreateStyle}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setBranchPrefillName(branchQuery.trim());
                          setShowBranchQuickAdd(true);
                          setBranchMenuOpen(false);
                        }}
                      >
                        + إضافة فرع جديد: &quot;{branchQuery.trim()}&quot;
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </RequiredField>
            )}

            {SINGLE_STORE_MODE ? (
              <RequiredField label="المخزن الأساسي" error={form.formState.errors.currentLocationId?.message}>
                <input className="purchase-prototype-field-input" value={selectedLocation?.name || 'سيتم الربط تلقائيًا بعد حفظ المخزن الأساسي'} disabled readOnly />
              </RequiredField>
            ) : (
              <RequiredField label="المخزن الأساسي" error={form.formState.errors.currentLocationId?.message}>
                <input
                  className="purchase-prototype-field-input"
                  value={warehouseQuery}
                  placeholder="ابحث أو اكتب اسم مخزن جديد لإضافته"
                  disabled={disabled}
                  onFocus={() => setWarehouseMenuOpen(true)}
                  onChange={(event) => {
                    setWarehouseQuery(event.target.value);
                    setWarehouseMenuOpen(true);
                    form.clearErrors('currentLocationId');
                    form.clearErrors('root.serverError');
                  }}
                  onBlur={() => {
                    window.setTimeout(() => setWarehouseMenuOpen(false), 120);
                  }}
                />
                {warehouseMenuOpen && warehouseMenuHasContent ? (
                  <div style={comboListStyle}>
                    {filteredWarehouses.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        style={comboRowStyle}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          commitSelectedWarehouse(String(location.id), String(location.name || ''));
                        }}
                      >
                        {location.name}
                      </button>
                    ))}
                    {warehouseCreateOptionVisible ? (
                      <button
                        type="button"
                        style={comboCreateStyle}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          if (!String(currentBranchId || '').trim()) {
                            setWarehouseAddError('اختر الفرع الرئيسي أولًا قبل إضافة مخزن.');
                            return;
                          }
                          setWarehouseAddError('');
                          setWarehousePrefillName(warehouseQuery.trim());
                          setShowWarehouseQuickAdd(true);
                          setWarehouseMenuOpen(false);
                        }}
                      >
                        + إضافة مخزن جديد: &quot;{warehouseQuery.trim()}&quot;
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {warehouseAddError ? <small className="field-error">{warehouseAddError}</small> : null}
              </RequiredField>
            )}

            <RequiredField label="نمط الكاشير الافتراضي">
              <select className="purchase-prototype-field-input" {...form.register('defaultPosMode')} disabled={disabled}>
                <option value="scanner">سكانر</option>
                <option value="touch">تاتش</option>
              </select>
            </RequiredField>

            <RequiredField label="مقاس الطباعة">
              <select className="purchase-prototype-field-input" {...form.register('paperSize')} disabled={disabled}>
                <option value="a4">A4</option>
                <option value="receipt">Receipt</option>
              </select>
            </RequiredField>
          </div>
        </FormSection>

        {/* ===== بيانات النشاط ===== */}
        <FormSection title="بيانات النشاط">
          <div className="document-prototype-grid compact-grid-2">

            <div className="field">
              <label>الهاتف</label>
              <input className="purchase-prototype-field-input" {...form.register('phone')} disabled={disabled} />
            </div>
            <div className="field">
              <label>العنوان</label>
              <input className="purchase-prototype-field-input" {...form.register('address')} disabled={disabled} />
            </div>
            <div className="field">
              <label>رفع الشعار</label>
              <input
                className="purchase-prototype-field-input"
                style={{ paddingTop: 8 }}
                type="file"
                accept="image/*"
                disabled={disabled}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                    form.setValue('logoData', await readFileAsDataUrl(file), { shouldDirty: true, shouldValidate: true });
                  } finally {
                    event.currentTarget.value = '';
                  }
                }}
              />
            </div>
            <div className="field">
              <label>لون الواجهة</label>
              <input className="purchase-prototype-field-input" style={{ height: 42, padding: 4 }} type="color" {...form.register('accentColor')} disabled={disabled} />
            </div>
          </div>
        </FormSection>

        {/* ===== إعدادات البيع والفاتورة ===== */}
        <FormSection title="إعدادات البيع والفاتورة">
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>نسبة الضريبة</label>
              <input className="purchase-prototype-field-input" type="number" step="0.01" {...form.register('taxRate')} disabled={disabled} />
            </div>
            <div className="field">
              <label>طريقة احتساب الضريبة</label>
              <select className="purchase-prototype-field-input" {...form.register('taxMode')} disabled={disabled}>
                <option value="exclusive">تضاف فوق السعر</option>
                <option value="inclusive">ضمن السعر</option>
              </select>
            </div>
            <div className="field">
              <label>الرقم الضريبي</label>
              <input className="purchase-prototype-field-input" {...form.register('taxNumber')} disabled={disabled} />
            </div>
            <div className="field">
              <label>تذييل الفاتورة</label>
              <input className="purchase-prototype-field-input" {...form.register('invoiceFooter')} disabled={disabled} placeholder="مثال: شكرا لتعاملكم معنا" />
            </div>
            <div className="field">
              <label>محتوى QR في الفاتورة</label>
              <input className="purchase-prototype-field-input" {...form.register('invoiceQR')} disabled={disabled} placeholder="رابط أو نص اختياري" />
            </div>
            <div className="field">
              <label>تنسيق أرقام الفاتورة</label>
              <select className="purchase-prototype-field-input" {...form.register('printNumberFormat')} disabled={disabled}>
                <option value="arabic">أرقام عربية: ١٢٣٤</option>
                <option value="english">أرقام إنجليزية: 1234</option>
              </select>
            </div>
          </div>
        </FormSection>

        {/* ===== خيارات البيع والمخزون ===== */}
        <FormSection title="خيارات البيع والمخزون">
          <div className="document-prototype-grid compact-grid-2">
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('allowNegativeStockSales')} disabled={disabled} />
              السماح بالبيع بالسالب (تخطي تحذير المخزون)
            </label>
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('allowZeroPurchaseCost')} disabled={disabled} />
              السماح بسعر شراء صفر للمخازن والعطايا
            </label>
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('requireCashierShiftForSales')} disabled={disabled} />
              إجبار فتح وردية لعمليات الكاشير
            </label>
            <div className="field">
              <label>حد التنبيه للمخزون</label>
              <input className="purchase-prototype-field-input" type="number" min="0" {...form.register('lowStockThreshold')} disabled={disabled} />
            </div>
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('posKitchenPrinterEnabled')} disabled={disabled} />
              تفعيل طباعة شيت المطبخ (KOT)
            </label>
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('posKitchenPrinterAuto')} disabled={disabled} />
              طباعة شيت المطبخ تلقائياً
            </label>
          </div>
        </FormSection>

        {/* ===== موديولات النظام ===== */}
        <FormSection title="موديولات النظام" description={<>شغّل الأجزاء اللي محتاجها بس — والباقي هيتخفى تلقائيًا من الشاشات.</>}>
          <div className="document-prototype-grid compact-grid-2">
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('manufacturingModuleEnabled')} disabled={disabled} />
              <span><strong>🏭 التصنيع والإنتاج</strong><br /><small className="muted">يضيف خيار "تصنيف الصنف" في الأصناف</small></span>
            </label>
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('clothingModuleEnabled')} disabled={disabled} />
              <span><strong>👗 موديل الملابس والمتغيرات</strong><br /><small className="muted">يفعّل موديلات الملابس والأحجام والألوان</small></span>
            </label>
            <label style={checkboxStyle}>
              <input type="checkbox" {...form.register('weightedBarcodeEnabled')} disabled={disabled} />
              <span><strong>⚖️ باركود الميزان</strong><br /><small className="muted">باركود مضمّن فيه الوزن أو السعر مباشرةً</small></span>
            </label>
          </div>

          {clothingModuleEnabled ? (
            <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>الصنف الافتراضي عند الإضافة</label>
                <select className="purchase-prototype-field-input" {...form.register('defaultProductKind')} disabled={disabled}>
                  <option value="standard">صنف عادي</option>
                  <option value="fashion">موديل ملابس</option>
                </select>
              </div>
            </div>
          ) : null}

          {weightedBarcodeEnabled ? (
            <div className="document-prototype-grid compact-grid-2" style={{ marginTop: 16 }}>
              <div className="field">
                <label>بداية باركود الميزان</label>
                <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('weightedBarcodePrefix')} disabled={disabled} placeholder="21" />
              </div>
              <div className="field">
                <label>أرقام كود الصنف</label>
                <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeProductCodeLength')} disabled={disabled} />
              </div>
              <div className="field">
                <label>أرقام الوزن</label>
                <input className="purchase-prototype-field-input" type="number" min="3" max="8" {...form.register('weightedBarcodeWeightDigits')} disabled={disabled} />
              </div>
              <div className="field">
                <label>دقة الوزن (خانات عشرية)</label>
                <input className="purchase-prototype-field-input" type="number" min="0" max="3" {...form.register('weightedBarcodeWeightDecimals')} disabled={disabled} />
              </div>
            </div>
          ) : null}
        </FormSection>

        {/* ===== الأمان والنسخ الاحتياطي ===== */}
        <FormSection title="الأمان والنسخ الاحتياطي">
          <div className="document-prototype-grid compact-grid-2">
            <div className="field">
              <label>رمز اعتماد المدير</label>
              <input className="purchase-prototype-field-input" inputMode="numeric" {...form.register('managerPin')} disabled={disabled} placeholder={settings?.hasManagerPin ? 'اتركه فارغًا للإبقاء على الرمز الحالي' : 'مثال: 1234'} />
              <div className="muted small" style={{ marginTop: 4 }}>{settings?.hasManagerPin ? 'يوجد رمز مدير محفوظ. اكتب رمزًا جديدًا فقط عند الحاجة للتغيير.' : 'يمكن ضبط رمز المدير لاعتماد التعديلات الحساسة.'}</div>
            </div>
            <div className="field">
              <label>النسخ الاحتياطي التلقائي</label>
              <select className="purchase-prototype-field-input" {...form.register('autoBackup')} disabled={disabled}>
                <option value="on">مفعل</option>
                <option value="off">متوقف</option>
              </select>
            </div>
          </div>
        </FormSection>

        {/* ===== عناصر الطباعة ===== */}
        <FormSection title="عناصر الطباعة على الفاتورة">
          <div className="settings-print-options-grid" style={checkboxGridStyle}>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printCompactReceipt')} disabled={disabled} /> وضع إيصال مضغوط لتوفير الورق</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowLogo')} disabled={disabled} /> إظهار الشعار</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPhone')} disabled={disabled} /> إظهار الهاتف</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowAddress')} disabled={disabled} /> إظهار العنوان</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowTaxNumber')} disabled={disabled} /> إظهار الرقم الضريبي</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowCustomer')} disabled={disabled} /> إظهار العميل</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowCashier')} disabled={disabled} /> إظهار الكاشير</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowBranch')} disabled={disabled} /> إظهار الفرع</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowLocation')} disabled={disabled} /> إظهار المخزن</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowTax')} disabled={disabled} /> إظهار الضريبة</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPaymentMethod')} disabled={disabled} /> إظهار طريقة الدفع</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowItemSummary')} disabled={disabled} /> إظهار عدد البنود والقطع</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowPaymentBreakdown')} disabled={disabled} /> إظهار تفصيل المدفوعات</label>
            <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" style={checkboxInputStyle} {...form.register('printShowFooter')} disabled={disabled} /> إظهار التذييل</label>
          </div>
        </FormSection>
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

      {/* مودال إضافة مخزن سريع */}
      <DialogShell open={!SINGLE_STORE_MODE && showWarehouseQuickAdd} onClose={() => setShowWarehouseQuickAdd(false)} width="min(620px, 100%)" ariaLabel="إضافة مخزن جديد">
        <div className="page-stack">
          <div><strong>إضافة مخزن جديد</strong></div>
          <LocationForm
            branches={branches}
            canManageSettings={canManageSettings}
            setupMode={setupMode}
            onSetupAdvance={onSetupAdvance}
            initialValues={{ name: warehousePrefillName, branchId: String(currentBranchId || '') }}
            onCreated={(payload) => {
              if (payload.locationId) {
                commitSelectedWarehouse(String(payload.locationId), payload.name || warehousePrefillName);
              } else if (payload.name) {
                const matched = visibleLocations.find((location) => normalizeText(String(location.name || '')) === normalizeText(payload.name || ''));
                if (matched?.id) {
                  commitSelectedWarehouse(String(matched.id), String(matched.name || payload.name));
                } else {
                  setWarehouseQuery(payload.name || warehousePrefillName);
                }
              }
              setShowWarehouseQuickAdd(false);
            }}
          />
          <div className="actions compact-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowWarehouseQuickAdd(false)}>إلغاء</button>
          </div>
        </div>
      </DialogShell>
    </form>
  );
}
