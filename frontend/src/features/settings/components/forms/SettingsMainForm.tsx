import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { DraftStateNotice } from '@/shared/components/draft-state-notice';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { settingsFormSchema, type SettingsFormInput, type SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import { useUnsavedChangesGuard } from '@/shared/hooks/use-unsaved-changes-guard';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { BrandPreview, readFileAsDataUrl, type SettingsMainFormProps } from '@/features/settings/components/forms/settings-forms.shared';

const printCheckboxGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
};

const printCheckboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  border: '1px solid var(--border, #dbe2ea)',
  borderRadius: 12,
  background: 'var(--surface, #fff)',
};

export function SettingsMainForm({ settings, branches, locations, canManageSettings, setupMode = false, onSetupAdvance }: SettingsMainFormProps) {
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
    }
  });
  const mutation = useSettingsUpdateMutation(settings, onSetupAdvance);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const currentBranchId = form.watch('currentBranchId');
  const currentLocationId = form.watch('currentLocationId');
  const clothingModuleEnabled = form.watch('clothingModuleEnabled');
  const resolvedBranchId = SINGLE_STORE_MODE ? (currentBranchId || settings?.currentBranchId || branches[0]?.id || '') : currentBranchId;
  const visibleLocations = useMemo(
    () => locations.filter((location) => !resolvedBranchId || String(location.branchId || '') === String(resolvedBranchId)),
    [locations, resolvedBranchId]
  );
  const selectedBranch = branches.find((branch) => String(branch.id) === String(resolvedBranchId)) || branches[0] || null;
  const selectedLocation = visibleLocations.find((location) => String(location.id) === String(currentLocationId)) || visibleLocations[0] || locations[0] || null;
  const canNavigateAway = useUnsavedChangesGuard(form.formState.isDirty && !mutation.isPending);

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

  return (
    <form id="settings-main-form" className="page-stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <BrandPreview form={form} />
      <div className="form-grid three-col-form">
        <Field label="اسم المحل" error={form.formState.errors.storeName?.message}><input {...form.register('storeName')} disabled={mutation.isPending || !canManageSettings} /></Field>
        <Field label="الاسم التجاري" error={form.formState.errors.brandName?.message}><input {...form.register('brandName')} disabled={mutation.isPending || !canManageSettings} /></Field>
        <Field label="الهاتف"><input {...form.register('phone')} disabled={mutation.isPending || !canManageSettings} /></Field>
        <Field label="العنوان"><input {...form.register('address')} disabled={mutation.isPending || !canManageSettings} /></Field>
        <Field label="تذييل الفاتورة"><input {...form.register('invoiceFooter')} disabled={mutation.isPending || !canManageSettings} placeholder="مثال: الاستبدال خلال 14 يوم" /></Field>
        <Field label="مقاس الطباعة">
          <select {...form.register('paperSize')} disabled={mutation.isPending || !canManageSettings}>
            <option value="a4">A4</option>
            <option value="receipt">Receipt</option>
          </select>
        </Field>
        {SINGLE_STORE_MODE ? (
          <Field label="المتجر الحالي"><input value={selectedBranch?.name || 'سيتم الربط تلقائيًا بعد حفظ تعريف المتجر'} disabled readOnly /></Field>
        ) : (
          <Field label="الفرع الرئيسي">
            <select {...form.register('currentBranchId')} disabled={mutation.isPending || !canManageSettings}>
              <option value="">اختر الفرع الرئيسي</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field>
        )}
        {SINGLE_STORE_MODE ? (
          <Field label="نقطة التشغيل الافتراضية"><input value={selectedLocation?.name || 'سيتم الربط تلقائيًا بعد حفظ المخزن الأساسي'} disabled readOnly /></Field>
        ) : (
          <Field label="المخزن الأساسي">
            <select {...form.register('currentLocationId')} disabled={mutation.isPending || !canManageSettings}>
              <option value="">اختر المخزن الأساسي</option>
              {visibleLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>
        )}
      </div>
      <div className="actions compact-actions" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="btn btn-secondary" onClick={() => setShowAdvanced((value) => !value)}>
          {showAdvanced ? 'إخفاء الإعدادات الإضافية' : 'إعدادات إضافية'}
        </button>
      </div>
      {showAdvanced ? (
        <div className="page-stack">
          <div className="form-grid three-col-form">
            <Field label="حد التنبيه للمخزون" error={form.formState.errors.lowStockThreshold?.message}><input type="number" min="0" {...form.register('lowStockThreshold')} disabled={mutation.isPending || !canManageSettings} /></Field>
            <Field label="لون الواجهة" error={form.formState.errors.accentColor?.message}><input type="color" {...form.register('accentColor')} disabled={mutation.isPending || !canManageSettings} /></Field>
            <Field label="رقم التسجيل الضريبي"><input {...form.register('taxNumber')} disabled={mutation.isPending || !canManageSettings} /></Field>
            <Field label="رابط/نص QR بالفاتورة"><input {...form.register('invoiceQR')} disabled={mutation.isPending || !canManageSettings} /></Field>
            <Field label="نسبة الضريبة"><input type="number" step="0.01" {...form.register('taxRate')} disabled={mutation.isPending || !canManageSettings} /></Field>
            <Field label="طريقة الضريبة">
              <select {...form.register('taxMode')} disabled={mutation.isPending || !canManageSettings}>
                <option value="exclusive">تضاف فوق السعر</option>
                <option value="inclusive">ضمن السعر</option>
              </select>
            </Field>
            <Field label="رمز اعتماد المدير" error={form.formState.errors.managerPin?.message}>
              <input inputMode="numeric" {...form.register('managerPin')} disabled={mutation.isPending || !canManageSettings} placeholder={settings?.hasManagerPin ? 'اتركه فارغًا للإبقاء على الرمز الحالي' : 'مثال: 1234'} />
              <div className="muted small">{settings?.hasManagerPin ? 'يوجد رمز مدير محفوظ. اكتب رمزًا جديدًا فقط عند الحاجة للتغيير.' : 'اضبط رمز المدير لاعتماد التعديلات الحساسة.'}</div>
            </Field>
            <Field label="النسخ الاحتياطي التلقائي">
              <select {...form.register('autoBackup')} disabled={mutation.isPending || !canManageSettings}>
                <option value="on">مفعل</option>
                <option value="off">متوقف</option>
              </select>
            </Field>
            <Field label="رفع الشعار">
              <input
                type="file"
                accept="image/*"
                disabled={mutation.isPending || !canManageSettings}
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
            </Field>
          </div>

          <section className="panel page-stack">
            <div>
              <strong>موديول الملابس</strong>
              <div className="muted small">فعّل خصائص الملابس داخل شاشة الأصناف فقط. عند الإيقاف ستعود شاشة الإضافة والتعديل إلى وضع الصنف العادي بدون لون/مقاس/موديل ملابس.</div>
            </div>
            <div className="form-grid three-col-form">
              <label style={printCheckboxStyle}>
                <input type="checkbox" {...form.register('clothingModuleEnabled')} disabled={mutation.isPending || !canManageSettings} />
                تفعيل خصائص الملابس داخل شاشة الأصناف
              </label>
              <Field label="الصنف الافتراضي عند الضغط على إضافة صنف">
                <select {...form.register('defaultProductKind')} disabled={mutation.isPending || !canManageSettings || !clothingModuleEnabled}>
                  <option value="standard">صنف عادي</option>
                  <option value="fashion">موديل ملابس</option>
                </select>
                <div className="muted small">يحدد النوع الذي يظهر أولًا في نموذج الإضافة. ما زال بإمكانك تغييره يدويًا داخل الشاشة نفسها طالما موديول الملابس مفعّل.</div>
              </Field>
            </div>
          </section>

          <section className="panel page-stack">
            <div>
              <strong>عناصر الطباعة</strong>
              <div className="muted small">اختر ما تريد إظهاره في الفاتورة أو الإيصال. مناسب للمتاجر التي لا تستخدم ضريبة أو لا تحتاج كل التفاصيل.</div>
            </div>
            <div style={printCheckboxGridStyle}>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printCompactReceipt')} disabled={mutation.isPending || !canManageSettings} />وضع إيصال مضغوط لتوفير الورق</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowLogo')} disabled={mutation.isPending || !canManageSettings} />إظهار الشعار</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowPhone')} disabled={mutation.isPending || !canManageSettings} />إظهار الهاتف</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowAddress')} disabled={mutation.isPending || !canManageSettings} />إظهار العنوان</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowTaxNumber')} disabled={mutation.isPending || !canManageSettings} />إظهار الرقم الضريبي</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowCustomer')} disabled={mutation.isPending || !canManageSettings} />إظهار العميل</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowCashier')} disabled={mutation.isPending || !canManageSettings} />إظهار الكاشير</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowBranch')} disabled={mutation.isPending || !canManageSettings} />إظهار الفرع</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowLocation')} disabled={mutation.isPending || !canManageSettings} />إظهار الموقع</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowTax')} disabled={mutation.isPending || !canManageSettings} />إظهار الضريبة</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowPaymentMethod')} disabled={mutation.isPending || !canManageSettings} />إظهار طريقة الدفع</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowItemSummary')} disabled={mutation.isPending || !canManageSettings} />إظهار عدد البنود والقطع</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowPaymentBreakdown')} disabled={mutation.isPending || !canManageSettings} />إظهار تفصيل المدفوعات</label>
              <label style={printCheckboxStyle}><input type="checkbox" {...form.register('printShowFooter')} disabled={mutation.isPending || !canManageSettings} />إظهار التذييل</label>
            </div>
          </section>
        </div>
      ) : null}
      <div className="actions compact-actions sticky-form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => form.setValue('logoData', '', { shouldDirty: true })} disabled={mutation.isPending || !form.watch('logoData')}>حذف الشعار</button>
        <button type="button" className="btn btn-secondary" onClick={() => { if (canNavigateAway()) form.reset(); }} disabled={mutation.isPending || !form.formState.isDirty}>تفريغ التغييرات</button>
      </div>
      <DraftStateNotice visible={form.formState.isDirty && !mutation.isPending} title="تغييرات غير محفوظة" hint="احفظ التعديلات أو أعد ضبطها قبل مغادرة الشاشة." />
      {!canManageSettings ? <div className="muted small">هذا الحساب يملك صلاحية عرض الإعدادات فقط بدون تعديل.</div> : null}
      <MutationFeedback isError={mutation.isError} isSuccess={mutation.isSuccess} error={mutation.error} errorFallback="تعذر حفظ الإعدادات" successText="تم حفظ الإعدادات بنجاح." />
      <SubmitButton type="submit" disabled={mutation.isPending || !canManageSettings} idleText={setupMode ? 'حفظ والانتقال للخطوة التالية' : 'حفظ الإعدادات'} pendingText="جارٍ الحفظ..." />
    </form>
  );
}
