import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

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
