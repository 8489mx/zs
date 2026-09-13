import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { SearchIcon } from '@/shared/components/icons/AppIcons';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import { settingsApi } from '@/features/settings/api/settings.api';
import { queryKeys } from '@/app/query-keys';
import { PLAN_TIERS, type PlanTierKey } from '@/features/settings/components/modular-configurator/modular-presets';
import { APPS_CATALOG } from '../data/apps-catalog';
import { AppCard } from '../components/AppCard';
import { AppsKpiHeader } from '../components/AppsKpiHeader';
import { AppUpgradeModal } from '../components/AppUpgradeModal';
import type { AppCategoryKey, AppItemDefinition } from '../types/apps-store.types';

const CATEGORY_TABS: Array<{ id: AppCategoryKey; label: string }> = [
  { id: 'all', label: 'كافة التطبيقات' },
  { id: 'installed', label: 'المثبتة والنشطة' },
  { id: 'pos', label: 'المبيعات والكاشير' },
  { id: 'inventory', label: 'المخازن وسلاسل الإمداد' },
  { id: 'finance', label: 'المالية والمحاسبة' },
  { id: 'contracting', label: 'المقاولات والمشاريع' },
  { id: 'maritime', label: 'الشحن واللوجستيات' },
  { id: 'specialized', label: 'العمليات والخدمات' },
  { id: 'logistics', label: 'اللوجستيات والسحابية' },
];

export function AppsStorePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const isSuperAdmin = isPlatformAdmin(user) || (user?.role === 'super_admin' && String(user?.username || '').trim().toLowerCase() === 'zs');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AppCategoryKey>('all');
  const [upgradeModalApp, setUpgradeModalApp] = useState<AppItemDefinition | null>(null);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.settings(),
    staleTime: 60_000,
  });

  // Settings update mutation
  const updateMutation = useMutation({
    mutationFn: (partialSettings: Record<string, any>) => settingsApi.update(partialSettings),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      const changedKey = Object.keys(variables)[0];
      const isEnabled = variables[changedKey];
      const appDef = APPS_CATALOG.find((a) => a.key === changedKey);
      const appTitle = appDef?.title || 'التطبيق';
      if (isEnabled) {
        toast.success(`تم تفعيل وتثبيت [${appTitle}] بنجاح وتم تحديث القوائم والشاشات.`);
      } else {
        toast.info(`تم إلغاء تفعيل [${appTitle}] بنجاح.`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تحديث حالة التطبيق، يرجى المحاولة مرة أخرى.');
    },
  });

  // Helper to check if an app is active
  const isAppActive = (appKey: string): boolean => {
    if (!settings) return false;
    return Boolean((settings as any)[appKey]);
  };

  // Helper to check if tenant plan/features allow this app
  const isAppAllowedByPlan = (app: AppItemDefinition): boolean => {
    if (isSuperAdmin) return true;
    if (app.featureFlag) {
      const tenantFeatures = tenant?.features || [];
      if (!tenantFeatures.includes(app.featureFlag)) {
        return false;
      }
    }
    // Plan tiers hierarchy
    const tenantPlan = String(tenant?.plan || tenant?.planId || 'pro').toLowerCase();
    const planHierarchy: Record<string, number> = {
      basic: 1,
      standard: 1,
      pro: 2,
      ultimate: 3,
      omnichannel: 4,
    };
    const requiredRankMap: Record<PlanTierKey, number> = {
      plan_basic: 1,
      plan_pro: 2,
      plan_ultimate: 3,
      plan_omnichannel: 4,
    };
    const tenantRank = planHierarchy[tenantPlan] || 2;
    const requiredRank = requiredRankMap[app.requiredPlan] || 3;
    return tenantRank >= requiredRank;
  };

  // Handle Toggle App (Install or Uninstall)
  const handleToggle = async (app: AppItemDefinition, currentStatus: boolean) => {
    if (updateMutation.isPending) return;

    if (currentStatus) {
      // Confirm uninstallation to prevent accidental disabling of critical modules
      const confirmed = await systemConfirm({
        title: `إلغاء تفعيل [${app.title}]`,
        message: `هل أنت متأكد من رغبتك في إيقاف وإلغاء تثبيت تطبيق [${app.title}]؟ سيتم إخفاء الشاشات المرتبطة به من القوائم للمستخدمين.`,
        confirmText: 'نعم، إيقاف التطبيق',
        cancelText: 'إلغاء',
        variant: 'warning',
      });
      if (!confirmed) return;

      updateMutation.mutate({ [app.key]: false });
    } else {
      // Check dependencies if any
      if (app.dependencies && app.dependencies.length > 0) {
        const missingDeps = app.dependencies.filter((depKey) => !isAppActive(depKey));
        if (missingDeps.length > 0) {
          const depTitles = missingDeps.map((k) => APPS_CATALOG.find((a) => a.key === k)?.title || k).join('، ');
          const proceed = await systemConfirm({
            title: 'تفعيل المتطلبات المرتبطة',
            message: `يتطلب تطبيق [${app.title}] تشغيل التطبيقات التالية أولاً: (${depTitles}). هل ترغب في تفعيلها معاً الآن؟`,
            confirmText: 'تفعيل الكل معاً',
            cancelText: 'إلغاء',
            variant: 'primary',
          });
          if (!proceed) return;

          const payload: Record<string, boolean> = { [app.key]: true };
          for (const depKey of missingDeps) {
            payload[depKey] = true;
          }
          updateMutation.mutate(payload);
          return;
        }
      }

      updateMutation.mutate({ [app.key]: true });
    }
  };

  // Filtered Apps
  const filteredApps = useMemo(() => {
    return APPS_CATALOG.filter((app) => {
      const active = isAppActive(app.key);

      // Category filter
      if (selectedCategory === 'installed' && !active) return false;
      if (selectedCategory !== 'all' && selectedCategory !== 'installed' && app.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchTitle = app.title.toLowerCase().includes(q);
        const matchDesc = app.shortDesc.toLowerCase().includes(q);
        const matchCat = app.categoryLabel.toLowerCase().includes(q);
        const matchFeat = app.features.some((f) => f.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchCat && !matchFeat) return false;
      }

      return true;
    });
  }, [selectedCategory, search, settings]);

  // Statistics
  const activeAppsCount = useMemo(() => {
    return APPS_CATALOG.filter((a) => isAppActive(a.key)).length;
  }, [settings]);

  const availableToInstallCount = useMemo(() => {
    return APPS_CATALOG.filter((a) => !isAppActive(a.key) && isAppAllowedByPlan(a)).length;
  }, [settings, tenant, isSuperAdmin]);

  const currentPlanName = useMemo(() => {
    const raw = String(tenant?.plan || tenant?.planId || 'pro').toLowerCase();
    const map: Record<string, string> = {
      basic: PLAN_TIERS.plan_basic.name,
      pro: PLAN_TIERS.plan_pro.name,
      ultimate: PLAN_TIERS.plan_ultimate.name,
      omnichannel: PLAN_TIERS.plan_omnichannel.name,
    };
    return map[raw] || PLAN_TIERS.plan_ultimate.name;
  }, [tenant]);

  return (
    <div className="page-stack page-shell apps-store-page" dir="rtl">
      <main
        className="document-prototype-column"
        style={{
          paddingBottom: '100px',
          maxWidth: '1280px',
          width: 'min(100%, 1280px)',
          margin: '0 auto',
        }}
      >
        <PageHeader
          title="متجر التطبيقات والموديولات (Apps Store)"
          description="مركز تطبيقات وإضافات المنظومة الشامل: قم بتثبيت وتفعيل التطبيقات التخصصية لنشاطك، وتخصيص بيئة العمل بمرونة تامة بضغطة زر واحدة."
          badge={<span className="nav-pill">{activeAppsCount} من أصل {APPS_CATALOG.length} تطبيقاً نشطاً</span>}
        />

        {/* Top KPI Summary Header */}
        <AppsKpiHeader
          totalApps={APPS_CATALOG.length}
          activeAppsCount={activeAppsCount}
          availableToInstallCount={availableToInstallCount}
          currentPlanName={currentPlanName}
          isSuperAdmin={isSuperAdmin}
        />

        {/* Toolbar: Search and Filter Pills */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* Instant Search Bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{ position: 'absolute', right: '14px', top: '11px', color: '#94a3b8' }}>
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في التطبيقات، الموديولات، أو المزايا..."
              style={{
                width: '100%',
                paddingRight: '38px',
                paddingLeft: '14px',
                paddingTop: '9px',
                paddingBottom: '9px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8125rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#f8fafc',
              }}
            />
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
              overflowX: 'auto',
              maxWidth: '100%',
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.id;
              // Count for this tab
              let count = 0;
              if (tab.id === 'all') count = APPS_CATALOG.length;
              else if (tab.id === 'installed') count = activeAppsCount;
              else count = APPS_CATALOG.filter((a) => a.category === tab.id).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#170e5e' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      background: isActive ? '#eef2ff' : '#e2e8f0',
                      color: isActive ? '#170e5e' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Apps Grid Layout */}
        {isLoading ? (
          <div
            style={{
              minHeight: '360px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: '0.88rem',
            }}
          >
            جاري تحميل كتالوج التطبيقات...
          </div>
        ) : filteredApps.length === 0 ? (
          <div
            style={{
              minHeight: '320px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              لا توجد تطبيقات مطابقة لبحثك
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: '400px', margin: '0 0 16px 0' }}>
              لم نعثر على أي تطبيق يطابق كلمة البحث &quot;{search}&quot; أو التصنيف المحدد.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#170e5e',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              عرض كافة التطبيقات
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '18px',
            }}
          >
            {filteredApps.map((app) => (
              <AppCard
                key={app.key}
                app={app}
                isActive={isAppActive(app.key)}
                isAllowedByPlan={isAppAllowedByPlan(app)}
                isPending={updateMutation.isPending}
                onToggle={handleToggle}
                onOpenUpgradeModal={(a) => setUpgradeModalApp(a)}
              />
            ))}
          </div>
        )}

        {/* Upgrade Dialog */}
        <AppUpgradeModal
          app={upgradeModalApp}
          isOpen={Boolean(upgradeModalApp)}
          onClose={() => setUpgradeModalApp(null)}
        />
      </main>
    </div>
  );
}
