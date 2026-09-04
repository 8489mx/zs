import React, { useRef } from 'react';

interface StorefrontLiveCartPillProps {
  itemsCount: number;
  totalQuantity: number;
  total: number;
  isMinOrderMet: boolean;
  onExpand: () => void;
  onProceedToCheckout: () => void;
  onDismiss?: () => void;
}

export function StorefrontLiveCartPill({
  itemsCount,
  totalQuantity,
  total,
  isMinOrderMet,
  onExpand,
  onProceedToCheckout,
  onDismiss,
}: StorefrontLiveCartPillProps) {
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = Math.abs(touchStartXRef.current - e.changedTouches[0].clientX);
    touchStartXRef.current = null;
    if (diff > 50 && onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '999px',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        borderRight: '4.5px solid #170e5e',
        boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.16), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'liveCartSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={onExpand}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @media (max-width: 480px) {
          .storefront-pill-view-btn {
            display: none !important;
          }
        }
      `}</style>
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

      {/* Exactly 2 clean lines: Line 1 = Items & Pieces, Line 2 = Total */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
          {itemsCount} صنف • {totalQuantity} قطعة
        </div>
        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#166534', whiteSpace: 'nowrap' }}>
          الإجمالي: {total.toFixed(0)} ج.م
        </div>
      </div>

      {/* Action Buttons & Dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto', flexShrink: 0 }}>
        <button
          className="storefront-pill-view-btn"
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
            whiteSpace: 'nowrap',
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
            whiteSpace: 'nowrap',
          }}
        >
          إتمام الطلب ←
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="إخفاء السلة مؤقتاً"
            title="إخفاء السلة مؤقتاً"
            style={{
              width: '26px',
              height: '26px',
              minWidth: '26px',
              minHeight: '26px',
              maxWidth: '26px',
              maxHeight: '26px',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              background: 'rgba(241, 245, 249, 0.95)',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              alignSelf: 'center',
              boxSizing: 'border-box',
              padding: 0,
              transition: 'all 0.15s ease',
              marginRight: '2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(241, 245, 249, 0.95)';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
