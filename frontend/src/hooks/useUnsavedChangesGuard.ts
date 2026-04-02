import { useCallback, useEffect } from 'react';

const DEFAULT_MESSAGE = 'لديك تغييرات غير محفوظة. هل تريد المتابعة وفقدان هذه التغييرات؟';

export function useUnsavedChangesGuard(enabled: boolean, message = DEFAULT_MESSAGE) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, message]);

  return useCallback(() => {
    if (!enabled) return true;
    return window.confirm(message);
  }, [enabled, message]);
}
