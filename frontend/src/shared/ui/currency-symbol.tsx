import React from 'react';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

/**
 * Renders the active system currency symbol from Settings (e.g. "ر.س" or "ج.م")
 */
export function CurrencySymbol({ currency }: { currency?: string }) {
  const { currencySymbol } = useSystemCurrency(currency);
  return <>{currencySymbol}</>;
}

/**
 * Universal Price formatter component that respects tenant Settings currency
 */
export function FormatPrice({
  value,
  currency,
  className,
  style,
}: {
  value: number | string | undefined | null;
  currency?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { formatCurrency } = useSystemCurrency(currency);
  return (
    <span className={className} style={style}>
      {formatCurrency(value)}
    </span>
  );
}
