import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { demoDataApi, type SeedDemoDataResult } from '@/features/settings/api/demo-data.api';
import { Button } from '@/shared/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { isPlatformAdmin } from '@/app/router/access';
import {
  PackageIcon,
  ReceiptIcon,
  TagIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  Trash2Icon,
  CheckCircleIcon,
  ShoppingCartIcon,
  BarChartIcon,
  XIcon,
  UtensilsIcon,
  SmartphoneIcon,
} from '@/shared/components/icons/AppIcons';

function getActivityIcon(key: string, isSelected: boolean, size = 20) {
  const color = isSelected ? '#170e5e' : '#64748b';
  switch (key) {
    case 'supermarket':
      return <ShoppingCartIcon size={size} color={isSelected ? '#170e5e' : color} />;
    case 'fashion':
      return <TagIcon size={size} color={isSelected ? '#7c3aed' : color} />;
    case 'cafe_restaurant':
      return <UtensilsIcon size={size} color={isSelected ? '#d97706' : color} />;
    case 'electronics_mobile':
      return <SmartphoneIcon size={size} color={isSelected ? '#0284c7' : color} />;
    case 'pharmacy':
      return <ShieldCheckIcon size={size} color={isSelected ? '#16a34a' : color} />;
    default:
      return <PackageIcon size={size} color={color} />;
  }
}

export function SettingsDemoDataWizardSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isPlatform = isPlatformAdmin(user);

  // State
  const [selectedActivityKey, setSelectedActivityKey] = useState<string>('supermarket');
  const [wipeExisting, setWipeExisting] = useState<boolean>(isPlatform);
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
  const activities = Array.isArray(activitiesQuery.data) ? activitiesQuery.data : [];
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
    if (!isPlatform && status && !status.isEmpty) {
      setErrorMessage('المتجر يحتوي على بيانات نشطة بالفعل. لتصفير المتجر والبدء الفعلي، يرجى مراجعة إدارة المنصة (السوبر أدمن).');
      return;
    }
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
        <div style={{ flex: '1 1 400px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            معالج استيراد البيانات التجريبية حسب النشاط (Demo Wizard)
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
            اختر تخصص نشاطك التجاري لملء النظام فورياً بـ ~50 صنفاً وفواتير كاشير وموردين وحركات مبيعات حقيقية في 5 ثوانٍ، لترى كافة لوحات التحكم والتقارير نابضة بالحياة.
          </p>
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <PackageIcon size={14} />
                <span>{status?.productCount || 0} صنف مسجل</span>
              </span>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ReceiptIcon size={14} />
                <span>{status?.saleCount || 0} فاتورة</span>
              </span>
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
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}
          >
            <XIcon size={16} />
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
            gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
            gap: '12px',
            width: '100%',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          {activitiesQuery.isLoading && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem', gridColumn: '1 / -1' }}>
              <RefreshCwIcon size={20} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              <span>جاري تحميل باقات الأنشطة التجارية...</span>
            </div>
          )}

          {activities.map((act) => {
            const isSelected = act.key === selectedActivityKey;

            return (
              <div
                key={act.key}
                onClick={() => setSelectedActivityKey(act.key)}
                style={{
                  background: isSelected ? '#faf9ff' : '#ffffff',
                  border: `1.5px solid ${isSelected ? '#170e5e' : '#e2e8f0'}`,
                  borderRadius: '14px',
                  padding: '16px 14px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 4px 16px rgba(23, 14, 94, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header row: Radio (Right), Title & Tagline (Center), Icon (Left) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  {/* Selection Radio Circle */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#170e5e' : '#cbd5e1'}`,
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                      marginTop: '3px',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: '#170e5e',
                        }}
                      />
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: isSelected ? '#170e5e' : '#0f172a',
                        lineHeight: 1.3,
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {act.name}
                    </h4>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: '#64748b',
                        display: 'block',
                        marginTop: '3px',
                        lineHeight: 1.35,
                      }}
                    >
                      {act.tagline}
                    </span>
                  </div>

                  {/* Activity Icon */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: isSelected ? '#ede9fe' : '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${isSelected ? '#c4b5fd' : '#e2e8f0'}`,
                      flexShrink: 0,
                      transition: 'background-color 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    {getActivityIcon(act.key, isSelected, 18)}
                  </div>
                </div>

                {/* Description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.76rem',
                    color: '#475569',
                    lineHeight: 1.45,
                    flex: 1,
                  }}
                >
                  {act.description}
                </p>
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
          {/* Option: Wipe Existing (Super Admin only) */}
          {isPlatform && (
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: wipeExisting ? '#fef2f2' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={wipeExisting}
                onChange={(e) => setWipeExisting(e.target.checked)}
                style={{ marginTop: '3px', accentColor: '#dc2626', width: '16px', height: '16px' }}
              />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#991b1b' }}>
                  تصفير البيانات السابقة واستبدالها بنظافة (صلاحية السوبر أدمن)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  يتطلب إدخال كلمة مرور السوبر أدمن لتأكيد تفريغ كافة البيانات القديمة للنسخة.
                </p>
              </div>
            </label>
          )}

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

        {/* Primary Action Button or Active Store Notice */}
        {!isPlatform && status && !status.isEmpty ? (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#170e5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheckIcon size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                  المتجر قيد التشغيل الفعلي ويحتوي على بيانات مسجلة ({status.productCount} صنف و {status.saleCount} فاتورة)
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  لحماية بيانات متجرك من التداخل، تم قفل استيراد البيانات التجريبية. لتصفير المتجر وإعادته فارغاً للبدء الفعلي، يرجى التواصل مع إدارة المنصة (السوبر أدمن).
                </span>
              </div>
            </div>
          </div>
        ) : (
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
              النشاط المحدد: <strong style={{ color: '#170e5e' }}>{selectedActivity?.name || selectedActivityKey}</strong> ({(selectedActivity?.productCount ?? selectedActivity?.productsCount ?? 0)} صنفاً)
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCwIcon size={16} className="animate-spin" />
                  <span>جاري ملء النظام بالبيانات (5 ثوانٍ)...</span>
                </span>
              ) : (
                <span>استيراد بيانات النشاط فورياً بنقرة واحدة</span>
              )}
            </Button>
          </div>
        )}

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

      {/* ─── Clean Demo Wipe & Safe Reset Zone (Super Admin only) ────────────────── */}
      {isPlatform && (
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe4e6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff1f2';
            }}
          >
            <Trash2Icon size={16} />
            <span>تفريغ ومسح البيانات التجريبية فقط</span>
          </button>
        </div>
      )}

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
                <ShieldCheckIcon size={20} />
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

      {/* ─── Modal: Clear Demo Data (Super Admin Only) ─────────────────────────── */}
      {isPlatform && showClearModal && (
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
                <Trash2Icon size={20} />
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
              <CheckCircleIcon size={36} color="#10b981" />
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
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ShoppingCartIcon size={16} />
                  <span>تجربة شاشة الكاشير السريعة (POS)</span>
                </span>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <BarChartIcon size={15} />
                    <span>لوحة التحكم والتحليلات</span>
                  </span>
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
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <PackageIcon size={15} />
                    <span>مراجعة الأصناف والمخزون</span>
                  </span>
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
