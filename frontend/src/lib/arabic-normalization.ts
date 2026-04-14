const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
const SEARCH_NOISE_REGEX = /[^\p{L}\p{N}\s]+/gu;
const MULTI_SPACE_REGEX = /\s+/g;

function normalizeArabicBase(value: string) {
  return String(value || '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/[ى]/g, 'ي')
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(MULTI_SPACE_REGEX, ' ')
    .trim();
}

export function normalizeArabicInput(value: string) {
  return normalizeArabicBase(value);
}

export function normalizeArabicSearchText(value: string) {
  return normalizeArabicBase(value)
    .toLowerCase()
    .replace(SEARCH_NOISE_REGEX, ' ')
    .replace(MULTI_SPACE_REGEX, ' ')
    .trim();
}

export function normalizeArabicSearchKey(value: string) {
  return normalizeArabicSearchText(value);
}
