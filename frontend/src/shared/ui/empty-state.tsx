import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, hint, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`status-surface status-surface-empty ${className}`.trim()}>
      <div className="status-surface-icon" aria-hidden="true">○</div>
      <div className="status-surface-copy">
        <strong>{title}</strong>
        {hint ? <span>{hint}</span> : null}
        {action ? <div className="status-surface-actions">{action}</div> : null}
      </div>
    </div>
  );
}
