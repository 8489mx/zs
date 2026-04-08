import { DependencyList, useEffect, useRef } from 'react';

export function useMutationFeedbackReset(
  settled: boolean,
  resetFeedback: () => void,
  deps: DependencyList,
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
  }, deps);
}
