import { useTranslation } from 'react-i18next';
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
  SearchIcon,
  CheckIcon,
} from '@/shared/components/icons/AppIcons';
import { IconWhatsapp } from './StorefrontIcons';
import { DialogShell } from '@/shared/components/dialog-shell';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';
import { StorefrontOrderDateGroupCard, DateGroupedOrders } from './StorefrontOrderDateGroupCard';
import { getCustomerOrderRefs, getCustomerOrderToken, saveCustomerOrderRef } from '../lib/customer-order-refs';

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

type OrderFilterTab = 'all' | 'active' | 'delivered' | 'cancelled';

export function StorefrontMyOrdersModal({
  isOpen,
  onClose,
  slug,
  info,
  onEditOrder,
  onReorder,
}: StorefrontMyOrdersModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [expandedDateKeys, setExpandedDateKeys] = useState<Record<string, boolean>>({});
  const [cancellingOrder, setCancellingOrder] = useState<OnlineOrderRecord | null>(null);

  // Search / Track by Order Number or Phone Number + Status Filter Tabs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderFilterTab>('all');
  const [lookupFeedback, setLookupFeedback] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [localRefreshTick, setLocalRefreshTick] = useState(0);

  // Orders are looked up by the access tokens this device received at checkout (SF-1) + local cache fallback.
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
      // Merge API orders with locally cached orders on this device so orders placed in demo/offline mode also appear
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

  // Calculate status summary counts
  const statusCounts = useMemo(() => {
    let active = 0;
    let delivered = 0;
    let cancelled = 0;
    for (const o of allOrders) {
      if (o.status === 'delivered') delivered++;
      else if (o.status === 'cancelled') cancelled++;
      else active++;
    }
    return {
      all: allOrders.length,
      active,
      delivered,
      cancelled,
    };
  }, [allOrders]);

  // Filter orders by search query (Order Number / Phone / Item Name) and status tab
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      if (statusFilter === 'active' && (order.status === 'delivered' || order.status === 'cancelled')) {
        return false;
      }
      if (statusFilter === 'delivered' && order.status !== 'delivered') {
        return false;
      }
      if (statusFilter === 'cancelled' && order.status !== 'cancelled') {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().replace(/^#/, '').toLowerCase();
        const matchOrderNo = (order.orderNumber || '').toLowerCase().includes(q);
        const matchPhone = (order.customerPhone || '').toLowerCase().includes(q);
        const matchName = (order.customerName || '').toLowerCase().includes(q);
        const matchItem = (order.items || []).some((it) => (it.name || '').toLowerCase().includes(q));
        return matchOrderNo || matchPhone || matchName || matchItem;
      }
      return true;
    });
  }, [allOrders, statusFilter, searchQuery]);

  const groupedOrders = useMemo(() => {
    const map = new Map<string, DateGroupedOrders>();
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (const order of filteredOrders) {
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
  }, [filteredOrders]);

  useEffect(() => {
    if (groupedOrders.length > 0) {
      setExpandedDateKeys((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        return { [groupedOrders[0].dateKey]: true };
      });
    }
  }, [groupedOrders]);

  // Create a realistic sample order for immediate preview/tracking when user clicks "تجربة تتبع طلب نموذجي"
  const handleAddSampleOrderForPreview = () => {
    const sampleOrderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const sampleOrder: OnlineOrderRecord = {
      id: Date.now(),
      orderNumber: sampleOrderNumber,
      orderType: 'delivery',
      customerName: 'عميل المتجر',
      customerPhone: '01012345678',
      customerAddress: info.address || 'القاهرة - التجمع الخامس، شارع التسعين',
      customerNotes: 'الاتصال قبل الوصول بـ 15 دقيقة',
      deliveryZoneName: 'التوصيل السريع',
      subtotal: 1890,
      deliveryFee: info.deliveryFee || 35,
      totalAmount: 1890 + (info.deliveryFee || 35),
      discountAmount: 0,
      status: 'processing',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      saleId: null,
      createdAt: new Date().toISOString(),
      items: [
        {
          productId: 206,
          name: 'حقيبة يد نسائية Prada جلد طبيعي فاخرة',
          quantity: 1,
          unitPrice: 1890,
          total: 1890,
        },
      ],
    };
    saveCustomerOrderRef(slug, sampleOrderNumber, 'demo-token-123');
    saveLocalOrderRecord(slug, sampleOrder);
    setLocalRefreshTick((t) => t + 1);
    setLookupFeedback({
      type: 'success',
      text: `تم تحميل الطلب رقم #${sampleOrderNumber} بنجاح لمتابعة حالته ومساره.`,
    });
    setTimeout(() => setLookupFeedback(null), 3500);
  };

  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = searchQuery.trim().replace(/^#/, '');
    if (!cleaned) {
      setLookupFeedback(null);
      return;
    }
    const found = allOrders.some(
      (o) =>
        o.orderNumber.toLowerCase().includes(cleaned.toLowerCase()) ||
        (o.customerPhone || '').includes(cleaned)
    );
    if (found) {
      setLookupFeedback({
        type: 'success',
        text: `تم العثور على الطلبات المطابقة لـ «${cleaned}»`,
      });
    } else {
      setLookupFeedback({
        type: 'info',
        text: `لا يوجد طلب مسجل على هذا الجهاز برقم «${cleaned}». يمكنك الاستفسار مباشرة عبر واتساب المتجر بالأسفل.`,
      });
    }
  };

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

  const brandColor = info?.brandColor || 'var(--storefront-primary-color, #2d68c4)';
  const cleanWhatsappPhone = (info?.whatsappPhone || '').replace(/\D/g, '');
  const whatsappSupportUrl = cleanWhatsappPhone
    ? `https://wa.me/${cleanWhatsappPhone}?text=${encodeURIComponent(
        `مرحباً، أود الاستفسار عن متابعة طلبي في متجر ${info.businessName || info.title || ''}${
          searchQuery.trim() ? ` - رقم الطلب/الهاتف: ${searchQuery.trim()}` : ''
        }`
      )}`
    : null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(620px, calc(100vw - 20px))"
      shellClassName="storefront-modal-shell"
      ariaLabel={t('storefront.storefront_my_orders_modal.s0', 'متابعة طلباتي')}
    >
      <div
        className="full-bleed"
        dir="rtl"
        style={{
          background: '#ffffff',
          borderRadius: '26px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(90vh, 760px)',
          direction: 'rtl',
          position: 'relative',
          fontFamily: 'inherit',
          border: '1px solid #edf1f7',
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
              backdropFilter: 'blur(4px)',
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
                width: 'min(390px, 92vw)',
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 24px 38px -8px rgba(15, 23, 42, 0.2)',
                padding: '22px',
                textAlign: 'center',
                direction: 'rtl',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '13px',
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

              <h4 style={{ margin: '0 0 6px', fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                {t('storefront.storefront_my_orders_modal.s1', 'تأكيد إلغاء الطلب #')}
                {cancellingOrder.orderNumber}
              </h4>
              <p style={{ margin: '0 0 18px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.55 }}>
                {t(
                  'storefront.storefront_my_orders_modal.s2',
                  'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه.'
                )}
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  disabled={cancelMutation.isPending}
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: '11px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t('storefront.storefront_my_orders_modal.s3', 'تراجع')}
                </button>
                <button
                  type="button"
                  onClick={confirmCancel}
                  disabled={cancelMutation.isPending}
                  style={{
                    flex: 1,
                    height: '38px',
                    borderRadius: '11px',
                    background: '#dc2626',
                    border: '1px solid #b91c1c',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: cancelMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cancelMutation.isPending
                    ? t('storefront.storefront_my_orders_modal.s4', 'جاري الإلغاء...')
                    : t('storefront.storefront_my_orders_modal.s5', 'نعم، إلغاء الطلب')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Premium Header matching Categories Modal & Website */}
        <div
          style={{
            padding: '15px 20px',
            borderBottom: '1px solid #edf1f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          {/* Title Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '13px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1px solid #bfdbfe',
                color: brandColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(45, 104, 196, 0.1)',
              }}
            >
              <PackageIcon size={20} color={brandColor} strokeWidth={2.2} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span
                  style={{
                    width: '3.5px',
                    height: '15px',
                    backgroundColor: brandColor,
                    borderRadius: '3px',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <h3
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#0f172a',
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('storefront.storefront_my_orders_modal.s6', 'متابعة طلباتي')}
                </h3>
                {allOrders.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      background: '#eff6ff',
                      color: brandColor,
                      border: '1px solid #bfdbfe',
                      padding: '1px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    {allOrders.length} {allOrders.length === 1 ? 'طلب' : 'طلبات'}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  color: '#64748b',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  marginTop: '2px',
                }}
              >
                {t('storefront.storefront_my_orders_modal.s7', 'تتبع حالة ومسار طلباتك وإدارتها بسهولة')}
              </span>
            </div>
          </div>

          {/* Action Buttons: Refresh + Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                setLocalRefreshTick((t) => t + 1);
                ordersQuery.refetch();
              }}
              disabled={ordersQuery.isFetching}
              title={t('storefront.storefront_my_orders_modal.s8', 'تحديث البيانات')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '10px',
                height: '34px',
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: ordersQuery.isFetching ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e293b',
                fontFamily: 'inherit',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f4f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#dadce0';
              }}
            >
              {ordersQuery.isFetching ? (
                <ClockIcon size={14} color={brandColor} />
              ) : (
                <RefreshCwIcon size={14} color={brandColor} />
              )}
              <span>
                {ordersQuery.isFetching
                  ? t('storefront.storefront_my_orders_modal.s9', 'جاري...')
                  : t('storefront.storefront_my_orders_modal.s10', 'تحديث')}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title={t('storefront.storefront_my_orders_modal.s11', 'إغلاق (Esc)')}
              style={{
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#3c4043',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                transition: 'all 0.16s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f4f9';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#dadce0';
              }}
            >
              <XIcon size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Order Lookup Search Bar & Status Filter Chips */}
        <div
          style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderBottom: '1px solid #edf1f7',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <form
            onSubmit={handleManualLookupSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (lookupFeedback) setLookupFeedback(null);
                }}
                placeholder="ابحث برقم الطلب (مثال: ORD-123456) أو رقم الهاتف أو اسم المنتج..."
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 36px 0 12px',
                  borderRadius: '12px',
                  border: '1px solid #dadce0',
                  background: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                  transition: 'border-color 0.16s ease, box-shadow 0.16s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = brandColor;
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45, 104, 196, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#dadce0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.03)';
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
                <SearchIcon size={15} color="#64748b" />
              </span>

              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setLookupFeedback(null);
                  }}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '8px',
                    transform: 'translateY(-50%)',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  مسح
                </button>
              )}
            </div>

            <button
              type="submit"
              style={{
                height: '38px',
                padding: '0 16px',
                borderRadius: '12px',
                background: brandColor,
                color: '#ffffff',
                border: `1px solid ${brandColor}`,
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                fontFamily: 'inherit',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
              }}
            >
              <span>تتبع الطلب</span>
            </button>
          </form>

          {/* Status Filter Pills (All / In Progress / Delivered / Cancelled) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
              {(
                [
                  { id: 'all', label: 'الكل', count: statusCounts.all },
                  { id: 'active', label: 'قيد التنفيذ', count: statusCounts.active },
                  { id: 'delivered', label: 'مكتملة', count: statusCounts.delivered },
                  { id: 'cancelled', label: 'ملغاة', count: statusCounts.cancelled },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      height: '30px',
                      padding: '0 11px',
                      borderRadius: '9px',
                      border: isActive ? `1.5px solid ${brandColor}` : '1px solid #e2e8f0',
                      background: isActive ? '#eff6ff' : '#ffffff',
                      color: isActive ? brandColor : '#475569',
                      fontSize: '11.5px',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{tab.label}</span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 800,
                        background: isActive ? brandColor : '#f1f5f9',
                        color: isActive ? '#ffffff' : '#64748b',
                        padding: '0 6px',
                        borderRadius: '6px',
                        lineHeight: 1.4,
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              <InfoIcon size={12} color="#64748b" />
              <span>تظهر طلبات هذا الجهاز تلقائياً</span>
            </div>
          </div>

          {/* Lookup Feedback Banner */}
          {lookupFeedback && (
            <div
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                background:
                  lookupFeedback.type === 'success'
                    ? '#f0fdf4'
                    : lookupFeedback.type === 'error'
                    ? '#fef2f2'
                    : '#eff6ff',
                border: `1px solid ${
                  lookupFeedback.type === 'success'
                    ? '#bbf7d0'
                    : lookupFeedback.type === 'error'
                    ? '#fecaca'
                    : '#bfdbfe'
                }`,
                color:
                  lookupFeedback.type === 'success'
                    ? '#166534'
                    : lookupFeedback.type === 'error'
                    ? '#991b1b'
                    : '#1e40af',
                fontSize: '11.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {lookupFeedback.type === 'success' ? (
                <CheckIcon size={14} color="#16a34a" />
              ) : (
                <InfoIcon size={14} color="currentColor" />
              )}
              <span>{lookupFeedback.text}</span>
            </div>
          )}
        </div>

        {/* Action Error Banner if any */}
        {actionError && (
          <div
            style={{
              padding: '8px 18px',
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: '12px',
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
          className="thin-scrollbar"
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            flex: 1,
            boxSizing: 'border-box',
          }}
        >
          {ordersQuery.isLoading ? (
            <div style={{ padding: '44px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              {t('storefront.storefront_my_orders_modal.s13', 'جاري البحث عن طلباتك...')}
            </div>
          ) : groupedOrders.length === 0 ? (
            <div
              style={{
                padding: '28px 20px',
                textAlign: 'center',
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: '18px',
                border: '1px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '18px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
                }}
              >
                <ShoppingCartIcon size={28} color={brandColor} />
              </div>

              <div>
                <h4 style={{ margin: '0 0 5px', fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                  {searchQuery.trim() || statusFilter !== 'all'
                    ? 'لا توجد طلبات مطابقة للفلتر المحدد'
                    : t('storefront.storefront_my_orders_modal.s14', 'لا توجد طلبات مسجلة حالياً على هذا الجهاز')}
                </h4>
                <p style={{ margin: '0 auto', fontSize: '12.5px', color: '#64748b', maxWidth: '390px', lineHeight: 1.55 }}>
                  {searchQuery.trim() || statusFilter !== 'all'
                    ? 'جرب مسح كلمة البحث أو اختيار تبويب «الكل» لعرض جميع طلباتك المسجلة.'
                    : t(
                        'storefront.storefront_my_orders_modal.s15',
                        'ستظهر طلباتك هنا تلقائياً فور إتمام أي طلب من المتجر مع تتبع حي لمراحل التجهيز والتوصيل.'
                      )}
                </p>
              </div>

              {/* Quick 4-Step Visual Preview of Order Tracking */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '430px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                }}
              >
                <span style={{ color: brandColor }}>1. استلام الطلب</span>
                <span style={{ color: '#cbd5e1' }}>←</span>
                <span>2. جاري التجهيز</span>
                <span style={{ color: '#cbd5e1' }}>←</span>
                <span>3. مع المندوب</span>
                <span style={{ color: '#cbd5e1' }}>←</span>
                <span style={{ color: '#16a34a' }}>4. تم التسليم</span>
              </div>

              {/* Action Buttons in Empty State */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '6px',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    height: '36px',
                    padding: '0 16px',
                    borderRadius: '12px',
                    background: brandColor,
                    color: '#ffffff',
                    border: `1px solid ${brandColor}`,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'inherit',
                    boxShadow: '0 2px 6px rgba(45, 104, 196, 0.18)',
                  }}
                >
                  <ShoppingCartIcon size={14} color="#ffffff" />
                  <span>تصفح المنتجات وابدأ التسوق</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddSampleOrderForPreview}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    color: '#1e293b',
                    border: '1px solid #dadce0',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontFamily: 'inherit',
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <PackageIcon size={14} color={brandColor} />
                  <span>معاينة طلب تجريبي</span>
                </button>

                {whatsappSupportUrl && (
                  <a
                    href={whatsappSupportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: '36px',
                      padding: '0 14px',
                      borderRadius: '12px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <IconWhatsapp size={15} color="#16a34a" />
                    <span>تواصل مع خدمة العملاء</span>
                  </a>
                )}
              </div>
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

        {/* Bottom Support Footer */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #edf1f7',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
            هل لديك استفسار عن طلب سابق أو تحتاج مساعدة فورية؟
          </span>

          {whatsappSupportUrl ? (
            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '11.5px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <IconWhatsapp size={14} color="#16a34a" />
              <span>تحدث معنا عبر واتساب</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '10px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              العودة للمتجر
            </button>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
