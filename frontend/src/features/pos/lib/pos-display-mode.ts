import { useEffect, useState } from 'react';

export type PosDisplayMode = 'focus' | 'normal';

const POS_DISPLAY_MODE_KEY = 'zsystems.pos.display-mode';
const POS_DISPLAY_MODE_EVENT = 'zsystems:pos-display-mode-change';

function emitDisplayModeChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(POS_DISPLAY_MODE_EVENT));
}

export function getStoredPosDisplayMode(): PosDisplayMode {
  if (typeof window === 'undefined') return 'focus';
  return window.localStorage.getItem(POS_DISPLAY_MODE_KEY) === 'normal' ? 'normal' : 'focus';
}

export function setStoredPosDisplayMode(mode: PosDisplayMode) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(POS_DISPLAY_MODE_KEY, mode);
  emitDisplayModeChange();
}

export function toggleStoredPosDisplayMode() {
  const nextMode = getStoredPosDisplayMode() === 'focus' ? 'normal' : 'focus';
  setStoredPosDisplayMode(nextMode);
  return nextMode;
}

export function subscribePosDisplayMode(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== POS_DISPLAY_MODE_KEY) return;
    listener();
  };
  window.addEventListener(POS_DISPLAY_MODE_EVENT, listener);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(POS_DISPLAY_MODE_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function usePosDisplayModeState() {
  const [mode, setMode] = useState<PosDisplayMode>(() => getStoredPosDisplayMode());

  useEffect(() => {
    return subscribePosDisplayMode(() => setMode(getStoredPosDisplayMode()));
  }, []);

  return mode;
}

export function isDocumentFullscreen() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenElement);
}

export function subscribeDocumentFullscreen(listener: () => void) {
  if (typeof document === 'undefined') return () => undefined;
  document.addEventListener('fullscreenchange', listener);
  return () => document.removeEventListener('fullscreenchange', listener);
}

export function useDocumentFullscreenState() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => isDocumentFullscreen());

  useEffect(() => {
    return subscribeDocumentFullscreen(() => setIsFullscreen(isDocumentFullscreen()));
  }, []);

  return isFullscreen;
}

export async function enterDocumentFullscreen(target?: Element | null) {
  if (typeof document === 'undefined') return false;
  const element = target || document.documentElement;
  if (!element || !('requestFullscreen' in element)) return false;
  await (element as Element & { requestFullscreen: () => Promise<void> }).requestFullscreen();
  return true;
}

export async function exitDocumentFullscreen() {
  if (typeof document === 'undefined' || !document.fullscreenElement || !document.exitFullscreen) return false;
  await document.exitFullscreen();
  return true;
}

export async function toggleDocumentFullscreen(target?: Element | null) {
  if (isDocumentFullscreen()) {
    await exitDocumentFullscreen();
    return false;
  }
  return enterDocumentFullscreen(target);
}
