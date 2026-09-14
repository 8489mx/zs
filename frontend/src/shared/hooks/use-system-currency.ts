import { useEffect } from 'react';
import { useSettingsQuery } from './use-catalog-queries';
import { getCurrencySymbol, getCurrencyDecimals, getGlobalSystemCurrency, setGlobalSystemCurrency, CurrencyCode } from '@/lib/currencies';

/**
 * Universal System Currency Hook
 * Automatically reads the tenant's primary currency from Settings as the single source of truth.
 * Provides formatted currency strings, standard symbols, and decimal precision.
 */
export function useSystemCurrency(overrideCurrency?: string | null) {
  const { data: settings } = useSettingsQuery();

  // If overrideCurrency is provided, use it; otherwise read from settings, then global localStorage, fallback to 'EGP'
  const rawCode =
    overrideCurrency ||
    (settings as any)?.currency ||
    getGlobalSystemCurrency() ||
    'EGP';
  const currencyCode = String(rawCode).trim().toUpperCase() as CurrencyCode;
  const currencySymbol = getCurrencySymbol(currencyCode);
  const decimals = getCurrencyDecimals(currencyCode);

  useEffect(() => {
    if ((settings as any)?.currency) {
      setGlobalSystemCurrency((settings as any).currency);
    }
  }, [(settings as any)?.currency]);

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
