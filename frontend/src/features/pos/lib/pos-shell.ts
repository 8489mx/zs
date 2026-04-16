export const POS_SHELL_VISIBILITY_KEY = 'zsystems.pos.shell.visibility';
export const POS_TOGGLE_CHROME_EVENT = 'zsystems:pos-toggle-chrome';
export const POS_TOGGLE_FULLSCREEN_EVENT = 'zsystems:pos-toggle-fullscreen';

export function readPosShellPreference() {
  if (typeof window === 'undefined') return true;
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
