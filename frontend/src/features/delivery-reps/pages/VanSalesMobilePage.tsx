import { useState, useMemo } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vanSalesApi, VanActiveTripResponse, VanStockItem, VanLoadRequisitionRecord } from '../api/van-sales.api';
import { driverPortalApi } from '@/shared/api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { TruckIcon, PackageIcon } from '@/shared/components/icons/AppIcons';
import { systemConfirm, toast } from '@/shared/components/system-alert';
import { VanSalesLogin } from '../components/VanSalesLogin';
import { VanSalesReceiptModal } from '../components/VanSalesReceiptModal';
import { VanInventoryTab } from '../components/VanInventoryTab';
import { VanSaleTab, CartItem } from '../components/VanSaleTab';
import { VanCollectionTab } from '../components/VanCollectionTab';
import { VanSettleTab } from '../components/VanSettleTab';
import { DriverLoadRequisitionModal } from '../components/DriverLoadRequisitionModal';

export default function VanSalesMobilePage() {
  const queryClient = useQueryClient();

  const [session, setSession] = useState(() => driverPortalApi.getStoredSession());

  const handleLogout = async () => {
    const confirmed = await systemConfirm({
      title: 'تسجيل الخروج',
      message: 'هل تود بالتأكيد تسجيل الخروج من بوابة مبيعات الفان الميدانية؟',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      variant: 'danger',
    });
    if (confirmed) {
      driverPortalApi.logout();
      setSession(null);
      queryClient.clear();
      toast.info('تم تسجيل الخروج بنجاح');
    }
  };

  const { data, isLoading, refetch } = useQuery<VanActiveTripResponse>({
    queryKey: ['van-sales-active-trip'],
    queryFn: () => vanSalesApi.getActiveTrip(),
    enabled: Boolean(session),
    refetchInterval: 15000,
  });

  // Query driver's recent requisitions
  const { data: myRequisitions = [] } = useQuery<VanLoadRequisitionRecord[]>({
    queryKey: ['driver-my-requisitions'],
    queryFn: () => vanSalesApi.listMyRequisitions(),
    enabled: Boolean(session && !data?.hasActiveTrip),
    refetchInterval: 15000,
  });

  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'sale' | 'collection' | 'settle'>('inventory');
  const [stockSearch, setStockSearch] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [colCustomerId, setColCustomerId] = useState<number | ''>('');
  const [colAmount, setColAmount] = useState<string>('');

  const [countedCash, setCountedCash] = useState<string>('');
  const [unloadRemaining, setUnloadRemaining] = useState<boolean>(true);

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const filteredInventory = useMemo(() => {
    if (!data?.inventory) return [];
    if (!stockSearch.trim()) return data.inventory;
    const q = stockSearch.toLowerCase();
    return data.inventory.filter(
      (item) => item.productName.toLowerCase().includes(q) || item.barcode.toLowerCase().includes(q),
    );
  }, [data?.inventory, stockSearch]);

  const addToCart = (item: VanStockItem) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.productId === item.productId);
      if (exists) {
        if (exists.qty >= item.qty) {
          showAlert('error', `أقصى كمية متوفرة بالسيارة هي ${item.qty}`);
          return prev;
        }
        return prev.map((c) => (c.productId === item.productId ? { ...c, qty: c.qty + 1 } : c));
      }
      return [
        ...prev,
        {
          productId: item.productId,
          name: item.productName,
          qty: 1,
          unitPrice: item.retailPrice,
          maxQty: item.qty,
        },
      ];
    });
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId === productId) {
            const next = c.qty + delta;
            if (next > c.maxQty) {
              showAlert('error', `أقصى كمية متوفرة هي ${c.maxQty}`);
              return c;
            }
            return { ...c, qty: next };
          }
          return c;
        })
        .filter((c) => c.qty > 0),
    );
  };

  const cartTotal = useMemo(() => cart.reduce((sum, c) => sum + c.qty * c.unitPrice, 0), [cart]);

  const executeSaleMutation = useMutation({
    mutationFn: vanSalesApi.executeSale,
    onSuccess: (res) => {
      showAlert('success', `تم إصدار الفاتورة #${res.docNo} بمبلغ ${res.total} ${getGlobalCurrencySymbol()} بنجاح!`);
      setLastSaleReceipt(res);
      setCart([]);
      setSelectedCustomerId('');
      setNewCustomerName('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل إصدار الفاتورة'),
  });

  const recordCollectionMutation = useMutation({
    mutationFn: vanSalesApi.recordCollection,
    onSuccess: (res) => {
      showAlert('success', `تم تسجيل تحصيل ${res.amount} ${getGlobalCurrencySymbol()} من "${res.customerName}"، الرصيد المتبقي: ${res.newBalance} ${getGlobalCurrencySymbol()}`);
      setColAmount('');
      setColCustomerId('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل تسجيل التحصيل'),
  });

  const settleTripMutation = useMutation({
    mutationFn: vanSalesApi.settleTrip,
    onSuccess: (res) => {
      showAlert('success', `تم إغلاق وتصفية رحلة التوزيع بنجاح! عجز/زيادة الكاش: ${res.variance} ${getGlobalCurrencySymbol()}`);
      setCountedCash('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل تصفية الرحلة'),
  });

  if (!session) {
    return <VanSalesLogin onLoginSuccess={(sess) => { setSession(sess); queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] }); }} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', paddingBottom: '40px', fontFamily: 'inherit' }} dir="rtl">
      {/* Top Header */}
      <header
        style={{
          backgroundColor: '#170e5e',
          color: '#ffffff',
          padding: '12px 18px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TruckIcon size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>مبيعات وتوزيع الفان</h1>
            <span style={{ fontSize: '11px', opacity: 0.85 }}>{session.rep?.fullName || session.rep?.name || 'المندوب'} • {data?.trip?.vehiclePlate ? `سيارة [${data.trip.vehiclePlate}]` : 'الميدان'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
          >
            تحديث
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
          >
            خروج
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            backgroundColor: alert.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '10px 16px',
            fontSize: '12.5px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {alert.message}
        </div>
      )}

      {/* Main Container */}
      <main style={{ padding: '14px 16px', maxWidth: '820px', margin: '0 auto' }}>
        {/* Monthly Target Progress Card */}
        {data?.targetMetrics && data.targetMetrics.targetAmount > 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              marginBottom: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e' }}>
                تارجت مبيعات الشهر ({data.targetMetrics.periodMonth}): {data.targetMetrics.targetAmount.toFixed(2)} {getGlobalCurrencySymbol()}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: data.targetMetrics.isTargetAchieved ? '#15803d' : '#4338ca',
                  backgroundColor: data.targetMetrics.isTargetAchieved ? '#dcfce7' : '#eef2ff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {data.targetMetrics.isTargetAchieved ? 'تم تحقيق الهدف بنجاح!' : `محقق: ${data.targetMetrics.achievementRate}%`}
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
              <div
                style={{
                  width: `${Math.min(100, data.targetMetrics.achievementRate)}%`,
                  height: '100%',
                  backgroundColor: data.targetMetrics.isTargetAchieved ? '#16a34a' : '#170e5e',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', flexWrap: 'wrap', gap: '6px' }}>
              <span>المحقق فعلياً: <strong style={{ color: '#0f172a' }}>{data.targetMetrics.actualSalesMTD.toFixed(2)}</strong></span>
              <span>المتبقي: <strong style={{ color: '#dc2626' }}>{data.targetMetrics.remainingTarget.toFixed(2)}</strong></span>
              <span>متبقي <strong style={{ color: '#170e5e' }}>{data.targetMetrics.remainingWorkingDays}</strong> يوم عمل (مستبعداً الجمعات)</span>
              <span>المطلوب يومياً: <strong style={{ color: '#d97706' }}>{data.targetMetrics.requiredDailyTarget.toFixed(2)} {getGlobalCurrencySymbol()}/يوم</strong></span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontWeight: 700 }}>جاري تحميل بيانات رحلة الفان...</div>
        ) : !data?.hasActiveTrip ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 20px', textAlign: 'center', marginTop: '14px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#eef2ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <PackageIcon size={32} color="#170e5e" strokeWidth={1.8} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>لا توجد رحلة توزيع نشطة حالياً</h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 auto 16px', maxWidth: '420px', lineHeight: 1.5 }}>
              سيارتك جاهزة لبدء العمل! يمكنك إرسال طلب شحن بضاعة صباحي لمشرف المستودع للمراجعة وصرف البضاعة.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <Button
                variant="primary"
                onClick={() => setRequisitionModalOpen(true)}
                style={{ backgroundColor: '#170e5e', color: '#ffffff', fontSize: '12.5px', fontWeight: 800 }}
              >
                + إنشاء طلب شحن بضاعة صباحي (إذن تحميل)
              </Button>
              <Button variant="secondary" onClick={() => refetch()} style={{ fontSize: '12.5px' }}>
                تحديث حالة الرحلة
              </Button>
            </div>

            {/* My Recent Requisitions */}
            {myRequisitions.length > 0 && (
              <div style={{ marginTop: '20px', textAlign: 'right', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '8px' }}>
                  طلبات الشحن السابقة الخاصة بك:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myRequisitions.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                          طلب شحن #{req.docNo}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          المستودع: {req.sourceWarehouseName} • {req.requestedItems.length} أصناف
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor:
                            req.status === 'dispatched'
                              ? '#dcfce7'
                              : req.status === 'rejected'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            req.status === 'dispatched'
                              ? '#15803d'
                              : req.status === 'rejected'
                              ? '#b91c1c'
                              : '#b45309',
                        }}
                      >
                        {req.status === 'dispatched'
                          ? 'تم الصرف والتحميل'
                          : req.status === 'rejected'
                          ? 'مرفوض'
                          : 'قيد مراجعة المشرف'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Live Financial & KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block' }}>إجمالي مبيعات اليوم</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>{data.trip?.salesAmount.toFixed(2)} <CurrencySymbol /></span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', display: 'block' }}>النقدية المحصلة (كاش)</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#047857' }}>{data.trip?.cashCollected.toFixed(2)} <CurrencySymbol /></span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', display: 'block' }}>المبيعات الآجلة</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#b45309' }}>{data.trip?.creditSales.toFixed(2)} <CurrencySymbol /></span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#170e5e', display: 'block' }}>بضاعة السيارة الحالية</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#1e1b4b' }}>{data.inventory.length} أصناف</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '10px', marginBottom: '14px', fontSize: '12px', fontWeight: 700 }}>
              <button
                type="button"
                onClick={() => setActiveTab('inventory')}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'inventory' ? '#ffffff' : 'transparent', color: activeTab === 'inventory' ? '#170e5e' : '#475569', fontWeight: 700 }}
              >
                بضاعة السيارة ({data.inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sale')}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'sale' ? '#ffffff' : 'transparent', color: activeTab === 'sale' ? '#170e5e' : '#475569', fontWeight: 700 }}
              >
                فاتورة بيع {cart.length > 0 && `(${cart.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('collection')}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'collection' ? '#ffffff' : 'transparent', color: activeTab === 'collection' ? '#170e5e' : '#475569', fontWeight: 700 }}
              >
                تحصيل / مرتجع
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settle')}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'settle' ? '#ffffff' : 'transparent', color: activeTab === 'settle' ? '#170e5e' : '#475569', fontWeight: 700 }}
              >
                تصفية اليومية
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'inventory' && (
              <VanInventoryTab
                stockSearch={stockSearch}
                onSearchChange={setStockSearch}
                filteredInventory={filteredInventory}
                onAddToCart={(item) => {
                  addToCart(item);
                  setActiveTab('sale');
                }}
              />
            )}

            {activeTab === 'sale' && (
              <VanSaleTab
                customers={data.customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={(val) => {
                  setSelectedCustomerId(val);
                  if (val) setNewCustomerName('');
                }}
                newCustomerName={newCustomerName}
                onNewCustomerNameChange={setNewCustomerName}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                cart={cart}
                onUpdateCartQty={updateCartQty}
                cartTotal={cartTotal}
                onGoToInventory={() => setActiveTab('inventory')}
                onSubmitSale={async () => {
                  let gpsLat: number | undefined;
                  let gpsLng: number | undefined;
                  if (typeof navigator !== 'undefined' && navigator.geolocation) {
                    try {
                      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500, enableHighAccuracy: true });
                      });
                      gpsLat = pos.coords.latitude;
                      gpsLng = pos.coords.longitude;
                    } catch {}
                  }

                  executeSaleMutation.mutate({
                    tripId: data.trip!.id,
                    customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
                    customerName: newCustomerName || undefined,
                    paymentMethod,
                    deliveryGpsLat: gpsLat,
                    deliveryGpsLng: gpsLng,
                    items: cart.map((c) => ({ productId: c.productId, qty: c.qty, unitPrice: c.unitPrice })),
                  });
                }}
                isSubmitting={executeSaleMutation.isPending}
              />
            )}

            {activeTab === 'collection' && (
              <VanCollectionTab
                tripId={data.trip!.id}
                customers={data.customers}
                colCustomerId={colCustomerId}
                onColCustomerChange={setColCustomerId}
                colAmount={colAmount}
                onColAmountChange={setColAmount}
                onSubmitCollection={async () => {
                  if (!colCustomerId || !Number(colAmount)) {
                    showAlert('error', 'يرجى اختيار العميل وإدخال مبلغ التحصيل');
                    return;
                  }
                  let gpsLat: number | undefined;
                  let gpsLng: number | undefined;
                  if (typeof navigator !== 'undefined' && navigator.geolocation) {
                    try {
                      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500, enableHighAccuracy: true });
                      });
                      gpsLat = pos.coords.latitude;
                      gpsLng = pos.coords.longitude;
                    } catch {}
                  }
                  recordCollectionMutation.mutate({
                    tripId: data.trip!.id,
                    customerId: Number(colCustomerId),
                    amount: Number(colAmount),
                    gpsLat,
                    gpsLng,
                  });
                }}
                isSubmitting={recordCollectionMutation.isPending}
                onReturnSuccess={(docNo, amount) => {
                  showAlert('success', `تم رفع إذن المرتجع #${docNo} بقيمة ${amount.toFixed(2)} ${getGlobalCurrencySymbol()} للإدارة بنجاح`);
                }}
              />
            )}

            {activeTab === 'settle' && (
              <VanSettleTab
                tripData={data.trip}
                countedCash={countedCash}
                onCountedCashChange={setCountedCash}
                unloadRemaining={unloadRemaining}
                onUnloadRemainingChange={setUnloadRemaining}
                onSubmitSettle={() => {
                  if (countedCash === '') {
                    showAlert('error', 'يرجى جرد وإدخال النقدية الفعلية الموجودة معك');
                    return;
                  }
                  settleTripMutation.mutate({
                    tripId: data.trip!.id,
                    countedCash: Number(countedCash),
                    unloadRemainingToWarehouse: unloadRemaining,
                  });
                }}
                isSubmitting={settleTripMutation.isPending}
              />
            )}
          </>
        )}
      </main>

      {/* Sale Receipt Modal */}
      {lastSaleReceipt && (
        <VanSalesReceiptModal
          receipt={lastSaleReceipt}
          onClose={() => setLastSaleReceipt(null)}
        />
      )}

      {/* Driver Loading Requisition Modal */}
      <DriverLoadRequisitionModal
        open={requisitionModalOpen}
        onClose={() => setRequisitionModalOpen(false)}
        onRequisitionSubmitted={(docNo) => {
          showAlert('success', `تم إرسال طلب إذن التحميل #${docNo} للمشرف بنجاح!`);
          refetch();
        }}
      />
    </div>
  );
}
