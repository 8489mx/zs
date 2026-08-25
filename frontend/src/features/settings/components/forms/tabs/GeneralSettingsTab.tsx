import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { Branch, Location } from '@/types/domain';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { readFileAsDataUrl, RequiredField, comboListStyle, comboRowStyle, comboCreateStyle } from '@/features/settings/components/forms/settings-forms.shared';
import { CustomSelect } from '@/shared/ui/custom-select';
import { ProductIcon } from '@/shared/components/icons/product-svg-catalog';
import { useAuthStore } from '@/stores/auth-store';
import { applyAccentColorToDocument } from '@/lib/theme';

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginInlineEnd: '3px' }}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const INDUSTRY_OPTIONS = [
  { value: 'general', label: 'تجارة عامة ومتنوعة (افتراضي)', icon: <ProductIcon name="box-package" size={16} /> },
  { value: 'spices', label: 'عطارة وبقوليات ومحامص', icon: <ProductIcon name="herb-leaf" size={16} /> },
  { value: 'fashion', label: 'ملابس وأحذية وأزياء', icon: <ProductIcon name="tshirt" size={16} /> },
  { value: 'perfumes', label: 'عطور ومستحضرات تجميل ومنظفات', icon: <ProductIcon name="perfume-spray" size={16} /> },
  { value: 'pharmacy', label: 'صيدلية ومستلزمات طبية', icon: <ProductIcon name="pill-capsule" size={16} /> },
  { value: 'electronics', label: 'موبايلات وإلكترونيات وصيانة', icon: <ProductIcon name="smartphone" size={16} /> },
  { value: 'supermarket', label: 'سوبر ماركت وبقالة وأغذية', icon: <ProductIcon name="cart-shopping" size={16} /> },
  { value: 'cafe', label: 'كافيهات ومطاعم وسناك', icon: <ProductIcon name="coffee-cup" size={16} /> },
];

function applyIndustryAutomation(
  industry: string,
  setValue: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>['setValue']
) {
  setValue('businessIndustry', industry as any, { shouldDirty: true, shouldValidate: true });

  switch (industry) {
    case 'spices':
      setValue('clothingModuleEnabled', true, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', true, { shouldDirty: true });
      setValue('weightedBarcodeEnabled', true, { shouldDirty: true });
      setValue('defaultProductKind', 'standard', { shouldDirty: true });
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('enableMobileStoreFeatures', false, { shouldDirty: true });
      setValue('enablePharmacyModule', false, { shouldDirty: true });
      setValue('restaurantModuleEnabled', false, { shouldDirty: true });
      break;

    case 'supermarket':
      setValue('weightedBarcodeEnabled', true, { shouldDirty: true });
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('defaultProductKind', 'standard', { shouldDirty: true });
      setValue('clothingModuleEnabled', false, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', false, { shouldDirty: true });
      setValue('enableMobileStoreFeatures', false, { shouldDirty: true });
      setValue('enablePharmacyModule', false, { shouldDirty: true });
      setValue('restaurantModuleEnabled', false, { shouldDirty: true });
      break;

    case 'fashion':
      setValue('clothingModuleEnabled', true, { shouldDirty: true });
      setValue('defaultProductKind', 'fashion', { shouldDirty: true });
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('weightedBarcodeEnabled', false, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', false, { shouldDirty: true });
      setValue('enableMobileStoreFeatures', false, { shouldDirty: true });
      setValue('enablePharmacyModule', false, { shouldDirty: true });
      setValue('restaurantModuleEnabled', false, { shouldDirty: true });
      break;

    case 'perfumes':
      setValue('clothingModuleEnabled', true, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', true, { shouldDirty: true });
      setValue('defaultProductKind', 'fashion', { shouldDirty: true });
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('weightedBarcodeEnabled', false, { shouldDirty: true });
      setValue('enableMobileStoreFeatures', false, { shouldDirty: true });
      setValue('enablePharmacyModule', false, { shouldDirty: true });
      setValue('restaurantModuleEnabled', false, { shouldDirty: true });
      break;

    case 'pharmacy':
      setValue('enablePharmacyModule', true, { shouldDirty: true });
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('defaultProductKind', 'standard', { shouldDirty: true });
      setValue('clothingModuleEnabled', false, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', false, { shouldDirty: true });
      setValue('enableMobileStoreFeatures', false, { shouldDirty: true });
      setValue('restaurantModuleEnabled', false, { shouldDirty: true });
      break;

    case 'electronics':
      setValue('enableMobileStoreFeatures', true, { shouldDirty: true });
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('defaultProductKind', 'standard', { shouldDirty: true });
      setValue('clothingModuleEnabled', false, { shouldDirty: true });
      setValue('enablePharmacyModule', false, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', false, { shouldDirty: true });
      setValue('restaurantModuleEnabled', false, { shouldDirty: true });
      break;

    case 'cafe':
      setValue('restaurantModuleEnabled', true, { shouldDirty: true });
      setValue('posKitchenPrinterEnabled', true, { shouldDirty: true });
      setValue('defaultPosMode', 'touch', { shouldDirty: true });
      setValue('defaultProductKind', 'standard', { shouldDirty: true });
      setValue('clothingModuleEnabled', false, { shouldDirty: true });
      setValue('enableMobileStoreFeatures', false, { shouldDirty: true });
      setValue('enablePharmacyModule', false, { shouldDirty: true });
      setValue('manufacturingModuleEnabled', false, { shouldDirty: true });
      break;

    case 'general':
    default:
      setValue('defaultPosMode', 'scanner', { shouldDirty: true });
      setValue('defaultProductKind', 'standard', { shouldDirty: true });
      break;
  }
}

function getIndustrySummary(industry: string): string {
  switch (industry) {
    case 'spices':
      return 'تم تفعيل خلطات وتصنيع التوابل + موديول المتغيرات والأوزان + باركود الميزان الإلكتروني.';
    case 'supermarket':
      return 'تم تفعيل باركود الميزان الإلكتروني + وضع الكاشير السريع (Scanner).';
    case 'fashion':
      return 'تم تفعيل موديول الملابس والمقاسات + مصفوفة الأصناف المتغيرة تلقائياً.';
    case 'perfumes':
      return 'تم تفعيل موديول تركيبات العطور + متغيرات الأحجام والعبوات تلقائياً.';
    case 'pharmacy':
      return 'تم تفعيل موديول الصيدلية والأدوية وتتبع تواريخ الصلاحية.';
    case 'electronics':
      return 'تم تفعيل موديول صيانة الموبايل وتتبع أرقام السيريال والـ IMEI.';
    case 'cafe':
      return 'تم تفعيل موديول المطاعم والكافيهات + طابعة المطبخ + شاشة اللمس.';
    case 'general':
    default:
      return 'الوضع القياسي المتوازن لكافة الأنشطة التجارية المتنوعة.';
  }
}

interface GeneralTabProps {
  form: UseFormReturn<SettingsFormInput, undefined, SettingsFormOutput>;
  branches?: Branch[];
  locations?: Location[];
  canManageSettings: boolean;
  disabled: boolean;
  activeTab: string;
  branchQuery: string;
  setBranchQuery: (val: string) => void;
  filteredBranches: Branch[];
  selectedBranch?: Branch;
  stockMode: 'single_location' | 'all_operational_locations';
  setStockMode: (val: 'single_location' | 'all_operational_locations') => void;
  defaultStockLocationId: string;
  setDefaultStockLocationId: (val: string) => void;
  allowExternalSalesStock: boolean;
  setAllowExternalSalesStock: (val: boolean) => void;
  branchStockSaving: boolean;
  setBranchStockSaving: (val: boolean) => void;
  branchStockSaved: boolean;
  setBranchStockSaved: (val: boolean) => void;
  branchStockError: string | null;
  setBranchStockError: (val: string | null) => void;
  branchStockDirty: boolean;
  setBranchStockDirty: (val: boolean) => void;
  branchMenuOpen: boolean;
  setBranchMenuOpen: (val: boolean) => void;
  branchMenuHasContent: boolean;
  branchCreateOptionVisible: boolean;
  commitSelectedBranch: (branchId: string, branchName?: string) => void;
  setBranchPrefillName: (val: string) => void;
  setShowBranchQuickAdd: (val: boolean) => void;
  visibleLocations?: Location[];
  onUpdateBranch?: (id: any, data: any) => Promise<any>;
}

export function GeneralSettingsTab({
  form,
  canManageSettings,
  disabled,
  activeTab,
  branchQuery,
  setBranchQuery,
  filteredBranches,
  selectedBranch,
  stockMode,
  setStockMode,
  defaultStockLocationId,
  setDefaultStockLocationId,
  allowExternalSalesStock,
  setAllowExternalSalesStock,
  branchStockSaving,
  setBranchStockSaving,
  branchStockSaved,
  setBranchStockSaved,
  branchStockError,
  setBranchStockError,
  branchStockDirty,
  setBranchStockDirty,
  branchMenuOpen,
  setBranchMenuOpen,
  branchMenuHasContent,
  branchCreateOptionVisible,
  commitSelectedBranch,
  setBranchPrefillName,
  setShowBranchQuickAdd,
  visibleLocations = [],
  locations = [],
  onUpdateBranch,
}: GeneralTabProps) {
  const storeName = form.watch('storeName');
  const brandName = form.watch('brandName');
  const accentColor = form.watch('accentColor') || '#170c5c';
  const logoData = form.watch('logoData');
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (accentColor) {
      applyAccentColorToDocument(accentColor);
    }
  }, [accentColor]);

  if (activeTab !== 'general') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top 2-Column Balanced Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: الهوية وبيانات النشاط (Store Identity & Basic Info) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                الهوية وبيانات النشاط
              </strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>الاسم والشعار وبيانات التواصل المطبوعة</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
              الهوية
            </span>
          </div>

          {/* Interactive Logo & Brand Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
          }}>
            {/* Logo Preview box */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '8px',
              border: `2px solid ${accentColor}`,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              {logoData ? (
                <img src={logoData} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: accentColor }}>
                  {(storeName || brandName || 'Z').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            {/* Brand details + upload trigger */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {storeName || 'اسم النشاط / المتجر'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {brandName || 'Z Systems'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <label style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}>
                  {logoData ? 'تغيير الشعار' : 'رفع شعار'}
                  <input
                    type="file"
                    style={{ display: 'none' }}
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

                {logoData && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => form.setValue('logoData', '', { shouldDirty: true, shouldValidate: true })}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#b91c1c',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <RequiredField label="اسم النشاط / المتجر" error={form.formState.errors.storeName?.message}>
              <input
                className="purchase-prototype-field-input"
                placeholder="مثال: محلات رجب العطار"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                {...form.register('storeName')}
                disabled={disabled}
                style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </RequiredField>

            <div className="field">
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>نوع النشاط التجاري الرئيسي للمنشأة</span>
                {!isSuperAdmin ? (
                  <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                    <LockIcon size={11} /> خاص بإدارة المنصة
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>يضبط الموديولات والأدوات تلقائياً</span>
                )}
              </label>
              <CustomSelect
                value={form.watch('businessIndustry') || 'general'}
                onChange={(val) => applyIndustryAutomation(val, form.setValue)}
                options={INDUSTRY_OPTIONS}
                disabled={disabled || !isSuperAdmin}
                placeholder="اختر نوع النشاط..."
              />
              <div style={{ marginTop: '5px', fontSize: '0.74rem', color: '#475569', background: '#f8fafc', padding: '5px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                {getIndustrySummary(form.watch('businessIndustry') || 'general')}
                {!isSuperAdmin && (
                  <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#92400e', fontWeight: 600 }}>
                    ملاحظة: لتغيير نوع النشاط التجاري للمنشأة، يرجى التواصل مع إدارة المنصة (Super Admin).
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="field">
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>الهاتف</label>
                <input
                  className="purchase-prototype-field-input"
                  placeholder="010xxxxxxxx"
                  autoComplete="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  {...form.register('phone')}
                  disabled={disabled}
                  style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div className="field">
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>العنوان</label>
                <input
                  className="purchase-prototype-field-input"
                  placeholder="المدينة - الشارع"
                  autoComplete="off"
                  autoCorrect="off"
                  data-lpignore="true"
                  {...form.register('address')}
                  disabled={disabled}
                  style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            {/* Color Selection Inline */}
            <div className="field">
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>لون الواجهة المخصص</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => form.setValue('accentColor', e.target.value, { shouldDirty: true })}
                  disabled={disabled}
                  style={{ width: '38px', height: '36px', padding: '2px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  placeholder="#170c5c"
                  {...form.register('accentColor')}
                  disabled={disabled}
                  style={{ flex: 1, padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'monospace', direction: 'ltr' }}
                />
                <button
                  type="button"
                  onClick={() => form.setValue('accentColor', '#170c5c', { shouldDirty: true })}
                  disabled={disabled}
                  style={{ padding: '7px 10px', fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  الافتراضي
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: إعدادات التشغيل والفرع والمخزون (Store Operations & Stock) */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                إعدادات التشغيل والمخزون
              </strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>الفرع الرئيسي ومخازن ونمط الكاشير</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 600 }}>
              التشغيل
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Branch Selector */}
            {SINGLE_STORE_MODE ? (
              <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
                <input
                  className="purchase-prototype-field-input"
                  value={selectedBranch?.name || 'سيتم الربط تلقائيًا بعد حفظ بيانات النشاط الرئيسي'}
                  disabled
                  readOnly
                  style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                />
              </RequiredField>
            ) : (
              <RequiredField label="الفرع الرئيسي" error={form.formState.errors.currentBranchId?.message}>
                <div style={{ position: 'relative' }}>
                  <input
                    className="purchase-prototype-field-input"
                    value={branchQuery}
                    placeholder="ابحث أو اكتب اسم فرع جديد لإضافته"
                    name="settings_branch_search"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    role="combobox"
                    aria-expanded={branchMenuOpen}
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
                    style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                  />
                  {branchMenuOpen && branchMenuHasContent ? (
                    <div style={{ ...comboListStyle, position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20 }}>
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
                </div>
              </RequiredField>
            )}

            {/* Receiving Location & Cashier Mode Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <RequiredField label="مكان الاستلام الافتراضي" error={form.formState.errors.currentLocationId?.message}>
                {visibleLocations.length === 0 ? (
                  <div style={{ padding: '6px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.78rem' }}>
                    لا توجد أماكن مخزون.
                  </div>
                ) : (
                  <select
                    className="purchase-prototype-field-input"
                    {...form.register('currentLocationId')}
                    disabled={disabled}
                    style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- اختر المخزن --</option>
                    {visibleLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                )}
              </RequiredField>

              <div className="field">
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>نمط الكاشير الافتراضي</label>
                <select
                  className="purchase-prototype-field-input"
                  {...form.register('defaultPosMode')}
                  disabled={disabled}
                  style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="scanner">سكانر باركود</option>
                  <option value="touch">لمس (تاتش)</option>
                </select>
              </div>
            </div>

            {/* Sales Stock Source (Branch-level stock settings) */}
            {selectedBranch && onUpdateBranch && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                marginTop: '4px',
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  مصدر مخزون البيع للفرع ({selectedBranch.name})
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>نطاق المخزون</label>
                    <select
                      value={stockMode}
                      disabled={!canManageSettings || branchStockSaving}
                      onChange={(e) => { setStockMode(e.target.value as any); setBranchStockDirty(true); setBranchStockSaved(false); }}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                    >
                      <option value="single_location">مخزن محدد</option>
                      <option value="all_operational_locations">كل المخازن التشغيلية</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>مخزن البيع الأساسي</label>
                    <select
                      value={defaultStockLocationId}
                      disabled={!canManageSettings || branchStockSaving}
                      onChange={(e) => { setDefaultStockLocationId(e.target.value); setBranchStockDirty(true); setBranchStockSaved(false); }}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                    >
                      <option value="">-- غير محدد --</option>
                      {locations.filter((loc) => !loc.branchId || loc.branchId === selectedBranch.id).map((loc) => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {stockMode === 'all_operational_locations' && (
                  <div style={{ marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={allowExternalSalesStock}
                        disabled={!canManageSettings || branchStockSaving}
                        onChange={(e) => { setAllowExternalSalesStock(e.target.checked); setBranchStockDirty(true); setBranchStockSaved(false); }}
                      />
                      السماح بالبيع من المخازن الخارجية
                    </label>
                  </div>
                )}

                {branchStockDirty && canManageSettings && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      disabled={branchStockSaving}
                      onClick={async () => {
                        if (!selectedBranch) return;
                        setBranchStockSaving(true);
                        setBranchStockError(null);
                        try {
                          await onUpdateBranch(selectedBranch.id, {
                            name: selectedBranch.name || '',
                            code: selectedBranch.code || '',
                            defaultStockLocationId: defaultStockLocationId || undefined,
                            salesStockMode: stockMode,
                            allowExternalSalesStock,
                          });
                          setBranchStockSaved(true);
                          setBranchStockDirty(false);
                        } catch {
                          setBranchStockError('تعذر حفظ إعدادات المخزون.');
                        } finally {
                          setBranchStockSaving(false);
                        }
                      }}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: '#0f172a',
                        color: '#ffffff',
                        border: 'none',
                        cursor: branchStockSaving ? 'wait' : 'pointer',
                      }}
                    >
                      {branchStockSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات مخزون الفرع'}
                    </button>
                  </div>
                )}

                {branchStockSaved && <div style={{ color: '#16a34a', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>✓ تم حفظ إعدادات مخزون البيع بنجاح.</div>}
                {branchStockError && <div style={{ color: '#dc2626', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{branchStockError}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: التفضيلات والمنطقة والتواصل (Regional & Preferences) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <div>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
              اللغة والمنطقة والتواصل
            </strong>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>العملة، التوقيت، وتنسيق التواريخ والواتساب</span>
          </div>
          <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600 }}>
            التفضيلات
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>لغة النظام</label>
            <select className="purchase-prototype-field-input" {...form.register('uiLanguage')} disabled={disabled} style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="ar">العربية</option>
              <option value="en" disabled>English (قريباً)</option>
            </select>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>العملة</label>
            <select className="purchase-prototype-field-input" {...form.register('currency')} disabled={disabled} style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>المنطقة الزمنية</label>
            <select className="purchase-prototype-field-input" {...form.register('timezone')} disabled={disabled} style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="Africa/Cairo">Africa/Cairo</option>
              <option value="Asia/Riyadh">Asia/Riyadh</option>
              <option value="Asia/Dubai">Asia/Dubai</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>صيغة التاريخ</label>
            <select className="purchase-prototype-field-input" {...form.register('dateFormat')} disabled={disabled} style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="yyyy-MM-dd">2026-06-07 (ISO)</option>
              <option value="dd/MM/yyyy">07/06/2026</option>
            </select>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>صيغة الوقت</label>
            <select className="purchase-prototype-field-input" {...form.register('timeFormat')} disabled={disabled} style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="24h">24 ساعة</option>
              <option value="12h">12 ساعة (ص/م)</option>
            </select>
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>رابط إرسال الواتساب</label>
            <select className="purchase-prototype-field-input" {...form.register('whatsappLinkMode')} disabled={disabled} style={{ padding: '7px 10px', fontSize: '0.84rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="wa_me">افتراضي (يسأل المستخدم)</option>
              <option value="web">واتساب ويب مباشرة</option>
              <option value="app">تطبيق الواتساب مباشرة</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
