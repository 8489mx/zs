import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PackageIcon,
  ShoppingCartIcon,
  RefreshCwIcon,
  ClockIcon,
  XIcon,
  AlertTriangleIcon,
  InfoIcon,
} from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
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
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(580px, calc(100vw - 20px))"
      ariaLabel="متابعة طلباتي"
    >
      <div
        className="full-bleed"
        dir="rtl"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(88vh, 720px)',
          direction: 'rtl',
          position: 'relative',
          fontFamily: 'inherit',
        }}
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
              padding: '16px',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!cancelMutation.isPending) setCancellingOrder(null);
            }}
          >
            <div
              style={{
                width: 'min(380px, 92vw)',
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                padding: '20px',
                textAlign: 'center',
                direction: 'rtl',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <AlertTriangleIcon size={22} color="#dc2626" />
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                تأكيد إلغاء الطلب #{cancellingOrder.orderNumber}
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
                هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  disabled={cancelMutation.isPending}
                  style={{
                    flex: 1,
                    height: '36px',
                    borderRadius: '9px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '12.5px',
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
                    height: '36px',
                    borderRadius: '9px',
                    background: '#dc2626',
                    border: '1px solid #b91c1c',
                    color: '#ffffff',
                    fontSize: '12.5px',
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

        {/* Compact, Clean Premium Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          {/* Title Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                background: 'var(--storefront-primary-subtle, #f0f3ff)',
                color: 'var(--storefront-primary-color, #170e5e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(23, 14, 94, 0.1)',
                flexShrink: 0,
              }}
            >
              <PackageIcon size={18} color="var(--storefront-primary-color, #170e5e)" strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '3px',
                    height: '13px',
                    backgroundColor: 'var(--storefront-primary-color, #170e5e)',
                    borderRadius: '2px',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  متابعة طلباتي
                </h3>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  marginTop: '1px',
                }}
              >
                تتبع حالة ومسار طلباتك وإدارتها
              </span>
            </div>
          </div>

          {/* Action Buttons: Refresh + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => ordersQuery.refetch()}
              disabled={ordersQuery.isFetching}
              title="تحديث البيانات"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                height: '30px',
                padding: '0 9px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: ordersQuery.isFetching ? 'not-allowed' : 'pointer',
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--storefront-primary-color, #170e5e)',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {ordersQuery.isFetching ? <ClockIcon size={13} /> : <RefreshCwIcon size={13} />}
              <span>{ordersQuery.isFetching ? 'جاري...' : 'تحديث'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="إغلاق (Esc)"
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              <XIcon size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Compact Device Notice Banner */}
        <div
          style={{
            padding: '7px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#64748b',
            flexShrink: 0,
          }}
        >
          <InfoIcon size={13} color="#64748b" style={{ flexShrink: 0 }} />
          <span style={{ lineHeight: 1.35 }}>
            تظهر هنا الطلبات المسجلة من هذا الجهاز فقط. لمتابعة طلب من جهاز آخر، تواصل برقم الطلب.
          </span>
        </div>

        {/* Action Error Banner if any */}
        {actionError && (
          <div
            style={{
              padding: '6px 16px',
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: '11.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid #fecaca',
            }}
          >
            <AlertTriangleIcon size={14} color="#991b1b" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Orders List Content */}
        <div
          style={{
            padding: '12px 14px',
            overflowY: 'auto',
            flex: 1,
            boxSizing: 'border-box',
          }}
        >
          {ordersQuery.isLoading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
              جاري البحث عن طلباتك...
            </div>
          ) : groupedOrders.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <ShoppingCartIcon size={38} color="#94a3b8" />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                لا توجد طلبات مسجلة حالياً
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                ستظهر طلباتك هنا تلقائياً بعد إتمام أي طلب من هذا المتجر.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
    </DialogShell>
  );
}
