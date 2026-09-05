import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard.api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/shared/ui/button';
import type { DashboardTopItem } from '../api/dashboard.types';

export function OwnerCompanionPage() {
  const tenant = useAuthStore((state) => state.tenant);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString('ar-EG'));
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('لتثبيت شاشة المتابعة كتطبيق:\n• أندرويد (Chrome): اضغط على القائمة (⋮) ثم "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية".\n• آيفون (Safari): اضغط زر المشاركة ثم "إضافة إلى الصفحة الرئيسية" (Add to Home Screen).');
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['owner-companion-overview', todayStr],
    queryFn: () => dashboardApi.overview(todayStr, todayStr),
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const handleManualRefresh = () => {
    refetch();
    setLastUpdated(new Date().toLocaleTimeString('ar-EG'));
  };

  const businessName = tenant?.businessName || 'المنشأة';
  const stats = data?.stats;
  const topToday: DashboardTopItem[] = data?.topToday || [];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 14px', width: '100%', boxSizing: 'border-box' }} dir="rtl">
      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div
          style={{
            background: '#e0e7ff',
            border: '1px solid #c7d2fe',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>📲</span>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e1b4b' }}>تثبيت شاشة المتابعة على الهاتف</div>
              <div style={{ fontSize: '11px', color: '#4338ca' }}>وصول فوري وشاشة كاملة كأي تطبيق أندرويد/آيفون</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallPwa}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            تثبيت الآن
          </button>
        </div>
      )}

      {/* WhatsApp Live Alerts Notification Pill */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '11.5px',
          color: '#166534',
        }}
      >
        <span style={{ fontSize: '18px' }}>🔔</span>
        <div>
          <strong>تنبيهات الواتساب الحية مفعلة:</strong> ستصلك إشعارات إغلاق الورديات والعجز/الزيادة وطلبات المتجر فورياً على هاتفك.
        </div>
      </div>

      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '16px',
          marginBottom: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>متابعة حية للمالك</span>
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{businessName}</h2>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            اليوم: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleManualRefresh}
          disabled={isFetching}
          style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '8px' }}
        >
          {isFetching ? '...' : 'تحديث'}
        </Button>
      </div>

      {/* Primary KPI Grid (2x2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
        {/* Sales Today */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>مبيعات اليوم</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#170e5e' }}>
            {isLoading ? '...' : `${Number(stats?.todaySalesAmount || 0).toLocaleString('ar-EG')} ج.م`}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
            {stats?.todaySalesCount || 0} فاتورة بيع
          </div>
        </div>

        {/* Purchases Today */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>مشتريات وتوريد اليوم</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#c2410c' }}>
            {isLoading ? '...' : `${Number(stats?.todayPurchasesAmount || 0).toLocaleString('ar-EG')} ج.م`}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {stats?.todayPurchasesCount || 0} حركة شراء
          </div>
        </div>

        {/* Customer Debt */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>ديون العملاء الإجمالية</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#b91c1c' }}>
            {isLoading ? '...' : `${Number(stats?.customerDebt || 0).toLocaleString('ar-EG')} ج.م`}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            مستحقات آجلة لدى العملاء
          </div>
        </div>

        {/* Inventory Value */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>قيمة المخزون الحالي</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#2563eb' }}>
            {isLoading ? '...' : `${Number(stats?.inventoryCost || 0).toLocaleString('ar-EG')} ج.م`}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            بسعر تكلفة البضاعة
          </div>
        </div>
      </div>

      {/* Top Products Sold Today */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>الأكثر مبيعاً اليوم</h4>
          <span style={{ fontSize: '11px', color: '#64748b' }}>أعلى الأصناف حركة</span>
        </div>

        {topToday.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
            لا توجد مبيعات مسجلة لليوم بعد.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topToday.slice(0, 5).map((p: DashboardTopItem, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ fontWeight: 800, color: '#170e5e' }}>{Number(p.total).toLocaleString('ar-EG')} ج.م</span>
                  <span style={{ fontSize: '11px', color: '#64748b', marginInlineStart: '4px' }}>({p.qty} قطعة)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '16px' }}>
        آخر تحديث: {lastUpdated} · تحديث تلقائي كل 30 ثانية
      </div>
    </div>
  );
}
