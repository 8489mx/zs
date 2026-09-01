import type { ReactNode } from 'react';
import { QueryFeedback } from '@/shared/components/query-feedback';

export function AccountsLedgerCard({
  title,
  description,
  actions,
  isLoading,
  isError,
  error,
  isEmpty,
  loadingText,
  emptyTitle,
  emptyHint,
  children
}: {
  title: string;
  description: string;
  actions: ReactNode;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  loadingText: string;
  emptyTitle: string;
  emptyHint: string;
  children: ReactNode;
}) {
  return (
    <section className="document-prototype-section">
      <div className="section-header-compact-row">
        <h3 className="document-prototype-section-title">{title}</h3>
        <div className="section-header-actions-group">
          {actions}
        </div>
      </div>
      <p className="muted small section-header-subtitle">{description}</p>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={isEmpty}
        loadingText={loadingText}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
      >
        {children}
      </QueryFeedback>
    </section>
  );
}
