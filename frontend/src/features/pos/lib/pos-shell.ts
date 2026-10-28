export const POS_SHELL_VISIBILITY_KEY = 'zsystems.pos.shell.visibility';
export const POS_TOGGLE_CHROME_EVENT = 'zsystems:pos-toggle-chrome';
export const POS_TOGGLE_FULLSCREEN_EVENT = 'zsystems:pos-toggle-fullscreen';

export function isStandalonePosTerminal(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).AndroidBridge?.isPosLite?.() ||
    (window as any).SmartPos?.isPosLite?.() ||
    (window as any).SunmiPrinter?.isPosLite?.() ||
    window.location.search.includes('standalone=pos') ||
    window.location.search.includes('kiosk=1') ||
    window.localStorage.getItem('zsystems.pos.standalone') === 'true'
  );
}

export function readPosShellPreference() {
  if (typeof window === 'undefined') return true;
  if (isStandalonePosTerminal()) return true;
  return window.localStorage.getItem(POS_SHELL_VISIBILITY_KEY) !== 'shown';
}

export function dispatchPosChromeToggle() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(POS_TOGGLE_CHROME_EVENT));
}

export function dispatchPosFullscreenToggle() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(POS_TOGGLE_FULLSCREEN_EVENT));
}
