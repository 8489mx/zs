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
        width: '420px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '12px 14px',
        borderRadius: '14px',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.14), 0 8px 10px -6px rgba(15, 23, 42, 0.06)',
        border: '1px solid #e2e8f0',
        borderRight: '4.5px solid #170e5e',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'orderNotificationSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes orderNotificationSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes orderLivePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.75; }
        }
      `}</style>

      {/* Header Row: Icon + Title + Order # + Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#1d4ed8',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid #ffffff',
                animation: 'orderLivePulse 2s infinite ease-in-out',
              }}
            />
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <strong style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>
              طلب أونلاين جديد!
            </strong>
            <span
              style={{
                fontSize: '11.5px',
                fontFamily: 'monospace, sans-serif',
                fontWeight: 700,
                background: '#f1f5f9',
                color: '#170e5e',
                border: '1px solid #cbd5e1',
                padding: '1.5px 7px',
                borderRadius: '5px',
                direction: 'ltr',
                display: 'inline-block',
                whiteSpace: 'nowrap',
              }}
            >
              #{latestNewOrder.orderNumber}
            </span>
          </div>
        </div>

        {/* Quick controls: Sound & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundEnabled ? 'كتم التنبيه الصوتي' : 'تشغيل التنبيه الصوتي'}
            style={{
              background: soundEnabled ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${soundEnabled ? '#bfdbfe' : '#e2e8f0'}`,
              color: soundEnabled ? '#1d4ed8' : '#64748b',
              borderRadius: '7px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {soundEnabled ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismissAlert}
            title="إغلاق"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              borderRadius: '7px',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontSize: '13px',
              lineHeight: 1,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body: Info Shelf & Action Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '9px',
          padding: '8px 12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#475569' }}>
            <span style={{ color: '#64748b', fontSize: '11.5px', flexShrink: 0 }}>العميل:</span>
            <strong
              style={{
                color: '#0f172a',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={latestNewOrder.customerName}
            >
              {latestNewOrder.customerName || 'عميل بدون اسم'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
            <span style={{ color: '#64748b', fontSize: '11.5px', flexShrink: 0 }}>الإجمالي:</span>
            <span style={{ color: '#166534', fontWeight: 800, fontSize: '12.5px' }}>
              {Number(latestNewOrder.totalAmount).toLocaleString('ar-EG')} ج.م
            </span>
            {latestNewOrder.items && latestNewOrder.items.length > 0 && (
              <span style={{ color: '#94a3b8', fontSize: '11px', marginRight: '4px' }}>
                ({latestNewOrder.items.length} {latestNewOrder.items.length === 1 ? 'صنف' : 'أصناف'})
              </span>
            )}
          </div>
        </div>

        <Link
          to="/online-orders"
          onClick={() => setLatestNewOrder(null)}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            textDecoration: 'none',
            fontSize: '12px',
            fontWeight: 800,
            padding: '7px 13px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(23, 14, 94, 0.2)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.92';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span>عرض الطلبات</span>
          <span style={{ fontSize: '13px' }}>←</span>
        </Link>
      </div>
    </div>
  );
}
