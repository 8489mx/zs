import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettingsQuery } from '@/shared/hooks/use-catalog-queries';
import { useDashboardOverview } from '@/features/dashboard/hooks/useDashboardOverview';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import { DEFAULT_STORE_NAME } from '@/config/app-defaults';
import {
  CompassIcon,
  BuildingIcon,
  PackageIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';

export function TenantQuickStartChecklist() {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery?.data;
  const overview = useDashboardOverview();

  const tenantKey = tenant?.id || 'default';
  const storageKey = `zs_quickstart_dismissed_${tenantKey}`;

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(storageKey) === 'true';
  });

  const isStorageDismissed = typeof window !== 'undefined' && (
    window.localStorage.getItem(storageKey) === 'true' ||
    (tenant?.id ? window.localStorage.getItem(`zs_quickstart_dismissed_${tenant.id}`) === 'true' : false) ||
    window.localStorage.getItem('zs_quickstart_dismissed_default') === 'true'
  );

  // Do not show for platform super admins or when dismissed
  if (isDismissed || isStorageDismissed || !user || isPlatformAdmin(user)) {
    return null;
  }

  // 1. Prevent flicker/glitch: Never render while settings or overview data is still loading from the API
  if (Boolean(settingsQuery?.isLoading) || Boolean(overview?.isLoading) || !settings || !overview?.data) {
    return null;
  }

  // 2. If the user has already completed onboarding, never show the quick start checklist
  const isOnboardingCompleted =
    (settings as any)?.onboardingCompleted === true ||
    (settings as any)?.onboardingCompleted === 'true' ||
    (tenant as any)?.onboardingCompleted === true;

  if (isOnboardingCompleted) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, 'true');
      } catch {}
    }
    return null;
  }

  const summary = overview.data?.summary;
  const stats = overview.data?.stats;

  // Step 1: Store profile
  const hasStoreInfo = Boolean(
    settings?.phone ||
    settings?.taxNumber ||
    (settings?.storeName &&
      settings.storeName !== DEFAULT_STORE_NAME &&
      settings.storeName !== 'Z Systems')
  );

  // Step 2: Catalog Products
  const hasProducts = Number(summary?.totalProducts || 0) > 0;

  // Step 3: Sales / POS
  const hasSales =
    Number(stats?.todaySalesCount || 0) > 0 ||
    Number(summary?.sales?.count || 0) > 0;

  const steps = [
    {
      id: 'store',
      number: 1,
      title: 'بيانات المنشأة وترويسة الفواتير',
      desc: 'أدخل اسم المتجر، الهاتف، العنوان، والرقم الضريبي لتظهر مطبوعة في رأس الإيصال.',
      icon: <BuildingIcon size={20} color={hasStoreInfo ? '#047857' : '#170e5e'} />,
      done: hasStoreInfo,
      actionTo: '/settings/core?setup=quickstart',
      actionLabel: hasStoreInfo ? 'تعديل البيانات' : 'ضبط البيانات',
    },
    {
      id: 'products',
      number: 2,
      title: 'إضافة أول منتج في المخزون',
      desc: 'سجل أصنافك وأسعارها وباركوداتها، أو استورد كتالوجاً تجريبياً بضغطة زر.',
      icon: <PackageIcon size={20} color={hasProducts ? '#047857' : '#170e5e'} />,
      done: hasProducts,
      actionTo: '/products?setup=quickstart',
      actionLabel: hasProducts ? 'قائمة الأصناف' : 'إضافة صنف',
      secondaryTo: !hasProducts ? '/settings/demo-data?setup=quickstart' : undefined,
      secondaryLabel: !hasProducts ? 'بيانات تجريبية' : undefined,
    },
    {
      id: 'pos',
      number: 3,
      title: 'فتح نقطة البيع (POS) وبدء الفوترة',
      desc: 'افتح شاشة الكاشير السريعة لمسح الباركود وإصدار أول فاتورة بيع لعملائك.',
      icon: <ShoppingCartIcon size={20} color={hasSales ? '#047857' : '#170e5e'} />,
      done: hasSales,
      actionTo: '/pos',
      actionLabel: hasSales ? 'شاشة البيع' : 'بدء البيع الآن',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // إخفاء الدليل تلقائياً بمجرد إنجاز كافة الخطوات الثلاث (نسبة الجاهزية 100%)
  if (completedCount === 3) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(storageKey, 'true');
      } catch {}
    }
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {}
  };

  return (
    <div
      dir="rtl"
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
        position: 'relative',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ede9fe',
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CompassIcon size={22} color="#170e5e" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.02rem',
                  fontWeight: 800,
                  color: '#0f172a',
                }}
              >
                دليل البداية السريعة لتشغيل المنشأة
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: completedCount === 3 ? '#ecfdf5' : '#eff6ff',
                  color: completedCount === 3 ? '#047857' : '#1d4ed8',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${completedCount === 3 ? '#a7f3d0' : '#bfdbfe'}`,
                }}
              >
                {completedCount === 3 ? 'مكتمل بنجاح' : `إنجاز ${completedCount} من 3 خطوات`}
              </span>
              <Link
                to="/onboarding?onboarding=1"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#f8fafc',
                  color: '#1e293b',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CompassIcon size={12} color="#475569" />
                <span>تخصيص الموديولات والنشاط</span>
              </Link>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              أكمل الخطوات الثلاث الأساسية لتجهيز حسابك وإصدار أولى فواتيرك التشغيلية.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Progress Tracker */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>
              نسبة الجاهزية: <strong style={{ color: '#170e5e' }}>{progressPercent}%</strong>
            </span>
            <div
              style={{
                width: '120px',
                height: '7px',
                background: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: completedCount === 3 ? '#10b981' : '#170e5e',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            title="إخفاء الدليل"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#475569')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <XIcon size={18} />
          </button>
        </div>
      </div>

      {/* 3 Step Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '14px',
        }}
      >
        {steps.map((step) => {
          const isDone = step.done;
          return (
            <div
              key={step.id}
              style={{
                background: isDone ? '#faf5ff' : '#f8fafc',
                border: `1px solid ${isDone ? '#e9d5ff' : '#e2e8f0'}`,
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isDone ? '#ecfdf5' : '#ffffff',
                        border: `1px solid ${isDone ? '#a7f3d0' : '#cbd5e1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDone ? '#047857' : '#170e5e',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                      }}
                    >
                      {isDone ? <CheckCircleIcon size={16} color="#047857" /> : step.number}
                    </div>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      {step.title}
                    </strong>
                  </div>
                  {isDone && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#047857',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      مكتمل
                    </span>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: '#64748b',
                    lineHeight: 1.5,
                  }}
                >
                  {step.desc}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <Link
                  to={step.actionTo}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    background: isDone ? '#ffffff' : '#170e5e',
                    color: isDone ? '#334155' : '#ffffff',
                    border: `1px solid ${isDone ? '#cbd5e1' : '#170e5e'}`,
                    transition: 'opacity 0.15s ease',
                  }}
                >
                  {step.actionLabel}
                </Link>

                {step.secondaryTo && (
                  <Link
                    to={step.secondaryTo}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      background: '#ede9fe',
                      color: '#170e5e',
                      border: '1px solid #ddd6fe',
                    }}
                  >
                    {step.secondaryLabel}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
