import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/button';

interface PosOnlineOrderFloatingAlertProps {
  orderCount: number;
  onOpenOrders: () => void;
  onDismiss: () => void;
}

export function PosOnlineOrderFloatingAlert({
  orderCount,
  onOpenOrders,
  onDismiss,
}: PosOnlineOrderFloatingAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 12000);
    return () => clearTimeout(timer);
  }, [orderCount, onDismiss]);

  if (!visible || orderCount <= 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '64px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '10px 18px',
        background: '#ffffff',
        border: '1.5px solid #3b82f6',
        borderRadius: '12px',
        boxShadow: '0 12px 28px rgba(37, 99, 235, 0.18), 0 4px 10px rgba(0, 0, 0, 0.06)',
        direction: 'rtl',
        animation: 'slideDownFade 0.25s ease-out',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1d4ed8',
          fontSize: '18px',
          flexShrink: 0,
        }}
      >
        🔔
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <strong style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800 }}>
            طلب متجر إلكتروني جديد!
          </strong>
          <span
            style={{
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              borderRadius: '999px',
              padding: '1px 7px',
            }}
          >
            {orderCount} {orderCount === 1 ? 'طلب' : 'طلبات'}
          </span>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
          تم استلام طلب جديد من المتجر الإلكتروني بانتظار التأكيد أو التنزيل بالسلة.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            setVisible(false);
            onOpenOrders();
          }}
          style={{
            fontSize: '0.8rem',
            padding: '6px 14px',
            height: '32px',
            background: '#1d4ed8',
            borderColor: '#1d4ed8',
            fontWeight: 700,
          }}
        >
          عرض الطلبات
        </Button>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
          title="إغلاق التنبيه"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
