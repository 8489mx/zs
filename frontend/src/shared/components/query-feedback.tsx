import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
  loadingText,
  errorTitle,
  errorHint,
  errorAction,
  emptyTitle,
  emptyHint,
  emptyAction,
  preserveChildrenOnEmpty,
  children
}: QueryFeedbackProps) {
  const { t } = useTranslation();

  const resolvedLoadingText = loadingText || t('feedback.loading', 'جاري تحميل البيانات...');
  const resolvedErrorTitle = errorTitle || t('feedback.error_title', 'تعذر تحميل البيانات');
  const resolvedEmptyTitle = emptyTitle || t('feedback.empty_title', 'لا توجد بيانات');
  const resolvedEmptyHint = emptyHint !== undefined ? emptyHint : t('feedback.empty_hint', 'جرّب تغيير الفلاتر أو أضف سجلًا جديدًا.');

  if (isLoading) {
    return <LoadingState title={resolvedLoadingText} />;
  }

  if (isError) {
    return <ErrorState title={resolvedErrorTitle} hint={errorHint} error={error} action={errorAction} />;
  }

  if (isEmpty) {
    if (preserveChildrenOnEmpty) {
      return (
        <>
          {children}
          <EmptyState title={resolvedEmptyTitle} hint={resolvedEmptyHint} action={emptyAction} />
        </>
      );
    }

    return <EmptyState title={resolvedEmptyTitle} hint={resolvedEmptyHint} action={emptyAction} />;
  }

  return <>{children}</>;
}
