import React from 'react';

interface SignageMarqueeFooterProps {
  customTickerText: string;
  isPaused: boolean;
  onTogglePause: () => void;
  currentIndex: number;
  totalItems: number;
}

export const SignageMarqueeFooter: React.FC<SignageMarqueeFooterProps> = ({
  customTickerText,
  isPaused,
  onTogglePause,
  currentIndex,
  totalItems,
}) => {
  const MarqueeTag = 'marquee' as any;

  return (
    <footer
      style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 -2px 10px rgba(15, 23, 42, 0.03)',
        zIndex: 20,
      }}
    >
      <div
        style={{
          backgroundColor: '#170e5e',
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: 900,
          padding: '5px 12px',
          borderRadius: '6px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>نشرة العروض</span>
      </div>

      {/* Marquee text */}
      <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <MarqueeTag
          behavior="scroll"
          direction="right"
          scrollamount="6"
          style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}
        >
          {customTickerText}
        </MarqueeTag>
      </div>

      {/* Slide Counter & Pause */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onTogglePause}
          style={{
            backgroundColor: isPaused ? '#fee2e2' : '#f1f5f9',
            color: isPaused ? '#dc2626' : '#334155',
            border: `1px solid ${isPaused ? '#fecaca' : '#cbd5e1'}`,
            padding: '5px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 700,
            transition: 'all 0.15s ease',
          }}
        >
          {isPaused ? 'استئناف' : 'إيقاف مؤقت'}
        </button>

        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
          {totalItems > 0 ? `${currentIndex + 1} / ${totalItems}` : '0/0'}
        </span>
      </div>
    </footer>
  );
};
