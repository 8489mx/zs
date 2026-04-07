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
  children
}: QueryFeedbackProps) {
  if (isLoading) {
    return <LoadingState title={loadingText} />;
  }

  if (isError) {
    return <ErrorState title={errorTitle} hint={errorHint} error={error} action={errorAction} />;
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  return <>{children}</>;
}
