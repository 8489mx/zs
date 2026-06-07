export type UiLanguage = 'ar' | 'en';

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'ar';
export const UI_LANGUAGE_STORAGE_KEY = 'zs.uiLanguage';

export function normalizeUiLanguage(value: unknown): UiLanguage {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'ar';
}

export function getStoredUiLanguage(): UiLanguage {
  if (typeof window === 'undefined') return DEFAULT_UI_LANGUAGE;
  return normalizeUiLanguage(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY));
}

export function persistUiLanguage(language: UiLanguage): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, normalizeUiLanguage(language));
}

export function applyDocumentLanguage(language: UiLanguage): void {
  if (typeof document === 'undefined') return;
  const normalized = normalizeUiLanguage(language);
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === 'en' ? 'ltr' : 'rtl';
}
