import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/ui/empty-state';
import { LoadingState } from '@/shared/ui/loading-state';
import { ErrorState } from '@/shared/ui/error-state';

interface QueryFeedbackProps {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  loadingText?: string;
  errorTitle?: string;
  errorHint?: string;
  errorAction?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  preserveChildrenOnEmpty?: boolean;
  children?: ReactNode;
}

export function QueryFeedback({
  isLoading,
  isError,
  error,
  isEmpty,
  loadingText = 'جاري تحميل البيانات...',
  errorTitle = 'تعذر تحميل البيانات',
  errorHint,
  errorAction,
  emptyTitle = 'لا توجد بيانات',
  emptyHint,
  emptyAction,
  preserveChildrenOnEmpty,
  children
}: QueryFeedbackProps) {
  if (isLoading) {
    return <LoadingState title={loadingText} />;
  }

  if (isError) {
    return <ErrorState title={errorTitle} hint={errorHint} error={error} action={errorAction} />;
  }

  if (isEmpty) {
    if (preserveChildrenOnEmpty) {
      return <>
        {children}
        <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />
      </>;
    }

    return <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />;
  }

  return <>{children}</>;
}
