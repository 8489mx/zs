import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverPortalApi, DeliveryOrder, SettleOrderPayload, DriverPortalUser } from '../api/delivery-reps.api';
import { DeliverySettlementModal } from '../components/DeliverySettlementModal';
import { Button } from '@/shared/ui/button';
import {
  RefreshCwIcon,
  TruckIcon,
  SmartphoneIcon,
  PackageIcon,
  UserIcon,
  MapPinIcon,
  MessageSquareIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';

function BuildingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

interface OfflineQueueItem {
  orderId: number;
  docNo: string;
  customerName: string;
  total: number;
  payload?: SettleOrderPayload;
  settledAt: string;
}

export function DriverPortalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [driverUser, setDriverUser] = useState<DriverPortalUser | null>(() => {
    const session = driverPortalApi.getStoredSession();
    return session ? session.rep : null;
  });

  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [disambiguationTenants, setDisambiguationTenants] = useState<Array<{ id: string; name: string; slug: string }> | null>(null);

  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSettleOrder, setActiveSettleOrder] = useState<DeliveryOrder | null>(null);

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('zs_driver_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['driver-portal-orders', driverUser?.id, statusFilter],
    queryFn: () => driverPortalApi.getOrders(statusFilter === 'all' ? undefined : statusFilter),
    enabled: Boolean(driverUser?.id),
    refetchInterval: 25000,
  });

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setDisambiguationTenants(null);
    const cleanPhone = phoneInput.trim();
    const cleanPin = pinInput.trim();
    if (!cleanPhone || !cleanPin) {
      setLoginError('يرجى إدخال رقم الهاتف ورمز الـ PIN');
      return;
    }

    setIsLoggingIn(true);
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const companyCode = urlParams?.get('c') || urlParams?.get('tenant') || (typeof localStorage !== 'undefined' ? localStorage.getItem('zs_driver_last_company_code') : null) || undefined;
      const res = await driverPortalApi.login(cleanPhone, cleanPin, companyCode);
      if (companyCode) {
        localStorage.setItem('zs_driver_last_company_code', companyCode);
      }
      setDriverUser(res.rep);
    } catch (err: any) {
      const details = err?.details || err?.error?.details || err?.response?.data?.details || err?.response?.data || err;
      const tenants = details?.tenants || details?.error?.tenants || err?.tenants;
      const code = err?.code || details?.code || details?.error?.code || err?.response?.data?.code;

      if ((code === 'MULTIPLE_TENANTS' || code === 'AMBIGUOUS_DRIVER_TENANT') && Array.isArray(tenants) && tenants.length > 0) {
        setDisambiguationTenants(tenants);
        return;
      }
      setLoginError(err.message || 'بيانات الدخول غير صحيحة، تأكد من رقم الهاتف والرمز السري');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const cleanPhone = phoneInput.trim();
      const cleanPin = pinInput.trim();
      const res = await driverPortalApi.login(cleanPhone, cleanPin, tenantId);
      localStorage.setItem('zs_driver_last_company_code', tenantId);
      setDisambiguationTenants(null);
      setDriverUser(res.rep);
    } catch (err: any) {
      setLoginError(err.message || 'تعذر تسجيل الدخول للمنشأة المحددة');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSwitchTenant = () => {
    if (window.confirm('هل تود الانتقال والتبديل إلى منشأة أخرى؟')) {
      driverPortalApi.logout();
      setDriverUser(null);
      setDisambiguationTenants(null);
    }
  };

  const handleLogout = () => {
    if (window.confirm('هل تود تسجيل الخروج من حساب المندوب؟')) {
      driverPortalApi.logout();
      setDriverUser(null);
      setDisambiguationTenants(null);
    }
  };

  const saveToOfflineQueue = (order: DeliveryOrder, payload?: SettleOrderPayload) => {
    const item: OfflineQueueItem = {
      orderId: order.id,
      docNo: order.docNo,
      customerName: order.customerName,
      total: Number(order.total || 0),
      payload,
      settledAt: new Date().toISOString(),
    };
    const updated = [item, ...offlineQueue];
    setOfflineQueue(updated);
    localStorage.setItem('zs_driver_offline_queue', JSON.stringify(updated));
    alert('تم حفظ إثبات التسليم محلياً في وضع عدم الاتصال (Offline) وسيتم رفعه فور عودة الشبكة.');
    setActiveSettleOrder(null);
  };

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || isSyncingOffline) return;
    setIsSyncingOffline(true);
    const remaining: OfflineQueueItem[] = [];

    for (const item of offlineQueue) {
      try {
        await driverPortalApi.settleOrder(item.orderId, item.payload);
      } catch (err: any) {
        if (!navigator.onLine || err?.message?.includes('Network') || err?.message?.includes('Failed to fetch')) {
          remaining.push(item);
        }
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem('zs_driver_offline_queue', JSON.stringify(remaining));
    setIsSyncingOffline(false);
    queryClient.invalidateQueries({ queryKey: ['driver-portal-orders'] });

    if (remaining.length === 0) {
      alert('تمت مزامنة جميع الشحنات المعلقة مع السيرفر بنجاح!');
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      void syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineQueue]);

  const settleMutation = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: number; payload?: SettleOrderPayload }) =>
      driverPortalApi.settleOrder(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-portal-orders', driverUser?.id] });
      setActiveSettleOrder(null);
      alert('تم تأكيد تسليم الشحنة بنجاح!');
    },
    onError: (err: any, vars) => {
      if (!navigator.onLine || err?.message?.includes('Network') || err?.message?.includes('Failed to fetch')) {
        if (activeSettleOrder) {
          saveToOfflineQueue(activeSettleOrder, vars.payload);
        }
      } else {
        alert(err.message || 'فشل تأكيد تسليم الشحنة');
      }
    },
  });

  const handleCall = (phone?: string | null) => {
    if (!phone) return alert('رقم هاتف العميل غير متوفر');
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  };

  const handleWhatsApp = (phone?: string | null, docNo?: string) => {
    if (!phone) return alert('رقم هاتف العميل غير متوفر');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const target = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    const msg = `مرحباً، أنا مندوب التوصيل بخصوص طلبك رقم #${docNo || ''}. أنا في طريقي إليك!`;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMap = (address?: string | null) => {
    if (!address) return alert('عنوان العميل غير محدد بدقة');
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSettleConfirm = (payload: SettleOrderPayload) => {
    if (!activeSettleOrder) return;
    settleMutation.mutate({ saleId: activeSettleOrder.id, payload });
  };

  const filteredOrders = orders.filter((o) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDoc = String(o.docNo || '').toLowerCase().includes(q);
      const matchName = String(o.customerName || '').toLowerCase().includes(q);
      const matchPhone = String(o.customerPhone || '').includes(q);
      if (!matchDoc && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const pendingCount = orders.filter((o) => !o.settledAt && o.deliveryStatus !== 'settled').length;
  const pendingAmount = orders.filter((o) => !o.settledAt && o.deliveryStatus !== 'settled').reduce((sum, o) => sum + Number(o.total || 0), 0);
  const settledCount = orders.filter((o) => Boolean(o.settledAt) || o.deliveryStatus === 'settled').length;

  if (!driverUser) {
    return (
      <div 
        dir="rtl"
        style={{ 
          minHeight: '100vh', 
          background: '#f8fafc', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '20px 16px',
          boxSizing: 'border-box'
        }}
      >
        <div 
          style={{ 
            width: '100%', 
            maxWidth: '420px', 
            background: '#ffffff', 
            borderRadius: '16px', 
            border: '1px solid #e2e8f0', 
            padding: '32px 24px', 
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                background: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '12px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)'
              }}
            >
              <TruckIcon size={32} color="#2563eb" />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
              بوابة مندوب التوصيل
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
              أدخل رقم الهاتف والرمز السري (PIN) لمتابعة شحناتك
            </p>
          </div>

          {loginError && (
            <div 
              style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '10px 12px', 
                marginBottom: '16px', 
                fontSize: '12.5px', 
                color: '#dc2626',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم هاتف المندوب
              </label>
              <input
                type="text"
                placeholder="مثال: 01012345678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  direction: 'ltr',
                  textAlign: 'right',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز الدخول السريع (PIN Code)
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="مثال: 1234"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  direction: 'ltr',
                  textAlign: 'center',
                  letterSpacing: '4px',
                  outline: 'none',
                }}
              />
              <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                * الرمز المسجل لك من قبل إدارة الفرع
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: '100%',
                padding: '13px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
                marginTop: '6px',
                opacity: isLoggingIn ? 0.7 : 1,
              }}
            >
              {isLoggingIn ? 'جاري التحقق...' : 'تسجيل الدخول واستلام الشحنات'}
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
              منظومة Z-Systems اللوجستية لإدارة أساطيل الدليفري
            </span>
          </div>

          <div style={{ marginTop: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              to="/van-sales"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#0284c7',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>الانتقال لبوابة مبيعات سيارات الفان (فان كاشير) ←</span>
            </Link>
            <Link
              to="/hub"
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#170e5e',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>← العودة لمركز البوابات</span>
            </Link>
          </div>
        </div>

        {disambiguationTenants && disambiguationTenants.length > 0 && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
            }}
            dir="rtl"
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid #e2e8f0',
                width: '100%',
                maxWidth: '460px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#ede9fe',
                      color: '#170e5e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BuildingIcon />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      اختر المنشأة لبدء التوصيل
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      رقمك مسجل كمندوب لدى أكثر من منشأة
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#475569', margin: '8px 0 0', lineHeight: 1.5 }}>
                  يرجى تحديد المنشأة التي ترغب في توصيل طلباتها ومتابعة عهدتها الآن:
                </p>
              </div>

              <div style={{ padding: '16px 24px', maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {disambiguationTenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => handleSelectTenant(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      cursor: isLoggingIn ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease-in-out',
                      textAlign: 'right',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#170e5e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          backgroundColor: '#f1f5f9',
                          color: '#170e5e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <BuildingIcon />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{t.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>كود المنشأة: {t.slug || t.id}</div>
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8' }}>
                      <ChevronLeftIcon />
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => setDisambiguationTenants(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Render Driver Workspace if logged in
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 14px', width: '100%', boxSizing: 'border-box' }} dir="rtl">
      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div
          style={{
            background: '#e0e7ff',
            border: '1px solid #c7d2fe',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#1e1b4b' }}>
            <SmartphoneIcon size={18} color="#1e1b4b" />
            <div>
              <strong>تثبيت التطبيق على الموبايل:</strong> شاشة كاملة وسرعة وصول بدون متصفح.
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallPwa}
            style={{
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
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

      {/* Offline Pending Sync Banner */}
      {offlineQueue.length > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400e' }}>
            <PackageIcon size={18} color="#92400e" />
            <div>
              <strong>شحنات بانتظار المزامنة:</strong> لديك {offlineQueue.length} شحنة سُلمت بدون نت.
            </div>
          </div>
          <button
            type="button"
            onClick={syncOfflineQueue}
            disabled={isSyncingOffline}
            style={{
              background: '#b45309',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isSyncingOffline ? 'جاري الرفع...' : 'مزامنة الآن'}
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TruckIcon size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>أهلاً، كابتن {driverUser.name}</span>
              {driverUser.tenantName && (
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {driverUser.tenantName}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {driverUser.phone ? `هاتف: ${driverUser.phone}` : ''}
              {driverUser.vehiclePlate ? ` • لوحة: ${driverUser.vehiclePlate}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link
            to="/hub"
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="العودة لمركز البوابات"
          >
            <span>مركز البوابات</span>
          </Link>
          <button
            type="button"
            onClick={() => navigate('/van-sales')}
            style={{
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="الانتقال إلى شاشة مبيعات سيارة الفان الميدانية"
          >
            <TruckIcon size={14} color="#047857" />
            <span>مبيعات الفان</span>
          </button>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCwIcon size={13} color="#475569" />
            <span>{isFetching ? '...' : 'تحديث'}</span>
          </Button>
          <button
            type="button"
            onClick={handleSwitchTenant}
            style={{
              background: '#f8fafc',
              color: '#170e5e',
              border: '1px solid #cbd5e1',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="التبديل إلى منشأة أخرى"
          >
            <span>تبديل المنشأة</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '7px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            خروج
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>مطلوب تسليمها</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#ea580c', marginTop: '2px' }}>{pendingCount}</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>المطلوب تحصيله</div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>{pendingAmount.toLocaleString('ar-EG')} ج.م</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>تم تسليمها</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{settledCount}</div>
        </div>
      </div>

      {/* Search and Tabs */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            style={{
              flex: 1,
              padding: '7px 4px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              background: statusFilter === 'pending' ? '#ea580c' : '#f1f5f9',
              color: statusFilter === 'pending' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            قيد التسليم ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('settled')}
            style={{
              flex: 1,
              padding: '7px 4px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              background: statusFilter === 'settled' ? '#16a34a' : '#f1f5f9',
              color: statusFilter === 'settled' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            تم تسليمها ({settledCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              flex: 1,
              padding: '7px 4px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              background: statusFilter === 'all' ? '#0f172a' : '#f1f5f9',
              color: statusFilter === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            الكل ({orders.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="ابحث برقم الفاتورة أو اسم العميل أو الموبايل..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '12.5px',
            boxSizing: 'border-box',
            outline: 'none',
            background: '#ffffff',
          }}
        />
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isLoading && (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
            جاري تحميل الشحنات...
          </div>
        )}

        {!isLoading && filteredOrders.length === 0 && (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <PackageIcon size={32} color="#94a3b8" />
            </div>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>لا توجد شحنات مطابقة</strong>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              لا توجد أي طلبات حالياً تحت هذا القسم أو البحث
            </p>
          </div>
        )}

        {filteredOrders.map((order) => {
          const isSettled = Boolean(order.settledAt) || order.deliveryStatus === 'settled';
          return (
            <div
              key={order.id}
              style={{
                background: '#ffffff',
                border: isSettled ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      طلب #{order.docNo || order.id}
                    </strong>
                    {isSettled ? (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckIcon size={11} color="#16a34a" strokeWidth={2.5} />
                        <span>تم التسليم</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#ffedd5', color: '#ea580c', padding: '2px 6px', borderRadius: '4px' }}>
                        قيد التوصيل
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <UserIcon size={13} color="#64748b" />
                    <span>{order.customerName || 'عميل نقدي'}</span>
                  </div>
                  {order.customerPhone && (
                    <div style={{ fontSize: '12px', color: '#64748b', direction: 'ltr', textAlign: 'right', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <SmartphoneIcon size={12} color="#64748b" />
                      <span>{order.customerPhone}</span>
                    </div>
                  )}
                  {order.customerAddress && (
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPinIcon size={12} color="#64748b" />
                      <span>{order.customerAddress}</span>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>المطلوب:</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e' }}>
                    {Number(order.total || 0).toLocaleString('ar-EG')} ج.م
                  </div>
                </div>
              </div>

              {/* Quick Communication Actions */}
              <div style={{ display: 'flex', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => handleCall(order.customerPhone)}
                  disabled={!order.customerPhone}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#0369a1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <SmartphoneIcon size={13} color="#0369a1" />
                  <span>اتصال</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleWhatsApp(order.customerPhone, order.docNo)}
                  disabled={!order.customerPhone}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '7px',
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#15803d',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageSquareIcon size={13} color="#15803d" />
                  <span>واتساب</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenMap(order.customerAddress)}
                  disabled={!order.customerAddress}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '7px',
                    border: '1px solid #fed7aa',
                    background: '#fff7ed',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#c2410c',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <MapPinIcon size={13} color="#c2410c" />
                  <span>الخريطة</span>
                </button>
              </div>

              {/* Settle Action Button */}
              {!isSettled && (
                <button
                  type="button"
                  onClick={() => setActiveSettleOrder(order)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>تأكيد التسليم مع إثبات وتوقيع العميل</span>
                </button>
              )}

              {isSettled && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckIcon size={12} color="#16a34a" strokeWidth={2.5} />
                    <span>تم تسليمها وتحصيل {Number(order.total || 0).toLocaleString('ar-EG')} ج.م</span>
                  </span>
                  {order.deliverySignature && <span>موقّع</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settle Proof Modal */}
      {activeSettleOrder && (
        <DeliverySettlementModal
          order={activeSettleOrder}
          isOpen={Boolean(activeSettleOrder)}
          onClose={() => setActiveSettleOrder(null)}
          onConfirm={handleSettleConfirm}
          isSubmitting={settleMutation.isPending}
        />
      )}
    </div>
  );
}
