import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRepsApi, DeliveryRep, DeliveryOrder } from '../api/delivery-reps.api';
import { Button } from '@/shared/ui/button';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { printSmallReceiptDocument } from '@/lib/small-receipt-printer';

export function DeliveryDriverMobilePage() {
  const queryClient = useQueryClient();
  const [selectedRepId, setSelectedRepId] = useState<number>(() => {
    const saved = localStorage.getItem('zs_driver_rep_id');
    return saved ? Number(saved) : 0;
  });
  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState('');

  const { data: repsList = [] } = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps-list'],
    queryFn: deliveryRepsApi.list,
  });

  useEffect(() => {
    if (!selectedRepId && repsList.length > 0) {
      const firstId = repsList[0].id;
      setSelectedRepId(firstId);
      localStorage.setItem('zs_driver_rep_id', String(firstId));
    }
  }, [repsList, selectedRepId]);

  const { data: orders = [], isLoading, refetch } = useQuery<DeliveryOrder[]>({
    queryKey: ['driver-orders', selectedRepId],
    queryFn: () => (selectedRepId ? deliveryRepsApi.listOrders(selectedRepId) : Promise.resolve([])),
    enabled: Boolean(selectedRepId),
    refetchInterval: 15000,
  });

  const settleMutation = useMutation({
    mutationFn: (saleId: number) => deliveryRepsApi.settleOrder(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders', selectedRepId] });
      alert('تم تأكيد تسليم وتحصيل الطلب بنجاح! ✅');
    },
    onError: (err: any) => {
      alert(err.message || 'فشل تأكيد تسليم الطلب');
    },
  });

  const handleSelectRep = (id: number) => {
    setSelectedRepId(id);
    localStorage.setItem('zs_driver_rep_id', String(id));
  };

  const handleCall = (phone?: string) => {
    if (!phone) return alert('رقم هاتف العميل غير متوفر');
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  };

  const handleWhatsApp = (phone?: string, docNo?: string) => {
    if (!phone) return alert('رقم هاتف العميل غير متوفر');
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const target = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;
    const msg = `مرحباً، أنا مندوب التوصيل بخصوص طلبك رقم ${docNo || ''}. أنا في طريقي إليك!`;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleOpenMap = (address?: string) => {
    if (!address) return alert('عنوان العميل غير محدد');
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  const handlePrintDeliveryReceipt = (order: DeliveryOrder) => {
    const html = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <h3 style="margin: 0; font-size: 14px;">إشعار تسليم شحنة</h3>
        <p style="margin: 2px 0 0; font-size: 11px;">طلب رقم: <b>#${order.docNo}</b></p>
      </div>
      <div style="font-size: 11px; margin-bottom: 6px;">
        <div><b>العميل:</b> ${order.customerName || 'عميل نقدي'}</div>
        <div><b>الهاتف:</b> ${order.customerPhone || 'غير مسجل'}</div>
        <div><b>العنوان:</b> ${order.deliveryStatus || 'غير محدد'}</div>
        <div><b>التاريخ:</b> ${new Date().toLocaleDateString('ar-EG')}</div>
      </div>
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold;">
          <span>المطلوب تحصيله:</span>
          <span>${Number(order.total || 0).toLocaleString()} ج.م</span>
        </div>
      </div>
      <div style="text-align: center; font-size: 10px; color: #555;">
        شكراً لتعاملكم معنا!
      </div>
    `;
    printSmallReceiptDocument(html, { title: `إيصال #${order.docNo}`, widthMm: 58 });
  };

  const handleSettleWithGps = (order: DeliveryOrder) => {
    if (!confirm(`تأكيد تسليم الطلب #${order.docNo} وتحصيل مبلغ ${order.total} ج.م؟`)) return;

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log(`[Delivery GPS] Order #${order.docNo} delivered at Lat: ${pos.coords.latitude}, Lng: ${pos.coords.longitude}`);
          settleMutation.mutate(order.id);
        },
        () => {
          settleMutation.mutate(order.id);
        },
        { timeout: 4000 }
      );
    } else {
      settleMutation.mutate(order.id);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (scannedCode) {
      const matchDoc = String(o.docNo || '').toLowerCase().includes(scannedCode.toLowerCase());
      const matchId = String(o.id) === scannedCode;
      const matchPhone = String(o.customerPhone || '').includes(scannedCode);
      if (!matchDoc && !matchId && !matchPhone) return false;
    }
    if (statusFilter === 'pending') return !o.settledAt;
    if (statusFilter === 'settled') return Boolean(o.settledAt);
    return true;
  });

  const pendingCount = orders.filter((o) => !o.settledAt).length;
  const pendingAmount = orders.filter((o) => !o.settledAt).reduce((sum, o) => sum + Number(o.total || 0), 0);
  const settledCount = orders.filter((o) => Boolean(o.settledAt)).length;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 14px', width: '100%', boxSizing: 'border-box' }} dir="rtl">
      {/* Driver Header */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>🛵 شاشة مندوب التوصيل</h2>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>متابعة الشحنات، التواصل مع العملاء، وتأكيد التحصيل</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="secondary"
              onClick={() => setScannerOpen(true)}
              style={{ padding: '6px 10px', fontSize: '12px', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
            >
              📷 مسح باركود
            </Button>
            <Button variant="secondary" onClick={() => refetch()} style={{ padding: '6px 10px', fontSize: '12px' }}>
              🔄 تحديث
            </Button>
          </div>
        </div>

        {scannedCode && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', marginBottom: '10px', background: '#eff6ff', borderRadius: '6px', fontSize: '12px', color: '#1e40af' }}>
            <span>تصفية حسب الباركود: <b>{scannedCode}</b></span>
            <button
              type="button"
              onClick={() => setScannedCode('')}
              style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✕ إلغاء التصفية
            </button>
          </div>
        )}

        {/* Rep Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            المندوب النشط:
          </label>
          <select
            value={selectedRepId}
            onChange={(e) => handleSelectRep(Number(e.target.value))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', fontWeight: 700 }}
          >
            {repsList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} {r.phone ? `(${r.phone})` : ''}
              </option>
            ))}
          </select>
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
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#170e5e', marginTop: '2px' }}>{pendingAmount.toLocaleString('ar-EG')} ج.م</div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>تم تسليمها</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{settledCount}</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[
          { id: 'pending', label: `قيد التوصيل (${pendingCount})` },
          { id: 'settled', label: `تم التسليم (${settledCount})` },
          { id: 'all', label: `الكل (${orders.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id as any)}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              background: statusFilter === tab.id ? '#170e5e' : '#ffffff',
              color: statusFilter === tab.id ? '#ffffff' : '#475569',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isLoading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جاري تحميل الطلبات...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            لا توجد طلبات في هذه الحالة حالياً.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isSettled = Boolean(order.settledAt);
            return (
              <div
                key={order.id}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${isSettled ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '14px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#170e5e', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      #{order.docNo}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginInlineStart: '6px' }}>
                      {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: isSettled ? '#dcfce7' : '#ffedd5',
                      color: isSettled ? '#166534' : '#c2410c',
                    }}
                  >
                    {isSettled ? '✓ تم التسليم والتحصيل' : '⏳ قيد التوصيل'}
                  </span>
                </div>

                {/* Customer & Address */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {order.customerName}
                  </div>
                  {order.deliveryStatus && (
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      📍 {order.deliveryStatus}
                    </div>
                  )}
                </div>

                {/* Amount to collect */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>المبلغ المطلوب تحصيله:</span>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#16a34a' }}>
                    {Number(order.total).toLocaleString('ar-EG')} ج.م
                  </span>
                </div>

                {/* Quick Actions Bar */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleCall(order.customerName)}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    📞 اتصال
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWhatsApp(order.customerName, order.docNo)}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '8px',
                      border: '1px solid #86efac',
                      background: '#f0fdf4',
                      color: '#166534',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    💬 واتساب
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenMap(order.deliveryStatus || order.customerName)}
                    style={{
                      flex: 1,
                      padding: '7px',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    🗺️ الخريطة
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintDeliveryReceipt(order)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#334155',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    🖨️ إيصال
                  </button>
                </div>

                {/* Settle Action */}
                {!isSettled && (
                  <Button
                    variant="primary"
                    disabled={settleMutation.isPending}
                    onClick={() => handleSettleWithGps(order)}
                    style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 800, background: '#16a34a', border: 'none' }}
                  >
                    {settleMutation.isPending ? 'جاري التأكيد...' : '✅ تأكيد التسليم والتحصيل'}
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>

      <CameraBarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(barcode) => {
          setScannedCode(barcode);
          setScannerOpen(false);
        }}
        title="مسح باركود شحنة أو فاتورة"
      />
    </div>
  );
}
