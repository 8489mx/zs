import { getErrorMessage } from '@/lib/errors';

interface MutationFeedbackProps {
  isError?: boolean;
  isSuccess?: boolean;
  error?: unknown;
  errorFallback?: string;
  successText?: string;
}

export function MutationFeedback({
  isError,
  isSuccess,
  error,
  errorFallback = 'تعذر تنفيذ العملية المطلوبة.',
  successText
}: MutationFeedbackProps) {
  if (isError) {
    return <div className="error-box">{getErrorMessage(error, errorFallback)}</div>;
  }

  if (isSuccess && successText) {
    return <div className="success-box">{successText}</div>;
  }

  return null;
}
