import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storefrontApi } from '../api/storefront.api';
import { OnlineOrderRecord } from '../types/storefront.types';
import { playOrderChime, isOrderSoundEnabled, setOrderSoundEnabled } from '@/shared/audio/order-sound';
import { useAuthStore } from '@/stores/auth-store';

export function LiveOrderNotificationBanner() {
  const user = useAuthStore((state) => state.user);
  const [latestNewOrder, setLatestNewOrder] = useState<OnlineOrderRecord | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(() => isOrderSoundEnabled());
  const previousKnownIdsRef = useRef<Set<number>>(new Set());
  const isInitialFetchRef = useRef(true);

  // Poll for pending storefront orders every 12 seconds
  const { data } = useQuery({
    queryKey: ['storefront-live-pending-orders'],
    queryFn: () => storefrontApi.listOrders('pending'),
    enabled: Boolean(user),
    refetchInterval: 12000,
    staleTime: 8000,
    retry: false,
  });

  useEffect(() => {
    if (!data?.orders) return;

    const currentPending = data.orders;
    const currentIds = new Set(currentPending.map((o) => o.id));

    if (isInitialFetchRef.current) {
      // First load, just record existing pending IDs without ringing
      previousKnownIdsRef.current = currentIds;
      isInitialFetchRef.current = false;
      return;
    }

    // Find genuinely new orders that weren't in previous set
    const newlyArrived = currentPending.filter((o) => !previousKnownIdsRef.current.has(o.id));

    if (newlyArrived.length > 0) {
      const mostRecent = newlyArrived[0];
      setLatestNewOrder(mostRecent);
      playOrderChime();
    }

    previousKnownIdsRef.current = currentIds;
  }, [data]);

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    setOrderSoundEnabled(next);
    if (next) {
      playOrderChime();
    }
  };

  const handleDismissAlert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLatestNewOrder(null);
  };

  if (!latestNewOrder) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        background: '#ffffff',
        color: '#0f172a',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
        border: '1px solid #e2e8f0',
        borderRight: '4px solid #170e5e',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '430px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: '#eff6ff',
          border: '1px solid #dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#1d4ed8',
        }}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <strong style={{ fontSize: '13px', color: '#0f172a', fontWeight: 800 }}>طلب أونلاين جديد!</strong>
          <span style={{ fontSize: '11px', fontWeight: 700, background: '#f1f5f9', color: '#170e5e', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
            #{latestNewOrder.orderNumber}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          العميل: <strong style={{ color: '#0f172a' }}>{latestNewOrder.customerName}</strong> ·{' '}
          <span style={{ color: '#166534', fontWeight: 800 }}>{Number(latestNewOrder.totalAmount).toLocaleString('ar-EG')} ج.م</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Link
          to="/online-orders"
          onClick={() => setLatestNewOrder(null)}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '11.5px',
            fontWeight: 800,
            padding: '6px 12px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          عرض الطلبات
        </Link>

        <button
          type="button"
          onClick={handleToggleSound}
          title={soundEnabled ? 'كتم التنبيه الصوتي' : 'تشغيل التنبيه الصوتي'}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569',
            borderRadius: '8px',
            padding: '5px 8px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        <button
          type="button"
          onClick={handleDismissAlert}
          title="إغلاق"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '15px',
            cursor: 'pointer',
            padding: '4px 6px',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
