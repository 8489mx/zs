import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverPortalApi, DeliveryOrder, SettleOrderPayload, DriverPortalUser } from '../api/delivery-reps.api';
import { DeliverySettlementModal } from '../components/DeliverySettlementModal';
import { Button } from '@/shared/ui/button';
import { RefreshCwIcon } from '@/shared/components/icons/AppIcons';

interface OfflineQueueItem {
  orderId: number;
  docNo: string;
  customerName: string;
  total: number;
  payload?: SettleOrderPayload;
  settledAt: string;
}

export function DriverPortalPage() {
  const queryClient = useQueryClient();

  // Driver Auth State
  const [driverUser, setDriverUser] = useState<DriverPortalUser | null>(() => {
    const session = driverPortalApi.getStoredSession();
    return session ? session.rep : null;
  });

  // Login Form State
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App & Filter State
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSettleOrder, setActiveSettleOrder] = useState<DeliveryOrder | null>(null);

  // Offline Queue State
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('zs_driver_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // PWA Install Prompt State
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
    }
  };

  // Queries for Orders
  const { data: orders = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['driver-portal-orders', driverUser?.id, statusFilter],
    queryFn: () => driverPortalApi.getOrders(statusFilter === 'all' ? undefined : statusFilter),
    enabled: Boolean(driverUser?.id),
    refetchInterval: 25000,
  });

  // Login Mutation
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cleanPhone = phoneInput.trim();
    const cleanPin = pinInput.trim();
    if (!cleanPhone || !cleanPin) {
      setLoginError('يرجى إدخال رقم الهاتف ورمز الـ PIN');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await driverPortalApi.login(cleanPhone, cleanPin);
      setDriverUser(res.rep);
    } catch (err: any) {
      setLoginError(err.message || 'بيانات الدخول غير صحيحة، تأكد من رقم الهاتف والرمز السري');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('هل تود تسجيل الخروج من حساب المندوب؟')) {
      driverPortalApi.logout();
      setDriverUser(null);
    }
  };

  // Offline Helpers
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
    alert('تم حفظ إثبات التسليم محلياً في وضع عدم الاتصال (Offline) وسيتم رفعه فور عودة الشبكة. ✓');
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
      alert('تمت مزامنة جميع الشحنات المعلقة مع السيرفر بنجاح! ✓');
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      void syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineQueue]);

  // Settle Mutation
  const settleMutation = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: number; payload?: SettleOrderPayload }) =>
      driverPortalApi.settleOrder(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-portal-orders', driverUser?.id] });
      setActiveSettleOrder(null);
      alert('تم تأكيد تسليم الشحنة بنجاح! ✅');
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

  // Filtered orders
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

  // 1. Render Login Screen if not logged in
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
          {/* Brand Icon */}
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
                fontSize: '32px',
                marginBottom: '12px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.12)'
              }}
            >
              🛵
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
              {isLoggingIn ? 'جاري التحقق...' : 'تسجيل الدخول واستلام الشحنات 🚀'}
            </button>
          </form>

          {/* Quick Info */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
              منظومة Z-Systems اللوجستية لإدارة أساطيل الدليفري
            </span>
          </div>
        </div>
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
            <span style={{ fontSize: '18px' }}>📲</span>
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
            <span style={{ fontSize: '18px' }}>📦</span>
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
            {isSyncingOffline ? 'جاري الرفع...' : 'مزامنة الآن ↻'}
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
              fontSize: '20px',
            }}
          >
            🛵
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
              أهلاً، كابتن {driverUser.name}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {driverUser.phone ? `هاتف: ${driverUser.phone}` : ''}
              {driverUser.vehiclePlate ? ` • لوحة: ${driverUser.vehiclePlate}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              fontWeight: statusFilter === 'pending' ? 800 : 600,
              background: statusFilter === 'pending' ? '#ea580c' : '#f1f5f9',
              color: statusFilter === 'pending' ? '#ffffff' : '#475569',
              cursor: 'pointer',
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
              fontWeight: statusFilter === 'settled' ? 800 : 600,
              background: statusFilter === 'settled' ? '#16a34a' : '#f1f5f9',
              color: statusFilter === 'settled' ? '#ffffff' : '#475569',
              cursor: 'pointer',
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
              fontWeight: statusFilter === 'all' ? 800 : 600,
              background: statusFilter === 'all' ? '#0f172a' : '#f1f5f9',
              color: statusFilter === 'all' ? '#ffffff' : '#475569',
              cursor: 'pointer',
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
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📦</div>
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
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px' }}>
                        تم التسليم ✓
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 800, background: '#ffedd5', color: '#ea580c', padding: '2px 6px', borderRadius: '4px' }}>
                        قيد التوصيل
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                    👤 {order.customerName || 'عميل نقدي'}
                  </div>
                  {order.customerPhone && (
                    <div style={{ fontSize: '12px', color: '#64748b', direction: 'ltr', textAlign: 'right', marginTop: '2px' }}>
                      📞 {order.customerPhone}
                    </div>
                  )}
                  {order.customerAddress && (
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                      📍 {order.customerAddress}
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
                  📞 اتصال
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
                  💬 واتساب
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
                  📍 الخريطة
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
                  ✍️ تأكيد التسليم مع إثبات وتوقيع العميل
                </button>
              )}

              {isSettled && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#16a34a', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px' }}>
                  <span>✓ تم تسليمها وتحصيل {Number(order.total || 0).toLocaleString('ar-EG')} ج.م</span>
                  {order.deliverySignature && <span>✍️ موقّع</span>}
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
