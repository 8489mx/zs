/**
 * Haptic Feedback utility for mobile web
 * Provides realistic tactile responses for scans, buttons, and status changes.
 */

export type HapticType =
  | 'light'
  | 'selection'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 15,
  selection: 25,
  medium: 45,
  heavy: 75,
  success: [35, 45, 45],
  warning: [50, 60, 50],
  error: [70, 50, 70, 50, 80],
};

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      const pattern = HAPTIC_PATTERNS[type] ?? 25;
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration failed or blocked by browser policy
  }
}
