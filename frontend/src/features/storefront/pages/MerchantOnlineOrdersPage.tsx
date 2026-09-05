import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { ConvertDeliveryModal } from '../components/ConvertDeliveryModal';
import { BostaShipmentModal } from '../components/BostaShipmentModal';
import { loadOnlineOrderIntoPosCart } from '../lib/storefront-pos-loader';
import { PosSaleSuccessDialog } from '@/features/pos/components/pos-workspace/PosSaleSuccessDialog';
import { printPostedSaleReceipt } from '@/lib/pos-printing';
import type { Sale } from '@/types/domain';
import { Button } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/page-header';
import { PackageIcon } from '@/shared/components/icons/AppIcons';

export function MerchantOnlineOrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrderRecord | null>(null);
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<OnlineOrderRecord | null>(null);
  const [bostaModalOrder, setBostaModalOrder] = useState<OnlineOrderRecord | null>(null);
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

  const storeSlug = settings?.slug || '';
  const storeUrl = `${window.location.origin}/st/${storeSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleLoadToPos = async (orderId: number) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder?.status === 'cancelled') {
      alert('⚠️ هذا الطلب تم إلغاؤه من قبل العميل ولا يمكن تنزيله في السلة.');
      return;
    }
    if (targetOrder?.saleId) {
      alert(`⚠️ هذا الطلب تم تحويله لفاتورة مسبقاً (فاتورة #${targetOrder.saleId}).`);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'جديد / قيد الانتظار', bg: '#fefce8', text: '#854d0e', border: '#fef08a' };
      case 'confirmed':
        return { label: 'تم التأكيد', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' };
      case 'processing':
        return { label: 'جاري التجهيز', bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' };
      case 'shipped':
        return { label: 'خرج للتوصيل', bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' };
      case 'delivered':
        return { label: 'مكتمل / تم التسليم', bg: '#f0fdf4', text: '#15803d', border: '#dcfce7' };
      case 'cancelled':
        return { label: 'ملغي', bg: '#fef2f2', text: '#b91c1c', border: '#fee2e2' };
      default:
        return { label: status, bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
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
                {copySuccess ? 'تم نسخ الرابط! ✓' : 'نسخ رابط المتجر'}
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
                  borderRadius: '9px',
                  fontSize: '12.5px',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  background: statusFilter === tab.id ? '#170e5e' : '#ffffff',
                  color: statusFilter === tab.id ? '#ffffff' : '#475569',
                  border: statusFilter === tab.id ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
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
        {ordersQuery.isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            جاري تحميل الطلبات...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: '#94a3b8' }}>
              <PackageIcon size={44} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              لا توجد طلبات في هذا القسم
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              عندما يطلب أي عميل من رابط متجرك سيظهر طلبه هنا فوراً مع تنبيه بالبيانات والمخزون.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>رقم الطلب</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>العميل والهاتف</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>عنوان التوصيل</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الأصناف</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الإجمالي</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const cleanPhone = order.customerPhone.replace(/\D/g, '');
                  const waPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                    >
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px', direction: 'ltr', textAlign: 'center' }}>
                          #{order.orderNumber}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', textAlign: 'center' }}>
                          {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', textAlign: 'center' }}>{order.customerName}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', direction: 'ltr', textAlign: 'center', marginTop: '1px' }}>
                          {order.customerPhone}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', maxWidth: '180px', color: '#334155', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '12.5px',
                            textAlign: 'center',
                          }}
                          title={order.customerAddress || ''}
                        >
                          {order.customerAddress || 'غير محدد'}
                        </div>
                        {order.deliveryZoneName && (
                          <div
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#170e5e',
                              background: '#f0f3ff',
                              border: '1px solid #d8e0fc',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              marginTop: '3px',
                              display: 'inline-block',
                            }}
                          >
                            📍 {order.deliveryZoneName}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px', textAlign: 'center' }}>
                          {order.items.length} صنف
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', textAlign: 'center' }}>
                          ({order.items.reduce((acc, i) => acc + i.quantity, 0)} قطعة)
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', fontSize: '13.5px', textAlign: 'center', verticalAlign: 'middle' }}>
                        {order.totalAmount.toFixed(0)} ج
                      </td>
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '102px 120px 58px 32px',
                            gap: '6px',
                            alignItems: 'center',
                            margin: '0 auto',
                            width: 'fit-content',
                          }}
                        >
                          {/* Col 1: Status / Invoice Badge */}
                          {order.status === 'cancelled' ? (
                            <span
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                background: '#f8fafc',
                                color: '#64748b',
                                border: '1px solid #e2e8f0',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxSizing: 'border-box',
                              }}
                            >
                              ملغي من العميل
                            </span>
                          ) : order.saleId ? (
                            <span
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                background: '#f8fafc',
                                color: '#1e293b',
                                border: '1px solid #cbd5e1',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                              <span>فاتورة #{order.saleId}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLoadToPos(order.id)}
                              disabled={loadingPosOrderId === order.id}
                              title="فتح شاشة الكاشير وتنزيل الأصناف والعميل في السلة لتعديلها وإتمام البيع"
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                background: '#047857',
                                color: '#ffffff',
                                border: 'none',
                                cursor: loadingPosOrderId === order.id ? 'wait' : 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 2px rgba(4,120,87,0.2)',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span>{loadingPosOrderId === order.id ? 'جاري...' : 'بالسلة (POS)'}</span>
                            </button>
                          )}

                          {/* Col 2: Action Button */}
                          {order.status === 'processing' && order.saleId ? (
                            <button
                              type="button"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'shipped' })}
                              disabled={updateStatusMutation.isPending}
                              title="تسليم الأوردر والفاتورة لمندوب التوصيل"
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                background: '#170e5e',
                                color: '#ffffff',
                                border: 'none',
                                cursor: updateStatusMutation.isPending ? 'wait' : 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(23,14,94,0.2)',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span>🛵</span>
                              <span>تسليم للمندوب</span>
                            </button>
                          ) : order.status === 'shipped' ? (
                            <button
                              type="button"
                              onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'delivered' })}
                              disabled={updateStatusMutation.isPending}
                              title="تأكيد تسليم الأوردر للعميل بنجاح"
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                cursor: updateStatusMutation.isPending ? 'wait' : 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: '0 1px 2px rgba(5,150,105,0.2)',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span>✓</span>
                              <span>تم التسليم</span>
                            </button>
                          ) : order.bostaTrackingNumber ? (
                            <button
                              type="button"
                              onClick={() => window.open(`/api/bosta/awb/${order.bostaDeliveryId || order.bostaTrackingNumber}`, '_blank')}
                              title="طباعة بوليصة شحن بوسطة AWB"
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '7px',
                                background: '#fff1f2',
                                color: '#e11d48',
                                border: '1px solid #fecdd3',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span>📦</span>
                              <span>بوليصة #{order.bostaTrackingNumber}</span>
                            </button>
                          ) : !order.saleId && order.status !== 'cancelled' ? (
                            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => setDeliveryModalOrder(order)}
                                title="تحويل فوري لدليفري واختيار مندوب التوصيل"
                                style={{
                                  flex: 1,
                                  height: '32px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  borderRadius: '7px',
                                  background: '#170e5e',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  boxShadow: '0 1px 2px rgba(23,14,94,0.2)',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <span>⚡</span>
                                <span>دليفري</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setBostaModalOrder(order)}
                                title="شحن فوري عبر بوسطة وتوليد البوليصة"
                                style={{
                                  flex: 1,
                                  height: '32px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  borderRadius: '7px',
                                  background: '#e11d48',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '2px',
                                  boxShadow: '0 1px 2px rgba(225,29,72,0.2)',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <span>📦</span>
                                <span>بوسطة</span>
                              </button>
                            </div>
                          ) : order.status === 'delivered' ? (
                            <div
                              style={{
                                width: '100%',
                                height: '32px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#059669',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                borderRadius: '7px',
                                background: '#f0fdf4',
                                border: '1px solid #dcfce7',
                                boxSizing: 'border-box',
                              }}
                            >
                              <span>✓</span>
                              <span>مكتمل</span>
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: '32px' }} />
                          )}

                          {/* Col 3: Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            style={{
                              width: '100%',
                              height: '32px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              borderRadius: '7px',
                              background: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease',
                              boxSizing: 'border-box',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.borderColor = '#94a3b8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                          >
                            تفاصيل
                          </button>

                          {/* Col 4: WhatsApp Button */}
                          {waPhone ? (
                            <a
                              href={`https://wa.me/${waPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="مراسلة العميل واتساب"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '7px',
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                                textDecoration: 'none',
                                flexShrink: 0,
                                boxShadow: '0 1px 2px rgba(5,150,105,0.1)',
                                boxSizing: 'border-box',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#25D366';
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.borderColor = '#25D366';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ecfdf5';
                                e.currentTarget.style.color = '#059669';
                                e.currentTarget.style.borderColor = '#a7f3d0';
                              }}
                            >
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                              </svg>
                            </a>
                          ) : (
                            <div style={{ width: '32px', height: '32px' }} />
                          )}
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
      </main>

      {/* Order Details Modal with 1-Click Convert to Sale */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                  طلب رقم #{selectedOrder.orderNumber}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Customer Info Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>اسم العميل:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedOrder.customerName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>رقم الهاتف:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', direction: 'ltr' }}>
                    {selectedOrder.customerPhone}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>عنوان التوصيل:</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    {selectedOrder.customerAddress || 'غير محدد'}
                  </span>
                </div>
                {selectedOrder.deliveryZoneName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>منطقة التوصيل:</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#f0f3ff',
                        color: '#170e5e',
                        border: '1px solid #d8e0fc',
                      }}
                    >
                      📍 {selectedOrder.deliveryZoneName}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>طريقة الدفع:</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: selectedOrder.paymentMethod === 'instapay_wallet' ? '#ede9fe' : '#f1f5f9',
                      color: selectedOrder.paymentMethod === 'instapay_wallet' ? '#6d28d9' : '#0f172a',
                    }}
                  >
                    {selectedOrder.paymentMethod === 'instapay_wallet' ? 'إنستاباي / محفظة (تحويل مسبق)' : 'دفع عند الاستلام (كاش)'}
                  </span>
                </div>
                {selectedOrder.customerNotes && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 800 }}>ملاحظات العميل وتجهيز الأصناف:</span>
                    <span style={{ fontSize: '12.5px', color: '#b45309', fontWeight: 600, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {selectedOrder.customerNotes}
                    </span>
                  </div>
                )}

                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11.5px',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px',
                  }}
                >
                  <span>⚡</span>
                  <span>أوتوميشن فوري: عند التحويل يتم تسجيل هذا العميل تلقائياً، وإصدار فاتورة دليفري، وخصم المخزون.</span>
                </div>
              </div>

              {/* Items List */}
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                الأصناف المطلوبة ({selectedOrder.items.length}):
              </h4>
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '18px',
                }}
              >
                {selectedOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: idx < selectedOrder.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>
                        (×{item.quantity})
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {item.total.toFixed(0)} ج
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Breakdown */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>المجموع الفرعي:</span>
                  <span style={{ fontWeight: 600 }}>{selectedOrder.subtotal.toFixed(0)} ج</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>رسوم التوصيل {selectedOrder.deliveryZoneName ? `(${selectedOrder.deliveryZoneName})` : ''}:</span>
                  {selectedOrder.deliveryFee === 0 ? (
                    <span style={{ fontWeight: 700, color: '#16a34a' }}>مجاناً 🚚</span>
                  ) : (
                    <span style={{ fontWeight: 600 }}>{selectedOrder.deliveryFee.toFixed(0)} ج</span>
                  )}
                </div>
                {selectedOrder.couponCode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#170e5e' }}>
                    <span>كود الخصم المستخدم:</span>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>{selectedOrder.couponCode}</span>
                  </div>
                )}
                {(selectedOrder.discountAmount ?? 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                    <span>قيمة الخصم:</span>
                    <span style={{ fontWeight: 700 }}>-{(selectedOrder.discountAmount ?? 0).toFixed(0)} ج.م</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px dashed #cbd5e1',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  <span>المبلغ المطلوب:</span>
                  <span>{selectedOrder.totalAmount.toFixed(0)} ج.م</span>
                </div>
              </div>

              {/* Status Selector */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  تحديث حالة الطلب:
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    updateStatusMutation.mutate({ id: selectedOrder.id, status: e.target.value });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="pending">قيد الانتظار (جديد)</option>
                  <option value="confirmed">تم التأكيد</option>
                  <option value="processing">جاري التجهيز</option>
                  <option value="shipped">خرج للتوصيل</option>
                  <option value="delivered">مكتمل / تم التسليم</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                gap: '10px',
              }}
            >
              {selectedOrder.status === 'cancelled' ? (
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  ⚠️ هذا الطلب تم إلغاؤه من قبل العميل
                </div>
              ) : selectedOrder.saleId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '10px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    ✓ تم إصدار فاتورة دليفري رقم #{selectedOrder.saleId}
                  </div>
                  {selectedOrder.status === 'processing' && (
                    <button
                      type="button"
                      onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'shipped' })}
                      disabled={updateStatusMutation.isPending}
                      style={{
                        background: '#6b21a8',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🛵</span>
                      <span>تسليم للمندوب (خرج للتوصيل)</span>
                    </button>
                  )}
                  {selectedOrder.status === 'shipped' && (
                    <button
                      type="button"
                      onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status: 'delivered' })}
                      disabled={updateStatusMutation.isPending}
                      style={{
                        background: '#166534',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>✓</span>
                      <span>تأكيد استلام العميل (تم التسليم بنجاح)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedOrder.id;
                      setSelectedOrder(null);
                      handleLoadToPos(id);
                    }}
                    disabled={loadingPosOrderId === selectedOrder.id}
                    style={{
                      flex: 1,
                      background: '#047857',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: loadingPosOrderId === selectedOrder.id ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span>
                      {loadingPosOrderId === selectedOrder.id ? 'جاري النقل...' : 'تنزيل في السلة (POS)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      setDeliveryModalOrder(ord);
                    }}
                    style={{
                      flex: 1,
                      background: '#170e5e',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>⚡</span>
                    <span>دليفري داخلي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const ord = selectedOrder;
                      setSelectedOrder(null);
                      setBostaModalOrder(ord);
                    }}
                    style={{
                      flex: 1,
                      background: '#e11d48',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '13px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📦</span>
                    <span>شحن بوسطة</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
