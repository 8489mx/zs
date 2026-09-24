import { buildStorePublicUrl } from '@/lib/store-public-url';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { bostaApi } from '../api/bosta.api';
import { gccShippingApi } from '../api/gcc-shipping.api';
import { OnlineOrderRecord, AbandonedCartRecord } from '../types/storefront.types';
import { ConvertDeliveryModal } from '../components/ConvertDeliveryModal';
import { BostaShipmentModal } from '../components/BostaShipmentModal';
import { GccShipmentModal } from '../components/GccShipmentModal';
import { MerchantOrdersTable } from '../components/MerchantOrdersTable';
import { MerchantOrderDetailModal } from '../components/MerchantOrderDetailModal';
import { loadOnlineOrderIntoPosCart } from '../lib/storefront-pos-loader';
import { PosSaleSuccessDialog } from '@/features/pos/components/pos-workspace/PosSaleSuccessDialog';
import { printPostedSaleReceipt } from '@/lib/pos-printing';
import type { Sale } from '@/types/domain';
import { PageHeader } from '@/shared/components/page-header';
import { toast } from '@/shared/components/system-alert';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { TrendingUpIcon, MessageSquareIcon, Trash2Icon, CopyIcon, CheckIcon } from '@/shared/components/icons/AppIcons';

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
  const [viewMode, setViewMode] = useState<'orders' | 'abandoned'>('orders');

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['storefront-admin-settings'],
    queryFn: storefrontApi.getSettings,
  });

  const bostaSettingsQuery = useQuery({
    queryKey: ['bosta-settings'],
    queryFn: bostaApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const gccSettingsQuery = useQuery({
    queryKey: ['gcc-shipping-settings'],
    queryFn: gccShippingApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const isBostaConfigured = Boolean(
    bostaSettingsQuery.data?.enabled && bostaSettingsQuery.data?.apiKey?.trim()
  );

  const isGccConfigured = Boolean(
    gccSettingsQuery.data?.enabled &&
      (gccSettingsQuery.data?.smsaPassKey?.trim() ||
        gccSettingsQuery.data?.aramexAccountNumber?.trim() ||
        gccSettingsQuery.data?.aramexUserName?.trim())
  );

  const ordersQuery = useQuery({
    queryKey: ['storefront-admin-orders', statusFilter],
    queryFn: () => storefrontApi.listOrders(statusFilter),
    refetchInterval: 10 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const analyticsQuery = useQuery({
    queryKey: ['storefront-admin-analytics'],
    queryFn: storefrontApi.getAnalytics,
    refetchInterval: 30 * 1000,
  });

  const abandonedQuery = useQuery({
    queryKey: ['storefront-admin-abandoned-carts'],
    queryFn: storefrontApi.listAbandonedCarts,
    enabled: viewMode === 'abandoned',
    refetchInterval: 15 * 1000,
  });

  const deleteAbandonedMutation = useMutation({
    mutationFn: (id: number) => storefrontApi.deleteAbandonedCart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-abandoned-carts'] });
    },
  });

  // Mutations
  const confirmPaymentMutation = useMutation({
    mutationFn: ({ id, reference }: { id: number; reference?: string }) =>
      storefrontApi.confirmOrderPayment(id, reference),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
      setSelectedOrder((prev) => (prev && prev.id === vars.id ? { ...prev, paymentStatus: 'paid', gatewayProvider: 'manual' } : prev));
      toast.success('تم تأكيد استلام التحويل، وستصدر فاتورة التوصيل كمحصّلة');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'تعذر تأكيد استلام التحويل');
    },
  });

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

  // Real-time KPI calculations with fallback to active orders
  const totalOrdersCount = (analyticsQuery.data?.totalOrders && analyticsQuery.data.totalOrders > 0)
    ? analyticsQuery.data.totalOrders
    : (counts?.all ?? orders.length);

  const pendingOrdersCount = counts?.pending ?? orders.filter((o) => o.status === 'pending').length;
  const validOrdersSum = orders.filter((o) => o.status !== 'cancelled').reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
  const totalRevenueAmount = (analyticsQuery.data?.totalRevenue && analyticsQuery.data.totalRevenue > 0)
    ? analyticsQuery.data.totalRevenue
    : validOrdersSum;

  const averageOrderVal = (analyticsQuery.data?.averageOrderValue && analyticsQuery.data.averageOrderValue > 0)
    ? analyticsQuery.data.averageOrderValue
    : (totalOrdersCount > 0 ? Math.round(totalRevenueAmount / totalOrdersCount) : 0);

  const unrecoveredCount = analyticsQuery.data?.unrecoveredAbandoned ?? 0;
  const conversionRateVal = analyticsQuery.data?.conversionRate ?? (
    (totalOrdersCount + unrecoveredCount) > 0
      ? Math.round((totalOrdersCount / (totalOrdersCount + unrecoveredCount)) * 100)
      : (totalOrdersCount > 0 ? 100 : 0)
  );

  const storeSlug = settings?.slug || 'store';
  const storeUrl = buildStorePublicUrl(storeSlug);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLoadToPos = async (orderId: number) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder?.status === 'cancelled') {
      toast.warning('هذا الطلب تم إلغاؤه من قبل العميل ولا يمكن تنزيله في السلة.');
      return;
    }
    if (targetOrder?.saleId) {
      toast.info(`هذا الطلب تم تحويله لفاتورة مسبقاً (فاتورة #${targetOrder.saleId}).`);
      return;
    }

    setLoadingPosOrderId(orderId);
    try {
      await loadOnlineOrderIntoPosCart(orderId, navigate);
    } catch (err: any) {
      setLoadingPosOrderId(null);
      toast.error(`تعذر تحميل الطلب في السلة: ${err.message || 'خطأ غير متوقع'}`);
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
            <div className="actions compact-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: copySuccess ? '#166534' : '#334155',
                  border: copySuccess ? '1.5px solid #22c55e' : '1px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  boxSizing: 'border-box',
                }}
              >
                {copySuccess ? <CheckIcon size={14} color="#166534" /> : <CopyIcon size={14} color="#64748b" />}
                <span>{copySuccess ? 'تم نسخ الرابط!' : 'نسخ رابط المتجر'}</span>
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  background: '#170e5e',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 1px 3px rgba(23,14,94,0.2)',
                  boxSizing: 'border-box',
                }}
              >
                <span>معاينة المتجر كزبون</span>
                <span style={{ fontSize: '13px' }}>↗</span>
              </a>
            </div>
          }
        />


        {/* KPI Summary Cards Grid */}
        <div
          className="merchant-orders-kpi-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Card 1: Revenue */}
          <div
            className="merchant-orders-kpi-card"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>إجمالي إيرادات المتجر</span>
              <TrendingUpIcon size={16} color="#16a34a" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {totalRevenueAmount.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600 }}>{getGlobalCurrencySymbol()}</span>
            </div>
            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
              الطلبات الصالحة والمسلمة
            </span>
          </div>

          {/* Card 2: Orders Count */}
          <div
            className="merchant-orders-kpi-card"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>إجمالي عدد الطلبات</span>
              <span style={{ fontSize: '11px', color: '#170e5e', fontWeight: 700, background: '#f0f3ff', padding: '1px 6px', borderRadius: '4px' }}>متجر</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {totalOrdersCount.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600 }}>طلب</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              قيد التنفيذ: {pendingOrdersCount} طلبات
            </span>
          </div>

          {/* Card 3: AOV */}
          <div
            className="merchant-orders-kpi-card"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>متوسط قيمة السلة (AOV)</span>
              <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, background: '#f0f9ff', padding: '1px 6px', borderRadius: '4px' }}>معدل</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {averageOrderVal.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600 }}>{getGlobalCurrencySymbol()}</span>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              متوسط الفاتورة لكل عميل
            </span>
          </div>

          {/* Card 4: Conversion Rate & Abandoned */}
          <div
            className="merchant-orders-kpi-card"
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>معدل التحويل والسلات</span>
              <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, background: '#fffbeb', padding: '1px 6px', borderRadius: '4px' }}>تحويل</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
              {conversionRateVal}%
            </div>
            <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
              سلات متروكة: {unrecoveredCount} سلة
            </span>
          </div>
        </div>

        {/* View Mode Switcher: Orders vs Abandoned Carts */}
        <div
          className="merchant-orders-view-switcher"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            maxWidth: '100%',
            paddingBottom: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('orders')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: viewMode === 'orders' ? '2px solid #170e5e' : '1px solid #cbd5e1',
              background: viewMode === 'orders' ? '#170e5e' : '#ffffff',
              color: viewMode === 'orders' ? '#ffffff' : '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: viewMode === 'orders' ? '0 2px 6px rgba(23, 14, 94, 0.2)' : 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>طلبات المتجر الواردة</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: viewMode === 'orders' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
              color: viewMode === 'orders' ? '#ffffff' : '#0f172a',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {counts?.all || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('abandoned')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: viewMode === 'abandoned' ? '2px solid #170e5e' : '1px solid #cbd5e1',
              background: viewMode === 'abandoned' ? '#170e5e' : '#ffffff',
              color: viewMode === 'abandoned' ? '#ffffff' : '#334155',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: viewMode === 'abandoned' ? '0 2px 6px rgba(23, 14, 94, 0.2)' : 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span>السلات المتروكة (Abandoned Carts)</span>
            {(analyticsQuery.data?.unrecoveredAbandoned ?? 0) > 0 ? (
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '999px',
                background: viewMode === 'abandoned' ? '#ef4444' : '#fee2e2',
                color: viewMode === 'abandoned' ? '#ffffff' : '#991b1b',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {analyticsQuery.data?.unrecoveredAbandoned}
              </span>
            ) : null}
          </button>
        </div>

        {viewMode === 'orders' && (
        /* Main Orders Card: Filter Tabs + Table */
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
            className="merchant-orders-status-tabs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
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
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
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
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
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
            isBostaConfigured={isBostaConfigured}
            isGccConfigured={isGccConfigured}
          />
        </div>
        )}

        {/* Abandoned Carts View */}
        {viewMode === 'abandoned' && (
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  السلات التي بدأ الزبائن بملئها ولم تكتمل
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  تواصل مع هؤلاء الزبائن عبر واتساب مباشرة لتحفيزهم على إتمام الشراء وتقديم خصم تشجيعي
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '6px', fontWeight: 700 }}>
                استرداد فوري بنقرة واحدة
              </span>
            </div>

            {abandonedQuery.isLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>جاري تحميل السلات المتروكة...</div>
            ) : !abandonedQuery.data?.carts || abandonedQuery.data.carts.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  لا توجد سلات متروكة حالياً
                </div>
                <div style={{ fontSize: '12px' }}>
                  جميع العملاء الذين بدأوا الشراء أكملوا طلباتهم بنجاح
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                      <th style={{ padding: '10px 12px' }}>تاريخ السلة</th>
                      <th style={{ padding: '10px 12px' }}>بيانات العميل والهاتف</th>
                      <th style={{ padding: '10px 12px' }}>الأصناف في السلة</th>
                      <th style={{ padding: '10px 12px' }}>قيمة السلة</th>
                      <th style={{ padding: '10px 12px' }}>الحالة</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}>إجراءات الاسترداد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandonedQuery.data.carts.map((cart: AbandonedCartRecord) => {
                      const phoneClean = cart.customerPhone.replace(/\D/g, '');
                      const countryDial = cart.countryCode === 'SA' ? '966' : cart.countryCode === 'AE' ? '971' : '20';
                      const fullIntlPhone = phoneClean.startsWith('0') ? `${countryDial}${phoneClean.slice(1)}` : phoneClean;
                      const itemsText = cart.items.map((i) => `${i.name} (×${i.quantity})`).join('، ');
                      const waMessage = `مرحباً ${cart.customerName || 'عزيزي العميل'}، لاحظنا اهتمامك بطلب الأصناف التالية من متجرنا: (${itemsText}). هل تود إتمام طلبك الآن وتأكيده؟ يسعدنا مساعدتك وتوصيل طلبك في أسرع وقت!`;
                      const waLink = `https://wa.me/${fullIntlPhone}?text=${encodeURIComponent(waMessage)}`;

                      return (
                        <tr key={cart.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                            {new Date(cart.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{cart.customerName || 'عميل المتجر'}</div>
                            <div style={{ fontFamily: 'monospace', direction: 'ltr', textAlign: 'right', fontSize: '12px', color: '#170e5e', fontWeight: 700 }}>
                              {cart.customerPhone} ({cart.countryCode})
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: '300px' }}>
                            <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
                              {cart.items.map((i: any, idx: number) => (
                                <span key={idx} style={{ display: 'inline-block', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', margin: '2px', fontSize: '11px' }}>
                                  {i.name} × {i.quantity}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                            {Number(cart.subtotal).toFixed(0)} {getGlobalCurrencySymbol()}
                          </td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {cart.recovered ? (
                              <span style={{ fontSize: '11px', color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                تم الاسترداد والشراء
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#c2410c', background: '#ffedd5', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                متروكة بانتظار المتابعة
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  background: '#16a34a',
                                  color: '#ffffff',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  boxShadow: '0 1px 3px rgba(22,163,74,0.25)',
                                }}
                              >
                                <MessageSquareIcon size={13} />
                                <span>استرداد عبر واتساب</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => deleteAbandonedMutation.mutate(cart.id)}
                                title="حذف من القائمة"
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2Icon size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Order Details Modal with 1-Click Convert to Sale */}
      <MerchantOrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={(id, status) => updateStatusMutation.mutate({ id, status })}
        isUpdatingStatus={updateStatusMutation.isPending}
        onConfirmPayment={(id, reference) => confirmPaymentMutation.mutate({ id, reference })}
        isConfirmingPayment={confirmPaymentMutation.isPending}
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
        isBostaConfigured={isBostaConfigured}
        isGccConfigured={isGccConfigured}
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
