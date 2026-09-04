import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storefrontApi } from '@/features/storefront/api/storefront.api';
import { ConvertDeliveryModal } from '@/features/storefront/components/ConvertDeliveryModal';
import { loadOnlineOrderIntoPosCart } from '@/features/storefront/lib/storefront-pos-loader';
import type { OnlineOrderRecord } from '@/features/storefront/types/storefront.types';
import { Button } from '@/shared/ui/button';

interface PosOnlineOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PosOnlineOrdersModal({ isOpen, onClose }: PosOnlineOrdersModalProps) {
  const queryClient = useQueryClient();
  const [deliveryModalOrder, setDeliveryModalOrder] = useState<OnlineOrderRecord | null>(null);
  const [loadingPosOrderId, setLoadingPosOrderId] = useState<number | null>(null);

  const handleLoadToPos = async (orderId: number) => {
    setLoadingPosOrderId(orderId);
    try {
      await loadOnlineOrderIntoPosCart(orderId, () => {
        window.location.reload();
      });
      onClose();
    } catch (err: any) {
      setLoadingPosOrderId(null);
      alert(`تعذر تنزيل الطلب في السلة: ${err.message || 'خطأ غير متوقع'}`);
    }
  };

  const ordersQuery = useQuery({
    queryKey: ['pos-online-orders-quick'],
    queryFn: () => storefrontApi.listOrders('pending'),
    enabled: isOpen,
    refetchInterval: 12 * 1000,
  });

  if (!isOpen) return null;

  const orders = ordersQuery.data?.orders || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        direction: 'rtl',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#170e5e' }}>
              طلبات المتجر الإلكتروني الواردة
            </h3>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: orders.length > 0 ? '#fee2e2' : '#f1f5f9',
                color: orders.length > 0 ? '#b91c1c' : '#64748b',
                padding: '2px 8px',
                borderRadius: '999px',
                border: orders.length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
              }}
            >
              {orders.length} طلب جديد
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Orders List */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {ordersQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              جاري فحص الطلبات...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>✨</div>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                لا توجد أوردرات جديدة معلقة
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                أي طلب جديد يقوم به العميل من المتجر سيظهر هنا مباشرة مع تنبيه.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map((order) => {
                const cleanPhone = order.customerPhone.replace(/\D/g, '');
                const waPhone = cleanPhone.startsWith('01') ? `2${cleanPhone}` : cleanPhone;

                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1.5px solid #e2e8f0',
                      padding: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    {/* Top Row: Order # & Time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#170e5e' }}>
                          #{order.orderNumber}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                          }}
                        >
                          قيد الانتظار
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Customer & Address */}
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{order.customerName}</span>
                        <span style={{ color: '#475569', direction: 'ltr' }}>{order.customerPhone}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '12px' }}>
                        {order.customerAddress || 'استلام من المتجر'}
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div style={{ fontSize: '12.5px', color: '#334155' }}>
                      <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '12px', color: '#64748b' }}>
                        الأصناف ({order.items.length}):
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {order.items.map((it, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#1e293b',
                            }}
                          >
                            {it.name} (×{it.quantity})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px dashed #e2e8f0',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>الإجمالي: </span>
                        <span style={{ fontSize: '15px', fontWeight: 900, color: '#170e5e' }}>
                          {order.totalAmount} ج.م
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {waPhone && (
                          <a
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: '#25D366',
                              color: '#ffffff',
                              textDecoration: 'none',
                            }}
                            title="واتساب العميل"
                          >
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.181-.076.355.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                            </svg>
                          </a>
                        )}

                        <Button
                          type="button"
                          onClick={() => handleLoadToPos(order.id)}
                          disabled={loadingPosOrderId === order.id}
                          style={{
                            background: '#047857',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '6px 12px',
                          }}
                        >
                          <span>{loadingPosOrderId === order.id ? 'جاري النقل...' : 'تنزيل بالسلة'}</span>
                        </Button>

                        <Button
                          type="button"
                          onClick={() => setDeliveryModalOrder(order)}
                          style={{
                            background: '#170e5e',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '6px 12px',
                          }}
                        >
                          <span>دليفري ومندوب</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Link */}
        <div
          style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12.5px',
          }}
        >
          <span style={{ color: '#64748b' }}>
            النظام يسجل العميل تلقائياً ويخصم المخزون فوراً.
          </span>
          <Link
            to="/online-orders"
            onClick={onClose}
            style={{
              color: '#170e5e',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>شاشة إدارة الطلبات الكاملة</span>
            <span>←</span>
          </Link>
        </div>
      </div>

      <ConvertDeliveryModal
        order={deliveryModalOrder}
        isOpen={Boolean(deliveryModalOrder)}
        onClose={() => setDeliveryModalOrder(null)}
        onSuccess={(data) => {
          queryClient.invalidateQueries({ queryKey: ['pos-online-orders-quick'] });
          queryClient.invalidateQueries({ queryKey: ['storefront-admin-orders-count'] });
          const custMsg = data.isNewCustomer
            ? `\nتم تسجيل (${data.customerName}) كعميل جديد في النظام تلقائياً!`
            : `\nالعميل: ${data.customerName}`;
          const repMsg = data.deliveryRepName ? `\nالمندوب: ${data.deliveryRepName}` : '';
          alert(`تم تحويل الطلب بنجاح إلى فاتورة مبيعات دليفري رقم #${data.saleId} وتخصيم المخزون!${custMsg}${repMsg}`);
        }}
        onLoadToPos={handleLoadToPos}
      />
    </div>
  );
}