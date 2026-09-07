import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import {
  INDUSTRY_PRESETS,
  PLAN_TIERS,
  SYSTEM_MODULES,
  type IndustryPresetId,
  buildSettingsFromIndustry,
  resolveModuleDependencies,
  calculateRecommendedPlan,
} from '@/features/settings/components/modular-configurator/modular-presets';

// Clean Enterprise SVG Line Icons (Ultra-expressive, 0 emojis)
function PresetIcon({ id, size = 22 }: { id: IndustryPresetId; size?: number }) {
  // 1. تجارة التجزئة والسوبرماركت - عربة تسوق سوبرماركت
  if (id === 'retail') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    );
  }
  // 2. مبيعات الجملة والتوزيع - شاحنة توزيع ولوجستيات
  if (id === 'wholesale') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z" />
        <circle cx="17" cy="18.5" r="2.5" />
        <circle cx="7" cy="18.5" r="2.5" />
      </svg>
    );
  }
  // 3. المطاعم والكافيهات والأغذية - شوكة وسكين ضيافة
  if (id === 'restaurant') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <path d="M15 2v20" />
        <path d="M5 2v20" />
        <path d="M5 2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5" />
      </svg>
    );
  }
  // 4. الملابس والأزياء والأحذية - قميص وأزياء
  if (id === 'fashion') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
      </svg>
    );
  }
  // 5. الإلكترونيات والموبايل والصيانة - هاتف ذكي وأجهزة
  if (id === 'electronics') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="13" height="19" x="5.5" y="2.5" rx="2.5" />
        <path d="M10.5 5.5h3" />
        <circle cx="12" cy="17.5" r="0.75" />
      </svg>
    );
  }
  // 6. الصيدليات والمستلزمات الطبية - كبسولة دواء علاجية
  if (id === 'pharmacy') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    );
  }
  // 7. التصنيع الخفيف، المعامل والورش - مصنع وخطوط إنتاج
  if (id === 'manufacturing') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M17 18h1" />
        <path d="M12 18h1" />
        <path d="M7 18h1" />
      </svg>
    );
  }
  // 8. الشركات الخدمية والمقاولات والصيانة - مفتاح صيانة وأدوات
  if (id === 'services') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    );
  }
  // 9. المتاجر الإلكترونية والتجارة الرقمية - حقيبة تسوق رقمية أونلاين
  if (id === 'ecommerce') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  // 10. أنشطة أخرى / تخصيص حر متقدم - لوحة منزلقات تحكم وموديلات
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="1" x2="7" y1="14" y2="14" />
      <line x1="9" x2="15" y1="8" y2="8" />
      <line x1="17" x2="23" y1="16" y2="16" />
    </svg>
  );
}

interface ModuleGroupMeta {
  id: 'pos' | 'inventory' | 'specialized' | 'logistics' | 'finance';
  title: string;
  badge: string;
  desc: string;
}

const MODULE_GROUPS: ModuleGroupMeta[] = [
  {
    id: 'pos',
    title: 'المبيعات ونقاط الخدمة والكاشير (POS)',
    badge: '5 موديولات',
    desc: 'شاشات البيع السريع، موازين الباركود، عروض الكومبو، وإدارة الطاولات وشاشات المطبخ KDS.',
  },
  {
    id: 'inventory',
    title: 'المشتريات وإدارة المخازن وسلاسل الإمداد',
    badge: '4 موديولات',
    desc: 'فواتير الشراء، حسابات الموردين، المستودعات والجرد، مقاسات الملابس، وتواريخ الصلاحية FEFO.',
  },
  {
    id: 'specialized',
    title: 'الخدمات والتخصصات التشغيلية والتصنيع',
    badge: '5 موديولات',
    desc: 'فواتير الصيانة السريعة، تتبع أرقام السيريال IMEI، خطوط الإنتاج BOM، الاستيراد، والرواتب HR.',
  },
  {
    id: 'logistics',
    title: 'اللوجستيات والتوصيل والتجارة الرقمية',
    badge: '2 موديول',
    desc: 'أسطول التوصيل ومناديب الدليفري، والمتجر الإلكتروني السحابي وبوابات الدفع الإلكتروني.',
  },
  {
    id: 'finance',
    title: 'المالية والمحاسبة والمؤسسات',
    badge: '4 موديولات',
    desc: 'دليل الحسابات الشجري والقيود، مبيعات التقسيط والديون، الفاتورة الإلكترونية، وسجل الأصول.',
  },
];

type ModuleCategoryFilter = 'all' | 'pos' | 'inventory' | 'specialized' | 'logistics' | 'finance';

const CATEGORY_TABS: Array<{ id: ModuleCategoryFilter; label: string }> = [
  { id: 'all', label: 'كافة الموديولات (20)' },
  { id: 'pos', label: 'المبيعات والـ POS' },
  { id: 'inventory', label: 'المشتريات والمخازن' },
  { id: 'specialized', label: 'الخدمات والتخصصات' },
  { id: 'logistics', label: 'اللوجستيات والتجارة' },
  { id: 'finance', label: 'المالية والمؤسسات' },
];

export function SaaSOnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const { data: currentSettings } = useSettingsQuery();
  const overview = useDashboardOverview();
  const hasProducts = Number(overview.data?.summary?.totalProducts || 0) > 0;

  const updateSettingsMutation = useSettingsUpdateMutation(currentSettings as any, () => {
    navigate('/', { replace: true });
  });

  const [selectedIndustry, setSelectedIndustry] = useState<IndustryPresetId>(() => {
    const existing = currentSettings?.businessIndustry as IndustryPresetId | undefined;
    if (existing && existing in INDUSTRY_PRESETS) {
      return existing;
    }
    return 'retail';
  });
  const [selectedCategory, setSelectedCategory] = useState<ModuleCategoryFilter>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حالة الموديولات التفاعلية: تُهيأ افتراضياً من قالب النشاط المختار أو الإعدادات الحالية
  const [customModules, setCustomModules] = useState<Record<string, boolean>>(() => {
    const existing = currentSettings?.businessIndustry as IndustryPresetId | undefined;
    const baseIndustry = existing && existing in INDUSTRY_PRESETS ? existing : 'retail';
    const patch = buildSettingsFromIndustry(baseIndustry);
    const initial: Record<string, boolean> = {};
    for (const mod of SYSTEM_MODULES) {
      if (currentSettings && typeof (currentSettings as any)[mod.key] === 'boolean') {
        initial[mod.key] = (currentSettings as any)[mod.key] === true;
      } else {
        initial[mod.key] = patch[mod.key] === true;
      }
    }
    return initial;
  });

  const isPreview =
    new URLSearchParams(location.search).get('preview') === '1' ||
    new URLSearchParams(location.search).get('onboarding') === '1' ||
    new URLSearchParams(location.search).get('reconfigure') === '1';

  if (!isPreview && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!isPreview && user && isPlatformAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  // إذا كان العميل يمتلك منتجات بالفعل وأتم التهيئة، يتم توجيهه للرئيسية لمنع الإزعاج.
  // أما إذا كان لا يمتلك أي أصناف بعد (رصيد الأصناف 0)، يُسمح له دائماً بدخول صفحة التهيئة وتعديلها بحرية!
  if (!isPreview && hasProducts && currentSettings && (currentSettings as any).onboardingCompleted === true) {
    return <Navigate to="/" replace />;
  }

  const currentPreset = INDUSTRY_PRESETS[selectedIndustry];

  // عند النقر على أي نشاط تجاري: تحديث النشاط وتحديث الموديولات المفعلة تلقائياً لقالب هذا النشاط
  const handleSelectIndustry = (indKey: IndustryPresetId) => {
    setSelectedIndustry(indKey);
    const patch = buildSettingsFromIndustry(indKey);
    const updated: Record<string, boolean> = {};
    for (const mod of SYSTEM_MODULES) {
      updated[mod.key] = patch[mod.key] === true;
    }
    setCustomModules(updated);
  };

  // عند تفعيل/إلغاء أي موديول من القائمة التفاعلية
  const handleToggleModule = (modKey: string) => {
    setCustomModules((prev) => {
      const nextVal = !prev[modKey];
      const next = { ...prev, [modKey]: nextVal };
      if (nextVal) {
        // تفعيل الاعتماديات تلقائياً
        const activeKeys = Object.keys(next).filter((k) => next[k]);
        const { resolvedKeys } = resolveModuleDependencies(activeKeys);
        for (const rk of resolvedKeys) {
          next[rk] = true;
        }
      }
      return next;
    });
  };

  // حساب الباقة الأنسب وعدد الموديولات المفعلة لحظياً
  const activeModuleKeys = Object.keys(customModules).filter((k) => customModules[k]);
  const currentCalculatedPlan = calculateRecommendedPlan(activeModuleKeys);

  const handleApplyIndustry = async () => {
    setIsSubmitting(true);
    try {
      const { resolvedKeys } = resolveModuleDependencies(activeModuleKeys);
      const patch: Record<string, any> = {
        businessIndustry: selectedIndustry,
        onboardingCompleted: true,
        defaultPosMode: currentPreset.defaultPosMode || 'scanner',
        defaultProductKind: currentPreset.defaultProductKind || 'standard',
        ...(currentPreset.maintenanceProfile ? { maintenanceProfile: currentPreset.maintenanceProfile } : {}),
      };

      for (const mod of SYSTEM_MODULES) {
        patch[mod.key] = resolvedKeys.includes(mod.key);
      }

      await updateSettingsMutation.mutateAsync(patch as any);
      navigate('/', { replace: true });
    } catch {
      // Handled by mutation error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync({
        onboardingCompleted: true,
      } as any);
      navigate('/', { replace: true });
    } catch {
      // Handled by mutation error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanced = async () => {
    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync({
        onboardingCompleted: true,
      } as any);
      navigate('/settings/modules');
    } catch {
      // Handled by mutation error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  // المجموعات المعروضة بناءً على فلتر التبويب
  const displayedGroups =
    selectedCategory === 'all'
      ? MODULE_GROUPS
      : MODULE_GROUPS.filter((g) => g.id === selectedCategory);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 20px 60px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1140px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* الترويسة المؤسسية */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '4px',
          }}
        >
          <img
            src="./logo.png"
            alt="Z-Systems Logo"
            style={{ height: '44px', width: 'auto', marginBottom: '14px' }}
          />
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#eef2ff',
              color: '#170e5e',
              padding: '4px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '8px',
            }}
          >
            تهيئة مساحة العمل لأول مرة
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 900,
              color: '#0f172a',
              margin: '0 0 8px',
              lineHeight: 1.3,
            }}
          >
            تخصيص النظام وتجهيز بيئة العمل
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: 0,
              maxWidth: '700px',
              lineHeight: 1.6,
            }}
          >
            {user?.displayName ? `أهلاً بك يا ${user.displayName}. ` : 'أهلاً بك في Z-Systems. '}
            اختر طبيعة نشاطك التجاري لتفعيل الموديولات والشاشات المناسبة تلقائياً. يمكنك تخصيص أي موديول أدناه بحرية قبل تأكيد التهيئة:
          </p>
        </div>

        {/* شبكة الأنشطة الـ 10 المعيارية (Zero Layout Shift هندسياً بالكامل) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))',
            gap: '12px',
          }}
        >
          {(Object.keys(INDUSTRY_PRESETS) as IndustryPresetId[]).map((indKey) => {
            const item = INDUSTRY_PRESETS[indKey];
            const isSelected = selectedIndustry === indKey;

            return (
              <div
                key={indKey}
                onClick={() => handleSelectIndustry(indKey)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: isSelected ? '2px solid #170e5e' : '2px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                  minHeight: '136px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxShadow: isSelected
                    ? '0 3px 12px rgba(23, 14, 94, 0.10)'
                    : '0 1px 3px rgba(0, 0, 0, 0.02)',
                  position: 'relative',
                }}
              >
                {/* الصف العلوي: الأيقونة والشارة وعلامة الفحص الثابتة */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? '#170e5e' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.15s ease, color 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    <PresetIcon id={indKey} size={20} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? '#170e5e' : 'transparent',
                        color: isSelected ? '#ffffff' : 'transparent',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: isSelected ? 1 : 0, transition: 'opacity 0.15s ease' }}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: isSelected ? '#170e5e' : '#64748b',
                        backgroundColor: isSelected ? '#ede9fe' : '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                </div>

                {/* الاسم والتوصيف الثابت (أحجام وأوزان خطوط ثابتة 100%) */}
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '0.88rem',
                      color: '#0f172a',
                      fontWeight: 800,
                      lineHeight: 1.35,
                    }}
                  >
                    {item.name}
                  </strong>
                  <span
                    style={{
                      fontSize: '0.73rem',
                      color: '#64748b',
                      display: 'block',
                      marginTop: '3px',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.subtitle}
                  </span>
                </div>

                {/* السطر السفلي: اسم الباقة */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '8px',
                    fontSize: '0.72rem',
                    color: isSelected ? '#170e5e' : '#64748b',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{PLAN_TIERS[item.recommendedPlan].name}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* لوحة الموديولات التفاعلية المقسمة ترابطياً (Interrelated Module Selector) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '22px 24px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* ترويسة لوحة الموديولات وزر التأكيد السريع */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              paddingBottom: '14px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                  الموديولات المترابطة التي سيتم تفعيلها لنشاطك
                </h3>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    color: '#170e5e',
                    backgroundColor: '#ede9fe',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  قالب: {currentPreset.name}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                مرتبة حسب التكامل والترابط التشغيلي (المشتريات مع المخازن، والخدمات مع الصيانة). يمكنك تفعيل أو إلغاء أي موديول بنقرة واحدة:
              </p>
            </div>

            {/* مؤشر الباقة وزر التأكيد السريع العلوي */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  backgroundColor: currentCalculatedPlan.badgeBg,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${currentCalculatedPlan.badgeColor}33`,
                }}
              >
                <span style={{ fontSize: '0.68rem', color: currentCalculatedPlan.badgeColor, fontWeight: 700 }}>
                  الباقة المطابقة لاختياراتك:
                </span>
                <strong style={{ fontSize: '0.82rem', color: currentCalculatedPlan.badgeColor, fontWeight: 900 }}>
                  {currentCalculatedPlan.name} ({activeModuleKeys.length} من {SYSTEM_MODULES.length} موديول)
                </strong>
              </div>

              {/* زر تأكيد سريع علوي يمنع الحاجة للنزول لآخر الصفحة */}
              <button
                type="button"
                onClick={handleApplyIndustry}
                disabled={isSubmitting}
                style={{
                  padding: '9px 24px',
                  borderRadius: '8px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{isSubmitting ? 'جاري التجهيز...' : 'تأكيد وبدء العمل'}</span>
              </button>
            </div>
          </div>

          {/* تبويبات التصفية السريعة للتصنيفات */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isTabActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    backgroundColor: isTabActive ? '#170e5e' : '#f8fafc',
                    color: isTabActive ? '#ffffff' : '#475569',
                    border: isTabActive ? '1px solid #170e5e' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    transition: 'background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* عرض الموديولات المقسمة إلى مجموعات مترابطة جنباً إلى جنب */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {displayedGroups.map((group) => {
              const groupModules = SYSTEM_MODULES.filter((m) => m.category === group.id);

              return (
                <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* عنوان وترويسة المجموعة المترابطة */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      padding: '7px 12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#170e5e',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <strong style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 800 }}>
                        {group.title}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#170e5e',
                          backgroundColor: '#ede9fe',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        {group.badge}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {group.desc}
                    </span>
                  </div>

                  {/* شبكة كروت الموديولات المترابطة */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                      gap: '10px',
                    }}
                  >
                    {groupModules.map((mod) => {
                      const isActive = customModules[mod.key] === true;

                      return (
                        <div
                          key={mod.key}
                          onClick={() => handleToggleModule(mod.key)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            backgroundColor: isActive ? '#f8faff' : '#ffffff',
                            border: isActive ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease',
                            userSelect: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          {/* مربع الفحص المؤسسي الفخم */}
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '5px',
                              backgroundColor: isActive ? '#170e5e' : '#ffffff',
                              border: isActive ? '2px solid #170e5e' : '2px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              flexShrink: 0,
                              marginTop: '2px',
                              transition: 'all 0.12s ease',
                            }}
                          >
                            {isActive && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>

                          {/* نصوص الموديول وشارة الحالة */}
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                marginBottom: '3px',
                              }}
                            >
                              <strong
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 800,
                                  color: isActive ? '#170e5e' : '#0f172a',
                                }}
                              >
                                {mod.title}
                              </strong>
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: isActive ? '#dcfce7' : '#f1f5f9',
                                  color: isActive ? '#15803d' : '#64748b',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isActive ? 'مفعّل' : 'معطّل'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', lineHeight: 1.4 }}>
                              {mod.shortDesc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* شريط الإرشادات ورابط التخصيص المتقدم */}
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              fontSize: '0.78rem',
              color: '#64748b',
            }}
          >
            <span>
              يمكنك في أي وقت لاحقاً إعادة ضبط الموديولات والقوائم من شاشة <strong>الإعدادات العامة &gt; موديولات النظام</strong>.
            </span>
            <button
              type="button"
              onClick={handleAdvanced}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                color: '#170e5e',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 6px',
              }}
            >
              فتح شاشة الموديولات المتقدمة
            </button>
          </div>
        </div>

        {/* أزرار الإجراءات السفلية */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            marginTop: '6px',
          }}
        >
          <button
            type="button"
            onClick={handleApplyIndustry}
            disabled={isSubmitting}
            style={{
              padding: '13px 42px',
              borderRadius: '8px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '0.96rem',
              fontWeight: 800,
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              boxShadow: '0 2px 10px rgba(23, 14, 94, 0.28)',
              transition: 'all 0.15s ease',
            }}
          >
            {isSubmitting ? 'جاري تجهيز بيئة العمل...' : 'تأكيد الإعداد وبدء العمل'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            style={{
              padding: '12px 26px',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            تخطي والبدء بالإعدادات الافتراضية
          </button>
        </div>
      </div>
    </div>
  );
}
