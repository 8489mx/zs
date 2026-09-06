import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { demoDataApi, type SeedDemoDataResult } from '@/features/settings/api/demo-data.api';
import { Button } from '@/shared/ui/button';

export function SettingsDemoDataWizardSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>('supermarket');
  const [wipeExisting, setWipeExisting] = useState<boolean>(true);
  const [seedSales, setSeedSales] = useState<boolean>(true);
  const [seedOnlineOrders, setSeedOnlineOrders] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showClearModal, setShowClearModal] = useState<boolean>(false);
  const [clearPassword, setClearPassword] = useState<string>('');
  const [successResult, setSuccessResult] = useState<SeedDemoDataResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const statusQuery = useQuery({
    queryKey: ['demo-data', 'status'],
    queryFn: () => demoDataApi.getStatus(),
    staleTime: 10_000,
  });

  const activitiesQuery = useQuery({
    queryKey: ['demo-data', 'activities'],
    queryFn: () => demoDataApi.getActivities(),
    staleTime: 60_000,
  });

  const status = statusQuery.data;
  const activities = activitiesQuery.data || [];
  const selectedActivity = activities.find((a) => a.key === selectedActivityKey) || activities[0];

  // Seed Mutation
  const seedMutation = useMutation({
    mutationFn: async (vars: { activityType: string; pass: string }) => {
      return demoDataApi.seedDemoData({
        activityType: vars.activityType,
        password: vars.pass,
        wipeExisting,
        seedSales,
        seedOnlineOrders,
      });
    },
    onSuccess: (data) => {
      setShowPasswordModal(false);
      setPassword('');
      setErrorMessage(null);
      setSuccessResult(data);
      queryClient.invalidateQueries({ queryKey: ['demo-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'حدث خطأ أثناء استيراد البيانات التجريبية. يرجى التحقق من كلمة المرور.');
    },
  });

  // Clear Mutation (clean demo wipe)
  const clearMutation = useMutation({
    mutationFn: async (pass: string) => {
      return demoDataApi.clearDemoData(pass);
    },
    onSuccess: (data) => {
      setShowClearModal(false);
      setClearPassword('');
      setNotification({ kind: 'success', message: data.message });
      queryClient.invalidateQueries({ queryKey: ['demo-data'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (err: any) => {
      setNotification({ kind: 'error', message: err?.message || 'فشل تفريغ البيانات التجريبية.' });
    },
  });

  // Handle Main Start Action
  const handleStartSeed = () => {
    setErrorMessage(null);
    // If database is not empty and user requested wiping existing data, we must ask for password
    if (status && !status.isEmpty && wipeExisting) {
      setShowPasswordModal(true);
    } else {
      // Direct execution without password for empty DB or append mode
      seedMutation.mutate({ activityType: selectedActivityKey, pass: '' });
    }
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ─── Hero Overview Card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 400px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.18)',
            }}
          >
            🚀
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              معالج استيراد البيانات التجريبية حسب النشاط (Demo Wizard)
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              اختر تخصص نشاطك التجاري لملء النظام فورياً بـ ~50 صنفاً وفواتير كاشير وموردين وحركات مبيعات حقيقية في 5 ثوانٍ، لترى كافة لوحات التحكم والتقارير نابضة بالحياة.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {statusQuery.isLoading ? (
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>جاري فحص حالة النظام...</span>
          ) : status?.isEmpty ? (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              النظام فارغ (جاهز للاستيراد الفوري بنقرة واحدة)
            </div>
          ) : (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📦 {status?.productCount || 0} صنف مسجل</span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span>🧾 {status?.saleCount || 0} فاتورة</span>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            fontSize: '0.88rem',
            fontWeight: 700,
            background: notification.kind === 'success' ? '#ecfdf5' : '#fff1f2',
            color: notification.kind === 'success' ? '#047857' : '#be123c',
            border: notification.kind === 'success' ? '1px solid #a7f3d0' : '1px solid #fecdd3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Activity Selection Grid ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            1. اختر مجال نشاطك التجاري:
          </h3>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            5 باقات متكاملة معدة مسبقاً بأدق التفاصيل والأسعار والباركودات
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            width: '100%',
          }}
        >
          {activities.map((act) => {
            const isSelected = act.key === selectedActivityKey;
            return (
              <div
                key={act.key}
                onClick={() => setSelectedActivityKey(act.key)}
                style={{
                  background: '#ffffff',
                  border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 6px 20px rgba(23, 14, 94, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Header row with icon & selection indicator */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: isSelected ? '#ede9fe' : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        border: isSelected ? '1px solid #c4b5fd' : '1px solid #e2e8f0',
                      }}
                    >
                      {act.icon}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                        {act.name}
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {act.tagline}
                      </span>
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '6px solid #170e5e' : '2px solid #cbd5e1',
                      background: '#ffffff',
                      flexShrink: 0,
                      marginTop: '4px',
                    }}
                  />
                </div>

                <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                  {act.description}
                </p>

                {/* Sample product badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
                  {act.sampleProducts.slice(0, 4).map((sp, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: isSelected ? '#f5f3ff' : '#f1f5f9',
                        color: isSelected ? '#170e5e' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                      }}
                    >
                      {sp}
                    </span>
                  ))}
                  {act.productCount > 4 && (
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', padding: '3px 4px' }}>
                      +{act.productCount - 4} أصناف أخرى
                    </span>
                  )}
                </div>

                {/* Key stats pill */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.76rem',
                    color: '#64748b',
                  }}
                >
                  <span>🏷️ {act.productCount} صنفاً متكاملاً</span>
                  <span>📂 {act.categoryCount} تصنيفات</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Configuration Options & Start Action ───────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
          2. خيارات التجهيز السريع:
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Option: Wipe Existing */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: wipeExisting ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={wipeExisting}
              onChange={(e) => setWipeExisting(e.target.checked)}
              style={{ marginTop: '3px', accentColor: '#170e5e', width: '16px', height: '16px' }}
            />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                تصفير البيانات السابقة واستبدالها بنظافة
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                ينصح به للمتاجر الجديدة للبدء ببيانات متسقة تماماً (يتطلب كلمة المرور في حال وجود أصناف سابقة).
              </p>
            </div>
          </label>

          {/* Option: Historical Sales */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: seedSales ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={seedSales}
              onChange={(e) => setSeedSales(e.target.checked)}
              style={{ marginTop: '3px', accentColor: '#170e5e', width: '16px', height: '16px' }}
            />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                توليد فواتير مبيعات سابقة (موزعة على 6 أشهر)
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                يملأ الداشبورد والرسوم البيانية وحركات الكاشير بحوالي 100 فاتورة واقعية مع هوامش ربح متزنة.
              </p>
            </div>
          </label>

          {/* Option: Online Orders */}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: seedOnlineOrders ? '#f8fafc' : '#ffffff',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={seedOnlineOrders}
              onChange={(e) => setSeedOnlineOrders(e.target.checked)}
              style={{ marginTop: '3px', accentColor: '#170e5e', width: '16px', height: '16px' }}
            />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                توليد طلبات متجر إلكتروني سحابية
              </span>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                يضيف 4-5 طلبات متجر بحالات مختلفة (قيد التجهيز، شحن، تسليم) لتجربة بوابة الشحن والطلبات.
              </p>
            </div>
          </label>
        </div>

        {/* Primary Action Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '18px',
          }}
        >
          <div style={{ fontSize: '0.86rem', color: '#475569' }}>
            النشاط المحدد: <strong style={{ color: '#170e5e' }}>{selectedActivity?.name || selectedActivityKey}</strong> ({selectedActivity?.productCount || 0} صنفاً)
          </div>

          <Button
            type="button"
            disabled={seedMutation.isPending}
            onClick={handleStartSeed}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.96rem',
              padding: '12px 28px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {seedMutation.isPending ? (
              <>⏳ جاري ملء النظام بالبيانات (5 ثوانٍ)...</>
            ) : (
              <>⚡ استيراد بيانات النشاط فورياً بنقرة واحدة</>
            )}
          </Button>
        </div>

        {errorMessage && (
          <div
            style={{
              background: '#fff1f2',
              color: '#be123c',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>

      {/* ─── Clean Demo Wipe & Safe Reset Zone ──────────────────────────────────── */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
            تفريغ البيانات التجريبية وبدء العمل الفعلي (Clean Production Reset)
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', maxWidth: '650px', lineHeight: 1.5 }}>
            عند الانتهاء من تجربة وفحص النظام ورغبتك في بدء العمل الحقيقي، يمكنك مسح كافة الأصناف والفواتير التجريبية بأمان دون التأثير على إعداداتك أو مستخدميك.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowClearModal(true)}
          style={{
            background: '#fff1f2',
            color: '#be123c',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 800,
            fontSize: '0.86rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffe4e6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff1f2';
          }}
        >
          🧹 تفريغ ومسح البيانات التجريبية فقط
        </button>
      </div>

      {/* ─── Modal: Confirmation Password when DB is not empty ──────────────────── */}
      {showPasswordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#fef3c7',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🔐
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  تأكيد استبدال البيانات الحالية
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  يوجد حالياً بيانات مسجلة في المتجر، سيتم أخذ نسخة احتياطية تلقائياً
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              يرجى إدخال كلمة مرور السوبر أدمن لتأكيد تفريغ البيانات القديمة واستيراد نشاط (
              <strong>{selectedActivity?.name}</strong>):
            </p>

            <input
              type="password"
              placeholder="كلمة مرور السوبر أدمن"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password.trim()) {
                  seedMutation.mutate({ activityType: selectedActivityKey, pass: password });
                }
              }}
            />

            {errorMessage && (
              <div style={{ fontSize: '0.82rem', color: '#be123c', fontWeight: 700 }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                disabled={seedMutation.isPending}
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setErrorMessage(null);
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>

              <Button
                type="button"
                disabled={!password.trim() || seedMutation.isPending}
                onClick={() => seedMutation.mutate({ activityType: selectedActivityKey, pass: password })}
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {seedMutation.isPending ? 'جاري الاستيراد...' : 'تأكيد واستيراد الآن'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Clear Demo Data ─────────────────────────────────────────────── */}
      {showClearModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                }}
              >
                🧹
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  تفريغ الأصناف والبيانات التجريبية
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  سيتم حذف الأصناف والفواتير التجريبية فقط بأمان
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
              سيتم إزالة كافة الأصناف والعملاء والموردين التجريبيين الذين تم استيرادهم بواسطة المعالج، وتهيئة المخزن للعمل الحقيقي. أدخل كلمة مرور الأدمن للتأكيد:
            </p>

            <input
              type="password"
              placeholder="كلمة المرور (اختياري للأدمن في مرحلة التجربة)"
              value={clearPassword}
              onChange={(e) => setClearPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                disabled={clearMutation.isPending}
                onClick={() => {
                  setShowClearModal(false);
                  setClearPassword('');
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={clearMutation.isPending}
                onClick={() => clearMutation.mutate(clearPassword)}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {clearMutation.isPending ? 'جاري الحذف...' : 'تأكيد الحذف والتنظيف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Success Celebration Dialog ───────────────────────────────────── */}
      {successResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '18px',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '34px',
              }}
            >
              🎉
            </div>

            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                تم استيراد البيانات التجريبية بنجاح!
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                أصبح النظام الآن ممتلئاً بالحياة والبيانات الواقعية لنشاط (
                <strong>{selectedActivity?.name}</strong>)
              </p>
            </div>

            {/* Metrics Breakdown Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                width: '100%',
                margin: '8px 0',
              }}
            >
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 8px' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#170e5e', display: 'block' }}>
                  {successResult.productsCount || 0}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>أصناف بالمخزن</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 8px' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', display: 'block' }}>
                  {successResult.salesCount || 0}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>فواتير مبيعات</span>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 8px' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0284c7', display: 'block' }}>
                  {successResult.onlineOrdersCount || 0}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>طلبات متجر</span>
              </div>
            </div>

            {/* Quick Navigation Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <Button
                type="button"
                onClick={() => navigate('/sales/pos')}
                style={{
                  background: '#170e5e',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                🛒 تجربة شاشة الكاشير السريعة (POS)
              </Button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    padding: '10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  📊 لوحة التحكم والتحليلات
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/inventory/products')}
                  style={{
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    padding: '10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                  }}
                >
                  📦 مراجعة الأصناف والمخزون
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSuccessResult(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                إغلاق والبقاء في الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
