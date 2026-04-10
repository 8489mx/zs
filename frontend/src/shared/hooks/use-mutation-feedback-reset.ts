import { useEffect, useRef } from 'react';

export function useMutationFeedbackReset(
  settled: boolean,
  resetFeedback: () => void,
  resetKey: unknown,
) {
  const shouldResetRef = useRef(false);

  useEffect(() => {
    if (settled) {
      shouldResetRef.current = true;
    }
  }, [settled]);

  useEffect(() => {
    if (!shouldResetRef.current) return;
    resetFeedback();
    shouldResetRef.current = false;
  }, [resetFeedback, resetKey]);
}
