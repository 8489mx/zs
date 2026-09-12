import { useSettingsQuery } from './use-catalog-queries';
import { getCurrencySymbol, getCurrencyDecimals, CurrencyCode } from '@/lib/currencies';

/**
 * Universal System Currency Hook
 * Automatically reads the tenant's primary currency from Settings as the single source of truth.
 * Provides formatted currency strings, standard symbols, and decimal precision.
 */
export function useSystemCurrency(overrideCurrency?: string | null) {
  const { data: settings } = useSettingsQuery();

  // If overrideCurrency is provided, use it; otherwise read from settings; fallback to 'SAR'
  const rawCode = overrideCurrency || (settings as any)?.currency || 'SAR';
  const currencyCode = String(rawCode).trim().toUpperCase() as CurrencyCode;
  const currencySymbol = getCurrencySymbol(currencyCode);
  const decimals = getCurrencyDecimals(currencyCode);

  const formatNumber = (val: number | string | undefined | null): string => {
    const num = Number(val || 0);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatCurrency = (val: number | string | undefined | null): string => {
    return `${formatNumber(val)} ${currencySymbol}`;
  };

  return {
    currencyCode,
    currencySymbol,
    decimals,
    formatCurrency,
    formatAmount: formatCurrency,
    formatNumber,
  };
}
