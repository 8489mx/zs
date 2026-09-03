import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { Button } from '@/shared/ui/button';

export function MerchantOnlineOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrderRecord | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['storefront-admin-settings'],
    queryFn: storefrontApi.getSettings,
  });

  const ordersQuery = useQuery({
    queryKey: ['storefront-admin-orders', statusFilter],
    queryFn: () => storefrontApi.listOrders(statusFilter),
    refetchInterval: 15 * 1000, // auto-refresh every 15s for new orders!
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      storefrontApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
      if (selectedOrder) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: statusFilter as any } : null));
      }
    },
  });

  const convertToSaleMutation = useMutation({
    mutationFn: (id: number) => storefrontApi.convertToSale(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders'] });
      alert(`تم تحويل الطلب بنجاح إلى فاتورة مبيعات رقم #${data.saleId} وخصم المخزون!`);
      setSelectedOrder(null);
    },
    onError: (err: any) => {
      alert(`تعذر تحويل الطلب: ${err.message || 'خطأ غير متوقع'}`);
    },
  });

  const orders = ordersQuery.data?.orders || [];
  const settings = settingsQuery.data;

  const storeSlug = settings?.slug || '';
  const storeUrl = `${window.location.origin}/store/${storeSlug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'جديد / قيد الانتظار', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'confirmed':
        return { label: 'تم التأكيد', bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case 'processing':
        return { label: 'جاري التجهيز', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
      case 'shipped':
        return { label: 'خرج للتوصيل', bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
      case 'delivered':
        return { label: 'مكتمل / تم التسليم', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'cancelled':
        return { label: 'ملغي', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default:
        return { label: status, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div style={{ padding: '24px 32px', width: '100%', direction: 'rtl' }}>
      {/* Top Card: Store URL & Quick Share (Clean Enterprise White Card) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              إدارة ومتابعة طلبات المتجر الإلكتروني
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#f0f3ff',
                color: '#170e5e',
                padding: '2px 9px',
                borderRadius: '999px',
                border: '1px solid #d8e0fc',
              }}
            >
              مباشر ومربوط بالمخزن
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              رابط متجرك للزبائن:
            </span>
            <span style={{ fontSize: '13.5px', fontFamily: 'monospace', direction: 'ltr', color: '#170e5e', fontWeight: 700 }}>
              {storeUrl}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCopyLink}
            style={{
              fontWeight: 700,
              fontSize: '13px',
              padding: '8px 16px',
            }}
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
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>معاينة المتجر كزبون ↗</span>
          </a>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '20px',
        }}
      >
        {[
          { id: 'all', label: 'جميع الطلبات' },
          { id: 'pending', label: 'قيد الانتظار (جديدة)' },
          { id: 'confirmed', label: 'تم التأكيد' },
          { id: 'processing', label: 'جاري التجهيز' },
          { id: 'shipped', label: 'خرجت للتوصيل' },
          { id: 'delivered', label: 'مكتملة ومسلمة' },
          { id: 'cancelled', label: 'ملغية' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: statusFilter === tab.id ? 700 : 500,
              background: statusFilter === tab.id ? '#0f172a' : '#ffffff',
              color: statusFilter === tab.id ? '#ffffff' : '#475569',
              border: statusFilter === tab.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
        }}
      >
        {ordersQuery.isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            جاري تحميل الطلبات...
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              لا توجد طلبات في هذا القسم
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              عندما يطلب أي عميل من رابط متجرك سيظهر طلبه هنا فوراً مع تنبيه بالبيانات والمخزون.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>رقم الطلب</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>العميل والهاتف</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>عنوان التوصيل</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>عدد الأصناف</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>المبلغ الإجمالي</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>الحالة</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700 }}>تاريخ الطلب</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
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
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>
                        #{order.orderNumber}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{order.customerName}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                          {order.customerPhone}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', maxWidth: '240px', color: '#334155' }}>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={order.customerAddress || ''}
                        >
                          {order.customerAddress || 'غير محدد'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569' }}>
                        {order.items.length} صنف (
                        {order.items.reduce((acc, i) => acc + i.quantity, 0)} قطعة)
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#0f172a' }}>
                        {order.totalAmount.toFixed(0)} ج
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px' }}>
                        {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedOrder(order)}
                            style={{ fontSize: '12px', padding: '6px 10px' }}
                          >
                            تفاصيل الطلب
                          </Button>
                          {waPhone && (
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
                                borderRadius: '8px',
                                background: '#25D366',
                                color: '#ffffff',
                                textDecoration: 'none',
                              }}
                            >
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                              </svg>
                            </a>
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
                {selectedOrder.customerNotes && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>ملاحظات:</span>
                    <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                      {selectedOrder.customerNotes}
                    </span>
                  </div>
                )}
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
                  <span>رسوم التوصيل:</span>
                  <span style={{ fontWeight: 600 }}>{selectedOrder.deliveryFee.toFixed(0)} ج</span>
                </div>
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
              {selectedOrder.saleId ? (
                <div
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px',
                    background: '#dcfce7',
                    color: '#166534',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  ✓ محول لفاتورة مبيعات رقم #{selectedOrder.saleId}
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => convertToSaleMutation.mutate(selectedOrder.id)}
                  disabled={convertToSaleMutation.isPending}
                  style={{
                    flex: 1,
                    background: '#0f172a',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '11px',
                  }}
                >
                  {convertToSaleMutation.isPending
                    ? 'جاري التحويل وخصم المخزن...'
                    : 'تحويل لفاتورة مبيعات وخصم المخزن'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
