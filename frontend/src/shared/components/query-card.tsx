import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/card';
import { QueryFeedback } from '@/shared/components/query-feedback';

interface QueryCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  loadingText?: string;
  errorTitle?: string;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  preserveChildrenOnEmpty?: boolean;
  children?: ReactNode;
  className?: string;
}

export function QueryCard({
  title,
  description,
  actions,
  isLoading,
  isError,
  error,
  isEmpty,
  loadingText,
  errorTitle,
  emptyTitle,
  emptyHint,
  emptyAction,
  preserveChildrenOnEmpty,
  children,
  className
}: QueryCardProps) {
  return (
    <Card title={title} description={description} actions={actions} className={className}>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={isEmpty}
        loadingText={loadingText}
        errorTitle={errorTitle}
        emptyTitle={emptyTitle}
        emptyHint={emptyHint}
        emptyAction={emptyAction}
        preserveChildrenOnEmpty={preserveChildrenOnEmpty}
      >
        {children}
      </QueryFeedback>
    </Card>
  );
}
