
interface StorefrontLiveCartPillProps {
  itemsCount: number;
  totalQuantity: number;
  total: number;
  isMinOrderMet: boolean;
  onExpand: () => void;
  onProceedToCheckout: () => void;
}

export function StorefrontLiveCartPill({
  itemsCount,
  totalQuantity,
  total,
  isMinOrderMet,
  onExpand,
  onProceedToCheckout,
}: StorefrontLiveCartPillProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '999px',
        border: '1px solid #e2e8f0',
        borderRight: '4.5px solid #170e5e',
        boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18), 0 6px 12px -2px rgba(15, 23, 42, 0.08)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'liveCartSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
      }}
      onClick={onExpand}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#eff6ff',
          color: '#1d4ed8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            border: '2px solid #ffffff',
            animation: 'livePulseDot 2s infinite ease-in-out',
          }}
        />
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
          سلة المشتريات {itemsCount === totalQuantity ? `(${itemsCount} صنف)` : `(${itemsCount} صنف • ${totalQuantity} قطعة)`}
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
          الإجمالي: {total.toFixed(0)} ج.م
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '5px 10px',
            borderRadius: '999px',
            cursor: 'pointer',
          }}
        >
          عرض السلة ⤢
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isMinOrderMet) onProceedToCheckout();
          }}
          disabled={!isMinOrderMet}
          style={{
            background: isMinOrderMet ? '#170e5e' : '#94a3b8',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            padding: '6px 14px',
            borderRadius: '999px',
            cursor: isMinOrderMet ? 'pointer' : 'not-allowed',
            boxShadow: isMinOrderMet ? '0 2px 6px rgba(23, 14, 94, 0.25)' : 'none',
          }}
        >
          إتمام الطلب ←
        </button>
      </div>
    </div>
  );
}
