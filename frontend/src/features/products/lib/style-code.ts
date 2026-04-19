const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeNumericStyleCode(value: string | null | undefined): string {
  return String(value || '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/\D+/g, '');
}

export function generateNumericStyleCode(): string {
  return String(Date.now());
}
