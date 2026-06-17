/** Supported currencies across the system. Single source of truth used by Settings and Purchase Order pages. */
export const SUPPORTED_CURRENCIES = [
  { code: 'EGP', label: 'EGP - جنيه مصري' },
  { code: 'SAR', label: 'SAR - ريال سعودي' },
  { code: 'AED', label: 'AED - درهم إماراتي' },
  { code: 'USD', label: 'USD - US Dollar' },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];
