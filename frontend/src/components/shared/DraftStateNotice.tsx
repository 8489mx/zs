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
    <div className={[ 'draft-state-notice', className ].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <strong>{title}</strong>
      <span>{hint}</span>
    </div>
  );
}
