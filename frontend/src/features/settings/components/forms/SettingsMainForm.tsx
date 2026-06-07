import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { DialogShell } from '@/shared/components/dialog-shell';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { settingsFormSchema, type SettingsFormInput, type SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
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
  gap: 8,
  padding: '8px 10px',
  border: '1px solid var(--border, #dbe2ea)',
  borderRadius: 10,
  background: 'var(--surface, #fff)',
  minHeight: 36,
};

const requiredStarStyle: CSSProperties = { color: '#dc2626', fontWeight: 700, marginInlineStart: 2 };
const comboListStyle: CSSProperties = { border: '1px solid var(--border, #dbe2ea)', borderRadius: 10, background: 'var(--surface, #fff)', marginTop: 6, maxHeight: 180, overflowY: 'auto', padding: 4 };
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
    <label className="field">
      <span>
        {label}
        <span style={requiredStarStyle}>*</span>
      </span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
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
      allowNegativeStockSales: settings.allowNegativeStockSales === true || settings.allowSellingBelowStock === true,
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
    if (!warehouseMenuOpen) setWarehouseQuery(selectedLocation?.name || '');
  }, [warehouseMenuOpen, selectedLocation?.name]);

  const disabled = mutation.isPending || !canManageSettings;
  const watchedLanguage = form.watch('uiLanguage');

  useEffect(() => {
    setLocaleLanguage(watchedLanguage === 'en' ? 'en' : 'ar');
  }, [setLocaleLanguage, watchedLanguage]);

  const submit = form.handleSubmit((values) => {
    const missingBranchOrWarehouse = !String(values.currentBranchId || '').trim() || !String(values.currentLocationId || '').trim();
    const missingCoreFields =
      !String(values.storeName || '').trim() ||
      !String(values.defaultPosMode || '').trim() ||
      !String(values.paperSize || '').trim();

    if (missingBranchOrWarehouse) {
      const message = 'يجب اختيار الفرع الرئيسي والمخزن الأساسي قبل حفظ الإعدادات.';
      form.setError('currentBranchId', { type: 'manual', message });
      form.setError('currentLocationId', { type: 'manual', message });
    }

    if (missingCoreFields) {
      form.setError('storeName', {
        type: 'manual',
        message: form.formState.errors.storeName?.message || 'يرجى إكمال الحقول المطلوبة قبل حفظ الإعدادات.',
      });
    }

    if (missingBranchOrWarehouse || missingCoreFields) {
      form.setError('root.serverError', { type: 'manual', message: 'يرجى إكمال الحقول المطلوبة قبل حفظ الإعدادات.' });
      return;
    }

    form.clearErrors('root.serverError');
    mutation.mutate(values);
  });

  return (
    <form id="settings-main-form" className="page-stack settings-core-form" onSubmit={submit}>
      <BrandPreview form={form} />


      <section className="panel page-stack">
        <div>
          <strong>اللغة والمنطقة</strong>
          <div className="muted small">اضبط لغة الواجهة والعملة والمنطقة الزمنية المستخدمة في شاشة النظام والتقارير.</div>
        </div>
        <div className="form-grid three-col-form">
          <label className="field">
            <span>لغة النظام</span>
            <select {...form.register('uiLanguage')} disabled={disabled}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            <span>العملة</span>
            <select {...form.register('currency')} disabled={disabled}>
              <option value="EGP">EGP - جنيه مصري</option>
              <option value="SAR">SAR - ريال سعودي</option>
              <option value="AED">AED - درهم إماراتي</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </label>
          <label className="field">
            <span>المنطقة الزمنية</span>
            <select {...form.register('timezone')} disabled={disabled}>
              <option value="Africa/Cairo">Africa/Cairo</option>
              <option value="Asia/Riyadh">Asia/Riyadh</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label className="field">
            <span>صيغة التاريخ</span>
            <select {...form.register('dateFormat')} disabled={disabled}>
              <option value="yyyy-MM-dd">2026-06-07</option>
              <option value="dd/MM/yyyy">07/06/2026</option>
            </select>
          </label>
          <label className="field">
            <span>صيغة الوقت</span>
            <select {...form.register('timeFormat')} disabled={disabled}>
              <option value="24h">24 ساعة</option>
              <option value="12h">12 ساعة</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel page-stack settings-required-card">
        <div>
          <strong>الإعدادات المطلوبة للتشغيل</strong>
          <div className="muted small">أكمل هذه البيانات أولًا حتى تعمل المبيعات والمخزون والقيود بشكل صحيح.</div>
          <div className="muted small">الحقول المميزة بـ * مطلوبة.</div>
        </div>
        <div className="form-grid three-col-form">
          <RequiredField label="اسم النشاط / المتجر" error={form.formState.errors.storeName?.message}>
            <input {...form.register('storeName')} disabled={disabled} />
          </RequiredField>

          {SINGLE_STORE_MODE ? (
            <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
              <input value={selectedBranch?.name || 'سيتم الربط تلقائيًا بعد حفظ بيانات النشاط الرئيسي'} disabled readOnly />
            </RequiredField>
          ) : (
            <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
              <input
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
                      + إضافة فرع جديد: "{branchQuery.trim()}"
                    </button>
                  ) : null}
                </div>
              ) : null}
            </RequiredField>
          )}

          {SINGLE_STORE_MODE ? (
            <RequiredField label="المخزن الأساسي" error={form.formState.errors.currentLocationId?.message}>
              <input value={selectedLocation?.name || 'سيتم الربط تلقائيًا بعد حفظ المخزن الأساسي'} disabled readOnly />
            </RequiredField>
          ) : (
            <RequiredField label="المخزن الأساسي" error={form.formState.errors.currentLocationId?.message}>
              <input
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
                      + إضافة مخزن جديد: "{warehouseQuery.trim()}"
                    </button>
                  ) : null}
                </div>
              ) : null}
              {warehouseAddError ? <small className="field-error">{warehouseAddError}</small> : null}
            </RequiredField>
          )}

          <RequiredField label="نمط الكاشير الافتراضي">
            <select {...form.register('defaultPosMode')} disabled={disabled}>
              <option value="scanner">سكانر</option>
              <option value="touch">تاتش</option>
            </select>
          </RequiredField>

          <RequiredField label="مقاس الطباعة">
            <select {...form.register('paperSize')} disabled={disabled}>
              <option value="a4">A4</option>
              <option value="receipt">Receipt</option>
            </select>
          </RequiredField>
        </div>

      </section>

      <section className="panel page-stack">
        <div>
          <strong>بيانات النشاط</strong>
        </div>
        <div className="form-grid three-col-form">
          <label className="field">
            <span>الاسم التجاري</span>
            <input {...form.register('brandName')} disabled={disabled} />
          </label>
          <label className="field">
            <span>الهاتف</span>
            <input {...form.register('phone')} disabled={disabled} />
          </label>
          <label className="field">
            <span>العنوان</span>
            <input {...form.register('address')} disabled={disabled} />
          </label>
          <label className="field">
            <span>رفع الشعار</span>
            <input
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
          </label>
          <label className="field">
            <span>لون الواجهة</span>
            <input type="color" {...form.register('accentColor')} disabled={disabled} />
          </label>
        </div>
      </section>

      <section className="panel page-stack">
        <div>
          <strong>إعدادات البيع والفاتورة</strong>
        </div>
        <div className="form-grid three-col-form">
          <label className="field">
            <span>نسبة الضريبة</span>
            <input type="number" step="0.01" {...form.register('taxRate')} disabled={disabled} />
          </label>
          <label className="field">
            <span>طريقة الضريبة</span>
            <select {...form.register('taxMode')} disabled={disabled}>
              <option value="exclusive">تضاف فوق السعر</option>
              <option value="inclusive">ضمن السعر</option>
            </select>
          </label>
          <label className="field">
            <span>تنسيق أرقام الفاتورة</span>
            <select {...form.register('printNumberFormat')} disabled={disabled}>
              <option value="arabic">أرقام عربية: ١٢٣٤</option>
              <option value="english">أرقام إنجليزية: 1234</option>
            </select>
            <div className="muted small">اختر شكل الأرقام المطبوعة في الإيصال حسب وضوح الطابعة وراحة العميل.</div>
          </label>
          <label className="field">
            <span>محتوى QR في الفاتورة</span>
            <input {...form.register('invoiceQR')} disabled={disabled} placeholder="اكتب رابطًا أو نصًا اختياريًا يظهر عند مسح رمز QR في الفاتورة." />
            <div className="muted small">اكتب رابطًا أو نصًا اختياريًا يظهر عند مسح رمز QR في الفاتورة.</div>
          </label>
          <label className="field">
            <span>الرقم الضريبي</span>
            <input {...form.register('taxNumber')} disabled={disabled} />
          </label>
          <label className="field">
            <span>تذييل الفاتورة</span>
            <input {...form.register('invoiceFooter')} disabled={disabled} placeholder="مثال: شكرا لتعاملكم معنا" />
          </label>
        </div>
      </section>

      <section className="panel page-stack">
        <div>
          <strong>خيارات البيع والمخزون</strong>
        </div>
        <div className="form-grid three-col-form">
          <label style={checkboxStyle}>
            <input type="checkbox" {...form.register('allowNegativeStockSales')} disabled={disabled} />
            السماح بالبيع بالسالب
          </label>
          <label className="field">
            <span>حد التنبيه للمخزون</span>
            <input type="number" min="0" {...form.register('lowStockThreshold')} disabled={disabled} />
          </label>
        </div>
      </section>

      <section className="panel page-stack">
        <div>
          <strong>إعدادات الأصناف والباركود والميزان</strong>
        </div>
        <div className="form-grid three-col-form">
          <label style={checkboxStyle}>
            <input type="checkbox" {...form.register('clothingModuleEnabled')} disabled={disabled} />
            تفعيل موديل الملابس داخل شاشة الأصناف
          </label>
          <label className="field">
            <span>الصنف الافتراضي عند الضغط على إضافة صنف</span>
            <select {...form.register('defaultProductKind')} disabled={disabled || !clothingModuleEnabled}>
              <option value="standard">صنف عادي</option>
              <option value="fashion">موديل ملابس</option>
            </select>
          </label>
          <label style={checkboxStyle}>
            <input type="checkbox" {...form.register('weightedBarcodeEnabled')} disabled={disabled} />
            تفعيل باركود الميزان
          </label>
          <label className="field">
            <span>بداية باركود الميزان</span>
            <input inputMode="numeric" {...form.register('weightedBarcodePrefix')} disabled={disabled || !weightedBarcodeEnabled} placeholder="21" />
          </label>
          <label className="field">
            <span>أرقام كود الصنف</span>
            <input type="number" min="3" max="8" {...form.register('weightedBarcodeProductCodeLength')} disabled={disabled || !weightedBarcodeEnabled} />
          </label>
          <label className="field">
            <span>أرقام الوزن</span>
            <input type="number" min="3" max="8" {...form.register('weightedBarcodeWeightDigits')} disabled={disabled || !weightedBarcodeEnabled} />
          </label>
          <label className="field">
            <span>دقة الوزن</span>
            <input type="number" min="0" max="3" {...form.register('weightedBarcodeWeightDecimals')} disabled={disabled || !weightedBarcodeEnabled} />
          </label>
        </div>
      </section>

      <section className="panel page-stack">
        <div>
          <strong>إعدادات الأمان والنسخ الاحتياطي</strong>
        </div>
        <div className="form-grid three-col-form">
          <label className="field">
            <span>رمز اعتماد المدير</span>
            <input inputMode="numeric" {...form.register('managerPin')} disabled={disabled} placeholder={settings?.hasManagerPin ? 'اتركه فارغًا للإبقاء على الرمز الحالي' : 'مثال: 1234'} />
            <div className="muted small">{settings?.hasManagerPin ? 'يوجد رمز مدير محفوظ. اكتب رمزًا جديدًا فقط عند الحاجة للتغيير.' : 'يمكن ضبط رمز المدير لاعتماد التعديلات الحساسة.'}</div>
          </label>
          <label className="field">
            <span>النسخ الاحتياطي التلقائي</span>
            <select {...form.register('autoBackup')} disabled={disabled}>
              <option value="on">مفعل</option>
              <option value="off">متوقف</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel page-stack">
        <div>
          <strong>عناصر الطباعة على الفاتورة</strong>
        </div>
        <div className="settings-print-options-grid" style={checkboxGridStyle}>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printCompactReceipt')} disabled={disabled} />وضع إيصال مضغوط لتوفير الورق</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowLogo')} disabled={disabled} />إظهار الشعار</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowPhone')} disabled={disabled} />إظهار الهاتف</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowAddress')} disabled={disabled} />إظهار العنوان</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowTaxNumber')} disabled={disabled} />إظهار الرقم الضريبي</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowCustomer')} disabled={disabled} />إظهار العميل</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowCashier')} disabled={disabled} />إظهار الكاشير</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowBranch')} disabled={disabled} />إظهار الفرع</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowLocation')} disabled={disabled} />إظهار المخزن</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowTax')} disabled={disabled} />إظهار الضريبة</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowPaymentMethod')} disabled={disabled} />إظهار طريقة الدفع</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowItemSummary')} disabled={disabled} />إظهار عدد البنود والقطع</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowPaymentBreakdown')} disabled={disabled} />إظهار تفصيل المدفوعات</label>
          <label className="settings-print-option" style={checkboxStyle}><input type="checkbox" {...form.register('printShowFooter')} disabled={disabled} />إظهار التذييل</label>
        </div>
      </section>

      {form.formState.errors.root?.serverError?.message ? (
        <div className="field-error">{form.formState.errors.root.serverError.message}</div>
      ) : null}

      <div className="actions compact-actions sticky-form-actions settings-save-actions">
        <button type="button" className="btn btn-secondary" onClick={() => form.setValue('logoData', '', { shouldDirty: true })} disabled={mutation.isPending || !form.watch('logoData')}>حذف الشعار</button>
        <button type="button" className="btn btn-secondary" onClick={() => { if (canNavigateAway()) form.reset(); }} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ التغييرات</button>
      </div>

      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تغييرات غير محفوظة" hint="احفظ التعديلات أو أعد ضبطها قبل مغادرة الشاشة." />
      {!canManageSettings ? <div className="muted small">هذا الحساب يملك صلاحية عرض الإعدادات فقط بدون تعديل.</div> : null}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الإعدادات" successText="تم حفظ الإعدادات بنجاح." />
      <SubmitButton type="submit" disabled={mutation.isPending || !canManageSettings} idleText={setupMode ? 'حفظ والانتقال للخطوة التالية' : 'حفظ الإعدادات'} pendingText="جارٍ الحفظ..." />

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
