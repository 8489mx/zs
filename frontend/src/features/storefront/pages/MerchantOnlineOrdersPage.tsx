import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { ConvertDeliveryModal } from '../components/ConvertDeliveryModal';
import { BostaShipmentModal } from '../components/BostaShipmentModal';
import { GccShipmentModal } from '../components/GccShipmentModal';
import { MerchantOrdersTable } from '../components/MerchantOrdersTable';
import { MerchantOrderDetailModal } from '../components/MerchantOrderDetailModal';
import { loadOnlineOrderIntoPosCart } from '../lib/storefront-pos-loader';
import { PosSaleSuccessDialog } from '@/features/pos/components/pos-workspace/PosSaleSuccessDialog';
import { printPostedSaleReceipt } from '@/lib/pos-printing';
import type { Sale } from '@/types/domain';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';

export function MerchantOnlineOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrderRecord | null>(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<OnlineOrderRecord | null>(null);
  const [bostaModalOrder, setBostaModalOrder] = useState<OnlineOrderRecord | null>(null);
  const [gccModalOrder, setGccModalOrder] = useState<OnlineOrderRecord | null>(null);
  const [loadingPosOrderId, setLoadingPosOrderId] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['storefront-admin-settings'],
    queryFn: storefrontApi.getSettings,
  });

  const ordersQuery = useQuery({
    queryKey: ['storefront-admin-orders', statusFilter],
    queryFn: () => storefrontApi.listOrders(statusFilter),
    refetchInterval: 10 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      storefrontApi.updateOrderStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
      if (selectedOrder && selectedOrder.id === vars.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: vars.status as any } : null));
      }
    },
  });

  const orders = ordersQuery.data?.orders || [];
  const counts = ordersQuery.data?.counts;
  const settings = settingsQuery.data;

  const storeSlug = settings?.slug || 'store';
  const storeUrl = `${window.location.origin}/store/${storeSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLoadToPos = async (orderId: number) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder?.status === 'cancelled') {
      alert('هذا الطلب تم إلغاؤه من قبل العميل ولا يمكن تنزيله في السلة.');
      return;
    }
    if (targetOrder?.saleId) {
      alert(`هذا الطلب تم تحويله لفاتورة مسبقاً (فاتورة #${targetOrder.saleId}).`);
      return;
    }

    setLoadingPosOrderId(orderId);
    try {
      await loadOnlineOrderIntoPosCart(orderId, navigate);
    } catch (err: any) {
      setLoadingPosOrderId(null);
      alert(`تعذر تحميل الطلب في السلة: ${err.message || 'خطأ غير متوقع'}`);
    }
  };

  return (
    <div className="page-stack page-shell merchant-online-orders-page" dir="rtl">
      <main
        className="document-prototype-column"
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          width: 'min(100%, 1280px)',
          paddingBottom: '80px',
        }}
      >
        <PageHeader
          title="إدارة ومتابعة طلبات المتجر الإلكتروني"
          badge={<span className="nav-pill" style={{ background: '#f0f3ff', color: '#170e5e', border: '1px solid #d8e0fc' }}>مباشر ومربوط بالمخزن</span>}
          description={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>رابط متجرك للزبائن:</span>
              <span style={{ fontSize: '13px', fontFamily: 'monospace', direction: 'ltr', color: '#170e5e', fontWeight: 800 }}>
                {storeUrl}
              </span>
            </div>
          }
          actions={
            <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyLink}
                style={{ fontWeight: 700, fontSize: '13px', padding: '6px 14px' }}
              >
                {copySuccess ? 'تم نسخ الرابط!' : 'نسخ رابط المتجر'}
              </Button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#170e5e',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 1px 3px rgba(23,14,94,0.2)',
                }}
              >
                <span>معاينة المتجر كزبون ↗</span>
              </a>
            </div>
          }
        />

        {/* Main Orders Card: Filter Tabs + Table */}
        <div
          className="card"
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {[
              { id: 'all', label: 'جميع الطلبات', count: counts?.all },
              { id: 'pending', label: 'قيد الانتظار (جديدة)', count: counts?.pending },
              { id: 'confirmed', label: 'تم التأكيد', count: counts?.confirmed },
              { id: 'processing', label: 'جاري التجهيز', count: counts?.processing },
              { id: 'shipped', label: 'خرجت للتوصيل', count: counts?.shipped },
              { id: 'delivered', label: 'مكتملة ومسلمة', count: counts?.delivered },
              { id: 'cancelled', label: 'ملغية', count: counts?.cancelled },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: statusFilter === tab.id ? '#170e5e' : '#ffffff',
                  color: statusFilter === tab.id ? '#ffffff' : '#475569',
                  border: statusFilter === tab.id ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: statusFilter === tab.id ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                      color: statusFilter === tab.id ? '#ffffff' : '#64748b',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Orders Table */}
          <MerchantOrdersTable
            orders={orders}
            isLoading={ordersQuery.isLoading}
            onSelectOrder={setSelectedOrder}
            onConvertToDelivery={(order) => setDeliveryModalOrder(order)}
            onShipBosta={(order) => setBostaModalOrder(order)}
            onShipGcc={(order) => setGccModalOrder(order)}
            onLoadToPos={handleLoadToPos}
            loadingPosOrderId={loadingPosOrderId}
            onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
            isUpdatingStatus={updateStatusMutation.isPending}
          />
        </div>
      </main>

      {/* Order Details Modal with 1-Click Convert to Sale */}
      <MerchantOrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
        isUpdatingStatus={updateStatusMutation.isPending}
        onConvertToDelivery={(order) => {
          setSelectedOrder(null);
          setDeliveryModalOrder(order);
        }}
        onShipBosta={(order) => {
          setSelectedOrder(null);
          setBostaModalOrder(order);
        }}
        onShipGcc={(order) => {
          setSelectedOrder(null);
          setGccModalOrder(order);
        }}
        onLoadToPos={(orderId) => {
          setSelectedOrder(null);
          handleLoadToPos(orderId);
        }}
        loadingPosOrderId={loadingPosOrderId}
      />

      {/* Bosta Courier Express Modal */}
      {bostaModalOrder && (
        <BostaShipmentModal
          order={bostaModalOrder}
          onClose={() => setBostaModalOrder(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
            setSelectedOrder(null);
          }}
        />
      )}

      {/* GCC Courier Express Modal (Aramex / SMSA) */}
      {gccModalOrder && (
        <GccShipmentModal
          order={gccModalOrder}
          onClose={() => setGccModalOrder(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Delivery Representative & Quick Convert Modal */}
      <ConvertDeliveryModal
        order={deliveryModalOrder}
        isOpen={Boolean(deliveryModalOrder)}
        onClose={() => setDeliveryModalOrder(null)}
        onSuccess={(data) => {
          queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
          setSelectedOrder(null);
          setDeliveryModalOrder(null);
          if (data?.sale) {
            setCompletedSale(data.sale);
            setIsSuccessModalOpen(true);
          }
        }}
        onLoadToPos={handleLoadToPos}
      />

      {/* POS Success & Receipt Printing Dialog */}
      <PosSaleSuccessDialog
        open={isSuccessModalOpen && Boolean(completedSale)}
        sale={completedSale}
        customer={(completedSale as any)?.customer ? (completedSale as any).customer : { name: completedSale?.customerName || '', phone: (completedSale as any)?.customerPhone || '' } as any}
        settings={settings as any}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setCompletedSale(null);
        }}
        onNewSale={() => {
          setIsSuccessModalOpen(false);
          setCompletedSale(null);
        }}
        onPrintReceipt={() => {
          if (completedSale) {
            printPostedSaleReceipt(completedSale, { pageSize: 'receipt', settings: settings as any });
          }
        }}
        onPrintA4={() => {
          if (completedSale) {
            printPostedSaleReceipt(completedSale, { pageSize: 'a4', settings: settings as any });
          }
        }}
      />
    </div>
  );
}
