import type { ReactNode } from 'react';
import { getErrorMessage } from '@/lib/errors';

interface ErrorStateProps {
  title?: string;
  hint?: string;
  error?: unknown;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'تعذر إكمال العملية',
  hint,
  error,
  action,
  className = ''
}: ErrorStateProps) {
  const details = getErrorMessage(error, hint || 'حدث خطأ غير متوقع. حاول مجددًا أو راجع الاتصال بالخادم.');

  return (
    <div className={`status-surface status-surface-error ${className}`.trim()} role="alert">
      <div className="status-surface-icon" aria-hidden="true">!</div>
      <div className="status-surface-copy">
        <strong>{title}</strong>
        <span>{details}</span>
        {action ? <div className="status-surface-actions">{action}</div> : null}
      </div>
    </div>
  );
}
