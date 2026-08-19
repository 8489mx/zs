const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const SEARCH_NOISE_REGEX = /[^\p{L}\p{N}\s]+/gu;
const MULTI_SPACE_REGEX = /\s+/g;
const EASTERN_ARABIC_DIGITS_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function normalizeArabicDigits(value: unknown): string {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, (char) => EASTERN_ARABIC_DIGITS_MAP[char] || char);
}

export function normalizeArabicBase(value: unknown): string {
  return normalizeArabicDigits(value)
    .replace(/[أإآٱٲٳ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .replace(/[ء]/g, '')
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(MULTI_SPACE_REGEX, ' ');
}

export function normalizeArabicInput(value: unknown): string {
  return normalizeArabicBase(value).trim();
}

export function normalizeArabicSearchText(value: unknown): string {
  return normalizeArabicBase(value)
    .toLowerCase()
    .replace(SEARCH_NOISE_REGEX, ' ')
    .replace(MULTI_SPACE_REGEX, ' ');
}

export function normalizeArabicSearchKey(value: unknown): string {
  return normalizeArabicSearchText(value).trim();
}

/**
 * Checks if haystack matches needle with Arabic and case normalization
 */
export function matchesArabic(haystack: unknown, needle: unknown): boolean {
  const normNeedle = normalizeArabicSearchKey(needle);
  if (!normNeedle) return true;
  const normHaystack = normalizeArabicSearchKey(haystack);
  return normHaystack.includes(normNeedle);
}
