import type { ReactNode } from 'react';
import { QueryCard } from '@/shared/components/query-card';

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
    <QueryCard
      title={title}
      description={description}
      actions={actions}
      isLoading={isLoading}
      isError={isError}
      error={error}
      isEmpty={isEmpty}
      loadingText={loadingText}
      emptyTitle={emptyTitle}
      emptyHint={emptyHint}
      preserveChildrenOnEmpty
    >
      {children}
    </QueryCard>
  );
}
