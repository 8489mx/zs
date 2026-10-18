export interface LanguageMeta {
  code: string;
  label: string;
  nativeLabel: string;
  dir: 'rtl' | 'ltr';
  shortCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'ar', label: 'العربية', nativeLabel: 'العربية', dir: 'rtl', shortCode: 'AR' },
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', shortCode: 'EN' },
];

export const DEFAULT_LANGUAGE = 'ar';

export function getLanguageMeta(code?: string | null): LanguageMeta {
  if (!code) return SUPPORTED_LANGUAGES[0];
  const normalized = code.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === normalized) || SUPPORTED_LANGUAGES[0];
}

export function isRtlLanguage(code?: string | null): boolean {
  return getLanguageMeta(code).dir === 'rtl';
}
