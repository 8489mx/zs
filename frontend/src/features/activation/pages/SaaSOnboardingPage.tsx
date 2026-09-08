import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useSettingsUpdateMutation } from '@/features/settings/hooks/useSettingsMutations';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import {
  INDUSTRY_PRESETS,
  SYSTEM_MODULES,
  type IndustryPresetId,
  buildSettingsFromIndustry,
  resolveModuleDependencies,
  calculateRecommendedPlan,
} from '@/features/settings/components/modular-configurator/modular-presets';
import { OnboardingHeader } from '../components/onboarding/OnboardingHeader';
import { IndustryPresetsGrid } from '../components/onboarding/IndustryPresetsGrid';
import { ModulesConfiguratorGrid } from '../components/onboarding/ModulesConfiguratorGrid';
import type { ModuleCategoryFilter } from '../components/onboarding/types';

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
        {/* الترويسة المؤسسية وبانر الباقة */}
        <OnboardingHeader
          currentCalculatedPlan={currentCalculatedPlan}
          activeCount={activeModuleKeys.length}
          isSubmitting={isSubmitting}
          onApply={handleApplyIndustry}
          onSkip={handleSkip}
          onAdvanced={handleAdvanced}
        />

        {/* الخطوة 1: اختيار النشاط التجاري */}
        <IndustryPresetsGrid
          selectedIndustry={selectedIndustry}
          onSelectIndustry={handleSelectIndustry}
        />

        {/* الخطوة 2: تخصيص وتفعيل الموديولات */}
        <ModulesConfiguratorGrid
          customModules={customModules}
          onToggleModule={handleToggleModule}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
    </div>
  );
}
