import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';

interface StorefrontMyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
}

export function StorefrontMyOrdersModal({
  isOpen,
  onClose,
  slug,
  info,
  onEditOrder,
}: StorefrontMyOrdersModalProps) {
  const queryClient = useQueryClient();
  const savedPhoneKey = `zs_customer_phone_${slug}`;
  const savedOrdersKey = `zs_customer_orders_${slug}`;

  const getSavedPhone = () => {
    try {
      return localStorage.getItem(savedPhoneKey) || '';
    } catch {
      return '';
    }
  };

  const getSavedOrderNumbers = (): string[] => {
    try {
      const raw = localStorage.getItem(savedOrdersKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const [phoneSearch, setPhoneSearch] = useState(getSavedPhone());
  const [activeSearchPhone, setActiveSearchPhone] = useState(getSavedPhone());
  const [actionError, setActionError] = useState('');

  const savedOrderNumbers = getSavedOrderNumbers();

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', slug, activeSearchPhone, savedOrderNumbers.join(',')],
    queryFn: async () => {
      const res = await storefrontApi.getCustomerOrders(slug, activeSearchPhone, savedOrderNumbers);
      return res.orders || [];
    },
    enabled: isOpen && (Boolean(activeSearchPhone) || savedOrderNumbers.length > 0),
    staleTime: 10 * 1000,
    refetchInterval: isOpen ? 15 * 1000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: (orderNumber: string) => storefrontApi.cancelCustomerOrder(slug, orderNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders', slug] });
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.message || 'تعذر إلغاء الطلب');
    },
  });

  if (!isOpen) return null;

  const orders = ordersQuery.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'قيد الانتظار (يمكن التعديل)', bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
      case 'confirmed':
        return { label: 'تم الاعتماد والتأكيد', bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' };
      case 'processing':
        return { label: 'جاري التجهيز في المتجر', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' };
      case 'shipped':
        return { label: 'خرج للتوصيل مع المندوب', bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
      case 'delivered':
        return { label: 'تم التسليم ومكتمل ✓', bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
      case 'cancelled':
        return { label: 'طلب ملغي', bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
      default:
        return { label: status, bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
    }
  };

  const handleSearchPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneSearch.trim();
    setActiveSearchPhone(clean);
    try {
      localStorage.setItem(savedPhoneKey, clean);
    } catch {}
  };

  const handleCancelOrder = (order: OnlineOrderRecord) => {
    if (window.confirm(`هل أنت متأكد من رغبتك في إلغاء الطلب #${order.orderNumber}؟`)) {
      cancelMutation.mutate(order.orderNumber);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
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
          maxHeight: '88vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
                متابعة طلباتي
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                تتبع حالة طلباتك، وإمكانية تعديلها أو إلغائها قبل اعتمادها
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#64748b',
            }}
          >
            ✕
          </button>
        </div>

        {/* Phone Lookup Bar */}
        <div style={{ padding: '14px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
          <form onSubmit={handleSearchPhone} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="tel"
              placeholder="ابحث برقم هاتفك المسجل به الطلب (مثال: 01018017523)..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                direction: 'rtl',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              بحث
            </button>
          </form>
          {actionError && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
            >
              ⚠️ {actionError}
            </div>
          )}
        </div>

        {/* Orders List Content */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          {ordersQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              جاري البحث عن طلباتك...
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '38px', marginBottom: '8px' }}>🛒</div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                لا توجد طلبات مسجلة حالياً
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
                إذا قمت بالطلب مسبقاً، أدخل رقم هاتفك أعلاه للبحث عن طلباتك فوراً.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const isPending = order.status === 'pending' && !order.saleId;

                return (
                  <div
                    key={order.id}
                    style={{
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      background: '#ffffff',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Top Row: Order Number, Date, Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                          #{order.orderNumber}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748b', marginRight: '8px' }}>
                          {new Date(order.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: '#334155',
                        background: '#f8fafc',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        marginBottom: '10px',
                      }}
                    >
                      {order.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>
                            {it.name} (×{it.quantity})
                          </span>
                          <span style={{ fontWeight: 600 }}>{it.total.toFixed(0)} ج</span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Row: Total & Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>الإجمالي: </span>
                        <span style={{ fontWeight: 800, color: '#170e5e', fontSize: '14.5px' }}>
                          {order.totalAmount.toFixed(0)} {info.currency || 'ج.م'}
                        </span>
                      </div>

                      {/* Action buttons (only if pending) */}
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEditOrder(order);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#f0f3ff',
                              border: '1px solid #c7d2fe',
                              color: '#170e5e',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <span>✏️</span>
                            <span>تعديل الطلب</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancelMutation.isPending}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#fff1f2',
                              border: '1px solid #fecdd3',
                              color: '#be123c',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <span>❌</span>
                            <span>إلغاء الطلب</span>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {order.status === 'cancelled'
                            ? 'تم إلغاء هذا الطلب'
                            : 'تم تأكيد الطلب من المتجر، لا يمكن تعديله'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
