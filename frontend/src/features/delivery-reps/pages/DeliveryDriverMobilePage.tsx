import { useState, useEffect, useMemo } from 'react';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRepsApi, type DeliveryOrder, type DeliveryRep, type SettleOrderPayload } from '@/features/delivery-reps/api/delivery-reps.api';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { VanSaleNewInvoiceModal } from '../components/VanSaleNewInvoiceModal';
import { DeliverySettlementModal } from '../components/DeliverySettlementModal';
import { DeliveryOrderCard } from '../components/DeliveryOrderCard';
import { DeliveryDriverHeader } from '../components/DeliveryDriverHeader';
import { PackageIcon } from '@/shared/components/icons/AppIcons';

interface OfflineQueueItem {
  orderId: number;
  cashCollected: number;
  deliverySignature?: string;
  deliveryPhotoUrl?: string;
  deliveryNotes?: string;
  timestamp: string;
}

export function DeliveryDriverMobilePage() {
  const queryClient = useQueryClient();
  const [selectedRepId, setSelectedRepId] = useState<number>(() => {
    return Number(localStorage.getItem('z_active_delivery_rep_id')) || 1;
  });

  const [statusFilter, setStatusFilter] = useState<'pending' | 'settled' | 'all'>('pending');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [vanSaleModalOpen, setVanSaleModalOpen] = useState(false);
  const [activeSettleOrder, setActiveSettleOrder] = useState<DeliveryOrder | null>(null);

  // Offline Queue State
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(() => {
    try {
      const stored = localStorage.getItem('z_driver_offline_settlements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);

  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Queries
  const { data: reps = [] } = useQuery<DeliveryRep[]>({
    queryKey: ['delivery-reps-list'],
    queryFn: () => deliveryRepsApi.list(),
  });

  const { data: orders = [], refetch: refetchOrders, isLoading: ordersLoading } = useQuery<DeliveryOrder[]>({
    queryKey: ['delivery-rep-orders', selectedRepId],
    queryFn: () => deliveryRepsApi.listOrders(selectedRepId),
    enabled: Boolean(selectedRepId),
    refetchInterval: 15_000,
  });

  // Mutations
  const settleMutation = useMutation({
    mutationFn: ({ orderId, payload }: { orderId: number; payload?: SettleOrderPayload }) =>
      deliveryRepsApi.settleOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-rep-orders'] });
      setActiveSettleOrder(null);
    },
    onError: (err: any, variables) => {
      if (!navigator.onLine || err.message?.includes('Network') || err.message?.includes('network')) {
        const item: OfflineQueueItem = {
          orderId: variables.orderId,
          cashCollected: (variables.payload as any)?.cashCollected ?? 0,
          deliverySignature: variables.payload?.signatureDataUrl,
          deliveryPhotoUrl: variables.payload?.proofPhotoUrl,
          deliveryNotes: variables.payload?.notes,
          timestamp: new Date().toISOString(),
        };
        const updated = [...offlineQueue, item];
        setOfflineQueue(updated);
        localStorage.setItem('z_driver_offline_settlements', JSON.stringify(updated));
        alert('تم حفظ إثبات التسليم بنجاح في وضع عدم الاتصال (Offline). ستتم المزامنة تلقائياً فور عودة الإنترنت.');
        setActiveSettleOrder(null);
      } else {
        alert(err?.response?.data?.message || 'تعذر تأكيد استلام الشحنة.');
      }
    },
  });

  const syncOfflineQueue = async () => {
    if (offlineQueue.length === 0 || isSyncingOffline) return;
    setIsSyncingOffline(true);
    const queue = [...offlineQueue];
    const remaining: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        await deliveryRepsApi.settleOrder(item.orderId, {
          signatureDataUrl: item.deliverySignature,
          proofPhotoUrl: item.deliveryPhotoUrl,
          notes: item.deliveryNotes,
        });
      } catch (e) {
        remaining.push(item);
      }
    }

    setOfflineQueue(remaining);
    localStorage.setItem('z_driver_offline_settlements', JSON.stringify(remaining));
    setIsSyncingOffline(false);
    queryClient.invalidateQueries({ queryKey: ['delivery-rep-orders'] });
  };

  useEffect(() => {
    const handleOnline = () => {
      if (offlineQueue.length > 0) {
        syncOfflineQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineQueue]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o: DeliveryOrder) => {
      const isSettled = Boolean(o.settledAt);
      if (statusFilter === 'pending') return !isSettled;
      if (statusFilter === 'settled') return isSettled;
      return true;
    });
  }, [orders, statusFilter]);

  const pendingCount = useMemo(() => orders.filter((o: DeliveryOrder) => !o.settledAt).length, [orders]);
  const settledCount = useMemo(() => orders.filter((o: DeliveryOrder) => Boolean(o.settledAt)).length, [orders]);
  const totalCollected = useMemo(() => orders.filter((o: DeliveryOrder) => Boolean(o.settledAt)).reduce((sum: number, o: DeliveryOrder) => sum + Number(o.total || 0), 0), [orders]);
  const pendingAmount = useMemo(() => orders.filter((o: DeliveryOrder) => !o.settledAt).reduce((sum: number, o: DeliveryOrder) => sum + Number(o.total || 0), 0), [orders]);

  const handleBarcodeScanned = (code: string) => {
    setScannerOpen(false);
    const match = orders.find((o: DeliveryOrder) => o.docNo?.toLowerCase() === code.trim().toLowerCase());
    if (match) {
      if (match.settledAt) {
        alert(`الشحنة #${match.docNo} تم تسليمها بالفعل مسبقاً.`);
      } else {
        handleOpenSettleModal(match);
      }
    } else {
      alert(`لم يتم العثور على شحنة تطابق الباركود: ${code}`);
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsApp = (phone: string, docNo: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`مرحباً، أنا مندوب التوصيل بخصوص الشحنة رقم #${docNo}. أرجو تأكيد موقع الاستلام.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleOpenMap = (address: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const handlePrintDeliveryReceipt = (order: DeliveryOrder) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    const content = `
      <html dir="rtl">
        <head>
          <title>إيصال تسليم #${order.docNo}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 15px; font-size: 13px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 12px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .total { font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 6px; margin-top: 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>إيصال تسليم طلب</h3>
            <div>رقم الطلب: #${order.docNo}</div>
            <div>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
          <div class="row"><span>العميل:</span><strong>${order.customerName}</strong></div>
          <div class="row"><span>الهاتف:</span><span>${order.customerPhone || '—'}</span></div>
          <div class="row"><span>العنوان:</span><span>${order.customerAddress || order.deliveryStatus || '—'}</span></div>
          <div class="row total"><span>المبلغ المطلوب:</span><span>${Number(order.total).toLocaleString('ar-EG')} ${getGlobalCurrencySymbol()}</span></div>
          ${order.settledAt ? '<div class="row" style="color: green;"><span>حالة التحصيل:</span><strong>تم التحصيل بالكامل</strong></div>' : ''}
          <div class="footer">شكراً لتعاملكم معنا!</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleOpenSettleModal = (order: DeliveryOrder) => {
    setActiveSettleOrder(order);
  };

  return (
    <div className="page-stack page-shell mobile-driver-portal" dir="rtl" style={{ background: '#f8fafc', minHeight: '100vh', padding: '12px' }}>
      <main style={{ maxWidth: '600px', margin: '0 auto' }}>
        <DeliveryDriverHeader
          selectedRepId={selectedRepId}
          setSelectedRepId={setSelectedRepId}
          reps={reps}
          refetchOrders={refetchOrders}
          isSyncingOffline={isSyncingOffline}
          offlineQueueCount={offlineQueue.length}
          syncOfflineQueue={syncOfflineQueue}
          setScannerOpen={setScannerOpen}
          setVanSaleModalOpen={setVanSaleModalOpen}
          deferredPrompt={deferredPrompt}
          handleInstallPWA={handleInstallPWA}
          pendingCount={pendingCount}
          settledCount={settledCount}
          totalCollected={totalCollected}
          pendingAmount={pendingAmount}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />

        {/* Orders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              جاري تحميل شحنات اليوم...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <PackageIcon size={36} color="#94a3b8" />
              <h4 style={{ margin: '10px 0 4px', fontSize: '15px', color: '#0f172a' }}>لا توجد طلبات مطابقة</h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>لا توجد شحنات مسندة إليك تحت هذا الفلتر في الوقت الحالي.</p>
            </div>
          ) : (
            filteredOrders.map((order: DeliveryOrder) => (
              <DeliveryOrderCard
                key={order.id}
                order={order}
                handleCall={handleCall}
                handleWhatsApp={handleWhatsApp}
                handleOpenMap={handleOpenMap}
                handlePrintDeliveryReceipt={handlePrintDeliveryReceipt}
                handleOpenSettleModal={handleOpenSettleModal}
                isSettlePending={settleMutation.isPending}
                activeSettleOrderId={activeSettleOrder?.id}
              />
            ))
          )}
        </div>
      </main>

      {/* Barcode Camera Scanner */}
      <CameraBarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="مسح باركود الشحنة للتحصيل المباشر"
      />

      {/* Van Sale Modal */}
      {vanSaleModalOpen && (
        <VanSaleNewInvoiceModal
          open={vanSaleModalOpen}
          onClose={() => setVanSaleModalOpen(false)}
          repId={selectedRepId}
          onSuccess={() => refetchOrders()}
        />
      )}

      {/* Delivery Settlement with Signature & Photo Modal */}
      <DeliverySettlementModal
        order={activeSettleOrder}
        isOpen={Boolean(activeSettleOrder)}
        isSubmitting={settleMutation.isPending}
        onClose={() => setActiveSettleOrder(null)}
        onConfirm={(payload) => {
          if (!activeSettleOrder) return;
          settleMutation.mutate({ orderId: activeSettleOrder.id, payload });
        }}
      />
    </div>
  );
}

export default DeliveryDriverMobilePage;
