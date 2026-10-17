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
  { code: 'zh', label: 'الصينية', nativeLabel: '简体中文', dir: 'ltr', shortCode: 'ZH' },
  { code: 'bn', label: 'البنغالية', nativeLabel: 'বাংলা', dir: 'ltr', shortCode: 'BN' },
  { code: 'ur', label: 'الأردية', nativeLabel: 'اردو', dir: 'rtl', shortCode: 'UR' },
  { code: 'hi', label: 'الهندية', nativeLabel: 'हिन्दी', dir: 'ltr', shortCode: 'HI' },
  { code: 'tl', label: 'التاغالوغية', nativeLabel: 'Tagalog', dir: 'ltr', shortCode: 'TL' },
  { code: 'fr', label: 'الفرنسية', nativeLabel: 'Français', dir: 'ltr', shortCode: 'FR' },
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
