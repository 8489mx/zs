import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { vanSalesApi, VanActiveTripResponse, VanStockItem } from '../api/van-sales.api';
import { driverPortalApi } from '@/shared/api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { TruckIcon, PackageIcon, CheckIcon, AlertTriangleIcon, ReceiptIcon } from '@/shared/components/icons/AppIcons';

export default function VanSalesMobilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Authentication check
  const [session] = useState(() => driverPortalApi.getStoredSession());

  useEffect(() => {
    if (!session) {
      navigate('/driver', { replace: true });
    }
  }, [session, navigate]);

  // Active Trip Query
  const { data, isLoading, refetch } = useQuery<VanActiveTripResponse>({
    queryKey: ['van-sales-active-trip'],
    queryFn: () => vanSalesApi.getActiveTrip(),
    enabled: Boolean(session),
    refetchInterval: 15000,
  });

  // Tab State
  const [activeTab, setActiveTab] = useState<'inventory' | 'sale' | 'collection' | 'settle'>('inventory');

  // Search filter for stock
  const [stockSearch, setStockSearch] = useState('');

  // New Sale State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [cart, setCart] = useState<{ productId: number; name: string; qty: number; unitPrice: number; maxQty: number }[]>([]);
  const [saleNotes, setSaleNotes] = useState('');

  // Collection State
  const [colCustomerId, setColCustomerId] = useState<number | ''>('');
  const [colAmount, setColAmount] = useState<string>('');
  const [colNotes, setColNotes] = useState('');

  // Settlement State
  const [countedCash, setCountedCash] = useState<string>('');
  const [unloadRemaining, setUnloadRemaining] = useState<boolean>(true);
  const [settleNotes, setSettleNotes] = useState<string>('');

  // Status Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Printed receipt state
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Filtered Stock
  const filteredInventory = useMemo(() => {
    if (!data?.inventory) return [];
    if (!stockSearch.trim()) return data.inventory;
    const q = stockSearch.toLowerCase();
    return data.inventory.filter(
      (item) => item.productName.toLowerCase().includes(q) || item.barcode.toLowerCase().includes(q),
    );
  }, [data?.inventory, stockSearch]);

  // Cart operations
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

  // Mutations
  const executeSaleMutation = useMutation({
    mutationFn: vanSalesApi.executeSale,
    onSuccess: (res) => {
      showAlert('success', `تم إصدار الفاتورة #${res.docNo} بمبلغ ${res.total} ج.م بنجاح!`);
      setLastSaleReceipt(res);
      setCart([]);
      setSelectedCustomerId('');
      setNewCustomerName('');
      setSaleNotes('');
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
      setColNotes('');
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

  if (!session) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-[#f8fafc] text-slate-800 pb-20 font-sans">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 bg-[#170e5e] text-white px-4 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <TruckIcon size={20} color="#ffffff" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight">مبيعات سيارة الفان (الميدان)</h1>
            <p className="text-xs text-indigo-200">المندوب: {session.rep.name} {session.rep.vehiclePlate ? `(${session.rep.vehiclePlate})` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/hub"
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1.5 rounded-lg transition"
            title="العودة لمركز البوابات"
          >
            مركز البوابات
          </Link>
          <button
            onClick={() => navigate('/driver')}
            type="button"
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-2.5 py-1.5 rounded-lg transition"
          >
            طلبات الدليفري
          </button>
        </div>
      </header>

      {/* Global Alert */}
      {alert && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold shadow-xs border ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {alert.message}
        </div>
      )}

      {/* Main Container */}
      <main className="p-4 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-center py-20 text-slate-400 font-bold">جاري تحميل بيانات رحلة الفان...</div>
        ) : !data?.hasActiveTrip ? (
          /* Empty / No Active Trip State */
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs mt-4">
            <div className="w-16 h-16 bg-indigo-50 text-[#170e5e] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <PackageIcon size={32} color="#170e5e" strokeWidth={1.8} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">لا توجد رحلة توزيع نشطة حالياً</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              سيارتك جاهزة! يمكنك شحن بضاعة الصباح من المستودع الرئيسي أو التواصل مع مشرف المخزن لبدء خط السير الميداني.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => refetch()}
                style={{ background: '#170e5e' }}
              >
                تحديث حالة الرحلة
              </Button>
            </div>
          </div>
        ) : (
          /* Active Trip Content */
          <>
            {/* Live Financial & KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي مبيعات اليوم</span>
                <span className="text-lg font-black text-slate-900">{data.trip?.salesAmount.toFixed(2)} <span className="text-xs font-semibold">ج.م</span></span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-600 block">النقدية المحصلة (كاش)</span>
                <span className="text-lg font-black text-emerald-700">{data.trip?.cashCollected.toFixed(2)} <span className="text-xs font-semibold">ج.م</span></span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-600 block">المبيعات الآجلة</span>
                <span className="text-lg font-black text-amber-700">{data.trip?.creditSales.toFixed(2)} <span className="text-xs font-semibold">ج.م</span></span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-indigo-600 block">بضاعة السيارة الحالية</span>
                <span className="text-lg font-black text-indigo-900">{data.inventory.length} <span className="text-xs font-semibold">أصناف</span></span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'inventory' ? 'bg-white text-[#170e5e] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                بضاعة السيارة ({data.inventory.length})
              </button>
              <button
                onClick={() => setActiveTab('sale')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'sale' ? 'bg-white text-[#170e5e] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فاتورة بيع {cart.length > 0 && `(${cart.length})`}
              </button>
              <button
                onClick={() => setActiveTab('collection')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'collection' ? 'bg-white text-[#170e5e] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تحصيل / مرتجع
              </button>
              <button
                onClick={() => setActiveTab('settle')}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  activeTab === 'settle' ? 'bg-white text-[#170e5e] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تصفية اليومية
              </button>
            </div>

            {/* TAB 1: INVENTORY IN VAN */}
            {activeTab === 'inventory' && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="بحث في بضاعة السيارة بالاسم أو الباركود..."
                    className="w-full h-11 bg-white border border-slate-300 rounded-xl px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredInventory.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-bold bg-white rounded-xl border border-slate-200">
                      لا توجد أصناف تطابق البحث
                    </div>
                  ) : (
                    filteredInventory.map((item) => (
                      <div
                        key={item.productId}
                        className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-900 text-xs truncate">{item.productName}</h4>
                          <span className="text-[11px] text-slate-400 font-mono block">{item.barcode}</span>
                          <span className="text-xs font-bold text-emerald-700 mt-1 block">
                            {item.retailPrice.toFixed(2)} ج.م
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="bg-indigo-50 text-[#170e5e] font-extrabold text-xs px-2.5 py-1 rounded-lg border border-indigo-100">
                            {item.qty} {item.unitName || 'قطعة'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              addToCart(item);
                              setActiveTab('sale');
                            }}
                            className="text-[11px] bg-[#170e5e] hover:bg-[#201582] text-white font-bold px-2.5 py-1 rounded-lg transition"
                          >
                            + إضافة للفاتورة
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: NEW FIELD SALE */}
            {activeTab === 'sale' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
                <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2">
                  إصدار فاتورة بيع ميداني للعميل
                </h3>

                {/* Customer Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اختيار المحل / العميل:</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : '';
                      setSelectedCustomerId(val);
                      if (val) setNewCustomerName('');
                    }}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                  >
                    <option value="">-- عميل نقدي عام (أو اختر من خط السير) --</option>
                    {data.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - مديونية: {c.balance.toFixed(2)} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedCustomerId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">أو كتابة اسم محل جديد:</label>
                    <input
                      type="text"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="مثال: سوبرماركت البركة - شارع التحرير"
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                    />
                  </div>
                )}

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الدفع:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`h-10 rounded-xl font-extrabold text-xs transition-all border ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      نقدي (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit')}
                      className={`h-10 rounded-xl font-extrabold text-xs transition-all border ${
                        paymentMethod === 'credit'
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      آجل (على الحساب)
                    </button>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-800">الأصناف المحددة للبيع:</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="text-xs text-[#170e5e] font-bold hover:underline"
                    >
                      + إضافة أصناف من بضاعة السيارة
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-xl">
                      السلة فارغة. اختر أصنافاً من تبويب "بضاعة السيارة" لإضافتها هنا.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {cart.map((c) => (
                        <div key={c.productId} className="p-3 flex items-center justify-between gap-2 bg-slate-50/50">
                          <div>
                            <h5 className="font-extrabold text-xs text-slate-900">{c.name}</h5>
                            <span className="text-[11px] text-slate-500">
                              {c.unitPrice.toFixed(2)} × {c.qty} = {(c.qty * c.unitPrice).toFixed(2)} ج.م
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateCartQty(c.productId, -1)}
                              className="w-7 h-7 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-700 flex items-center justify-center shadow-2xs"
                            >
                              -
                            </button>
                            <span className="font-black text-xs w-6 text-center">{c.qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(c.productId, 1)}
                              className="w-7 h-7 bg-white border border-slate-300 rounded-lg text-sm font-black text-slate-700 flex items-center justify-center shadow-2xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total & Submit */}
                {cart.length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <div className="flex items-center justify-between font-black text-base text-slate-900 bg-slate-100 p-3 rounded-xl">
                      <span>إجمالي الفاتورة المطلوب:</span>
                      <span className="text-emerald-700">{cartTotal.toFixed(2)} ج.م</span>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => {
                        executeSaleMutation.mutate({
                          tripId: data.trip!.id,
                          customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
                          customerName: newCustomerName || undefined,
                          paymentMethod,
                          items: cart.map((c) => ({ productId: c.productId, qty: c.qty, unitPrice: c.unitPrice })),
                          notes: saleNotes || undefined,
                        });
                      }}
                      disabled={executeSaleMutation.isPending}
                      className="w-full h-12 text-sm font-extrabold"
                      style={{ background: '#170e5e' }}
                    >
                      {executeSaleMutation.isPending ? 'جاري الحفظ والخصم...' : 'حفظ وإصدار الفاتورة الميدانية'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FIELD COLLECTION / RETURN */}
            {activeTab === 'collection' && (
              <div className="space-y-4">
                {/* Collection Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
                    <span>تحصيل مديونية سابقة من عميل في الشارع</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">العميل المطلوب تحصيل حسابه:</label>
                    <select
                      value={colCustomerId}
                      onChange={(e) => setColCustomerId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                    >
                      <option value="">-- اختر العميل --</option>
                      {data.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - مديونية حالية: {c.balance.toFixed(2)} ج.م
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المحصل نقداً (ج.م):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={colAmount}
                      onChange={(e) => setColAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!colCustomerId || !Number(colAmount)) {
                        showAlert('error', 'يرجى اختيار العميل وإدخال مبلغ التحصيل');
                        return;
                      }
                      recordCollectionMutation.mutate({
                        tripId: data.trip!.id,
                        customerId: Number(colCustomerId),
                        amount: Number(colAmount),
                        notes: colNotes || undefined,
                      });
                    }}
                    disabled={recordCollectionMutation.isPending}
                    className="w-full h-11 text-xs font-extrabold"
                    style={{ background: '#059669' }}
                  >
                    {recordCollectionMutation.isPending ? 'جاري قيد السند...' : 'إثبات تحصيل النقدية وتحديث كشف الحساب'}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: END OF DAY SETTLEMENT */}
            {activeTab === 'settle' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <ReceiptIcon size={20} color="#170e5e" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">تصفية اليومية وإغلاق رحلة الفان</h3>
                    <p className="text-xs text-slate-500">جرد النقدية ومطابقة مبيعات السيارة وتوريد الكاش للمشرف</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs border border-slate-200">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-600">إجمالي المبيعات المحققة اليوم:</span>
                    <span className="font-bold text-slate-900">{data.trip?.salesAmount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-600">المبيعات الآجلة على المحلات:</span>
                    <span className="font-bold text-amber-700">{data.trip?.creditSales.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-800 text-sm pt-2 border-t border-slate-200">
                    <span>النقدية المتوقع تسليمها (كاش):</span>
                    <span>{data.trip?.cashCollected.toFixed(2)} ج.م</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الكاش الفعلي الموجود معك للتوريد (ج.م):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="أدخل المبلغ الفعلي بعد العدّ..."
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                  />
                  {countedCash && (
                    <div className="mt-2 text-xs font-bold">
                      {Number(countedCash) === data.trip?.cashCollected ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckIcon size={14} color="#059669" strokeWidth={2.5} />
                          <span>الكاش مطابق تماماً للعهدة النقدية (لا يوجد عجز).</span>
                        </span>
                      ) : Number(countedCash) < (data.trip?.cashCollected || 0) ? (
                        <span className="inline-flex items-center gap-1.5 text-rose-600">
                          <AlertTriangleIcon size={14} color="#dc2626" strokeWidth={2} />
                          <span>يوجد عجز بمبلغ {( (data.trip?.cashCollected || 0) - Number(countedCash) ).toFixed(2)} ج.م</span>
                        </span>
                      ) : (
                        <span className="text-blue-600">
                          يوجد زيادة بمبلغ {( Number(countedCash) - (data.trip?.cashCollected || 0) ).toFixed(2)} ج.م
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <input
                    type="checkbox"
                    id="unloadCheck"
                    checked={unloadRemaining}
                    onChange={(e) => setUnloadRemaining(e.target.checked)}
                    className="w-4 h-4 rounded text-[#170e5e]"
                  />
                  <label htmlFor="unloadCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                    تفريغ البضاعة المتبقية في السيارة وإعادتها للمستودع الرئيسي تلقائياً
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات التصفية (اختياري):
                  </label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    placeholder="أي ملاحظات حول التصفية أو العجز/الزيادة..."
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-4 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#170e5e]/20"
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    if (!countedCash) {
                      showAlert('error', 'يرجى إدخال مبلغ الكاش الفعلي المعدود');
                      return;
                    }
                    settleTripMutation.mutate({
                      tripId: data.trip!.id,
                      countedCash: Number(countedCash),
                      unloadRemainingToWarehouse: unloadRemaining,
                      notes: settleNotes || undefined,
                    });
                  }}
                  disabled={settleTripMutation.isPending}
                  className="w-full h-12 text-sm font-extrabold"
                  style={{ background: '#170e5e' }}
                >
                  {settleTripMutation.isPending ? 'جاري التصفية...' : 'تأكيد التصفية وإغلاق اليومية وتوريد الكاش'}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Printed Receipt Modal */}
      {lastSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckIcon size={24} color="#059669" strokeWidth={2.5} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">تم إصدار الفاتورة الميدانية</h3>
            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1.5 text-right font-semibold border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الفاتورة:</span>
                <span className="font-mono font-bold">{lastSaleReceipt.docNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">العميل:</span>
                <span className="font-bold">{lastSaleReceipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">طريقة الدفع:</span>
                <span className="font-bold">{lastSaleReceipt.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-extrabold pt-1 border-t border-slate-200">
                <span>الإجمالي:</span>
                <span>{lastSaleReceipt.total} ج.م</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => window.print()}
                className="flex-1 text-xs font-bold"
                style={{ background: '#170e5e' }}
              >
                طباعة حرارية
              </Button>
              <Button
                variant="secondary"
                onClick={() => setLastSaleReceipt(null)}
                className="flex-1 text-xs font-bold"
              >
                تم الإغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
