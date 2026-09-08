import { RefreshCwIcon, XIcon, Trash2Icon } from '@/shared/components/icons/AppIcons';

export interface DraftRestoredBannerProps {
  /** Whether the banner is visible */
  show: boolean;
  /** Callback when user clicks 'مسح المسودة' */
  onClear: () => void;
  /** Callback when user dismisses the banner */
  onDismiss: () => void;
  /** Optional custom title or message */
  message?: string;
}

export function DraftRestoredBanner({
  show,
  onClear,
  onDismiss,
  message = 'تم استرجاع بيانات المسودة غير المحفوظة تلقائياً لحماية مدخلاتك من الفقدان.',
}: DraftRestoredBannerProps) {
  if (!show) return null;

  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 16px',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderInlineStart: '4px solid #170e5e',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: 'var(--font-subtitle, 13px)',
        color: '#1e293b',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#e0e7ff',
            color: '#170e5e',
            flexShrink: 0,
          }}
        >
          <RefreshCwIcon size={14} color="#170e5e" />
        </span>
        <span style={{ fontWeight: 500, lineHeight: 1.4 }}>{message}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onClear}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            fontSize: 'var(--font-micro, 11px)',
            fontWeight: 600,
            color: '#b91c1c',
            backgroundColor: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fef2f2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          <Trash2Icon size={12} color="#b91c1c" />
          <span>مسح المسودة</span>
        </button>

        <button
          type="button"
          onClick={onDismiss}
          title="إغلاق التنبيه"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          <XIcon size={14} color="#64748b" />
        </button>
      </div>
    </div>
  );
}
