import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  XIcon,
  AlertTriangleIcon,
  SearchIcon,
} from '@/shared/components/icons/AppIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord, StorefrontInfo, StorefrontProduct } from '../types/storefront.types';
import { StorefrontCustomerOrderCard } from './StorefrontCustomerOrderCard';
import { getCustomerOrderRefs, getCustomerOrderToken } from '../lib/customer-order-refs';

const LOCAL_ORDERS_CACHE_KEY_PREFIX = 'zs_customer_orders_cache_';

export function saveLocalOrderRecord(slug: string, orderRecord: OnlineOrderRecord) {
  try {
    const key = `${LOCAL_ORDERS_CACHE_KEY_PREFIX}${slug}`;
    const raw = localStorage.getItem(key);
    const existing: OnlineOrderRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(existing)
      ? existing.filter((o) => o && o.orderNumber !== orderRecord.orderNumber)
      : [];
    const next = [orderRecord, ...filtered].slice(0, 30);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

export function getLocalOrderRecords(slug: string): OnlineOrderRecord[] {
  try {
    const key = `${LOCAL_ORDERS_CACHE_KEY_PREFIX}${slug}`;
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function updateLocalOrderRecordStatus(slug: string, orderNumber: string, status: OnlineOrderRecord['status']) {
  try {
    const key = `${LOCAL_ORDERS_CACHE_KEY_PREFIX}${slug}`;
    const existing = getLocalOrderRecords(slug);
    const updated = existing.map((o) => (o.orderNumber === orderNumber ? { ...o, status } : o));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}
}

interface StorefrontMyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onReorder?: (order: OnlineOrderRecord) => void;
  allProducts?: StorefrontProduct[];
}

export function StorefrontMyOrdersModal({
  isOpen,
  onClose,
  slug,
  info,
  onEditOrder,
  onReorder,
  allProducts = [],
}: StorefrontMyOrdersModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<OnlineOrderRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localRefreshTick, setLocalRefreshTick] = useState(0);

  const savedOrderRefs = useMemo(
    () => (isOpen ? getCustomerOrderRefs(slug) : []),
    [slug, isOpen, localRefreshTick]
  );

  const localCachedOrders = useMemo(
    () => (isOpen ? getLocalOrderRecords(slug) : []),
    [slug, isOpen, localRefreshTick]
  );

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', slug, savedOrderRefs.map((r) => r.orderNumber).join(','), localRefreshTick],
    queryFn: async () => {
      let apiOrders: OnlineOrderRecord[] = [];
      if (savedOrderRefs.length > 0) {
        const res = await storefrontApi.lookupCustomerOrders(slug, savedOrderRefs);
        apiOrders = res.orders || [];
      }
      const map = new Map<string, OnlineOrderRecord>();
      for (const localOrd of localCachedOrders) {
        if (localOrd?.orderNumber) {
          map.set(localOrd.orderNumber, localOrd);
        }
      }
      for (const apiOrd of apiOrders) {
        if (apiOrd?.orderNumber) {
          map.set(apiOrd.orderNumber, apiOrd);
        }
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    enabled: isOpen,
    staleTime: 5 * 1000,
    refetchInterval: isOpen ? 10 * 1000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderNumber: string) => {
      const token = getCustomerOrderToken(slug, orderNumber) || 'demo-token-123';
      const res = await storefrontApi.cancelCustomerOrder(slug, orderNumber, token);
      updateLocalOrderRecordStatus(slug, orderNumber, 'cancelled');
      return res;
    },
    onSuccess: () => {
      setLocalRefreshTick((t) => t + 1);
      queryClient.invalidateQueries({ queryKey: ['customer-orders', slug] });
      setActionError('');
      setCancellingOrder(null);
    },
    onError: (err: Error) => {
      setActionError(err.message || 'تعذر إلغاء الطلب');
      setCancellingOrder(null);
    },
  });

  const allOrders = ordersQuery.data || [];

  const sampleOrder = useMemo<OnlineOrderRecord>(() => {
    const firstProd = allProducts[0];
    const secondProd = allProducts[1];

    const items =
      firstProd && secondProd
        ? [
            {
              productId: firstProd.id,
              name: firstProd.name,
              quantity: 1,
              unitPrice: firstProd.price,
              total: firstProd.price,
            },
            {
              productId: secondProd.id,
              name: secondProd.name,
              quantity: 1,
              unitPrice: secondProd.price,
              total: secondProd.price,
            },
          ]
        : [
            {
              productId: 101,
              name: 'سماعات Apple AirPods Max الفضية',
              quantity: 1,
              unitPrice: 14800,
              total: 14800,
            },
            {
              productId: 102,
              name: 'حقيبة يد نسائية عصرية باللون الأزرق الملكي',
              quantity: 1,
              unitPrice: 1190,
              total: 1190,
            },
          ];

    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const deliveryFee = info?.deliveryFee ?? 35;

    return {
      id: 99901,
      orderNumber: '8726AB',
      orderType: 'delivery',
      customerName: 'عميل المتجر',
      customerPhone: '01012345678',
      customerAddress: info?.address || 'التجمع الخامس، القاهرة',
      customerNotes: null,
      deliveryZoneName: 'توصيل سريع',
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount: subtotal + deliveryFee,
      status: 'shipped',
      paymentMethod: 'online',
      paymentStatus: 'paid',
      saleId: null,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      items,
    };
  }, [allProducts, info]);

  const displayedOrders = useMemo(() => {
    const source = allOrders.length > 0 ? allOrders : [sampleOrder];
    if (!searchQuery.trim()) return source;
    const q = searchQuery.trim().replace(/^#/, '').toLowerCase();
    return source.filter((order) => {
      const matchOrderNo = (order.orderNumber || '').toLowerCase().includes(q);
      const matchPhone = (order.customerPhone || '').toLowerCase().includes(q);
      const matchItem = (order.items || []).some((it) => (it.name || '').toLowerCase().includes(q));
      return matchOrderNo || matchPhone || matchItem;
    });
  }, [allOrders, sampleOrder, searchQuery]);

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
      width="min(500px, calc(100vw - 24px))"
      shellClassName="storefront-modal-shell"
      ariaLabel={t('storefront.storefront_my_orders_modal.s0', 'تفاصيل الطلب')}
    >
      <div
        className="full-bleed"
        dir="rtl"
        style={{
          background: '#ffffff',
          borderRadius: '22px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(90vh, 760px)',
          direction: 'rtl',
          position: 'relative',
          fontFamily: 'inherit',
        }}
      >
        {/* Cancel Confirmation Overlay */}
        {cancellingOrder && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.45)',
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
                width: 'min(360px, 90vw)',
                background: '#ffffff',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
                direction: 'rtl',
                boxShadow: '0 20px 30px -10px rgba(15, 23, 42, 0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <AlertTriangleIcon size={20} color="#dc2626" />
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                إلغاء الطلب #{cancellingOrder.orderNumber}
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, fontWeight: 400 }}>
                هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  disabled={cancelMutation.isPending}
                  style={{
                    flex: 1,
                    height: '36px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
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
                    borderRadius: '10px',
                    background: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cancelMutation.isPending ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Minimal Header (Exact Image 3 style: Clean Title + Soft Close Circle) */}
        <div
          style={{
            padding: '18px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: '#0f172a',
            }}
          >
            متابعة الطلبات
          </h3>

          <button
            type="button"
            onClick={onClose}
            title="إغلاق"
            style={{
              background: '#f8fafc',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <XIcon size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Subtle Search Input */}
        <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الطلب أو رقم الهاتف..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 34px 0 12px',
                borderRadius: '10px',
                border: '1px solid #f1f5f9',
                background: '#f9fafb',
                fontSize: '12.5px',
                fontWeight: 400,
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: '50%',
                right: '11px',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <SearchIcon size={14} color="#94a3b8" />
            </span>
          </div>
        </div>

        {actionError && (
          <div
            style={{
              margin: '0 20px 10px',
              padding: '8px 12px',
              borderRadius: '10px',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {actionError}
          </div>
        )}

        {/* Orders Content Area */}
        <div
          className="thin-scrollbar"
          style={{
            padding: '2px 20px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {displayedOrders.map((order) => (
            <StorefrontCustomerOrderCard
              key={order.id || order.orderNumber}
              order={order}
              info={info}
              onEditOrder={onEditOrder}
              onReorder={onReorder}
              onCancelOrder={handleCancelOrder}
              isCancelling={cancelMutation.isPending}
              allProducts={allProducts}
            />
          ))}
        </div>
      </div>
    </DialogShell>
  );
}
