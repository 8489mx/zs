interface LoadingStateProps {
  title?: string;
  hint?: string;
  className?: string;
}

export function LoadingState({ title = 'جاري تحميل البيانات...', hint, className = '' }: LoadingStateProps) {
  return (
    <div className={`status-surface status-surface-loading ${className}`.trim()} role="status" aria-live="polite">
      <div className="status-surface-icon" aria-hidden="true">…</div>
      <div className="status-surface-copy">
        <strong>{title}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  );
}
