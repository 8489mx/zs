import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageIcon, ShoppingCartIcon } from '@/shared/components/icons/AppIcons';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';
import { StorefrontOrderDateGroupCard, DateGroupedOrders } from './StorefrontOrderDateGroupCard';

interface StorefrontMyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
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
}: StorefrontMyOrdersModalProps) {
  const queryClient = useQueryClient();
  const savedPhoneKey = `zs_customer_phone_${slug}`;
  const savedOrdersKey = `zs_customer_orders_${slug}`;

  const [phoneSearch, setPhoneSearch] = useState(() => {
    try { return localStorage.getItem(savedPhoneKey) || ''; } catch { return ''; }
  });
  const [activeSearchPhone, setActiveSearchPhone] = useState(phoneSearch);
  const [actionError, setActionError] = useState('');
  const [expandedDateKeys, setExpandedDateKeys] = useState<Record<string, boolean>>({});

  const savedOrderNumbers = useMemo((): string[] => {
    try {
      const raw = localStorage.getItem(savedOrdersKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [savedOrdersKey]);

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
    onError: (err: Error) => {
      setActionError(err.message || 'تعذر إلغاء الطلب');
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
            <PackageIcon size={22} color="#170e5e" />
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
          ) : groupedOrders.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <ShoppingCartIcon size={42} color="#94a3b8" />
              </div>
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                لا توجد طلبات مسجلة حالياً
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
                إذا قمت بالطلب مسبقاً، أدخل رقم هاتفك أعلاه للبحث عن طلباتك فوراً.
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
