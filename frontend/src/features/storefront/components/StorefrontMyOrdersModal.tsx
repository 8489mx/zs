import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageIcon, ShoppingCartIcon, RefreshCwIcon, ClockIcon, XIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';
import { StorefrontOrderDateGroupCard, DateGroupedOrders } from './StorefrontOrderDateGroupCard';
import { getCustomerOrderRefs, getCustomerOrderToken } from '../lib/customer-order-refs';

interface StorefrontMyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onReorder?: (order: OnlineOrderRecord) => void;
}

function formatOrderDayAndDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'تاريخ غير معروف';
  const dayName = d.toLocaleDateString('ar-EG', { weekday: 'long' });
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayName} ${day}/${month}/${year}`;
}

export function StorefrontMyOrdersModal({
  isOpen,
  onClose,
  slug,
  info,
  onEditOrder,
  onReorder,
}: StorefrontMyOrdersModalProps) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [expandedDateKeys, setExpandedDateKeys] = useState<Record<string, boolean>>({});

  const [cancellingOrder, setCancellingOrder] = useState<OnlineOrderRecord | null>(null);

  // Orders are looked up only by the access tokens this device received at checkout (SF-1).
  // Re-read on every open so an order placed a moment ago shows up.
  const savedOrderRefs = useMemo(() => (isOpen ? getCustomerOrderRefs(slug) : []), [slug, isOpen]);

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', slug, savedOrderRefs.map((r) => r.orderNumber).join(',')],
    queryFn: async () => {
      const res = await storefrontApi.lookupCustomerOrders(slug, savedOrderRefs);
      return res.orders || [];
    },
    enabled: isOpen && savedOrderRefs.length > 0,
    staleTime: 5 * 1000,
    refetchInterval: isOpen ? 10 * 1000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: (orderNumber: string) => {
      const token = getCustomerOrderToken(slug, orderNumber);
      if (!token) throw new Error('تعذر التحقق من ملكية الطلب على هذا الجهاز، يرجى التواصل مع المتجر');
      return storefrontApi.cancelCustomerOrder(slug, orderNumber, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders', slug] });
      setActionError('');
      setCancellingOrder(null);
    },
    onError: (err: Error) => {
      setActionError(err.message || 'تعذر إلغاء الطلب');
      setCancellingOrder(null);
    },
  });

  const groupedOrders = useMemo(() => {
    const orders = ordersQuery.data || [];
    const map = new Map<string, DateGroupedOrders>();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (const order of orders) {
      const d = new Date(order.createdAt);
      const dateKey = Number.isNaN(d.getTime())
        ? 'unknown'
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let group = map.get(dateKey);
      if (!group) {
        group = {
          dateKey,
          label: formatOrderDayAndDate(order.createdAt),
          isToday: dateKey === todayKey,
          orders: [],
          totalAmount: 0,
        };
        map.set(dateKey, group);
      }
      group.orders.push(order);
      group.totalAmount += order.totalAmount || 0;
    }

    return Array.from(map.values());
  }, [ordersQuery.data]);

  useEffect(() => {
    if (groupedOrders.length > 0) {
      setExpandedDateKeys((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        return { [groupedOrders[0].dateKey]: true };
      });
    }
  }, [groupedOrders]);

  const toggleGroup = (dateKey: string) => {
    setExpandedDateKeys((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const handleCancelOrder = (order: OnlineOrderRecord) => {
    setCancellingOrder(order);
  };

  const confirmCancel = () => {
    if (!cancellingOrder) return;
    cancelMutation.mutate(cancellingOrder.orderNumber);
  };

  if (!isOpen) return null;

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
          width: 'min(760px, 96vw)',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Custom Cancel Order Confirmation Overlay */}
        {cancellingOrder && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!cancelMutation.isPending) setCancellingOrder(null);
            }}
          >
            <div
              style={{
                width: 'min(420px, 92vw)',
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                padding: '24px',
                textAlign: 'center',
                direction: 'rtl',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <AlertTriangleIcon size={24} color="#dc2626" />
              </div>

              <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                تأكيد إلغاء الطلب #{cancellingOrder.orderNumber}
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  disabled={cancelMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={confirmCancel}
                  disabled={cancelMutation.isPending}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: '#dc2626',
                    border: '1px solid #b91c1c',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cancelMutation.isPending ? 'جاري الإلغاء...' : 'نعم، إلغاء الطلب'}
                </button>
              </div>
            </div>
          </div>
        )}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e0e7ff',
                flexShrink: 0,
              }}
            >
              <PackageIcon size={22} color="#170e5e" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
                  متابعة طلباتي
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                تتبع حالة ومسار طلباتك، وإمكانية تعديلها أو إلغائها قبل اعتمادها
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => ordersQuery.refetch()}
              disabled={ordersQuery.isFetching}
              title="تحديث البيانات فوراً"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                height: '34px',
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: ordersQuery.isFetching ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                color: '#170e5e',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {ordersQuery.isFetching ? <ClockIcon size={14} /> : <RefreshCwIcon size={14} />}
              <span>{ordersQuery.isFetching ? 'جاري التحديث...' : 'تحديث'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Device notice + errors */}
        <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            تظهر هنا الطلبات التي تمت من هذا الجهاز فقط حفاظاً على خصوصية بياناتك. لمتابعة طلب من جهاز آخر، يرجى التواصل مع المتجر برقم الطلب.
          </p>
          {actionError && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #fecaca',
              }}
            >
              <AlertTriangleIcon size={15} color="#991b1b" />
              <span>{actionError}</span>
            </div>
          )}
        </div>

        {/* Orders List Content */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          {ordersQuery.isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              جاري البحث عن طلباتك...
            </div>
          ) : groupedOrders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <ShoppingCartIcon size={42} color="#94a3b8" />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                لا توجد طلبات مسجلة حالياً
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
                ستظهر طلباتك هنا تلقائياً بعد إتمام أي طلب من هذا الجهاز.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groupedOrders.map((group) => (
                <StorefrontOrderDateGroupCard
                  key={group.dateKey}
                  group={group}
                  isExpanded={Boolean(expandedDateKeys[group.dateKey])}
                  onToggle={() => toggleGroup(group.dateKey)}
                  info={info}
                  onEditOrder={onEditOrder}
                  onReorder={onReorder}
                  onCancelOrder={handleCancelOrder}
                  isCancelling={cancelMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
