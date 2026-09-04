import { OnlineOrderRecord, StorefrontInfo } from '../types/storefront.types';

interface StorefrontCustomerOrderCardProps {
  order: OnlineOrderRecord;
  info: StorefrontInfo;
  onEditOrder: (order: OnlineOrderRecord) => void;
  onCancelOrder: (order: OnlineOrderRecord) => void;
  isCancelling?: boolean;
}

function getStatusBadge(status: string) {
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
}

export function StorefrontCustomerOrderCard({
  order,
  info,
  onEditOrder,
  onCancelOrder,
  isCancelling = false,
}: StorefrontCustomerOrderCardProps) {
  const badge = getStatusBadge(order.status);
  const isPending = order.status === 'pending' && !order.saleId;

  const orderTimeStr = new Date(order.createdAt).toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 14px',
        background: '#ffffff',
        boxShadow: '0 1px 4px rgba(15, 23, 42, 0.03)',
      }}
    >
      {/* Top Row: Order Number, Time, Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            dir="ltr"
            style={{
              fontWeight: 800,
              fontSize: '13px',
              color: '#0f172a',
              background: '#f1f5f9',
              padding: '2px 7px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              letterSpacing: '0.3px',
            }}
          >
            #{order.orderNumber}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {orderTimeStr}
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            background: badge.bg,
            color: badge.text,
            border: `1px solid ${badge.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {badge.label}
        </span>
      </div>

      {/* Items preview */}
      <div
        style={{
          fontSize: '12px',
          color: '#334155',
          background: '#f8fafc',
          padding: '8px 10px',
          borderRadius: '7px',
          marginBottom: '8px',
          border: '1px solid #f1f5f9',
        }}
      >
        {order.items.map((it, idx) => (
          <div
            key={idx}
            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.name} (×{it.quantity})
            </span>
            <span style={{ fontWeight: 600, flexShrink: 0, marginInlineStart: '8px' }}>
              {it.total.toFixed(0)} ج
            </span>
          </div>
        ))}
      </div>

      {/* Bottom Row: Total & Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '12.5px' }}>
          <span style={{ color: '#64748b' }}>الإجمالي: </span>
          <span style={{ fontWeight: 800, color: '#170e5e', fontSize: '14px' }}>
            {order.totalAmount.toFixed(0)} {info.currency || 'ج.م'}
          </span>
        </div>

        {/* Action buttons (only if pending) */}
        {isPending ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => onEditOrder(order)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                background: '#f0f3ff',
                border: '1px solid #c7d2fe',
                color: '#170e5e',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>تعديل الطلب</span>
            </button>

            <button
              type="button"
              onClick={() => onCancelOrder(order)}
              disabled={isCancelling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: isCancelling ? 'not-allowed' : 'pointer',
              }}
            >
              <span>إلغاء الطلب</span>
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {order.status === 'cancelled'
              ? 'تم إلغاء هذا الطلب'
              : 'تم تأكيد الطلب، لا يمكن تعديله'}
          </span>
        )}
      </div>
    </div>
  );
}
