import { useCallback } from 'react';

const DEFAULT_MESSAGE = 'لديك تغييرات غير محفوظة. هل تريد المتابعة وفقدان هذه التغييرات؟';

export function useUnsavedChangesGuard(enabled: boolean, _message = DEFAULT_MESSAGE) {
  return useCallback(() => {
    if (!enabled) return true;
    return true;
  }, [enabled]);
}
