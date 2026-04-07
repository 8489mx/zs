import { useEffect, useMemo, useRef, useState } from 'react';

interface AnimatedValueProps {
  value: number;
  durationMs?: number;
  decimals?: number;
  formatter?: (value: number) => string;
}

export function AnimatedValue({ value, durationMs = 850, decimals = 0, formatter }: AnimatedValueProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    const startValue = previousValueRef.current;
    const startTime = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = startValue + ((target - startValue) * eased);
      setDisplayValue(next);
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = target;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, value]);

  const rendered = useMemo(() => {
    const rounded = Number(displayValue.toFixed(decimals));
    if (formatter) return formatter(rounded);
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(rounded);
  }, [decimals, displayValue, formatter]);

  return <>{rendered}</>;
}
