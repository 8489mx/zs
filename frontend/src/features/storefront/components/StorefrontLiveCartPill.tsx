import { CurrencySymbol } from '@/shared/ui/currency-symbol';
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
      className="storefront-live-cart-pill"
      style={{
        background: '#ffffff',
        borderRadius: '9999px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 14px 34px -4px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
        padding: '8px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'liveCartSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      title="اضغط لعرض تفاصيل السلة"
      onClick={onExpand}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--storefront-primary-color, #170e5e)';
        e.currentTarget.style.boxShadow = '0 18px 40px -4px rgba(15, 23, 42, 0.24), 0 6px 16px -2px rgba(15, 23, 42, 0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = '0 14px 34px -4px rgba(15, 23, 42, 0.18), 0 4px 12px -2px rgba(15, 23, 42, 0.08)';
      }}
    >
      <div
        style={{
          width: '35px',
          height: '35px',
          borderRadius: '50%',
          background: 'var(--storefront-primary-color, #170e5e)',
          color: 'var(--storefront-primary-contrast, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(23, 14, 94, 0.25))',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            width: '9px',
            height: '9px',
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
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#0f172a', fontWeight: 800 }}>{itemsCount}</strong> صنف • <strong style={{ color: '#0f172a', fontWeight: 800 }}>{totalQuantity}</strong> قطعة
        </div>
        <div style={{ fontSize: '13px', fontWeight: 900, color: '#166534', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span>الإجمالي:</span>
          <span>{total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
          <CurrencySymbol />
        </div>
      </div>

      {/* Action Buttons & Dismiss */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto', flexShrink: 0 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isMinOrderMet) onProceedToCheckout();
          }}
          disabled={!isMinOrderMet}
          style={{
            background: isMinOrderMet ? 'var(--storefront-primary-color, #170e5e)' : '#94a3b8',
            color: 'var(--storefront-primary-contrast, #ffffff)',
            border: 'none',
            fontSize: '12px',
            fontWeight: 800,
            padding: '7px 15px',
            borderRadius: '999px',
            cursor: isMinOrderMet ? 'pointer' : 'not-allowed',
            boxShadow: isMinOrderMet ? '0 2px 7px var(--storefront-primary-subtle, rgba(23, 14, 94, 0.28))' : 'none',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.15s ease, filter 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (isMinOrderMet) {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (isMinOrderMet) {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <span>إتمام الطلب</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1 }}>←</span>
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label="تصغير وإخفاء الشريط مؤقتاً"
            title="تصغير وإخفاء الشريط مؤقتاً"
            style={{
              width: '26px',
              height: '26px',
              minWidth: '26px',
              minHeight: '26px',
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxSizing: 'border-box',
              padding: 0,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
