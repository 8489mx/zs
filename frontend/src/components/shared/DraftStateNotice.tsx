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
      style={{
        position: 'fixed',
        top: '18px',
        right: '22px',
        width: 'min(460px, calc(100vw - 32px))',
        zIndex: 80,
        padding: '12px 14px',
        borderRadius: '16px',
        border: '1px solid #fde68a',
        background: 'linear-gradient(180deg, #fffdf5 0%, #ffffff 100%)',
        boxShadow: '0 12px 26px rgba(15, 23, 42, 0.10)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <strong
          style={{
            color: '#92400e',
            fontSize: '14px',
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          {title}
        </strong>
        <span
          style={{
            color: '#9a3412',
            fontSize: '12px',
            lineHeight: 1.7,
          }}
        >
          {hint}
        </span>
      </div>
    </div>
  );
}
