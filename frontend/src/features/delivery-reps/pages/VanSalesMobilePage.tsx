import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { vanSalesApi, VanActiveTripResponse, VanStockItem } from '../api/van-sales.api';
import { driverPortalApi } from '@/shared/api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { TruckIcon, PackageIcon } from '@/shared/components/icons/AppIcons';
import { VanSalesLogin } from '../components/VanSalesLogin';
import { VanSalesReceiptModal } from '../components/VanSalesReceiptModal';
import { VanInventoryTab } from '../components/VanInventoryTab';
import { VanSaleTab, CartItem } from '../components/VanSaleTab';
import { VanCollectionTab } from '../components/VanCollectionTab';
import { VanSettleTab } from '../components/VanSettleTab';

export default function VanSalesMobilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [session, setSession] = useState(() => driverPortalApi.getStoredSession());

  const handleLogout = () => {
    if (window.confirm('هل تود تسجيل الخروج من بوابة مبيعات الفان؟')) {
      driverPortalApi.logout();
      setSession(null);
      queryClient.clear();
    }
  };

  const { data, isLoading, refetch } = useQuery<VanActiveTripResponse>({
    queryKey: ['van-sales-active-trip'],
    queryFn: () => vanSalesApi.getActiveTrip(),
    enabled: Boolean(session),
    refetchInterval: 15000,
  });

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
      showAlert('success', `تم إصدار الفاتورة #${res.docNo} بمبلغ ${res.total} ج.م بنجاح!`);
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
      showAlert('success', `تم تسجيل تحصيل ${res.amount} ج.م من "${res.customerName}"، الرصيد المتبقي: ${res.newBalance} ج.م`);
      setColAmount('');
      setColCustomerId('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل تسجيل التحصيل'),
  });

  const settleTripMutation = useMutation({
    mutationFn: vanSalesApi.settleTrip,
    onSuccess: (res) => {
      showAlert('success', `تم إغلاق وتصفية رحلة التوزيع بنجاح! عجز/زيادة الكاش: ${res.variance} ج.م`);
      setCountedCash('');
      queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] });
    },
    onError: (err: any) => showAlert('error', err?.message || 'فشل تصفية الرحلة'),
  });

  if (!session) {
    return <VanSalesLogin onLoginSuccess={(sess) => { setSession(sess); queryClient.invalidateQueries({ queryKey: ['van-sales-active-trip'] }); }} />;
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#1e293b', paddingBottom: '80px', boxSizing: 'border-box' }}>
      {/* Top Mobile Bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backgroundColor: '#170e5e', color: '#ffffff', padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TruckIcon size={20} color="#ffffff" strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '14px', margin: 0, lineHeight: 1.2 }}>مبيعات سيارة الفان (الميدان)</h1>
            <p style={{ fontSize: '11px', color: '#c7d2fe', margin: '2px 0 0' }}>المندوب: {session.rep.name} {session.rep.vehiclePlate ? `(${session.rep.vehiclePlate})` : ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link
            to="/hub"
            style={{ fontSize: '11.5px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', textDecoration: 'none' }}
            title="العودة لمركز البوابات"
          >
            مركز البوابات
          </Link>
          <button
            onClick={() => navigate('/driver')}
            type="button"
            style={{ fontSize: '11.5px', backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
          >
            طلبات الدليفري
          </button>
          <button
            onClick={handleLogout}
            type="button"
            style={{ fontSize: '11.5px', backgroundColor: 'rgba(239, 68, 68, 0.25)', color: '#fecaca', fontWeight: 700, padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.4)', cursor: 'pointer' }}
          >
            خروج
          </button>
        </div>
      </header>

      {/* Global Alert */}
      {alert && (
        <div
          style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 700,
            backgroundColor: alert.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: alert.type === 'success' ? '#065f46' : '#991b1b',
            border: alert.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
          }}
        >
          {alert.message}
        </div>
      )}

      {/* Main Container */}
      <main style={{ padding: '14px 16px', maxWidth: '820px', margin: '0 auto' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontWeight: 700 }}>جاري تحميل بيانات رحلة الفان...</div>
        ) : !data?.hasActiveTrip ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '36px 20px', textAlign: 'center', marginTop: '14px' }}>
            <div style={{ width: '60px', height: '60px', backgroundColor: '#eef2ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <PackageIcon size={32} color="#170e5e" strokeWidth={1.8} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>لا توجد رحلة توزيع نشطة حالياً</h2>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 auto 16px', maxWidth: '420px', lineHeight: 1.5 }}>
              سيارتك جاهزة! يمكنك شحن بضاعة الصباح من المستودع الرئيسي أو التواصل مع مشرف المخزن لبدء خط السير الميداني.
            </p>
            <Button variant="primary" onClick={() => refetch()} style={{ backgroundColor: '#170e5e', color: '#ffffff' }}>
              تحديث حالة الرحلة
            </Button>
          </div>
        ) : (
          <>
            {/* Live Financial & KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block' }}>إجمالي مبيعات اليوم</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>{data.trip?.salesAmount.toFixed(2)} ج.م</span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', display: 'block' }}>النقدية المحصلة (كاش)</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#047857' }}>{data.trip?.cashCollected.toFixed(2)} ج.م</span>
              </div>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', display: 'block' }}>المبيعات الآجلة</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#b45309' }}>{data.trip?.creditSales.toFixed(2)} ج.م</span>
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
                onSubmitSale={() => {
                  executeSaleMutation.mutate({
                    tripId: data.trip!.id,
                    customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
                    customerName: newCustomerName || undefined,
                    paymentMethod,
                    items: cart.map((c) => ({ productId: c.productId, qty: c.qty, unitPrice: c.unitPrice })),
                  });
                }}
                isSubmitting={executeSaleMutation.isPending}
              />
            )}

            {activeTab === 'collection' && (
              <VanCollectionTab
                customers={data.customers}
                colCustomerId={colCustomerId}
                onColCustomerChange={setColCustomerId}
                colAmount={colAmount}
                onColAmountChange={setColAmount}
                onSubmitCollection={() => {
                  if (!colCustomerId || !Number(colAmount)) {
                    showAlert('error', 'يرجى اختيار العميل وإدخال مبلغ التحصيل');
                    return;
                  }
                  recordCollectionMutation.mutate({
                    tripId: data.trip!.id,
                    customerId: Number(colCustomerId),
                    amount: Number(colAmount),
                  });
                }}
                isSubmitting={recordCollectionMutation.isPending}
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
                  if (!countedCash) {
                    showAlert('error', 'يرجى إدخال مبلغ الكاش الفعلي المعدود');
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

      <VanSalesReceiptModal receipt={lastSaleReceipt} onClose={() => setLastSaleReceipt(null)} />
    </div>
  );
}
