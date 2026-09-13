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

function getPillarBadgeInfo(rawActivity?: string | null, pillar?: string | null) {
  const norm = String(rawActivity || pillar || 'retail_general').trim().toLowerCase();
  if (norm === 'contracting' || norm === 'construction' || norm === 'مقاولات') {
    return {
      title: 'قطاع المقاولات وإدارة المشاريع الإنشائية',
      badge: 'جناح مؤسسي شامل (Full Enterprise Suite)',
      desc: 'بيئة عمل متكاملة للمشاريع والمقايسات (BOQ) والمستخلصات وعقود مقاولي الباطن والمشتريات والمخازن والحسابات.',
      color: '#0284c7',
      bg: '#f0f9ff',
      borderColor: '#bae6fd',
    };
  }
  if (norm === 'maritime_freight' || norm === 'maritime' || norm === 'freight' || norm === 'shipping' || norm === 'شحن') {
    return {
      title: 'قطاع الشحن البحري واللوجستيات',
      badge: 'جناح مؤسسي شامل (Full Enterprise Suite)',
      desc: 'بيئة عمل متكاملة للخطوط الملاحية، الموانئ، مقارنة أسعار النولون (RFQ)، أوامر التشغيل وتتبع الحاويات.',
      color: '#0d9488',
      bg: '#f0fdfa',
      borderColor: '#99f6e4',
    };
  }
  if (norm === 'pharmacy' || norm === 'صيدلية') {
    return {
      title: 'قطاع التجارة: صيدليات ومستلزمات طبية',
      badge: 'نظام رقابي FEFO',
      desc: 'إدارة متكاملة للأدوية والبدائل، تتبع التشغيلات وتواريخ انتهاء الصلاحية، والروشتات.',
      color: '#16a34a',
      bg: '#f0fdf4',
      borderColor: '#bbf7d0',
    };
  }
  if (norm === 'restaurant' || norm === 'cafe' || norm === 'مطعم') {
    return {
      title: 'قطاع التجارة: مطاعم وكافيهات وضيافة',
      badge: 'KDS وشاشات المطبخ',
      desc: 'إدارة متكاملة لشاشات المطبخ، خيارات الوجبات والإضافات، والصالات ونقاط البيع.',
      color: '#ea580c',
      bg: '#fff7ed',
      borderColor: '#fed7aa',
    };
  }
  if (norm === 'manufacturing' || norm === 'تصنيع') {
    return {
      title: 'قطاع التجارة: تصنيع وخطوط إنتاج خفيف',
      badge: 'BOM وشجرة المنتج',
      desc: 'إدارة متكاملة لقوائم المكونات (BOM)، أوامر التشغيل والإنتاج، وحساب التكاليف الصناعية.',
      color: '#7c3aed',
      bg: '#f5f3ff',
      borderColor: '#ddd6fe',
    };
  }
  if (norm === 'maintenance' || norm === 'electronics' || norm === 'صيانة') {
    return {
      title: 'قطاع التجارة: مراكز صيانة وخدمة أجهزة',
      badge: 'كروت الصيانة و IMEI',
      desc: 'إدارة متكاملة لكروت فحص واستلام الأجهزة، قطع الغيار المستهلكة، وتتبع أرقام السيريال.',
      color: '#2563eb',
      bg: '#eff6ff',
      borderColor: '#bfdbfe',
    };
  }
  return {
    title: 'قطاع التجارة وإدارة الأعمال العامة',
    badge: 'تجزئة ومستودعات قياسية',
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
  const tenant = useAuthStore((s) => s.tenant);
  const businessIndustry = form.watch('businessIndustry');

  useEffect(() => {
    if (accentColor) {
      applyAccentColorToDocument(accentColor);
    }
  }, [accentColor]);

  const rawAct = String(tenant?.activityType || tenant?.pillar || businessIndustry || 'retail_general').trim().toLowerCase();
  const info = getPillarBadgeInfo(rawAct, tenant?.pillar);

  return (
    <div style={{ display: activeTab === 'general' ? 'flex' : 'none', flexDirection: 'column', gap: '16px' }}>
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
          {/* Locked Activity Profile Header Banner */}
          <div
            style={{
              background: info.bg,
              border: `1px solid ${info.borderColor}`,
              borderRadius: '10px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  <ShieldCheckIcon size={20} color={info.color} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 800 }}>
                        {info.title}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: '#ffffff',
                          color: info.color,
                          border: `1px solid ${info.borderColor}`,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        {info.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      تم اعتماد وتثبيت هذا النمط عند تهيئة المنشأة الأولى لحماية سلامة القيود والمعاملات المحاسبية.
                    </span>
                  </div>
                </div>
              </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800, display: 'block' }}>
                الهوية وبيانات النشاط
              </strong>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>الاسم والشعار وبيانات التواصل المطبوعة</span>
            </div>
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

                {branchStockSaved && <div style={{ color: '#16a34a', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>تم حفظ إعدادات مخزون البيع بنجاح.</div>}
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
              <option value="Africa/Cairo">مصر (Africa/Cairo)</option>
              <option value="Asia/Riyadh">السعودية (Asia/Riyadh)</option>
              <option value="Asia/Kuwait">الكويت (Asia/Kuwait)</option>
              <option value="Asia/Qatar">قطر (Asia/Qatar)</option>
              <option value="Asia/Dubai">الإمارات (Asia/Dubai)</option>
              <option value="Asia/Bahrain">البحرين (Asia/Bahrain)</option>
              <option value="Asia/Muscat">عُمان (Asia/Muscat)</option>
              <option value="UTC">التوقيت العالمي (UTC)</option>
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
