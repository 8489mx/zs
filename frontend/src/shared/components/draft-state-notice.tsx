interface DraftStateNoticeProps {
  visible: boolean;
  title?: string;
  hint?: string;
  className?: string;
}

export function DraftStateNotice({
  visible,
  title = 'لديك تغييرات غير محفوظة',
  hint = 'احفظ التعديلات أو أعد تعيين القيم قبل مغادرة هذا النموذج حتى لا تفقد ما أدخلته.',
  className = ''
}: DraftStateNoticeProps) {
  if (!visible) return null;

  return (
    <div
      className={['draft-state-notice', className].filter(Boolean).join(' ')}
      role="status"
      aria-live="polite"
      dir="rtl"
      style={{
        position: 'fixed',
        top: '20px',
        left: '24px',
        width: 'min(420px, calc(100vw - 48px))',
        zIndex: 9990,
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid #fde68a',
        background: 'linear-gradient(180deg, #fffdf5 0%, #ffffff 100%)',
        boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(245, 158, 11, 0.08)',
        pointerEvents: 'none',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          <strong
            style={{
              color: '#92400e',
              fontSize: '13px',
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            {title}
          </strong>
        </div>
        <span
          style={{
            color: '#78350f',
            fontSize: '11.5px',
            lineHeight: 1.6,
            paddingInlineStart: '14px',
          }}
        >
          {hint}
        </span>
      </div>
    </div>
  );
}

