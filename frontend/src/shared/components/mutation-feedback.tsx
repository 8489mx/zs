import { getFriendlyApiErrorMessage } from '@/lib/errors';

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
  errorFallback = '\u062a\u0639\u0630\u0631 \u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629.',
  successText
}: MutationFeedbackProps) {
  if (isError) {
    return <div className="error-box">{getFriendlyApiErrorMessage(error, errorFallback)}</div>;
  }

  if (isSuccess && successText) {
    return <div className="success-box">{successText}</div>;
  }

  return null;
}