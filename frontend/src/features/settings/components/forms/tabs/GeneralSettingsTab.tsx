import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { SettingsFormInput, SettingsFormOutput } from '@/features/settings/schemas/settings.schema';
import type { Branch, Location } from '@/types/domain';
import { SUPPORTED_CURRENCIES } from '@/lib/currencies';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { readFileAsDataUrl, RequiredField, comboListStyle, comboRowStyle, comboCreateStyle } from '@/features/settings/components/forms/settings-forms.shared';
import { applyAccentColorToDocument } from '@/lib/theme';
import { ShieldCheckIcon } from '@/shared/components/icons/AppIcons';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import { CustomSelect } from '@/shared/ui/custom-select';

function getPillarBadgeInfo(rawActivity?: string | null, pillar?: string | null) {
  const norm = String(rawActivity || pillar || 'retail_general').trim().toLowerCase();
  if (norm === 'contracting' || norm === 'construction' || norm === 'مقاولات') {
    return {
      shortTitle: 'قطاع المقاولات',
      title: 'قطاع المقاولات وإدارة المشاريع الإنشائية',
      badge: 'مشاريع ومقايسات',
      desc: 'بيئة عمل متكاملة للمشاريع والمقايسات (BOQ) والمستخلصات وعقود مقاولي الباطن والمشتريات والمخازن والحسابات.',
      color: '#0284c7',
      bg: '#f0f9ff',
      borderColor: '#bae6fd',
    };
  }
  if (norm === 'maritime_freight' || norm === 'maritime' || norm === 'freight' || norm === 'shipping' || norm === 'شحن') {
    return {
      shortTitle: 'قطاع الشحن',
      title: 'قطاع الشحن البحري واللوجستيات',
      badge: 'نولون وحاويات',
      desc: 'بيئة عمل متكاملة للخطوط الملاحية، الموانئ، مقارنة أسعار النولون (RFQ)، أوامر التشغيل وتتبع الحاويات.',
      color: '#0d9488',
      bg: '#f0fdfa',
      borderColor: '#99f6e4',
    };
  }
  if (norm === 'pharmacy' || norm === 'صيدلية') {
    return {
      shortTitle: 'قطاع التجارة',
      title: 'قطاع التجارة: صيدليات ومستلزمات طبية',
      badge: 'صيدليات FEFO',
      desc: 'إدارة متكاملة للأدوية والبدائل، تتبع التشغيلات وتواريخ انتهاء الصلاحية، والروشتات.',
      color: '#16a34a',
      bg: '#f0fdf4',
      borderColor: '#bbf7d0',
    };
  }
  if (norm === 'restaurant' || norm === 'cafe' || norm === 'مطعم') {
    return {
      shortTitle: 'قطاع التجارة',
      title: 'قطاع التجارة: مطاعم وكافيهات وضيافة',
      badge: 'مطاعم KDS',
      desc: 'إدارة متكاملة لشاشات المطبخ، خيارات الوجبات والإضافات، والصالات ونقاط البيع.',
      color: '#ea580c',
      bg: '#fff7ed',
      borderColor: '#fed7aa',
    };
  }
  if (norm === 'manufacturing' || norm === 'تصنيع') {
    return {
      shortTitle: 'قطاع التصنيع',
      title: 'قطاع التجارة: تصنيع وخطوط إنتاج خفيف',
      badge: 'تصنيع BOM',
      desc: 'إدارة متكاملة لقوائم المكونات (BOM)، أوامر التشغيل والإنتاج، وحساب التكاليف الصناعية.',
      color: '#7c3aed',
      bg: '#f5f3ff',
      borderColor: '#ddd6fe',
    };
  }
  if (norm === 'maintenance' || norm === 'electronics' || norm === 'صيانة') {
    return {
      shortTitle: 'قطاع التجارة',
      title: 'قطاع التجارة: مراكز صيانة وخدمة أجهزة',
      badge: 'كروت صيانة',
      desc: 'إدارة متكاملة لكروت فحص واستلام الأجهزة، قطع الغيار المستهلكة، وتتبع أرقام السيريال.',
      color: '#2563eb',
      bg: '#eff6ff',
      borderColor: '#bfdbfe',
    };
  }
  if (norm === 'auto_parts' || norm === 'autoparts' || norm === 'قطع_غيار') {
    return {
      shortTitle: 'قطاع التجارة',
      title: 'قطاع التجارة: قطع غيار ومعدات',
      badge: 'قطع غيار',
      desc: 'إدارة متكاملة لأكواد قطع الغيار، سنة الصنع، والموديلات المتوافقة.',
      color: '#b45309',
      bg: '#fffbeb',
      borderColor: '#fde68a',
    };
  }
  if (norm === 'import_export' || norm === 'import' || norm === 'استيراد') {
    return {
      shortTitle: 'قطاع التجارة',
      title: 'قطاع التجارة: استيراد وتصدير وشراكة',
      badge: 'استيراد وتصدير',
      desc: 'إدارة متكاملة للشحنات الاستيرادية وتكاليف الوصول ومستندات الشحن.',
      color: '#0369a1',
      bg: '#f0f9ff',
      borderColor: '#bae6fd',
    };
  }
  if (norm === 'clothing' || norm === 'fashion' || norm === 'ملابس') {
    return {
      shortTitle: 'قطاع التجارة',
      title: 'قطاع التجارة: أزياء وملابس ومقاسات',
      badge: 'ملابس ومقاسات',
      desc: 'إدارة متكاملة للمقاسات والألوان وتوليد الباركود التلقائي للمصفوفة.',
      color: '#db2777',
      bg: '#fdf2f8',
      borderColor: '#fbcfe8',
    };
  }
  return {
    shortTitle: 'قطاع التجارة',
    title: 'قطاع التجارة وإدارة الأعمال العامة',
    badge: 'تجزئة ومستودعات',
    desc: 'إدارة متكاملة لنقاط البيع السريعة، المخازن والمستودعات، المشتريات، والحسابات المالية.',
    color: '#170e5e',
    bg: '#eef2ff',
    borderColor: '#c7d2fe',
  };
}

function getIndustrySummary(ind?: string) {
  const norm = String(ind || 'general').trim().toLowerCase();
  switch (norm) {
    case 'contracting':
    case 'construction':
    case 'مقاولات':
      return 'قطاع المقاولات وإدارة المشاريع الإنشائية';
    case 'maritime_freight':
    case 'maritime':
    case 'freight':
    case 'shipping':
    case 'شحن':
      return 'قطاع الشحن البحري واللوجستيات';
    case 'fashion':
      return 'موديول الملابس والمقاسات ومصفوفة الأصناف';
    case 'perfumes':
      return 'موديول تركيبات العطور والعبوات';
    case 'pharmacy':
    case 'صيدلية':
      return 'موديول الصيدلية والأدوية وتواريخ الصلاحية (FEFO)';
    case 'electronics':
    case 'maintenance':
    case 'صيانة':
      return 'موديول كروت الصيانة والأجهزة والسيريال والـ IMEI';
    case 'cafe':
    case 'restaurant':
    case 'مطعم':
      return 'موديول المطاعم والكافيهات وشاشات المطبخ (KDS)';
    case 'manufacturing':
    case 'تصنيع':
      return 'موديول التصنيع وقوائم المكونات (BOM)';
    case 'general':
    default:
      return 'النشاط التجاري القياسي وإدارة الأعمال العامة';
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
  const isSuperAdmin = isPlatformAdmin(user) || (user?.role === 'super_admin' && String(user?.username || '').trim().toLowerCase() === 'zs');
  const tenant = useAuthStore((s) => s.tenant);
  const businessIndustry = form.watch('businessIndustry');

  useEffect(() => {
    if (accentColor) {
      applyAccentColorToDocument(accentColor);
    }
  }, [accentColor]);

  const rawAct = String(businessIndustry || tenant?.activityType || 'retail_general').trim().toLowerCase();
  const isContractingVertical = rawAct === 'contracting' || rawAct === 'construction' || rawAct === 'مقاولات' || Boolean(form.watch('contractingModuleEnabled'));
  const isMaritimeVertical = rawAct === 'maritime_freight' || rawAct === 'maritime' || rawAct === 'freight' || rawAct === 'shipping' || rawAct === 'شحن' || Boolean(form.watch('maritimeFreightModuleEnabled'));
  const isManufacturingVertical = rawAct === 'manufacturing' || rawAct === 'production' || rawAct === 'تصنيع' || rawAct === 'مصنع' || Boolean(form.watch('manufacturingModuleEnabled'));
  const isServicesVertical = rawAct === 'services' || rawAct === 'consulting' || rawAct === 'استشارات';
  const isImportVertical = rawAct === 'import_export' || rawAct === 'import';
  const isRestaurantVertical = ['restaurant', 'cafe', 'مطعم', 'كافيه'].includes(rawAct) || Boolean(form.watch('restaurantModuleEnabled'));
  const isPharmacyVertical = ['pharmacy', 'صيدلية', 'صيدليات'].includes(rawAct) || Boolean(form.watch('enablePharmacyModule'));
  const isClothingVertical = ['clothing', 'fashion', 'ملابس', 'أزياء'].includes(rawAct) || Boolean(form.watch('clothingModuleEnabled'));
  const isAutoPartsVertical = ['auto_parts', 'autoparts', 'قطع_غيار', 'قطع غيار'].includes(rawAct) || Boolean(form.watch('autoPartsModuleEnabled'));
  const isMaintenanceVertical = ['maintenance', 'electronics', 'صيانة'].includes(rawAct) || Boolean(form.watch('enableMobileStoreFeatures'));
  const isNonPosVertical = isContractingVertical || isMaritimeVertical || isServicesVertical || isManufacturingVertical;

  const storeNameLabel = isContractingVertical
    ? 'اسم شركة المقاولات / المؤسسة'
    : isMaritimeVertical
    ? 'اسم شركة الشحن والتوكيلات الملاحية'
    : isManufacturingVertical
    ? 'اسم المصنع / المنشأة الصناعية'
    : isImportVertical
    ? 'اسم شركة الاستيراد والتصدير'
    : isServicesVertical
    ? 'اسم المكتب / الشركة الاستشارية والخدمية'
    : isRestaurantVertical
    ? 'اسم المطعم / الكافيه'
    : isPharmacyVertical
    ? 'اسم الصيدلية / المؤسسة العلاجية'
    : isClothingVertical
    ? 'اسم المتجر / بوتيك الأزياء'
    : isAutoPartsVertical
    ? 'اسم المركز / محل قطع الغيار'
    : isMaintenanceVertical
    ? 'اسم المركز / محل صيانة الأجهزة'
    : 'اسم النشاط / المتجر';

  const storeNamePlaceholder = isContractingVertical
    ? 'مثال: شركة المقاولات والإنشاءات الحديثة'
    : isMaritimeVertical
    ? 'مثال: شركة الملاحة والخدمات اللوجستية'
    : isManufacturingVertical
    ? 'مثال: مصنع النور للصناعات والتجميع'
    : isImportVertical
    ? 'مثال: المجموعة الدولية للاستيراد والتصدير'
    : isServicesVertical
    ? 'مثال: المجموعة الاستشارية للأعمال'
    : isRestaurantVertical
    ? 'مثال: مطعم وكافيه الشرق'
    : isPharmacyVertical
    ? 'مثال: صيدليات الحياة الكبرى'
    : isClothingVertical
    ? 'مثال: دار النخبة للأزياء والملابس'
    : isAutoPartsVertical
    ? 'مثال: المركز المعتمد لقطع غيار السيارات'
    : isMaintenanceVertical
    ? 'مثال: مركز التقنية لصيانة الأجهزة والموبايل'
    : 'مثال: محلات رجب العطار';

  const locationFieldLabel = isContractingVertical
    ? 'مخزن الموقع / التشوين الافتراضي'
    : 'مكان الاستلام الافتراضي';

  const info = getPillarBadgeInfo(rawAct, tenant?.pillar);

  return (
    <div style={{ display: activeTab === 'general' ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
      {/* Top 2-Column Balanced Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: '16px' }}>
        
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
          {/* Section Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                الهوية وبيانات النشاط
              </strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>الاسم والشعار وبيانات التواصل المطبوعة</span>
            </div>
          </div>

          {/* Interactive Logo & Brand Header with Operational Sector Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            flexWrap: 'wrap',
          }}>
            {/* Right: Logo Preview box + Brand details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
              {/* Logo Preview box */}
              <div style={{
                width: '50px',
                height: '50px',
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
                  <span style={{ fontSize: '1.3rem', fontWeight: 900, color: accentColor }}>
                    {(storeName || brandName || 'Z').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Brand details + upload trigger */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {storeName || 'اسم النشاط / المتجر'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {brandName || 'Z Systems'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
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

            {/* Left: Compact Enterprise Sector & Activity Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: info.bg,
                border: `1px solid ${info.borderColor}`,
                borderRadius: '8px',
                padding: '5px 10px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
              title={
                isSuperAdmin
                  ? 'وضع السوبر أدمن: التعديل متاح من تبويب تخصيص المنظومة والنشاط'
                  : 'نمط معتمد ومثبت للمنشأة لحماية سلامة القيود'
              }
            >
              <ShieldCheckIcon size={14} color={info.color} />
              <strong style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 800 }}>
                {info.shortTitle || info.title}
              </strong>
              <span
                style={{
                  fontSize: '0.66rem',
                  background: '#ffffff',
                  color: info.color,
                  border: `1px solid ${info.borderColor}`,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                {info.badge}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <RequiredField label={storeNameLabel} error={form.formState.errors.storeName?.message}>
              <input
                className="purchase-prototype-field-input"
                placeholder={storeNamePlaceholder}
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
                <span>نشاط المنشأة والقطاع الفعال</span>
                <span style={{ fontSize: '0.7rem', background: info.bg, color: info.color, border: `1px solid ${info.borderColor}`, padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {info.badge}
                </span>
              </label>
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span>{getIndustrySummary(form.watch('businessIndustry') || rawAct)}</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>نمط معتمد ومثبت للمنشأة</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: isNonPosVertical ? '1fr' : '1fr 1fr', gap: '10px' }}>
              <RequiredField label={locationFieldLabel} error={form.formState.errors.currentLocationId?.message}>
                {visibleLocations.length === 0 ? (
                  <div style={{ padding: '6px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.78rem' }}>
                    لا توجد أماكن مخزون.
                  </div>
                ) : (
                  <CustomSelect
                    value={form.watch('currentLocationId') || ''}
                    onChange={(val) => form.setValue('currentLocationId', val, { shouldDirty: true, shouldValidate: true })}
                    options={[
                      { value: '', label: '-- اختر المخزن --' },
                      ...visibleLocations.map((loc) => ({ value: String(loc.id), label: loc.name })),
                    ]}
                    disabled={disabled}
                  />
                )}
              </RequiredField>

              {!isNonPosVertical && (
                <div className="field">
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>نمط الكاشير الافتراضي</label>
                  <CustomSelect
                    value={form.watch('defaultPosMode') || 'scanner'}
                    onChange={(val) => form.setValue('defaultPosMode', val as any, { shouldDirty: true, shouldValidate: true })}
                    options={[
                      { value: 'scanner', label: 'سكانر باركود' },
                      { value: 'touch', label: 'لمس (تاتش)' },
                    ]}
                    disabled={disabled}
                  />
                </div>
              )}
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
                    <CustomSelect
                      value={stockMode}
                      disabled={!canManageSettings || branchStockSaving}
                      onChange={(val) => { setStockMode(val as any); setBranchStockDirty(true); setBranchStockSaved(false); }}
                      options={[
                        { value: 'single_location', label: 'مخزن محدد' },
                        { value: 'all_operational_locations', label: 'كل المخازن التشغيلية' },
                      ]}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>مخزن البيع الأساسي</label>
                    <CustomSelect
                      value={defaultStockLocationId}
                      disabled={!canManageSettings || branchStockSaving}
                      onChange={(val) => { setDefaultStockLocationId(val); setBranchStockDirty(true); setBranchStockSaved(false); }}
                      options={[
                        { value: '', label: '-- غير محدد --' },
                        ...locations.filter((loc) => !loc.branchId || loc.branchId === selectedBranch.id).map((loc) => ({
                          value: String(loc.id),
                          label: loc.name,
                        })),
                      ]}
                    />
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

                {branchStockSaved && <div style={{ color: '#16a34a', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>تم حفظ إعدادات مخزون البيع بنجاح.</div>}
                {branchStockError && <div style={{ color: '#dc2626', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{branchStockError}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card: نمط تشغيل المنشأة ونطاق العمل (Facility Operation Mode) */}
      {!isContractingVertical && !isMaritimeVertical && !isManufacturingVertical && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                نمط تشغيل المنشأة ونطاق العمل (Operation Mode)
              </strong>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                اختر النمط المناسب لحجم نشاطك لضبط القوائم والواجهات؛ يتم تدوين القيود المحاسبية في الخلفية تلقائياً في كلا النمطين.
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              background: form.watch('enableEnterpriseFeatures') ? '#eff6ff' : '#f0fdf4',
              color: form.watch('enableEnterpriseFeatures') ? '#1d4ed8' : '#166534',
              border: `1px solid ${form.watch('enableEnterpriseFeatures') ? '#bfdbfe' : '#bbf7d0'}`,
              padding: '3px 10px',
              borderRadius: '6px',
            }}>
              {form.watch('enableEnterpriseFeatures') ? 'النمط المؤسسي المتقدم' : 'النمط التجاري المبسط'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
            {/* Option 1: Simple Retail Mode */}
            <div
              onClick={() => {
                if (disabled) return;
                form.setValue('enableEnterpriseFeatures', false, { shouldDirty: true, shouldValidate: true });
              }}
              style={{
                border: !form.watch('enableEnterpriseFeatures') ? '2px solid #170e5e' : '1px solid #e2e8f0',
                background: !form.watch('enableEnterpriseFeatures') ? '#f8fafc' : '#ffffff',
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: !form.watch('enableEnterpriseFeatures') ? '5px solid #170e5e' : '2px solid #cbd5e1',
                    boxSizing: 'border-box',
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>
                    محل تجاري ونقاط بيع مبسطة (Simple Retail)
                  </strong>
                </div>
                <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  موصى به للمحلات
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                واجهة رشيقة وسريعة للكاشير ونقاط البيع والفواتير المباشرة والمخزون، مع الخزينة والمصروفات اليومية. تخفي الشيكات والبنوك وقيود اليومية وأوامر الشراء والأرفف لمنع التشتيت وسرعة الإنجاز.
              </p>
            </div>

            {/* Option 2: Enterprise Trading Mode */}
            <div
              onClick={() => {
                if (disabled) return;
                form.setValue('enableEnterpriseFeatures', true, { shouldDirty: true, shouldValidate: true });
              }}
              style={{
                border: form.watch('enableEnterpriseFeatures') ? '2px solid #170e5e' : '1px solid #e2e8f0',
                background: form.watch('enableEnterpriseFeatures') ? '#f8fafc' : '#ffffff',
                borderRadius: '10px',
                padding: '14px 16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: form.watch('enableEnterpriseFeatures') ? '5px solid #170e5e' : '2px solid #cbd5e1',
                    boxSizing: 'border-box',
                    display: 'inline-block',
                    flexShrink: 0,
                  }} />
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 800 }}>
                    مؤسسة تجارية متقدمة (Enterprise Trading)
                  </strong>
                </div>
                <span style={{ fontSize: '0.7rem', background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  محاسبة متقدمة
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                تفعيل الدورة المستندية الكاملة: أوامر الشراء والبيع، عروض الأسعار (RFQ)، شجرة المخازن والأرفف، المحاسبة العامة، شجرة الحسابات، قيود اليومية، حافظة الشيكات (PDC)، والتسويات البنكية ومراكز التكلفة.
              </p>
            </div>
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
              اللغة والمنطقة والتواصل
            </strong>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>العملة، التوقيت، وتنسيق التواريخ والواتساب</span>
          </div>
          <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600, flexShrink: 0 }}>
            التفضيلات
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>لغة النظام</label>
            <CustomSelect
              value={form.watch('uiLanguage') || 'ar'}
              onChange={(val) => form.setValue('uiLanguage', val as any, { shouldDirty: true, shouldValidate: true })}
              options={[
                { value: 'ar', label: 'العربية' },
                { value: 'en', label: 'English (قريباً)' },
              ]}
              disabled={disabled}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>العملة</label>
            <CustomSelect
              value={form.watch('currency') || 'EGP'}
              onChange={(val) => form.setValue('currency', val, { shouldDirty: true, shouldValidate: true })}
              options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
              disabled={disabled}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>المنطقة الزمنية</label>
            <CustomSelect
              value={form.watch('timezone') || 'Africa/Cairo'}
              onChange={(val) => form.setValue('timezone', val, { shouldDirty: true, shouldValidate: true })}
              options={[
                { value: 'Africa/Cairo', label: 'مصر (Africa/Cairo)' },
                { value: 'Asia/Riyadh', label: 'السعودية (Asia/Riyadh)' },
                { value: 'Asia/Kuwait', label: 'الكويت (Asia/Kuwait)' },
                { value: 'Asia/Qatar', label: 'قطر (Asia/Qatar)' },
                { value: 'Asia/Dubai', label: 'الإمارات (Asia/Dubai)' },
                { value: 'Asia/Bahrain', label: 'البحرين (Asia/Bahrain)' },
                { value: 'Asia/Muscat', label: 'عُمان (Asia/Muscat)' },
                { value: 'UTC', label: 'التوقيت العالمي (UTC)' },
              ]}
              disabled={disabled}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>صيغة التاريخ</label>
            <CustomSelect
              value={form.watch('dateFormat') || 'dd/MM/yyyy'}
              onChange={(val) => form.setValue('dateFormat', val as any, { shouldDirty: true, shouldValidate: true })}
              options={[
                { value: 'yyyy-MM-dd', label: '2026-06-07 (ISO)' },
                { value: 'dd/MM/yyyy', label: '07/06/2026' },
              ]}
              disabled={disabled}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>صيغة الوقت</label>
            <CustomSelect
              value={form.watch('timeFormat') || '12h'}
              onChange={(val) => form.setValue('timeFormat', val as any, { shouldDirty: true, shouldValidate: true })}
              options={[
                { value: '24h', label: '24 ساعة' },
                { value: '12h', label: '12 ساعة (ص/م)' },
              ]}
              disabled={disabled}
            />
          </div>

          <div className="field">
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>رابط إرسال الواتساب</label>
            <CustomSelect
              value={form.watch('whatsappLinkMode') || 'wa_me'}
              onChange={(val) => form.setValue('whatsappLinkMode', val as any, { shouldDirty: true, shouldValidate: true })}
              options={[
                { value: 'wa_me', label: 'افتراضي (يسأل المستخدم)' },
                { value: 'web', label: 'واتساب ويب مباشرة' },
                { value: 'app', label: 'تطبيق الواتساب مباشرة' },
              ]}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
