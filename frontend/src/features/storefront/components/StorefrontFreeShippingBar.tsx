import React from 'react';
import { TruckIcon, CheckIcon } from '@/shared/components/icons/AppIcons';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';

interface StorefrontFreeShippingBarProps {
  subtotal: number;
  freeShippingEnabled?: boolean;
  freeShippingMinOrder?: number;
  currency?: string;
  compact?: boolean;
}

export const StorefrontFreeShippingBar = React.memo(function StorefrontFreeShippingBar({
  subtotal,
  freeShippingEnabled,
  freeShippingMinOrder = 500,
  compact = false,
}: StorefrontFreeShippingBarProps) {
  if (!freeShippingEnabled || freeShippingMinOrder <= 0) {
    return null;
  }

  const isUnlocked = subtotal >= freeShippingMinOrder;
  const remaining = Math.max(0, freeShippingMinOrder - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingMinOrder) * 100));

  return (
    <div
      className={`storefront-free-shipping-bar ${compact ? 'compact' : ''}`}
      style={{
        background: isUnlocked ? '#f0fdf4' : '#f8fafc',
        border: `1px solid ${isUnlocked ? '#bbf7d0' : '#e2e8f0'}`,
        borderRadius: compact ? '8px' : '12px',
        padding: compact ? '8px 12px' : '10px 16px',
        transition: 'all 0.3s ease',
        boxShadow: isUnlocked ? '0 2px 8px rgba(22, 163, 74, 0.08)' : '0 1px 3px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: compact ? 22 : 26,
              height: compact ? 22 : 26,
              borderRadius: '50%',
              background: isUnlocked ? '#16a34a' : '#170e5e',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isUnlocked ? <CheckIcon size={14} strokeWidth={2.5} /> : <TruckIcon size={14} strokeWidth={2.2} />}
          </div>
          <span
            style={{
              fontSize: compact ? '11.5px' : '12.5px',
              fontWeight: 800,
              color: isUnlocked ? '#166534' : '#1e293b',
            }}
          >
            {isUnlocked ? (
              <span>تهانينا! لقد حصلت على <strong>شحن مجاني</strong> لطلبك بالكامل!</span>
            ) : (
              <span>
                أضف بـ <strong>{remaining.toFixed(0)} <CurrencySymbol /></strong> إضافية لتستمتع بـ <strong>شحن مجاني</strong>
              </span>
            )}
          </span>
        </div>

        <span
          style={{
            fontSize: compact ? '11px' : '12px',
            fontWeight: 800,
            color: isUnlocked ? '#16a34a' : '#64748b',
          }}
        >
          {progressPercent}%
        </span>
      </div>

      {/* Progress Track */}
      <div
        style={{
          width: '100%',
          height: compact ? '5px' : '6px',
          borderRadius: '999px',
          background: '#e2e8f0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: isUnlocked
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #3b82f6, #170e5e)',
            borderRadius: '999px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
});
