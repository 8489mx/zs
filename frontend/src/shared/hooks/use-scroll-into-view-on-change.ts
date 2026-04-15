import { type RefObject, useEffect } from 'react';

interface UseScrollIntoViewOnChangeOptions {
  enabled?: boolean;
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

function getPreferredFocusTarget(root: HTMLElement) {
  const explicitTarget = root.querySelector<HTMLElement>('[data-autofocus]');
  if (explicitTarget) return explicitTarget;

  return root.querySelector<HTMLElement>(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
}

export function useScrollIntoViewOnChange<T>(
  value: T,
  targetRef: RefObject<HTMLElement | null>,
  {
    enabled = true,
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
  }: UseScrollIntoViewOnChangeOptions = {},
) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const target = targetRef.current;
    if (!target || typeof target.scrollIntoView !== 'function') return;

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior, block, inline });

      const focusTarget = getPreferredFocusTarget(target);
      if (!focusTarget || typeof focusTarget.focus !== 'function') return;

      window.setTimeout(() => {
        focusTarget.focus();
      }, behavior === 'smooth' ? 220 : 0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [block, behavior, enabled, inline, targetRef, value]);
}
