import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

export { getFriendlyApiErrorMessage };

export function getErrorMessage(error: unknown, fallback = '\u062d\u062f\u062b \u062e\u0637\u0623 \u063a\u064a\u0631 \u0645\u062a\u0648\u0642\u0639.') {
  return getFriendlyApiErrorMessage(error, fallback);
}