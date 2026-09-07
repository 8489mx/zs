/** Supported currencies across the system. Single source of truth used by Settings and Purchase Order pages. */
export const SUPPORTED_CURRENCIES = [
  { code: 'EGP', label: 'EGP - جنيه مصري', decimals: 2 },
  { code: 'SAR', label: 'SAR - ريال سعودي', decimals: 2 },
  { code: 'AED', label: 'AED - درهم إماراتي', decimals: 2 },
  { code: 'KWD', label: 'KWD - دينار كويتي (فلس)', decimals: 3 },
  { code: 'QAR', label: 'QAR - ريال قطري', decimals: 2 },
  { code: 'BHD', label: 'BHD - دينار بحريني (فلس)', decimals: 3 },
  { code: 'OMR', label: 'OMR - ريال عماني (بيسة)', decimals: 3 },
  { code: 'USD', label: 'USD - US Dollar', decimals: 2 },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

/**
 * Returns the number of decimal fraction digits for a given currency code.
 * Currencies like KWD, BHD, and OMR use 3 decimals (1000 fils/baisa = 1 unit).
 */
export function getCurrencyDecimals(currencyCode?: string | null): number {
  if (!currencyCode) return 2;
  const upper = String(currencyCode).trim().toUpperCase();
  if (upper === 'KWD' || upper === 'BHD' || upper === 'OMR') {
    return 3;
  }
  return 2;
}

export function isThreeDecimalCurrency(currencyCode?: string | null): boolean {
  return getCurrencyDecimals(currencyCode) === 3;
}
